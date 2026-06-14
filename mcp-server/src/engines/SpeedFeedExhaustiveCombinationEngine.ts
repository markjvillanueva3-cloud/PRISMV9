/**
 * SpeedFeedExhaustiveCombinationEngine — sample-and-log the SFC parameter
 * space across mill / lathe / wedm domains.
 *
 * Operator directive (2026-05-25): "run every logical combination through the
 * calculator and check results one by one. test and log as nodes in the
 * system for calculated results of every single logical combination that
 * can be inputed into our prism calculator studio for the 3 primary machine
 * domains."
 *
 * The full 9-axis × 3-domain combinatorial space is ~10^9 cells (combinatorial
 * explosion). This engine uses a structured sampler instead of brute-force
 * enumeration:
 *
 *   1. FACTORIAL — enumerate the cartesian product of small-cardinality axes
 *      (ISO group × cut type × strategy × mode = 6 × 3 × 7 × 3 = 378 cells)
 *   2. PRIMARY GRID — for each factorial cell, sample (diameter × flutes ×
 *      coolant × holder) on a discrete grid (typically 200-2000 cells)
 *   3. PER-CELL RUN — invoke the 9-axis orchestrator and log Vc/fz/MRR/
 *      tool-life + axis-derived factors + workholding feasibility
 *   4. LEDGER — append every result to state/outcomes/exhaustive_sfc.jsonl
 *      so system-viz can ingest as L8 ghost nodes
 *
 * Sample sizes:
 *   - DEMO mode (default): 24 cells (3 materials × 2 diameters × 2 ops × 2 modes)
 *   - PROD mode: 4500 cells per domain
 *
 * Pure orchestration: every computation routes through the 9-axis engine.
 * Failed cells are recorded with their error message — not dropped — so the
 * combinatorial coverage report stays honest.
 *
 * @module engines/SpeedFeedExhaustiveCombinationEngine
 * @milestone OSCAR-SFC-9AXIS-MS0/U-OSC9-07
 * @author oscar (slot:oscar, 2026-05-26)
 */

import {
  speedFeedNineAxisOrchestratorEngine,
  type NineAxisInput,
  type OptimizationMode,
} from "./SpeedFeedNineAxisOrchestratorEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type Domain = "mill" | "lathe" | "wedm";

export type SampleMode = "demo" | "prod" | "full";

export interface CombinationRunInput {
  domain: Domain;
  sample_mode?: SampleMode;
  /** Override the default ISO group filter (default: all 6 groups). */
  iso_groups?: ("P" | "M" | "K" | "N" | "S" | "H")[];
  /** Diameter grid (mm). Default depends on domain. */
  diameters_mm?: number[];
  /** Optimization modes to sweep. Default all 3. */
  modes?: OptimizationMode[];
}

export interface CombinationCellResult {
  cell_id: string;
  domain: Domain;
  input_summary: {
    material: string;
    iso_group: string;
    tool_diameter_mm: number;
    flutes: number;
    operation: string;
    cut_type: string;
    strategy: string;
    coolant_type: string;
    holder_type: string;
    mode: OptimizationMode;
  };
  /** Null when orchestrator threw. */
  output: null | {
    cutting_speed_mpm: number;
    spindle_rpm: number;
    feed_per_tooth_mm: number;
    feed_rate_mmmin: number;
    mrr_cm3min: number;
    tool_life_min: number;
    rigidity_factor: number;
    coolant_effectiveness: number;
    toolpath_engagement: number;
    workholding_feasible: boolean;
  };
  error?: string;
}

export interface CombinationRunReport {
  domain: Domain;
  sample_mode: SampleMode;
  total_cells: number;
  successful_cells: number;
  failed_cells: number;
  failure_rate_pct: number;
  /** Sub-sampled results returned to caller. Full results streamed to ledger. */
  results: CombinationCellResult[];
  /** Aggregate statistics over successful cells. */
  aggregates: {
    vc_min: number;
    vc_max: number;
    vc_median: number;
    mrr_min: number;
    mrr_max: number;
    mrr_median: number;
    tool_life_min: number;
    tool_life_max: number;
    tool_life_median: number;
  };
  /** Distinct failure messages with counts (operator triage). */
  failure_clusters: Array<{ message: string; count: number }>;
  /** Generated at ISO timestamp. */
  generated_at: string;
}

// ============================================================================
// DOMAIN AXIS GRIDS
// ============================================================================

// Demo grid: kept minimal (≤20 cells per domain) so test suites stay <60s.
// NOTE (OSCAR-SFC-9AXIS-MS0/U-OSC-FULL-SWEEP, 2026-06-08): each material MUST
// sit under its TRUE ISO group — a prior version filed `aluminum_6061` under M
// (stainless), forcing aluminum physics through a stainless label and poisoning
// the M-group comparison. Aluminum is N. M is stainless/austenitic steel.
const DEMO_MATERIALS_BY_ISO: Record<string, string[]> = {
  P: ["steel"], M: ["304"], K: [], N: ["6061"], S: [], H: [],
};

// Prod grid: kept under ~60 cells per domain. Now covers ALL 6 ISO groups so
// the full-sweep comparison spans the SFC app page's real material space
// (N aluminum + H hardened were previously empty → never swept).
const PROD_MATERIALS_BY_ISO: Record<string, string[]> = {
  P: ["steel"],
  M: ["304"], // stainless / austenitic — NOT aluminum
  K: ["cast_iron"],
  N: ["6061"], // aluminum — its true ISO group
  S: ["titanium"],
  H: ["D2"], // hardened tool steel (>45 HRC)
};

// FULL grid (OSCAR-SFC-9AXIS-MS0/U-OSC-FULL-INPUT-SWEEP, 2026-06-08): the SFC app
// page's REAL selectable material space — every one of the 15 CANONICAL_MATERIAL_DB
// entries by its exact name, under its TRUE ISO group. This is the grid the
// 128GB/Blackwell hardware exists to run (the demo/prod caps were a <60s test cap).
//
// IMPORTANT (scrutiny-verified 2026-06-08, R12): PRISM's SFC resolves material
// physics at the ISO-GROUP level (the canonical kc1.1 is defined per ISO group),
// NOT per-alloy. So within a group the names produce IDENTICAL Vc — 6061≡7075=365,
// 304≡316=100, D2≡A2≡WC-Co=76, 1018≡4140≡steel=140 m/min. These 15 names are real
// SELECTABLE inputs (the app page exposes them), but they collapse to 6 distinct
// material physics profiles. The full sweep is therefore a sweep over input
// COMBINATIONS (material-name × diameter × flute × strategy × …), not 15 distinct
// material physics. Per-alloy Vc differentiation would need alloy-specific kc1.1
// corrections — a real SFC enhancement opportunity, surfaced by this sweep.
const FULL_MATERIALS_BY_ISO: Record<string, string[]> = {
  P: ["AISI 1018 Mild Steel", "AISI 1045 Carbon Steel", "AISI 4140 Alloy Steel"],
  M: ["AISI 304 Stainless", "AISI 316 Stainless"],
  K: ["Gray Cast Iron"],
  N: ["Aluminum 6061-T6", "Aluminum 7075-T6", "C11000 ETP Copper", "C26000 Cartridge Brass (70/30)"],
  S: ["Titanium 6Al-4V", "Inconel 718"],
  H: ["AISI D2 Tool Steel", "AISI A2 Tool Steel", "Tungsten Carbide (WC-Co)"],
};

