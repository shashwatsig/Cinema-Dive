const { getVectorStore } = require('./vectorStore')
const { getEmbeddingService } = require('./embeddingService')
const Series = require('../models/Series')

class EmbeddingGenerationService {
  constructor() {
    this.vectorStore = null
    this.embeddingService = null
    this.chunkSize = 500 // characters
  }

  // Initialize services
  async initialize() {
    this.vectorStore = await getVectorStore()
    this.embeddingService = await getEmbeddingService()
  }

  // Generate embeddings for a single series
  async generateSeriesEmbeddings(seriesId) {
    try {
      const series = await Series.findById(seriesId)
      if (!series) {
        throw new Error(`Series not found: ${seriesId}`)
      }

      console.log(`\n📊 Generating embeddings for: ${series.title}`)

      const documents = {
        reviews: [],
        insights: [],
        audience_profile: [],
        content_dna: [],
        series_description: []
      }

      // 1. Process reviews into chunks
      if (series.reviews && series.reviews.length > 0) {
        console.log(`   Processing ${series.reviews.length} reviews...`)
        documents.reviews = this.chunkReviews(series.reviews, series._id.toString(), series.title)
      }

      // 2. Process insights
      if (series.insights) {
        console.log('   Processing insights...')
        const insightDocs = this.processInsights(series.insights, series._id.toString(), series.title)
        documents.insights.push(...insightDocs)
      }

      // 3. Process audience profile
      if (series.insights?.audienceType) {
        console.log('   Processing audience profile...')
        const audienceDocs = this.processAudienceProfile(series, series._id.toString(), series.title)
        documents.audience_profile.push(...audienceDocs)
      }

      // 4. Process content DNA
      if (series.insights?.contentDNA) {
        console.log('   Processing content DNA...')
        const dnaDocs = this.processContentDNA(series.insights.contentDNA, series._id.toString(), series.title)
        documents.content_dna.push(...dnaDocs)
      }

      // 5. Process series description
      if (series.description) {
        console.log('   Processing series description...')
        documents.series_description.push({
          id: `series_desc_${series._id}`,
          text: series.description,
          seriesId: series._id.toString(),
          seriesTitle: series.title,
          documentType: 'series_description',
          timestamp: new Date().toISOString()
        })
      }

      // Add to vector store
      let totalChunks = 0
      for (const [docType, docs] of Object.entries(documents)) {
        if (docs.length > 0) {
          try {
            await this.vectorStore.addDocuments(`${docType}`, docs)
            totalChunks += docs.length
            console.log(`   ✓ Added ${docs.length} ${docType} chunks`)
          } catch (error) {
            console.error(`   ✗ Error adding ${docType}:`, error.message)
          }
        }
      }

      // Update Series document with embedding status
      series.embeddingStatus.isEmbedded = true
      series.embeddingStatus.embeddedAt = new Date()
      series.embeddingStatus.embeddedReviewCount = series.reviews?.length || 0
      series.embeddingStatus.embeddedInsights = !!series.insights
      series.embeddingStatus.embeddedAudienceProfile = !!series.insights?.audienceType
      series.embeddingStatus.embeddedContentDNA = !!series.insights?.contentDNA
      series.embeddingStatus.vectorStoredChunks = {
        reviews: documents.reviews.length,
        insights: documents.insights.length,
        audienceProfile: documents.audience_profile.length,
        contentDNA: documents.content_dna.length,
        description: documents.series_description.length
      }

      await series.save()

      console.log(`✓ Successfully embedded ${series.title} (${totalChunks} chunks)`)

      return {
        success: true,
        seriesTitle: series.title,
        chunksCreated: totalChunks,
        breakdown: {
          reviews: documents.reviews.length,
          insights: documents.insights.length,
          audienceProfile: documents.audience_profile.length,
          contentDNA: documents.content_dna.length,
          description: documents.series_description.length
        }
      }
    } catch (error) {
      console.error(`Error generating embeddings for series:`, error.message)
      
      // Update series with error status
      try {
        const series = await Series.findById(seriesId)
        if (series) {
          series.embeddingStatus.embeddingError = error.message
          await series.save()
        }
      } catch (updateError) {
        console.error('Error updating series status:', updateError.message)
      }

      throw error
    }
  }

