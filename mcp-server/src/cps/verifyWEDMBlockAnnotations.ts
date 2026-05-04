/**
 * verifyWEDMBlockAnnotations — Per-block WEDM physics consistency gate
 * (PPG-WIRE-MS6/U-PPGM17b, schema 1.2.0).
 *
 * Parallel to mcp-server/src/cps/verifyBlockAnnotations.ts (milling/turning
 * S/F gate) but reasons over the disjoint WEDM emit shape — power_setting,
 * on_time_us, off_time_us, servo_voltage_v, wire_speed_m_min, wire_tension_g,
 * flushing_pressure, pass_type. The milling verifier cannot be reused: its
 * G-code parser walks Nxxx labels with S/F tokens; WEDM emits no S/F and
 * uses block_id="OP{i}_{pass}" instead.
 *
 * Approach (sidecar-only check):
 *   The verifier does NOT parse the emitted G-code. Mitsubishi emit
 *   carries E-pack / on-time / off-time / servo / wire / flush in COMMENT
 *   lines (`(POWER: ON=8us OFF=20us SERVO=50V)`). Comment regex parsing
 *   would be brittle and Mitsubishi-specific. Instead, the verifier reads
 *   the sealed sidecar's wedm_block_annotations[] and asks:
 *     "Given the declared physics_basis, are emitted values consistent
 *      with the canonical PASS_DEFAULTS / E_PACK_TABLE source-of-truth?"
 *
 *   The annotation array is already SHA-sealed by buildAndSeal(), so any
 *   tamper invalidates verification before this gate runs.
 *
 * Tier semantics:
 *   sim          — ±20% tolerance, all violations WARN
 *   proven_out   — ±10% tolerance, all violations WARN
 *   production   — ±5% tolerance, drift HARD_BLOCK; missing annotations WARN
 *   shop_floor   — ±2% tolerance, drift HARD_BLOCK,
 *                  + heat-soak invariant (off_time_us ≥ 1.0 × on_time_us;
 *                    duty cycle ≤ 50%; tighter than schema's ≥0.2 floor),
 *                  + servo voltage range gate ([25, 60]V per Mitsubishi
 *                    MV1200R OEM band).
 *
 * operator_override blocks bypass comparison (caller went off-physics by
 * design — schema invariant requires source_constants=[]; we record an
 * informational entry at sim tier only, mirroring milling verifier.)
 *
 * Drift formula:
 *   delta_pct = |emitted - expected| / expected
 *   if delta_pct > tier_tolerance → drift mismatch
 *   if expected === 0 → strict-equality fallback (no division)
 *
 * Expected value source (per physics_basis):
 *   epack_lookup       — E_PACK_TABLE[power_setting] for on/off times;
 *                        servo / wire / flushing not strictly bound
 *                        (caller may diverge for rough material variants —
 *                        compared at sim/proven_out tolerance only).
 *   pass_factor_table  — E_PACK_TABLE × PASS_DEFAULTS[pass_type] factors
 *                        for on/off times (rounded to 0.1us per engine);
 *                        PASS_DEFAULTS[pass_type] for servo / wire / flush.
 *   empirical_table    — Same expected source as pass_factor_table for
 *                        timing; servo/wire/flush from PASS_DEFAULTS too
 *                        (engine doesn't currently emit empirical_table,
 *                        but the schema permits it; we treat it as a
 *                        pass-table-equivalent to keep the gate
 *                        future-proof).
 *   operator_override  — bypassed (no comparison).
 */

import {
  PASS_DEFAULTS,
  E_PACK_TABLE,
} from "../engines/MitsubishiMV1200RWireEDMMasterPostEngine.js";
import type { WEDMBlockAnnotation } from "../schemas/postPhysicsSidecarSchema.js";

// ============================================================================
// PUBLIC TYPES
// ============================================================================

export type WEDMTier = "sim" | "proven_out" | "production" | "shop_floor";

export type WEDMVerdict = "PASS" | "WARN" | "HARD_BLOCK";

export type WEDMMismatchReason =
  | "on_time_drift"
  | "off_time_drift"
  | "servo_voltage_drift"
  | "wire_speed_drift"
  | "wire_tension_drift"
  | "flushing_drift"
  | "heat_soak_violation"   // shop_floor only — duty cycle > 50%
  | "servo_voltage_range"   // shop_floor only — outside [25, 60]V
  | "missing_annotations"   // sidecar.wedm_block_annotations missing/empty
  | "unknown_power_setting" // power_setting not in E_PACK_TABLE
  | "unknown_pass_type"     // pass_type not in PASS_DEFAULTS
  | "operator_override_skip"; // informational — operator_override skipped

export interface WEDMBlockMismatch {
  block_id: string;
  reason: WEDMMismatchReason;
  emitted_value?: number;
  expected_value?: number;
  delta_pct?: number;
  detail: string;
}

