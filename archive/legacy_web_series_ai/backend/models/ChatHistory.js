const mongoose = require('mongoose')

const chatHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    index: true,
    default: () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  question: {
    type: String,
    required: true,
    trim: true
  },
  answer: {
    type: String,
    required: true
  },
  sources: [{
    seriesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Series'
    },
    seriesTitle: String,
    documentType: {
      type: String,
      enum: ['review', 'insight', 'audience_profile', 'content_dna', 'series_description'],
      required: true
    },
    content: String,
    similarity: Number,
    chunkIndex: Number
  }],
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  isComparison: {
    type: Boolean,
    default: false
  },
  comparedSeries: [String], // List of series titles compared
  responseTime: {
    type: Number, // milliseconds
    default: 0
  },
  modelUsed: {
    type: String,
    default: 'gemini-pro'
  },
  followUpContext: {
    previousQuestions: [String],
    conversationTopic: String
  },
  userFeedback: {
    helpful: Boolean,
    comment: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
})

// Compound indexes for efficient queries
chatHistorySchema.index({ userId: 1, createdAt: -1 })
chatHistorySchema.index({ sessionId: 1, createdAt: -1 })
chatHistorySchema.index({ userId: 1, sessionId: 1 })

module.exports = mongoose.model('ChatHistory', chatHistorySchema)
