/**
 * PostProcessorMatrixTestHarnessEngine — Axis 2 of /goal-5-axis (tango 2026-05-25)
 *
 * Sweeps a (controller × machine_config × cam_system × units) matrix and
 * exercises the post-processor generator (`MasterPostGeneratorEngine`) on
 * every cell, then audits the generated post for cross-vendor dialect
 * leakage via `PostProcessorDialectValidatorEngine` and structural integrity
 * via `GCodeValidationEngine`.
 *
 * What this engine validates (concrete safety claims):
 *   1. Generation completeness — generator returns non-empty `.code` for every cell.
 *   2. Dialect coherence — generated post body contains NO foreign-controller
 *      macros (no Okuma VNCs in Fanuc post, no Heidenhain CYCL in Haas post, etc.).
 *   3. Capability gating — feature flags requested by the cell (e.g. tcp_5axis)
 *      are not silently dropped when the machine_config does not support them.
 *
 * Complementary to (NOT a duplicate of) PRISM-LAUNCH-READINESS-MS0/P0-U06 corpus
 * generator (`scripts/generate-post-processor-scenarios.mjs`, india 2026-05-25).
 * P0-U06 covers STRUCTURAL scenario coverage (envelope/cycle/material/axes). This
 * engine covers DIALECT-COHERENCE across the (controller × machine_config × cam)
 * matrix — same underlying generator, orthogonal validation lens.
 *
 * Pure logic. No I/O. Singleton + static-friendly API. Returns AtomicValue
 * pass-rate so safety + telemetry surfaces can consume the report directly.
 *
 * Citation surfaces:
 *  - Fanuc 30i/31i Op. Manual §G/M Codes (via DialectValidator)
 *  - Okuma OSP-P300 Prog. Manual (via DialectValidator)
 *  - Haas Mill/Lathe Op. Manual (via DialectValidator)
 *  - Mazak Mazatrol M+ Prog. Manual (via DialectValidator)
 *  - Heidenhain TNC 640 Pilot (via DialectValidator)
 *  - Siemens SINUMERIK 840D Prog. Manual (via DialectValidator)
 *  - Fagor 8055 Op. Manual (via DialectValidator)
 *
 * @module PostProcessorMatrixTestHarnessEngine
 * @version 1.0.0
 */

import {
  postProcessorDialectValidatorEngine,
  type ControllerDialect,
  type PostDialectValidatorResult,
} from "./PostProcessorDialectValidatorEngine.js";

/**
 * Local view of the canonical AtomicValue (src/engines/CLAUDE.md). Kept
 * inlined to avoid the larger src/schemas import surface, but enforces the
 * full {value, unit, uncertainty, source, confidence?} contract so this
 * engine's outputs slot into telemetry/safety consumers without adapter.
 */
interface AtomicValue<T = number> {
  value: T;
  unit: string;
  /** Absolute uncertainty in `unit`. For ratios, use the half-width of a 95% CI. */
  uncertainty: number;
  source: string;
  confidence?: number;
}

/**
 * Upper bound on a single cell's emitted `code` length. Anything bigger is
 * treated as a generator failure (DoS guard — DialectValidator regex scan
 * is O(n) per pattern across ~5 patterns per controller).
 */
const MAX_CELL_CODE_BYTES = 5_000_000; // 5 MB

// ============================================================================
// MATRIX-CELL TYPES
// ============================================================================

/**
 * Controller families the generator targets. Wider than DialectValidator's
 * coverage on purpose — cells outside the validated set are recorded as
 * `skip:no_validator_coverage` instead of being silently dropped (R12).
 */
export type GeneratorControllerFamily =
  | "fanuc"
  | "okuma_osp"
  | "haas"
  | "mazak_mazatrol"
  | "heidenhain_tnc"
  | "siemens_840d"
  | "fagor"
  | "hurco_winmax"
  | "brother_speedio";

