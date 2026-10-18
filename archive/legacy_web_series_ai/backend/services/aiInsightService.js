const nlpService = require('./nlpService')

class AIInsightService {
  constructor() {
    this.emotionKeywords = {
      curiosity: ['mystery', 'question', 'wonder', 'intrigue', 'puzzle'],
      anxiety: ['tension', 'stress', 'worry', 'fear', 'nervous'],
      excitement: ['thrill', 'amazing', 'incredible', 'awesome', 'fantastic'],
      sadness: ['sad', 'cry', 'emotional', 'heartbreak', 'tragic'],
      anger: ['angry', 'frustrated', 'mad', 'annoying', 'hate'],
      satisfaction: ['satisfied', 'complete', 'perfect', 'closure', 'resolved'],
      shock: ['surprise', 'unexpected', 'twist', 'shocking', 'unbelievable']
    }
  }

  // Generate WHY-based insights from reviews
  generateWhyInsights(reviews, seriesData) {
    // Normalize TMDB review structure
    const normalizedReviews = reviews.map(review => ({
      content: review.content,
      text: review.content, // fallback
      rating: review.author_details?.rating || 5, // TMDB rating is in author_details
      author: review.author,
      id: review.id
    }))

    const processedReviews = normalizedReviews.map(review => ({
      ...review,
      processed: nlpService.processReview(review.content || review.text || '', review.rating || 5)
    }))

    const positiveReviews = processedReviews.filter(r => 
      r.processed && r.processed.sentiment && r.processed.sentiment.positive > 0.3
    )
    const negativeReviews = processedReviews.filter(r => 
      r.processed && r.processed.sentiment && r.processed.sentiment.negative > 0.3
    )

    const whyLiked = this.extractWhyReasons(positiveReviews, 'positive')
    const whyDisliked = this.extractWhyReasons(negativeReviews, 'negative')

    return {
      whyLiked,
      whyDisliked,
      overallSentiment: this.calculateOverallSentiment(processedReviews),
      keyThemes: this.extractKeyThemes(processedReviews),
      audienceProfile: this.generateAudienceProfile(processedReviews, seriesData)
    }
  }

  extractWhyReasons(reviews, type) {
    if (!reviews || reviews.length === 0) {
      return [type === 'positive' 
        ? 'Limited positive feedback available'
        : 'Limited negative feedback available'
      ]
    }

    const reasons = []
    const commonTopics = {}
    const commonEmotions = {}

    reviews.forEach(review => {
      if (!review.processed || !review.processed.topics) return
      
      if (review.processed.topics && Array.isArray(review.processed.topics)) {
        review.processed.topics.forEach(topic => {
          if (topic && typeof topic === 'string' && topic.length > 2) {
            commonTopics[topic] = (commonTopics[topic] || 0) + 1
          }
        })
      }
      
      if (review.processed.emotions && Array.isArray(review.processed.emotions)) {
        review.processed.emotions.forEach(emotion => {
          if (emotion && typeof emotion === 'string') {
            commonEmotions[emotion] = (commonEmotions[emotion] || 0) + 1
          }
        })
      }
    })

    // Generate explanations based on frequency
    const topTopics = Object.entries(commonTopics)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)

