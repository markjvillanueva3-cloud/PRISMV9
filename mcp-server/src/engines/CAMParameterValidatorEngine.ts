/**
 * CAMParameterValidatorEngine — production CAM parameter validator
 * =============================================================================
 *
 * Phase-5 consumer engine. Validates CAM parameters against:
 *   1. The captured per-CAM function index (catalog top_keys)
 *   2. Plausibility ranges curated from PRISM CAM-EXHAUST-MS0 research
 *   3. Per-CAM capability matrix (same one CAMFunctionRouterEngine uses)
 *
 * Returns severity-tagged issues so callers can choose to fail-hard on errors
 * but proceed-with-caveat on warnings/info. Catalog telemetry remains in the
 * response so dashboards keep their drift signal.
 *
 * Lifted from CAMPhase5Stubs.ts under U-CAM72 to satisfy the milestone
 * deliverable that the validator ship as its own file with a 1:1 test.
 *
 * Authored 2026-04-21 — CAM-EXHAUST-MS0 F5 (stub in CAMPhase5Stubs.ts).
 * Upgraded  2026-04-25 — CAM-EXHAUST-MS0 U-CAM72 (production validation).
 */

import {
  camCatalogLoaderEngine,
  type CAMCatalogLoaderEngine,
} from "./CAMCatalogLoaderEngine.js";
import { isCAMSlug } from "../registries/CAMSystemRegistry.js";

export interface ParamValidationRequest {
  target_cam: string;
  parameters: Record<string, unknown>;
  /** Optional operation/function name — validated against catalog top_keys. */
  operation?: string;
}

export type IssueSeverity = "error" | "warning" | "info";

export interface ParamValidationIssue {
  param: string;
  reason: string;
  severity: IssueSeverity;
}

export interface ParamValidationResult {
  /** True iff there are zero error-severity issues. Warnings do not invalidate. */
  valid: boolean;
  target_cam: string;
  /** Resolved operation name if matched in catalog, else null. */
  matched_operation: string | null;
  errors: ParamValidationIssue[];
  warnings: ParamValidationIssue[];
  info: ParamValidationIssue[];
  /** All issues in encounter order — useful for UI rendering. */
  issues: ParamValidationIssue[];
  /** Number of parameters that were inspected (excludes the operation key). */
  parameters_checked: number;
  /** Catalog drift coverage % (0..100). */
  catalog_coverage_pct: number;
  /** Total catalog parameter count for the target CAM. */
  catalog_param_count: number;
  /** False since U-CAM72 — engine is in production mode. */
  stub: false;
  mode: "production";
}

/**
 * Plausibility ranges for common CAM numeric parameters. These are NOT physics
 * constants (those live in src/physics/constants.ts) — they are upper/lower
 * bounds that any reasonable CNC machine in PRISM's covered fleet respects.
 * Source: aggregated from manufacturer datasheets surveyed in CAM-EXHAUST-MS0.
 *
 * Param-name match is case-insensitive and substring-based so common variants
 * (rpm, spindle_rpm, spindleRpm, n) all hit the same bound.
 */
const PARAM_RANGES: ReadonlyArray<{
  match: ReadonlyArray<string>;
  min: number;
  max: number;
  unit: string;
  reason: string;
}> = [
  { match: ["rpm", "spindle_speed", "spindle_rpm", " n "], min: 10, max: 100_000, unit: "rev/min", reason: "spindle speed outside plausible CNC range" },
  { match: ["feed_rate", "feedrate", "feed_per_min", "vf"], min: 0.001, max: 50_000, unit: "mm/min", reason: "feed rate outside plausible range" },
  { match: ["feed_per_tooth", "fz", "chip_load"], min: 0.0001, max: 5, unit: "mm/tooth", reason: "chip load outside plausible range" },
  { match: ["depth_of_cut", "doc", "ap", "axial_depth"], min: 0.0001, max: 100, unit: "mm", reason: "axial depth outside plausible range" },
  { match: ["radial_depth", "ae", "stepover_mm", "width_of_cut"], min: 0.0001, max: 200, unit: "mm", reason: "radial depth outside plausible range" },
  { match: ["stepover_pct", "stepover_percent", "radial_engagement_pct"], min: 0.001, max: 1.0, unit: "fraction", reason: "stepover fraction must be in (0,1]" },
  { match: ["tool_diameter", "diameter", "d_tool"], min: 0.05, max: 250, unit: "mm", reason: "tool diameter outside plausible range" },
  { match: ["coolant_pressure", "tsc_pressure"], min: 0, max: 1000, unit: "bar", reason: "coolant pressure outside plausible range" },
  { match: ["coolant_flow", "flow_lpm"], min: 0, max: 5000, unit: "L/min", reason: "coolant flow outside plausible range" },
  { match: ["tool_length", "length", "stick_out", "overhang"], min: 0.1, max: 1000, unit: "mm", reason: "tool length outside plausible range" },
];

/**
 * Per-CAM capability hints — used to flag operations that the chosen CAM
 * does not advertise support for. Mirrors CAMFunctionRouterEngine's matrix
 * but kept independent so the two engines can evolve separately.
 */
const CAM_CAPABILITY: Record<string, ReadonlyArray<string>> = {
  hypermill: ["5-axis", "5axis", "maxx", "millturn", "swarf", "tube", "blade"],
  mastercam: ["2d", "lathe", "wire-edm", "wire", "edm", "high-speed", "dynamic"],
  fusion360: ["adaptive", "parametric", "general"],
  "inventor-hsm": ["adaptive", "clearing", "hsm"],
  solidcam: ["imachining", "swiss", "advanced-mill", "turning", "millturn"],
  "nx-cam": ["aerospace", "5-axis", "feature-based", "mold"],
  powermill: ["mold", "die", "5-axis", "vortex"],
  "catia-machining": ["aerospace", "automotive", "surface", "5-axis"],
};