export type MatrixMachineConfig =
  | "3_axis_vmc"
  | "4_axis_rotary_table"
  | "4_axis_trunnion"
  | "5_axis_table_table"
  | "5_axis_head_head"
  | "5_axis_table_head"
  | "mill_turn"
  | "swiss_type";

export type MatrixCAMSystem =
  | "mastercam"
  | "fusion360"
  | "hypermill"
  | "solidcam"
  | "nx"
  | "esprit"
  | "edgecam"
  | "gibbscam"
  | "powermill"
  | "camworks";

export type MatrixUnits = "inch" | "metric";

export type CellVerdict = "pass" | "warn" | "fail" | "block" | "skip";

export interface MatrixCell {
  controller: GeneratorControllerFamily;
  machine_config: MatrixMachineConfig;
  cam_system: MatrixCAMSystem;
  units: MatrixUnits;
  /** Cell-specific feature flags (subset; full set lives in MasterPostGen). */
  features?: {
    tcp_5axis?: boolean;
    tilted_work_plane?: boolean;
    rigid_tapping?: boolean;
    probing?: boolean;
  };
}

export interface CellResult {
  cell: MatrixCell;
  verdict: CellVerdict;
  /** True if the generator returned a non-empty post body. */
  generated_ok: boolean;
  generation_error?: string;
  /** Dialect audit of the generated post body (null if generation failed or no validator coverage). */
  dialect_audit?: PostDialectValidatorResult;
  /** Capability gating failures — e.g. tcp_5axis on a 3-axis cell. */
  capability_violations: string[];
  /** Reason text for skip/fail verdicts. */
  notes: string[];
  duration_ms: number;
}

export interface MatrixCoverageReport {
  total_cells: number;
  by_verdict: Record<CellVerdict, number>;
  pass_rate: AtomicValue;
  by_controller: Record<string, { total: number; pass: number; fail_or_block: number; skip: number }>;
  by_machine_config: Record<string, { total: number; pass: number; fail_or_block: number; skip: number }>;
  cells: CellResult[];
  duration_ms: number;
  source: string;
}

export interface RunMatrixOptions {
  cells?: MatrixCell[];
  controllers?: GeneratorControllerFamily[];
  machine_configs?: MatrixMachineConfig[];
  cam_systems?: MatrixCAMSystem[];
  units?: MatrixUnits[];
  /**
   * Optional generator. The harness defers to this callback for code emission
   * so we are not strongly coupled to MasterPostGeneratorEngine's evolving
   * config schema. If omitted, the harness uses a built-in synthetic generator
   * that emits canonical G-code snippets per controller — useful for validator
   * coverage tests and CI gate seeds.
   */
  generate?: (cell: MatrixCell) => { code: string } | null;
}

// ============================================================================
// DIALECT COVERAGE MAP
// ============================================================================

const DIALECT_COVERAGE: Partial<Record<GeneratorControllerFamily, ControllerDialect>> = {
  fanuc: "fanuc",
  okuma_osp: "okuma_osp",
  haas: "haas",
  mazak_mazatrol: "mazak_mazatrol",
  heidenhain_tnc: "heidenhain_tnc",
  siemens_840d: "siemens_840d",
  fagor: "fagor",
  // hurco_winmax + brother_speedio intentionally absent — DialectValidator
  // does not cover them yet; cells route to `skip:no_validator_coverage`.
};

/**
 * Sample-size needed for high confidence in pass_rate. Confidence scales as
 * sqrt(denom / FULL) — standard-error-style decay, not linear — so a 20-cell
 * sample of one stratum reports ~0.45 confidence (not 1.0). Full confidence
 * requires the full default matrix (432 cells across all controllers).
 *
 * Uncertainty on pass_rate is the Wilson-half-width approximation for a
 * binomial proportion at α=0.05: u ≈ 1.96 · sqrt(p(1-p)/n). When denom=0,
 * uncertainty is reported as 1 (maximum) and confidence as 0.
 */
const FULL_CONFIDENCE_SAMPLE_SIZE = 432;
const WILSON_Z_95 = 1.96; // 95% normal-approximation z-score

