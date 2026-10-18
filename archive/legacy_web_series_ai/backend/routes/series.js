const express = require('express')
const tmdbService = require('../services/tmdbService')
const aiInsightService = require('../services/aiInsightService')

const router = express.Router()

// Simple in-memory cache
const cache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

const getCache = (key) => {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null }
  return entry.data
}
const setCache = (key, data) => cache.set(key, { data, ts: Date.now() })

// Get trending series — instant fallback if TMDB unreachable
router.get('/trending', async (req, res) => {
  const cached = getCache('trending')
  if (cached) return res.json(cached)
  try {
    const trendingSeries = await tmdbService.getTrendingTVSeries(20)
    setCache('trending', trendingSeries)
    res.json(trendingSeries)
  } catch (error) {
    console.error('Trending series error:', error.message)
    res.json(require('../data/staticFallback').STATIC_TRENDING_SERIES)
  }
})

const DEFAULT_AI_INSIGHTS = {
  whyInsights: {
    whyLiked: ['Viewers appreciated the overall storytelling approach'],
    whyDisliked: ['Mixed reactions to pacing and execution'],
    overallSentiment: { positive: 0.5, neutral: 0.3, negative: 0.2 },
    keyThemes: [],
    audienceProfile: {
      primaryDemographic: 'General audience',
      engagementLevel: 'Moderate',
      emotionalResponse: 'Mixed',
      recommendedFor: 'General viewers'
    }
  },
  emotionTimeline: []
}

// Get series details with AI insights
router.get('/:id/details', async (req, res) => {
  try {
    const cacheKey = `details:${req.params.id}`
    const cached = getCache(cacheKey)
    if (cached) return res.json(cached)

    const seriesData = await tmdbService.getTVSeriesDetails(req.params.id)

    let aiInsights = DEFAULT_AI_INSIGHTS
    try {
      const whyInsights = aiInsightService.generateWhyInsights(seriesData.reviews, seriesData.details)
      const emotionTimeline = aiInsightService.generateEmotionTimeline(seriesData.details, seriesData.reviews)
      aiInsights = { whyInsights, emotionTimeline }
    } catch (aiError) {
      console.warn('AI insight generation failed, using defaults:', aiError.message)
    }

    const result = { ...seriesData, aiInsights }
    setCache(`details:${req.params.id}`, result)
    res.json(result)
  } catch (error) {
    console.error('Error in series details:', error.message)
    const { STATIC_TRENDING_SERIES } = require('../data/staticFallback')
    const staticMatch = STATIC_TRENDING_SERIES.find(s => s.id === Number(req.params.id))
    if (staticMatch) {
      const seriesData = tmdbService.buildStaticSeriesDetail(staticMatch)
      const emotionTimeline = aiInsightService.generateEmotionTimeline(seriesData.details, [])
      return res.json({ ...seriesData, aiInsights: { ...DEFAULT_AI_INSIGHTS, emotionTimeline } })
    }
    if (process.env.NODE_ENV === 'production') {
      res.status(500).json({ message: 'Failed to fetch series details' })
    } else {
      res.status(500).json({ message: 'Failed to fetch series details', error: error.message })
    }
  }
})

// Get recommendations for a series
router.get('/:id/recommendations', async (req, res) => {
  try {
    const [seriesData, similarSeries] = await Promise.all([
      tmdbService.getTVSeriesDetails(req.params.id),
      tmdbService.getSimilarSeries(req.params.id)
    ])
    const recommendations = aiInsightService.generateExplainableRecommendations(
      {},
      seriesData.details,
      similarSeries
    )
    res.json(recommendations)
  } catch (error) {
    console.error('Recommendations error:', error.message)
    res.json([])
  }
})

// Search series
router.get('/search/:query', async (req, res) => {
  try {
    const results = await tmdbService.searchTVSeries(req.params.query)
    res.json(results)
  } catch (error) {
    console.error('Search error:', error.message)
    if (process.env.NODE_ENV === 'production') {
      res.status(500).json({ message: 'Search failed' })
    } else {
      res.status(500).json({ message: error.message })
    }
  }
})

module.exports = router