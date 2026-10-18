const express = require('express')
const Series = require('../models/Series')
const dataLoaderService = require('../services/dataLoaderService')

const router = express.Router()

/**
 * GET /api/admin/status
 * Get database loading status and statistics
 */
router.get('/status', async (req, res) => {
  try {
    const stats = await dataLoaderService.getLoadingProgress()
    
    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving status',
      error: error.message
    })
  }
})

/**
 * POST /api/admin/load-data
 * Trigger bulk data loading from TMDB
 * Body: { numberOfSeries: number (default 50) }
 */
router.post('/load-data', async (req, res) => {
  try {
    const { numberOfSeries = 50 } = req.body

    if (numberOfSeries < 1 || numberOfSeries > 100) {
      return res.status(400).json({
        success: false,
        message: 'numberOfSeries must be between 1 and 100'
      })
    }

    console.log(`\n📡 API-triggered data loading for ${numberOfSeries} series...`)

    // Start loading in background
    dataLoaderService.loadTrendingSeriesWithReviews(numberOfSeries)
      .then(result => {
        console.log(`✅ Data loading completed: ${result.loadedCount} loaded, ${result.failedCount} failed`)
      })
      .catch(error => {
        console.error(`❌ Data loading failed: ${error.message}`)
      })

    res.json({
      success: true,
      message: `Data loading initiated for ${numberOfSeries} series. Check status endpoint for progress.`
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error starting data load',
      error: error.message
    })
  }
})

/**
 * POST /api/admin/reprocess-insights
 * Reprocess insights for all series with reviews
 */
router.post('/reprocess-insights', async (req, res) => {
  try {
    console.log('\n🔄 Reprocessing insights for all series...')

    const series = await Series.find({ 'reviews.0': { $exists: true } })
    let processedCount = 0
    let errorCount = 0

    for (const singleSeries of series) {
      try {
        await dataLoaderService.processReviewsForInsights(singleSeries)
        await singleSeries.save()
        processedCount++
      } catch (error) {
        console.error(`Error processing insights for ${singleSeries.title}:`, error.message)
        errorCount++
      }
    }

    console.log(`✅ Insights reprocessing complete: ${processedCount} processed, ${errorCount} errors`)

    res.json({
      success: true,
      message: 'Insights reprocessing completed',
      data: {
        processed: processedCount,
        errors: errorCount
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error reprocessing insights',
      error: error.message
    })
  }
})

/**
 * GET /api/admin/series-details
 * Get detailed statistics for all series
 */
router.get('/series-details', async (req, res) => {
  try {
    const series = await Series.find()
      .select('title totalReviews averageRating dataLoadingStatus insights.processedReviewCount')
      .sort({ totalReviews: -1 })

    const topSeries = series.slice(0, 20)
    
    res.json({
      success: true,
      data: {
        totalSeries: series.length,
        topSeries: topSeries,
        summary: {
          totalReviews: series.reduce((sum, s) => sum + s.totalReviews, 0),
          averageReviewsPerSeries: series.length > 0 
            ? Math.round(series.reduce((sum, s) => sum + s.totalReviews, 0) / series.length)
            : 0,
          seriesWithReviews: series.filter(s => s.totalReviews > 0).length
        }
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving series details',
      error: error.message
    })
  }
})

/**
 * GET /api/admin/performance-metrics
 * Get database performance metrics
 */
router.get('/performance-metrics', async (req, res) => {
  try {
    const startTime = Date.now()

    // Test query performance
    const queries = {
      findAll: Date.now(),
      totalSeries: await Series.countDocuments(),
      seriesTime: Date.now()
    }

    queries.findByAvgRating = Date.now()
    const topRated = await Series.find()
      .select('title averageRating')
      .sort({ averageRating: -1 })
      .limit(5)
    queries.ratingQueryTime = Date.now()

    queries.reviewStats = Date.now()
    const reviewStats = await Series.aggregate([
      { $group: { 
          _id: null, 
          totalReviews: { $sum: '$totalReviews' },
          avgReviews: { $avg: '$totalReviews' },
          maxReviews: { $max: '$totalReviews' },
          minReviews: { $min: '$totalReviews' }
        } 
      }
    ])
    queries.statsTime = Date.now()

    const metrics = {
      totalQueryTime: Date.now() - startTime,
      countDocumentsMs: queries.seriesTime - queries.findAll,
      topRatedQueryMs: queries.ratingQueryTime - queries.findByAvgRating,
      aggregationMs: queries.statsTime - queries.reviewStats.length > 0 ? queries.reviewStats[0]._id : 0,
      topRated: topRated,
      reviewStatistics: reviewStats[0] || {}
    }

    res.json({
      success: true,
      data: metrics
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving performance metrics',
      error: error.message
    })
  }
})

/**
 * POST /api/admin/clear-database
 * ⚠️ Clear all series (DANGEROUS - use with caution)
 */
router.post('/clear-database', async (req, res) => {
  try {
    const { confirm } = req.body

    if (confirm !== 'YES-CLEAR-ALL') {
      return res.status(400).json({
        success: false,
        message: 'Confirmation token incorrect. Send { "confirm": "YES-CLEAR-ALL" } to proceed.'
      })
    }

    console.log('⚠️  Clearing all series from database...')
    
    const result = await Series.deleteMany({})
    
    console.log(`✅ Database cleared: ${result.deletedCount} series removed`)

    res.json({
      success: true,
      message: 'Database cleared',
      data: {
        deletedCount: result.deletedCount
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error clearing database',
      error: error.message
    })
  }
})

module.exports = router
