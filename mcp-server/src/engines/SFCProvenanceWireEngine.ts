// ORPHAN (2026-06-22 audit, U-SFC-WIRE-EXEMPT-AUDIT): the prior "called by SFC engines internally"
// WIRE-EXEMPT was PHANTOM -- grep-verified that NO file imports sfcProvenanceWireEngine; every ref is a
// reverse-direction metadata string (surfaces_into: ["SFCProvenanceWireEngine.*"]) or a doc comment,
// never a real call. The keyword is removed so the unwired-engine audit surfaces this honestly. Real
// wiring tracked as U-SFC-PROVENANCE-WIRE: the dispatcher-wired SFCMultiHypothesisRankerEngine should
// call cite() to attach provenance to its ranking result.
/**
 * SFCProvenanceWireEngine — U-PPG-SFC-03
 * =======================================
 *
 * Wire layer that attaches provenance citations to every SFC recommendation.
 * Wraps SFC outputs with provenanceEngine.cite() returning:
 *   - kc11_source: {group, value, ref}
 *   - taylor_source: {C, n, ref}
 *   - fps_source: 'formula'|'rag'|'adapter'|'iql'|'hybrid'
 *   - adapter_id, residual, calibration_ts
 *   - citations: CitationSchema[]
 *
 * Design invariants:
 *   1. NEVER RETURN WITHOUT PROVENANCE. Even formula-only outputs get citations.
 *   2. CITE THE ACTUAL SOURCE. If kc1.1 came from constants.ts, cite that exactly.
 *   3. HASH FOR AUDIT. Every provenance record gets SHA-256 audit hash.
 *   4. TRACE REASONING. Brief explanation of how sources combined.
 *
 * @module engines/SFCProvenanceWireEngine
 * @milestone PSAU-PPG-SFC U-PPG-SFC-03
 */

import { createHash } from "node:crypto";
import {
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
  CANONICAL_MATERIAL_DB,
  type ISOGroup,
} from "../physics/constants.js";
import { ProvenanceEngine } from "./ProvenanceEngine.js";
import type { Citation } from "../schemas/citationSchema.js";
import {
  type SFCProvenance,
  type SFCProvenanceWireInput,
  type SFCProvenanceWireOutput,
  type KienzleSource,
  type TaylorSource,
  type FPSSourceType,
  type AdapterInfo,
  type RAGEvidence,
  SFCProvenanceSchema,
} from "../schemas/sfcProvenanceSchema.js";

// ─── ID Generation ──────────────────────────────────────────────────────

let counter = 0;

function generateRecommendationId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  counter = (counter + 1) % 1000000;
  return `sfc-${ts}-${rand}-${counter.toString(36).padStart(4, "0")}`;
}

// ─── Audit Hash ─────────────────────────────────────────────────────────

function computeAuditHash(prov: Partial<SFCProvenance>): string {
  const data = JSON.stringify({
    recommendation_id: prov.recommendation_id,
    timestamp: prov.timestamp,
    engine: prov.engine,
    fps_source: prov.fps_source,
    kc11_source: prov.kc11_source,
    taylor_source: prov.taylor_source,
    citations: prov.citations?.map(c => ({
      source_type: c.source_type,
      source_id: c.source_id,
      confidence: c.confidence,
    })),
  });
  return createHash("sha256").update(data).digest("hex").slice(0, 16);
}

// ─── ISO Group Resolution ───────────────────────────────────────────────

function resolveISOGroup(input: SFCProvenanceWireInput): ISOGroup | null {
  if (input.iso_group) return input.iso_group;

  if (input.material) {
    const matKey = input.material.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    const entry = CANONICAL_MATERIAL_DB[matKey] ??
                  CANONICAL_MATERIAL_DB[input.material] ??
                  Object.values(CANONICAL_MATERIAL_DB).find(m =>
                    m.name.toUpperCase().includes(matKey)
                  );
    if (entry) return entry.iso_group;
  }

  return null;
}

// ─── Kienzle Source Builder ─────────────────────────────────────────────

