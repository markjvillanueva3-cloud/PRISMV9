/**
 * wedm-build-strategies.ts — Phase A3: the two BUILD-status toolpath strategies.
 *
 * Per WEDM-PRINT-TO-PROGRAM-PIPELINE-2026-05-31.md §5 Phase A3, the registry
 * (wedm-toolpath-types.ts) marks two types `status: "build"` — their strategy
 * logic did not exist yet:
 *   1. closely_spaced_cannelure — halve the rough feed when feature pitch is
 *      tight (pitch < 3x wire-Ø), with a debris-short guard. (owning_engine:
 *      EDMMultiPassStrategyEngine cannelure mode)
 *   2. micro_fine_wire — 0.10 mm fine-wire derate; power/feed reduced + nozzle
 *      standoff gated <= 0.25 mm. (owning_engine: WEDMThinWireDerateEngine)
 *
 * This module is the deterministic SINGLE SOURCE OF TRUTH both owning engines
 * delegate to (and the A2 template corpus consumes). Pure-core + injected-reader:
 * the BASE discharge value (rough feed) comes from the ORACLE
 * (jm-die-wedm-tech-tables getShopFeedForPass) and is passed IN — never inlined.
 * Only strategy POLICY factors live here, each named + sourced to the registry /
 * tribal id it came from (these are policy, not physics discharge constants).
 *
 * @module data/wedm-build-strategies
 */

// ── Strategy policy constants (registry/tribal-sourced — NOT physics discharge) ──
/** pitch < this multiple of wire-Ø triggers the cannelure halve-feed.
 *  Source: wedm-toolpath-types closely_spaced_cannelure geometry/feasibility ("pitch < 3x wire-Ø"). */
export const CANNELURE_PITCH_WIRE_FACTOR = 3;
/** Default cannelure feed derate when pitch is tight. Source: tribal wedm-jmd-008 ("halve feed"). */
export const CANNELURE_DEFAULT_FEED_DERATE = 0.5;
/** The fine-wire diameter the micro path is defined for. Source: registry micro_fine_wire param enum ["0.10"]. */
export const FINE_WIRE_DIAMETER_MM = 0.10;
/** Max nozzle standoff for the fine-wire path. Source: registry micro_fine_wire feasibility ("standoff <= 0.25mm"). */
export const FINE_WIRE_MAX_STANDOFF_MM = 0.25;
/** Default fine-wire feed/power derate (registry range 0.3-0.8; strong derate for 0.10mm). Source: WEDMThinWireDerateEngine. */
export const FINE_WIRE_DEFAULT_POWER_DERATE = 0.4;

export interface CannelureInput {
  /** Rough-pass feed from the oracle (mm/min); null => operator-set at the machine. */
  base_feed_mm_min: number | null;
  /** Smallest feature pitch on the print (mm). */
  feature_pitch_mm: number;
  /** Wire diameter (mm). */
  wire_diameter_mm: number;
  /** Optional override of the halve-feed factor (registry param range 0.5-1.0). */
  feed_derate?: number;
}

export interface CannelureResult {
  /** True when the tight-pitch rule fired (pitch < factor x wire-Ø). */
  applies: boolean;
  /** Derated feed (mm/min); null when base feed is operator-set. */
  derated_feed_mm_min: number | null;
  /** The derate factor actually used. */
  feed_derate_used: number;
  /** Debris-short guard is required whenever the rule fires. */
  debris_short_guard: boolean;
  reason: string;
}

/**
 * Cannelure / closely-spaced strategy: when feature pitch < 3x wire-Ø, halve the
 * rough feed (debris cannot clear the narrow kerf at full feed -> wire short).
 * Base feed is INJECTED from the oracle. Pure + deterministic.
 */
