const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { generateEmbedding, cosineSimilarity } = require('./embeddings');
const { chunkDocument } = require('./chunker');

/**
 * PostgreSQL Vector Store & RAG Document Engine
 * Stores documents, chunks, and numerical vector embeddings in PostgreSQL.
 * Computes vector similarity natively via PostgreSQL SQL.
 */

/**
 * Ingest and index a campus document into PostgreSQL.
 */
async function ingestDocument({ title, category, sourceFile, rawText }) {
  const docId = `doc-${uuidv4().slice(0, 8)}`;
  const logId = `ing-${uuidv4().slice(0, 8)}`;

  try {
    // 1. Chunk document text using semantic sliding window
    const rawChunks = chunkDocument(rawText);

    // 2. Insert document record into PostgreSQL
    await db.query(`
      INSERT INTO rag_documents (id, title, category, source_file, raw_text, chunk_count, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'INDEXED')
    `, [docId, title, category, sourceFile, rawText, rawChunks.length]);

    // 3. Pre-generate embeddings for all chunks
    const chunkRecords = [];
    for (let i = 0; i < rawChunks.length; i++) {
      const chunk = rawChunks[i];
      const embedding = await generateEmbedding(chunk.content);
      chunkRecords.push({
        id: `chk-${uuidv4().slice(0, 8)}`,
        docId,
        chunkIndex: i,
        content: chunk.content,
        tokenCount: chunk.tokenCount,
        sectionTitle: chunk.sectionTitle || 'General',
        embedding
      });
    }

    // 4. Batch insert chunks into PostgreSQL
    for (const chk of chunkRecords) {
      await db.query(`
        INSERT INTO rag_document_chunks (id, doc_id, chunk_index, content, token_count, section_title, embedding)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [chk.id, chk.docId, chk.chunkIndex, chk.content, chk.tokenCount, chk.sectionTitle, chk.embedding]);
    }

    // 5. Log successful ingestion into PostgreSQL
    await db.query(`
      INSERT INTO rag_ingestion_logs (id, doc_id, filename, status, chunks_created)
      VALUES ($1, $2, $3, 'SUCCESS', $4)
    `, [logId, docId, sourceFile, rawChunks.length]);

    return {
      docId,
      title,
      chunksCount: rawChunks.length,
      status: 'INDEXED'
    };
  } catch (err) {
    // Log failure
    await db.query(`
      INSERT INTO rag_ingestion_logs (id, doc_id, filename, status, error_message)
      VALUES ($1, $2, $3, 'FAILED', $4)
    `, [logId, docId, sourceFile, err.message]).catch(() => {});
    throw err;
  }
}

/**
 * Searches for relevant document chunks in PostgreSQL using Cosine Similarity.
 */
async function searchSimilarChunks(queryText, topK = 4, threshold = 0.15) {
  // 1. Generate embedding for user query
  const queryVec = await generateEmbedding(queryText);

  // 2. Query PostgreSQL with native cosine_similarity function
  const sql = `
    SELECT 
      c.id,
      c.doc_id as "docId",
      c.chunk_index as "chunkIndex",
      c.content,
      c.token_count as "tokenCount",
      c.section_title as "sectionTitle",
      d.title as "docTitle",
      d.category,
      d.source_file as "sourceFile",
      cosine_similarity(c.embedding, $1) as score
    FROM rag_document_chunks c
    JOIN rag_documents d ON c.doc_id = d.id
    WHERE d.status = 'INDEXED' AND cosine_similarity(c.embedding, $1) >= $2
    ORDER BY score DESC
    LIMIT $3;
  `;

  const results = await db.all(sql, [queryVec, threshold, topK]);

  return results.map(row => ({
    ...row,
    score: parseFloat(row.score)
  }));
}

/**
 * Deletes a document and its chunks from PostgreSQL.
 */
async function deleteDocumentById(docId) {
  const doc = await db.get('SELECT * FROM rag_documents WHERE id = $1', [docId]);
  if (!doc) return false;

  await db.query('DELETE FROM rag_documents WHERE id = $1', [docId]);
  return true;
}

/**
 * Re-indexes a document in PostgreSQL.
 */
async function reindexDocumentById(docId) {
  const doc = await db.get('SELECT * FROM rag_documents WHERE id = $1', [docId]);
  if (!doc) {
    throw new Error('Document not found');
  }

  // Delete existing chunks
  await db.query('DELETE FROM rag_document_chunks WHERE doc_id = $1', [docId]);

  // Re-chunk and re-embed
  const rawChunks = chunkDocument(doc.raw_text);
  for (let i = 0; i < rawChunks.length; i++) {
    const chunk = rawChunks[i];
    const embedding = await generateEmbedding(chunk.content);
    await db.query(`
      INSERT INTO rag_document_chunks (id, doc_id, chunk_index, content, token_count, section_title, embedding)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      `chk-${uuidv4().slice(0, 8)}`,
      docId,
      i,
      chunk.content,
      chunk.tokenCount,
      chunk.sectionTitle || 'General',
      embedding
    ]);
  }

  await db.query('UPDATE rag_documents SET chunk_count = $1 WHERE id = $2', [rawChunks.length, docId]);
  return { docId, chunksCount: rawChunks.length };
}

/**
 * Lists all documents in PostgreSQL.
 */
async function listDocuments() {
  return db.all(`
    SELECT id, title, category, source_file, chunk_count, status, created_at
    FROM rag_documents
    ORDER BY created_at DESC
  `);
}

/**
 * Retrieves aggregate statistics for the RAG knowledge base.
 */
async function getRagStats() {
  const docCountRes = await db.get('SELECT COUNT(*) as count FROM rag_documents');
  const chunkCountRes = await db.get('SELECT COUNT(*) as count FROM rag_document_chunks');
  const logsCountRes = await db.get('SELECT COUNT(*) as count FROM rag_ingestion_logs');

  return {
    totalDocuments: parseInt(docCountRes.count, 10),
    totalChunks: parseInt(chunkCountRes.count, 10),
    totalIngestions: parseInt(logsCountRes.count, 10),
    storageEngine: 'PostgreSQL (pgvector / Native Array Vectors)',
    status: 'ACTIVE'
  };
}

module.exports = {
  ingestDocument,
  searchSimilarChunks,
  deleteDocumentById,
  reindexDocumentById,
  listDocuments,
  getRagStats
};
