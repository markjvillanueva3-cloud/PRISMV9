/**
 * SFC FULL LIVE-AXIS ENUMERATOR -- the billions-scale deep-test space (SFC-DEEP-TEST-FULLSPACE-PLAN).
 *
 * The base enumerator (`sfc-combinatorial-enumerator.ts`, SFC_FULL_SPACE_SIZE = 20,321,280) sweeps the
 * 10 axes that existed when SFC-FULLTUNE shipped. Since then `UltimateSpeedFeedEngine` grew THREE more
 * Vc-determining axes that the base sweep never enumerated (the documented "modeled-but-never-swept"
 * forgetting-loop gap, [[reference_oscar_sfc_axis_impact_gap_2026_06_08]]):
 *
 *   - tool_coating     -> coatingVcFactor  (UltimateSpeedFeedEngine.ts:2197, :2232; CoatingVcModifier)
 *   - machine_rigidity -> rigidityFactor   (:2788, :2790; CANONICAL_MACHINE_RIGIDITY_VC_FACTOR)
 *   - optimize_for     -> goalIdx          (:2204; 3 distinct param regimes conservative/balanced/aggressive)
 *
 * This module CLONES the base enumerator (does NOT mutate it -- the cron's tractable 20.3M real-engine
 * sweep must stay byte-identical) and adds those three axes as MORE-significant mixed-radix digits above
 * the base index, so the full space is index-addressable WITHOUT materializing 1.46B cells:
 *
 *   SFC_FULLSPACE_SIZE = 20,321,280 x coating(8) x rigidity(3) x goal(3) = 1,463,132,160  (~1.46 billion)
 *
 * The base index is the LEAST-significant block: a contiguous slice [k*BASE, (k+1)*BASE) is the ENTIRE
 * base grid for exactly one (coating, rigidity, goal) overlay -- there are {@link FULLSPACE_OVERLAY_COUNT}
 * = 72 such overlays. The factored full-space computer (`scripts/sfc-fullspace-sweep.mjs`) iterates the 72
 * overlays (each a cheap multiplicative re-expression of a reference base grid), NEVER 1.46B engine calls.
 *
 * Pure combinatorics -- ZERO physics. Axis VALUES are imported from their canonical sources (drift-proof;
 * never inlined): coatings from `CoatingVcModifier.COATING_SPEED_MULT`, rigidity from
 * `constants.CANONICAL_MACHINE_RIGIDITY_VC_FACTOR`. The goal axis carries the three VALID `optimize_for`
 * enum values that map to the three distinct goalIdx (surface_finish is a 4th input that aliases idx 0).
 *
 * 1.46e9 < Number.MAX_SAFE_INTEGER (9.007e15) so every index/partition is exact integer math.
 *
 * @module data/sfc-fullspace-enumerator
 */
import {
  SFC_FULL_SPACE_SIZE as BASE_SPACE_SIZE,
  cellAtIndex as baseCellAtIndex,
  indexOfCell as baseIndexOfCell,
} from "./sfc-combinatorial-enumerator.js";
import type { SampledCell } from "./sfc-combinatorial-sampler.js";
import { COATING_SPEED_MULT } from "../algorithms/CoatingVcModifier.js";
import { CANONICAL_MACHINE_RIGIDITY_VC_FACTOR } from "../physics/constants.js";

/** The 4 valid `optimize_for` enum values the engine accepts (UltimateSpeedFeedEngine.ts:170). */
export type OptimizeFor = "tool_life" | "productivity" | "surface_finish" | "balanced";
export type MachineRigidityLevel = "low" | "medium" | "high";

/**
 * Coating axis (8). Keys of the canonical relative-to-uncoated speed-mult table, imported so the axis
 * AUTO-TRACKS the reference DB (CoatingVcModifier mirrors prism-reference-db/coatings.json, drift-guarded)
 * and can never silently desync. Insertion order is stable:
 * UNCOATED, TIN, TICN, TIALN, ALTIN, ALCRN, DLC, DIAMOND.
 */
export const COATING_SWEEP: readonly string[] = Object.keys(COATING_SPEED_MULT);

/**
 * Machine-rigidity axis (3). Keys of the canonical Vc-factor table {low:0.7, medium:1.0, high:1.1}.
 * Imported (never inlined) so it tracks `constants.ts`.
 */
export const RIGIDITY_SWEEP: readonly MachineRigidityLevel[] =
  Object.keys(CANONICAL_MACHINE_RIGIDITY_VC_FACTOR) as MachineRigidityLevel[];

/**
 * Optimization-goal axis (3). The three VALID `optimize_for` enum values that map to the three DISTINCT
 * `goalIdx` parameter regimes (UltimateSpeedFeedEngine.ts:2204): tool_life->0, balanced->1, productivity->2.
 * NOTE: "surface_finish" is a 4th legal input that ALIASES idx 0 (identical Vc/fz to tool_life), so the
 * distinct parameter-outcome count is 3, not 4 -- swept here by its representative "tool_life".
 */
