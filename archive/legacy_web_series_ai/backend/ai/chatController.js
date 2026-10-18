const { getRAGService } = require('./ragService')
const ChatHistory = require('../models/ChatHistory')
const { validationResult } = require('express-validator')

let ragService = null

const initializeChatController = async () => {
  ragService = await getRAGService()
}

// POST /api/chat
const chat = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { question } = req.body
    const userId = req.user?._id || null
    const sessionId = req.body.sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    if (!ragService) ragService = await getRAGService()

    console.log(`\n💬 Chat from user ${userId}: ${question.substring(0, 100)}`)

    const ragResponse = await ragService.chat(question, userId, sessionId)

    if (ragResponse.confidence < 60) {
      ragResponse.answer = 'I have limited audience data for this query, but here is what I found:\n\n' + ragResponse.answer
    }

    // Save to chat history
    if (userId) {
      try {
        await ChatHistory.create({
          userId,
          sessionId,
          question,
          answer: ragResponse.answer,
          sources: formatSourcesForStorage(ragResponse.sources),
          confidence: ragResponse.confidence,
          reviewCount: ragResponse.reviewCount,
          isComparison: ragResponse.isComparison,
          comparedSeries: ragResponse.comparedSeries || [],
          responseTime: ragResponse.responseTime,
          modelUsed: process.env.GEMINI_MODEL || 'gemini-pro',
          followUpContext: {
            previousQuestions: [],
            conversationTopic: ragResponse.isComparison ? 'comparison' : 'general'
          }
        })
      } catch (historyError) {
        console.warn('Chat history save failed (non-fatal):', historyError.message)
      }
    }

    res.json({
      sessionId,
      question,
      answer: ragResponse.answer,
      sources: ragResponse.sources || {},
      confidence: ragResponse.confidence,
      reviewCount: ragResponse.reviewCount,
      isComparison: ragResponse.isComparison,
      comparedSeries: ragResponse.comparedSeries || [],
      responseTime: `${ragResponse.responseTime}ms`,
      seriesCount: ragResponse.seriesCount,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Chat endpoint error:', error.message)
    res.status(500).json({ error: 'Failed to process chat request', message: error.message })
  }
}

// GET /api/chat/history
const getChatHistory = async (req, res) => {
  try {
    const userId = req.user._id
    const { sessionId, limit = 20, skip = 0 } = req.query

    const query = { userId }
    if (sessionId) query.sessionId = sessionId

    const history = await ChatHistory
      .find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .select('-_id question answer confidence reviewCount isComparison comparedSeries createdAt')

    const total = await ChatHistory.countDocuments(query)
    res.json({ history, total, limit: parseInt(limit), skip: parseInt(skip) })
  } catch (error) {
    console.error('Chat history error:', error.message)
    res.status(500).json({ error: 'Failed to fetch chat history' })
  }
}

// GET /api/chat/sessions
const getChatSessions = async (req, res) => {
  try {
    const userId = req.user._id

    const sessions = await ChatHistory.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$sessionId',
          firstQuestion: { $first: '$question' },
          messageCount: { $sum: 1 },
          lastMessage: { $max: '$createdAt' },
          hasComparison: { $max: { $cond: ['$isComparison', 1, 0] } }
        }
      },
      { $sort: { lastMessage: -1 } },
      { $limit: 50 }
    ])

    res.json({
      sessions: sessions.map(s => ({
        sessionId: s._id,
        preview: s.firstQuestion?.substring(0, 100) || '',
        messageCount: s.messageCount,
        lastActive: s.lastMessage,
        hasComparison: s.hasComparison === 1
      }))
    })
  } catch (error) {
    console.error('Chat sessions error:', error.message)
    res.status(500).json({ error: 'Failed to fetch chat sessions' })
  }
}

// POST /api/chat/feedback
const saveFeedback = async (req, res) => {
  try {
    const userId = req.user._id
    const { sessionId, question, helpful, comment } = req.body

    const result = await ChatHistory.updateOne(
      { userId, sessionId, question },
      { $set: { userFeedback: { helpful, comment: comment || '' } } }
    )

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Chat message not found' })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Feedback save error:', error.message)
    res.status(500).json({ error: 'Failed to save feedback' })
  }
}

// GET /api/chat/stats
const getStats = async (req, res) => {
  try {
    const userId = req.user._id

    const stats = await ChatHistory.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalQuestions: { $sum: 1 },
          avgConfidence: { $avg: '$confidence' },
          totalReviewsAnalyzed: { $sum: '$reviewCount' },
          comparisonCount: { $sum: { $cond: ['$isComparison', 1, 0] } },
          avgResponseTime: { $avg: '$responseTime' },
          helpfulFeedback: { $sum: { $cond: [{ $eq: ['$userFeedback.helpful', true] }, 1, 0] } },
          unhelpfulFeedback: { $sum: { $cond: [{ $eq: ['$userFeedback.helpful', false] }, 1, 0] } }
        }
      }
    ])

    res.json({
      stats: stats[0] || {
        totalQuestions: 0, avgConfidence: 0, totalReviewsAnalyzed: 0,
        comparisonCount: 0, avgResponseTime: 0, helpfulFeedback: 0, unhelpfulFeedback: 0
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Stats error:', error.message)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
}

function formatSourcesForStorage(sources) {
  if (!sources || typeof sources !== 'object') return []
  return Object.keys(sources).flatMap(type => {
    if (!Array.isArray(sources[type])) return []
    return sources[type].map(s => ({
      documentType: s.documentType || type,
      seriesTitle: s.seriesTitle || '',
      similarity: s.similarity || 0,
      content: s.preview || ''
    }))
  })
}

module.exports = { chat, getChatHistory, getChatSessions, saveFeedback, getStats, initializeChatController }
