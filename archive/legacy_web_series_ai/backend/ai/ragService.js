const { getVectorStore } = require('./vectorStore')
const PromptTemplates = require('./promptTemplates')
const Series = require('../models/Series')
const ChatHistory = require('../models/ChatHistory')
const NodeCache = require('node-cache')

const CACHE_TTL_SECONDS = parseInt(process.env.CACHE_TTL_MS || 600000) / 1000
const TOP_K = parseInt(process.env.VECTOR_SEARCH_TOP_K || 5)
const VECTOR_THRESHOLD = parseFloat(process.env.VECTOR_SEARCH_THRESHOLD || 0.30)
const MAX_CHUNKS = parseInt(process.env.MAX_RETRIEVED_CHUNKS || 5)
const CONVERSATION_HISTORY_LIMIT = 5 // last N Q&A pairs for memory

class RAGService {
  constructor() {
    this.vectorStore = null
    this.answerCache = new NodeCache({ stdTTL: CACHE_TTL_SECONDS })
  }

  async initialize() {
    this.vectorStore = await getVectorStore()
    console.log('✓ RAG Service initialized')
  }

  // ─────────────────────────────────────────────
  // Main entry point
  // ─────────────────────────────────────────────
  async chat(question, userId, sessionId) {
    const startTime = Date.now()

    // Load conversation history for memory
    const conversationHistory = userId
      ? await this.loadConversationHistory(userId, sessionId)
      : []

    // Resolve follow-up references ("it", "that show", etc.)
    const resolvedQuestion = await this.resolveFollowUp(question, conversationHistory)

    const cacheKey = `${userId}_${resolvedQuestion.toLowerCase().slice(0, 100)}`
    const cached = this.answerCache.get(cacheKey)
    if (cached) return cached

    // Step 1: Find relevant series from MongoDB
    const relevantSeries = await this.searchSeries(resolvedQuestion)

    if (relevantSeries.length === 0) {
      return {
        answer: "I don't have series data matching your query. Try asking about specific series like 'Panchayat', 'Mirzapur', 'Sacred Games', 'Gullak', or 'Family Man'.",
        sources: {},
        confidence: 0,
        reviewCount: 0,
        isComparison: false,
        responseTime: Date.now() - startTime
      }
    }

    const queryType = this.detectQueryType(resolvedQuestion)

    // Step 2: Try vector store first, fall back to direct MongoDB
    let retrievedDocuments = await this.retrieveFromVectorStore(resolvedQuestion, relevantSeries, queryType)
    const hasVectorResults = Object.values(retrievedDocuments).some(arr => arr.length > 0)

    // Step 3: Always enrich with direct MongoDB data (guaranteed to have data)
    const mongoContext = await this.buildMongoContext(relevantSeries)

    // Step 4: Build final context
    const context = PromptTemplates.buildContext(
      retrievedDocuments,
      { series: relevantSeries },
      mongoContext,
      conversationHistory
    )

    // Step 5: Generate answer with Gemini
    const answer = await this.generateAnswer(resolvedQuestion, context, queryType, relevantSeries)

    // Step 6: Build response
    const totalReviewCount = relevantSeries.reduce((sum, s) => sum + (s.totalReviews || 0), 0)
    const confidence = this.calculateConfidence(retrievedDocuments, mongoContext, hasVectorResults, answer)

    const formattedSources = PromptTemplates.formatSources(retrievedDocuments, mongoContext, relevantSeries)

    const response = {
      answer,
      sources: formattedSources,
      confidence,
      reviewCount: totalReviewCount,
      isComparison: queryType === 'comparison',
      comparedSeries: queryType === 'comparison' ? relevantSeries.map(s => s.title) : [],
      responseTime: Date.now() - startTime,
      seriesCount: relevantSeries.length
    }

    this.answerCache.set(cacheKey, response)
    return response
  }

  // ─────────────────────────────────────────────
  // Conversation memory
  // ─────────────────────────────────────────────
  async loadConversationHistory(userId, sessionId) {
    try {
      const history = await ChatHistory
        .find({ userId, sessionId })
        .sort({ createdAt: -1 })
        .limit(CONVERSATION_HISTORY_LIMIT)
        .select('question answer')
      return history.reverse() // chronological order
    } catch {
      return []
    }
  }

