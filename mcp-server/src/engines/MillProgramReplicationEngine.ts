/**
 * MillProgramReplicationEngine — print-to-program by RETRIEVAL + ADAPTATION.
 *
 * The missing composer for the (previously orphaned, unwired) hyperMILL
 * replication chain. It is the "generate a CNC program just by reading a print"
 * capability: instead of synthesizing toolpaths from scratch, it RETRIEVES the
 * most similar existing program from a corpus and ADAPTS it to the new part.
 *
 * Pipeline (composes three existing, pure engines — no new physics):
 *   1. Build a query {@link FeatureSequenceRecord} from the print
 *      (recognized features + stock + material).
 *   2. RETRIEVE similar existing programs — {@link PartSimilaritySearchEngine}
 *      (LSH feature-hash buckets; score 0-100 across feature/dimension/material/
 *      complexity/operation overlap).
 *   3. AXIS-GATE candidates (3 → 4 → 5). A corpus program that needs MORE axes
 *      than the target machine has is REJECTED — you can never run a 5-axis
 *      simultaneous program on a 3-axis machine. A program needing FEWER axes is
 *      usable (axis headroom unused → flagged, not blocked).
 *   4. ADAPT the best surviving template — {@link FeatureSequenceReplicatorEngine}
 *      (proportional scale, Kienzle-derived S/F adjustment for material change,
 *      feature add/remove reconciliation, tool cascade re-size).
 *   5. Return the replicated program + FULL PROVENANCE (which source program,
 *      similarity score + breakdown, axis derivation, adaptations) + a combined
 *      confidence = similarity × replication-confidence.
 *
 * Safety posture: invalid input returns a structured `{ok:false, reason}` —
 * engines do not throw on bad data (per engines/.claude/CLAUDE.md). The axis
 * gate is the load-bearing safety invariant.
 *
 * @milestone PRINT-TO-PROGRAM-REPLICATION / U-FOXTROT-P2P-REPLICATE-MS0
 */

import {
  featureSequenceReplicatorEngine,
  type ReplicationResult,
} from "./hypermill/FeatureSequenceReplicatorEngine.js";
import {
  partSimilaritySearchEngine,
  type SimilarityMatch,
} from "./hypermill/PartSimilaritySearchEngine.js";
import type { FeatureSequenceRecord } from "./hypermill/HMCProjectParserEngine.js";
import type { RecognizedFeature } from "./FeatureRecognitionEngine.js";

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type AxisCount = 3 | 4 | 5;

/** A print, reduced to what retrieval + adaptation need. */
export interface ReplicateFromPrintInput {
  /** New part name (from the print title block). */
  partName: string;
  /** New material designation. */
  material: string;
  /** New material ISO machinability group. */
  isoGroup?: FeatureSequenceRecord["stock"]["isoGroup"];
  /** Stock bounding box in mm. */
  dimensions: { x: number; y: number; z: number };
  /** Features recognized from the print. */
  features: RecognizedFeature[];
  /** Corpus of existing programs to retrieve from. */
  corpus: FeatureSequenceRecord[];
  /** Axis capability of the TARGET machine — gates which corpus programs are usable. Default 3. */
  targetAxisCount?: AxisCount;
  /** Machine max spindle RPM (clamp for adapted speeds). */
  machineMaxRPM?: number;
  /** Machine max feed mm/min (clamp for adapted feeds). */
  machineMaxFeed?: number;
  /** Minimum similarity (0-100) to accept a match. Default 25. */
  minScore?: number;
  /** Candidates to consider before axis-gating. Default 5. */
  topN?: number;
}

export interface ReplicationProvenance {
  sourceProgramId: string | null;
  sourceProgramName: string | null;
  /** Similarity 0-100 of the chosen source program. */
  similarityScore: number;
  similarityBreakdown: SimilarityMatch["breakdown"] | null;
  /** Axes the chosen source program requires. */
  sourceAxisCount: AxisCount | null;
  /** Axes the target machine has. */
  targetAxisCount: AxisCount;
  /** Source needs fewer axes than the target machine offers. */
  axisHeadroomUnused: boolean;
}

export interface ReplicateFromPrintResult {
  ok: boolean;
  /** Adapted program + AC Python script (null when ok=false). */
  replicated: ReplicationResult | null;
  provenance: ReplicationProvenance;
  /** Candidates returned by similarity search before gating. */
  candidatesEvaluated: number;
  /** Candidates dropped because they exceed the target machine's axis count. */
  candidatesRejectedByAxis: number;
  /** Combined confidence = similarity/100 × replication confidence (0-1). */
  confidence: number;
  warnings: string[];
  /** Human-readable cause when ok=false. */
  reason?: string;
}