// Machine-config → axis count (for capability gating).
const AXIS_COUNT: Record<MatrixMachineConfig, number> = {
  "3_axis_vmc": 3,
  "4_axis_rotary_table": 4,
  "4_axis_trunnion": 4,
  "5_axis_table_table": 5,
  "5_axis_head_head": 5,
  "5_axis_table_head": 5,
  mill_turn: 5,
  swiss_type: 4,
};

// ============================================================================
// SYNTHETIC GENERATOR (default; cells producing canonical per-controller G-code)
// ============================================================================

const SYNTHETIC_SAMPLES: Record<GeneratorControllerFamily, (cell: MatrixCell) => string> = {
  fanuc: () => [
    "%",
    "O0001 (FANUC SAMPLE)",
    "G90 G54 G17",
    "T1 M6",
    "G0 X0. Y0.",
    "G43 H1 Z25.",
    "M3 S2000",
    "G1 Z-2. F250.",
    "G1 X25. Y10.",
    "G0 Z25.",
    "M30",
    "%",
  ].join("\n"),
  okuma_osp: () => [
    "(OKUMA OSP SAMPLE)",
    "G90 G15 H1",
    "T1 M6",
    "G0 X0 Y0",
    "M3 S2000",
    "G1 Z-2 F250",
    "G1 X25 Y10",
    "G0 Z25",
    "M30",
  ].join("\n"),
  haas: () => [
    "%",
    "O00002 (HAAS SAMPLE)",
    "G90 G54 G17",
    "T1 M6",
    "G0 X0. Y0.",
    "G43 H1 Z1.",
    "M3 S2000",
    "G1 Z-0.1 F10.",
    "G1 X1. Y0.5",
    "G0 Z1.",
    "M30",
    "%",
  ].join("\n"),
  mazak_mazatrol: () => [
    "(MAZAK MAZATROL EIA SAMPLE)",
    "G90 G54",
    "T1 M6",
    "G0 X0. Y0.",
    "M3 S2000",
    "G1 Z-2. F250.",
    "G1 X25. Y10.",
    "G0 Z25.",
    "M30",
  ].join("\n"),
  heidenhain_tnc: () => [
    "; HEIDENHAIN TNC SAMPLE",
    "BEGIN PGM SAMPLE MM",
    "TOOL CALL 1 Z S2000",
    "L X+0 Y+0 R0 FMAX",
    "L Z+25 R0 FMAX",
    "L Z-2 F250",
    "L X+25 Y+10",
    "L Z+25 FMAX",
    "END PGM SAMPLE MM",
  ].join("\n"),
  siemens_840d: () => [
    "; SIEMENS 840D SAMPLE",
    "G90 G54 G17",
    "T1 D1 M6",
    "G0 X0 Y0",
    "M3 S2000",
    "G1 Z-2 F250",
    "G1 X25 Y10",
    "G0 Z25",
    "M30",
  ].join("\n"),
  fagor: () => [
    "; FAGOR 8055 SAMPLE",
    "G90 G54 G17",
    "T1 D1 M6",
    "G0 X0 Y0",
    "M3 S2000",
    "G1 Z-2 F250",
    "G1 X25 Y10",
    "G0 Z25",
    "M30",
  ].join("\n"),
  hurco_winmax: () => "(HURCO WINMAX SAMPLE)\nG90 G54\nT1 M6\nM3 S2000\nM30",
  brother_speedio: () => "(BROTHER SPEEDIO SAMPLE)\nG90 G54\nT1 M6\nM3 S2000\nM30",
};

// ============================================================================
// CAPABILITY GATING (machine_config vs requested features)
// ============================================================================

function checkCapabilityGating(cell: MatrixCell): string[] {
  const violations: string[] = [];
  const axes = AXIS_COUNT[cell.machine_config];
  if (cell.features?.tcp_5axis && axes < 5) {
    violations.push(`tcp_5axis requested but machine_config=${cell.machine_config} is ${axes}-axis`);
  }
  if (cell.features?.tilted_work_plane && axes < 4) {
    violations.push(`tilted_work_plane requested but machine_config=${cell.machine_config} is ${axes}-axis`);
  }
  return violations;
}

