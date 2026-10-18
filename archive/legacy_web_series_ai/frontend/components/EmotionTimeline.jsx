import { memo, useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Tooltip, Filler
} from 'chart.js'
import './insights.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

const EMOTION_COLORS = {
  curiosity:    '#3b82f6',
  anxiety:      '#ef4444',
  excitement:   '#f59e0b',
  sadness:      '#6366f1',
  shock:        '#ec4899',
  satisfaction: '#10b981',
  anger:        '#dc2626'
}

const EMOTION_ICONS = {
  curiosity:    '🤔',
  anxiety:      '😰',
  excitement:   '🤩',
  sadness:      '😢',
  shock:        '😱',
  satisfaction: '😌',
  anger:        '😠'
}

const color = (e) => EMOTION_COLORS[e] || '#6b7280'
const icon  = (e) => EMOTION_ICONS[e]  || '😐'

const EmotionTimeline = memo(({ timeline }) => {
  const isEmpty = !timeline || timeline.length === 0

  const chartData = useMemo(() => ({
    labels: (timeline || []).map(p => `Ep ${p.episode}`),
    datasets: [{
      data: (timeline || []).map(p => +(p.intensity * 100).toFixed(1)),
      borderColor: '#01b4e4',
      backgroundColor: 'rgba(1,180,228,0.08)',
      pointBackgroundColor: (timeline || []).map(p => color(p.primaryEmotion)),
      pointBorderColor: '#0f172a',
      pointBorderWidth: 2,
      pointRadius: 6,
      pointHoverRadius: 9,
      fill: true,
      tension: 0.45,
      borderWidth: 2.5
    }]
  }), [timeline])

  const chartOpts = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15,23,42,0.95)',
        borderColor: 'rgba(1,180,228,0.3)',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          title: (items) => {
            const p = timeline[items[0].dataIndex]
            return `${icon(p.primaryEmotion)} ${p.primaryEmotion} — Ep ${p.episode}`
          },
          label: (ctx) => {
            const p = timeline[ctx.dataIndex]
            return ` Intensity: ${ctx.raw}%`
          },
          afterLabel: (ctx) => {
            const p = timeline[ctx.dataIndex]
            return ` ${p.description}`
          }
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#475569', font: { size: 11 } }
      },
      y: {
        min: 0, max: 100,
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#475569', font: { size: 11 }, callback: v => `${v}%` }
      }
    }
  }), [timeline])

  return (
    <div className="emotion-timeline insight-panel">
      <div className="panel-hero">
        <span className="section-label">✦ Emotional Arc</span>
        <h3>📈 Emotion Timeline</h3>
        <p>How emotional intensity shifts across episodes — helping you set the right expectations.</p>
      </div>

      {isEmpty ? (
        <p style={{ textAlign: 'center', color: '#475569', padding: '2rem' }}>
          No emotion data available for this series.
        </p>
      ) : (
        <>
          {/* Chart */}
          <div className="chart-card">
            <div style={{ height: 280 }}>
              <Line data={chartData} options={chartOpts} />
            </div>
          </div>

          {/* Episode cards */}
          <div className="episode-section">
            <p className="insight-section-title">🎬 Episode Breakdown</p>
            <div className="episode-grid">
              {timeline.map((point) => (
                <div
                  key={point.episode}
                  className="episode-card"
                  style={{ borderColor: `${color(point.primaryEmotion)}30` }}
                >
                  <div className="episode-top">
                    <span className="episode-label">Ep {point.episode}</span>
                    <span className="episode-emoji">{icon(point.primaryEmotion)}</span>
                  </div>
                  <div
                    className="emotion-chip"
                    style={{ background: `${color(point.primaryEmotion)}22`, color: color(point.primaryEmotion) }}
                  >
                    {point.primaryEmotion}
                  </div>
                  <div className="intensity-track">
                    <div
                      className="intensity-bar"
                      style={{
                        width: `${point.intensity * 100}%`,
                        background: color(point.primaryEmotion)
                      }}
                    />
                  </div>
                  <p className="episode-desc">{point.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="emotion-legend-section">
            <p className="insight-section-title">🎨 Emotion Guide</p>
            <div className="emotion-pills">
              {Object.entries(EMOTION_COLORS).map(([emotion, clr]) => (
                <div key={emotion} className="emotion-pill">
                  <span className="emotion-pill-dot" style={{ background: clr }} />
                  {icon(emotion)} {emotion}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
})

EmotionTimeline.displayName = 'EmotionTimeline'
export default EmotionTimeline