function buildKienzleSource(
  input: SFCProvenanceWireInput,
  isoGroup: ISOGroup | null,
): { source: KienzleSource | null; citation: Citation | null } {
  if (!isoGroup) {
    return { source: null, citation: null };
  }

  const canonical = CANONICAL_KIENZLE[isoGroup];
  const kc1_1 = input.kc11_override ?? canonical.kc1_1;
  const mc = canonical.mc;

  const source: KienzleSource = {
    group: isoGroup,
    kc1_1,
    mc,
    ref: input.kc11_override
      ? `override:${input.kc11_override}`
      : `constants.ts:CANONICAL_KIENZLE[${isoGroup}]`,
    material_override: input.kc11_override ? input.material ?? null : null,
  };

  const citation: Citation = {
    source_type: input.kc11_override ? "operator" : "constant",
    source_id: input.kc11_override
      ? `kienzle-override-${isoGroup}`
      : `CANONICAL_KIENZLE[${isoGroup}]`,
    corpus: "physics/constants.ts",
    engine: input.engine,
    excerpt: `kc1.1=${kc1_1} N/mm², mc=${mc} for ISO group ${isoGroup}`,
    confidence: input.kc11_override ? 0.9 : 1.0,
    retrieval_score: null,
    metadata: { iso_group: isoGroup, kc1_1, mc },
  };

  return { source, citation };
}

// ─── Taylor Source Builder ──────────────────────────────────────────────

function buildTaylorSource(
  input: SFCProvenanceWireInput,
  isoGroup: ISOGroup | null,
): { source: TaylorSource | null; citation: Citation | null } {
  if (!isoGroup) {
    return { source: null, citation: null };
  }

  const canonical = CANONICAL_TAYLOR[isoGroup];
  const C = input.taylor_override?.C ?? canonical.C;
  const n = input.taylor_override?.n ?? canonical.n;

  const source: TaylorSource = {
    group: isoGroup,
    C,
    n,
    ref: input.taylor_override
      ? `override:C=${C},n=${n}`
      : `constants.ts:CANONICAL_TAYLOR[${isoGroup}]`,
    tool_override: input.taylor_override ? input.tool_grade ?? null : null,
  };

  const citation: Citation = {
    source_type: input.taylor_override ? "operator" : "constant",
    source_id: input.taylor_override
      ? `taylor-override-${isoGroup}`
      : `CANONICAL_TAYLOR[${isoGroup}]`,
    corpus: "physics/constants.ts",
    engine: input.engine,
    excerpt: `C=${C} m/min, n=${n} for ISO group ${isoGroup}`,
    confidence: input.taylor_override ? 0.9 : 1.0,
    retrieval_score: null,
    metadata: { iso_group: isoGroup, C, n },
  };

  return { source, citation };
}

// ─── RAG Evidence Builder ───────────────────────────────────────────────

function buildRAGEvidence(
  input: SFCProvenanceWireInput,
): { evidence: RAGEvidence[]; citations: Citation[] } {
  if (!input.rag_hits || input.rag_hits.length === 0) {
    return { evidence: [], citations: [] };
  }

  const evidence: RAGEvidence[] = [];
  const citations: Citation[] = [];

  for (const hit of input.rag_hits.slice(0, 5)) {
    evidence.push({
      program_id: hit.program_id,
      similarity: hit.similarity,
      material_match: hit.material_match ?? false,
      operation_match: hit.operation_match ?? false,
      machine_match: hit.machine_match ?? false,
    });

    citations.push({
      source_type: "program",
      source_id: hit.program_id,
      corpus: "jm_die_programs",
      engine: input.engine,
      excerpt: null,
      confidence: hit.similarity,
      retrieval_score: hit.similarity,
      metadata: {
        material_match: hit.material_match,
        operation_match: hit.operation_match,
        machine_match: hit.machine_match,
      },
    });
  }

  return { evidence, citations };
}

// ─── Adapter Info Builder ───────────────────────────────────────────────