export interface WEDMVerifyResult {
  verdict: WEDMVerdict;
  tier: WEDMTier;
  blocks_scanned: number;
  blocks_with_overrides: number;
  mismatches: WEDMBlockMismatch[];
}

export interface WEDMVerifyOptions {
  /** Tier-aware verdict; defaults to shop_floor (fail closed). */
  tier?: WEDMTier;
}

// ============================================================================
// TIER POLICY
// ============================================================================

/** Per-tier numeric tolerance for drift checks. |emit-expected|/expected ≤ tol → PASS. */
export const TIER_TOLERANCE: Record<WEDMTier, number> = {
  sim: 0.20,
  proven_out: 0.10,
  production: 0.05,
  shop_floor: 0.02,
};

const ALL_DRIFT_REASONS: WEDMMismatchReason[] = [
  "on_time_drift",
  "off_time_drift",
  "servo_voltage_drift",
  "wire_speed_drift",
  "wire_tension_drift",
  "flushing_drift",
];

/** Heat-soak floor for shop_floor: off_time_us ≥ 1.0 × on_time_us
 *  (duty cycle ≤ 50%). Tighter than schema's 20% floor — schema catches
 *  catastrophic mis-emit; this gate catches "marginal but emit-able"
 *  parameter sets that would pass the schema yet still risk wire break
 *  under thermal load on a production shop floor. */
export const SHOP_FLOOR_HEAT_SOAK_RATIO = 1.0;

/** Mitsubishi MV1200R OEM servo gap voltage operating band. Outside this
 *  range, the spark gap regulation degrades — sub-25V risks short, above
 *  60V risks open. */
export const SHOP_FLOOR_SERVO_V_MIN = 25;
export const SHOP_FLOOR_SERVO_V_MAX = 60;

const TIER_HARD_BLOCK: Record<WEDMTier, Set<WEDMMismatchReason>> = {
  sim: new Set(),
  proven_out: new Set(),
  production: new Set([
    ...ALL_DRIFT_REASONS,
    "unknown_power_setting",
    "unknown_pass_type",
  ]),
  shop_floor: new Set([
    ...ALL_DRIFT_REASONS,
    "heat_soak_violation",
    "servo_voltage_range",
    "missing_annotations",
    "unknown_power_setting",
    "unknown_pass_type",
  ]),
};

const TIER_WARN: Record<WEDMTier, Set<WEDMMismatchReason>> = {
  sim: new Set([
    ...ALL_DRIFT_REASONS,
    "missing_annotations",
    "heat_soak_violation",
    "servo_voltage_range",
    "unknown_power_setting",
    "unknown_pass_type",
  ]),
  proven_out: new Set([
    ...ALL_DRIFT_REASONS,
    "missing_annotations",
    "heat_soak_violation",
    "servo_voltage_range",
    "unknown_power_setting",
    "unknown_pass_type",
  ]),
  production: new Set([
    "missing_annotations",
    "heat_soak_violation",
    "servo_voltage_range",
  ]),
  shop_floor: new Set(),
};

// ============================================================================
// DRIFT HELPER
// ============================================================================

/** Compute |emit-expected|/expected; returns 0 when both are equal,
 *  Infinity when expected is 0 and emit is non-zero (forces drift). */
function deltaPct(emitted: number, expected: number): number {
  if (emitted === expected) return 0;
  if (expected === 0) return Number.POSITIVE_INFINITY;
  return Math.abs(emitted - expected) / Math.abs(expected);
}

/** Emit-engine rounding policy: Math.round(x * 10) / 10. Mirrors the
 *  Mitsubishi engine's generateEDMParameters / generateProgram path. */
function roundEngine(x: number): number {
  return Math.round(x * 10) / 10;
}

// ============================================================================
// CORE VERIFY
// ============================================================================

/**
 * Verify each WEDM block annotation against PASS_DEFAULTS / E_PACK_TABLE
 * source-of-truth. Returns tier-aware verdict + the list of mismatches.
 *
 * Tolerance is applied per-tier; operator_override blocks bypass
 * comparison (informational entry at sim only).
 *
 * @throws when sidecar.wedm_block_annotations is non-array (shape violation).
 */
