/**
 * Batch Data Loading Utility
 * 
 * This script provides utilities for efficient batch data loading and processing
 * Usage: node batchLoad.js [command] [options]
 * 
 * Commands:
 *   - load [count]: Load series with reviews (default: 50)
 *   - process-insights: Reprocess insights for all series
 *   - cleanup-old: Remove reviews older than N days
 *   - optimize-db: Run database optimization
 *   - stats: Show database statistics
 */

const mongoose = require('mongoose')
const dotenv = require('dotenv')
const Series = require('./models/Series')
const User = require('./models/User')
const dataLoaderService = require('./services/dataLoaderService')

dotenv.config()

// Command line arguments
const command = process.argv[2]
const param = process.argv[3] || '50'

async function main() {
  try {
    // Connect to database
    console.log('Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGODB_URI, {
      family: 4
    })
    console.log('Connected to MongoDB')

    switch (command) {
      case 'load':
        await loadData(parseInt(param))
        break
      
      case 'process-insights':
        await processAllInsights()
        break
      
      case 'cleanup-old':
        await cleanupOldData(parseInt(param))
        break
      
      case 'optimize-db':
        await optimizeDatabase()
        break
      
      case 'stats':
        await showStatistics()
        break
      
      case 'help':
      default:
        showHelp()
    }

  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  } finally {
    await mongoose.connection.close()
    console.log('Database connection closed')
  }
}

async function loadData(count) {
  console.log(`Loading ${count} series with reviews...`)
  
  try {
    const result = await dataLoaderService.loadTrendingSeriesWithReviews(count)
    
    console.log('Loading Complete!')
    console.log(`  - Successfully loaded: ${result.loadedCount} series`)
    console.log(`  - Failed: ${result.failedCount} series`)
    
    // Show final statistics
    const stats = await dataLoaderService.getLoadingProgress()
    if (stats) {
      console.log('Database Statistics:')
      console.log(`  - Total series: ${stats.totalSeries}`)
      console.log(`  - Loaded series: ${stats.loadedSeries}`)
      console.log(`  - Total reviews: ${stats.totalReviews}`)
      console.log(`  - Avg reviews/series: ${stats.averageReviewsPerSeries}`)
    }
  } catch (error) {
    throw error
  }
}

async function processAllInsights() {
  console.log(`Reprocessing insights for all series...`)
  
  try {
    const series = await Series.find({ 'reviews.0': { $exists: true } })
    
    if (series.length === 0) {
      console.log('No series with reviews found')
      return
    }

    console.log(`Found ${series.length} series with reviews`)

    let processedCount = 0
    let errorCount = 0

    for (let i = 0; i < series.length; i++) {
      try {
        process.stdout.write(`\r[${i + 1}/${series.length}] Processing: ${series[i].title}...`)
        
        await dataLoaderService.processReviewsForInsights(series[i])
        await series[i].save()
        processedCount++
      } catch (error) {
        console.error(`\nError processing ${series[i].title}:`, error.message)
        errorCount++
      }
    }

    console.log(`\n\nProcessing Complete!`)
    console.log(`  - Successfully processed: ${processedCount} series`)
    console.log(`  - Errors: ${errorCount}`)
  } catch (error) {
    throw error
  }
}

async function cleanupOldData(days) {
  if (!days || days < 1) {
    console.log('Please specify number of days: node batchLoad.js cleanup-old [days]')
    return
  }

  console.log(`Removing reviews older than ${days} days...`)
  
  try {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    
    let totalRemoved = 0
    const allSeries = await Series.find()

    for (const series of allSeries) {
      const initialCount = series.reviews.length
      
      series.reviews = series.reviews.filter(r => 
        r.createdAt && new Date(r.createdAt) > cutoffDate
      )

      const removed = initialCount - series.reviews.length
      if (removed > 0) {
        await series.save()
        totalRemoved += removed
        console.log(`Updated ${series.title}: removed ${removed} old reviews`)
      }
    }

    console.log(`Cleanup Complete! Removed ${totalRemoved} reviews`)
  } catch (error) {
    throw error
  }
}

