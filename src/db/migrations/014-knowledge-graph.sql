-- INFRA-10-1 U-KG1: Knowledge graph persistence — Postgres-backed graph tables
-- Replaces in-memory + file WAL with durable relational graph storage.
-- Supports recursive CTE path queries for manufacturing knowledge traversal.

-- ============================================================================
-- GRAPH NODES
-- ============================================================================
CREATE TABLE IF NOT EXISTS graph_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_type VARCHAR(50) NOT NULL
    CHECK (node_type IN (
      'material', 'tool', 'machine', 'operation', 'strategy', 'part',
      'setup', 'fixture', 'controller', 'parameter_set', 'custom'
    )),
  external_id VARCHAR(400),               -- optional link to registry entry (e.g., material UUID)
  label VARCHAR(500) NOT NULL,            -- human-readable label
  properties JSONB NOT NULL DEFAULT '{}', -- arbitrary key-value properties
  source VARCHAR(200) DEFAULT 'system',   -- "system", "operator", "calibration", "import"
  confidence NUMERIC(5,4) DEFAULT 1.0     -- 0..1 confidence in this node
    CHECK (confidence >= 0 AND confidence <= 1),
  created_by VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gn_type ON graph_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_gn_external ON graph_nodes(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gn_label_trgm ON graph_nodes USING gin(label gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_gn_properties ON graph_nodes USING gin(properties);

-- ============================================================================
-- GRAPH EDGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS graph_edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
  edge_type VARCHAR(80) NOT NULL
    CHECK (edge_type IN (
      'compatible_with', 'recommended_for', 'proven_on', 'requires',
      'produces', 'replaces', 'conflicts_with', 'optimizes',
      'measured_on', 'calibrated_by', 'derived_from', 'custom'
    )),
  properties JSONB NOT NULL DEFAULT '{}', -- weight, outcome data, parameters, etc.
  source VARCHAR(200) DEFAULT 'system',   -- who/what created: "system", "operator:badge123", "calibration"
  confidence NUMERIC(5,4) DEFAULT 1.0
    CHECK (confidence >= 0 AND confidence <= 1),
  outcome_count INTEGER DEFAULT 0,        -- how many times this edge has been validated
  last_validated_at TIMESTAMPTZ,
  created_by VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Prevent duplicate edges of the same type between same nodes
  UNIQUE(source_id, target_id, edge_type)
);

CREATE INDEX IF NOT EXISTS idx_ge_source ON graph_edges(source_id);
CREATE INDEX IF NOT EXISTS idx_ge_target ON graph_edges(target_id);
CREATE INDEX IF NOT EXISTS idx_ge_type ON graph_edges(edge_type);
CREATE INDEX IF NOT EXISTS idx_ge_properties ON graph_edges USING gin(properties);

-- ============================================================================
-- OPERATOR-PROVEN SETUPS (U-KG2)
-- ============================================================================
-- Dedicated view for setups confirmed by operators on the shop floor.
-- These are edges with source="operator:*" and edge_type in (proven_on, recommended_for).

CREATE OR REPLACE VIEW operator_proven_setups AS
SELECT
  e.id AS edge_id,
  s.label AS source_label,
  s.node_type AS source_type,
  t.label AS target_label,
  t.node_type AS target_type,
  e.edge_type,
  e.properties,
  e.outcome_count,
  e.confidence,
  e.source AS proven_by,
  e.last_validated_at,
  e.created_at
FROM graph_edges e
JOIN graph_nodes s ON s.id = e.source_id
JOIN graph_nodes t ON t.id = e.target_id
WHERE e.source LIKE 'operator:%'
  AND e.edge_type IN ('proven_on', 'recommended_for', 'compatible_with')
ORDER BY e.outcome_count DESC, e.confidence DESC;

-- ============================================================================
-- RECURSIVE PATH QUERY — Example function for finding all compatible tools
-- ============================================================================
-- Usage: SELECT * FROM graph_find_paths('material-uuid', 'compatible_with', 3);

CREATE OR REPLACE FUNCTION graph_find_paths(
  start_node UUID,
  follow_edge_type VARCHAR(80),
  max_depth INTEGER DEFAULT 3
)
RETURNS TABLE(
  path_depth INTEGER,
  node_id UUID,
  node_label VARCHAR(500),
  node_type VARCHAR(50),
  edge_confidence NUMERIC(5,4)
) AS $$
  WITH RECURSIVE paths AS (
    -- Base case: start node
    SELECT 0 AS depth, n.id, n.label, n.node_type, 1.0::NUMERIC(5,4) AS conf
    FROM graph_nodes n
    WHERE n.id = start_node

    UNION ALL

    -- Recursive step: follow edges
    SELECT p.depth + 1, n.id, n.label, n.node_type, e.confidence
    FROM paths p
    JOIN graph_edges e ON e.source_id = p.id AND e.edge_type = follow_edge_type
    JOIN graph_nodes n ON n.id = e.target_id
    WHERE p.depth < max_depth
  )
  SELECT depth, id, label, node_type, conf
  FROM paths
  WHERE depth > 0
  ORDER BY depth, conf DESC;
$$ LANGUAGE sql STABLE;