export const GOAL_SWEEP: readonly OptimizeFor[] = ["tool_life", "balanced", "productivity"];

/** goalIdx the engine derives for each GOAL_SWEEP value -- the factored computer uses it to pick the base-param column. */
export const GOAL_IDX: readonly number[] = [0, 1, 2];

// Load-time invariant: a future refactor that empties any canonical axis must fail LOUD here, not
// silently shrink the space to 0 (R12 -- never a silent corruption of the sweep accounting).
if (COATING_SWEEP.length === 0 || RIGIDITY_SWEEP.length === 0 || GOAL_SWEEP.length === 0) {
  throw new Error(
    `sfc-fullspace-enumerator: a canonical axis is empty ` +
      `(coating=${COATING_SWEEP.length} rigidity=${RIGIDITY_SWEEP.length} goal=${GOAL_SWEEP.length})`,
  );
}
if (GOAL_SWEEP.length !== GOAL_IDX.length) {
  throw new Error(
    `sfc-fullspace-enumerator: GOAL_SWEEP/GOAL_IDX length mismatch (${GOAL_SWEEP.length}/${GOAL_IDX.length})`,
  );
}

/** Number of (coating, rigidity, goal) overlays = the factored computer's outer-loop cardinality. */
export const FULLSPACE_OVERLAY_COUNT: number =
  COATING_SWEEP.length * RIGIDITY_SWEEP.length * GOAL_SWEEP.length;

/** Cells per overlay = the whole base grid. A contiguous [k*BASE, (k+1)*BASE) slice is one overlay. */
export const FULLSPACE_OVERLAY_BLOCK: number = BASE_SPACE_SIZE;

/** Total full live-axis space = base x coating x rigidity x goal. */
export const SFC_FULLSPACE_SIZE: number = BASE_SPACE_SIZE * FULLSPACE_OVERLAY_COUNT;

/**
 * A fully-specified deep-test cell: the base 10-axis {@link SampledCell} plus the three live overlay axes.
 * Shape is a superset of SampledCell so an engine driver can consume it directly (it sets tool_coating /
 * machine_rigidity / optimize_for that the base SampledCell omitted).
 */
export interface FullCell extends SampledCell {
  tool_coating: string;
  machine_rigidity: MachineRigidityLevel;
  optimize_for: OptimizeFor;
  /** The engine's resolved goalIdx (0/1/2) for this optimize_for -- convenience for the factored computer. */
  goal_idx: number;
}

/** One (coating, rigidity, goal) overlay -- the factored computer's unit of work (72 of them). */
export interface FactorOverlay {
  overlayIdx: number; // [0, FULLSPACE_OVERLAY_COUNT)
  tool_coating: string;
  machine_rigidity: MachineRigidityLevel;
  optimize_for: OptimizeFor;
  goal_idx: number;
  /** Flat-index offset of this overlay's base-grid block: overlayIdx * BASE_SPACE_SIZE. */
  blockOffset: number;
}

/**
 * Decode an overlay index [0,72) into its (coating, rigidity, goal) triple. Mixed-radix with GOAL the
 * least-significant digit, then RIGIDITY, then COATING -- so consecutive overlays vary the goal fastest.
 */
function overlayAt(overlayIdx: number): FactorOverlay {
  let r = overlayIdx;
  const goalI = r % GOAL_SWEEP.length;
  r = Math.floor(r / GOAL_SWEEP.length);
  const rigI = r % RIGIDITY_SWEEP.length;
  r = Math.floor(r / RIGIDITY_SWEEP.length);
  const coatI = r; // r is now in [0, COATING_SWEEP.length)
  return {
    overlayIdx,
    tool_coating: COATING_SWEEP[coatI]!,
    machine_rigidity: RIGIDITY_SWEEP[rigI]!,
    optimize_for: GOAL_SWEEP[goalI]!,
    goal_idx: GOAL_IDX[goalI]!,
    blockOffset: overlayIdx * BASE_SPACE_SIZE,
  };
}

/**
 * Enumerate all {@link FULLSPACE_OVERLAY_COUNT} (coating, rigidity, goal) overlays in flat-index order.
 * This is the OUTER loop of the factored full-space computer: for each overlay it expands a reference
 * base grid by the overlay's multiplicative factors -- 72 overlays, NOT 1.46B engine calls.
 */
export function enumerateFactorOverlays(): FactorOverlay[] {
  const out: FactorOverlay[] = new Array(FULLSPACE_OVERLAY_COUNT);
  for (let k = 0; k < FULLSPACE_OVERLAY_COUNT; k++) out[k] = overlayAt(k);
  return out;
}

/**
 * Decode a flat index into its fully-specified {@link FullCell}. Bijective over [0, SFC_FULLSPACE_SIZE).
 * Throws (fail-loud) on out-of-range / non-integer -- a silent wrap would corrupt a worker's slice.
 */