export function cannelureFeedStrategy(input: CannelureInput): CannelureResult {
  const factor = isFiniteNum(input.feed_derate) ? clamp(input.feed_derate as number, 0.5, 1.0) : CANNELURE_DEFAULT_FEED_DERATE;
  const tight = isFiniteNum(input.feature_pitch_mm) && isFiniteNum(input.wire_diameter_mm)
    && input.feature_pitch_mm < CANNELURE_PITCH_WIRE_FACTOR * input.wire_diameter_mm;
  if (!tight) {
    return { applies: false, derated_feed_mm_min: input.base_feed_mm_min, feed_derate_used: 1.0, debris_short_guard: false,
      reason: "pitch >= " + CANNELURE_PITCH_WIRE_FACTOR + "x wire-Ø — full feed, no cannelure derate" };
  }
  const derated = input.base_feed_mm_min == null ? null : round3(input.base_feed_mm_min * factor);
  return {
    applies: true,
    derated_feed_mm_min: derated,
    feed_derate_used: factor,
    debris_short_guard: true,
    reason: "pitch " + input.feature_pitch_mm + " mm < " + CANNELURE_PITCH_WIRE_FACTOR + "x wire-Ø (" + round3(CANNELURE_PITCH_WIRE_FACTOR * input.wire_diameter_mm) + " mm) — feed x" + factor + " + debris-short guard (wedm-jmd-008)",
  };
}

export interface MicroFineWireInput {
  /** Base feed from the oracle (mm/min); null => operator-set. */
  base_feed_mm_min: number | null;
  /** Wire diameter requested (mm). */
  wire_diameter_mm: number;
  /** Nozzle standoff (mm). */
  standoff_mm: number;
  /** Optional override of the power/feed derate (registry range 0.3-0.8). */
  power_derate?: number;
}

export interface MicroFineWireResult {
  /** True when this is a valid fine-wire job (correct wire + standoff in range). */
  feasible: boolean;
  /** Reasons the job is NOT feasible (empty when feasible). */
  blockers: string[];
  /** Derated feed (mm/min); null when base feed is operator-set. */
  derated_feed_mm_min: number | null;
  /** The derate factor actually used. */
  power_derate_used: number;
  standoff_ok: boolean;
  reason: string;
}

/**
 * Micro / fine-wire (0.10 mm) strategy: gate the job to fine wire + standoff in
 * range, then derate feed/power. Base feed INJECTED from the oracle. Pure.
 * NOTE: 0.10 mm wire is NOT on JM's FA-10S spool list (0.25/0.20) — a feasible
 * micro job still trips the inventory gate downstream (a deliberate closed-loop
 * linkage, not a bug).
 */
export function microFineWireStrategy(input: MicroFineWireInput): MicroFineWireResult {
  const blockers: string[] = [];
  const wireOk = isFiniteNum(input.wire_diameter_mm) && Math.abs(input.wire_diameter_mm - FINE_WIRE_DIAMETER_MM) < 1e-9;
  if (!wireOk) blockers.push("micro path requires " + FINE_WIRE_DIAMETER_MM + " mm fine wire (got " + input.wire_diameter_mm + " mm)");
  const standoff_ok = isFiniteNum(input.standoff_mm) && input.standoff_mm <= FINE_WIRE_MAX_STANDOFF_MM && input.standoff_mm > 0;
  if (!standoff_ok) blockers.push("nozzle standoff must be 0 < s <= " + FINE_WIRE_MAX_STANDOFF_MM + " mm (got " + input.standoff_mm + " mm)");
  const derate = isFiniteNum(input.power_derate) ? clamp(input.power_derate as number, 0.3, 0.8) : FINE_WIRE_DEFAULT_POWER_DERATE;
  const feasible = blockers.length === 0;
  const derated = !feasible || input.base_feed_mm_min == null ? null : round3(input.base_feed_mm_min * derate);
  return {
    feasible,
    blockers,
    derated_feed_mm_min: derated,
    power_derate_used: derate,
    standoff_ok,
    reason: feasible
      ? "fine-wire " + FINE_WIRE_DIAMETER_MM + " mm, standoff " + input.standoff_mm + " mm OK — feed/power x" + derate + " (WEDMThinWireDerateEngine)"
      : blockers.join("; "),
  };
}

// ── tiny pure helpers ──
function isFiniteNum(x: unknown): x is number { return typeof x === "number" && Number.isFinite(x); }
function clamp(x: number, lo: number, hi: number): number { return Math.min(hi, Math.max(lo, x)); }
function round3(x: number): number { return Math.round(x * 1000) / 1000; }
