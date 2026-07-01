-- ============================================================================
-- Migration 017: ML Feature Store — INFRA-9-1 U-ML2
-- ============================================================================
-- Feature store tables for ML model training and serving.
-- Tracks feature sets, computed values, and lineage.
-- ============================================================================

-- ── Feature Set Definitions ──
CREATE TABLE IF NOT EXISTS feature_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL UNIQUE,
  description TEXT,
  features TEXT[] NOT NULL DEFAULT '{}',
  source_table VARCHAR(200) NOT NULL,
  transform_query TEXT,
  model_versions TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Feature Values (materialized feature vectors) ──
CREATE TABLE IF NOT EXISTS feature_values (
  id BIGSERIAL PRIMARY KEY,
  feature_set_id UUID NOT NULL REFERENCES feature_sets(id) ON DELETE CASCADE,
  entity_id VARCHAR(200) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  features JSONB NOT NULL DEFAULT '{}',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INT NOT NULL DEFAULT 1
);

-- ── Feature Lineage ──
CREATE TABLE IF NOT EXISTS feature_lineage (
  id SERIAL PRIMARY KEY,
  feature_set_id UUID NOT NULL REFERENCES feature_sets(id) ON DELETE CASCADE,
  model_id VARCHAR(200) NOT NULL,
  model_version VARCHAR(50) NOT NULL,
  training_rows INT NOT NULL DEFAULT 0,
  training_started_at TIMESTAMPTZ,
  training_completed_at TIMESTAMPTZ,
  metrics JSONB DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'training', 'completed', 'failed'))
);

-- ── Model Versions ──
CREATE TABLE IF NOT EXISTS model_versions (
  id SERIAL PRIMARY KEY,
  model_id VARCHAR(200) NOT NULL,
  version VARCHAR(50) NOT NULL,
  format VARCHAR(20) NOT NULL DEFAULT 'onnx'
    CHECK (format IN ('onnx', 'tensorflow', 'pytorch', 'custom')),
  model_type VARCHAR(50) NOT NULL
    CHECK (model_type IN ('cycle_time', 'tool_life', 'surface_finish', 'cutting_force', 'custom')),
  path TEXT,
  url TEXT,
  input_schema JSONB NOT NULL DEFAULT '{}',
  output_schema JSONB NOT NULL DEFAULT '{}',
  metrics JSONB DEFAULT '{}',
  ab_traffic_pct NUMERIC(5,2) DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'registered'
    CHECK (status IN ('registered', 'loading', 'ready', 'deprecated', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(model_id, version)
);

-- ── Retraining Triggers ──
CREATE TABLE IF NOT EXISTS retraining_triggers (
  id SERIAL PRIMARY KEY,
  model_id VARCHAR(200) NOT NULL,
  threshold INT NOT NULL DEFAULT 1000,
  last_count INT NOT NULL DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  auto_retrain BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feature_values_entity
  ON feature_values (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_feature_values_set
  ON feature_values (feature_set_id);
CREATE INDEX IF NOT EXISTS idx_feature_lineage_model
  ON feature_lineage (model_id, model_version);
CREATE INDEX IF NOT EXISTS idx_model_versions_status
  ON model_versions (status)
  WHERE status = 'ready';

-- View: training data export summary
CREATE OR REPLACE VIEW training_data_summary AS
SELECT
  fs.name as feature_set,
  mv.model_id,
  mv.version as model_version,
  fl.training_rows,
  fl.status as training_status,
  COUNT(fv.id) as available_rows,
  MAX(fv.computed_at) as latest_features
FROM feature_sets fs
LEFT JOIN feature_lineage fl ON fl.feature_set_id = fs.id
LEFT JOIN model_versions mv ON mv.model_id = fl.model_id AND mv.version = fl.model_version
LEFT JOIN feature_values fv ON fv.feature_set_id = fs.id
GROUP BY fs.name, mv.model_id, mv.version, fl.training_rows, fl.status;
