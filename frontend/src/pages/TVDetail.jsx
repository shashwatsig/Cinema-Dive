import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { tvAPI, watchlistAPI, favoritesAPI } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import MediaCard from '../components/MediaCard'
import './DetailPage.css'

const BACKDROP_BASE = 'https://image.tmdb.org/t/p/original'
const POSTER_BASE = 'https://image.tmdb.org/t/p/w500'
const STILL_BASE = 'https://image.tmdb.org/t/p/w300'
const PROFILE_BASE = 'https://image.tmdb.org/t/p/w185'

const pad = (n) => String(n).padStart(2, '0')

const TVDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [show, setShow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedSeason, setSelectedSeason] = useState(1)
  const [seasonData, setSeasonData] = useState(null)
  const [seasonLoading, setSeasonLoading] = useState(false)
  const [inWatchlist, setInWatchlist] = useState(false)
  const [inFavorites, setInFavorites] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [watchlistItemId, setWatchlistItemId] = useState(null)
  const [favoriteItemId, setFavoriteItemId] = useState(null)

  useEffect(() => {
    const fetchShow = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await tvAPI.details(id)
        setShow(res.data)
        // Pick first real season (skip season 0 = specials)
        const firstSeason = res.data.seasons?.find(s => s.season_number > 0)
        if (firstSeason) setSelectedSeason(firstSeason.season_number)
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load TV show details')
      } finally {
        setLoading(false)
      }
    }
    fetchShow()
  }, [id])

  useEffect(() => {
    if (!show) return
    const fetchSeason = async () => {
      setSeasonLoading(true)
      try {
        const res = await tvAPI.season(id, selectedSeason)
        setSeasonData(res.data)
      } catch {
        setSeasonData(null)
      } finally {
        setSeasonLoading(false)
      }
    }
    fetchSeason()
  }, [id, selectedSeason, show])

  useEffect(() => {
    if (!user || !show) return
    const checkLists = async () => {
      try {
        const [wlRes, favRes] = await Promise.allSettled([watchlistAPI.get(), favoritesAPI.get()])
        if (wlRes.status === 'fulfilled') {
          const item = wlRes.value.data.find(i => i.tmdbId === show.id && i.mediaType === 'tv')
          setInWatchlist(!!item)
          setWatchlistItemId(item?._id || null)
        }
        if (favRes.status === 'fulfilled') {
          const item = favRes.value.data.find(i => i.tmdbId === show.id && i.mediaType === 'tv')
          setInFavorites(!!item)
          setFavoriteItemId(item?._id || null)
        }
      } catch {}
    }
    checkLists()
  }, [user, show])

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
          tmdbId: show.id, mediaType: 'tv',
          title: show.name, posterPath: show.poster_path,
          voteAverage: show.vote_average, releaseDate: show.first_air_date
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
          tmdbId: show.id, mediaType: 'tv',
          title: show.name, posterPath: show.poster_path,
          voteAverage: show.vote_average, releaseDate: show.first_air_date
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

  if (!show) return null

  const cast = show.credits?.cast?.slice(0, 12) || []
  const realSeasons = (show.seasons || []).filter(s => s.season_number > 0)
  const episodes = seasonData?.episodes || []

  return (
    <div className="detail-page fade-in">
      {show.backdrop_path && (
        <div className="detail-backdrop">
          <img src={`${BACKDROP_BASE}${show.backdrop_path}`} alt={show.name} />
          <div className="detail-backdrop-overlay" />
        </div>
      )}

      <div className="page-container detail-content">
        <button className="btn btn-ghost back-btn" onClick={() => navigate(-1)}>← Back</button>

        <div className="detail-hero">
          <div className="detail-poster">
            {show.poster_path
              ? <img src={`${POSTER_BASE}${show.poster_path}`} alt={show.name} />
              : <div className="poster-placeholder" style={{ height: 420 }}><span>📺</span></div>
            }
          </div>

          <div className="detail-info">
            <h1 className="detail-title">{show.name}</h1>
            {show.tagline && <p className="detail-tagline">{show.tagline}</p>}

            <div className="detail-meta-row">
              {show.vote_average > 0 && (
                <span className="chip chip-accent">⭐ {show.vote_average.toFixed(1)} ({show.vote_count?.toLocaleString()} votes)</span>
              )}
              {show.first_air_date && <span className="chip">{new Date(show.first_air_date).getFullYear()}</span>}
              {show.number_of_seasons && <span className="chip">{show.number_of_seasons} Season{show.number_of_seasons !== 1 ? 's' : ''}</span>}
              {show.number_of_episodes && <span className="chip">{show.number_of_episodes} Episodes</span>}
              {show.status && <span className="chip">{show.status}</span>}
            </div>

            {show.genres?.length > 0 && (
              <div className="detail-genres">
                {show.genres.map(g => <span key={g.id} className="chip">{g.name}</span>)}
              </div>
            )}

            {show.overview && <p className="detail-overview">{show.overview}</p>}

            {show.networks?.length > 0 && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text2)', marginBottom: 20 }}>
                Network: {show.networks.map(n => n.name).join(', ')}
              </p>
            )}

            <div className="detail-actions">
              {show.trailerKey && (
                <a href={`https://www.youtube.com/watch?v=${show.trailerKey}`}
                  target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                  ▶ Watch Trailer
                </a>
              )}
              <button className={`btn ${inWatchlist ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={toggleWatchlist} disabled={actionLoading}>
                {inWatchlist ? '✓ In Watchlist' : '+ Watchlist'}
              </button>
              <button className={`btn ${inFavorites ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={toggleFavorite} disabled={actionLoading}>
                {inFavorites ? '♥ Favorited' : '♡ Favorite'}
              </button>
            </div>
          </div>
        </div>

        {/* Seasons & Episodes */}
        {realSeasons.length > 0 && (
          <section className="detail-section">
            <h2 className="detail-section-title">Seasons & Episodes</h2>

            <div className="season-tabs">
              {realSeasons.map(s => (
                <button
                  key={s.season_number}
                  className={`season-tab ${selectedSeason === s.season_number ? 'active' : ''}`}
                  onClick={() => setSelectedSeason(s.season_number)}
                >
                  Season {s.season_number}
                </button>
              ))}
            </div>

            {seasonLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <div className="spinner" />
              </div>
            ) : (
              <div className="episode-list">
                {episodes.length === 0 && (
                  <div className="state-box">
                    <span className="state-icon">📭</span>
                    <p>No episode data available for this season.</p>
                  </div>
                )}
                {episodes.map(ep => (
                  <div key={ep.id} className="episode-card">
                    <div className="episode-still">
                      {ep.still_path
                        ? <img src={`${STILL_BASE}${ep.still_path}`} alt={ep.name} loading="lazy" />
                        : <span>🎬</span>
                      }
                    </div>
                    <div className="episode-info">
                      <div className="episode-number">
                        S{pad(selectedSeason)}E{pad(ep.episode_number)}
                      </div>
                      <div className="episode-title">{ep.name}</div>
                      <div className="episode-meta">
                        {ep.air_date && <span>{ep.air_date}</span>}
                        {ep.runtime && <span>{ep.runtime} min</span>}
                        {ep.vote_average > 0
                          ? <span className="episode-rating">⭐ {ep.vote_average.toFixed(1)}/10</span>
                          : <span style={{ color: 'var(--text3)' }}>Not rated yet</span>
                        }
                        {ep.vote_count > 0 && <span style={{ color: 'var(--text3)' }}>({ep.vote_count} votes)</span>}
                      </div>
                      {ep.overview && <p className="episode-overview">{ep.overview}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

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
        {show.similar?.length > 0 && (
          <section className="detail-section">
            <h2 className="detail-section-title">Similar Shows</h2>
            <div className="poster-row">
              {show.similar.slice(0, 8).map(s => <MediaCard key={s.id} item={s} mediaType="tv" />)}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default TVDetail
