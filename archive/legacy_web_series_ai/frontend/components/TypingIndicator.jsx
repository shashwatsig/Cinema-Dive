import React from 'react'

function TypingIndicator() {
  return (
    <div className="typing-indicator">
      <div className="typing-indicator-avatar">🤖</div>
      
      <div className="typing-indicator-dots">
        <span className="typing-dot"></span>
        <span className="typing-dot"></span>
        <span className="typing-dot"></span>
      </div>
      
      <div className="typing-indicator-text">
        <span>Analyzing reviews and generating insights...</span>
      </div>
    </div>
  )
}

export default TypingIndicator
