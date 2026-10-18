const { getEmbeddingService } = require('./embeddingService')

// Cosine similarity between two vectors
function cosineSimilarity(vecA, vecB) {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

class VectorStore {
  constructor() {
    // collections: { [name]: [ { id, text, embedding, metadata } ] }
    this.collections = {}
    this.isInitialized = false
  }

  async initialize() {
    if (this.isInitialized) return
    this.isInitialized = true
    console.log('✓ In-memory vector store initialized')
  }

  _getCollection(name) {
    if (!this.collections[name]) {
      this.collections[name] = []
    }
    return this.collections[name]
  }

  async addDocuments(collectionName, documents) {
    if (!documents || documents.length === 0) return { added: 0, failed: 0 }

    const embeddingService = await getEmbeddingService()
    const collection = this._getCollection(collectionName)

    const texts = documents.map(doc => doc.text)
    const embeddings = await embeddingService.generateEmbeddings(texts)

    let added = 0
    documents.forEach((doc, i) => {
      // Deduplicate by id
      const existingIndex = collection.findIndex(item => item.id === doc.id)
      const entry = {
        id: doc.id,
        text: doc.text,
        embedding: embeddings[i],
        metadata: {
          seriesId: doc.seriesId,
          seriesTitle: doc.seriesTitle,
          documentType: doc.documentType,
          chunkIndex: doc.chunkIndex || 0,
          timestamp: doc.timestamp || new Date().toISOString()
        }
      }
      if (existingIndex >= 0) {
        collection[existingIndex] = entry
      } else {
        collection.push(entry)
        added++
      }
    })

    console.log(`✓ Added ${added} documents to collection '${collectionName}'`)
    return { added, failed: 0 }
  }

  async search(collectionName, queryText, topK = 5, threshold = 0.3) {
    const collection = this._getCollection(collectionName)
    if (collection.length === 0) return { success: true, results: [], count: 0 }

    const embeddingService = await getEmbeddingService()
    const queryEmbedding = await embeddingService.generateEmbedding(queryText)

    const scored = collection.map(item => ({
      id: item.id,
      text: item.text,
      metadata: item.metadata,
      similarity: cosineSimilarity(queryEmbedding, item.embedding)
    }))

    const results = scored
      .filter(item => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
      .map(item => ({
        ...item,
        similarity: Math.round(item.similarity * 100) / 100,
        similarityPercent: Math.round(item.similarity * 100)
      }))

    return { success: true, results, count: results.length, threshold }
  }

  async multiSearch(collectionNames, queryText, topK = 5, threshold = 0.3) {
    const allResults = {}
    for (const name of collectionNames) {
      const res = await this.search(name, queryText, topK, threshold)
      if (res.results.length > 0) allResults[name] = res.results
    }
    return {
      success: true,
      results: allResults,
      totalCount: Object.values(allResults).reduce((sum, arr) => sum + arr.length, 0)
    }
  }

  async deleteDocuments(collectionName, documentIds) {
    const ids = Array.isArray(documentIds) ? documentIds : [documentIds]
    const collection = this._getCollection(collectionName)
    this.collections[collectionName] = collection.filter(item => !ids.includes(item.id))
  }

  async clearCollection(collectionName) {
    this.collections[collectionName] = []
    console.log(`✓ Cleared collection '${collectionName}'`)
  }

  async getCollectionStats(collectionName) {
    return {
      name: collectionName,
      documentCount: this._getCollection(collectionName).length
    }
  }
}

// Singleton
let vectorStoreInstance = null

const getVectorStore = async () => {
  if (!vectorStoreInstance) {
    vectorStoreInstance = new VectorStore()
    await vectorStoreInstance.initialize()
  }
  return vectorStoreInstance
}

module.exports = { getVectorStore, VectorStore }
