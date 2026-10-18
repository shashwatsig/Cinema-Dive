const express = require('express')
const tmdb = require('../services/tmdbService')

const router = express.Router()

// GET /api/search?q=...&type=multi|movie|tv&page=1
router.get('/', async (req, res) => {
  if (!tmdb.isConfigured()) {
    return res.status(503).json({ message: 'TMDB API key not configured' })
  }
  const { q, type = 'multi', page = 1 } = req.query
  if (!q || !q.trim()) return res.status(400).json({ message: 'Query parameter q is required' })

  try {
    let data
    if (type === 'movie') data = await tmdb.searchMovies(q.trim(), parseInt(page))
    else if (type === 'tv') data = await tmdb.searchTV(q.trim(), parseInt(page))
    else data = await tmdb.searchMulti(q.trim(), parseInt(page))
    res.json(data)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
