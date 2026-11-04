/**
 * Embeddings module: Generates numerical vector embeddings for text chunks and queries.
 * Supports Gemini embedding models when GEMINI_API_KEY is present,
 * with a high-dimensional normalized semantic vectorizer for zero-latency local execution.
 */

const { GoogleGenAI } = require('@google/genai');

const VECTOR_DIMENSION = 64;

// Stopwords for filtering noise in semantic space
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'because', 'as', 'what',
  'which', 'this', 'that', 'these', 'those', 'then', 'just', 'so', 'than',
  'such', 'both', 'through', 'about', 'for', 'is', 'of', 'while', 'during',
  'to', 'from', 'in', 'out', 'on', 'off', 'again', 'further', 'then', 'once',
  'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each'
]);

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * High-dimensional normalized semantic vectorizer.
 * Maps n-grams, keywords, and structural tokens into a unit sphere vector (L2 norm = 1.0).
 */
function localSemanticEmbedding(text) {
  const vector = new Array(VECTOR_DIMENSION).fill(0);
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOPWORDS.has(w));

  if (words.length === 0) {
    return vector;
  }

  // Unigrams and Bigrams for phrase sensitivity (e.g. "gate pass", "visitor entry")
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const weight = word.length > 5 ? 1.5 : 1.0;
    const bucket = hashString(word) % VECTOR_DIMENSION;
    vector[bucket] += weight;

    // Bigram
    if (i < words.length - 1) {
      const bigram = `${word}_${words[i + 1]}`;
      const biBucket = hashString(bigram) % VECTOR_DIMENSION;
      vector[biBucket] += 2.0; // Higher weight for matching exact phrases
    }
  }

  // L2 normalization: vector / sqrt(sum(v^2))
  let sumSq = 0;
  for (let i = 0; i < VECTOR_DIMENSION; i++) {
    sumSq += vector[i] * vector[i];
  }

  const norm = Math.sqrt(sumSq);
  if (norm > 0) {
    for (let i = 0; i < VECTOR_DIMENSION; i++) {
      vector[i] = parseFloat((vector[i] / norm).toFixed(6));
    }
  }

  return vector;
}

/**
 * Generate embedding for a text chunk or query.
 */
async function generateEmbedding(text) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.embedContent({
        model: 'gemini-embedding-001',
        contents: text
      });
      if (response && response.embedding && response.embedding.values) {
        return response.embedding.values;
      }
    } catch (err) {
      console.warn('Gemini embedding API failed, falling back to local semantic vectorizer:', err.message);
    }
  }

  return localSemanticEmbedding(text);
}

/**
 * Compute Cosine Similarity between two vectors:
 * cos(theta) = (A . B) / (||A|| * ||B||)
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

module.exports = {
  generateEmbedding,
  localSemanticEmbedding,
  cosineSimilarity,
  VECTOR_DIMENSION
};
