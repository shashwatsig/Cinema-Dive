const mongoose = require('mongoose')

const seriesSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  tmdbId: {
    type: Number,
    unique: true,
    sparse: true,
    index: true
  },
  description: {
    type: String,
    required: true
  },
  genre: [String],
  year: Number,
  platform: String,
  director: String,
  cast: [String],
  rating: Number,
  episodes: Number,
  posterPath: String,
  backdropPath: String,
  popularity: Number,
  status: {
    type: String,
    default: 'Ended',
    index: true
  },
  
  // Review and Rating Statistics
  totalReviews: {
    type: Number,
    default: 0,
    index: true
  },
  averageRating: {
    type: Number,
    default: 0,
    index: true
  },
  ratingDistribution: {
    five: { type: Number, default: 0 },
    four: { type: Number, default: 0 },
    three: { type: Number, default: 0 },
    two: { type: Number, default: 0 },
    one: { type: Number, default: 0 }
  },
  positiveReviewCount: {
    type: Number,
    default: 0
  },
  neutralReviewCount: {
    type: Number,
    default: 0
  },
  negativeReviewCount: {
    type: Number,
    default: 0
  },
  
  // Reviews - Separated for better indexing
  reviews: [{
    _id: mongoose.Schema.Types.ObjectId,
    externalId: String,
    author: String,
    authorId: String,
    rating: Number,
    text: String,
    sentiment: {
      positive: Number,
      negative: Number,
      neutral: Number,
      score: Number
    },
    topics: [String],
    emotions: [String],
    keywords: [String],
    processedAt: Date,
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  }],
  
  // Insights based on aggregated review analysis
  insights: {
    whyLiked: [String],
    whyDisliked: [String],
    keyThemes: [String],
    audienceType: String,
    engagementLevel: String,
    emotionalResponse: String,
    emotionalJourney: [String],
    contentDNA: {
      pacing: String,
      complexity: String,
      emotionalDepth: String,
      narrativeStyle: String,
      originality: String
    },
    lastInsightUpdate: Date,
    processedReviewCount: {
      type: Number,
      default: 0
    }
  },
  
  // Precomputed Metrics
  metrics: {
    sentimentBreakdown: {
      highPositive: { type: Number, default: 0 }, // > 0.7
      positive: { type: Number, default: 0 },      // 0.3 to 0.7
      neutral: { type: Number, default: 0 },       // -0.3 to 0.3
      negative: { type: Number, default: 0 },      // -0.7 to -0.3
      highNegative: { type: Number, default: 0 }   // < -0.7
    },
    topTopics: [String],
    topEmotions: [String],
    averageSentimentScore: { type: Number, default: 0 },
    engagementMetrics: {
      reviewsPerDay: { type: Number, default: 0 },
      avgReviewLength: { type: Number, default: 0 },
      topicDiversity: { type: Number, default: 0 }  // 0-1 scale
    },
    lastMetricsUpdate: Date
  },
  
  // Data loading tracking
  dataLoadingStatus: {
    isLoaded: { type: Boolean, default: false },
    reviewsLoaded: { type: Number, default: 0 },
    lastUpdated: Date,
    loadedFrom: String
  },
  
  // RAG Vector Embedding Status
  embeddingStatus: {
    isEmbedded: { type: Boolean, default: false },
    embeddedAt: Date,
    embeddedReviewCount: { type: Number, default: 0 },
    embeddedInsights: { type: Boolean, default: false },
    embeddedAudienceProfile: { type: Boolean, default: false },
    embeddedContentDNA: { type: Boolean, default: false },
    embeddingVersion: { type: String, default: '1.0' },
    vectorStoredChunks: {
      reviews: { type: Number, default: 0 },
      insights: { type: Number, default: 0 },
      audienceProfile: { type: Number, default: 0 },
      contentDNA: { type: Number, default: 0 },
      description: { type: Number, default: 0 }
    },
    embeddingError: String
  }
}, {
  timestamps: true
})

// Compound indexes for better query performance
seriesSchema.index({ title: 1, year: 1 })
seriesSchema.index({ genre: 1, averageRating: -1 })
seriesSchema.index({ 'reviews.createdAt': -1 })
seriesSchema.index({ 'insights.lastInsightUpdate': -1 })
seriesSchema.index({ 'metrics.lastMetricsUpdate': -1 })
seriesSchema.index({ description: 'text', title: 'text', genre: 'text' })

module.exports = mongoose.model('Series', seriesSchema)