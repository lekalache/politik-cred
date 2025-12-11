/**
 * Test Hugging Face API to verify correct endpoint and format
 */

import { HuggingFaceClient } from '../src/lib/ai/huggingface-client'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

async function testHuggingFace() {
  console.log('🧪 Testing Hugging Face API\n')
  console.log('='.repeat(60))

  const client = new HuggingFaceClient()

  if (!client.isAvailable()) {
    console.error('❌ Hugging Face API not available')
    console.error('Check HUGGINGFACE_API_KEY in .env.local')
    process.exit(1)
  }

  console.log('✅ API key found\n')

  // Test 1: Get embeddings
  console.log('Test 1: Getting embeddings for sample texts...')
  try {
    const texts = [
      'Je promets de baisser les impôts',
      'Réduire la fiscalité des ménages'
    ]

    const embeddings = await client.getEmbeddings(texts)
    console.log(`✅ Got ${embeddings.length} embeddings`)
    console.log(`   Embedding dimensions: ${embeddings[0].length}`)
  } catch (error) {
    console.error('❌ Embeddings test failed:', error instanceof Error ? error.message : error)
  }

  console.log()

  // Test 2: Calculate similarity
  console.log('Test 2: Calculating similarity between two texts...')
  try {
    const text1 = 'Je vais augmenter le pouvoir d\'achat'
    const text2 = 'Augmentation du salaire minimum'

    const similarity = await client.calculateSimilarity(text1, text2)
    console.log(`✅ Similarity: ${(similarity * 100).toFixed(2)}%`)
  } catch (error) {
    console.error('❌ Similarity test failed:', error instanceof Error ? error.message : error)
  }

  console.log()

  // Test 3: Batch similarities
  console.log('Test 3: Batch calculating similarities...')
  try {
    const source = 'Promesse sur l\'environnement'
    const candidates = [
      'Vote sur la loi climat',
      'Débat sur l\'écologie',
      'Amendement sur les énergies renouvelables'
    ]

    const similarities = await client.batchCalculateSimilarities(source, candidates)
    console.log(`✅ Got ${similarities.length} similarities:`)
    similarities.forEach((sim, i) => {
      console.log(`   ${i + 1}. ${(sim * 100).toFixed(2)}% - ${candidates[i].substring(0, 40)}...`)
    })
  } catch (error) {
    console.error('❌ Batch test failed:', error instanceof Error ? error.message : error)
  }

  console.log()
  console.log('='.repeat(60))

  const stats = client.getUsageStats()
  console.log(`\n📊 Usage Stats:`)
  console.log(`   Requests made: ${stats.requestCount}`)
  console.log(`   Remaining: ${stats.remaining}`)
  console.log(`   Percent used: ${stats.percentUsed.toFixed(2)}%`)
}

testHuggingFace()
  .then(() => {
    console.log('\n✅ All tests completed')
    process.exit(0)
  })
  .catch(err => {
    console.error('\n💥 Test failed:', err)
    process.exit(1)
  })
