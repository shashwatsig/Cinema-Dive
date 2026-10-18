import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import ModernTrendingSeries from '../components/ModernTrendingSeries'
import SeriesDetail from '../components/SeriesDetail'
import DashboardHeader from '../components/DashboardHeader'
import './Dashboard.css'

const Dashboard = () => {
  const { user } = useAuth()
  const [selectedSeriesId, setSelectedSeriesId] = useState(null)

  // Handle search selection from Header
  useEffect(() => {
    const handler = (e) => setSelectedSeriesId(e.detail.id)
    window.addEventListener('series-selected', handler)
    // Check if navigated from search
    const stored = sessionStorage.getItem('selectedSeriesId')
    if (stored) {
      setSelectedSeriesId(Number(stored))
      sessionStorage.removeItem('selectedSeriesId')
    }
    return () => window.removeEventListener('series-selected', handler)
  }, [])

  const handleSeriesClick = useCallback((seriesId) => setSelectedSeriesId(seriesId), [])
  const handleBackToTrending = useCallback(() => setSelectedSeriesId(null), [])

  if (!user) {
    return (
      <div className="auth-required">
        <h2>🔒 Authentication Required</h2>
        <p>Please login to access the AI-powered insights dashboard.</p>
        <Link to="/login">Sign In to Continue</Link>
      </div>
    )
  }

  return (
    <div className="dashboard">
      {!selectedSeriesId ? (
        <>
          <DashboardHeader />
          <ModernTrendingSeries onSeriesClick={handleSeriesClick} />
        </>
      ) : (
        <SeriesDetail 
          seriesId={selectedSeriesId} 
          onBack={handleBackToTrending}
          onSeriesSelect={handleSeriesClick}
        />
      )}
    </div>
  )
}

export default Dashboard