function buildAdapterInfo(
  input: SFCProvenanceWireInput,
): { info: AdapterInfo | null; citation: Citation | null } {
  if (!input.adapter_id) {
    return { info: null, citation: null };
  }

  const info: AdapterInfo = {
    adapter_id: input.adapter_id,
    version: null,
    trained_on: 30, // Default minimum threshold
    confidence: input.adapter_confidence ?? 0.8,
    shadow_mode: input.adapter_shadow ?? false,
  };

  const citation: Citation = {
    source_type: "lora_adapter",
    source_id: input.adapter_id,
    corpus: "adapters/sfc",
    engine: input.engine,
    excerpt: input.adapter_shadow
      ? `Shadow mode adapter ${input.adapter_id}`
      : `Active adapter ${input.adapter_id}`,
    confidence: input.adapter_confidence ?? 0.8,
    retrieval_score: null,
    metadata: { shadow_mode: input.adapter_shadow, residual: input.residual },
  };

  return { info, citation };
}

// ─── FPS Source Determination ───────────────────────────────────────────

function determineFPSSource(input: SFCProvenanceWireInput): FPSSourceType {
  const hasAdapter = !!input.adapter_id;
  const hasRAG = input.rag_hits && input.rag_hits.length > 0;

  if (hasAdapter && hasRAG) return "hybrid";
  if (hasAdapter) return "adapter";
  if (hasRAG) return "rag";
  return "formula";
}

// ─── Reasoning Trace Builder ────────────────────────────────────────────

function buildReasoningTrace(
  input: SFCProvenanceWireInput,
  fpsSource: FPSSourceType,
  isoGroup: ISOGroup | null,
): string {
  const parts: string[] = [];

  if (isoGroup) {
    parts.push(`ISO group ${isoGroup} identified from material '${input.material ?? "unknown"}'`);
  }

  switch (fpsSource) {
    case "formula":
      parts.push("Pure physics formula (Kienzle/Taylor) applied");
      break;
    case "rag":
      parts.push(`RAG-augmented with ${input.rag_hits?.length ?? 0} historical program matches`);
      break;
    case "adapter":
      parts.push(`LoRA adapter '${input.adapter_id}' inference applied`);
      if (input.residual !== undefined) {
        parts.push(`Residual adjustment: ${input.residual > 0 ? "+" : ""}${input.residual}`);
      }
      break;
    case "hybrid":
      parts.push(`Hybrid: adapter '${input.adapter_id}' + ${input.rag_hits?.length ?? 0} RAG matches`);
      break;
    case "iql":
      parts.push("IQL (Implicit Q-Learning) recommendation");
      break;
  }

  if (input.adapter_shadow) {
    parts.push("(adapter in shadow mode - logged only)");
  }

  return parts.join("; ");
}

// ─── Main Engine Class ──────────────────────────────────────────────────

export class SFCProvenanceWireEngine {
  /**
   * Attach provenance to an SFC recommendation.
   * Every SFC output gets full provenance with citations.
   *
   * @param input - SFC recommendation with context
   * @returns Provenance record with audit hash
   */
  static cite(input: SFCProvenanceWireInput): SFCProvenanceWireOutput {
    const now = new Date().toISOString();
    const recommendationId = generateRecommendationId();
    const isoGroup = resolveISOGroup(input);

    // Build sources
    const { source: kc11Source, citation: kc11Citation } = buildKienzleSource(input, isoGroup);
    const { source: taylorSource, citation: taylorCitation } = buildTaylorSource(input, isoGroup);
    const { evidence: ragEvidence, citations: ragCitations } = buildRAGEvidence(input);
    const { info: adapterInfo, citation: adapterCitation } = buildAdapterInfo(input);

    // Determine primary source
    const fpsSource = determineFPSSource(input);

    // Collect all citations
    const citations: Citation[] = [];
    if (kc11Citation) citations.push(kc11Citation);
    if (taylorCitation) citations.push(taylorCitation);
    citations.push(...ragCitations);
    if (adapterCitation) citations.push(adapterCitation);

    // Build reasoning trace
    const reasoningTrace = buildReasoningTrace(input, fpsSource, isoGroup);

    // Build provenance
    const provenance: SFCProvenance = {
      recommendation_id: recommendationId,
      timestamp: now,
      engine: input.engine,
      kc11_source: kc11Source,
      taylor_source: taylorSource,
      fps_source: fpsSource,
      adapter_info: adapterInfo,
      residual: input.residual ?? null,
      rag_evidence: ragEvidence,
      calibration_ts: null,
      calibration_source: null,
      citations,
      reasoning_trace: reasoningTrace,
      audit_hash: null,
    };

    // Compute audit hash
    provenance.audit_hash = computeAuditHash(provenance);

    // Validate
    const validated = SFCProvenanceSchema.safeParse(provenance);
    if (!validated.success) {
      return {
        ok: false,
        provenance,
        warning: `Schema validation failed: ${validated.error.message}`,
      };
    }

    return {
      ok: true,
      provenance: validated.data,
    };
  }

