class DataProcessor {
  // Clean and normalize text data
  static cleanText(text) {
    if (!text) return ''
    
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')  // Remove special characters
      .replace(/\s+/g, ' ')      // Normalize whitespace
      .trim()
  }

  // Validate series data
  static validateSeriesData(data) {
    const required = ['title', 'description', 'genre']
    const missing = required.filter(field => !data[field])
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`)
    }
    
    return true
  }

  // Normalize rating to 0-1 scale
  static normalizeRating(rating, scale = 10) {
    return Math.max(0, Math.min(1, rating / scale))
  }

  // Extract metadata from raw series data
  static extractMetadata(rawData) {
    return {
      title: rawData.title?.trim(),
      description: this.cleanText(rawData.description),
      genre: Array.isArray(rawData.genre) ? rawData.genre : [rawData.genre],
      releaseYear: parseInt(rawData.releaseYear) || new Date().getFullYear(),
      rating: {
        imdb: this.normalizeRating(rawData.imdbRating || 0),
        audience: this.normalizeRating(rawData.audienceRating || 0)
      }
    }
  }

  // Batch process reviews
  static processReviews(reviews) {
    return reviews.map(review => ({
      ...review,
      text: this.cleanText(review.text),
      rating: Math.max(1, Math.min(5, review.rating)),
      processedAt: new Date()
    }))
  }
}

module.exports = DataProcessor