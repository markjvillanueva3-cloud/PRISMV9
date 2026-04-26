/**
 * SFC Provenance Schema — U-PPG-SFC-03
 * =====================================
 *
 * Domain-specific provenance schema for Speed/Feed Calculator recommendations.
 * Every SFC output must carry provenance showing:
 *   - kc11_source: where the Kienzle constant came from
 *   - taylor_source: where the Taylor constant came from
 *   - fps_source: primary reasoning source (formula, rag, adapter, iql)
 *   - adapter_id: if adapter-based inference was used
 *   - residual: delta from base formula (if adapter applied)
 *   - calibration_ts: when calibration was last updated
 *   - citations: full provenance citations array
 *
 * Enables ITAR/AS9100 audit trails and operator trust.
 *
 * @module schemas/sfcProvenanceSchema
 * @milestone PSAU-PPG-SFC U-PPG-SFC-03
 */

import { z } from "zod";
import { CitationSchema, type Citation } from "./citationSchema.js";
import type { ISOGroup } from "../physics/constants.js";

// ─── Kienzle Source ─────────────────────────────────────────────────────

export const KienzleSourceSchema = z.object({
  group: z.enum(["P", "M", "K", "N", "S", "H"]).describe("ISO material group"),
  kc1_1: z.number().positive().describe("Specific cutting force at h=1mm [N/mm²]"),
  mc: z.number().min(0).max(1).describe("Material exponent"),
  ref: z.string().describe("Source reference (e.g., 'constants.ts:CANONICAL_KIENZLE')"),
  material_override: z.string().nullable().describe("If overridden by specific material lookup"),
}).describe("Kienzle cutting force constant source");
export type KienzleSource = z.infer<typeof KienzleSourceSchema>;

// ─── Taylor Source ──────────────────────────────────────────────────────

export const TaylorSourceSchema = z.object({
  group: z.enum(["P", "M", "K", "N", "S", "H"]).describe("ISO material group"),
  C: z.number().positive().describe("Taylor constant (speed for 1-min life) [m/min]"),
  n: z.number().min(0).max(1).describe("Taylor exponent"),
  ref: z.string().describe("Source reference (e.g., 'constants.ts:CANONICAL_TAYLOR')"),
  tool_override: z.string().nullable().describe("If overridden by specific tool grade"),
}).describe("Taylor tool life constant source");
export type TaylorSource = z.infer<typeof TaylorSourceSchema>;

// ─── FPS Source Type ────────────────────────────────────────────────────

export const FPSSourceTypeSchema = z.enum([
  "formula",  // Pure physics formula (Kienzle/Taylor)
  "rag",      // RAG-augmented (historical programs, tribal tips)
  "adapter",  // LoRA adapter inference
  "iql",      // IQL (Implicit Q-Learning) recommendation
  "hybrid",   // Multiple sources combined
]).describe("Primary source type for speed/feed recommendation");
export type FPSSourceType = z.infer<typeof FPSSourceTypeSchema>;

// ─── Adapter Info ───────────────────────────────────────────────────────

export const AdapterInfoSchema = z.object({
  adapter_id: z.string().describe("LoRA adapter ID (e.g., 'sfc-D2-Okuma-v3')"),
  version: z.string().nullable().describe("Adapter version"),
  trained_on: z.number().int().positive().describe("Number of samples adapter trained on"),
  confidence: z.number().min(0).max(1).describe("Adapter prediction confidence"),
  shadow_mode: z.boolean().describe("True if adapter was in shadow mode (logged-only)"),
}).describe("LoRA adapter metadata");
export type AdapterInfo = z.infer<typeof AdapterInfoSchema>;

// ─── RAG Evidence ───────────────────────────────────────────────────────

export const RAGEvidenceSchema = z.object({
  program_id: z.string().describe("Historical program path (e.g., 'JMDIE/ALCOA/L-2845-D2.MIN')"),
  similarity: z.number().min(0).max(1).describe("Semantic similarity score"),
  material_match: z.boolean().describe("True if material matched"),
  operation_match: z.boolean().describe("True if operation type matched"),
  machine_match: z.boolean().describe("True if machine type matched"),
}).describe("RAG retrieval evidence");
export type RAGEvidence = z.infer<typeof RAGEvidenceSchema>;