  async resolveFollowUp(question, history) {
    if (history.length === 0) return question

    const followUpPatterns = /\b(it|that|this|the show|the series|the same|them)\b/i
    if (!followUpPatterns.test(question)) return question

    try {
      // Extract most recently mentioned series from history
      const lastQuestion = history[history.length - 1]?.question || ''
      const lastAnswer = history[history.length - 1]?.answer || ''
      const combined = `${lastQuestion} ${lastAnswer}`

      // Get all valid series titles to scan for
      const allSeries = await Series.find({}).select('title')
      const seriesTitles = allSeries.map(s => s.title)

      let matchedTitle = null
      let lastIndex = -1

      for (const title of seriesTitles) {
        const index = combined.toLowerCase().lastIndexOf(title.toLowerCase())
        if (index > lastIndex) {
          lastIndex = index
          matchedTitle = title
        }
      }

      if (matchedTitle) {
        return question.replace(followUpPatterns, matchedTitle)
      }
    } catch (err) {
      console.warn('Failed to resolve follow-up reference:', err.message)
    }

    return question
  }

  // ─────────────────────────────────────────────
  // MongoDB series search — dynamic, not hardcoded
  // ─────────────────────────────────────────────
  async searchSeries(question) {
    try {
      // Build keyword regex from question words (≥3 chars), escaping special regex characters
      const words = question.split(/\s+/).filter(w => w.length >= 3)
      const escapedWords = words.map(w => w.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'))
      const keywordRegex = escapedWords.length > 0 ? escapedWords.join('|') : '^$'

      let series = await Series.find({
        $or: [
          { title: { $regex: keywordRegex, $options: 'i' } },
          { $text: { $search: question } }
        ]
      })
        .select('_id title totalReviews averageRating reviews insights metrics embeddingStatus')
        .limit(10)

      // If text search returned nothing, try individual word matches
      if (series.length === 0 && words.length > 0) {
        series = await Series.find({
          title: { $regex: words.join('|'), $options: 'i' }
        })
          .select('_id title totalReviews averageRating reviews insights metrics embeddingStatus')
          .limit(10)
      }

      // Final fallback: return top series by review count
      if (series.length === 0) {
        series = await Series.find({ totalReviews: { $gt: 0 } })
          .sort({ totalReviews: -1 })
          .select('_id title totalReviews averageRating reviews insights metrics embeddingStatus')
          .limit(3)
      }

      return series.map(s => ({
        id: s._id,
        title: s.title,
        totalReviews: s.totalReviews,
        averageRating: s.averageRating,
        reviews: s.reviews,
        insights: s.insights,
        metrics: s.metrics,
        isEmbedded: s.embeddingStatus?.isEmbedded || false
      }))
    } catch (error) {
      console.error('Error searching series:', error.message)
      return []
    }
  }

  // ─────────────────────────────────────────────
  // Direct MongoDB context — always available
  // ─────────────────────────────────────────────
  async buildMongoContext(seriesList) {
    const contexts = []

    for (const s of seriesList) {
      const insights = s.insights || {}
      const metrics = s.metrics || {}

      // Pick up to 5 reviews with their NLP data
      const reviewSnippets = (s.reviews || [])
        .filter(r => r.text && r.text.length > 30)
        .slice(0, 5)
        .map(r => ({
          text: r.text.substring(0, 300),
          sentiment: r.sentiment?.score ?? 0,
          topics: r.topics || [],
          emotions: r.emotions || [],
          rating: r.rating
        }))

      contexts.push({
        seriesId: s.id.toString(),
        seriesTitle: s.title,
        averageRating: s.averageRating,
        totalReviews: s.totalReviews,
        whyLiked: insights.whyLiked || [],
        whyDisliked: insights.whyDisliked || [],
        keyThemes: insights.keyThemes || [],
        audienceType: insights.audienceType || '',
        engagementLevel: insights.engagementLevel || '',
        emotionalResponse: insights.emotionalResponse || '',
        emotionalJourney: insights.emotionalJourney || [],
        contentDNA: insights.contentDNA || {},
        sentimentBreakdown: metrics.sentimentBreakdown || {},
        topTopics: metrics.topTopics || [],
        topEmotions: metrics.topEmotions || [],
        avgSentiment: metrics.averageSentimentScore || 0,
        reviewSnippets
      })
    }

    return contexts
  }

  // ─────────────────────────────────────────────
  // Vector store retrieval (best-effort)
  // ─────────────────────────────────────────────
  async retrieveFromVectorStore(question, seriesList, queryType) {
    const seriesIds = seriesList.map(s => s.id.toString())

    const collectionPriority = {
      comparison: ['insights', 'audience_profile', 'reviews'],
      persona: ['audience_profile', 'insights', 'reviews'],
      emotional: ['emotion_summary', 'insights', 'reviews'],
      recommendation: ['insights', 'audience_profile', 'content_dna'],
      why: ['insights', 'reviews', 'audience_profile'],
      general: ['insights', 'audience_profile', 'content_dna', 'reviews', 'series_description']
    }

    const collections = collectionPriority[queryType] || collectionPriority.general
    const retrieved = {}

    for (const collection of collections) {
      try {
        const results = await this.vectorStore.search(collection, question, TOP_K, VECTOR_THRESHOLD)
        const filtered = (results.results || [])
          .filter(doc => seriesIds.includes(doc.metadata?.seriesId?.toString()))
          .slice(0, MAX_CHUNKS)
        if (filtered.length > 0) retrieved[collection] = filtered
      } catch (err) {
        // Non-fatal: vector store may be empty on fresh start
      }
    }

    return retrieved
  }

  // ─────────────────────────────────────────────
  // Query type detection
  // ─────────────────────────────────────────────
  detectQueryType(question) {
    const q = question.toLowerCase()
    if (q.includes('compare') || q.includes(' vs ') || q.includes('versus') || q.includes('difference between')) return 'comparison'
    if (q.includes('who watch') || q.includes('audience') || q.includes('who is') || q.includes('target')) return 'persona'
    if (q.includes('recommend') || q.includes('after') || q.includes('similar') || q.includes('next')) return 'recommendation'
    if (q.includes('emotion') || q.includes('feel') || q.includes('mood') || q.includes('vibe')) return 'emotional'
    if (q.includes('theme') || q.includes('topic') || q.includes('about')) return 'themes'
    if (q.includes('dislike') || q.includes('hate') || q.includes('bad') || q.includes('problem') || q.includes('issue')) return 'negative'
    if (q.includes('why') || q.includes('reason') || q.includes('popular') || q.includes('success')) return 'why'
    return 'general'
  }

  // ─────────────────────────────────────────────
  // Gemini answer generation
  // ─────────────────────────────────────────────
  async generateAnswer(question, context, queryType, seriesList) {
    const { GoogleGenerativeAI } = require('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash'})

    let prompt
    switch (queryType) {
      case 'comparison':
        prompt = PromptTemplates.buildComparisonPrompt(seriesList.map(s => s.title), question, context)
        break
      case 'persona':
        prompt = PromptTemplates.buildPersonaPrompt(question, context)
        break
      case 'recommendation':
        prompt = PromptTemplates.buildRecommendationPrompt(
          seriesList[1]?.title || seriesList[0]?.title,
          seriesList[0]?.title,
          context
        )
        break
      default:
        prompt = PromptTemplates.buildWhyPrompt(question, context, seriesList[0]?.title || '')
    }

    const result = await model.generateContent(`${PromptTemplates.getSystemPrompt()}\n\n${prompt}`)
    return result.response.text()
  }