export function fullCellAtIndex(index: number): FullCell {
  if (!Number.isInteger(index) || index < 0 || index >= SFC_FULLSPACE_SIZE) {
    throw new RangeError(`fullCellAtIndex: index ${index} out of range [0, ${SFC_FULLSPACE_SIZE})`);
  }
  const baseIndex = index % BASE_SPACE_SIZE;
  const overlay = overlayAt(Math.floor(index / BASE_SPACE_SIZE));
  const base = baseCellAtIndex(baseIndex);
  return {
    ...base,
    tool_coating: overlay.tool_coating,
    machine_rigidity: overlay.machine_rigidity,
    optimize_for: overlay.optimize_for,
    goal_idx: overlay.goal_idx,
  };
}

/**
 * Encode a {@link FullCell} back to its flat index (inverse of {@link fullCellAtIndex}). Returns -1 if any
 * component is off-grid (unknown coating/rigidity/goal, or a base cell not in the valid enumerable space)
 * -- lets a consumer verify membership without throwing.
 */
export function indexOfFullCell(cell: FullCell): number {
  const baseIdx = baseIndexOfCell(cell);
  const coatIdx = COATING_SWEEP.indexOf(cell.tool_coating);
  const rigIdx = RIGIDITY_SWEEP.indexOf(cell.machine_rigidity);
  const goalIdx = GOAL_SWEEP.indexOf(cell.optimize_for);
  if (baseIdx < 0 || coatIdx < 0 || rigIdx < 0 || goalIdx < 0) return -1;
  const overlayIdx = (coatIdx * RIGIDITY_SWEEP.length + rigIdx) * GOAL_SWEEP.length + goalIdx;
  return overlayIdx * BASE_SPACE_SIZE + baseIdx;
}

/**
 * Materialize a contiguous slice [offset, offset+count) of the full enumeration. Intended for SMALL
 * slices (cross-validation samples, spot checks) -- materializing a billions-cell range is intentionally
 * the caller's responsibility to bound. Throws on a negative/non-integer offset; clamps count to the end.
 */
export function enumerateFullRange(offset: number, count: number): FullCell[] {
  if (!Number.isInteger(offset) || offset < 0) {
    throw new RangeError(`enumerateFullRange: offset ${offset} must be a non-negative integer`);
  }
  if (!Number.isInteger(count) || count <= 0 || offset >= SFC_FULLSPACE_SIZE) return [];
  const end = Math.min(offset + count, SFC_FULLSPACE_SIZE);
  const out: FullCell[] = new Array(end - offset);
  for (let i = offset; i < end; i++) out[i - offset] = fullCellAtIndex(i);
  return out;
}

/**
 * Partition the full space into `chunks` near-equal contiguous slices (zero overlap, zero gap, counts sum
 * to SFC_FULLSPACE_SIZE; last chunk absorbs the remainder). `chunks` clamped to [1, SFC_FULLSPACE_SIZE].
 * The offsets a worker-fleet coordinator hands out for the streaming validity scan.
 */
export function partitionFullSpace(chunks: number): Array<{ offset: number; count: number }> {
  const n = Math.max(1, Math.min(Math.floor(chunks) || 1, SFC_FULLSPACE_SIZE));
  const base = Math.floor(SFC_FULLSPACE_SIZE / n);
  const rem = SFC_FULLSPACE_SIZE - base * n;
  const parts: Array<{ offset: number; count: number }> = [];
  let offset = 0;
  for (let k = 0; k < n; k++) {
    const cnt = base + (k < rem ? 1 : 0);
    parts.push({ offset, count: cnt });
    offset += cnt;
  }
  return parts;
}

/**
 * STAGE-B EXTENSION POINT (documented, NOT yet active -- see SFC-DEEP-TEST-FULLSPACE-PLAN section 1).
 * The engine also accepts independent cutting-parameter overrides the strategy currently fixes:
 * radial_depth_pct (engagement, milling-only) and axial_depth_mm (DOC, milling-only). Adding them as two
 * more digits here lifts the space to ~43.9B. They are milling-class-validity-gated (turning/drilling have
 * fixed engagement geometry), so they multiply only the milling subset -- which is why they are a separate
 * staged extension, not a uniform digit. Left as a declarative marker so the next chat EXTENDS, not forgets.
 */
// NAMING: `radial_depth_pct` maps DIRECTLY to the engine input `input.radial_depth_pct`. `axial_depth_x_dc`
// is a MULTIPLE OF Dc, NOT the engine input directly -- when wiring Stage B, set the engine's
// `input.axial_depth_mm = axial_depth_x_dc * Dc` (the engine takes ap in mm, not a ratio).
export const STAGE_B_EXTRA_AXES = {
  radial_depth_pct: [5, 10, 25, 50, 75, 100] as const, // engagement band (milling-class only); -> input.radial_depth_pct
  axial_depth_x_dc: [0.25, 0.5, 1.0, 1.5, 2.0] as const, // DOC band as multiple of Dc; -> input.axial_depth_mm = value * Dc
} as const;