/** Hints that an intent/operation needs 5-axis capability. */
const FIVE_AXIS_HINTS = ["5-axis", "5axis", "five-axis", "swarf", "multi-axis", "simultaneous"];

export class CAMParameterValidatorEngine {
  constructor(private loader: CAMCatalogLoaderEngine = camCatalogLoaderEngine) {}

  validate(req: ParamValidationRequest): ParamValidationResult {
    const issues: ParamValidationIssue[] = [];
    const target = req.target_cam;

    // 1. Unknown CAM slug → hard error, skip the rest.
    if (!isCAMSlug(target)) {
      issues.push({
        param: "target_cam",
        reason: `unknown CAM slug "${target}" — not in CAMSystemRegistry`,
        severity: "error",
      });
      return this.assemble(issues, target, null, 0, 0, 0);
    }

    const sys = this.loader.loadOne(target);
    const drift = this.loader.loadAll().drift_report.find((d) => d.slug === target);
    const coverage = drift?.coverage_pct ?? 0;
    const catalogParamCount = sys.total_param_count;

    // 2. Catalog-coverage degradation flag.
    if (coverage === 0) {
      issues.push({
        param: "*",
        reason: `${target} catalog has 0% coverage — validation is structural only`,
        severity: "info",
      });
    } else if (coverage < 80) {
      issues.push({
        param: "*",
        reason: `${target} catalog coverage ${coverage}% — some unknown params may slip through`,
        severity: "warning",
      });
    }

    // 3. Operation-vs-catalog match.
    let matched_operation: string | null = null;
    if (req.operation !== undefined && req.operation.length > 0) {
      matched_operation = this.matchOperation(req.operation, sys);
      if (matched_operation === null && coverage > 0) {
        issues.push({
          param: "operation",
          reason: `operation "${req.operation}" not found in ${target} catalog`,
          severity: "error",
        });
      }
      // Capability cross-check — flag 5-axis ops on non-5-axis CAMs.
      const opLower = req.operation.toLowerCase();
      const wantsFiveAxis = FIVE_AXIS_HINTS.some((h) => opLower.includes(h));
      const hasFiveAxis = (CAM_CAPABILITY[target] ?? []).some((c) =>
        FIVE_AXIS_HINTS.includes(c),
      );
      if (wantsFiveAxis && !hasFiveAxis) {
        issues.push({
          param: "operation",
          reason: `operation requires 5-axis capability but ${target} does not advertise it`,
          severity: "warning",
        });
      }
    }

    // 4. Per-parameter range + type checks.
    let parameters_checked = 0;
    for (const [name, raw] of Object.entries(req.parameters)) {
      parameters_checked += 1;

      if (raw === null || raw === undefined) {
        issues.push({
          param: name,
          reason: "value is null/undefined",
          severity: "warning",
        });
        continue;
      }

      // Numeric range guards.
      if (typeof raw === "number") {
        if (!Number.isFinite(raw)) {
          issues.push({
            param: name,
            reason: `non-finite numeric value (${raw})`,
            severity: "error",
          });
          continue;
        }
        const range = this.matchRange(name);
        if (range && (raw < range.min || raw > range.max)) {
          issues.push({
            param: name,
            reason: `${range.reason}: ${raw} ${range.unit} not in [${range.min}, ${range.max}]`,
            severity: "error",
          });
        }
        continue;
      }

      // Numeric-shaped param given a non-number → type error.
      if (this.matchRange(name) !== null && typeof raw !== "number") {
        issues.push({
          param: name,
          reason: `expected number, got ${typeof raw}`,
          severity: "error",
        });
      }
    }

    return this.assemble(
      issues,
      target,
      matched_operation,
      parameters_checked,
      coverage,
      catalogParamCount,
    );
  }

  /** Fuzzy-match an operation name against catalog top_keys. */
  private matchOperation(
    operation: string,
    sys: ReturnType<CAMCatalogLoaderEngine["loadOne"]>,
  ): string | null {
    const op = operation.toLowerCase();
    for (const file of [...sys.functions_files, ...sys.ui_files]) {
      for (const key of file.top_keys) {
        const k = key.toLowerCase();
        if (k === op || k.includes(op) || op.includes(k)) return key;
      }
    }
    return null;
  }

  /** Find a plausibility range for a parameter name (case-insensitive substring). */
  private matchRange(name: string): typeof PARAM_RANGES[number] | null {
    const lc = name.toLowerCase();
    for (const r of PARAM_RANGES) {
      for (const m of r.match) {
        if (lc.includes(m.trim())) return r;
      }
    }
    return null;
  }

  private assemble(
    issues: ParamValidationIssue[],
    target_cam: string,
    matched_operation: string | null,
    parameters_checked: number,
    catalog_coverage_pct: number,
    catalog_param_count: number,
  ): ParamValidationResult {
    const errors = issues.filter((i) => i.severity === "error");
    const warnings = issues.filter((i) => i.severity === "warning");
    const info = issues.filter((i) => i.severity === "info");
    return {
      valid: errors.length === 0,
      target_cam,
      matched_operation,
      errors,
      warnings,
      info,
      issues,
      parameters_checked,
      catalog_coverage_pct,
      catalog_param_count,
      stub: false,
      mode: "production",
    };
  }
}

export const camParameterValidatorEngine = new CAMParameterValidatorEngine();
