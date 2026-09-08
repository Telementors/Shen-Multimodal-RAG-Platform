-- =============================================================================
-- Multimodal RAG — database schema
-- Executed automatically on first PostgreSQL container start.
-- =============================================================================

-- Enable the pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------------
-- Text chunks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS text_chunks (
    id          BIGSERIAL PRIMARY KEY,
    doc_id      TEXT        NOT NULL,
    page_num    INTEGER     NOT NULL,
    content     TEXT        NOT NULL,
    metadata    JSONB       DEFAULT '{}'::jsonb,
    embedding   vector(768),
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_text_chunks_doc_id
    ON text_chunks (doc_id);

CREATE INDEX IF NOT EXISTS idx_text_chunks_embedding
    ON text_chunks USING hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- Table chunks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS table_chunks (
    id          BIGSERIAL PRIMARY KEY,
    doc_id      TEXT        NOT NULL,
    page_num    INTEGER     NOT NULL,
    content     TEXT        NOT NULL,
    metadata    JSONB       DEFAULT '{}'::jsonb,
    embedding   vector(768),
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_table_chunks_doc_id
    ON table_chunks (doc_id);

CREATE INDEX IF NOT EXISTS idx_table_chunks_embedding
    ON table_chunks USING hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- Image chunks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS image_chunks (
    id          BIGSERIAL PRIMARY KEY,
    doc_id      TEXT        NOT NULL,
    page_num    INTEGER     NOT NULL,
    content     TEXT        NOT NULL,
    metadata    JSONB       DEFAULT '{}'::jsonb,
    embedding   vector(768),
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_image_chunks_doc_id
    ON image_chunks (doc_id);

CREATE INDEX IF NOT EXISTS idx_image_chunks_embedding
    ON image_chunks USING hnsw (embedding vector_cosine_ops);
