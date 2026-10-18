import { memo } from 'react'
import './insights.css'

const METHODS = [
  { icon: '🎭', title: 'Genre Preference', desc: 'Matches your preferred genres and narrative themes.' },
  { icon: '💭', title: 'Emotional Fit',    desc: 'Aligns with the emotional journey you enjoy.' },
  { icon: '📊', title: 'Quality Score',    desc: 'Factors in critical acclaim and audience ratings.' },
  { icon: '🎯', title: 'Explainable AI',   desc: 'Every pick comes with clear reasoning, not a black-box.' }
]

const RecommendationsList = memo(({ recommendations, onSeriesClick }) => {
  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="recommendations-empty insight-panel">
        <div className="panel-hero">
          <span className="section-label">✦ Recommendations</span>
          <h3>💡 Smart Recommendations</h3>
          <p>No recommendations available right now. Try another series.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="recommendations-list insight-panel">
      <div className="panel-hero">
        <span className="section-label">✦ Explainable AI</span>
        <h3>💡 Smart Recommendations</h3>
        <p>Each pick explains <strong>why</strong> it matches you — not just "because you watched X".</p>
      </div>

      <div className="recommendations-grid">
        {recommendations.map((rec, index) => (
          <div
            key={rec.series?.id ?? index}
            className="recommendation-card"
            onClick={() => onSeriesClick(rec.series?.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onSeriesClick(rec.series?.id)}
            aria-label={`View details for ${rec.series?.name || rec.series?.title}`}
          >
            {/* Rank */}
            <div className="rec-rank-badge">#{index + 1}</div>

            {/* Poster */}
            <div className="rec-poster">
              {rec.series?.poster_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w200${rec.series.poster_path}`}
                  alt={rec.series?.name || rec.series?.title}
                  loading="lazy"
                />
              ) : (
                <div className="no-poster-rec">🎬</div>
              )}
            </div>

            {/* Content */}
            <div className="rec-content">
              <h4 className="rec-title">{rec.series?.name || rec.series?.title || 'Unknown Series'}</h4>

              <div className="rec-meta-row">
                {rec.series?.vote_average != null && (
                  <span className="rec-rating">⭐ {(rec.series.vote_average).toFixed(1)}</span>
                )}
                <span className="match-pill">{Math.round((rec.matchScore ?? 0) * 100)}% Match</span>
              </div>

              <div className="match-track">
                <div className="match-fill" style={{ width: `${(rec.matchScore ?? 0) * 100}%` }} />
              </div>

              {rec.explanation && (
                <div className="rec-why-box">
                  <div className="rec-why-label">🎯 Why this matches you</div>
                  <p className="rec-why-text">{rec.explanation}</p>
                </div>
              )}

              {rec.series?.overview && (
                <p className="rec-overview-text">{rec.series.overview}</p>
              )}

              {rec.series?.genres?.length > 0 && (
                <div className="rec-genre-row">
                  {rec.series.genres.slice(0, 3).map((g, i) => (
                    <span key={g.id ?? g.name ?? i} className="rec-genre-tag">{g.name}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Methodology */}
      <div className="methodology-section">
        <p className="insight-section-title">🔬 How We Generate Recommendations</p>
        <div className="methodology-grid">
          {METHODS.map(m => (
            <div key={m.title} className="method-card">
              <div className="method-icon-wrap">{m.icon}</div>
              <div>
                <div className="method-title">{m.title}</div>
                <p className="method-desc">{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="rec-disclaimer">
        🤖 <strong>AI-Powered:</strong> Our recommendation engine prioritises explainability.
        Every suggestion includes reasoning so you can make informed viewing decisions.
      </p>
    </div>
  )
})

RecommendationsList.displayName = 'RecommendationsList'
export default RecommendationsList
