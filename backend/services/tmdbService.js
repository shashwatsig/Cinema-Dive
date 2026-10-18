const axios = require('axios')

const TMDB_BASE = 'https://api.themoviedb.org/3'
const TIMEOUT = 10000

class TMDBService {
  constructor() {
    this.client = axios.create({ baseURL: TMDB_BASE, timeout: TIMEOUT })
  }

  get headers() {
    const token = process.env.TMDB_API_READ_ACCESS_TOKEN || process.env.TMDB_API_KEY
    if (!token) return null
    // Bearer token (v4) preferred; fall back to api_key param
    if (token.length > 40) return { Authorization: `Bearer ${token}` }
    return null
  }

  get apiKey() {
    const token = process.env.TMDB_API_READ_ACCESS_TOKEN || process.env.TMDB_API_KEY
    if (token && token.length <= 40) return token
    return null
  }

  async get(endpoint, params = {}) {
    const headers = this.headers
    const config = headers
      ? { headers, params }
      : { params: { api_key: this.apiKey, ...params } }
    const res = await this.client.get(endpoint, config)
    return res.data
  }

  // ── Movies ──────────────────────────────────────────────────────────────────

  async getTrendingMovies(page = 1) {
    const data = await this.get('/trending/movie/week', { page })
    return { results: data.results || [], totalPages: data.total_pages || 1 }
  }

  async getPopularMovies(page = 1) {
    const data = await this.get('/movie/popular', { page })
    return { results: data.results || [], totalPages: data.total_pages || 1 }
  }

  async getTopRatedMovies(page = 1) {
    const data = await this.get('/movie/top_rated', { page })
    return { results: data.results || [], totalPages: data.total_pages || 1 }
  }

  async getMovieDetails(movieId) {
    const [details, credits, videos, similar] = await Promise.allSettled([
      this.get(`/movie/${movieId}`),
      this.get(`/movie/${movieId}/credits`),
      this.get(`/movie/${movieId}/videos`),
      this.get(`/movie/${movieId}/similar`)
    ])
    const d = details.status === 'fulfilled' ? details.value : null
    if (!d) throw new Error(`Movie ${movieId} not found`)

    const trailerKey = credits.status === 'fulfilled'
      ? null
      : null
    const videoResults = videos.status === 'fulfilled' ? (videos.value.results || []) : []
    const trailer = videoResults.find(v => v.type === 'Trailer' && v.site === 'YouTube')

    return {
      ...d,
      credits: credits.status === 'fulfilled' ? credits.value : { cast: [], crew: [] },
      trailerKey: trailer?.key || null,
      similar: similar.status === 'fulfilled' ? (similar.value.results || []).slice(0, 12) : []
    }
  }

  async getMoviesByGenre(genreId, page = 1, sortBy = 'popularity.desc') {
    const data = await this.get('/discover/movie', { with_genres: genreId, page, sort_by: sortBy })
    return { results: data.results || [], totalPages: data.total_pages || 1 }
  }

  async discoverMovies({ page = 1, genreId, year, minRating, sortBy = 'popularity.desc' } = {}) {
    const params = { page, sort_by: sortBy }
    if (genreId) params.with_genres = genreId
    if (year) params.primary_release_year = year
    if (minRating) params['vote_average.gte'] = minRating
    const data = await this.get('/discover/movie', params)
    return { results: data.results || [], totalPages: data.total_pages || 1 }
  }

  // ── TV Shows ─────────────────────────────────────────────────────────────────

  async getTrendingTV(page = 1) {
    const data = await this.get('/trending/tv/week', { page })
    return { results: data.results || [], totalPages: data.total_pages || 1 }
  }

  async getPopularTV(page = 1) {
    const data = await this.get('/tv/popular', { page })
    return { results: data.results || [], totalPages: data.total_pages || 1 }
  }

  async getTopRatedTV(page = 1) {
    const data = await this.get('/tv/top_rated', { page })
    return { results: data.results || [], totalPages: data.total_pages || 1 }
  }

  async getTVDetails(tvId) {
    const [details, credits, videos, similar] = await Promise.allSettled([
      this.get(`/tv/${tvId}`),
      this.get(`/tv/${tvId}/credits`),
      this.get(`/tv/${tvId}/videos`),
      this.get(`/tv/${tvId}/similar`)
    ])
    const d = details.status === 'fulfilled' ? details.value : null
    if (!d) throw new Error(`TV show ${tvId} not found`)

    const videoResults = videos.status === 'fulfilled' ? (videos.value.results || []) : []
    const trailer = videoResults.find(v => v.type === 'Trailer' && v.site === 'YouTube')

    return {
      ...d,
      credits: credits.status === 'fulfilled' ? credits.value : { cast: [], crew: [] },
      trailerKey: trailer?.key || null,
      similar: similar.status === 'fulfilled' ? (similar.value.results || []).slice(0, 12) : []
    }
  }

  async getTVSeason(tvId, seasonNumber) {
    const data = await this.get(`/tv/${tvId}/season/${seasonNumber}`)
    return data
  }

  async discoverTV({ page = 1, genreId, year, minRating, sortBy = 'popularity.desc' } = {}) {
    const params = { page, sort_by: sortBy }
    if (genreId) params.with_genres = genreId
    if (year) params.first_air_date_year = year
    if (minRating) params['vote_average.gte'] = minRating
    const data = await this.get('/discover/tv', params)
    return { results: data.results || [], totalPages: data.total_pages || 1 }
  }

  // ── Search ───────────────────────────────────────────────────────────────────

  async searchMulti(query, page = 1) {
    const data = await this.get('/search/multi', { query, page })
    const results = (data.results || []).filter(r => r.media_type === 'movie' || r.media_type === 'tv')
    return { results, totalPages: data.total_pages || 1 }
  }

  async searchMovies(query, page = 1) {
    const data = await this.get('/search/movie', { query, page })
    return { results: data.results || [], totalPages: data.total_pages || 1 }
  }

  async searchTV(query, page = 1) {
    const data = await this.get('/search/tv', { query, page })
    return { results: data.results || [], totalPages: data.total_pages || 1 }
  }

  // ── Genres ───────────────────────────────────────────────────────────────────

  async getMovieGenres() {
    const data = await this.get('/genre/movie/list')
    return data.genres || []
  }

  async getTVGenres() {
    const data = await this.get('/genre/tv/list')
    return data.genres || []
  }

  isConfigured() {
    return !!(process.env.TMDB_API_READ_ACCESS_TOKEN || process.env.TMDB_API_KEY)
  }
}

module.exports = new TMDBService()