async function optimizeDatabase() {
  console.log(`Optimizing database...`)
  
  try {
    console.log('Creating indexes...')
    
    // Create indexes
    await Series.collection.createIndex({ title: 1 })
    await Series.collection.createIndex({ tmdbId: 1 })
    await Series.collection.createIndex({ genre: 1, averageRating: -1 })
    await Series.collection.createIndex({ 'reviews.createdAt': -1 })
    await Series.collection.createIndex({ 'dataLoadingStatus.isLoaded': 1 })
    await Series.collection.createIndex({ 'metrics.lastMetricsUpdate': -1 })
    
    console.log('Rebuilding collection statistics...')
    
    // Rebuild stats for each series
    const series = await Series.find()
    for (const singleSeries of series) {
      singleSeries._id = singleSeries._id // Trigger pre-save hook
      await singleSeries.save()
    }

    console.log('Database Optimization Complete!')
    console.log(`  - Processed ${series.length} series`)
    console.log(`  - Indexes created`)
    console.log(`  - Statistics rebuilt`)
  } catch (error) {
    throw error
  }
}

async function showStatistics() {
  console.log('Database Statistics\n')
  
  try {
    const stats = await dataLoaderService.getLoadingProgress()
    
    console.log(`Total Series: ${stats.totalSeries}`)
    console.log(`Loaded Series: ${stats.loadedSeries}`)
    console.log(`Total Reviews: ${stats.totalReviews}`)
    console.log(`Average Reviews/Series: ${stats.averageReviewsPerSeries}`)

    // Top rated series
    const topRated = await Series.find()
      .select('title averageRating totalReviews')
      .sort({ averageRating: -1 })
      .limit(5)

    console.log(`\nTop 5 Rated Series:`)
    topRated.forEach((s, i) => {
      console.log(`${i + 1}. ${s.title}: ${s.averageRating} (${s.totalReviews} reviews)`)
    })

    // Most reviewed
    const mostReviewed = await Series.find()
      .select('title totalReviews averageRating')
      .sort({ totalReviews: -1 })
      .limit(5)

    console.log(`\nTop 5 Most Reviewed:`)
    mostReviewed.forEach((s, i) => {
      console.log(`${i + 1}. ${s.title}: ${s.totalReviews} reviews (avg rating: ${s.averageRating})`)
    })

    // Rating distribution
    const distribution = await Series.aggregate([
      { $group: {
          _id: null,
          fiveStars: { $sum: '$ratingDistribution.five' },
          fourStars: { $sum: '$ratingDistribution.four' },
          threeStars: { $sum: '$ratingDistribution.three' },
          twoStars: { $sum: '$ratingDistribution.two' },
          oneStars: { $sum: '$ratingDistribution.one' }
        }
      }
    ])

    if (distribution.length > 0) {
      console.log(`\nRating Distribution Across All Reviews:`)
      console.log(`5-star: ${distribution[0].fiveStars}`)
      console.log(`4-star: ${distribution[0].fourStars}`)
      console.log(`3-star: ${distribution[0].threeStars}`)
      console.log(`2-star: ${distribution[0].twoStars}`)
      console.log(`1-star: ${distribution[0].oneStars}`)
    }

  } catch (error) {
    throw error
  }
}

function showHelp() {
  console.log(`
Web Series Insight - Batch Data Loading Utility

USAGE:
  node batchLoad.js [command] [options]

COMMANDS:

  load [count]
    Load trending series with reviews from TMDB
    Example: node batchLoad.js load 50
    Default: 50 series

  process-insights
    Reprocess insights for all series with reviews
    Uses NLP to regenerate insights and themes
    Example: node batchLoad.js process-insights

  cleanup-old [days]
    Remove reviews older than specified days
    Example: node batchLoad.js cleanup-old 30

  optimize-db
    Create indexes and rebuild statistics
    Improves query performance
    Example: node batchLoad.js optimize-db

  stats
    Show database statistics including top series, ratings distribution
    Example: node batchLoad.js stats

  help
    Show this help message

EXAMPLES:
  
  # Load 100 series with reviews
  node batchLoad.js load 100

  # Reprocess all insights after schema changes
  node batchLoad.js process-insights

  # Clean up old reviews
  node batchLoad.js cleanup-old 60

  # Optimize database for better performance
  node batchLoad.js optimize-db

  # View current statistics
  node batchLoad.js stats

ENVIRONMENT VARIABLES:
  MONGODB_URI - MongoDB connection string
`)
}

// Run main function
main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
