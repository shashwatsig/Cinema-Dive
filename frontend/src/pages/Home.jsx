import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { moviesAPI, tvAPI } from '../services/api'
import MediaCard from '../components/MediaCard'
import './Home.css'

const BACKDROP_BASE = 'https://image.tmdb.org/t/p/original'
const POSTER_BASE = 'https://image.tmdb.org/t/p/w500'

const SkeletonRow = () => (
  <div className="poster-row">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="media-card">
        <div className="poster-wrap skeleton" style={{ aspectRatio: '2/3' }} />
        <div className="card-info">
          <div className="skeleton" style={{ height: 14, width: '80%', marginBottom: 6 }} />
          <div className="skeleton" style={{ height: 12, width: '40%' }} />
        </div>
      </div>
    ))}
  </div>
)

const SectionRow = ({ title, items, mediaType, linkTo, loading }) => (
  <div className="section-row">
    <div className="row-header">
      <h2 className="row-title">{title}</h2>
      {linkTo && <Link to={linkTo} className="row-link">See all →</Link>}
    </div>
    {loading ? <SkeletonRow /> : (
      <div className="poster-row">
        {items.map(item => <MediaCard key={item.id} item={item} mediaType={mediaType} />)}
      </div>
    )}
  </div>
)

const Home = () => {
  const navigate = useNavigate()
  const [hero, setHero] = useState(null)
  const [trendingMovies, setTrendingMovies] = useState([])
  const [trendingTV, setTrendingTV] = useState([])
  const [popularMovies, setPopularMovies] = useState([])
  const [topRatedMovies, setTopRatedMovies] = useState([])
  const [topRatedTV, setTopRatedTV] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [tmRes, ttRes, pmRes, trMRes, trTRes] = await Promise.allSettled([
          moviesAPI.trending(),
          tvAPI.trending(),
          moviesAPI.popular(),
          moviesAPI.topRated(),
          tvAPI.topRated()
        ])

        const tm = tmRes.status === 'fulfilled' ? (tmRes.value.data?.results || []) : []
        const tt = ttRes.status === 'fulfilled' ? (ttRes.value.data?.results || []) : []
        const pm = pmRes.status === 'fulfilled' ? (pmRes.value.data?.results || []) : []
        const trM = trMRes.status === 'fulfilled' ? (trMRes.value.data?.results || []) : []
        const trT = trTRes.status === 'fulfilled' ? (trTRes.value.data?.results || []) : []

        if (tm.length === 0 && tt.length === 0) {
          setError('TMDB API key not configured. Please set TMDB_API_READ_ACCESS_TOKEN in backend .env')
        }

        setTrendingMovies(tm.slice(0, 12))
        setTrendingTV(tt.slice(0, 12))
        setPopularMovies(pm.slice(0, 12))
        setTopRatedMovies(trM.slice(0, 12))
        setTopRatedTV(trT.slice(0, 12))

        // Pick hero from trending movies with backdrop
        const heroItem = tm.find(m => m.backdrop_path) || tm[0]
        if (heroItem) setHero(heroItem)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  return (
    <div className="home-page">
      {/* Hero */}
      <section className="home-hero">
        {hero ? (
          <>
            <div className="hero-backdrop">
              <img src={`${BACKDROP_BASE}${hero.backdrop_path}`} alt={hero.title || hero.name} />
              <div className="hero-overlay" />
            </div>
            <div className="hero-content">
              <div className="hero-meta">
                <span className="chip chip-accent">Trending</span>
                {hero.vote_average > 0 && (
                  <span className="chip">⭐ {hero.vote_average.toFixed(1)}</span>
                )}
                {hero.release_date && (
                  <span className="chip">{new Date(hero.release_date).getFullYear()}</span>
                )}
              </div>
              <h1 className="hero-title">{hero.title || hero.name}</h1>
              {hero.overview && (
                <p className="hero-overview">{hero.overview.substring(0, 200)}...</p>
              )}
              <div className="hero-actions">
                <button className="btn btn-primary hero-btn" onClick={() => navigate(`/movies/${hero.id}`)}>
                  ▶ View Details
                </button>
                <Link to="/movies" className="btn btn-secondary hero-btn">Browse Movies</Link>
              </div>
            </div>
          </>
        ) : (
          <div className="hero-placeholder">
            <div className="hero-placeholder-content">
              <h1>Cinema<span style={{ color: 'var(--accent)' }}>Dive</span></h1>
              <p>Dive Into Movies. Explore Every Episode.</p>
              <div className="hero-actions">
                <Link to="/movies" className="btn btn-primary hero-btn">Browse Movies</Link>
                <Link to="/tv" className="btn btn-secondary hero-btn">Explore TV Shows</Link>
              </div>
              {error && <p className="hero-error">⚠️ {error}</p>}
            </div>
          </div>
        )}
      </section>

      {/* Content rows */}
      <div className="page-container">
        {error && !hero && (
          <div className="state-box">
            <span className="state-icon">⚙️</span>
            <p>{error}</p>
          </div>
        )}

        <SectionRow title="🔥 Trending Movies" items={trendingMovies} mediaType="movie" linkTo="/movies" loading={loading} />
        <SectionRow title="📺 Trending TV Shows" items={trendingTV} mediaType="tv" linkTo="/tv" loading={loading} />
        <SectionRow title="🎬 Popular Movies" items={popularMovies} mediaType="movie" linkTo="/movies" loading={loading} />
        <SectionRow title="⭐ Top Rated Movies" items={topRatedMovies} mediaType="movie" linkTo="/movies?sort=top_rated" loading={loading} />
        <SectionRow title="🏆 Top Rated TV Shows" items={topRatedTV} mediaType="tv" linkTo="/tv?sort=top_rated" loading={loading} />
      </div>
    </div>
  )
}

export default Home