  /**
   * Validate that an SFC provenance record is complete.
   * Used by sfc-provenance-guard hook.
   *
   * @param provenance - Provenance to validate
   * @returns Validation result
   */
  static validate(provenance: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!provenance || typeof provenance !== "object") {
      return { valid: false, errors: ["Provenance is null or not an object"] };
    }

    const prov = provenance as Partial<SFCProvenance>;

    // Required fields
    if (!prov.recommendation_id) errors.push("Missing recommendation_id");
    if (!prov.timestamp) errors.push("Missing timestamp");
    if (!prov.engine) errors.push("Missing engine");
    if (!prov.fps_source) errors.push("Missing fps_source");

    // Must have at least one citation
    if (!prov.citations || prov.citations.length === 0) {
      errors.push("No citations provided - recommendation source unknown");
    }

    // Audit hash verification
    if (prov.audit_hash) {
      const expected = computeAuditHash(prov);
      if (prov.audit_hash !== expected) {
        errors.push("Audit hash mismatch - provenance may have been tampered");
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Summarize provenance for human-readable output.
   *
   * @param provenance - Provenance to summarize
   * @returns Summary string
   */
  static summarize(provenance: SFCProvenance): string {
    const parts: string[] = [];

    parts.push(`SFC Recommendation ${provenance.recommendation_id}`);
    parts.push(`Engine: ${provenance.engine}`);
    parts.push(`Source: ${provenance.fps_source.toUpperCase()}`);

    if (provenance.kc11_source) {
      parts.push(`Kienzle: kc1.1=${provenance.kc11_source.kc1_1} [${provenance.kc11_source.group}]`);
    }

    if (provenance.taylor_source) {
      parts.push(`Taylor: C=${provenance.taylor_source.C}, n=${provenance.taylor_source.n} [${provenance.taylor_source.group}]`);
    }

    if (provenance.adapter_info) {
      parts.push(`Adapter: ${provenance.adapter_info.adapter_id} (${(provenance.adapter_info.confidence * 100).toFixed(0)}% conf)`);
      if (provenance.adapter_info.shadow_mode) parts.push("  [SHADOW MODE]");
    }

    if (provenance.residual !== null) {
      parts.push(`Residual: ${provenance.residual > 0 ? "+" : ""}${provenance.residual}`);
    }

    if (provenance.rag_evidence.length > 0) {
      parts.push(`RAG matches: ${provenance.rag_evidence.length}`);
      for (const ev of provenance.rag_evidence.slice(0, 3)) {
        parts.push(`  - ${ev.program_id} (${(ev.similarity * 100).toFixed(0)}%)`);
      }
    }

    parts.push(`Citations: ${provenance.citations.length}`);
    if (provenance.reasoning_trace) {
      parts.push(`Reasoning: ${provenance.reasoning_trace}`);
    }

    return parts.join("\n");
  }
}

export const sfcProvenanceWireEngine = new SFCProvenanceWireEngine();
