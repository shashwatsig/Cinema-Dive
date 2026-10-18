const natural = require('natural')
const compromise = require('compromise')
const Sentiment = require('sentiment')

class NLPService {
  constructor() {
    this.tokenizer = new natural.WordTokenizer()
    this.sentiment = new Sentiment()
  }

  // Analyze sentiment of text using Sentiment library
  analyzeSentiment(text) {
    try {
      const result = this.sentiment.analyze(text)
      
      // Normalize to 0-1 scale
      const score = result.score || 0
      const maxAbs = 10 // Approximate max score
      const normalizedScore = Math.max(-1, Math.min(1, score / maxAbs))
      
      return {
        score: Number(normalizedScore.toFixed(2)),
        positive: normalizedScore > 0.1 ? Math.min(Math.max(normalizedScore, 0), 1) : 0,
        negative: normalizedScore < -0.1 ? Math.min(Math.max(Math.abs(normalizedScore), 0), 1) : 0,
        neutral: Math.abs(normalizedScore) <= 0.1 ? 1 : Math.max(0, 1 - Math.abs(normalizedScore))
      }
    } catch (error) {
      console.warn('Error in analyzeSentiment:', error.message)
      return {
        score: 0,
        positive: 0,
        negative: 0,
        neutral: 1
      }
    }
  }

  // Extract topics and keywords
  extractTopics(text) {
    const doc = compromise(text)
    
    const topics = []
    
    // Extract nouns as potential topics
    const nouns = doc.nouns().out('array')
    topics.push(...nouns.filter(noun => noun.length > 3))
    
    // Extract adjectives for emotional context
    const adjectives = doc.adjectives().out('array')
    
    // Common web series topics
    const seriesKeywords = [
      'plot', 'character', 'acting', 'story', 'ending', 'season',
      'episode', 'dialogue', 'pacing', 'twist', 'development'
    ]
    
    const foundKeywords = seriesKeywords.filter(keyword => 
      text.toLowerCase().includes(keyword)
    )
    
    return {
      topics: [...new Set(topics.slice(0, 5))],
      emotions: adjectives.slice(0, 3),
      keywords: foundKeywords
    }
  }

  // Generate "why" explanations
  generateWhyExplanation(reviews) {
    const positiveReviews = reviews.filter(r => r.sentiment.positive > 0.3)
    const negativeReviews = reviews.filter(r => r.sentiment.negative > 0.3)
    
    const whyLiked = this.extractCommonThemes(positiveReviews, 'positive')
    const whyDisliked = this.extractCommonThemes(negativeReviews, 'negative')
    
    return { whyLiked, whyDisliked }
  }

  extractCommonThemes(reviews, type) {
    const allTopics = []
    const allEmotions = []
    const allKeywords = []
    
    reviews.forEach(review => {
      if (review.topics) allTopics.push(...review.topics)
      if (review.emotions) allEmotions.push(...review.emotions)
      if (review.keywords) allKeywords.push(...review.keywords)
    })
    
    // Count frequency
    const topicCount = {}
    const emotionCount = {}
    const keywordCount = {}
    
    allTopics.forEach(topic => {
      topicCount[topic] = (topicCount[topic] || 0) + 1
    })
    
    allEmotions.forEach(emotion => {
      emotionCount[emotion] = (emotionCount[emotion] || 0) + 1
    })
    
    allKeywords.forEach(keyword => {
      keywordCount[keyword] = (keywordCount[keyword] || 0) + 1
    })
    
    // Get most common themes
    const commonTopics = Object.entries(topicCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([topic, count]) => {
        if (count >= Math.max(2, reviews.length * 0.5)) {
          return `Strong ${topic} elements that ${type === 'positive' ? 'engage' : 'frustrate'} viewers`
        }
        return `${topic} aspects ${type === 'positive' ? 'stand out' : 'need improvement'}`
      })
    
    const commonEmotions = Object.entries(emotionCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2)
      .map(([emotion, count]) => {
        if (count >= Math.max(2, reviews.length * 0.4)) {
          return `${emotion} tone ${type === 'positive' ? 'enhances' : 'detracts from'} the experience`
        }
        return emotion
      })
    
    const commonKeywords = Object.entries(keywordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2)
      .map(([keyword, count]) => {
        if (count >= Math.max(2, reviews.length * 0.5)) {
          return `${keyword} is ${type === 'positive' ? 'a major strength' : 'a significant weakness'}`
        }
        return keyword
      })
    
    return [...commonTopics, ...commonEmotions, ...commonKeywords].slice(0, 5)
  }

  // Process review for storage
  processReview(reviewText, rating) {
    try {
      const sentiment = this.analyzeSentiment(reviewText || '')
      const topics = this.extractTopics(reviewText || '')
      
      return {
        sentiment: sentiment || {
          score: 0,
          positive: 0,
          negative: 0,
          neutral: 1
        },
        topics: Array.isArray(topics?.topics) ? topics.topics : [],
        emotions: Array.isArray(topics?.emotions) ? topics.emotions : [],
        keywords: Array.isArray(topics?.keywords) ? topics.keywords : []
      }
    } catch (error) {
      console.warn('Error in processReview:', error.message)
      return {
        sentiment: {
          score: 0,
          positive: 0,
          negative: 0,
          neutral: 1
        },
        topics: [],
        emotions: [],
        keywords: []
      }
    }
  }
}

module.exports = new NLPService()