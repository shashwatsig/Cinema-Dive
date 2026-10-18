const { env, pipeline } = require('@xenova/transformers')

// Set cache directory
env.cacheDir = './models_cache'

class EmbeddingService {
  constructor() {
    this.modelName = 'Xenova/all-MiniLM-L6-v2'
    this.extractor = null
    this.isInitialized = false
  }

  // Initialize model on first use
  async initialize() {
    if (this.isInitialized) return

    try {
      console.log('Initializing embedding model: Xenova/all-MiniLM-L6-v2...')
      
      // Load feature extraction pipeline
      this.extractor = await pipeline('feature-extraction', this.modelName, {
        quantized: true, // Use quantized version for faster inference
      })
      
      this.isInitialized = true
      console.log('✓ Embedding model initialized successfully')
    } catch (error) {
      console.error('Failed to initialize embedding model:', error.message)
      throw error
    }
  }

  // Generate embedding for a single text
  async generateEmbedding(text) {
    if (!this.isInitialized) {
      await this.initialize()
    }

    try {
      if (!text || typeof text !== 'string') {
        throw new Error('Text must be a non-empty string')
      }

      // Generate embedding with mean pooling and normalization
      const output = await this.extractor(text, {
        pooling: 'mean',
        normalize: true
      })

      // Convert to a flat JavaScript array
      const list = output.tolist()
      return list[0]
    } catch (error) {
      console.error('Error generating embedding:', error.message)
      throw error
    }
  }

  // Generate embeddings for multiple texts
  async generateEmbeddings(texts) {
    if (!Array.isArray(texts)) {
      throw new Error('Texts must be an array')
    }

    if (!this.isInitialized) {
      await this.initialize()
    }

    try {
      if (texts.length === 0) return []

      // Generate batch embeddings with mean pooling and normalization
      const output = await this.extractor(texts, {
        pooling: 'mean',
        normalize: true
      })

      // Convert to a nested JavaScript array
      return output.tolist()
    } catch (error) {
      console.error('Error generating batch embeddings:', error.message)
      throw error
    }
  }

  // Helper method kept for backward compatibility (retries)
  async generateEmbeddingWithRetry(text, maxRetries = 3) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.generateEmbedding(text)
      } catch (error) {
        console.warn(`Embedding attempt ${attempt + 1} failed:`, error.message)
        if (attempt === maxRetries - 1) throw error
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
      }
    }
  }
}

// Singleton instance
let embeddingServiceInstance = null

const getEmbeddingService = async () => {
  if (!embeddingServiceInstance) {
    embeddingServiceInstance = new EmbeddingService()
    await embeddingServiceInstance.initialize()
  }
  return embeddingServiceInstance
}

module.exports = {
  getEmbeddingService,
  EmbeddingService
}
