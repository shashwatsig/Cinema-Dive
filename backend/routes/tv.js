const express = require('express')
const tmdb = require('../services/tmdbService')

const router = express.Router()

const cache = new Map()
const CACHE_TTL = 10 * 60 * 1000

const cached = (key, fn) => {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.ts < CACHE_TTL) return Promise.resolve(hit.data)
  return fn().then(data => { cache.set(key, { data, ts: Date.now() }); return data })
}

const notConfigured = (res) =>
  res.status(503).json({ message: 'TMDB API key not configured. Set TMDB_API_READ_ACCESS_TOKEN in .env' })

// GET /api/tv/trending
router.get('/trending', async (req, res) => {
  if (!tmdb.isConfigured()) return notConfigured(res)
  try {
    const page = parseInt(req.query.page) || 1
    const data = await cached(`trending-tv-${page}`, () => tmdb.getTrendingTV(page))
    res.json(data)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/tv/popular
router.get('/popular', async (req, res) => {
  if (!tmdb.isConfigured()) return notConfigured(res)
  try {
    const page = parseInt(req.query.page) || 1
    const data = await cached(`popular-tv-${page}`, () => tmdb.getPopularTV(page))
    res.json(data)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/tv/top-rated
router.get('/top-rated', async (req, res) => {
  if (!tmdb.isConfigured()) return notConfigured(res)
  try {
    const page = parseInt(req.query.page) || 1
    const data = await cached(`top-rated-tv-${page}`, () => tmdb.getTopRatedTV(page))
    res.json(data)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/tv/discover
router.get('/discover', async (req, res) => {
  if (!tmdb.isConfigured()) return notConfigured(res)
  try {
    const { page = 1, genreId, year, minRating, sortBy } = req.query
    const key = `discover-tv-${page}-${genreId}-${year}-${minRating}-${sortBy}`
    const data = await cached(key, () => tmdb.discoverTV({
      page: parseInt(page),
      genreId,
      year,
      minRating,
      sortBy
    }))
    res.json(data)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/tv/genres
router.get('/genres', async (req, res) => {
  if (!tmdb.isConfigured()) return notConfigured(res)
  try {
    const genres = await cached('tv-genres', () => tmdb.getTVGenres())
    res.json(genres)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/tv/:id/season/:seasonNumber
router.get('/:id/season/:seasonNumber', async (req, res) => {
  if (!tmdb.isConfigured()) return notConfigured(res)
  try {
    const { id, seasonNumber } = req.params
    const data = await cached(`tv-${id}-season-${seasonNumber}`, () => tmdb.getTVSeason(id, seasonNumber))
    res.json(data)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/tv/:id
router.get('/:id', async (req, res) => {
  if (!tmdb.isConfigured()) return notConfigured(res)
  try {
    const data = await cached(`tv-${req.params.id}`, () => tmdb.getTVDetails(req.params.id))
    res.json(data)
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ message: err.message })
  }
})

module.exports = router
