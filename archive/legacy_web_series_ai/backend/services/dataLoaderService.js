const Series = require('../models/Series')
const tmdbService = require('./tmdbService')
const nlpService = require('./nlpService')
const mongoose = require('mongoose')

class DataLoaderService {
  constructor() {
    this.batchSize = 10 // Process reviews in batches of 10
    this.maxReviewsPerSeries = 50
    this.maxSeriesToLoad = 100
    this.processingTimeout = 300000 // 5 minutes timeout
  }

  /**
   * Load trending series with reviews and metadata
   * @param {number} numberOfSeries - Number of series to load
   */
  async loadTrendingSeriesWithReviews(numberOfSeries = 50) {
    console.log(`\n📺 Starting data loading for ${numberOfSeries} trending series...`)
    
    try {
      const trendingSeries = await tmdbService.getTrendingTVSeries(numberOfSeries)
      const limitedSeries = trendingSeries.slice(0, numberOfSeries)
      
      let loadedCount = 0
      let failedCount = 0
      const results = []

      for (let i = 0; i < limitedSeries.length; i++) {
        try {
          console.log(`\n[${i + 1}/${limitedSeries.length}] Loading: ${limitedSeries[i].name}...`)
          
          const seriesData = await this.loadSingleSeriesWithReviews(limitedSeries[i].id)
          
          if (seriesData) {
            loadedCount++
            results.push(seriesData)
            console.log(`✅ Loaded: ${seriesData.title} (${seriesData.reviews.length} reviews)`)
          }
        } catch (error) {
          failedCount++
          console.warn(`⚠️  Failed to load series ${limitedSeries[i].name}: ${error.message}`)
        }

        // Add delay to avoid rate limiting
        if (i < limitedSeries.length - 1) {
          await this.delay(500)
        }
      }

      console.log(`\n✨ Data Loading Complete!`)
      console.log(`📊 Summary: ${loadedCount} series loaded, ${failedCount} failed`)
      
      return { loadedCount, failedCount, series: results }
    } catch (error) {
      console.error('Error loading trending series:', error)
      throw error
    }
  }

  /**
   * Load a single series with reviews and process NLP
   */
  async loadSingleSeriesWithReviews(tmdbId) {
    try {
      // Fetch TMDB data
      const seriesData = await tmdbService.getTVSeriesDetails(tmdbId)
      
      if (!seriesData || !seriesData.details) {
        throw new Error('Invalid series data from TMDB')
      }

      // Check if series already exists
      let series = await Series.findOne({ tmdbId })
      
      // Prepare reviews
      const reviewsData = await this.prepareReviewsData(seriesData)
      
      if (!series) {
        // Create new series
        series = new Series({
          title: seriesData.details.name,
          tmdbId: seriesData.details.id,
          description: seriesData.details.overview || '',
          genre: seriesData.details.genres?.map(g => g.name) || [],
          year: new Date(seriesData.details.first_air_date).getFullYear(),
          platform: 'Multiple',
          episodes: seriesData.details.number_of_seasons * 10, // Approximate
          posterPath: seriesData.details.poster_path,
          backdropPath: seriesData.details.backdrop_path,
          popularity: seriesData.details.popularity,
          status: seriesData.details.status,
          rating: seriesData.details.vote_average,
          cast: seriesData.credits?.cast?.slice(0, 5).map(actor => actor.name) || [],
          director: seriesData.credits?.crew?.find(c => c.job === 'Producer')?.name || '',
          reviews: reviewsData,
          dataLoadingStatus: {
            isLoaded: reviewsData.length > 0,
            reviewsLoaded: reviewsData.length,
            lastUpdated: new Date(),
            loadedFrom: 'TMDB'
          }
        })
      } else {
        // Update existing series with new reviews
        series.reviews = reviewsData
        series.dataLoadingStatus = {
          isLoaded: reviewsData.length > 0,
          reviewsLoaded: reviewsData.length,
          lastUpdated: new Date(),
          loadedFrom: 'TMDB'
        }
      }

      // Process reviews for NLP insights if we have enough
      if (reviewsData.length >= 10) {
        await this.processReviewsForInsights(series)
      }

      // Calculate basic statistics
      if (series.reviews && series.reviews.length > 0) {
        series.totalReviews = series.reviews.length
        
        // Calculate average rating
        const ratings = series.reviews
          .map(r => r.rating)
          .filter(r => typeof r === 'number' && !isNaN(r))
        
        if (ratings.length > 0) {
          series.averageRating = Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2))
        }
        
        // Count rating types
        series.positiveReviewCount = series.reviews.filter(r => r.rating >= 4).length
        series.neutralReviewCount = series.reviews.filter(r => r.rating === 3).length
        series.negativeReviewCount = series.reviews.filter(r => r.rating <= 2).length
        
        // Rating distribution
        series.ratingDistribution = {
          five: series.reviews.filter(r => r.rating === 5).length || 0,
          four: series.reviews.filter(r => r.rating === 4).length || 0,
          three: series.reviews.filter(r => r.rating === 3).length || 0,
          two: series.reviews.filter(r => r.rating === 2).length || 0,
          one: series.reviews.filter(r => r.rating === 1).length || 0
        }
      }

