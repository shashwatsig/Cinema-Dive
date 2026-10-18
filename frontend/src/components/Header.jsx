import { useState, useRef, useCallback, useEffect, memo } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { searchAPI } from '../services/api'
import './Header.css'

const DEBOUNCE_MS = 350
const POSTER_BASE = 'https://image.tmdb.org/t/p/w92'

const Header = memo(() => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const debounceRef = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSearch = useCallback((e) => {
    const val = e.target.value
    setQuery(val)
    clearTimeout(debounceRef.current)
    if (!val.trim()) { setResults([]); setOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await searchAPI.multi(val.trim())
        const data = (res.data?.results || []).slice(0, 6)
        setResults(data)
        setOpen(data.length > 0)
      } catch {
        setResults([])
        setOpen(false)
      } finally {
        setSearching(false)
      }
    }, DEBOUNCE_MS)
  }, [])

  const handleSelect = useCallback((item) => {
    setQuery('')
    setResults([])
    setOpen(false)
    const path = item.media_type === 'movie' ? `/movies/${item.id}` : `/tv/${item.id}`
    navigate(path)
  }, [navigate])

  const handleSearchSubmit = useCallback((e) => {
    e.preventDefault()
    if (!query.trim()) return
    setOpen(false)
    navigate(`/search?q=${encodeURIComponent(query.trim())}`)
    setQuery('')
  }, [query, navigate])

  const isActive = (path) => location.pathname === path

  return (
    <header className="cd-header">
      <div className="cd-header-inner">
        <Link to="/" className="cd-logo">
          <span className="cd-logo-icon">🎬</span>
          <span className="cd-logo-text">Cinema<span className="cd-logo-accent">Dive</span></span>
        </Link>

        <nav className="cd-nav">
          <Link to="/" className={`cd-nav-link ${isActive('/') ? 'active' : ''}`}>Home</Link>
          <Link to="/movies" className={`cd-nav-link ${isActive('/movies') ? 'active' : ''}`}>Movies</Link>
          <Link to="/tv" className={`cd-nav-link ${isActive('/tv') ? 'active' : ''}`}>TV Shows</Link>
          {user && (
            <>
              <Link to="/watchlist" className={`cd-nav-link ${isActive('/watchlist') ? 'active' : ''}`}>Watchlist</Link>
              <Link to="/favorites" className={`cd-nav-link ${isActive('/favorites') ? 'active' : ''}`}>Favorites</Link>
            </>
          )}
        </nav>

        <div className="cd-header-right">
          <form className="cd-search-wrap" ref={searchRef} onSubmit={handleSearchSubmit}>
            <div className="cd-search">
              <svg className="cd-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Search movies & shows..."
                value={query}
                onChange={handleSearch}
                onFocus={() => results.length > 0 && setOpen(true)}
                aria-label="Search"
              />
              {searching && <span className="cd-search-spinner" />}
              {query && (
                <button type="button" className="cd-search-clear" onClick={() => { setQuery(''); setResults([]); setOpen(false) }}>✕</button>
              )}
            </div>

            {open && (
              <div className="cd-search-dropdown">
                {results.map((item) => (
                  <button key={`${item.media_type}-${item.id}`} type="button" className="cd-search-item" onClick={() => handleSelect(item)}>
                    <div className="cd-search-thumb">
                      {item.poster_path
                        ? <img src={`${POSTER_BASE}${item.poster_path}`} alt={item.title || item.name} loading="lazy" />
                        : <span>🎬</span>
                      }
                    </div>
                    <div className="cd-search-info">
                      <span className="cd-search-title">{item.title || item.name}</span>
                      <span className="cd-search-meta">
                        <span className={`cd-type-tag ${item.media_type}`}>{item.media_type === 'movie' ? 'Movie' : 'TV'}</span>
                        {(item.release_date || item.first_air_date) && (
                          <span>{new Date(item.release_date || item.first_air_date).getFullYear()}</span>
                        )}
                        {item.vote_average > 0 && <span>⭐ {item.vote_average.toFixed(1)}</span>}
                      </span>
                    </div>
                  </button>
                ))}
                <button type="submit" className="cd-search-all">
                  Search all results for "{query}" →
                </button>
              </div>
            )}
          </form>

          {user ? (
            <div className="cd-user-menu">
              <span className="cd-user-name">👤 {user.name}</span>
              <button className="btn btn-ghost" onClick={logout}>Logout</button>
            </div>
          ) : (
            <div className="cd-auth-links">
              <Link to="/login" className="btn btn-ghost">Login</Link>
              <Link to="/register" className="btn btn-primary">Sign Up</Link>
            </div>
          )}

          <button className="cd-hamburger" onClick={() => setMenuOpen(m => !m)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="cd-mobile-menu">
          <Link to="/" className="cd-mobile-link">Home</Link>
          <Link to="/movies" className="cd-mobile-link">Movies</Link>
          <Link to="/tv" className="cd-mobile-link">TV Shows</Link>
          {user && (
            <>
              <Link to="/watchlist" className="cd-mobile-link">Watchlist</Link>
              <Link to="/favorites" className="cd-mobile-link">Favorites</Link>
            </>
          )}
          {user
            ? <button className="cd-mobile-link" onClick={logout}>Logout</button>
            : <>
                <Link to="/login" className="cd-mobile-link">Login</Link>
                <Link to="/register" className="cd-mobile-link">Sign Up</Link>
              </>
          }
        </div>
      )}
    </header>
  )
})

Header.displayName = 'Header'
export default Header
