/**
 * cuttingEvidenceEnvelope — stub (U-EFF25).
 *
 * routes/milling.ts calls enrichSpeedFeedEvidence to attach evidence
 * metadata to a pipeline result. Real implementation never existed on
 * any branch; stub returns the input shape unchanged so dependent
 * routes stay type-correct.
 */
export interface SpeedFeedEvidenceInput {
  program_text?: string;
  cycle_time_s?: number;
  setup_time_min?: number;
  cost_per_part?: number;
  material_removal_rate_cm3_min?: number;
  surface_finish_Ra_um?: number;
  confidence_score?: number;
  confidence?: number;
  safety_score?: number;
  tools?: unknown[];
  [k: string]: unknown;
}

export interface SpeedFeedEvidenceOutput extends SpeedFeedEvidenceInput {
  evidence?: {
    source: string;
    timestamp: string;
    stub: true;
  };
}

export function enrichSpeedFeedEvidence(
  input: SpeedFeedEvidenceInput,
  _context?: Record<string, unknown>,
  _provenance?: Record<string, unknown>,
): SpeedFeedEvidenceOutput {
  return {
    ...input,
    evidence: {
      source: "stub:cuttingEvidenceEnvelope",
      timestamp: new Date().toISOString(),
      stub: true,
    },
  };
}
