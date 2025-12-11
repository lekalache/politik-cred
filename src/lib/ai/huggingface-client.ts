/**
 * Hugging Face Inference API Client
 * Provides semantic embeddings for promise-action matching
 *
 * Free tier: 30,000 requests/month
 * Model: sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
 */

interface EmbeddingResponse {
  embeddings: number[][]
}

export class HuggingFaceClient {
  private apiKey: string
  private baseUrl = 'https://router.huggingface.co/hf-inference/models'
  private model = 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2'
  private requestCount = 0
  private readonly maxRequestsPerMonth = 30000

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.HUGGINGFACE_API_KEY || ''

    if (!this.apiKey) {
      console.warn('HUGGINGFACE_API_KEY not set. Semantic matching will fall back to Jaccard similarity.')
    }
  }

  /**
   * Check if Hugging Face API is available
   */
  isAvailable(): boolean {
    return !!this.apiKey && this.requestCount < this.maxRequestsPerMonth
  }

  /**
   * Get embeddings for text(s)
   * Returns 384-dimensional vectors for multilingual model
   */
  async getEmbeddings(texts: string | string[]): Promise<number[][]> {
    if (!this.isAvailable()) {
      throw new Error('Hugging Face API not available. Check API key and rate limits.')
    }

    const inputTexts = Array.isArray(texts) ? texts : [texts]

    try {
      const response = await fetch(`${this.baseUrl}/${this.model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: inputTexts,
          options: {
            wait_for_model: true
          }
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Hugging Face API error (${response.status}): ${errorText}`)
      }

      const embeddings = await response.json()
      this.requestCount += inputTexts.length

      // Handle different response formats
      if (Array.isArray(embeddings[0])) {
        return embeddings as number[][]
      } else {
        return [embeddings] as number[][]
      }
    } catch (error) {
      console.error('Error getting embeddings from Hugging Face:', error)
      throw error
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have same dimensions')
    }

    // Dot product
    let dotProduct = 0
    let magnitude1 = 0
    let magnitude2 = 0

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i]
      magnitude1 += embedding1[i] * embedding1[i]
      magnitude2 += embedding2[i] * embedding2[i]
    }

    magnitude1 = Math.sqrt(magnitude1)
    magnitude2 = Math.sqrt(magnitude2)

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0
    }

    return dotProduct / (magnitude1 * magnitude2)
  }

  /**
   * Calculate semantic similarity between two texts
   * Gets embeddings for both texts and calculates cosine similarity
   */
  async calculateSimilarity(text1: string, text2: string): Promise<number> {
    if (!this.isAvailable()) {
      throw new Error('Hugging Face API not available. Check API key and rate limits.')
    }

    try {
      // Get embeddings for both texts in a single API call
      const embeddings = await this.getEmbeddings([text1, text2])

      if (embeddings.length !== 2) {
        throw new Error('Expected 2 embeddings but got ' + embeddings.length)
      }

      // Calculate cosine similarity
      const similarity = this.cosineSimilarity(embeddings[0], embeddings[1])
      return similarity
    } catch (error) {
      console.error('Error calculating similarity with Hugging Face:', error)
      throw error
    }
  }

  /**
   * Batch calculate similarities between one text and multiple candidates
   * Gets embeddings for source and all candidates, then calculates similarities
   */
  async batchCalculateSimilarities(
    sourceText: string,
    candidateTexts: string[]
  ): Promise<number[]> {
    if (!this.isAvailable()) {
      throw new Error('Hugging Face API not available. Check API key and rate limits.')
    }

    try {
      // Get embeddings for source and all candidates in a single API call
      const allTexts = [sourceText, ...candidateTexts]
      const embeddings = await this.getEmbeddings(allTexts)

      if (embeddings.length !== allTexts.length) {
        throw new Error(`Expected ${allTexts.length} embeddings but got ${embeddings.length}`)
      }

      const sourceEmbedding = embeddings[0]
      const candidateEmbeddings = embeddings.slice(1)

      // Calculate cosine similarity for each candidate
      const similarities = candidateEmbeddings.map(candidateEmbedding =>
        this.cosineSimilarity(sourceEmbedding, candidateEmbedding)
      )

      return similarities
    } catch (error) {
      console.error('Error in batch similarity calculation:', error)
      throw error
    }
  }

  /**
   * Find best matching text from candidates
   */
  async findBestMatch(
    sourceText: string,
    candidateTexts: string[],
    minSimilarity = 0.5
  ): Promise<{ index: number; text: string; similarity: number } | null> {
    const similarities = await this.batchCalculateSimilarities(sourceText, candidateTexts)

    let bestIndex = -1
    let bestSimilarity = minSimilarity

    for (let i = 0; i < similarities.length; i++) {
      if (similarities[i] > bestSimilarity) {
        bestSimilarity = similarities[i]
        bestIndex = i
      }
    }

    if (bestIndex === -1) {
      return null
    }

    return {
      index: bestIndex,
      text: candidateTexts[bestIndex],
      similarity: bestSimilarity
    }
  }

  /**
   * Get current usage stats
   */
  getUsageStats(): { requestCount: number; remaining: number; percentUsed: number } {
    return {
      requestCount: this.requestCount,
      remaining: this.maxRequestsPerMonth - this.requestCount,
      percentUsed: (this.requestCount / this.maxRequestsPerMonth) * 100
    }
  }
}

// Export singleton instance
export const huggingfaceClient = new HuggingFaceClient()
