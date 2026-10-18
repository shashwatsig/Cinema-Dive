const express = require('express')
const auth = require('../middleware/auth')
const Favorite = require('../models/Favorite')

const router = express.Router()

router.use(auth)

// GET /api/favorites
router.get('/', async (req, res) => {
  try {
    const items = await Favorite.find({ userId: req.user._id }).sort({ createdAt: -1 })
    res.json(items)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /api/favorites
router.post('/', async (req, res) => {
  try {
    const { tmdbId, mediaType, title, posterPath, voteAverage, releaseDate } = req.body
    if (!tmdbId || !mediaType) return res.status(400).json({ message: 'tmdbId and mediaType are required' })

    const item = await Favorite.findOneAndUpdate(
      { userId: req.user._id, tmdbId, mediaType },
      { userId: req.user._id, tmdbId, mediaType, title, posterPath, voteAverage, releaseDate },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
    res.status(201).json(item)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// DELETE /api/favorites/:id
router.delete('/:id', async (req, res) => {
  try {
    const item = await Favorite.findOneAndDelete({ _id: req.params.id, userId: req.user._id })
    if (!item) return res.status(404).json({ message: 'Item not found' })
    res.json({ message: 'Removed from favorites' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// DELETE /api/favorites/item/:tmdbId/:mediaType
router.delete('/item/:tmdbId/:mediaType', async (req, res) => {
  try {
    await Favorite.findOneAndDelete({
      userId: req.user._id,
      tmdbId: parseInt(req.params.tmdbId),
      mediaType: req.params.mediaType
    })
    res.json({ message: 'Removed from favorites' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