/** Annotated similarity hit for the granular search action. */
export interface AnnotatedMatch {
  id: string;
  partName: string;
  score: number;
  breakdown: SimilarityMatch["breakdown"];
  axisCount: AxisCount;
  usableOnTarget: boolean;
}

export interface SimilaritySearchResult {
  ok: boolean;
  matches: AnnotatedMatch[];
  candidatesEvaluated: number;
  targetAxisCount: AxisCount;
  reason?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// AXIS DERIVATION (exported for testing)
// ══════════════════════════════════════════════════════════════════════════════

/** A feature needs rotary positioning if its orientation is a custom axis or a non-trivial tilt. */
function featureNeedsRotary(f: RecognizedFeature): boolean {
  return (
    f.orientation?.axis === "custom" ||
    (typeof f.orientation?.angle_deg === "number" && Math.abs(f.orientation.angle_deg) > 0.5)
  );
}

/**
 * Infer how many axes an existing program needs, from evidence in the record.
 *
 * - **5** — at least one simultaneous 5-axis operation (`operationType:"5axis"`).
 * - **4** — at least one feature requires rotary positioning (custom orientation
 *   axis or a non-trivial angle), i.e. 3+1 / 3+2 indexed, but no simultaneous op.
 * - **3** — purely axis-aligned features, no rotary evidence.
 *
 * Conservative by design: a program is only called 5-axis with explicit
 * simultaneous-op evidence — we never *claim* a capability the record can't prove.
 *
 * CAVEAT: this trusts the record's `operationType` tagging. For `hmc_project`
 * sources that tag is parsed from the real project and reliable. For
 * `step_inferred` / `manual_entry` sources it may be defaulted — so
 * {@link MillProgramReplicationEngine.replicateFromPrint} additionally warns when
 * a non-`hmc_project` source is selected, since its axis class is unverified.
 */
export function deriveAxisCount(record: FeatureSequenceRecord): AxisCount {
  if (record.operations.some((o) => o.operationType === "5axis")) return 5;
  return (record.features ?? []).some(featureNeedsRotary) ? 4 : 3;
}

// ══════════════════════════════════════════════════════════════════════════════
// ENGINE
// ══════════════════════════════════════════════════════════════════════════════

class MillProgramReplicationEngine {
  /**
   * Index a corpus and report its index/bucket counts — a DIAGNOSTIC helper.
   *
   * NOTE: the underlying search engine is a shared singleton, and
   * {@link replicateFromPrint}/{@link similaritySearch} each `clear()` + re-index
   * from their own request-scoped `corpus`. So the index built here does NOT
   * persist into those calls (by design — per-call self-indexing keeps concurrent
   * requests from racing on shared state). Use this only to validate that a
   * corpus parses and to inspect how many geometric buckets it forms.
   *
   * @param corpus - FeatureSequenceRecords (from HMCProjectParser / STEP inference / prior runs).
   * @returns indexed count + bucket count.
   */
  indexCorpus(corpus: FeatureSequenceRecord[]): { ok: boolean; indexed: number; buckets: number } {
    partSimilaritySearchEngine.clear();
    partSimilaritySearchEngine.indexBatch(Array.isArray(corpus) ? corpus : []);
    return {
      ok: true,
      indexed: partSimilaritySearchEngine.getIndexSize(),
      buckets: partSimilaritySearchEngine.getBucketCount(),
    };
  }

  /**
   * Retrieve + axis-annotate similar programs for a print, WITHOUT adapting.
   * @param input - the print description (corpus + features + stock + target axes).
   */
  similaritySearch(input: ReplicateFromPrintInput): SimilaritySearchResult {
    const targetAxisCount = input.targetAxisCount ?? 3;
    const guard = this.validate(input, targetAxisCount);
    if (guard) {
      return { ok: false, matches: [], candidatesEvaluated: 0, targetAxisCount, reason: guard };
    }
    const matches = this.retrieve(input);
    const annotated: AnnotatedMatch[] = matches.map((m) => {
      const axisCount = deriveAxisCount(m.record);
      return {
        id: m.record.id,
        partName: m.record.partName,
        score: m.score,
        breakdown: m.breakdown,
        axisCount,
        usableOnTarget: axisCount <= targetAxisCount,
      };
    });
    return { ok: true, matches: annotated, candidatesEvaluated: matches.length, targetAxisCount };
  }