export function verifyWEDMBlockAnnotations(
  sidecar: Record<string, unknown> | null | undefined,
  options: WEDMVerifyOptions = {},
): WEDMVerifyResult {
  const tier: WEDMTier = options.tier ?? "shop_floor";
  if (!TIER_HARD_BLOCK[tier]) {
    throw new Error(`verifyWEDMBlockAnnotations: unknown tier "${tier}"`);
  }

  const tolerance = TIER_TOLERANCE[tier];
  const mismatches: WEDMBlockMismatch[] = [];
  let blocksScanned = 0;
  let blocksWithOverrides = 0;

  // Detect annotations presence/shape
  let annotations: WEDMBlockAnnotation[] | null = null;
  if (sidecar && typeof sidecar === "object") {
    const raw = (sidecar as Record<string, unknown>).wedm_block_annotations;
    if (typeof raw === "undefined") {
      annotations = null;
    } else if (Object.prototype.toString.call(raw) === "[object Array]") {
      annotations = raw as WEDMBlockAnnotation[];
    } else {
      throw new Error(
        "verifyWEDMBlockAnnotations: sidecar.wedm_block_annotations is present but not an array (shape violation)",
      );
    }
  }

  if (!annotations || annotations.length === 0) {
    mismatches.push({
      block_id: "(none)",
      reason: "missing_annotations",
      detail:
        "sidecar has no wedm_block_annotations[] — cannot verify WEDM physics chain. " +
        "Schema must be ≥1.2.0 and the engine must populate wedm_block_annotations.",
    });
    return finalize(tier, blocksScanned, blocksWithOverrides, mismatches);
  }

  for (let i = 0; i < annotations.length; i++) {
    const a = annotations[i];
    blocksScanned++;

    // operator_override: bypass comparison (informational at sim only)
    if (a.physics_basis === "operator_override") {
      blocksWithOverrides++;
      if (tier === "sim") {
        mismatches.push({
          block_id: a.block_id,
          reason: "operator_override_skip",
          detail:
            `block ${a.block_id}: operator_override — physics chain bypassed by caller, ` +
            "not verified against PASS_DEFAULTS / E_PACK_TABLE.",
        });
      }
      continue;
    }

    const ePackParams = E_PACK_TABLE[a.emitted.power_setting];
    if (!ePackParams) {
      mismatches.push({
        block_id: a.block_id,
        reason: "unknown_power_setting",
        emitted_value: a.emitted.power_setting,
        detail:
          `block ${a.block_id}: power_setting=${a.emitted.power_setting} not in E_PACK_TABLE ` +
          "(MV1200R supports E-pack 1..20). Cannot verify on/off-time expectation.",
      });
      continue;
    }

    const passDefaults = PASS_DEFAULTS[a.emitted.pass_type];
    if (!passDefaults) {
      mismatches.push({
        block_id: a.block_id,
        reason: "unknown_pass_type",
        detail:
          `block ${a.block_id}: pass_type="${a.emitted.pass_type}" not in PASS_DEFAULTS ` +
          "(rough/skim1..skim4). Cannot verify pass-factor expectation.",
      });
      continue;
    }

    // Expected on/off-time per declared physics_basis
    let expectedOn: number;
    let expectedOff: number;
    if (a.physics_basis === "epack_lookup") {
      // Rough baseline — apply unit pass factor (rough has factor=1.0)
      expectedOn = ePackParams.on_time_us;
      expectedOff = ePackParams.off_time_us;
    } else {
      // pass_factor_table OR empirical_table — apply per-pass factor
      expectedOn = roundEngine(ePackParams.on_time_us * passDefaults.on_time_factor);
      expectedOff = roundEngine(ePackParams.off_time_us * passDefaults.off_time_factor);
    }
    const expectedServo = passDefaults.servo_v;
    const expectedWireSpeed = passDefaults.wire_speed_m_min;
    const expectedWireTension = passDefaults.wire_tension_g;
    const expectedFlushing = passDefaults.flushing;

    pushDriftIfOver(
      mismatches,
      a.block_id,
      "on_time_drift",
      a.emitted.on_time_us,
      expectedOn,
      tolerance,
      a.physics_basis,
    );
    pushDriftIfOver(
      mismatches,
      a.block_id,
      "off_time_drift",
      a.emitted.off_time_us,
      expectedOff,
      tolerance,
      a.physics_basis,
    );
    pushDriftIfOver(
      mismatches,
      a.block_id,
      "servo_voltage_drift",
      a.emitted.servo_voltage_v,
      expectedServo,
      tolerance,
      a.physics_basis,
    );
    pushDriftIfOver(
      mismatches,
      a.block_id,
      "wire_speed_drift",
      a.emitted.wire_speed_m_min,
      expectedWireSpeed,
      tolerance,
      a.physics_basis,
    );
    pushDriftIfOver(
      mismatches,
      a.block_id,
      "wire_tension_drift",
      a.emitted.wire_tension_g,
      expectedWireTension,
      tolerance,
      a.physics_basis,
    );
    pushDriftIfOver(
      mismatches,
      a.block_id,
      "flushing_drift",
      a.emitted.flushing_pressure,
      expectedFlushing,
      tolerance,
      a.physics_basis,
    );

    // shop_floor extras: heat-soak invariant + servo voltage range gate
    if (tier === "shop_floor") {
      const ratio = a.emitted.on_time_us > 0
        ? a.emitted.off_time_us / a.emitted.on_time_us
        : Number.POSITIVE_INFINITY;
      if (ratio < SHOP_FLOOR_HEAT_SOAK_RATIO) {
        mismatches.push({
          block_id: a.block_id,
          reason: "heat_soak_violation",
          emitted_value: ratio,
          expected_value: SHOP_FLOOR_HEAT_SOAK_RATIO,
          detail:
            `block ${a.block_id}: off/on ratio=${ratio.toFixed(3)} < ${SHOP_FLOOR_HEAT_SOAK_RATIO} ` +
            `(duty cycle > 50%). Wire-break risk under thermal load. ` +
            `Schema permits ≥0.2 baseline; shop_floor demands ≥${SHOP_FLOOR_HEAT_SOAK_RATIO}.`,
        });
      }
      const sv = a.emitted.servo_voltage_v;
      if (sv < SHOP_FLOOR_SERVO_V_MIN || sv > SHOP_FLOOR_SERVO_V_MAX) {
        mismatches.push({
          block_id: a.block_id,
          reason: "servo_voltage_range",
          emitted_value: sv,
          detail:
            `block ${a.block_id}: servo_voltage_v=${sv} outside Mitsubishi MV1200R OEM band ` +
            `[${SHOP_FLOOR_SERVO_V_MIN}, ${SHOP_FLOOR_SERVO_V_MAX}]V. ` +
            `Sub-${SHOP_FLOOR_SERVO_V_MIN}V risks short; above ${SHOP_FLOOR_SERVO_V_MAX}V risks open spark gap.`,
        });
      }
    }
  }

  return finalize(tier, blocksScanned, blocksWithOverrides, mismatches);
}