  // Chunk reviews into smaller pieces
  chunkReviews(reviews, seriesId, seriesTitle) {
    const chunks = []
    let chunkIndex = 0

    reviews.forEach((review, reviewIndex) => {
      const reviewText = review.text || ''
      if (!reviewText) return

      // Split review into 500-char chunks
      for (let i = 0; i < reviewText.length; i += this.chunkSize) {
        const chunk = reviewText.substring(i, i + this.chunkSize)
        if (chunk.trim().length > 50) { // Only keep meaningful chunks
          chunks.push({
            id: `review_${seriesId}_${reviewIndex}_${chunkIndex}`,
            text: chunk,
            seriesId: seriesId,
            seriesTitle: seriesTitle,
            documentType: 'review',
            chunkIndex: chunkIndex,
            reviewIndex: reviewIndex,
            rating: review.rating,
            sentiment: review.sentiment?.score || 0,
            timestamp: review.createdAt || new Date().toISOString()
          })
          chunkIndex++
        }
      }
    })

    return chunks
  }

  // Process insights into document
  processInsights(insights, seriesId, seriesTitle) {
    const chunks = []

    // Combine all insights into a comprehensive text
    const insightText = [
      insights.whyLiked?.join(', ') || '',
      insights.whyDisliked?.join(', ') || '',
      insights.keyThemes?.join(', ') || '',
      `Audience: ${insights.audienceType || ''}`,
      `Engagement: ${insights.engagementLevel || ''}`,
      `Emotional Response: ${insights.emotionalResponse || ''}`,
      insights.emotionalJourney?.join(', ') || ''
    ].filter(text => text.length > 0).join('. ')

    if (insightText.length > 50) {
      chunks.push({
        id: `insight_${seriesId}`,
        text: insightText,
        seriesId: seriesId,
        seriesTitle: seriesTitle,
        documentType: 'insight',
        timestamp: insights.lastInsightUpdate || new Date().toISOString()
      })
    }

    return chunks
  }

  // Process audience profile
  processAudienceProfile(series, seriesId, seriesTitle) {
    const chunks = []

    const insights = series.insights || {}
    const metrics = series.metrics || {}

    const profileText = [
      `Target Audience Type: ${insights.audienceType || 'General Audience'}`,
      `Engagement Level: ${insights.engagementLevel || 'High'}`,
      `Average Rating: ${series.averageRating || 'N/A'}/10`,
      `Total Reviews: ${series.totalReviews || 0}`,
      `Sentiment Breakdown: High Positive: ${metrics.sentimentBreakdown?.highPositive || 0}%, Positive: ${metrics.sentimentBreakdown?.positive || 0}%, Neutral: ${metrics.sentimentBreakdown?.neutral || 0}%, Negative: ${metrics.sentimentBreakdown?.negative || 0}%`,
      `Top Emotions: ${metrics.topEmotions?.join(', ') || 'Not available'}`,
      `Review per Day Rate: ${metrics.engagementMetrics?.reviewsPerDay?.toFixed(2) || 'N/A'}`,
      `Audience Demographics: ${this.inferDemographics(series)}`
    ].join('. ')

    if (profileText.length > 50) {
      chunks.push({
        id: `audience_${seriesId}`,
        text: profileText,
        seriesId: seriesId,
        seriesTitle: seriesTitle,
        documentType: 'audience_profile',
        timestamp: new Date().toISOString()
      })
    }

    return chunks
  }

  // Infer audience demographics from data
  inferDemographics(series) {
    const insights = series.insights || {}
    const themes = insights.keyThemes || []
    const topTopics = series.metrics?.topTopics || []

    let demographics = []

    if (themes.includes('family') || topTopics.includes('family')) {
      demographics.push('Family-oriented audiences')
    }
    if (themes.includes('romance') || topTopics.includes('romance')) {
      demographics.push('Young adults interested in romance')
    }
    if (themes.includes('action') || themes.includes('thriller')) {
      demographics.push('Action/thriller enthusiasts')
    }
    if (themes.includes('drama') || themes.includes('emotional')) {
      demographics.push('Emotionally engaged viewers')
    }
    if (series.averageRating >= 8) {
      demographics.push('Quality-conscious viewers')
    }

    return demographics.length > 0 ? demographics.join(', ') : 'Diverse audience base'
  }