  /**
   * Full print → program replication: retrieve the most similar existing
   * program, axis-gate it, and adapt it to the new part.
   * @param input - print description + corpus + target machine axis count.
   * @returns replicated program + provenance + combined confidence.
   */
  replicateFromPrint(input: ReplicateFromPrintInput): ReplicateFromPrintResult {
    const targetAxisCount = input.targetAxisCount ?? 3;
    const emptyProvenance: ReplicationProvenance = {
      sourceProgramId: null,
      sourceProgramName: null,
      similarityScore: 0,
      similarityBreakdown: null,
      sourceAxisCount: null,
      targetAxisCount,
      axisHeadroomUnused: false,
    };

    const guard = this.validate(input, targetAxisCount);
    if (guard) {
      return {
        ok: false,
        replicated: null,
        provenance: emptyProvenance,
        candidatesEvaluated: 0,
        candidatesRejectedByAxis: 0,
        confidence: 0,
        warnings: [],
        reason: guard,
      };
    }

    const warnings: string[] = [];
    const matches = this.retrieve(input);

    // Axis gate — drop any candidate that exceeds the target machine's axes.
    let candidatesRejectedByAxis = 0;
    const minScore = input.minScore ?? 25;
    const usable = matches.filter((m) => {
      if (deriveAxisCount(m.record) > targetAxisCount) {
        candidatesRejectedByAxis++;
        return false;
      }
      return true;
    });
    const accepted = usable.filter((m) => m.score >= minScore);

    if (accepted.length === 0) {
      const reason =
        candidatesRejectedByAxis > 0 && usable.length === 0
          ? `all ${matches.length} candidate program(s) require >${targetAxisCount}-axis machining — target machine is ${targetAxisCount}-axis (axis gate)`
          : matches.length === 0
            ? `no corpus program shares enough features with the print to retrieve`
            : `no usable corpus program scored ≥${minScore} similarity (best usable=${usable[0]?.score ?? 0})`;
      return {
        ok: false,
        replicated: null,
        provenance: { ...emptyProvenance },
        candidatesEvaluated: matches.length,
        candidatesRejectedByAxis,
        confidence: 0,
        warnings,
        reason,
      };
    }

    const best = accepted[0];
    const sourceAxisCount = deriveAxisCount(best.record);
    const axisHeadroomUnused = sourceAxisCount < targetAxisCount;
    if (axisHeadroomUnused) {
      warnings.push(
        `source program "${best.record.partName}" is ${sourceAxisCount}-axis on a ${targetAxisCount}-axis target — axis headroom unused (a higher-axis template could cut setups)`
      );
    }
    // Fail loud: the axis gate trusts operationType tagging, which is only
    // verified for real hyperMILL projects. Inferred sources may under-report
    // simultaneous-5 needs — surface it rather than implying a checked result.
    if (best.record.source !== "hmc_project") {
      warnings.push(
        `source "${best.record.partName}" is ${best.record.source} — its ${sourceAxisCount}-axis classification is inferred, not from a verified hyperMILL project; confirm the target machine's axis capability before running`
      );
    }

    const replicated = featureSequenceReplicatorEngine.replicate(best.record, {
      partName: input.partName,
      material: input.material,
      isoGroup: input.isoGroup ?? best.record.stock.isoGroup ?? "P",
      dimensions: { ...input.dimensions },
      features: input.features,
      machineMaxRPM: input.machineMaxRPM,
      machineMaxFeed: input.machineMaxFeed,
    });

    // Combined confidence: how well it matched × how cleanly it adapted.
    const confidence = Math.max(0, Math.min(1, (best.score / 100) * replicated.confidence));

    return {
      ok: true,
      replicated,
      provenance: {
        sourceProgramId: best.record.id,
        sourceProgramName: best.record.partName,
        similarityScore: best.score,
        similarityBreakdown: best.breakdown,
        sourceAxisCount,
        targetAxisCount,
        axisHeadroomUnused,
      },
      candidatesEvaluated: matches.length,
      candidatesRejectedByAxis,
      confidence,
      warnings: [...warnings, ...replicated.warnings],
    };
  }

  /**
   * Dispatcher entry point — routes snake_case actions to typed methods.
   * @param action - one of replicate_from_print | replicate_similarity_search | replicate_corpus_index.
   * @param params - loose params validated upstream by the dispatcher schema.
   */
  calculate(action: string, params: Record<string, unknown>): unknown {
    switch (action) {
      case "replicate_from_print":
        return this.replicateFromPrint(this.normalizeInput(params));
      case "replicate_similarity_search":
        return this.similaritySearch(this.normalizeInput(params));
      case "replicate_corpus_index":
        return this.indexCorpus((params?.corpus as FeatureSequenceRecord[]) ?? []);
      default:
        throw new Error(`MillProgramReplicationEngine: unknown action '${action}'`);
    }
  }

  // ── internals ──────────────────────────────────────────────────────────────

