import { memo, useMemo } from 'react'
import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import './insights.css'

ChartJS.register(ArcElement, Tooltip, Legend)

const AUDIENCE_FIELDS = [
  { key: 'primaryDemographic', label: 'Primary Demographic' },
  { key: 'engagementLevel',    label: 'Engagement Level' },
  { key: 'emotionalResponse',  label: 'Emotional Response' },
  { key: 'recommendedFor',     label: 'Recommended For' }
]

const WhyInsights = memo(({ insights }) => {
  if (!insights) return <div className="detail-loading"><div className="loading-spinner" /><p>Generating insights…</p></div>

  const { whyLiked, whyDisliked, overallSentiment, keyThemes, audienceProfile } = insights

  const pos = Math.round((overallSentiment?.positive ?? 0) * 100)
  const neu = Math.round((overallSentiment?.neutral  ?? 0) * 100)
  const neg = Math.round((overallSentiment?.negative ?? 0) * 100)

  const maxFreq = useMemo(() => Math.max(...(keyThemes || []).map(t => t.frequency), 1), [keyThemes])

  const doughnutData = useMemo(() => ({
    labels: ['Positive', 'Neutral', 'Negative'],
    datasets: [{
      data: [pos, neu, neg],
      backgroundColor: ['rgba(34,197,94,0.85)', 'rgba(100,116,139,0.85)', 'rgba(239,68,68,0.85)'],
      borderColor: 'transparent',
      borderWidth: 0,
      hoverOffset: 8
    }]
  }), [pos, neu, neg])

  const doughnutOpts = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: true,
    cutout: '72%',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw}%` }
      }
    }
  }), [])

  return (
    <div className="why-insights insight-panel">
      <div className="panel-hero">
        <span className="section-label">✦ AI Analysis</span>
        <h3>🧠 WHY Insights</h3>
        <p>AI-extracted reasoning behind audience reactions — not just what they felt, but why.</p>
      </div>

      {/* Sentiment strip */}
      <div className="sentiment-strip">
        <div className="sentiment-strip-pos" style={{ width: `${pos}%` }} />
        <div className="sentiment-strip-neu" style={{ width: `${neu}%` }} />
        <div className="sentiment-strip-neg" style={{ width: `${neg}%` }} />
      </div>

      {/* Reason cards */}
      <div className="insights-grid" style={{ marginTop: '1.5rem' }}>
        <div className="insight-card positive">
          <div className="insight-card-header">
            <div className="insight-card-title"><span>👍</span> Why Viewers Loved It</div>
            <span className="insight-badge pos">{pos}% Positive</span>
          </div>
          {whyLiked?.length > 0 ? (
            <ul className="reason-list">
              {whyLiked.map((r, i) => (
                <li key={i} className="reason-item">
                  <span className="reason-dot" />
                  {r}
                </li>
              ))}
            </ul>
          ) : <p className="no-data">Not enough positive reviews to analyse</p>}
        </div>

        <div className="insight-card negative">
          <div className="insight-card-header">
            <div className="insight-card-title"><span>👎</span> Areas of Concern</div>
            <span className="insight-badge neg">{neg}% Negative</span>
          </div>
          {whyDisliked?.length > 0 ? (
            <ul className="reason-list">
              {whyDisliked.map((r, i) => (
                <li key={i} className="reason-item">
                  <span className="reason-dot" />
                  {r}
                </li>
              ))}
            </ul>
          ) : <p className="no-data">Not enough negative reviews to analyse</p>}
        </div>
      </div>

      {/* Sentiment doughnut */}
      <div className="sentiment-section">
        <p className="insight-section-title">📊 Audience Sentiment</p>
        <div className="sentiment-chart-wrap">
          <div style={{ width: 200, margin: '0 auto' }}>
            <Doughnut data={doughnutData} options={doughnutOpts} />
          </div>
          <div className="sentiment-legend-list">
            {[
              { label: 'Positive', pct: pos, color: '#22c55e' },
              { label: 'Neutral',  pct: neu, color: '#64748b' },
              { label: 'Negative', pct: neg, color: '#ef4444' }
            ].map(({ label, pct, color }) => (
              <div key={label} className="sentiment-legend-row">
                <div className="sentiment-legend-left">
                  <span className="legend-dot" style={{ background: color }} />
                  {label}
                </div>
                <span className="sentiment-pct" style={{ color }}>{pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key themes */}
      {keyThemes?.length > 0 && (
        <div className="themes-section">
          <p className="insight-section-title">🔑 Most Discussed Themes</p>
          {keyThemes.map((t, i) => (
            <div key={i} className="theme-bar-row">
              <span className="theme-name">{t.topic}</span>
              <div className="theme-track">
                <div className="theme-fill" style={{ width: `${(t.frequency / maxFreq) * 100}%` }} />
              </div>
              <span className="theme-count">{t.frequency}</span>
            </div>
          ))}
        </div>
      )}

      {/* Audience profile */}
      {audienceProfile && (
        <div className="audience-section">
          <p className="insight-section-title">👥 Audience Profile</p>
          <div className="audience-grid">
            {AUDIENCE_FIELDS.map(({ key, label }) => (
              <div key={key} className="audience-card">
                <div className="audience-label">{label}</div>
                <div className="audience-value">{audienceProfile[key] || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="insight-disclaimer">
        💡 <strong>AI Insight:</strong> Generated by analysing review patterns, sentiment scores, and content metadata.
        Directional insights into audience psychology — not definitive conclusions.
      </p>
    </div>
  )
})

WhyInsights.displayName = 'WhyInsights'
export default WhyInsights