  // Process content DNA
  processContentDNA(contentDNA, seriesId, seriesTitle) {
    const chunks = []

    const dnaText = [
      `Pacing: ${contentDNA.pacing || 'Moderate'}`,
      `Complexity: ${contentDNA.complexity || 'Moderate'}`,
      `Emotional Depth: ${contentDNA.emotionalDepth || 'Moderate'}`,
      `Narrative Style: ${contentDNA.narrativeStyle || 'Linear'}`,
      `Originality: ${contentDNA.originality || 'Moderate'}`
    ].join('. ')

    if (dnaText.length > 50) {
      chunks.push({
        id: `dna_${seriesId}`,
        text: dnaText,
        seriesId: seriesId,
        seriesTitle: seriesTitle,
        documentType: 'content_dna',
        timestamp: new Date().toISOString()
      })
    }

    return chunks
  }

  // Generate embeddings for all non-embedded series (or all series to rebuild in-memory store)
  async generateAllEmbeddings() {
    try {
      console.log('\n🚀 Starting bulk embedding generation to populate in-memory store...\n')

      const nonEmbeddedSeries = await Series.find({
        'dataLoadingStatus.isLoaded': true
      }).select('_id title totalReviews')

      if (nonEmbeddedSeries.length === 0) {
        console.log('✓ All series are already embedded')
        return {
          success: true,
          totalProcessed: 0,
          message: 'All series already embedded'
        }
      }

      console.log(`Processing ${nonEmbeddedSeries.length} series...\n`)

      const results = {
        successful: [],
        failed: [],
        totalChunks: 0
      }

      for (const series of nonEmbeddedSeries) {
        try {
          const result = await this.generateSeriesEmbeddings(series._id)
          results.successful.push(result)
          results.totalChunks += result.chunksCreated
        } catch (error) {
          results.failed.push({
            seriesId: series._id,
            title: series.title,
            error: error.message
          })
        }
      }

      console.log(`\n✓ Embedding generation complete`)
      console.log(`   Successful: ${results.successful.length}`)
      console.log(`   Failed: ${results.failed.length}`)
      console.log(`   Total chunks created: ${results.totalChunks}`)

      return results
    } catch (error) {
      console.error('Error in bulk embedding generation:', error.message)
      throw error
    }
  }

  // Regenerate embeddings for a specific series (when insights change)
  async regenerateSeriesEmbeddings(seriesId) {
    try {
      console.log(`\n🔄 Regenerating embeddings for series: ${seriesId}`)

      // Clear old embeddings from all collections
      await this.clearSeriesEmbeddings(seriesId)

      // Generate new embeddings
      return await this.generateSeriesEmbeddings(seriesId)
    } catch (error) {
      console.error('Error regenerating embeddings:', error.message)
      throw error
    }
  }

  // Clear embeddings for a series
  async clearSeriesEmbeddings(seriesId) {
    try {
      const collections = [
        'reviews',
        'insights',
        'audience_profile',
        'content_dna',
        'series_description'
      ]

      for (const collection of collections) {
        try {
          // Find all documents for this series and delete them
          const docIds = []
          // This is a simplified approach - would need ChromaDB's query API for production
          await this.vectorStore.clearCollection(collection)
        } catch (error) {
          console.warn(`Error clearing collection ${collection}:`, error.message)
        }
      }
    } catch (error) {
      console.error('Error clearing series embeddings:', error.message)
    }
  }
}

// Singleton instance
let embeddingGenerationServiceInstance = null

const getEmbeddingGenerationService = async () => {
  if (!embeddingGenerationServiceInstance) {
    embeddingGenerationServiceInstance = new EmbeddingGenerationService()
    await embeddingGenerationServiceInstance.initialize()
  }
  return embeddingGenerationServiceInstance
}

module.exports = {
  getEmbeddingGenerationService,
  EmbeddingGenerationService
}
