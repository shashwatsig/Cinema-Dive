import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { tvAPI, searchAPI } from '../services/api'
import MediaCard from '../components/MediaCard'
import './DiscoverPage.css'

const SORT_OPTIONS = [
  { value: 'popularity.desc', label: 'Most Popular' },
  { value: 'vote_average.desc', label: 'Highest Rated' },
  { value: 'first_air_date.desc', label: 'Newest First' },
  { value: 'first_air_date.asc', label: 'Oldest First' }
]

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 40 }, (_, i) => CURRENT_YEAR - i)

const TVShows = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [shows, setShows] = useState([])
  const [genres, setGenres] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [totalPages, setTotalPages] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  const page = parseInt(searchParams.get('page') || '1')
  const genreId = searchParams.get('genre') || ''
  const year = searchParams.get('year') || ''
  const minRating = searchParams.get('rating') || ''
  const sortBy = searchParams.get('sort') || 'popularity.desc'

  useEffect(() => {
    tvAPI.genres().then(res => setGenres(res.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 400)
    return () => clearTimeout(t)
  }, [searchQuery])

  const fetchShows = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let res
      if (debouncedQuery.trim()) {
        res = await searchAPI.tv(debouncedQuery, page)
      } else {
        res = await tvAPI.discover({ page, genreId, year, minRating, sortBy })
      }
      setShows(res.data?.results || [])
      setTotalPages(Math.min(res.data?.totalPages || 1, 20))
    } catch (err) {
      setError(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }, [page, genreId, year, minRating, sortBy, debouncedQuery])

  useEffect(() => { fetchShows() }, [fetchShows])

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value); else next.delete(key)
    next.set('page', '1')
    setSearchParams(next)
  }

  const setPage = (p) => {
    const next = new URLSearchParams(searchParams)
    next.set('page', String(p))
    setSearchParams(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="page-container discover-page">
      <div className="discover-header">
        <h1 className="discover-title">TV Shows</h1>
        <p className="discover-subtitle">Explore series, seasons, and episodes</p>
      </div>

      <div className="discover-filters">
        <input
          type="text"
          className="filter-search"
          placeholder="Search TV shows..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />

        <select className="filter-select" value={genreId} onChange={e => updateParam('genre', e.target.value)}>
          <option value="">All Genres</option>
          {genres.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>

        <select className="filter-select" value={year} onChange={e => updateParam('year', e.target.value)}>
          <option value="">Any Year</option>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        <select className="filter-select" value={minRating} onChange={e => updateParam('rating', e.target.value)}>
          <option value="">Any Rating</option>
          <option value="9">9+ ⭐</option>
          <option value="8">8+ ⭐</option>
          <option value="7">7+ ⭐</option>
          <option value="6">6+ ⭐</option>
        </select>

        <select className="filter-select" value={sortBy} onChange={e => updateParam('sort', e.target.value)}>
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {error && (
        <div className="state-box">
          <span className="state-icon">⚠️</span>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={fetchShows}>Retry</button>
        </div>
      )}

      {loading ? (
        <div className="media-grid">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="media-card">
              <div className="poster-wrap skeleton" style={{ aspectRatio: '2/3' }} />
              <div className="card-info">
                <div className="skeleton" style={{ height: 14, width: '80%', marginBottom: 6 }} />
                <div className="skeleton" style={{ height: 12, width: '40%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {shows.length === 0 && !error && (
            <div className="state-box">
              <span className="state-icon">📺</span>
              <p>No TV shows found. Try adjusting your filters.</p>
            </div>
          )}
          <div className="media-grid">
            {shows.map(show => <MediaCard key={show.id} item={show} mediaType="tv" />)}
          </div>
        </>
      )}

      {totalPages > 1 && !loading && (
        <div className="pagination">
          <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
          <span className="page-info">Page {page} of {totalPages}</span>
          <button className="btn btn-ghost" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next →</button>
        </div>
      )}
    </div>
  )
}

export default TVShows
