import { useAuth } from '../hooks/useAuth'

const FEATURES = [
  { icon: '🧠', label: 'WHY-Based Analysis' },
  { icon: '📈', label: 'Emotion Timelines' },
  { icon: '💡', label: 'Explainable Picks' }
]

const DashboardHeader = () => {
  const { user } = useAuth()

  return (
    <div className="dashboard-header">
      <div className="dashboard-banner">
        <div className="banner-glow" />
        <div className="banner-content">
          <p className="banner-label">🎬 AI Insight Dashboard</p>
          <h1>Welcome back, <span className="banner-name">{user.name}</span>!</h1>
          <p className="banner-sub">
            Discover <strong>why</strong> web series work — through audience psychology and explainable AI.
          </p>
          <div className="banner-features">
            {FEATURES.map((f) => (
              <span key={f.label} className="banner-pill">
                {f.icon} {f.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardHeader
