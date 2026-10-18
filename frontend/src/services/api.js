import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const api = axios.create({
  baseURL: BASE,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const config = err.config
    if (err.response?.status === 401) {
      const isAuthRoute = config.url?.includes('/auth/')
      if (!isAuthRoute) {
        localStorage.removeItem('token')
        window.location.href = '/login'
      }
      return Promise.reject(err)
    }
    config._retries = config._retries || 0
    const retryable = !err.response || err.response.status >= 500 || err.code === 'ECONNABORTED'
    if (retryable && config._retries < 1) {
      config._retries++
      await new Promise(r => setTimeout(r, 600))
      return api(config)
    }
    return Promise.reject(err)
  }
)

export const moviesAPI = {
  trending: (page = 1) => api.get(`/movies/trending?page=${page}`),
  popular: (page = 1) => api.get(`/movies/popular?page=${page}`),
  topRated: (page = 1) => api.get(`/movies/top-rated?page=${page}`),
  discover: (params) => api.get('/movies/discover', { params }),
  genres: () => api.get('/movies/genres'),
  details: (id) => api.get(`/movies/${id}`)
}

export const tvAPI = {
  trending: (page = 1) => api.get(`/tv/trending?page=${page}`),
  popular: (page = 1) => api.get(`/tv/popular?page=${page}`),
  topRated: (page = 1) => api.get(`/tv/top-rated?page=${page}`),
  discover: (params) => api.get('/tv/discover', { params }),
  genres: () => api.get('/tv/genres'),
  details: (id) => api.get(`/tv/${id}`),
  season: (id, seasonNumber) => api.get(`/tv/${id}/season/${seasonNumber}`)
}

export const searchAPI = {
  multi: (q, page = 1) => api.get(`/search?q=${encodeURIComponent(q)}&page=${page}`),
  movies: (q, page = 1) => api.get(`/search?q=${encodeURIComponent(q)}&type=movie&page=${page}`),
  tv: (q, page = 1) => api.get(`/search?q=${encodeURIComponent(q)}&type=tv&page=${page}`)
}

export const watchlistAPI = {
  get: () => api.get('/watchlist'),
  add: (item) => api.post('/watchlist', item),
  updateStatus: (id, status) => api.patch(`/watchlist/${id}`, { status }),
  remove: (id) => api.delete(`/watchlist/${id}`),
  removeByTmdb: (tmdbId, mediaType) => api.delete(`/watchlist/item/${tmdbId}/${mediaType}`)
}

export const favoritesAPI = {
  get: () => api.get('/favorites'),
  add: (item) => api.post('/favorites', item),
  remove: (id) => api.delete(`/favorites/${id}`),
  removeByTmdb: (tmdbId, mediaType) => api.delete(`/favorites/item/${tmdbId}/${mediaType}`)
}

export default api
