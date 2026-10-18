import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { watchlistAPI } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import './ListPage.css'

const POSTER_BASE = 'https://image.tmdb.org/t/p/w185'
const STATUSES = ['All', 'Planned', 'Watching', 'Completed', 'Dropped']

const Watchlist = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    if (!user) return
    watchlistAPI.get()
      .then(res => setItems(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  const handleRemove = async (id) => {
    try {
      await watchlistAPI.remove(id)
      setItems(prev => prev.filter(i => i._id !== id))
    } catch {}
  }

  const handleStatusChange = async (id, status) => {
    try {
      const res = await watchlistAPI.updateStatus(id, status)
      setItems(prev => prev.map(i => i._id === id ? res.data : i))
    } catch {}
  }

  if (!user) return (
    <div className="page-container">
      <div className="state-box" style={{ paddingTop: 80 }}>
        <span className="state-icon">🔒</span>
        <p>Sign in to manage your watchlist</p>
        <Link to="/login" className="btn btn-primary">Sign In</Link>
      </div>
    </div>
  )

  const filtered = filter === 'All' ? items : items.filter(i => i.status === filter)

  return (
    <div className="page-container list-page">
      <div className="list-header">
        <h1 className="discover-title">My Watchlist</h1>
        <p className="discover-subtitle">{items.length} title{items.length !== 1 ? 's' : ''} saved</p>
      </div>

      <div className="list-filters">
        {STATUSES.map(s => (
          <button key={s} className={`filter-chip ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="state-box"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="state-box">
          <span className="state-icon">📋</span>
          <p>{filter === 'All' ? 'Your watchlist is empty. Start adding movies and TV shows!' : `No items with status "${filter}"`}</p>
          {filter === 'All' && <Link to="/" className="btn btn-primary">Browse Content</Link>}
        </div>
      ) : (
        <div className="list-grid">
          {filtered.map(item => (
            <div key={item._id} className="list-card">
              <div className="list-card-poster" onClick={() => navigate(`/${item.mediaType === 'movie' ? 'movies' : 'tv'}/${item.tmdbId}`)}>
                {item.posterPath
                  ? <img src={`${POSTER_BASE}${item.posterPath}`} alt={item.title} loading="lazy" />
                  : <span>🎬</span>
                }
                <span className={`list-type-badge ${item.mediaType}`}>{item.mediaType === 'movie' ? 'Movie' : 'TV'}</span>
              </div>
              <div className="list-card-info">
                <div className="list-card-title" onClick={() => navigate(`/${item.mediaType === 'movie' ? 'movies' : 'tv'}/${item.tmdbId}`)}>
                  {item.title}
                </div>
                {item.voteAverage > 0 && <div className="list-card-rating">⭐ {item.voteAverage.toFixed(1)}</div>}
                <select
                  className="status-select"
                  value={item.status}
                  onChange={e => handleStatusChange(item._id, e.target.value)}
                >
                  {STATUSES.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button className="btn btn-ghost remove-btn" onClick={() => handleRemove(item._id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Watchlist