    const topEmotions = Object.entries(commonEmotions)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2)

    if (type === 'positive') {
      topTopics.forEach(([topic, count]) => {
        if (count >= Math.max(1, reviews.length * 0.3)) {
          reasons.push(`Strong ${topic} development resonated with viewers`)
        }
      })
      topEmotions.forEach(([emotion, count]) => {
        if (count >= Math.max(1, reviews.length * 0.3)) {
          reasons.push(`${emotion} storytelling created positive engagement`)
        }
      })
    } else {
      topTopics.forEach(([topic, count]) => {
        if (count >= Math.max(1, reviews.length * 0.3)) {
          reasons.push(`${topic} elements disappointed expectations`)
        }
      })
      topEmotions.forEach(([emotion, count]) => {
        if (count >= Math.max(1, reviews.length * 0.3)) {
          reasons.push(`${emotion} execution failed to connect with audience`)
        }
      })
    }

    return reasons.length > 0 ? reasons : [
      type === 'positive' 
        ? 'Viewers appreciated the overall storytelling approach'
        : 'Mixed reactions to the series execution'
    ]
  }

  calculateOverallSentiment(processedReviews) {
    if (!processedReviews || processedReviews.length === 0) {
      return { positive: 0, neutral: 1, negative: 0 }
    }

    let totalPositive = 0
    let totalNeutral = 0
    let totalNegative = 0

    processedReviews.forEach(review => {
      if (review.processed && review.processed.sentiment) {
        totalPositive += review.processed.sentiment.positive || 0
        totalNeutral += review.processed.sentiment.neutral || 0
        totalNegative += review.processed.sentiment.negative || 0
      }
    })

    const count = processedReviews.length
    return {
      positive: totalPositive / count,
      neutral: totalNeutral / count,
      negative: totalNegative / count
    }
  }

  extractKeyThemes(processedReviews) {
    if (!processedReviews || processedReviews.length === 0) {
      return []
    }

    const allTopics = {}
    processedReviews.forEach(review => {
      if (review.processed && review.processed.topics) {
        review.processed.topics.forEach(topic => {
          if (topic && typeof topic === 'string') {
            allTopics[topic] = (allTopics[topic] || 0) + 1
          }
        })
      }
    })

    return Object.entries(allTopics)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([topic, frequency]) => ({ topic, frequency }))
  }

  generateAudienceProfile(processedReviews, seriesData) {
    // Simple audience profiling based on review analysis
    const genres = seriesData?.genres || []
    const hasDrama = genres.some(g => {
      const genreName = typeof g === 'string' ? g : g.name || ''
      return genreName.toLowerCase().includes('drama')
    })
    const hasComedy = genres.some(g => {
      const genreName = typeof g === 'string' ? g : g.name || ''
      return genreName.toLowerCase().includes('comedy')
    })
    const hasAction = genres.some(g => {
      const genreName = typeof g === 'string' ? g : g.name || ''
      return genreName.toLowerCase().includes('action')
    })

    let primaryDemographic = 'General audience'
    let engagementLevel = 'Moderate'
    let emotionalResponse = 'Balanced'
    let recommendedFor = 'Casual viewers'

    if (hasDrama) {
      primaryDemographic = 'Adults 25-45'
      engagementLevel = 'High'
      emotionalResponse = 'Emotionally invested'
      recommendedFor = 'Drama enthusiasts'
    } else if (hasComedy) {
      primaryDemographic = 'Teens to adults'
      engagementLevel = 'High'
      emotionalResponse = 'Light-hearted'
      recommendedFor = 'Comedy fans'
    } else if (hasAction) {
      primaryDemographic = 'Young adults'
      engagementLevel = 'High'
      emotionalResponse = 'Adrenaline-driven'
      recommendedFor = 'Action seekers'
    }

    return {
      primaryDemographic,
      engagementLevel,
      emotionalResponse,
      recommendedFor
    }
  }

  // Generate emotion timeline for episodes
  generateEmotionTimeline(seriesData, reviews) {
    const episodes = seriesData.number_of_episodes || seriesData.number_of_seasons * 10 || 10
    const timeline = []

    // Analyze reviews for emotional keywords
    const reviewText = reviews.map(r => r.content || r.text || '').join(' ')
    const emotionScores = this.analyzeEmotionFromText(reviewText)

    // Simulate emotion progression based on series characteristics and review analysis
    const genres = seriesData.genres || []
    const isThriller = genres.some(g => {
      const genreName = typeof g === 'string' ? g : g.name || ''
      return genreName.toLowerCase().includes('thriller') || genreName.toLowerCase().includes('mystery') || genreName.toLowerCase().includes('crime')
    })
    const isDrama = genres.some(g => {
      const genreName = typeof g === 'string' ? g : g.name || ''
      return genreName.toLowerCase().includes('drama')
    })
    const isComedy = genres.some(g => {
      const genreName = typeof g === 'string' ? g : g.name || ''
      return genreName.toLowerCase().includes('comedy')
    })
    const isHorror = genres.some(g => {
      const genreName = typeof g === 'string' ? g : g.name || ''
      return genreName.toLowerCase().includes('horror')
    })

    for (let i = 1; i <= Math.min(episodes, 12); i++) {
      let primaryEmotion = 'curiosity'
      let intensity = 0.5

      // Base emotion on genre and episode position
      if (isHorror || isThriller) {
        if (i === 1) primaryEmotion = 'curiosity'
        else if (i <= 3) primaryEmotion = 'anxiety'
        else if (i <= Math.floor(episodes * 0.7)) {
          primaryEmotion = emotionScores.anxiety > emotionScores.shock ? 'anxiety' : 'shock'
        }
        else if (i <= episodes - 1) primaryEmotion = 'excitement'
        else primaryEmotion = 'satisfaction'
        intensity = 0.7 + (emotionScores.anxiety + emotionScores.shock) * 0.3
      } else if (isDrama) {
        if (i === 1) primaryEmotion = 'curiosity'
        else if (i <= Math.floor(episodes * 0.4)) primaryEmotion = 'excitement'
        else if (i <= Math.floor(episodes * 0.8)) {
          primaryEmotion = emotionScores.sadness > emotionScores.anger ? 'sadness' : 'anger'
        }
        else primaryEmotion = 'satisfaction'
        intensity = 0.6 + (emotionScores.sadness + emotionScores.excitement) * 0.4
      } else if (isComedy) {
        primaryEmotion = emotionScores.excitement > 0.5 ? 'excitement' : 'satisfaction'
        intensity = 0.6 + emotionScores.excitement * 0.4 + Math.sin(i / episodes * Math.PI * 2) * 0.2
      } else {
        // Default progression
        const emotions = ['curiosity', 'excitement', 'anxiety', 'satisfaction']
        primaryEmotion = emotions[Math.floor((i - 1) / episodes * emotions.length)]
        intensity = 0.5 + Math.sin(i / episodes * Math.PI) * 0.3
      }

      timeline.push({
        episode: i,
        primaryEmotion,
        intensity: Math.min(Math.max(intensity, 0.1), 1),
        description: this.getEmotionDescription(primaryEmotion, i, episodes, seriesData.name)
      })
    }

    return timeline
  }

  analyzeEmotionFromText(text) {
    const emotionKeywords = {
      curiosity: ['curious', 'wonder', 'mystery', 'intrigue', 'question'],
      anxiety: ['tense', 'stress', 'worry', 'fear', 'nervous', 'anxious'],
      excitement: ['excited', 'thrill', 'amazing', 'awesome', 'fantastic', 'energetic'],
      sadness: ['sad', 'emotional', 'heartbreak', 'tragic', 'depressing'],
      anger: ['angry', 'frustrated', 'mad', 'annoying', 'hate'],
      satisfaction: ['satisfied', 'complete', 'perfect', 'closure', 'resolved', 'content'],
      shock: ['surprise', 'unexpected', 'twist', 'shocking', 'unbelievable']
    }

    const scores = {}
    const words = text.toLowerCase().split(/\s+/)

    Object.keys(emotionKeywords).forEach(emotion => {
      scores[emotion] = emotionKeywords[emotion].reduce((count, keyword) => {
        return count + words.filter(word => word.includes(keyword)).length
      }, 0) / words.length
    })

    return scores
  }

  getEmotionDescription(emotion, episode, totalEpisodes, seriesName = '') {
    const descriptions = {
      curiosity: `Episode ${episode}: Building intrigue and establishing mysteries in ${seriesName}`,
      anxiety: `Episode ${episode}: Tension escalates as conflicts intensify`,
      excitement: `Episode ${episode}: High-energy moments and engaging developments`,
      sadness: `Episode ${episode}: Emotional depth and character struggles`,
      shock: `Episode ${episode}: Unexpected revelations and plot twists`,
      satisfaction: `Episode ${episode}: Resolution and character growth`,
      anger: `Episode ${episode}: Conflict reaches peak intensity`
    }
    return descriptions[emotion] || `Episode ${episode}: ${emotion} dominates the narrative`
  }

  // Generate explainable recommendations
  generateExplainableRecommendations(userProfile, seriesData, allSeries) {
    const recommendations = []
    
    // Analyze user preferences from their viewing history
    const userPreferences = this.analyzeUserPreferences(userProfile)
    
    allSeries.forEach(series => {
      const matchScore = this.calculateMatchScore(userPreferences, series)
      if (matchScore > 0.6) {
        recommendations.push({
          series,
          matchScore,
          explanation: this.generateRecommendationExplanation(userPreferences, series, matchScore)
        })
      }
    })

    return recommendations
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5)
  }

  analyzeUserPreferences(userProfile) {
    // Simulate user preference analysis
    return {
      preferredGenres: ['thriller', 'drama'],
      preferredEmotions: ['curiosity', 'anxiety'],
      preferredPacing: 'moderate',
      preferredLength: 'series',
      emotionalTolerance: 0.7
    }
  }

  calculateMatchScore(userPrefs, series) {
    let score = 0.5 // Base score
    
    // Genre matching — guard against missing/non-object genres
    const seriesGenres = (series.genres || []).map(g => 
      (typeof g === 'string' ? g : g?.name || '').toLowerCase()
    )
    const genreMatch = userPrefs.preferredGenres.some(pref => 
      seriesGenres.some(genre => genre.includes(pref))
    )
    if (genreMatch) score += 0.3

    // Rating consideration
    if ((series.vote_average || 0) >= 7) score += 0.2

    return Math.min(score, 1)
  }

  generateRecommendationExplanation(userPrefs, series, score) {
    const reasons = []
    
    const seriesGenres = (series.genres || []).map(g => g.name.toLowerCase())
    const matchingGenres = userPrefs.preferredGenres.filter(pref => 
      seriesGenres.some(genre => genre.includes(pref))
    )

    if (matchingGenres.length > 0) {
      reasons.push(`Matches your preference for ${matchingGenres.join(' and ')} content`)
    }

    if (series.vote_average >= 8) {
      reasons.push('Highly rated by critics and audiences')
    }

    if (userPrefs.preferredEmotions.includes('curiosity')) {
      reasons.push('Features intriguing plot development that builds suspense')
    }

    return reasons.length > 0 
      ? reasons.join('. ') + '.'
      : 'Recommended based on your viewing patterns and preferences.'
  }

}

module.exports = new AIInsightService()