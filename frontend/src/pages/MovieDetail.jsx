import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { moviesAPI, watchlistAPI, favoritesAPI } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import MediaCard from '../components/MediaCard'
import './DetailPage.css'

const BACKDROP_BASE = 'https://image.tmdb.org/t/p/original'
const POSTER_BASE = 'https://image.tmdb.org/t/p/w500'
const PROFILE_BASE = 'https://image.tmdb.org/t/p/w185'

const MovieDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [movie, setMovie] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [inWatchlist, setInWatchlist] = useState(false)
  const [inFavorites, setInFavorites] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [watchlistItemId, setWatchlistItemId] = useState(null)
  const [favoriteItemId, setFavoriteItemId] = useState(null)

  useEffect(() => {
    const fetchMovie = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await moviesAPI.details(id)
        setMovie(res.data)
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load movie details')
      } finally {
        setLoading(false)
      }
    }
    fetchMovie()
  }, [id])

  useEffect(() => {
    if (!user || !movie) return
    const checkLists = async () => {
      try {
        const [wlRes, favRes] = await Promise.allSettled([watchlistAPI.get(), favoritesAPI.get()])
        if (wlRes.status === 'fulfilled') {
          const wlItem = wlRes.value.data.find(i => i.tmdbId === movie.id && i.mediaType === 'movie')
          setInWatchlist(!!wlItem)
          setWatchlistItemId(wlItem?._id || null)
        }
        if (favRes.status === 'fulfilled') {
          const favItem = favRes.value.data.find(i => i.tmdbId === movie.id && i.mediaType === 'movie')
          setInFavorites(!!favItem)
          setFavoriteItemId(favItem?._id || null)
        }
      } catch {}
    }
    checkLists()
  }, [user, movie])

  const toggleWatchlist = async () => {
    if (!user) { navigate('/login'); return }
    setActionLoading(true)
    try {
      if (inWatchlist && watchlistItemId) {
        await watchlistAPI.remove(watchlistItemId)
        setInWatchlist(false)
        setWatchlistItemId(null)
      } else {
        const res = await watchlistAPI.add({
          tmdbId: movie.id, mediaType: 'movie',
          title: movie.title, posterPath: movie.poster_path,
          voteAverage: movie.vote_average, releaseDate: movie.release_date
        })
        setInWatchlist(true)
        setWatchlistItemId(res.data._id)
      }
    } catch {} finally { setActionLoading(false) }
  }

  const toggleFavorite = async () => {
    if (!user) { navigate('/login'); return }
    setActionLoading(true)
    try {
      if (inFavorites && favoriteItemId) {
        await favoritesAPI.remove(favoriteItemId)
        setInFavorites(false)
        setFavoriteItemId(null)
      } else {
        const res = await favoritesAPI.add({
          tmdbId: movie.id, mediaType: 'movie',
          title: movie.title, posterPath: movie.poster_path,
          voteAverage: movie.vote_average, releaseDate: movie.release_date
        })
        setInFavorites(true)
        setFavoriteItemId(res.data._id)
      }
    } catch {} finally { setActionLoading(false) }
  }

  if (loading) return (
    <div className="detail-loading">
      <div className="spinner" />
      <p>Loading...</p>
    </div>
  )

  if (error) return (
    <div className="state-box" style={{ paddingTop: 120 }}>
      <span className="state-icon">⚠️</span>
      <p>{error}</p>
      <button className="btn btn-primary" onClick={() => navigate(-1)}>Go Back</button>
    </div>
  )

  if (!movie) return null

  const cast = movie.credits?.cast?.slice(0, 12) || []
  const runtime = movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : null

  return (
    <div className="detail-page fade-in">
      {/* Backdrop */}
      {movie.backdrop_path && (
        <div className="detail-backdrop">
          <img src={`${BACKDROP_BASE}${movie.backdrop_path}`} alt={movie.title} />
          <div className="detail-backdrop-overlay" />
        </div>
      )}

      <div className="page-container detail-content">
        <button className="btn btn-ghost back-btn" onClick={() => navigate(-1)}>← Back</button>

        <div className="detail-hero">
          <div className="detail-poster">
            {movie.poster_path
              ? <img src={`${POSTER_BASE}${movie.poster_path}`} alt={movie.title} />
              : <div className="poster-placeholder" style={{ height: 450 }}><span>🎬</span></div>
            }
          </div>

          <div className="detail-info">
            <h1 className="detail-title">{movie.title}</h1>
            {movie.tagline && <p className="detail-tagline">{movie.tagline}</p>}

            <div className="detail-meta-row">
              {movie.vote_average > 0 && (
                <span className="chip chip-accent">⭐ {movie.vote_average.toFixed(1)} ({movie.vote_count?.toLocaleString()} votes)</span>
              )}
              {movie.release_date && <span className="chip">{new Date(movie.release_date).getFullYear()}</span>}
              {runtime && <span className="chip">{runtime}</span>}
              {movie.status && <span className="chip">{movie.status}</span>}
            </div>

            {movie.genres?.length > 0 && (
              <div className="detail-genres">
                {movie.genres.map(g => <span key={g.id} className="chip">{g.name}</span>)}
              </div>
            )}

            {movie.overview && <p className="detail-overview">{movie.overview}</p>}

            <div className="detail-actions">
              {movie.trailerKey && (
                <a
                  href={`https://www.youtube.com/watch?v=${movie.trailerKey}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  ▶ Watch Trailer
                </a>
              )}
              <button
                className={`btn ${inWatchlist ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={toggleWatchlist}
                disabled={actionLoading}
              >
                {inWatchlist ? '✓ In Watchlist' : '+ Watchlist'}
              </button>
              <button
                className={`btn ${inFavorites ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={toggleFavorite}
                disabled={actionLoading}
              >
                {inFavorites ? '♥ Favorited' : '♡ Favorite'}
              </button>
            </div>
          </div>
        </div>

        {/* Cast */}
        {cast.length > 0 && (
          <section className="detail-section">
            <h2 className="detail-section-title">Cast</h2>
            <div className="cast-grid">
              {cast.map(person => (
                <div key={person.id} className="cast-card">
                  <div className="cast-photo">
                    {person.profile_path
                      ? <img src={`${PROFILE_BASE}${person.profile_path}`} alt={person.name} loading="lazy" />
                      : <span>👤</span>
                    }
                  </div>
                  <div className="cast-name">{person.name}</div>
                  <div className="cast-character">{person.character}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Similar */}
        {movie.similar?.length > 0 && (
          <section className="detail-section">
            <h2 className="detail-section-title">Similar Movies</h2>
            <div className="poster-row">
              {movie.similar.slice(0, 8).map(m => <MediaCard key={m.id} item={m} mediaType="movie" />)}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default MovieDetail
