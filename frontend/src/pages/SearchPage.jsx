import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { searchAPI } from '../services/api'
import MediaCard from '../components/MediaCard'
import './DiscoverPage.css'

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [totalPages, setTotalPages] = useState(1)
  const [inputValue, setInputValue] = useState('')

  const q = searchParams.get('q') || ''
  const page = parseInt(searchParams.get('page') || '1')

  useEffect(() => { setInputValue(q) }, [q])

  useEffect(() => {
    if (!q.trim()) { setResults([]); return }
    const fetch = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await searchAPI.multi(q, page)
        setResults(res.data?.results || [])
        setTotalPages(Math.min(res.data?.totalPages || 1, 10))
      } catch (err) {
        setError(err.response?.data?.message || err.message)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [q, page])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!inputValue.trim()) return
    setSearchParams({ q: inputValue.trim(), page: '1' })
  }

  const setPage = (p) => {
    setSearchParams({ q, page: String(p) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="page-container discover-page">
      <div className="discover-header">
        <h1 className="discover-title">Search</h1>
      </div>

      <form className="discover-filters" onSubmit={handleSubmit}>
        <input
          type="text"
          className="filter-search"
          placeholder="Search movies and TV shows..."
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          autoFocus
        />
        <button type="submit" className="btn btn-primary">Search</button>
      </form>

      {q && <p style={{ color: 'var(--text2)', marginBottom: 20, fontSize: '0.9rem' }}>
        Results for "<strong style={{ color: 'var(--text)' }}>{q}</strong>"
      </p>}

      {error && (
        <div className="state-box">
          <span className="state-icon">⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="media-grid">
          {Array.from({ length: 12 }).map((_, i) => (
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
          {results.length === 0 && q && !error && (
            <div className="state-box">
              <span className="state-icon">🔍</span>
              <p>No results found for "{q}"</p>
            </div>
          )}
          {!q && (
            <div className="state-box">
              <span className="state-icon">🎬</span>
              <p>Type something to search movies and TV shows</p>
            </div>
          )}
          <div className="media-grid">
            {results.map(item => (
              <MediaCard key={`${item.media_type}-${item.id}`} item={item} showType />
            ))}
          </div>
        </>
      )}

      {totalPages > 1 && !loading && results.length > 0 && (
        <div className="pagination">
          <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
          <span className="page-info">Page {page} of {totalPages}</span>
          <button className="btn btn-ghost" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next →</button>
        </div>
      )}
    </div>
  )
}

export default SearchPage
