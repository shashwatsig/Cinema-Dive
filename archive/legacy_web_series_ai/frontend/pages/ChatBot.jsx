import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import ChatWindow from '../components/ChatWindow'
import ChatInput from '../components/ChatInput'
import ChatHistory from '../components/ChatHistory'
import TypingIndicator from '../components/TypingIndicator'
import api from '../services/api'
import '../styles/ChatBot.css'

function ChatBot() {
  const { user } = useAuth()
  const isAuthenticated = !!user

  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [stats, setStats] = useState(null)
  const chatEndRef = useRef(null)

  useEffect(() => {
    if (isAuthenticated) {
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      setSessionId(newSessionId)
      loadStats()
      setMessages([{
        id: 'welcome',
        type: 'assistant',
        content: '👋 Welcome to the Audience Intelligence Assistant!\n\nI can help you understand:\n• Why specific series are popular or unpopular\n• What audiences think about different shows\n• Comparisons between series\n• Audience demographics and preferences\n• Why certain series are recommended\n\nAsk me anything about audience sentiment and preferences!',
        timestamp: new Date(),
        confidence: 100
      }])
    }
  }, [isAuthenticated])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadStats = async () => {
    try {
      const response = await api.get('/chat/stats')
      setStats(response.data.stats)
    } catch (err) {
      console.error('Error loading stats:', err)
    }
  }

  const handleSendMessage = useCallback(async (question) => {
    if (!question.trim() || loading) return

    setError(null)

    const userMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: question,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setLoading(true)

    try {
      const response = await api.post('/chat', { question, sessionId })
      const { answer, sources, confidence, reviewCount, isComparison, comparedSeries, responseTime } = response.data

      const assistantMessage = {
        id: `assistant_${Date.now()}`,
        type: 'assistant',
        content: answer,
        timestamp: new Date(),
        sources,
        confidence,
        reviewCount,
        isComparison,
        comparedSeries,
        responseTime
      }

      setMessages(prev => [...prev, assistantMessage])
      loadStats()
    } catch (err) {
      console.error('Error sending message:', err)
      setMessages(prev => [...prev, {
        id: `error_${Date.now()}`,
        type: 'error',
        content: err.response?.data?.error || 'Failed to get response. Please try again.',
        timestamp: new Date()
      }])
      setError(err.response?.data?.error || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [loading, sessionId])

  const handleFeedback = async (messageId, helpful, comment) => {
    try {
      const message = messages.find(m => m.id === messageId)
      if (!message) return

      await api.post('/chat/feedback', {
        sessionId,
        question: message.content,
        helpful,
        comment
      })

      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, feedback: { helpful, comment } } : m
      ))
    } catch (err) {
      console.error('Error sending feedback:', err)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="chatbot-container">
        <div className="chatbot-auth-message">
          <h2>🔐 Authentication Required</h2>
          <p>Please log in to access the Audience Intelligence Assistant</p>
          <a href="/login" className="chatbot-auth-link">Go to Login</a>
        </div>
      </div>
    )
  }

  return (
    <div className="chatbot-container">
      <div className="chatbot-header">
        <div className="chatbot-title">
          <h1>🎬 Audience Intelligence Assistant</h1>
          <p>Powered by AI-driven review analysis</p>
        </div>

        <div className="chatbot-controls">
          {stats && (
            <div className="chatbot-stats-mini">
              <span>{stats.totalQuestions} questions asked</span>
              <span>|</span>
              <span>{stats.totalReviewsAnalyzed} reviews analyzed</span>
            </div>
          )}
          <button
            className="chatbot-history-btn"
            onClick={() => setShowHistory(!showHistory)}
            title="View chat history"
          >
            📋 History
          </button>
        </div>
      </div>

      <div className="chatbot-main">
        {showHistory ? (
          <ChatHistory
            sessionId={sessionId}
            onSelectMessage={(msg) => {
              handleSendMessage(msg.question)
              setShowHistory(false)
            }}
          />
        ) : (
          <>
            <ChatWindow
              messages={messages}
              onFeedback={handleFeedback}
              ref={chatEndRef}
            />
            {loading && <TypingIndicator />}
            {error && (
              <div className="chatbot-error-message">
                <strong>⚠️ Error:</strong> {error}
              </div>
            )}
          </>
        )}
      </div>

      <div className="chatbot-footer">
        <ChatInput
          onSend={handleSendMessage}
          disabled={loading}
          placeholder="Ask about any series... (e.g., 'Why is Panchayat popular?')"
        />
        <div className="chatbot-suggestions">
          <p>💡 Try asking:</p>
          <button onClick={() => handleSendMessage('Why is Panchayat so popular?')}>
            Why is Panchayat popular?
          </button>
          <button onClick={() => handleSendMessage('Compare Panchayat and Gullak')}>
            Compare Panchayat and Gullak
          </button>
          <button onClick={() => handleSendMessage('What emotions dominate Mirzapur reviews?')}>
            Mirzapur emotions
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatBot
