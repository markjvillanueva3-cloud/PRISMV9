/**
 * PSNCoverageAuditEngine — U-HAGI12 self-audit reporter
 *
 * Continuous PSN-leg × Voxyz-12-layer coverage matrix.  Pure-core: given an
 * inventory of (engines, dispatchers, memory namespaces, hook registrations,
 * wiki entries), it produces a deterministic NxM coverage matrix tagged
 * per-cell with one of:
 *   - "covered" (PRISM has an asset matching this leg/layer)
 *   - "partial" (some coverage, gaps remain)
 *   - "missing" (no covering asset)
 *
 * Closes the spec-staleness gap named in
 * `HERMES-AGI-ARCHITECTURE-RESEARCH-2026-05-24.md` §6 — the static markdown
 * matrix in the spec drifts within weeks of any milestone shipping.  This
 * engine regenerates the matrix on demand, scoring each cell against live
 * evidence so the audit never goes stale.
 *
 * Pure-core: no I/O, no fs, no spawn.  Caller supplies the inventory + the
 * leg/layer rules.  Deterministic output for deterministic input.  Companion
 * to U-HAGI08 SourceChainEngine — the audit report itself is decorated with
 * citations pointing at the evidence used to score each cell.
 *
 * @module engines/PSNCoverageAuditEngine
 */

import { z } from "zod";
import { SourceChainEngine, type Citation } from "./SourceChainEngine.js";

// ============================================================================
// CANONICAL LEGS / LAYERS
// ============================================================================

/** PSN's 11 legs per CLAUDE.md §EXPERT ROLE + feedback_psn_definition. */
export const PSN_LEGS = [
  "obsidian-brain",
  "prism-os",
  "wiki",
  "memory",
  "tribal",
  "system-viz",
  "engines",
  "algorithms",
  "formulas",
  "nn-gnn",
  "prism-ai",
] as const;
export type PSNLeg = typeof PSN_LEGS[number];

/** Voxyz 12 layers per https://x.com/Voxyz_ai/status/2058222816474919343. */
export const VOXYZ_LAYERS = [
  "work-surface",
  "agent-contract",
  "model",
  "runtime",
  "interop",
  "execution-surface",
  "memory",
  "knowledge",
  "durable-workflow",
  "evals",
  "observability",
  "control-plane",
] as const;
export type VoxyzLayer = typeof VOXYZ_LAYERS[number];

/** Per-cell coverage verdict. */
export type Verdict = "covered" | "partial" | "missing";

// ============================================================================
// INVENTORY SHAPE (caller-supplied)
// ============================================================================

export const EvidenceSchema = z.object({
  leg: z.enum(PSN_LEGS),
  layer: z.enum(VOXYZ_LAYERS),
  path: z.string().min(1),
  weight: z.number().refine(
    (v) => Number.isFinite(v) && v >= 0 && v <= 1,
    { message: "Evidence.weight must be a finite number in [0, 1]" },
  ),
  note: z.string().max(200).optional(),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

export interface CoverageCell {
  leg: PSNLeg;
  layer: VoxyzLayer;
  verdict: Verdict;
  score: number; // sum of weights, clamped to [0, 1]
  evidence: Evidence[];
}

export interface CoverageMatrix {
  cells: CoverageCell[];
  legs: readonly PSNLeg[];
  layers: readonly VoxyzLayer[];
  generated_at: string;
  totals: {
    covered: number;
    partial: number;
    missing: number;
    cells_total: number;
  };
}

// Default thresholds — operator-tunable via input.
const DEFAULT_COVERED_THRESHOLD = 0.7;
const DEFAULT_PARTIAL_THRESHOLD = 0.25;

export interface AuditOptions {
  coveredThreshold?: number;
  partialThreshold?: number;
  generated_at?: string;
}

// ============================================================================
// ENGINE
// ============================================================================

export class PSNCoverageAuditEngine {
  /**
   * Build the NxM coverage matrix.  Every (leg × layer) cell is scored as the
   * clamped sum of evidence weights for that cell.  Verdict = covered/partial/
   * missing per thresholds.  Total = 11 × 12 = 132 cells.
   */
  static audit(
    evidence: readonly Evidence[],
    opts: AuditOptions = {},
  ): CoverageMatrix {
    const validated: Evidence[] = [];
    for (const e of evidence) validated.push(EvidenceSchema.parse(e));

    const covT = opts.coveredThreshold ?? DEFAULT_COVERED_THRESHOLD;
    const partT = opts.partialThreshold ?? DEFAULT_PARTIAL_THRESHOLD;
    if (!(covT > partT && covT <= 1 && partT >= 0)) {
      throw new Error(
        `Invalid thresholds: covered=${covT} must be > partial=${partT}, both in [0,1]`,
      );
    }

    // Group evidence by (leg, layer)
    const cellMap = new Map<string, Evidence[]>();
    for (const e of validated) {
      const k = `${e.leg}::${e.layer}`;
      const arr = cellMap.get(k);
      if (arr) arr.push(e);
      else cellMap.set(k, [e]);
    }

    const cells: CoverageCell[] = [];
    let covered = 0, partial = 0, missing = 0;
    for (const leg of PSN_LEGS) {
      for (const layer of VOXYZ_LAYERS) {
        const k = `${leg}::${layer}`;
        const ev = cellMap.get(k) ?? [];
        const raw = ev.reduce((s, e) => s + e.weight, 0);
        const score = Math.min(1, Math.max(0, raw));
        let verdict: Verdict;
        if (score >= covT) { verdict = "covered"; covered++; }
        else if (score >= partT) { verdict = "partial"; partial++; }
        else { verdict = "missing"; missing++; }
        cells.push({ leg, layer, verdict, score, evidence: ev });
      }
    }

    return {
      cells,
      legs: PSN_LEGS,
      layers: VOXYZ_LAYERS,
      generated_at: opts.generated_at ?? new Date().toISOString(),
      totals: {
        covered,
        partial,
        missing,
        cells_total: PSN_LEGS.length * VOXYZ_LAYERS.length,
      },
    };
  }

  /** Filter cells by verdict (e.g. only missing). */
  static cellsByVerdict(matrix: CoverageMatrix, verdict: Verdict): CoverageCell[] {
    return matrix.cells.filter((c) => c.verdict === verdict);
  }

  /** Render a compact markdown coverage table — operator-readable. */
  static renderMarkdown(matrix: CoverageMatrix): string {
    const t = matrix.totals;
    const lines: string[] = [
      `# PSN × Voxyz coverage matrix`,
      ``,
      `Generated: ${matrix.generated_at}`,
      `Cells: ${t.cells_total} | Covered: ${t.covered} | Partial: ${t.partial} | Missing: ${t.missing}`,
      ``,
      `| Leg \\\\ Layer | ${matrix.layers.join(" | ")} |`,
      `| ${["---", ...matrix.layers.map(() => "---")].join(" | ")} |`,
    ];
    for (const leg of matrix.legs) {
      const row: string[] = [leg];
      for (const layer of matrix.layers) {
        const c = matrix.cells.find((x) => x.leg === leg && x.layer === layer)!;
        const mark = c.verdict === "covered" ? "ok" : c.verdict === "partial" ? "~" : "-";
        row.push(mark);
      }
      lines.push(`| ${row.join(" | ")} |`);
    }
    return lines.join("\n");
  }

  /**
   * Decorate a CoverageMatrix as a U-HAGI08 DecoratedResult so the audit's
   * own outputs carry provenance pointing back to the evidence cells.
   */
  static decorateWithProvenance(matrix: CoverageMatrix) {
    const citations: Citation[] = matrix.cells
      .filter((c) => c.evidence.length > 0)
      .flatMap((c) =>
        c.evidence.map<Citation>((e) => ({
          path: e.path,
          source_type: "engine" as const,
          score: e.weight,
          retrieved_at: matrix.generated_at,
          used_for: `coverage evidence: leg=${e.leg} layer=${e.layer}`,
        })),
      );
    return SourceChainEngine.decorate(matrix, citations);
  }
}

export const psnCoverageAuditEngine = PSNCoverageAuditEngine;
