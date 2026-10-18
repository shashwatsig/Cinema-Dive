import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { favoritesAPI } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import './ListPage.css'

const POSTER_BASE = 'https://image.tmdb.org/t/p/w185'

const Favorites = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    favoritesAPI.get()
      .then(res => setItems(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  const handleRemove = async (id) => {
    try {
      await favoritesAPI.remove(id)
      setItems(prev => prev.filter(i => i._id !== id))
    } catch {}
  }

  if (!user) return (
    <div className="page-container">
      <div className="state-box" style={{ paddingTop: 80 }}>
        <span className="state-icon">🔒</span>
        <p>Sign in to view your favorites</p>
        <Link to="/login" className="btn btn-primary">Sign In</Link>
      </div>
    </div>
  )

  return (
    <div className="page-container list-page">
      <div className="list-header">
        <h1 className="discover-title">My Favorites</h1>
        <p className="discover-subtitle">{items.length} title{items.length !== 1 ? 's' : ''} saved</p>
      </div>

      {loading ? (
        <div className="state-box"><div className="spinner" /></div>
      ) : items.length === 0 ? (
        <div className="state-box">
          <span className="state-icon">♡</span>
          <p>No favorites yet. Heart a movie or show to save it here!</p>
          <Link to="/" className="btn btn-primary">Browse Content</Link>
        </div>
      ) : (
        <div className="list-grid">
          {items.map(item => (
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
                <button className="btn btn-ghost remove-btn" onClick={() => handleRemove(item._id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Favorites
