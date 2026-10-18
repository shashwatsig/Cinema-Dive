import React, { useState, useRef, useEffect } from 'react'

function ChatInput({ onSend, disabled, placeholder }) {
  const [input, setInput] = useState('')
  const textareaRef = useRef(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [input])

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (input.trim() && !disabled) {
      onSend(input.trim())
      setInput('')
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form className="chat-input-form" onSubmit={handleSubmit}>
      <div className="chat-input-wrapper">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || 'Ask about any series...'}
          disabled={disabled}
          className="chat-input-textarea"
          rows="1"
        />
        
        <button
          type="submit"
          disabled={disabled || !input.trim()}
          className="chat-input-btn"
          title="Send message (Enter) or Shift+Enter for new line"
        >
          {disabled ? '⏳' : '➤'}
        </button>
      </div>
      
      <div className="chat-input-hint">
        <small>Press Enter to send, Shift+Enter for new line</small>
      </div>
    </form>
  )
}

export default ChatInput