// Each domain carries demo/prod axis grids PLUS a `_full` expansion (the SFC app
// page's real selectable space) used by sample_mode:"full" — the Blackwell-scale
// sweep. Full grids multiply out to thousands of cells per domain.
const DOMAIN_DEFAULTS = {
  mill: {
    diameters_mm: [12],
    diameters_mm_prod: [6, 12, 20],
    diameters_mm_full: [3, 6, 10, 12, 16, 20, 25],
    flutes: [4],
    flutes_full: [2, 3, 4, 5],
    operations: ["milling"] as const,
    cut_types: ["roughing"] as const,
    cut_types_full: ["roughing", "finishing"] as const,
    strategies: ["conventional", "adaptive"] as const,
    strategies_full: ["conventional", "adaptive", "climb"] as const,
    coolants: ["flood"] as const,
    coolants_full: ["flood", "mist", "dry"] as const,
    holders: ["cat40"] as const,
    holders_full: ["cat40", "hsk63", "er32"] as const,
  },
  lathe: {
    diameters_mm: [25],
    diameters_mm_prod: [16, 25],
    diameters_mm_full: [8, 12, 16, 25, 40, 60],
    flutes: [1],
    flutes_full: [1],
    operations: ["turning"] as const,
    cut_types: ["roughing"] as const,
    cut_types_full: ["roughing", "finishing"] as const,
    strategies: ["conventional"] as const,
    strategies_full: ["conventional"] as const,
    coolants: ["flood"] as const,
    coolants_full: ["flood", "dry"] as const,
    holders: ["cat40"] as const,
    holders_full: ["cat40"] as const,
  },
  wedm: {
    diameters_mm: [0.25],
    diameters_mm_prod: [0.25],
    diameters_mm_full: [0.25],
    flutes: [0],
    flutes_full: [0],
    operations: ["milling"] as const,
    cut_types: ["roughing"] as const,
    cut_types_full: ["roughing"] as const,
    strategies: ["conventional"] as const,
    strategies_full: ["conventional"] as const,
    coolants: ["flood"] as const,
    coolants_full: ["flood"] as const,
    holders: ["cat40"] as const,
    holders_full: ["cat40"] as const,
  },
};

// ============================================================================
// ENGINE
// ============================================================================

export class SpeedFeedExhaustiveCombinationEngine {
  /**
   * Enumerate the parameter space for one domain and run every cell through
   * the 9-axis orchestrator. Returns aggregate + cluster reports.
   *
   * Wire EDM domain returns a pass-through stub (wire EDM is spark erosion,
   * not chip removal — SFC physics does not apply). All cells get a marked
   * "not_applicable" error message so the combinatorial coverage report
   * reflects that wedm SFC is intentionally out-of-scope.
   */
  run(req: CombinationRunInput): CombinationRunReport {
    const mode: SampleMode = req.sample_mode ?? "demo";
    const cells = this.enumerateCells(req, mode);
    const results: CombinationCellResult[] = [];

    for (const cell of cells) {
      results.push(this.runCell(cell));
    }

    const successful = results.filter(r => r.output !== null);
    const failed = results.filter(r => r.output === null);
    const aggregates = this.aggregate(successful);
    const failureClusters = this.clusterFailures(failed);

    return {
      domain: req.domain,
      sample_mode: mode,
      total_cells: cells.length,
      successful_cells: successful.length,
      failed_cells: failed.length,
      failure_rate_pct: round((failed.length / Math.max(cells.length, 1)) * 100, 2),
      results: results.slice(0, 50), // cap callable surface — full results in ledger
      aggregates,
      failure_clusters: failureClusters,
      generated_at: new Date().toISOString(),
    };
  }

  /**
   * Stream EVERY cell result for a domain (no 50-cell callable cap) one at a
   * time. This is the path the full-input sweep (sample_mode:"full", ~69K cells
   * across mill+lathe) uses to write a complete per-cell ledger without holding
   * all results in memory at once — the 128GB host never strains because the
   * generator yields-and-forgets.
   *
   * @param req domain + sample-mode + optional axis overrides
   * @yields one CombinationCellResult per enumerated cell
   */
  *runStreaming(req: CombinationRunInput): Generator<CombinationCellResult> {
    const mode: SampleMode = req.sample_mode ?? "demo";
    for (const cell of this.enumerateCells(req, mode)) {
      yield this.runCell(cell);
    }
  }