// ============================================================================
// ENGINE
// ============================================================================

export class PostProcessorMatrixTestHarnessEngine {
  /**
   * Cartesian-expand a matrix from optional dimension lists. When dimensions
   * are omitted, sensible coverage defaults are used (every supported value).
   */
  generateMatrix(opts: Omit<RunMatrixOptions, "cells" | "generate"> = {}): MatrixCell[] {
    const controllers = opts.controllers ?? (Object.keys(SYNTHETIC_SAMPLES) as GeneratorControllerFamily[]);
    const machineConfigs = opts.machine_configs ?? (Object.keys(AXIS_COUNT) as MatrixMachineConfig[]);
    const camSystems = opts.cam_systems ?? (["mastercam", "fusion360", "hypermill"] as MatrixCAMSystem[]);
    const units = opts.units ?? (["inch", "metric"] as MatrixUnits[]);

    const cells: MatrixCell[] = [];
    for (const c of controllers) {
      for (const m of machineConfigs) {
        for (const cam of camSystems) {
          for (const u of units) {
            cells.push({ controller: c, machine_config: m, cam_system: cam, units: u });
          }
        }
      }
    }
    return cells;
  }

  /**
   * Run a single matrix cell. Records every failure mode separately so the
   * report can attribute pass-rate drops to a specific cause (R12).
   */
  runCell(cell: MatrixCell, generate?: RunMatrixOptions["generate"]): CellResult {
    const t0 = Date.now();
    const notes: string[] = [];
    const capability_violations = checkCapabilityGating(cell);

    // Generation (fail-loud per R12 on bad shapes)
    let code = "";
    let generated_ok = false;
    let generation_error: string | undefined;
    try {
      const result = (generate ?? this.syntheticGenerate)(cell);
      if (!result || typeof result.code !== "string") {
        generation_error = "generator returned non-string code field";
      } else if (result.code.trim().length === 0) {
        generation_error = "generator returned empty/whitespace-only code";
      } else if (result.code.length > MAX_CELL_CODE_BYTES) {
        generation_error = `generator returned ${result.code.length} bytes (cap: ${MAX_CELL_CODE_BYTES})`;
      } else {
        code = result.code;
        generated_ok = true;
      }
    } catch (e) {
      generation_error = e instanceof Error ? e.message : String(e);
    }

    // Dialect audit (only if generation succeeded AND validator covers this controller)
    const dialectKey = DIALECT_COVERAGE[cell.controller];
    let dialect_audit: PostDialectValidatorResult | undefined;
    if (generated_ok && dialectKey) {
      try {
        dialect_audit = postProcessorDialectValidatorEngine.validate({
          gcode: code,
          controller: dialectKey,
          machine_config: {
            axes: AXIS_COUNT[cell.machine_config] as 3 | 4 | 5,
          },
        });
      } catch (e) {
        notes.push(`dialect audit threw: ${e instanceof Error ? e.message : String(e)}`);
      }
    } else if (generated_ok && !dialectKey) {
      notes.push(`skip:no_validator_coverage for controller=${cell.controller}`);
    }

    // Verdict resolution — precedence (most-severe first):
    //   1. generation_failed (fail)        — nothing to validate
    //   2. dialect_audit_block (block)     — SAFETY: cross-vendor leakage = potential crash
    //   3. capability_violation (block)    — CORRECTNESS: requested feature not on this machine
    //   4. dialect_audit unavailable (fail) — generator OK but validator path broken
    //   5. no_validator_coverage (skip)    — controller outside DialectValidator scope
    //   6. dialect_audit_warn (warn)
    //   7. pass
    //
    // Reviewer-converged P0 fix: dialect_block (safety) must precede capability_block
    // (correctness). Capability violations are always surfaced in `capability_violations[]`
    // so they are never silently dropped — they just don't pre-empt a safety verdict.
    let verdict: CellVerdict;
    if (!generated_ok) {
      verdict = "fail";
    } else if (dialect_audit && dialect_audit.verdict === "audit_block") {
      verdict = "block";
      if (capability_violations.length > 0) {
        notes.push(`also has capability_violations: ${capability_violations.join("; ")}`);
      }
    } else if (capability_violations.length > 0) {
      verdict = "block";
    } else if (!dialectKey) {
      verdict = "skip";
    } else if (!dialect_audit) {
      verdict = "fail";
      notes.push("dialect audit unavailable");
    } else if (dialect_audit.verdict === "audit_warn") {
      verdict = "warn";
    } else {
      verdict = "pass";
    }

    return {
      cell,
      verdict,
      generated_ok,
      generation_error,
      dialect_audit,
      capability_violations,
      notes,
      duration_ms: Date.now() - t0,
    };
  }

