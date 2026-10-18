import React, { useState } from 'react'

function SourceCard({ source, docType }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getDocTypeIcon = (type) => {
    const icons = {
      'review': '💬',
      'insight': '💡',
      'audience_profile': '👥',
      'content_dna': '🧬',
      'series_description': '📖',
      'topic_summary': '📚',
      'emotion_summary': '😊'
    }
    return icons[type] || '📄'
  }

  const getDocTypeLabel = (type) => {
    const labels = {
      'review': 'Review',
      'insight': 'Key Insight',
      'audience_profile': 'Audience Profile',
      'content_dna': 'Content DNA',
      'series_description': 'Series Description',
      'topic_summary': 'Topic Summary',
      'emotion_summary': 'Emotion Summary'
    }
    return labels[type] || type
  }

  const getSimilarityColor = (similarity) => {
    if (similarity >= 0.85) return '#10b981' // Green
    if (similarity >= 0.70) return '#f59e0b' // Amber
    return '#ef4444' // Red
  }

  return (
    <div className="source-card">
      <div
        className="source-card-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="source-card-left">
          <span className="source-icon">{getDocTypeIcon(docType)}</span>
          
          <div className="source-info">
            <div className="source-type">
              {getDocTypeLabel(docType)}
              {source.seriesTitle && (
                <span className="source-series"> • {source.seriesTitle}</span>
              )}
            </div>
            
            <div className="source-preview">
              {source.preview}
            </div>
          </div>
        </div>

        <div className="source-card-right">
          {source.similarity !== undefined && (
            <div className="similarity-score">
              <div
                className="similarity-bar"
                style={{
                  width: `${source.similarity * 100}%`,
                  backgroundColor: getSimilarityColor(source.similarity)
                }}
              />
              <span className="similarity-text">
                {Math.round(source.similarity * 100)}%
              </span>
            </div>
          )}
          
          <span className="expand-icon">
            {isExpanded ? '▼' : '▶'}
          </span>
        </div>
      </div>

      {isExpanded && (source.content || source.preview) && (
        <div className="source-card-expanded" style={{ whiteSpace: 'pre-line' }}>
          <p>{source.content || source.preview}</p>
        </div>
      )}
    </div>
  )
}

export default SourceCard
