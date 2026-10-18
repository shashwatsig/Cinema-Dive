import React, { forwardRef, useState } from 'react'
import SourceCard from './SourceCard'

const ChatWindow = forwardRef(({ messages, onFeedback }, ref) => {
  const [expandedMessage, setExpandedMessage] = useState(null)
  const [feedbackOpen, setFeedbackOpen] = useState(null)
  const [feedbackHelpful, setFeedbackHelpful] = useState(null)

  const handleFeedback = (messageId, helpful) => {
    setFeedbackOpen(messageId)
    setFeedbackHelpful(helpful)
  }

  const submitFeedback = (messageId, comment) => {
    onFeedback(messageId, feedbackHelpful, comment)
    setFeedbackOpen(null)
    setFeedbackHelpful(null)
  }

  return (
    <div className="chat-window">
      {messages.length === 0 ? (
        <div className="chat-empty-state">
          <div className="chat-empty-icon">💬</div>
          <p>Start a conversation!</p>
          <small>Ask questions about web series audience sentiment and preferences</small>
        </div>
      ) : (
        <div className="chat-messages">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`chat-message chat-message-${message.type}`}
              data-message-id={message.id}
            >
              <div className="chat-message-avatar">
                {message.type === 'user' ? '👤' : message.type === 'error' ? '❌' : '🤖'}
              </div>

              <div className="chat-message-content">
                <div className="chat-message-text">
                  {message.content}
                </div>

                {/* Display metadata for assistant messages */}
                {message.type === 'assistant' && (
                  <>
                    {/* Confidence Score */}
                    <div className="chat-message-metadata">
                      <span className={`confidence-badge confidence-${message.confidence >= 80 ? 'high' : message.confidence >= 60 ? 'medium' : 'low'}`}>
                        📊 Confidence: {message.confidence}%
                      </span>

                      {message.reviewCount > 0 && (
                        <span className="review-count-badge">
                          📚 {message.reviewCount} reviews analyzed
                        </span>
                      )}

                      {message.responseTime && (
                        <span className="response-time-badge">
                          ⏱️ {message.responseTime}
                        </span>
                      )}
                    </div>

                    {/* Comparison Indicator */}
                    {message.isComparison && message.comparedSeries && message.comparedSeries.length > 0 && (
                      <div className="comparison-indicator">
                        <span>🔄 Comparing: {message.comparedSeries.join(' vs ')}</span>
                      </div>
                    )}

                    {/* Sources */}
                    {message.sources && Object.keys(message.sources).length > 0 && (
                      <div className="chat-sources">
                        <div
                          className="chat-sources-header"
                          onClick={() => setExpandedMessage(
                            expandedMessage === message.id ? null : message.id
                          )}
                        >
                          <span>📌 Sources ({Object.values(message.sources).flat().length})</span>
                          <span className="expand-icon">
                            {expandedMessage === message.id ? '▼' : '▶'}
                          </span>
                        </div>

                        {expandedMessage === message.id && (
                          <div className="chat-sources-list">
                            {Object.entries(message.sources).map(([docType, sources]) => (
                              sources && sources.length > 0 && (
                                <div key={docType} className="source-group">
                                  <div className="source-group-title">
                                    {{
                                      review: 'USER REVIEWS',
                                      insight: 'KEY INSIGHTS',
                                      audience_profile: 'AUDIENCE PROFILE',
                                      content_dna: 'CONTENT DNA',
                                      series_description: 'SERIES DESCRIPTION',
                                      mongodb_insights: 'DATABASE INSIGHTS',
                                      mongodb_reviews: 'DATABASE REVIEWS'
                                    }[docType] || docType.replace(/_/g, ' ').toUpperCase()}
                                  </div>
                                  {sources.map((source, idx) => (
                                    <SourceCard key={idx} source={source} docType={docType} />
                                  ))}
                                </div>
                              )
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Feedback Section */}
                    {feedbackOpen !== message.id && (
                      <div className="chat-feedback">
                        <button
                          className="feedback-btn helpful"
                          onClick={() => handleFeedback(message.id, true)}
                          title="This was helpful"
                        >
                          👍 Helpful
                        </button>
                        <button
                          className="feedback-btn unhelpful"
                          onClick={() => handleFeedback(message.id, false)}
                          title="This was not helpful"
                        >
                          👎 Not helpful
                        </button>
                      </div>
                    )}

                     {feedbackOpen === message.id && (
                      <div className="feedback-form">
                        <textarea
                          placeholder="Tell us what could be improved... (optional)"
                          className="feedback-textarea"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.ctrlKey) {
                              const comment = e.target.value
                              submitFeedback(message.id, comment)
                            }
                          }}
                        />
                        <div className="feedback-buttons">
                          <button
                            className="btn-secondary"
                            onClick={() => setFeedbackOpen(null)}
                          >
                            Cancel
                          </button>
                          <button
                            className="btn-primary"
                            onClick={() => {
                              const textarea = document.querySelector('.feedback-textarea')
                              submitFeedback(message.id, textarea.value)
                            }}
                          >
                            Submit
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="chat-message-time">
                  {message.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          <div ref={ref} />
        </div>
      )}
    </div>
  )
})

ChatWindow.displayName = 'ChatWindow'

export default ChatWindow