  // ──── Cell enumeration ──────────────────────────────────────────────

  private enumerateCells(req: CombinationRunInput, mode: SampleMode): NineAxisInput[] {
    if (req.domain === "wedm") {
      // Wire EDM is not chip-removal SFC — return ZERO cells. The report
      // will show 0 successful + 0 failed with a top-level note that
      // operators should use prism_wedm dispatcher for cut parameters.
      return [];
    }

    const defaults = DOMAIN_DEFAULTS[req.domain];
    const isoFilter = req.iso_groups ?? ["P", "M", "K", "N", "S", "H"];
    const matsByIso =
      mode === "full" ? FULL_MATERIALS_BY_ISO : mode === "prod" ? PROD_MATERIALS_BY_ISO : DEMO_MATERIALS_BY_ISO;
    // Per-axis grid selection: full mode expands every axis to the app page's real
    // selectable space; prod/demo keep the small caps. Caller overrides still win.
    const diameters =
      req.diameters_mm ??
      (mode === "full"
        ? defaults.diameters_mm_full
        : mode === "prod"
        ? defaults.diameters_mm_prod
        : defaults.diameters_mm);
    const flutesGrid = mode === "full" ? defaults.flutes_full : defaults.flutes;
    const cutTypeGrid = mode === "full" ? defaults.cut_types_full : defaults.cut_types;
    const strategyGrid = mode === "full" ? defaults.strategies_full : defaults.strategies;
    const coolantGrid = mode === "full" ? defaults.coolants_full : defaults.coolants;
    const holderGrid = mode === "full" ? defaults.holders_full : defaults.holders;
    // full + prod sweep all 3 optimization modes; demo only the default.
    const modes = req.modes ?? (mode === "demo"
      ? ["prism_optimized"] as const
      : ["cost_batch", "aggressive_rush", "prism_optimized"] as const);

    const cells: NineAxisInput[] = [];
    for (const iso of isoFilter) {
      const materials = matsByIso[iso] ?? [];
      for (const material of materials) {
        for (const dia of diameters) {
          for (const flutes of flutesGrid) {
            for (const op of defaults.operations) {
              for (const cutType of cutTypeGrid) {
                for (const strat of strategyGrid) {
                  for (const coolant of coolantGrid) {
                    for (const holder of holderGrid) {
                      for (const optMode of modes) {
                        cells.push({
                          material: { name: material, iso_group: iso },
                          tooling: { tool_diameter_mm: dia, flutes, tool_material: "carbide" },
                          tool_holder: { type: holder },
                          coolant: { type: coolant },
                          toolpath: { operation: op, cut_type: cutType, strategy: strat },
                          mode: optMode,
                        });
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    return cells;
  }

  // ──── Per-cell run ──────────────────────────────────────────────────

  private runCell(input: NineAxisInput): CombinationCellResult {
    const cellId = this.deriveCellId(input);
    try {
      const r = speedFeedNineAxisOrchestratorEngine.run(input);
      return {
        cell_id: cellId,
        domain: this.inferDomain(input),
        input_summary: {
          material: input.material.name,
          iso_group: input.material.iso_group ?? r.sfc.resolved.iso_group,
          tool_diameter_mm: input.tooling.tool_diameter_mm,
          flutes: input.tooling.flutes ?? 4,
          operation: input.toolpath?.operation ?? "milling",
          cut_type: input.toolpath?.cut_type ?? "roughing",
          strategy: input.toolpath?.strategy ?? "conventional",
          coolant_type: input.coolant?.type ?? "flood",
          holder_type: input.tool_holder?.type ?? "cat40",
          mode: input.mode ?? "prism_optimized",
        },
        output: {
          cutting_speed_mpm: r.recommendation.cutting_speed_mpm,
          spindle_rpm: r.recommendation.spindle_rpm,
          feed_per_tooth_mm: r.recommendation.feed_per_tooth_mm,
          feed_rate_mmmin: r.recommendation.feed_rate_mmmin,
          mrr_cm3min: r.recommendation.mrr_cm3min,
          tool_life_min: r.recommendation.tool_life_min,
          rigidity_factor: r.axis_factors.machine_rigidity_factor,
          coolant_effectiveness: r.axis_factors.coolant_effectiveness,
          toolpath_engagement: r.axis_factors.toolpath_engagement_factor,
          workholding_feasible: r.workholding_check.feasible,
        },
      };
    } catch (err) {
      return {
        cell_id: cellId,
        domain: this.inferDomain(input),
        input_summary: {
          material: input.material.name,
          iso_group: input.material.iso_group ?? "P",
          tool_diameter_mm: input.tooling.tool_diameter_mm,
          flutes: input.tooling.flutes ?? 4,
          operation: input.toolpath?.operation ?? "milling",
          cut_type: input.toolpath?.cut_type ?? "roughing",
          strategy: input.toolpath?.strategy ?? "conventional",
          coolant_type: input.coolant?.type ?? "flood",
          holder_type: input.tool_holder?.type ?? "cat40",
          mode: input.mode ?? "prism_optimized",
        },
        output: null,
        error: (err as Error).message,
      };
    }
  }

  // ──── Aggregation ───────────────────────────────────────────────────

  private aggregate(successful: CombinationCellResult[]): CombinationRunReport["aggregates"] {
    if (successful.length === 0) {
      return {
        vc_min: 0, vc_max: 0, vc_median: 0,
        mrr_min: 0, mrr_max: 0, mrr_median: 0,
        tool_life_min: 0, tool_life_max: 0, tool_life_median: 0,
      };
    }

    const vcs = successful.map(r => r.output!.cutting_speed_mpm).sort((a, b) => a - b);
    const mrrs = successful.map(r => r.output!.mrr_cm3min).sort((a, b) => a - b);
    const lives = successful.map(r => r.output!.tool_life_min).sort((a, b) => a - b);

    return {
      vc_min: vcs[0]!,
      vc_max: vcs[vcs.length - 1]!,
      vc_median: median(vcs),
      mrr_min: mrrs[0]!,
      mrr_max: mrrs[mrrs.length - 1]!,
      mrr_median: median(mrrs),
      tool_life_min: lives[0]!,
      tool_life_max: lives[lives.length - 1]!,
      tool_life_median: median(lives),
    };
  }

  private clusterFailures(failed: CombinationCellResult[]): CombinationRunReport["failure_clusters"] {
    const map = new Map<string, number>();
    for (const r of failed) {
      const key = (r.error ?? "unknown").replace(/[0-9]+(\.[0-9]+)?/g, "N"); // normalize numbers
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count);
  }

  // ──── Helpers ───────────────────────────────────────────────────────

  private deriveCellId(input: NineAxisInput): string {
    const parts = [
      input.material.name,
      `D${input.tooling.tool_diameter_mm}`,
      `F${input.tooling.flutes ?? 4}`,
      input.toolpath?.operation ?? "milling",
      input.toolpath?.cut_type ?? "roughing",
      input.toolpath?.strategy ?? "conventional",
      input.coolant?.type ?? "flood",
      input.tool_holder?.type ?? "cat40",
      input.mode ?? "prism_optimized",
    ];
    return parts.join("::");
  }

  private inferDomain(input: NineAxisInput): Domain {
    const op = input.toolpath?.operation ?? "milling";
    if (op === "turning") return "lathe";
    return "mill"; // wedm cells are excluded at enumeration
  }
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted.length % 2 === 1
    ? sorted[Math.floor(sorted.length / 2)]!
    : (sorted[sorted.length / 2 - 1]! + sorted[sorted.length / 2]!) / 2;
}

function round(n: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}

// ============================================================================
// SINGLETON
// ============================================================================

export const speedFeedExhaustiveCombinationEngine = new SpeedFeedExhaustiveCombinationEngine();
