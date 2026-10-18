import { memo } from 'react'
import { useNavigate } from 'react-router-dom'

const POSTER_BASE = 'https://image.tmdb.org/t/p/w342'

const MediaCard = memo(({ item, mediaType, showType = false }) => {
  const navigate = useNavigate()
  const type = mediaType || item.media_type || 'movie'
  const title = item.title || item.name || 'Unknown'
  const date = item.release_date || item.first_air_date
  const year = date ? new Date(date).getFullYear() : null
  const rating = item.vote_average

  const handleClick = () => navigate(`/${type === 'movie' ? 'movies' : 'tv'}/${item.id}`)

  return (
    <div className="media-card" onClick={handleClick} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      aria-label={`View details for ${title}`}
    >
      <div className="poster-wrap">
        {item.poster_path
          ? <img src={`${POSTER_BASE}${item.poster_path}`} alt={title} loading="lazy" />
          : <div className="poster-placeholder"><span>🎬</span></div>
        }
        {rating > 0 && (
          <div className="rating-badge">⭐ {rating.toFixed(1)}</div>
        )}
        {showType && (
          <div className="type-badge">{type === 'movie' ? 'Movie' : 'TV'}</div>
        )}
      </div>
      <div className="card-info">
        <div className="card-title">{title}</div>
        <div className="card-meta">{year || 'N/A'}</div>
      </div>
    </div>
  )
})

MediaCard.displayName = 'MediaCard'
export default MediaCard
