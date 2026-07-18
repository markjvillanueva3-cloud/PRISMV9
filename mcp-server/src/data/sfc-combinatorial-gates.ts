/**
 * SFC combinatorial per-cell GATES -- the honesty core of the validation harness.
 *
 * OSCAR-SFC-9AXIS-MS0 / U-CSFH-05-GATES (slot:oscar, 2026-06-10).
 *
 * Three deterministic gates applied to each cell's UltimateSpeedFeedResult before
 * it is allowed to feed baseline-parameter derivation (U-CSFH-08):
 *   1. UNITS   -- the core OptimizedValues carry their canonical unit strings.
 *   2. CHATTER -- the recommendation sits in a stable lobe (Altintas SLD); an
 *      unstable cell FAILs, a regime where SLD does not apply is honest-limited.
 *   3. PHYSICS-VALID-OR-HONEST-LIMITED -- the silent-default detector: a core
 *      value resolved from a `source:"default"` is allowed ONLY if the engine
 *      surfaced it via `inferred_parameters[]`/`warnings[]`. A silent default
 *      (default source with NO flag) FAILs the cell -- this is the punch-list of
 *      engine-honesty gaps the plan calls for, never a value we quietly trust.
 *
 * PURE + deterministic -- imports only the `OptimizedValue` TYPE, never `vitest`
 * and never the engine runtime; the sampler/driver (U-CSFH-04/06) import it. Lives
 * in `src/data/` (not `engines/`) matching the U-CSFH-01/02 precedent for pure
 * harness logic: runtime-importable, no test-tree dependency, and not an
 * orphan-blockable standalone engine ahead of its consumer (the driver, U-CSFH-06,
 * is its sole consumer; a dispatcher surface is deferred to U-CSFH-10).
 *
 * No physics CONSTANTS live here -- the gate inspects an already-computed result;
 * kc1.1/Taylor/SLD constants stay in `physics/constants.ts` per soul-refuse.
 */
import type { OptimizedValue } from "../engines/UltimateSpeedFeedEngine.js";

/** pass = clean · honest_limited = acknowledged caveat · fail = hard violation. */
export type GateStatus = "pass" | "honest_limited" | "fail";

/** One gate's verdict. `failures` non-empty => fail; only `caveats` => honest_limited. */
export interface GateResult {
  status: GateStatus;
  failures: string[];
  caveats: string[];
}

/**
 * The minimal structural shape the gates inspect. The full
 * `UltimateSpeedFeedResult` is structurally assignable to this, so the driver can
 * pass a real result and tests can build a tiny fixture.
 */
export interface GateableResult {
  cutting_speed: Pick<OptimizedValue, "value" | "unit" | "source">;
  spindle_rpm: Pick<OptimizedValue, "value" | "unit" | "source">;
  feed_rate: Pick<OptimizedValue, "value" | "unit" | "source">;
  mrr: Pick<OptimizedValue, "value" | "unit" | "source">;
  forces: { resultant_force_N: Pick<OptimizedValue, "value" | "unit" | "source"> };
  power: { required_power_kw: Pick<OptimizedValue, "value" | "unit" | "source"> };
  stability: { is_stable: boolean; critical_depth_mm: Pick<OptimizedValue, "source"> };
  inferred_parameters: string[];
  warnings: string[];
}

/** Combined verdict across the three gates. */
export interface CellGateVerdict {
  units: GateResult;
  chatter: GateResult;
  physics: GateResult;
  overall: GateStatus;
  failures: string[]; // flattened across gates
  caveats: string[]; // flattened across gates
}

/**
 * Canonical unit strings the core OptimizedValues MUST carry -- matched EXACTLY
 * against what UltimateSpeedFeedEngine emits (cross-checked vs the
 * assertCanonicalUnits oracle). The `cm³/min` superscript-three is the literal
 * unit string the engine produces, so the comparison must use the same literal.
 */
const CANONICAL_UNITS = {
  cutting_speed: "m/min",
  spindle_rpm: "RPM",
  feed_rate: "mm/min",
  mrr: "cm³/min",
  resultant_force_N: "N",
  required_power_kw: "kW",
} as const;

/** Severity order so a combined verdict takes the worst contributing status. */
const SEVERITY: Record<GateStatus, number> = { pass: 0, honest_limited: 1, fail: 2 };
function worst(a: GateStatus, b: GateStatus): GateStatus {
  return SEVERITY[a] >= SEVERITY[b] ? a : b;
}
function resultFrom(failures: string[], caveats: string[]): GateResult {
  const status: GateStatus = failures.length > 0 ? "fail" : caveats.length > 0 ? "honest_limited" : "pass";
  return { status, failures, caveats };
}

