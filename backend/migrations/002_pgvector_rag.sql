-- ============================================================
-- PostgreSQL Migration: 002_pgvector_rag.sql
-- RAG Knowledge & Vector Embeddings Schema for PostgreSQL
-- ============================================================

-- Attempt to create pgvector extension if available
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'pgvector C-extension not available in this environment. Using native PostgreSQL vector arithmetic.';
END $$;

-- 1. RAG Knowledge Documents Table
CREATE TABLE IF NOT EXISTS rag_documents (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    source_file VARCHAR(255) NOT NULL,
    raw_text TEXT NOT NULL,
    chunk_count INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'INDEXED' CHECK(status IN ('PENDING', 'INDEXED', 'FAILED', 'DEACTIVATED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. RAG Document Chunks & Vector Embeddings Table
CREATE TABLE IF NOT EXISTS rag_document_chunks (
    id VARCHAR(36) PRIMARY KEY,
    doc_id VARCHAR(36) NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    token_count INT NOT NULL,
    section_title VARCHAR(150),
    embedding DOUBLE PRECISION[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. RAG Ingestion & Audit Logs Table
CREATE TABLE IF NOT EXISTS rag_ingestion_logs (
    id VARCHAR(36) PRIMARY KEY,
    doc_id VARCHAR(36) REFERENCES rag_documents(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL,
    chunks_created INT DEFAULT 0,
    error_message TEXT,
    ingested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for RAG retrieval
CREATE INDEX IF NOT EXISTS idx_rag_chunks_doc_id ON rag_document_chunks(doc_id);

-- PostgreSQL Native Vector Cosine Similarity Function
CREATE OR REPLACE FUNCTION cosine_similarity(a DOUBLE PRECISION[], b DOUBLE PRECISION[])
RETURNS DOUBLE PRECISION AS $$
DECLARE
    dot_product DOUBLE PRECISION := 0;
    norm_a DOUBLE PRECISION := 0;
    norm_b DOUBLE PRECISION := 0;
    i INT;
    len INT;
BEGIN
    IF a IS NULL OR b IS NULL THEN
        RETURN 0;
    END IF;
    len := LEAST(array_length(a, 1), array_length(b, 1));
    IF len IS NULL OR len = 0 THEN
        RETURN 0;
    END IF;
    FOR i IN 1..len LOOP
        dot_product := dot_product + (a[i] * b[i]);
        norm_a := norm_a + (a[i] * a[i]);
        norm_b := norm_b + (b[i] * b[i]);
    END LOOP;
    IF norm_a = 0 OR norm_b = 0 THEN
        RETURN 0;
    END IF;
    RETURN dot_product / (sqrt(norm_a) * sqrt(norm_b));
END;
$$ LANGUAGE plpgsql IMMUTABLE;
