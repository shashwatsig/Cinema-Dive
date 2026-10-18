import { useState, useEffect, useCallback, memo } from 'react'
import { seriesAPI } from '../services/api'
import EmotionTimeline from './EmotionTimeline'
import WhyInsights from './WhyInsights'
import RecommendationsList from './RecommendationsList'
import './insights.css'

const TABS = [
  { id: 'insights',        label: '🧠 WHY Insights' },
  { id: 'timeline',        label: '📈 Emotion Timeline' },
  { id: 'recommendations', label: '💡 Recommendations' }
]

const SeriesDetail = memo(({ seriesId, onBack, onSeriesSelect }) => {
  const [seriesData, setSeriesData]       = useState(null)
  const [recommendations, setRecs]        = useState([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)
  const [activeTab, setActiveTab]         = useState('insights')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [detailRes, recRes] = await Promise.allSettled([
        seriesAPI.getDetails(seriesId),
        seriesAPI.getRecommendations(seriesId)
      ])
      if (detailRes.status === 'fulfilled') {
        setSeriesData(detailRes.value.data)
      } else {
        setError(detailRes.reason?.response?.data?.message || 'Failed to load series.')
      }
      if (recRes.status === 'fulfilled' && Array.isArray(recRes.value.data)) {
        setRecs(recRes.value.data)
      }
    } finally {
      setLoading(false)
    }
  }, [seriesId])

  useEffect(() => { if (seriesId) fetchAll() }, [fetchAll, seriesId])

  if (loading) return (
    <div className="series-detail">
      <div className="detail-loading">
        <div className="loading-spinner" />
        <p>Analysing series…</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="series-detail">
      <button className="back-button" onClick={onBack}>← Back</button>
      <div className="detail-loading" style={{ color: '#ef4444' }}>
        <span style={{ fontSize: '2rem' }}>⚠️</span>
        <p>{error}</p>
        <button className="retry-btn" onClick={fetchAll}>Retry</button>
      </div>
    </div>
  )

  if (!seriesData) return null

  const { details, aiInsights } = seriesData

  return (
    <div className="series-detail">
      <button className="back-button" onClick={onBack}>← Back to Trending</button>

      {/* Hero */}
      <div className="series-hero">
        <div className="series-poster-wrap">
          {details.poster_path ? (
            <img
              src={`https://image.tmdb.org/t/p/w500${details.poster_path}`}
              alt={details.name}
            />
          ) : (
            <div className="poster-placeholder">🎬</div>
          )}
        </div>

        <div className="series-hero-info">
          <h1>{details.name}</h1>

          <div className="hero-meta-row">
            <span className="meta-chip rating">⭐ {(details.vote_average ?? 0).toFixed(1)}</span>
            {details.first_air_date && (
              <span className="meta-chip">{new Date(details.first_air_date).getFullYear()}</span>
            )}
            {details.number_of_seasons != null && (
              <span className="meta-chip">
                {details.number_of_seasons} Season{details.number_of_seasons !== 1 ? 's' : ''}
              </span>
            )}
            {details.number_of_episodes != null && (
              <span className="meta-chip">{details.number_of_episodes} Episodes</span>
            )}
          </div>

          {details.genres?.length > 0 && (
            <div className="hero-genres">
              {details.genres.map((g, i) => (
                <span key={g.id ?? g.name ?? i} className="genre-chip">{g.name}</span>
              ))}
            </div>
          )}

          {details.overview && (
            <p className="hero-overview">{details.overview}</p>
          )}

          {details.networks?.length > 0 && (
            <p className="hero-network">
              <strong>Network: </strong>
              {details.networks.map(n => n.name).join(', ')}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="analysis-tabs" role="tablist">
        {TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            className={`tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="tab-content" role="tabpanel">
        {activeTab === 'insights' && (
          <WhyInsights insights={aiInsights?.whyInsights} />
        )}
        {activeTab === 'timeline' && (
          <EmotionTimeline timeline={aiInsights?.emotionTimeline} />
        )}
        {activeTab === 'recommendations' && (
          <RecommendationsList
            recommendations={recommendations}
            onSeriesClick={onSeriesSelect || onBack}
          />
        )}
      </div>
    </div>
  )
})

SeriesDetail.displayName = 'SeriesDetail'
export default SeriesDetail
