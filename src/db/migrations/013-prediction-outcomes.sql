-- INFRA-5-1 U-CAL2: Prediction outcomes — immutable audit trail
-- Records predicted vs actual values for calibration feedback loop.
-- Append-only: UPDATE and DELETE blocked by trigger.

CREATE TABLE IF NOT EXISTS prediction_outcomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id VARCHAR(200) NOT NULL,           -- e.g., "kienzle_force", "taylor_tool_life", "klocke_ra"
  input_features JSONB NOT NULL DEFAULT '{}', -- full input snapshot for reproducibility
  predicted_value NUMERIC(15,6) NOT NULL,
  actual_value NUMERIC(15,6) NOT NULL,
  measurement_type VARCHAR(100) NOT NULL     -- "cycle_time_s", "tool_life_min", "cutting_force_N", "surface_finish_Ra_um"
    CHECK (measurement_type IN (
      'cycle_time_s', 'tool_life_min', 'cutting_force_N', 'surface_finish_Ra_um',
      'power_kW', 'temperature_C', 'deflection_um', 'vibration_mm_s',
      'mrrr_cm3_min', 'chip_thickness_mm', 'torque_Nm', 'custom'
    )),
  material_key VARCHAR(200),                 -- e.g., "P-4140-28HRC"
  machine_id VARCHAR(200),                   -- e.g., "haas-vf2-001"
  tool_id VARCHAR(200),                      -- e.g., "sandvik-2P342-1000-PA-1730"
  operation_type VARCHAR(100),               -- "roughing", "finishing", "drilling", etc.
  error_pct NUMERIC(8,4) GENERATED ALWAYS AS (
    CASE WHEN predicted_value != 0
         THEN ((actual_value - predicted_value) / predicted_value) * 100
         ELSE NULL END
  ) STORED,
  confidence NUMERIC(5,4) DEFAULT 0.5       -- 0..1 confidence of actual measurement
    CHECK (confidence >= 0 AND confidence <= 1),
  measured_by VARCHAR(200),                  -- AS9100: who measured (operator name/badge)
  instrument_id VARCHAR(200),               -- AS9100: measurement instrument ID
  approved_by VARCHAR(200),                 -- AS9100: quality approval
  notes TEXT,
  validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_pred_out_model ON prediction_outcomes(model_id);
CREATE INDEX IF NOT EXISTS idx_pred_out_material ON prediction_outcomes(material_key);
CREATE INDEX IF NOT EXISTS idx_pred_out_machine ON prediction_outcomes(machine_id);
CREATE INDEX IF NOT EXISTS idx_pred_out_type ON prediction_outcomes(measurement_type);
CREATE INDEX IF NOT EXISTS idx_pred_out_created ON prediction_outcomes(created_at DESC);

-- Append-only trigger: block UPDATE and DELETE (compliance/audit requirement)
CREATE OR REPLACE FUNCTION prevent_prediction_outcome_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'prediction_outcomes is append-only: % not allowed (compliance requirement)', TG_OP;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prediction_outcomes_immutable ON prediction_outcomes;
CREATE TRIGGER trg_prediction_outcomes_immutable
  BEFORE UPDATE OR DELETE ON prediction_outcomes
  FOR EACH ROW
  EXECUTE FUNCTION prevent_prediction_outcome_mutation();

-- Companion view: recent prediction accuracy by model
CREATE OR REPLACE VIEW prediction_accuracy_by_model AS
SELECT
  model_id,
  measurement_type,
  material_key,
  COUNT(*) as sample_count,
  AVG(error_pct) as mean_error_pct,
  STDDEV(error_pct) as stddev_error_pct,
  AVG(ABS(error_pct)) as mae_pct,
  MIN(created_at) as first_measurement,
  MAX(created_at) as last_measurement
FROM prediction_outcomes
WHERE error_pct IS NOT NULL
GROUP BY model_id, measurement_type, material_key;
