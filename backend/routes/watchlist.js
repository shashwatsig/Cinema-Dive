const express = require('express')
const auth = require('../middleware/auth')
const Watchlist = require('../models/Watchlist')

const router = express.Router()

// All watchlist routes require authentication
router.use(auth)

// GET /api/watchlist
router.get('/', async (req, res) => {
  try {
    const items = await Watchlist.find({ userId: req.user._id }).sort({ createdAt: -1 })
    res.json(items)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /api/watchlist
router.post('/', async (req, res) => {
  try {
    const { tmdbId, mediaType, title, posterPath, voteAverage, releaseDate, status } = req.body
    if (!tmdbId || !mediaType) return res.status(400).json({ message: 'tmdbId and mediaType are required' })

    const item = await Watchlist.findOneAndUpdate(
      { userId: req.user._id, tmdbId, mediaType },
      { userId: req.user._id, tmdbId, mediaType, title, posterPath, voteAverage, releaseDate, status: status || 'Planned' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
    res.status(201).json(item)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PATCH /api/watchlist/:id — update status
router.patch('/:id', async (req, res) => {
  try {
    const item = await Watchlist.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status: req.body.status },
      { new: true }
    )
    if (!item) return res.status(404).json({ message: 'Item not found' })
    res.json(item)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// DELETE /api/watchlist/:id
router.delete('/:id', async (req, res) => {
  try {
    const item = await Watchlist.findOneAndDelete({ _id: req.params.id, userId: req.user._id })
    if (!item) return res.status(404).json({ message: 'Item not found' })
    res.json({ message: 'Removed from watchlist' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// DELETE /api/watchlist/item/:tmdbId/:mediaType — remove by tmdbId
router.delete('/item/:tmdbId/:mediaType', async (req, res) => {
  try {
    await Watchlist.findOneAndDelete({
      userId: req.user._id,
      tmdbId: parseInt(req.params.tmdbId),
      mediaType: req.params.mediaType
    })
    res.json({ message: 'Removed from watchlist' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