/** GATE 1 -- every core OptimizedValue carries its canonical unit string. */
export function gateUnits(r: GateableResult): GateResult {
  const failures: string[] = [];
  const checks: Array<[keyof typeof CANONICAL_UNITS, string]> = [
    ["cutting_speed", r.cutting_speed.unit],
    ["spindle_rpm", r.spindle_rpm.unit],
    ["feed_rate", r.feed_rate.unit],
    ["mrr", r.mrr.unit],
    ["resultant_force_N", r.forces.resultant_force_N.unit],
    ["required_power_kw", r.power.required_power_kw.unit],
  ];
  for (const [field, actual] of checks) {
    const expected = CANONICAL_UNITS[field];
    if (actual !== expected) {
      failures.push(`units: ${field} unit '${actual}' != canonical '${expected}'`);
    }
  }
  return resultFrom(failures, []);
}

/**
 * GATE 2 -- chatter stability. An unstable cell (is_stable=false on a real SLD
 * result) FAILs. When the stability lobe was not computed for this regime
 * (`critical_depth_mm.source === "default"` -- e.g. an axially-fed op where the
 * milling SLD does not apply) the cell is honest-limited, not silently passed.
 */
export function gateChatter(r: GateableResult): GateResult {
  const failures: string[] = [];
  const caveats: string[] = [];
  if (r.stability.critical_depth_mm.source === "default") {
    caveats.push("chatter: stability lobe not assessed for this regime (critical_depth defaulted) -- treat as honest-limited");
  } else if (!r.stability.is_stable) {
    failures.push("chatter: stability.is_stable=false -- recommendation sits in an unstable lobe");
  }
  return resultFrom(failures, caveats);
}

/**
 * GATE 3 -- physics-valid-or-honest-limited. A core value with `source:"default"`
 * is a silent default (FAIL) unless the engine NAMED that specific field in
 * `inferred_parameters[]` or in a warning string. The check is PER-FIELD, not a
 * global flag: an unrelated warning/inference must never launder a different
 * field's silent default into honest_limited (that would let a fabricated value
 * reach baseline derivation, U-CSFH-08). No defaults => pass; named defaults =>
 * honest-limited; a defaulted-but-unnamed field => fail. Stricter is the SAFE
 * direction here -- a false fail only segregates a cell; a false honest_limited
 * poisons the baseline.
 */
export function gatePhysics(r: GateableResult): GateResult {
  const failures: string[] = [];
  const caveats: string[] = [];
  const core: Array<[string, Pick<OptimizedValue, "source">]> = [
    ["cutting_speed", r.cutting_speed],
    ["spindle_rpm", r.spindle_rpm],
    ["feed_rate", r.feed_rate],
    ["mrr", r.mrr],
    ["resultant_force_N", r.forces.resultant_force_N],
    ["required_power_kw", r.power.required_power_kw],
  ];
  const silent: string[] = [];
  const surfaced: string[] = [];
  for (const [field, v] of core) {
    if (v.source !== "default") continue;
    // Word-boundary match (not raw substring) so a warning about one field can
    // never incidentally name another via a composite token. Field keys are
    // `[A-Za-z_]`-only so they need no regex escaping. A miss => conservative FAIL
    // (the safe direction: over-segregate, never poison the baseline).
    const tokenRe = new RegExp(`\\b${field}\\b`);
    const named = r.inferred_parameters.includes(field) || r.warnings.some((w) => tokenRe.test(w));
    (named ? surfaced : silent).push(field);
  }
  if (silent.length > 0) {
    failures.push(`physics: SILENT DEFAULT -- core value(s) [${silent.join(", ")}] have source='default' and are NOT named in inferred_parameters/warnings`);
  }
  if (surfaced.length > 0) {
    caveats.push(`physics: ${surfaced.length} core value(s) [${surfaced.join(", ")}] defaulted but named in inferred_parameters/warnings`);
  }
  return resultFrom(failures, caveats);
}

/** Run all three gates and combine (overall takes the worst contributing status). */
export function gateCell(r: GateableResult): CellGateVerdict {
  const units = gateUnits(r);
  const chatter = gateChatter(r);
  const physics = gatePhysics(r);
  const overall = worst(worst(units.status, chatter.status), physics.status);
  return {
    units,
    chatter,
    physics,
    overall,
    failures: [...units.failures, ...chatter.failures, ...physics.failures],
    caveats: [...units.caveats, ...chatter.caveats, ...physics.caveats],
  };
}

/** A cell may feed baseline derivation iff it did not hard-FAIL any gate. */
export function passesGate(r: GateableResult): boolean {
  return gateCell(r).overall !== "fail";
}
