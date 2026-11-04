const fs = require('fs');
const pdfParse = require('pdf-parse');
const db = require('../db');
const { searchSimilarChunks, ingestDocument, listDocuments, getRagStats, deleteDocumentById, reindexDocumentById } = require('../rag/vectorStore');
const { generateRAGResponse } = require('../rag/llm');
const { logAudit } = require('../services/auditService');

/**
 * Hybrid Query Processor:
 * Combines policy retrieval (RAG) with real-time transactional database queries
 * when user asks about their personal pass status or records.
 */
async function queryAssistant(req, res) {
  const startTime = Date.now();
  try {
    const { question } = req.body;
    const userId = req.user?.id;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Question is required.' });
    }

    const cleanQ = question.trim();
    const lowerQ = cleanQ.toLowerCase();

    // Check if query is asking about transactional pass status
    const isTransactionalQuery = lowerQ.includes('my pass') || 
                                 lowerQ.includes('pass status') || 
                                 lowerQ.includes('current pass') || 
                                 lowerQ.includes('did my pass') ||
                                 lowerQ.includes('active pass') ||
                                 lowerQ.includes('my request');

    let transactionalData = null;
    let liveStatusPrefix = '';

    if (isTransactionalQuery && userId) {
      const userPasses = await db.all(`
        SELECT pass_number, pass_type, destination, valid_from, valid_to, status, approval_notes, created_at
        FROM digital_passes
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 3
      `, [userId]);

      if (userPasses.length > 0) {
        transactionalData = userPasses;
        const latest = userPasses[0];
        liveStatusPrefix = `📋 **Live Pass Status (Verified via Database)**:\n` +
          `• Pass ID: \`${latest.pass_number}\`\n` +
          `• Type: **${latest.pass_type.replace('_', ' ')}**\n` +
          `• Destination: **${latest.destination}**\n` +
          `• Status: **${latest.status}**\n` +
          `• Valid Until: ${new Date(latest.valid_to).toLocaleString()}\n` +
          (latest.approval_notes ? `• Mentor Remark: "${latest.approval_notes}"\n\n` : '\n');
      } else {
        liveStatusPrefix = `📋 **Live Pass Status**: You currently have no digital campus pass requests in the database.\n\n`;
      }
    }

    // 1. Vector Search for relevant authorized campus document chunks in PostgreSQL
    const relevantChunks = await searchSimilarChunks(cleanQ, 4, 0.12);

    // 2. Synthesize policy answer with prompt injection protection & strict credentials check
    const ragResult = await generateRAGResponse(cleanQ, relevantChunks);

    const fullAnswer = liveStatusPrefix 
      ? `${liveStatusPrefix}📚 **Official Campus Policy Reference**:\n${ragResult.answer}`
      : ragResult.answer;

    const responseTimeMs = Date.now() - startTime;

    res.json({
      question: cleanQ,
      answer: fullAnswer,
      sources: ragResult.sources,
      confidence: ragResult.confidence,
      chunksRetrieved: relevantChunks.length,
      transactionalData,
      responseTimeMs,
      configured: ragResult.configured !== false,
      error: ragResult.error || null
    });
  } catch (err) {
    console.error('RAG query error:', err);
    res.status(500).json({ error: 'Failed to process RAG query.' });
  }
}

async function ingestCampusDocument(req, res) {
  try {
    const { title, category, raw_text } = req.body;
    let documentText = raw_text;
    let sourceFileName = 'direct_input.txt';

    // Handle uploaded file if present
    if (req.file) {
      sourceFileName = req.file.originalname;
      const buffer = fs.readFileSync(req.file.path);

      if (req.file.mimetype === 'application/pdf' || req.file.originalname.endsWith('.pdf')) {
        const parsed = await pdfParse(buffer);
        documentText = parsed.text;
      } else {
        documentText = buffer.toString('utf-8');
      }

      fs.unlinkSync(req.file.path);
    }

    if (!title || !documentText || !documentText.trim()) {
      return res.status(400).json({ error: 'Document title and text (or valid uploaded file) are required.' });
    }

    const docCategory = category || 'CAMPUS_POLICY';

    const result = await ingestDocument({
      title: title.trim(),
      category: docCategory,
      sourceFile: sourceFileName,
      rawText: documentText.trim()
    });

    await logAudit({
      actorId: req.user?.id || null,
      action: 'RAG_DOCUMENT_INGESTED',
      entityType: 'RAG_DOC',
      entityId: result.docId,
      details: { title, chunkCount: result.chunksCount, category: docCategory },
      ipAddress: req.ip
    });

    res.status(201).json({
      message: 'Document successfully ingested and indexed into PostgreSQL RAG Vector Store.',
      document: result
    });
  } catch (err) {
    console.error('Document ingestion error:', err);
    res.status(500).json({ error: 'Internal server error ingesting document.' });
  }
}

async function getIngestedDocuments(req, res) {
  try {
    const documents = await listDocuments();
    res.json({ documents });
  } catch (err) {
    console.error('List documents error:', err);
    res.status(500).json({ error: 'Failed to fetch ingested documents.' });
  }
}

async function getStats(req, res) {
  try {
    const stats = await getRagStats();
    const hasApiKey = !!(process.env.GEMINI_API_KEY || process.env.AI_API_KEY);
    res.json({
      ...stats,
      provider: hasApiKey ? 'Google Gemini 2.5 Flash' : 'Direct Grounded Retrieval (API Key Not Configured)',
      hasApiKey
    });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: 'Failed to fetch RAG stats.' });
  }
}

async function deleteDocument(req, res) {
  try {
    const { id } = req.params;
    await deleteDocumentById(id);

    await logAudit({
      actorId: req.user.id,
      action: 'RAG_DOCUMENT_DELETED',
      entityType: 'RAG_DOC',
      entityId: id,
      details: 'Document removed from PostgreSQL vector knowledge base',
      ipAddress: req.ip
    });

    res.json({ message: 'Document and its vector embeddings deleted successfully from PostgreSQL.' });
  } catch (err) {
    console.error('Delete document error:', err);
    res.status(500).json({ error: 'Failed to delete document.' });
  }
}

async function reindexDocument(req, res) {
  try {
    const { id } = req.params;
    const result = await reindexDocumentById(id);

    if (!result) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    await logAudit({
      actorId: req.user.id,
      action: 'RAG_DOCUMENT_REINDEXED',
      entityType: 'RAG_DOC',
      entityId: id,
      details: { docId: result.docId, chunkCount: result.chunksCount },
      ipAddress: req.ip
    });

    res.json({ message: 'Document re-indexed successfully in PostgreSQL.', document: result });
  } catch (err) {
    console.error('Reindex error:', err);
    res.status(500).json({ error: 'Failed to re-index document.' });
  }
}

module.exports = {
  queryAssistant,
  ingestCampusDocument,
  getIngestedDocuments,
  getStats,
  deleteDocument,
  reindexDocument
};