  /** Structured input validation — returns a reason string, or null if valid. */
  private validate(input: ReplicateFromPrintInput, targetAxisCount: AxisCount): string | null {
    if (![3, 4, 5].includes(targetAxisCount)) {
      return `targetAxisCount must be 3, 4, or 5 (got ${targetAxisCount})`;
    }
    if (!Array.isArray(input.corpus) || input.corpus.length === 0) {
      return "empty corpus — no existing programs to replicate from";
    }
    if (!Array.isArray(input.features) || input.features.length === 0) {
      return "no features extracted from print — nothing to match against the corpus";
    }
    const d = input.dimensions;
    if (!d || typeof d !== "object") return "missing stock dimensions";
    for (const k of ["x", "y", "z"] as const) {
      const v = d[k];
      if (!Number.isFinite(v) || (v as number) <= 0) {
        return `invalid stock dimension ${k}=${String(v)} (must be a finite positive number)`;
      }
    }
    if (typeof input.material !== "string" || input.material.trim() === "") {
      return "missing material designation";
    }
    return null;
  }

  /**
   * Index the corpus and run similarity search for the print's query record.
   *
   * NOTE: material is deliberately NOT passed as a `materialGroup` filter — that
   * is a HARD filter in PartSimilaritySearchEngine and would exclude every
   * cross-material template, defeating the replicator's whole purpose (adapting a
   * steel program to aluminum, etc.). Material proximity is already weighted into
   * the similarity score (materialMatch, 0.20), so cross-material candidates
   * still surface — just ranked lower.
   */
  private retrieve(input: ReplicateFromPrintInput): SimilarityMatch[] {
    const topN =
      Number.isFinite(input.topN) && (input.topN as number) >= 1 ? Math.floor(input.topN as number) : 5;
    const queryRecord = this.buildQueryRecord(input);
    partSimilaritySearchEngine.clear();
    partSimilaritySearchEngine.indexBatch(input.corpus);
    return partSimilaritySearchEngine.search(queryRecord, { topN });
  }

  /** Reduce a print to a FeatureSequenceRecord usable as a similarity query. */
  private buildQueryRecord(input: ReplicateFromPrintInput): FeatureSequenceRecord {
    return {
      id: `query_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      source: "step_inferred",
      partType: this.derivePartType(input.features),
      partName: input.partName,
      stock: {
        type: "rectangular",
        dimensions: { ...input.dimensions },
        material: input.material,
        isoGroup: input.isoGroup,
      },
      wcsList: [],
      features: input.features,
      operations: [], // the program is exactly what we are retrieving — unknown at query time
      totalCycleTimeSec: 0,
      toolChangeCount: 0,
      uniqueToolCount: 0,
      createdAt: new Date().toISOString(),
      complexityScore: this.estimateComplexity(input.features),
      warnings: [],
    };
  }

  private derivePartType(features: RecognizedFeature[]): FeatureSequenceRecord["partType"] {
    return features.some(featureNeedsRotary) ? "freeform" : "prismatic";
  }

  /**
   * Rough complexity from feature count + type diversity, on the **0-10** scale.
   * MUST match HMCProjectParser.computeComplexity's scale — the similarity
   * engine's complexityMatch is `1 - |Δ|/10`, so a 0-100 query value against a
   * 0-10 corpus value would floor that 0.15-weighted term to 0 for every
   * candidate and silently degrade ranking.
   */
  private estimateComplexity(features: RecognizedFeature[]): number {
    const distinctTypes = new Set(features.map((f) => f.type)).size;
    return Math.min(10, features.length * 0.5 + distinctTypes * 0.8);
  }

  /** Map snake_case dispatcher params to the typed input. */
  private normalizeInput(p: Record<string, unknown>): ReplicateFromPrintInput {
    const g = <T>(...keys: string[]): T | undefined => {
      for (const k of keys) {
        if (p[k] !== undefined) return p[k] as T;
      }
      return undefined;
    };
    return {
      partName: g<string>("partName", "part_name") ?? "unnamed-part",
      material: g<string>("material") ?? "",
      isoGroup: g<FeatureSequenceRecord["stock"]["isoGroup"]>("isoGroup", "iso_group"),
      dimensions: (g<{ x: number; y: number; z: number }>("dimensions") ?? { x: NaN, y: NaN, z: NaN }),
      features: g<RecognizedFeature[]>("features") ?? [],
      corpus: g<FeatureSequenceRecord[]>("corpus") ?? [],
      targetAxisCount: (g<AxisCount>("targetAxisCount", "target_axis_count") ?? 3) as AxisCount,
      machineMaxRPM: g<number>("machineMaxRPM", "machine_max_rpm"),
      machineMaxFeed: g<number>("machineMaxFeed", "machine_max_feed"),
      minScore: g<number>("minScore", "min_score"),
      topN: g<number>("topN", "top_n"),
    };
  }
}

/** Singleton export (matches surrounding engine convention). */
export const millProgramReplicationEngine = new MillProgramReplicationEngine();