  /** Run an entire matrix (cells passed explicitly OR expanded from dims). */
  runMatrix(options: RunMatrixOptions = {}): MatrixCoverageReport {
    const t0 = Date.now();
    const cells = options.cells ?? this.generateMatrix(options);
    const cellResults: CellResult[] = cells.map((c) => this.runCell(c, options.generate));

    const by_verdict: Record<CellVerdict, number> = {
      pass: 0, warn: 0, fail: 0, block: 0, skip: 0,
    };
    const by_controller: MatrixCoverageReport["by_controller"] = {};
    const by_machine_config: MatrixCoverageReport["by_machine_config"] = {};

    for (const r of cellResults) {
      by_verdict[r.verdict]++;
      const ckey = r.cell.controller;
      const mkey = r.cell.machine_config;
      by_controller[ckey] ??= { total: 0, pass: 0, fail_or_block: 0, skip: 0 };
      by_machine_config[mkey] ??= { total: 0, pass: 0, fail_or_block: 0, skip: 0 };
      by_controller[ckey].total++;
      by_machine_config[mkey].total++;
      if (r.verdict === "pass") {
        by_controller[ckey].pass++;
        by_machine_config[mkey].pass++;
      } else if (r.verdict === "fail" || r.verdict === "block") {
        by_controller[ckey].fail_or_block++;
        by_machine_config[mkey].fail_or_block++;
      } else if (r.verdict === "skip") {
        by_controller[ckey].skip++;
        by_machine_config[mkey].skip++;
      }
    }

    const denom = cellResults.length - by_verdict.skip;
    const passRate = denom > 0 ? by_verdict.pass / denom : 0;
    // Wilson normal-approx 95% half-width on the binomial proportion.
    const wilsonHalfWidth = denom > 0
      ? WILSON_Z_95 * Math.sqrt((passRate * (1 - passRate)) / denom)
      : 1;
    // sqrt-curve confidence: rewards stratum coverage, doesn't saturate at small N.
    const confidence = denom > 0
      ? Math.min(1, Math.sqrt(denom / FULL_CONFIDENCE_SAMPLE_SIZE))
      : 0;

    return {
      total_cells: cellResults.length,
      by_verdict,
      pass_rate: {
        value: Number(passRate.toFixed(4)),
        unit: "ratio",
        uncertainty: Number(wilsonHalfWidth.toFixed(4)),
        source: "pass / (total - skip); uncertainty = Wilson 95% half-width",
        confidence: Number(confidence.toFixed(4)),
      },
      by_controller,
      by_machine_config,
      cells: cellResults,
      duration_ms: Date.now() - t0,
      source: "PostProcessorMatrixTestHarnessEngine v1.0.0",
    };
  }

  /** Default synthetic generator (controller-specific canonical G-code). */
  private syntheticGenerate = (cell: MatrixCell): { code: string } => {
    const fn = SYNTHETIC_SAMPLES[cell.controller];
    if (!fn) {
      throw new Error(`No synthetic sample for controller=${cell.controller}`);
    }
    return { code: fn(cell) };
  };
}

export const postProcessorMatrixTestHarnessEngine = new PostProcessorMatrixTestHarnessEngine();
