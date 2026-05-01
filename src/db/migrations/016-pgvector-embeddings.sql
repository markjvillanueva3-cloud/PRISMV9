-- ============================================================================
-- Migration 016: pgvector Extension + Embedding Tables — INFRA-2-1 U-VEC1
-- ============================================================================
-- Adds vector search capability for semantic search across tools, tips,
-- materials, and strategies. Uses pgvector extension with IVFFlat indexing.
-- Falls back gracefully when pgvector extension is not available.
-- ============================================================================

-- Enable pgvector extension (requires superuser or CREATE EXTENSION privilege)
-- Wrapped in DO block to handle gracefully when not available
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
  RAISE NOTICE 'pgvector extension enabled';
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'pgvector extension not available: %. Semantic search will use text fallback.', SQLERRM;
END
$$;

-- ── Tool Embeddings (95K+ tools) ──
CREATE TABLE IF NOT EXISTS tool_embeddings (
  id SERIAL PRIMARY KEY,
  tool_id VARCHAR(200) NOT NULL,
  tool_name VARCHAR(500) NOT NULL,
  description TEXT,
  embedding vector(768),  -- all-mpnet-base-v2 output dimension
  metadata JSONB DEFAULT '{}',
  embedded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  model_version VARCHAR(50) NOT NULL DEFAULT 'all-mpnet-base-v2',
  UNIQUE(tool_id, model_version)
);

-- ── Tip Embeddings (3,700+ tribal knowledge tips) ──
CREATE TABLE IF NOT EXISTS tip_embeddings (
  id SERIAL PRIMARY KEY,
  tip_id VARCHAR(200) NOT NULL,
  tip_text TEXT NOT NULL,
  category VARCHAR(100),
  embedding vector(768),
  metadata JSONB DEFAULT '{}',
  embedded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  model_version VARCHAR(50) NOT NULL DEFAULT 'all-mpnet-base-v2',
  UNIQUE(tip_id, model_version)
);

-- ── Material Embeddings (2,957 materials) ──
CREATE TABLE IF NOT EXISTS material_embeddings (
  id SERIAL PRIMARY KEY,
  material_key VARCHAR(200) NOT NULL,
  material_name VARCHAR(500) NOT NULL,
  description TEXT,
  embedding vector(768),
  metadata JSONB DEFAULT '{}',
  embedded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  model_version VARCHAR(50) NOT NULL DEFAULT 'all-mpnet-base-v2',
  UNIQUE(material_key, model_version)
);

-- ── Strategy Embeddings (762 toolpath strategies) ──
CREATE TABLE IF NOT EXISTS strategy_embeddings (
  id SERIAL PRIMARY KEY,
  strategy_id VARCHAR(200) NOT NULL,
  strategy_name VARCHAR(500) NOT NULL,
  description TEXT,
  embedding vector(768),
  metadata JSONB DEFAULT '{}',
  embedded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  model_version VARCHAR(50) NOT NULL DEFAULT 'all-mpnet-base-v2',
  UNIQUE(strategy_id, model_version)
);

-- ── IVFFlat Indexes (300 lists for ~100K records) ──
-- Only created if pgvector extension is available
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_tool_embeddings_ivfflat
    ON tool_embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 300);

  CREATE INDEX IF NOT EXISTS idx_tip_embeddings_ivfflat
    ON tip_embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

  CREATE INDEX IF NOT EXISTS idx_material_embeddings_ivfflat
    ON material_embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

  CREATE INDEX IF NOT EXISTS idx_strategy_embeddings_ivfflat
    ON strategy_embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

  RAISE NOTICE 'IVFFlat vector indexes created';
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Vector indexes not created: %. Will use sequential scan.', SQLERRM;
END
$$;

-- ── Text fallback indexes (for when pgvector unavailable) ──
CREATE INDEX IF NOT EXISTS idx_tool_embeddings_name_trgm
  ON tool_embeddings USING gin (tool_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tip_embeddings_text_trgm
  ON tip_embeddings USING gin (tip_text gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_material_embeddings_name_trgm
  ON material_embeddings USING gin (material_name gin_trgm_ops);

-- ── Hybrid search function ──
-- Combines vector similarity (cosine) with text similarity (trigram)
-- Weight: 0.6 × vector_rank + 0.4 × trgm_rank
CREATE OR REPLACE FUNCTION hybrid_search_tips(
  query_embedding vector(768),
  query_text TEXT,
  result_limit INT DEFAULT 10
)
RETURNS TABLE(
  tip_id VARCHAR,
  tip_text TEXT,
  category VARCHAR,
  vector_score FLOAT,
  text_score FLOAT,
  combined_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    te.tip_id,
    te.tip_text,
    te.category,
    (1 - (te.embedding <=> query_embedding))::FLOAT as vector_score,
    COALESCE(similarity(te.tip_text, query_text), 0)::FLOAT as text_score,
    (0.6 * (1 - (te.embedding <=> query_embedding)) + 0.4 * COALESCE(similarity(te.tip_text, query_text), 0))::FLOAT as combined_score
  FROM tip_embeddings te
  WHERE te.embedding IS NOT NULL
  ORDER BY combined_score DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- ── Embedding stats view ──
CREATE OR REPLACE VIEW embedding_stats AS
SELECT
  'tools' as entity_type,
  COUNT(*) as total,
  COUNT(embedding) as embedded,
  COUNT(*) - COUNT(embedding) as pending,
  MAX(embedded_at) as last_embedded
FROM tool_embeddings
UNION ALL
SELECT
  'tips', COUNT(*), COUNT(embedding), COUNT(*) - COUNT(embedding), MAX(embedded_at)
FROM tip_embeddings
UNION ALL
SELECT
  'materials', COUNT(*), COUNT(embedding), COUNT(*) - COUNT(embedding), MAX(embedded_at)
FROM material_embeddings
UNION ALL
SELECT
  'strategies', COUNT(*), COUNT(embedding), COUNT(*) - COUNT(embedding), MAX(embedded_at)
FROM strategy_embeddings;
