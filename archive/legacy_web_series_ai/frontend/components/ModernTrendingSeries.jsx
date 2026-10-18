import { useState, useEffect, memo, useCallback } from 'react'
import { seriesAPI } from '../services/api'

const GENRE_MAP = {
  10759: 'Action', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 10762: 'Kids',
  9648: 'Mystery', 10763: 'News', 10764: 'Reality', 10765: 'Sci-Fi',
  10766: 'Soap', 10767: 'Talk', 10768: 'War', 37: 'Western'
}

const getGenreName = (id) => GENRE_MAP[id] || (typeof id === 'string' ? id : 'Unknown')

const SeriesCard = memo(({ show, index, onClick }) => (
  <div
    className="series-card"
    onClick={() => onClick(show.id)}
    style={{ animationDelay: `${index * 0.06}s` }}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => e.key === 'Enter' && onClick(show.id)}
    aria-label={`View details for ${show.name}`}
  >
    <div className="poster-container">
      {show.poster_path ? (
        <img
          className="series-poster"
          src={`https://image.tmdb.org/t/p/w500${show.poster_path}`}
          alt={show.name}
          loading="lazy"
        />
      ) : (
        <div className="no-poster"><span>🎬</span><p>No Image</p></div>
      )}
      <div className="rating-badge">⭐ {(show.vote_average ?? 0).toFixed(1)}</div>
      <div className="play-overlay">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      </div>
    </div>
    <div className="series-info">
      <h3 className="series-title">{show.name}</h3>
      <div className="series-meta">
        <span className="year">{show.first_air_date ? new Date(show.first_air_date).getFullYear() : 'N/A'}</span>
        <span className="popularity">👥 {Math.round(show.popularity || 0)}</span>
      </div>
      <p className="series-overview">
        {(show.overview || 'No description available.').substring(0, 120)}...
      </p>
      <div className="genre-tags">
        {(show.genre_ids || []).slice(0, 2).map(id => (
          <span key={id} className="genre-tag">{getGenreName(id)}</span>
        ))}
      </div>
    </div>
  </div>
))
SeriesCard.displayName = 'SeriesCard'

const ModernTrendingSeries = memo(({ onSeriesClick }) => {
  const [series, setSeries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTrendingSeries = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await seriesAPI.getTrending()
      const results = Array.isArray(response.data) ? response.data : []
      setSeries(results)
      if (results.length === 0) setError('No trending series found. Try again later.')
    } catch (err) {
      const msg = err.code === 'ECONNABORTED'
        ? 'Request timed out. Please check your connection.'
        : err.response?.data?.message || 'Failed to fetch trending series.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTrendingSeries() }, [])

  if (loading) {
    return (
      <section className="trending-section">
        <div className="section-header">
          <h2 className="section-title">🔥 Trending Now</h2>
        </div>
        <div className="trending-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="series-card skeleton-card">
              <div className="skeleton skeleton-poster" />
              <div className="series-info">
                <div className="skeleton skeleton-title" />
                <div className="skeleton skeleton-meta" />
                <div className="skeleton skeleton-text" />
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <div className="error-state">
        <span className="error-icon">⚠️</span>
        <p>{error}</p>
        <button className="retry-btn" onClick={fetchTrendingSeries}>Retry</button>
      </div>
    )
  }

  return (
    <section className="trending-section">
      <div className="section-header">
        <h2 className="section-title">🔥 Trending Now</h2>
        <div className="trend-indicator">
          <span className="pulse-dot"></span>
          Live Data
        </div>
      </div>
      <div className="trending-grid">
        {series.map((show, index) => (
          <SeriesCard key={show.id} show={show} index={index} onClick={onSeriesClick} />
        ))}
      </div>
    </section>
  )
})

ModernTrendingSeries.displayName = 'ModernTrendingSeries'
export default ModernTrendingSeries