/** FP epsilon for tolerance edge: 1e-9 of the tolerance covers double rounding
 *  on percentage arithmetic without admitting any practically-meaningful drift.
 *  e.g. tolerance=0.05 → effective edge=0.05 * (1 + 1e-9) ≈ 0.05000000005. */
const TOLERANCE_EPSILON_RELATIVE = 1e-9;

function pushDriftIfOver(
  mismatches: WEDMBlockMismatch[],
  blockId: string,
  reason: WEDMMismatchReason,
  emitted: number,
  expected: number,
  tolerance: number,
  physicsBasis: WEDMBlockAnnotation["physics_basis"],
): void {
  const delta = deltaPct(emitted, expected);
  // FP-safe edge: 5% drift on (8 → 8.4) computes as 0.05000000000000005
  // due to double-precision rounding; admit that single ULP into PASS.
  if (delta <= tolerance * (1 + TOLERANCE_EPSILON_RELATIVE)) return;
  mismatches.push({
    block_id: blockId,
    reason,
    emitted_value: emitted,
    expected_value: expected,
    delta_pct: delta,
    detail:
      `block ${blockId}: ${reason.replace(/_/g, " ")} — emitted=${emitted}, ` +
      `expected=${expected} (basis=${physicsBasis}, drift=${(delta * 100).toFixed(2)}%, ` +
      `tolerance=${(tolerance * 100).toFixed(0)}%).`,
  });
}

function finalize(
  tier: WEDMTier,
  blocksScanned: number,
  blocksWithOverrides: number,
  mismatches: WEDMBlockMismatch[],
): WEDMVerifyResult {
  const hardBlock = TIER_HARD_BLOCK[tier];
  const warn = TIER_WARN[tier];
  let verdict: WEDMVerdict = "PASS";
  for (const m of mismatches) {
    if (m.reason === "operator_override_skip") continue; // informational only
    if (hardBlock.has(m.reason)) {
      verdict = "HARD_BLOCK";
      break;
    }
    if (warn.has(m.reason) && verdict === "PASS") {
      verdict = "WARN";
    }
  }
  return {
    verdict,
    tier,
    blocks_scanned: blocksScanned,
    blocks_with_overrides: blocksWithOverrides,
    mismatches,
  };
}

/**
 * Convenience: verify and throw on HARD_BLOCK. Use from build pipelines.
 */
export function verifyWEDMOrThrow(
  sidecar: Record<string, unknown> | null | undefined,
  options: WEDMVerifyOptions = {},
): WEDMVerifyResult {
  const result = verifyWEDMBlockAnnotations(sidecar, options);
  if (result.verdict === "HARD_BLOCK") {
    const top = result.mismatches.slice(0, 3);
    const summary = top.map((m) => `  ${m.block_id} ${m.reason}: ${m.detail}`).join("\n");
    throw new Error(
      `verifyWEDMBlockAnnotations HARD_BLOCK on tier=${result.tier}: ` +
        `${result.mismatches.length} mismatch(es). Top:\n${summary}\n` +
        "Fix: have the WEDM master post engine populate wedm_block_annotations[] " +
        "with values consistent with the declared physics_basis.",
    );
  }
  return result;
}
