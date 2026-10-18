import React, { useState, useEffect } from 'react'
import api from '../services/api'

function ChatHistory({ sessionId, onSelectMessage }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState(sessionId)
  const [sessionMessages, setSessionMessages] = useState([])
  const [loadingMessages, setLoadingMessages] = useState(false)

  // Load chat sessions
  useEffect(() => {
    loadSessions()
  }, [])

  // Load messages for selected session
  useEffect(() => {
    if (selectedSession) {
      loadSessionMessages(selectedSession)
    }
  }, [selectedSession])

  const loadSessions = async () => {
    try {
      setLoading(true)
      const response = await api.get('/chat/sessions')
      setSessions(response.data.sessions || [])
    } catch (error) {
      console.error('Error loading sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSessionMessages = async (sessionId) => {
    try {
      setLoadingMessages(true)
      const response = await api.get('/chat/history', {
        params: {
          sessionId: sessionId,
          limit: 50
        }
      })
      setSessionMessages(response.data.history || [])
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoadingMessages(false)
    }
  }

  return (
    <div className="chat-history">
      <div className="chat-history-header">
        <h3>💬 Chat History</h3>
        <button
          className="btn-secondary"
          onClick={loadSessions}
          disabled={loading}
        >
          🔄 Refresh
        </button>
      </div>

      <div className="chat-history-content">
        {loading ? (
          <div className="loading-state">
            <span>Loading history...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="empty-state">
            <span>No chat history yet</span>
          </div>
        ) : (
          <>
            {/* Session List */}
            <div className="chat-sessions-list">
              {sessions.map((session) => (
                <div
                  key={session.sessionId}
                  className={`session-item ${selectedSession === session.sessionId ? 'active' : ''}`}
                  onClick={() => setSelectedSession(session.sessionId)}
                >
                  <div className="session-item-header">
                    <span className="session-icon">
                      {session.hasComparison ? '🔄' : '💬'}
                    </span>
                    <span className="session-preview">
                      {session.preview.substring(0, 60)}...
                    </span>
                  </div>
                  
                  <div className="session-meta">
                    <span>{session.messageCount} messages</span>
                    <span className="session-time">
                      {new Date(session.lastActive).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Messages for Selected Session */}
            {selectedSession && (
              <div className="session-messages">
                <div className="session-messages-header">
                  <h4>Messages</h4>
                </div>

                {loadingMessages ? (
                  <div className="loading-state">
                    <span>Loading messages...</span>
                  </div>
                ) : sessionMessages.length === 0 ? (
                  <div className="empty-state">
                    <span>No messages in this session</span>
                  </div>
                ) : (
                  <div className="messages-list">
                    {sessionMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className="history-message"
                        onClick={() => onSelectMessage(msg)}
                      >
                        <div className="history-message-question">
                          <strong>Q:</strong> {msg.question.substring(0, 80)}...
                        </div>
                        
                        <div className="history-message-meta">
                          <span className={`confidence-badge confidence-${msg.confidence >= 80 ? 'high' : msg.confidence >= 60 ? 'medium' : 'low'}`}>
                            {msg.confidence}% confident
                          </span>
                          
                          {msg.reviewCount > 0 && (
                            <span className="review-count">
                              {msg.reviewCount} reviews
                            </span>
                          )}
                          
                          {msg.isComparison && (
                            <span className="comparison-badge">
                              🔄 Comparison
                            </span>
                          )}
                          
                          <span className="timestamp">
                            {new Date(msg.createdAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default ChatHistory
