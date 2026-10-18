const express = require('express')
const Series = require('../models/Series')

const router = express.Router()

// Get insights for a series (MongoDB-stored insights)
router.get('/series/:id', async (req, res) => {
  try {
    const series = await Series.findById(req.params.id).select('insights title')
    if (!series) return res.status(404).json({ message: 'Series not found' })
    res.json({ title: series.title, insights: series.insights })
  } catch (error) {
    console.error('Error fetching insights:', error.message)
    res.status(500).json({ message: 'Failed to fetch insights' })
  }
})

module.exports = router