      // Save to database
      await series.save()
      
      return series
    } catch (error) {
      console.error(`Error loading single series ${tmdbId}:`, error.message)
      throw error
    }
  }

  /**
   * Prepare and clean reviewed data from TMDB
   */
  async prepareReviewsData(seriesData) {
    if (!seriesData.reviews || seriesData.reviews.length === 0) {
      return []
    }

    const reviews = []
    const processedReviews = seriesData.reviews.slice(0, this.maxReviewsPerSeries)

    for (const review of processedReviews) {
      try {
        const reviewText = review.content || ''
        const rating = review.author_details?.rating || 5

        if (reviewText.length > 20) { // Only process substantial reviews
          const processed = nlpService.processReview(reviewText, rating)

          // Ensure sentiment data is properly initialized
          const sentiment = processed.sentiment || {}
          
          const reviewDoc = {
            _id: new mongoose.Types.ObjectId(),
            externalId: review.id,
            author: review.author,
            authorId: review.author_details?.username,
            rating: Math.round(rating),
            text: reviewText.substring(0, 2000), // Limit text length
            sentiment: {
              positive: typeof sentiment.positive === 'number' ? sentiment.positive : 0,
              negative: typeof sentiment.negative === 'number' ? sentiment.negative : 0,
              neutral: typeof sentiment.neutral === 'number' ? sentiment.neutral : 0.5,
              score: typeof sentiment.score === 'number' ? sentiment.score : 0
            },
            topics: Array.isArray(processed.topics) ? processed.topics.slice(0, 5) : [],
            emotions: Array.isArray(processed.emotions) ? processed.emotions.slice(0, 3) : [],
            keywords: Array.isArray(processed.keywords) ? processed.keywords.slice(0, 5) : [],
            processedAt: new Date(),
            createdAt: new Date(review.created_at) || new Date()
          }

          reviews.push(reviewDoc)
        }
      } catch (error) {
        console.warn(`Failed to process review: ${error.message}`)
        continue
      }
    }

    return reviews
  }

  /**
   * Process reviews in batches for NLP insights and metrics
   */
  async processReviewsForInsights(series) {
    if (!series.reviews || series.reviews.length < 10) {
      console.log(`Not enough reviews for insights (${series.reviews.length} < 10)`)
      return
    }

    try {
      console.log(`Processing ${series.reviews.length} reviews for insights...`)
      
      const positiveReviews = series.reviews.filter(r => r.sentiment?.positive > 0.3)
      const negativeReviews = series.reviews.filter(r => r.sentiment?.negative > 0.3)
      const neutralReviews = series.reviews.filter(r => 
        r.sentiment?.neutral > 0.3 || 
        (r.sentiment?.positive <= 0.3 && r.sentiment?.negative <= 0.3)
      )

      // Extract key themes
      const keyThemes = this.extractKeyThemes(series.reviews)
      
      // Generate why insights
      const whyLiked = this.generateWhyInsights(positiveReviews, 'positive')
      const whyDisliked = this.generateWhyInsights(negativeReviews, 'negative')
      
      // Analyze content DNA
      const contentDNA = this.analyzeContentDNA(series.reviews)
      
      // Determine audience and emotional response
      const audienceProfile = this.generateAudienceProfile(series, positiveReviews, negativeReviews, neutralReviews)

      series.insights = {
        whyLiked: whyLiked.length > 0 ? whyLiked : ['Diverse positive reception from viewers'],
        whyDisliked: whyDisliked.length > 0 ? whyDisliked : ['Mixed critical feedback'],
        keyThemes: keyThemes.slice(0, 8),
        audienceType: audienceProfile.primaryDemographic,
        engagementLevel: audienceProfile.engagementLevel,
        emotionalResponse: audienceProfile.emotionalResponse,
        emotionalJourney: this.extractEmotionalJourney(series.reviews),
        contentDNA,
        lastInsightUpdate: new Date(),
        processedReviewCount: series.reviews.length
      }

      // Calculate precomputed metrics
      this.calculateMetrics(series)

      console.log(`Insights and metrics generated for ${series.title}`)
    } catch (error) {
      console.error(`Error processing reviews for insights: ${error.message}`)
    }
  }

  /**
   * Calculate and store precomputed metrics
   */
  calculateMetrics(series) {
    if (!series.reviews || series.reviews.length === 0) {
      return
    }

    // Sentiment breakdown
    const sentimentBreakdown = {
      highPositive: 0,
      positive: 0,
      neutral: 0,
      negative: 0,
      highNegative: 0
    }

    let sentimentSum = 0
    const topicsMap = {}
    const emotionsMap = {}
    let totalLength = 0

    series.reviews.forEach(review => {
      // Sentiment breakdown
      if (review.sentiment?.score > 0.7) {
        sentimentBreakdown.highPositive++
      } else if (review.sentiment?.score > 0.3) {
        sentimentBreakdown.positive++
      } else if (review.sentiment?.score >= -0.3 && review.sentiment?.score <= 0.3) {
        sentimentBreakdown.neutral++
      } else if (review.sentiment?.score < -0.3 && review.sentiment?.score >= -0.7) {
        sentimentBreakdown.negative++
      } else if (review.sentiment?.score < -0.7) {
        sentimentBreakdown.highNegative++
      }

      sentimentSum += review.sentiment?.score || 0
      totalLength += review.text?.length || 0

      // Count topics and emotions
      if (review.topics) {
        review.topics.forEach(topic => {
          topicsMap[topic] = (topicsMap[topic] || 0) + 1
        })
      }

      if (review.emotions) {
        review.emotions.forEach(emotion => {
          emotionsMap[emotion] = (emotionsMap[emotion] || 0) + 1
        })
      }
    })

    // Get top topics and emotions
    const topTopics = Object.entries(topicsMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic)

    const topEmotions = Object.entries(emotionsMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([emotion]) => emotion)

    // Calculate averages
    const avgSentiment = sentimentSum / series.reviews.length
    const avgLength = totalLength / series.reviews.length

    // Topic diversity (0-1 scale)
    const uniqueTopics = new Set()
    series.reviews.forEach(r => {
      if (r.topics && Array.isArray(r.topics)) {
        r.topics.forEach(t => {
          if (t && typeof t === 'string') {
            uniqueTopics.add(t)
          }
        })
      }
    })
    const topicDiversity = Math.min(1, uniqueTopics.size / Math.max(1, series.reviews.length * 2))

    series.metrics = {
      sentimentBreakdown,
      topTopics,
      topEmotions,
      averageSentimentScore: Number(avgSentiment.toFixed(2)),
      engagementMetrics: {
        reviewsPerDay: Math.round(series.reviews.length / 30), // Approximate
        avgReviewLength: Math.round(avgLength),
        topicDiversity: Number(topicDiversity.toFixed(2))
      },
      lastMetricsUpdate: new Date()
    }
  }

  /**
   * Extract key themes from reviews
   */
  extractKeyThemes(reviews) {
    const themeFrequency = {}
    
    reviews.forEach(review => {
      if (review.topics) {
        review.topics.forEach(topic => {
          if (topic && typeof topic === 'string') {
            themeFrequency[topic] = (themeFrequency[topic] || 0) + 1
          }
        })
      }
    })

    return Object.entries(themeFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([theme, count]) => `${theme} (mentioned ${count} times)`)
  }

  /**
   * Generate why insights from reviews
   */
  generateWhyInsights(reviews, type = 'positive') {
    if (reviews.length < 3) return []

    const insights = []
    const keywordFrequency = {}
    const emotionFrequency = {}

    reviews.forEach(review => {
      if (review.keywords) {
        review.keywords.forEach(kw => {
          keywordFrequency[kw] = (keywordFrequency[kw] || 0) + 1
        })
      }
      if (review.emotions) {
        review.emotions.forEach(em => {
          emotionFrequency[em] = (emotionFrequency[em] || 0) + 1
        })
      }
    })

    const topKeywords = Object.entries(keywordFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([kw]) => kw)

    const topEmotions = Object.entries(emotionFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([em]) => em)

    if (type === 'positive') {
      topKeywords.forEach(kw => 
        insights.push(`Outstanding ${kw} that captivates audiences`)
      )
      topEmotions.forEach(em => 
        insights.push(`Delivers ${em} storytelling experiences`)
      )
    } else {
      topKeywords.forEach(kw => 
        insights.push(`${kw} aspects could be improved`)
      )
      topEmotions.forEach(em => 
        insights.push(`Some viewers found ${em} elements overwhelming`)
      )
    }

    return insights.slice(0, 5)
  }

  /**
   * Analyze content DNA patterns
   */
  analyzeContentDNA(reviews) {
    const characteristics = {
      pacing: 'Moderate',
      complexity: 'Moderate',
      emotionalDepth: 'Significant',
      narrativeStyle: 'Complex',
      originality: 'Innovative'
    }

    // Analyze patterns in reviews
    const keywords = {}
    reviews.forEach(review => {
      if (review.keywords) {
        review.keywords.forEach(kw => {
          keywords[kw] = (keywords[kw] || 0) + 1
        })
      }
    })

    // Determine characteristics based on keywords
    const keywordStr = Object.keys(keywords).join(' ').toLowerCase()
    
    if (keywordStr.includes('fast') || keywordStr.includes('quick') || keywordStr.includes('rushed')) {
      characteristics.pacing = 'Fast-paced'
    } else if (keywordStr.includes('slow') || keywordStr.includes('tedious')) {
      characteristics.pacing = 'Slow-burn'
    }

    if (keywordStr.includes('complex') || keywordStr.includes('deep') || keywordStr.includes('intricate')) {
      characteristics.complexity = 'Highly Complex'
    } else if (keywordStr.includes('simple') || keywordStr.includes('straightforward')) {
      characteristics.complexity = 'Straightforward'
    }

    if (keywordStr.includes('emotional') || keywordStr.includes('touching') || keywordStr.includes('heart')) {
      characteristics.emotionalDepth = 'Deeply Emotional'
    } else if (keywordStr.includes('lighthearted') || keywordStr.includes('fun')) {
      characteristics.emotionalDepth = 'Light-hearted'
    }

    return characteristics
  }

  /**
   * Generate audience profile
   */
  generateAudienceProfile(series, positiveReviews, negativeReviews, neutralReviews) {
    const totalReviews = series.reviews.length
    const positiveRatio = positiveReviews.length / totalReviews
    const negativeRatio = negativeReviews.length / totalReviews

    let primaryDemographic = 'General Audience'
    let engagementLevel = 'Moderate'
    let emotionalResponse = 'Mixed'

    if (positiveRatio > 0.7) {
      primaryDemographic = 'Enthusiast Fanbase'
      engagementLevel = 'High'
      emotionalResponse = 'Highly Positive'
    } else if (positiveRatio > 0.5) {
      engagementLevel = 'High'
      emotionalResponse = 'Positive'
    } else if (negativeRatio > 0.5) {
      emotionalResponse = 'Critically Divided'
      engagementLevel = 'Niche Audience'
    }

    return {
      primaryDemographic,
      engagementLevel,
      emotionalResponse,
      recommendedFor: this.getRecommendedAudience(series.genre)
    }
  }

  /**
   * Extract emotional journey from reviews
   */
  extractEmotionalJourney(reviews) {
    const emotions = {}
    
    reviews.forEach(review => {
      if (review.emotions) {
        review.emotions.forEach(em => {
          emotions[em] = (emotions[em] || 0) + 1
        })
      }
    })

    return Object.entries(emotions)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([em]) => em)
  }

  /**
   * Get recommended audience based on genre
   */
  getRecommendedAudience(genres) {
    if (!genres || genres.length === 0) return 'General viewers'
    
    const genreString = genres.join(' ').toLowerCase()
    
    if (genreString.includes('thriller') || genreString.includes('horror')) {
      return 'Thriller and suspense enthusiasts'
    } else if (genreString.includes('comedy')) {
      return 'Comedy lovers'
    } else if (genreString.includes('drama')) {
      return 'Drama enthusiasts'
    } else if (genreString.includes('sci-fi') || genreString.includes('fantasy')) {
      return 'Sci-Fi and Fantasy fans'
    } else if (genreString.includes('action')) {
      return 'Action lovers'
    } else if (genreString.includes('romance')) {
      return 'Romance enthusiasts'
    }
    
    return 'General viewers'
  }

  /**
   * Get loading progress
   */
  async getLoadingProgress() {
    try {
      const totalSeries = await Series.countDocuments()
      const loadedSeries = await Series.countDocuments({ 'dataLoadingStatus.isLoaded': true })
      const totalReviews = await Series.aggregate([
        { $group: { _id: null, total: { $sum: '$totalReviews' } } }
      ])

      return {
        totalSeries,
        loadedSeries,
        totalReviews: totalReviews[0]?.total || 0,
        averageReviewsPerSeries: loadedSeries > 0 ? Math.round((totalReviews[0]?.total || 0) / loadedSeries) : 0,
        lastUpdated: new Date()
      }
    } catch (error) {
      console.error('Error getting loading progress:', error)
      return null
    }
  }

  /**
   * Delay utility for rate limiting
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

module.exports = new DataLoaderService()
