const Series = require('../models/Series')
const User = require('../models/User')
const dataLoaderService = require('../services/dataLoaderService')
const mongoose = require('mongoose')
const nlpService = require('../services/nlpService')

const seedDatabase = async () => {
  try {
    // Step 1: Create test user only in development mode
    if (process.env.NODE_ENV !== 'production') {
      console.log('Setting up test user (development mode)...')
      const existingUser = await User.findOne({ email: 'test@test.com' })
      if (!existingUser) {
        const testUser = new User({
          name: 'Test User',
          email: 'test@test.com',
          password: '123456'
        })
        await testUser.save()
        console.log('Test user created: test@test.com / 123456')
      } else {
        console.log('Test user already exists')
      }
    }
    
    // Step 2: Check existing data
    const seriesCount = await Series.countDocuments()
    const totalExistingReviews = await Series.aggregate([
      { $group: { _id: null, total: { $sum: '$totalReviews' } } }
    ])
    
    console.log('Current database status:')
    console.log(`  - Series in database: ${seriesCount}`)
    console.log(`  - Total reviews: ${totalExistingReviews[0]?.total || 0}`)
    
    // Step 3: Load trending series with reviews if database is empty or has minimal data
    if (seriesCount < 50) {
      console.log('Starting bulk data loading (target: 100 series with reviews)...')
      
      try {
        const result = await dataLoaderService.loadTrendingSeriesWithReviews(100)
        
        console.log('Data Loading Summary:')
        console.log(`  - Successfully loaded: ${result.loadedCount} series`)
        console.log(`  - Failed: ${result.failedCount} series`)
        
        // Get updated statistics
        const stats = await dataLoaderService.getLoadingProgress()
        if (stats) {
          console.log('Final Statistics:')
          console.log(`  - Total series: ${stats.totalSeries}`)
          console.log(`  - Loaded series: ${stats.loadedSeries}`)
          console.log(`  - Total reviews: ${stats.totalReviews}`)
          console.log(`  - Avg reviews/series: ${stats.averageReviewsPerSeries}`)
        }
      } catch (error) {
        console.error('Error during bulk loading:', error.message)
        console.log('Continuing with minimal sample data...')
        
        // If bulk loading fails, seed with minimal sample data
        await seedMinimalSampleData()
      }
    } else {
      console.log(`Database already has ${seriesCount} series. Skipping bulk load.`)
      console.log('To reload data, clear the database and restart the server.')
    }
    
  } catch (error) {
    console.error('Error in seedDatabase:', error)
  }
}

/**
 * Seed minimal sample data for development
 */
const seedMinimalSampleData = async () => {
  try {
    console.log('Seeding minimal sample data...')
    
    const sampleSeries = [
      {
        title: "Stranger Things",
        description: "A group of kids in a small town uncover supernatural mysteries and dangerous secrets",
        genre: ["Sci-Fi", "Horror", "Drama"],
        year: 2016,
        platform: "Netflix",
        director: "The Duffer Brothers",
        cast: ["Winona Ryder", "David Harbour", "Millie Bobby Brown"],
        rating: 8.7,
        episodes: 34,
        reviews: [
          {
            rating: 5,
            text: "Amazing character development and nostalgic atmosphere. The kids' acting is phenomenal and the mystery keeps you hooked. Absolutely brilliant storytelling."
          },
          {
            rating: 4,
            text: "Great plot with supernatural elements. Some pacing issues in middle episodes but overall engaging story with excellent performances."
          },
          {
            rating: 5,
            text: "Incredible series! The 80s nostalgia, the supernatural elements, and the character arcs make this a must-watch. Highly recommend!"
          },
          {
            rating: 4,
            text: "Very good series with compelling mysteries and strong character development. Some slow moments but overall excellent."
          },
          {
            rating: 3,
            text: "Good show overall, but some plot points felt predictable. The cast is great though."
          }
        ]
      }
    ]

    for (const seriesData of sampleSeries) {
      try {
        const existingSeries = await Series.findOne({ title: seriesData.title })
        
        if (!existingSeries) {
          // Process reviews
          const processedReviews = seriesData.reviews.map(review => {
            const analysis = nlpService.processReview(review.text, review.rating)
            return {
              _id: new mongoose.Types.ObjectId(),
              author: `User${Math.floor(Math.random() * 10000)}`,
              rating: review.rating,
              text: review.text,
              sentiment: {
                positive: analysis.sentiment.positive,
                negative: analysis.sentiment.negative,
                neutral: analysis.sentiment.neutral,
                score: analysis.sentiment.score
              },
              topics: analysis.topics?.slice(0, 5) || [],
              emotions: analysis.emotions?.slice(0, 3) || [],
              keywords: analysis.keywords?.slice(0, 5) || [],
              processedAt: new Date(),
              createdAt: new Date()
            }
          })

          // Create insights
          const positiveReviews = processedReviews.filter(r => r.sentiment.positive > 0.3)
          const negativeReviews = processedReviews.filter(r => r.sentiment.negative > 0.3)

          const series = new Series({
            ...seriesData,
            reviews: processedReviews,
            insights: {
              whyLiked: positiveReviews.length > 0 
                ? ['Outstanding character development', 'Engaging storylines', 'Brilliant performances']
                : ['Solid entertainment'],
              whyDisliked: negativeReviews.length > 0
                ? ['Predictable plot elements']
                : [],
              keyThemes: ['character development', 'narrative complexity', 'emotional depth'],
              audienceType: "General Audience",
              engagementLevel: 'High',
              emotionalResponse: 'Positive',
              emotionalJourney: ["Curiosity", "Engagement", "Satisfaction"],
              contentDNA: {
                pacing: "Moderate to Fast",
                complexity: "Medium to High",
                emotionalDepth: "Significant",
                narrativeStyle: "Character-driven",
                originality: "Innovative"
              },
              lastInsightUpdate: new Date(),
              processedReviewCount: processedReviews.length
            },
            dataLoadingStatus: {
              isLoaded: true,
              reviewsLoaded: processedReviews.length,
              lastUpdated: new Date(),
              loadedFrom: 'Manual'
            }
          })

          await series.save()
          console.log(`Seeded: ${seriesData.title} with ${processedReviews.length} reviews`)
        }
      } catch (error) {
        console.error(`Error seeding series ${seriesData.title}:`, error.message)
      }
    }

    console.log('Minimal sample data seeding complete')
  } catch (error) {
    console.error('Error in seedMinimalSampleData:', error)
  }
}

module.exports = { seedDatabase }