  // ─────────────────────────────────────────────
  // Confidence scoring
  // ─────────────────────────────────────────────
  calculateConfidence(vectorDocs, mongoDocs, hasVectorResults, answer) {
    let score = 40 // base — MongoDB data always available

    // MongoDB context richness
    const seriesWithInsights = mongoDocs.filter(s => s.whyLiked?.length > 0 || s.keyThemes?.length > 0).length
    score += Math.min(seriesWithInsights * 10, 20)

    const seriesWithReviews = mongoDocs.filter(s => s.reviewSnippets?.length > 0).length
    score += Math.min(seriesWithReviews * 5, 15)

    // Vector store bonus
    if (hasVectorResults) {
      const vectorCount = Object.values(vectorDocs).reduce((s, a) => s + a.length, 0)
      score += Math.min(vectorCount * 3, 15)
    }

    // Answer length bonus (meaningful response)
    if (answer.length > 300) score += 5
    if (answer.length > 600) score += 5

    return Math.min(score, 100)
  }

  clearCache() {
    this.answerCache.flushAll()
  }
}

let ragServiceInstance = null

const getRAGService = async () => {
  if (!ragServiceInstance) {
    ragServiceInstance = new RAGService()
    await ragServiceInstance.initialize()
  }
  return ragServiceInstance
}

module.exports = { getRAGService, RAGService }