// ─── SFC Provenance ─────────────────────────────────────────────────────

export const SFCProvenanceSchema = z.object({
  recommendation_id: z.string().describe("Unique recommendation ID"),
  timestamp: z.string().describe("ISO8601 timestamp"),
  engine: z.string().describe("SFC engine that produced recommendation"),

  // Physics sources
  kc11_source: KienzleSourceSchema.nullable().describe("Kienzle constant source"),
  taylor_source: TaylorSourceSchema.nullable().describe("Taylor constant source"),

  // Primary reasoning source
  fps_source: FPSSourceTypeSchema.describe("Primary source type"),

  // Adapter-based adjustments
  adapter_info: AdapterInfoSchema.nullable().describe("LoRA adapter info if used"),
  residual: z.number().nullable().describe("Delta from base formula (e.g., -44 means 44 SFM below formula)"),

  // RAG evidence
  rag_evidence: z.array(RAGEvidenceSchema).describe("RAG retrieval evidence (top matches)"),

  // Calibration
  calibration_ts: z.string().nullable().describe("When calibration was last updated"),
  calibration_source: z.string().nullable().describe("Calibration source (e.g., 'run_log', 'operator_feedback')"),

  // Full provenance
  citations: z.array(CitationSchema).describe("All provenance citations"),
  reasoning_trace: z.string().nullable().describe("Brief explanation of how sources combined"),
  audit_hash: z.string().nullable().describe("SHA-256 hash for audit trail"),
}).describe("Full SFC provenance record");
export type SFCProvenance = z.infer<typeof SFCProvenanceSchema>;

// ─── Wire Input ─────────────────────────────────────────────────────────

export const SFCProvenanceWireInputSchema = z.object({
  engine: z.string().describe("SFC engine name"),
  action: z.string().optional().describe("Dispatcher action"),

  // Context
  material: z.string().optional().describe("Material being cut"),
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional().describe("ISO material group"),
  operation: z.string().optional().describe("Operation type (milling, turning, drilling)"),
  machine_id: z.string().optional().describe("Machine identifier"),
  tool_id: z.string().optional().describe("Tool identifier"),
  tool_grade: z.string().optional().describe("Tool grade/substrate"),

  // Recommended values (the actual SFC output)
  recommended: z.object({
    sfm: z.number().optional(),
    vc: z.number().optional(),
    rpm: z.number().optional(),
    fpt: z.number().optional(),
    fz: z.number().optional(),
    fpr: z.number().optional(),
    feed_rate: z.number().optional(),
    doc: z.number().optional(),
    ae: z.number().optional(),
    ap: z.number().optional(),
  }).passthrough().describe("Recommended speed/feed values"),

  // Optional overrides
  kc11_override: z.number().optional().describe("Override Kienzle kc1.1 value"),
  taylor_override: z.object({ C: z.number(), n: z.number() }).optional().describe("Override Taylor constants"),

  // Adapter info
  adapter_id: z.string().optional().describe("LoRA adapter ID if used"),
  adapter_confidence: z.number().min(0).max(1).optional().describe("Adapter confidence"),
  adapter_shadow: z.boolean().optional().describe("Adapter in shadow mode"),
  residual: z.number().optional().describe("Delta from base formula"),

  // RAG evidence
  rag_hits: z.array(z.object({
    program_id: z.string(),
    similarity: z.number(),
    material_match: z.boolean().optional(),
    operation_match: z.boolean().optional(),
    machine_match: z.boolean().optional(),
  })).optional().describe("RAG retrieval hits"),

  // Lineage
  lineage_id: z.string().optional().describe("Upstream lineage ID"),
  agent_id: z.string().optional().describe("Agent ID for attribution"),
}).describe("Input to SFC provenance wire");
export type SFCProvenanceWireInput = z.infer<typeof SFCProvenanceWireInputSchema>;

// ─── Wire Output ────────────────────────────────────────────────────────

export const SFCProvenanceWireOutputSchema = z.object({
  ok: z.boolean().describe("Whether provenance was generated successfully"),
  provenance: SFCProvenanceSchema.describe("Generated provenance record"),
  warning: z.string().optional().describe("Warning message if any"),
}).describe("Output from SFC provenance wire");
export type SFCProvenanceWireOutput = z.infer<typeof SFCProvenanceWireOutputSchema>;
