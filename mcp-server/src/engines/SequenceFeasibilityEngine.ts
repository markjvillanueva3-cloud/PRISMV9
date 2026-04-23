/**
 * SequenceFeasibilityEngine — Forward-simulates operation sequences checking
 * all physical feasibility constraints at each step. Detects dead-ends and
 * auto-resequences.
 *
 * MF-MS2: Manufacturing Feasibility Track, Milestone 2.
 *
 * Core capabilities:
 *   1. Forward Simulation — apply ops to workpiece state, check accessibility/
 *      workholding/rigidity at each step, report pass/fail/warning per op
 *   2. Dead-End Detection — find ops where completing one makes a future op
 *      impossible (clamping surface removal, datum destruction, inaccessible pocket)
 *   3. Auto-Resequencing — backtracking search with constraint propagation to find
 *      valid orderings, scored by cycle time / tool changes / setup changes
 *   4. Constraint Graph — directed graph of ordering constraints with cycle detection
 *
 * Physics models:
 *   - Workpiece state: AABB stock evolution via material removal per op
 *   - Accessibility: tool_length > feature_depth, holder_clearance > wall_proximity
 *   - Workholding: remaining_clamp_area * mu * P > F_cutting * SF (SF=2.0)
 *   - Rigidity: wall_thickness_after > min_thickness_for_chatter_free
 *   - Thin wall threshold: t_min = 0.05 * D_tool (empirical rule for chatter)
 *
 * References:
 *   - Halevi & Weill (1995): Principles of Process Planning, Ch. 7
 *   - Zhang & Merchant (1993): Design and planning of manufacturing systems
 *   - Tseng & Joshi (1994): Recognizing machined features automatically
 *
 * Pure computation — no filesystem, no external dependencies.
 *
 * @module engines/SequenceFeasibilityEngine
 */

import { log as logObj } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Axis-aligned bounding box for workpiece/feature geometry. */
export interface SeqAABB {
  min_x: number; min_y: number; min_z: number;
  max_x: number; max_y: number; max_z: number;
}

/** Operation type classification. */
export type SeqOperationType =
  | "rough" | "semi_finish" | "finish" | "drill" | "bore"
  | "thread" | "deburr" | "chamfer" | "slot" | "pocket"
  | "profile" | "face" | "contour" | "engrave";

/** Clamping method classification. */
export type ClampingMethod = "vise" | "fixture" | "vacuum" | "magnetic" | "chuck" | "collet";

/** Single operation in a manufacturing sequence. */
export interface SeqOperation {
  id: string;
  type: SeqOperationType;
  position: { x: number; y: number; z: number };
  dimensions: { width: number; height: number; depth: number };
  tool: {
    id: string;
    diameter_mm: number;
    length_mm: number;
    holder_diameter_mm?: number;
  };
  forces?: {
    cutting_force_N: number;
    thrust_force_N?: number;
    lateral_force_N?: number;
  };
  datum_face?: string;
  creates_surface?: string;
  removes_surface?: string;
  requires_surface?: string;
  requires_datum?: string;
  setup_id?: string;
  estimated_time_sec?: number;
}

/** Stock/workpiece definition. */
export interface StockDefinition {
  bounds: SeqAABB;
  material: string;
  hardness_hrc?: number;
}

/** Workholding configuration. */
export interface WorkholdingConfig {
  clamping_method: ClampingMethod;
  clamp_positions: Array<{
    face: string;
    area_mm2: number;
    position: { x: number; y: number; z: number };
  }>;
  friction_coefficient?: number;
  clamping_pressure_MPa?: number;
}

/** Per-operation feasibility result. */
export interface OpFeasibility {
  operation_id: string;
  status: "pass" | "fail" | "warning";
  checks: {
    accessibility: { pass: boolean; detail: string };
    workholding: { pass: boolean; detail: string };
    rigidity: { pass: boolean; detail: string };
    datum_available: { pass: boolean; detail: string };
  };
  risk_score: number;
  notes: string[];
}

/** Full simulation result. */
export interface SimulationResult {
  feasible: boolean;
  pass_count: number;
  fail_count: number;
  warning_count: number;
  cumulative_risk: number;
  per_operation: OpFeasibility[];
  warnings: string[];
  dead_ends: DeadEndPair[];
  workpiece_state_after: SeqAABB;
}

/** Dead-end pair: one op blocks another. */
export interface DeadEndPair {
  blocking_op: string;
  blocked_op: string;
  reason: string;
  constraint_type: ConstraintType;
}

/** Constraint types for ordering graph. */
export type ConstraintType =
  | "datum_dependency" | "clamping_dependency"
  | "access_dependency" | "tool_dependency"
  | "surface_dependency" | "rigidity_dependency";

/** Edge in the constraint graph. */
export interface ConstraintEdge {
  from: string;
  to: string;
  type: ConstraintType;
  reason: string;
  weight: number;
}

/** Constraint graph output. */
export interface ConstraintGraph {
  nodes: string[];
  edges: ConstraintEdge[];
  has_cycles: boolean;
  cycles: string[][];
  topological_order: string[] | null;
}

/** Scored valid sequence from resequencing. */
export interface ScoredSequence {
  order: string[];
  score: number;
  cycle_time_sec: number;
  tool_changes: number;
  setup_changes: number;
  feasible: boolean;
}

/** Resequencing result. */
export interface ResequenceResult {
  valid_sequences: ScoredSequence[];
  total_candidates_evaluated: number;
  proof_of_infeasibility: string | null;
  best_sequence: ScoredSequence | null;
  improvement_pct: number | null;
}

/** Workpiece state tracker during simulation. */
interface WorkpieceState {
  bounds: SeqAABB;
  removed_volumes: SeqAABB[];
  remaining_surfaces: Set<string>;
  remaining_datums: Set<string>;
  clamp_areas: Map<string, number>;
  min_wall_thickness_mm: number;
}

// ============================================================================
// INPUT TYPES
// ============================================================================

export interface SimulateSequenceInput {
  operations: SeqOperation[];
  stock: StockDefinition;
  workholding: WorkholdingConfig;
  safety_factor?: number;
}

export interface DetectDeadEndsInput {
  operations: SeqOperation[];
  stock: StockDefinition;
  workholding: WorkholdingConfig;
}

export interface ResequenceInput {
  operations: SeqOperation[];
  stock: StockDefinition;
  workholding: WorkholdingConfig;
  max_candidates?: number;
  tool_change_time_sec?: number;
  setup_change_time_sec?: number;
}

export interface ConstraintGraphInput {
  operations: SeqOperation[];
  stock?: StockDefinition;
  workholding?: WorkholdingConfig;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_SAFETY_FACTOR = 2.0;
const DEFAULT_FRICTION_COEFFICIENT = 0.25;
const DEFAULT_CLAMPING_PRESSURE_MPA = 5.0;
const MIN_WALL_THICKNESS_FACTOR = 0.05;
const DEFAULT_HOLDER_DIAMETER_FACTOR = 1.6;
const DEFAULT_TOOL_CHANGE_TIME_SEC = 15;
const DEFAULT_SETUP_CHANGE_TIME_SEC = 300;
const MAX_RESEQUENCE_CANDIDATES = 5000;
const MAX_VALID_SEQUENCES_RETURNED = 10;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Create an AABB for an operation's material removal zone. */
function opRemovalAABB(op: SeqOperation): SeqAABB {
  const hw = op.dimensions.width / 2;
  const hh = op.dimensions.height / 2;
  return {
    min_x: op.position.x - hw,
    max_x: op.position.x + hw,
    min_y: op.position.y - hh,
    max_y: op.position.y + hh,
    min_z: op.position.z - op.dimensions.depth,
    max_z: op.position.z,
  };
}

/** Subtract removal volume from stock AABB (conservative). */
function subtractFromStock(stock: SeqAABB, removal: SeqAABB): SeqAABB {
  const spanX = removal.min_x <= stock.min_x && removal.max_x >= stock.max_x;
  const spanY = removal.min_y <= stock.min_y && removal.max_y >= stock.max_y;
  const cutsFromTop = removal.max_z >= stock.max_z;
  if (spanX && spanY && cutsFromTop) {
    return { ...stock, max_z: Math.max(stock.min_z, removal.min_z) };
  }
  return { ...stock };
}

/** Estimate minimum wall thickness after removals. */
function estimateMinWallThickness(stock: SeqAABB, removals: SeqAABB[]): number {
  if (removals.length === 0) return Infinity;
  let minThickness = Infinity;
  for (const r of removals) {
    const leftWall = Math.max(0, r.min_x - stock.min_x);
    const rightWall = Math.max(0, stock.max_x - r.max_x);
    const frontWall = Math.max(0, r.min_y - stock.min_y);
    const backWall = Math.max(0, stock.max_y - r.max_y);
    if (r.min_x > stock.min_x) minThickness = Math.min(minThickness, leftWall);
    if (r.max_x < stock.max_x) minThickness = Math.min(minThickness, rightWall);
    if (r.min_y > stock.min_y) minThickness = Math.min(minThickness, frontWall);
    if (r.max_y < stock.max_y) minThickness = Math.min(minThickness, backWall);
    for (const r2 of removals) {
      if (r === r2) continue;
      if (r.max_x <= r2.min_x) minThickness = Math.min(minThickness, r2.min_x - r.max_x);
      if (r.max_y <= r2.min_y) minThickness = Math.min(minThickness, r2.min_y - r.max_y);
    }
  }
  return minThickness;
}

/** Map face name to direction. */
function faceToDirection(face: string): "top" | "bottom" | "left" | "right" | "front" | "back" | null {
  const f = face.toLowerCase();
  if (f.includes("top") || f === "+z") return "top";
  if (f.includes("bottom") || f === "-z") return "bottom";
  if (f.includes("left") || f === "-x") return "left";
  if (f.includes("right") || f === "+x") return "right";
  if (f.includes("front") || f === "-y") return "front";
  if (f.includes("back") || f === "+y") return "back";
  return null;
}

/** Compute area of a stock face. */
function stockFaceArea(stock: SeqAABB, face: string): number {
  const dir = faceToDirection(face);
  const dx = stock.max_x - stock.min_x;
  const dy = stock.max_y - stock.min_y;
  const dz = stock.max_z - stock.min_z;
  switch (dir) {
    case "top": case "bottom": return dx * dy;
    case "left": case "right": return dy * dz;
    case "front": case "back": return dx * dz;
    default: return 0;
  }
}

/** Check if removal zone overlaps a clamping face. */
function removalOverlapsClampFace(removal: SeqAABB, stock: SeqAABB, face: string): boolean {
  const dir = faceToDirection(face);
  const tolerance = 0.5;
  switch (dir) {
    case "top":    return removal.max_z >= stock.max_z - tolerance;
    case "bottom": return removal.min_z <= stock.min_z + tolerance;
    case "left":   return removal.min_x <= stock.min_x + tolerance;
    case "right":  return removal.max_x >= stock.max_x - tolerance;
    case "front":  return removal.min_y <= stock.min_y + tolerance;
    case "back":   return removal.max_y >= stock.max_y - tolerance;
    default:       return false;
  }
}

/** Estimate remaining clamp area on a face after material removal. */
function remainingClampArea(stock: SeqAABB, removals: SeqAABB[], face: string): number {
  const totalArea = stockFaceArea(stock, face);
  let removedArea = 0;
  for (const r of removals) {
    if (!removalOverlapsClampFace(r, stock, face)) continue;
    const dir = faceToDirection(face);
    switch (dir) {
      case "top": case "bottom": {
        const ox = Math.max(0, Math.min(r.max_x, stock.max_x) - Math.max(r.min_x, stock.min_x));
        const oy = Math.max(0, Math.min(r.max_y, stock.max_y) - Math.max(r.min_y, stock.min_y));
        removedArea += ox * oy;
        break;
      }
      case "left": case "right": {
        const oy = Math.max(0, Math.min(r.max_y, stock.max_y) - Math.max(r.min_y, stock.min_y));
        const oz = Math.max(0, Math.min(r.max_z, stock.max_z) - Math.max(r.min_z, stock.min_z));
        removedArea += oy * oz;
        break;
      }
      case "front": case "back": {
        const ox = Math.max(0, Math.min(r.max_x, stock.max_x) - Math.max(r.min_x, stock.min_x));
        const oz = Math.max(0, Math.min(r.max_z, stock.max_z) - Math.max(r.min_z, stock.min_z));
        removedArea += ox * oz;
        break;
      }
    }
  }
  return Math.max(0, totalArea - removedArea);
}

// ============================================================================
// ENGINE
// ============================================================================

export class SequenceFeasibilityEngine {
  readonly version = "1.0.0";

  /** Main dispatcher entry point. */
  calculate(action: string, params: Record<string, unknown>): unknown {
    switch (action) {
      case "sequence_simulate":
        return this.simulateSequence(params as unknown as SimulateSequenceInput);
      case "sequence_detect_deadends":
        return this.detectDeadEnds(params as unknown as DetectDeadEndsInput);
      case "sequence_resequence":
        return this.resequence(params as unknown as ResequenceInput);
      case "sequence_constraint_graph":
        return this.buildConstraintGraph(params as unknown as ConstraintGraphInput);
      default:
        return { error: `Unknown action: ${action}` };
    }
  }

  // --- 1. Forward Simulation ---

  /**
   * Forward-simulate an operation sequence, checking feasibility at each step.
   *
   * For each operation:
   *   1. Apply material removal to workpiece state
   *   2. Check tool accessibility (length vs depth, holder clearance)
   *   3. Check workholding (clamp area * mu * P > F_cut * SF)
   *   4. Check rigidity (wall thickness > min for chatter-free)
   *   5. Check datum/surface availability
   */
  simulateSequence(input: SimulateSequenceInput): SimulationResult {
    const { operations, stock, workholding } = input;
    const sf = input.safety_factor ?? DEFAULT_SAFETY_FACTOR;

    logObj.info( `[SequenceFeasibility] Simulating ${operations.length} operations`);

    const state: WorkpieceState = {
      bounds: { ...stock.bounds },
      removed_volumes: [],
      remaining_surfaces: new Set<string>(),
      remaining_datums: new Set<string>(),
      clamp_areas: new Map<string, number>(),
      min_wall_thickness_mm: Infinity,
    };

    for (const face of ["top", "bottom", "left", "right", "front", "back"]) {
      state.remaining_surfaces.add(face);
      state.remaining_datums.add(face);
    }
    for (const clamp of workholding.clamp_positions) {
      state.clamp_areas.set(clamp.face, clamp.area_mm2);
    }

    const perOp: OpFeasibility[] = [];
    const warnings: string[] = [];
    const deadEnds: DeadEndPair[] = [];
    let cumulativeRisk = 0;

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      const removal = opRemovalAABB(op);
      const notes: string[] = [];

      // -- Check 1: Accessibility --
      const featureDepth = op.dimensions.depth;
      const toolLength = op.tool.length_mm;
      const holderDia = op.tool.holder_diameter_mm ??
        op.tool.diameter_mm * DEFAULT_HOLDER_DIAMETER_FACTOR;

      let accessPass = true;
      let accessDetail = "OK";

      if (toolLength < featureDepth) {
        accessPass = false;
        accessDetail = `Tool length ${toolLength}mm < feature depth ${featureDepth}mm`;
      } else if (toolLength < featureDepth * 1.2) {
        accessDetail = `Tool length margin thin: ${toolLength}mm for ${featureDepth}mm depth (< 1.2x rule)`;
        notes.push("Tight tool length margin");
      }

      const minOpeningWidth = Math.min(op.dimensions.width, op.dimensions.height);
      if (holderDia > minOpeningWidth && featureDepth > op.tool.diameter_mm) {
        accessPass = false;
        accessDetail = `Holder diameter ${holderDia.toFixed(1)}mm > pocket opening ${minOpeningWidth}mm`;
      }

      const wallProximity = this._nearestWallDistance(op.position, state.removed_volumes, stock.bounds);
      if (wallProximity < holderDia / 2 && featureDepth > op.tool.diameter_mm * 2) {
        if (accessPass) {
          accessDetail = `Holder clearance tight: ${wallProximity.toFixed(1)}mm to wall vs holder radius ${(holderDia / 2).toFixed(1)}mm`;
          notes.push("Holder may collide with adjacent wall");
        }
      }

      // -- Check 2: Workholding --
      let whPass = true;
      let whDetail = "OK";

      const cuttingForce = op.forces?.cutting_force_N ?? 500;
      const requiredHoldingForce = cuttingForce * sf;

      let totalHoldingForce = 0;
      for (const clamp of workholding.clamp_positions) {
        const whMu = workholding.friction_coefficient ?? DEFAULT_FRICTION_COEFFICIENT;
        const whP = workholding.clamping_pressure_MPa ?? DEFAULT_CLAMPING_PRESSURE_MPA;
        const currentArea = remainingClampArea(
          stock.bounds, state.removed_volumes.concat([removal]), clamp.face
        );
        totalHoldingForce += currentArea * whMu * whP;
      }

      if (totalHoldingForce < requiredHoldingForce) {
        whPass = false;
        whDetail = `Holding force ${totalHoldingForce.toFixed(0)}N < required ${requiredHoldingForce.toFixed(0)}N (F_cut*SF=${cuttingForce}*${sf})`;
      } else if (totalHoldingForce < requiredHoldingForce * 1.5) {
        whDetail = `Holding force margin thin: ${totalHoldingForce.toFixed(0)}N vs ${requiredHoldingForce.toFixed(0)}N required`;
        notes.push("Workholding margin below 1.5x");
      }

      // -- Check 3: Rigidity --
      let rigidityPass = true;
      let rigidityDetail = "OK";

      const newRemovals = state.removed_volumes.concat([removal]);
      const minWall = estimateMinWallThickness(stock.bounds, newRemovals);
      const minThicknessForChatter = op.tool.diameter_mm * MIN_WALL_THICKNESS_FACTOR;

      if (minWall < minThicknessForChatter && minWall < Infinity) {
        rigidityPass = false;
        rigidityDetail = `Min wall ${minWall.toFixed(2)}mm < chatter threshold ${minThicknessForChatter.toFixed(2)}mm (0.05*D_tool)`;
      } else if (minWall < minThicknessForChatter * 2 && minWall < Infinity) {
        rigidityDetail = `Thin wall warning: ${minWall.toFixed(2)}mm approaching chatter limit ${minThicknessForChatter.toFixed(2)}mm`;
        notes.push("Approaching thin-wall chatter threshold");
      }

      // -- Check 4: Datum/Surface Availability --
      let datumPass = true;
      let datumDetail = "OK";

      if (op.requires_datum && !state.remaining_datums.has(op.requires_datum)) {
        datumPass = false;
        datumDetail = `Required datum '${op.requires_datum}' no longer available`;
      }

      if (op.requires_surface && !state.remaining_surfaces.has(op.requires_surface)) {
        datumPass = false;
        datumDetail = `Required surface '${op.requires_surface}' not yet created or destroyed`;
      }

      // -- Apply operation to state --
      state.removed_volumes.push(removal);
      state.bounds = subtractFromStock(state.bounds, removal);
      state.min_wall_thickness_mm = minWall;

      if (op.removes_surface) {
        state.remaining_surfaces.delete(op.removes_surface);
        state.remaining_datums.delete(op.removes_surface);
      }
      if (op.creates_surface) {
        state.remaining_surfaces.add(op.creates_surface);
      }

      for (const clamp of workholding.clamp_positions) {
        const updated = remainingClampArea(stock.bounds, state.removed_volumes, clamp.face);
        state.clamp_areas.set(clamp.face, updated);
      }

      // -- Compute risk score --
      const checksPass = [accessPass, whPass, rigidityPass, datumPass];
      const failCount = checksPass.filter(c => !c).length;
      const opRisk = failCount / checksPass.length;
      cumulativeRisk += opRisk;

      const status: "pass" | "fail" | "warning" =
        failCount > 0 ? "fail" : notes.length > 0 ? "warning" : "pass";

      if (status === "fail") {
        for (let j = i + 1; j < operations.length; j++) {
          const futureOp = operations[j];
          if (futureOp.requires_datum && op.removes_surface === futureOp.requires_datum) {
            deadEnds.push({
              blocking_op: op.id,
              blocked_op: futureOp.id,
              reason: `Op '${op.id}' removes datum '${op.removes_surface}' needed by '${futureOp.id}'`,
              constraint_type: "datum_dependency",
            });
          }
        }
      }

      if (notes.length > 0) {
        warnings.push(...notes.map(n => `[${op.id}] ${n}`));
      }

      perOp.push({
        operation_id: op.id,
        status,
        checks: {
          accessibility: { pass: accessPass, detail: accessDetail },
          workholding: { pass: whPass, detail: whDetail },
          rigidity: { pass: rigidityPass, detail: rigidityDetail },
          datum_available: { pass: datumPass, detail: datumDetail },
        },
        risk_score: opRisk,
        notes,
      });
    }

    const passCount = perOp.filter(o => o.status === "pass").length;
    const failCount = perOp.filter(o => o.status === "fail").length;
    const warningCount = perOp.filter(o => o.status === "warning").length;

    return {
      feasible: failCount === 0,
      pass_count: passCount,
      fail_count: failCount,
      warning_count: warningCount,
      cumulative_risk: cumulativeRisk,
      per_operation: perOp,
      warnings,
      dead_ends: deadEnds,
      workpiece_state_after: state.bounds,
    };
  }

  // --- 2. Dead-End Detection ---

  /**
   * Find operation pairs where completing one makes a future operation impossible.
   *
   * Checks: datum destruction, surface removal, clamping loss, access blocking,
   * rigidity loss from thin walls.
   */
  detectDeadEnds(input: DetectDeadEndsInput): {
    dead_end_pairs: DeadEndPair[];
    dependency_graph: { nodes: string[]; edges: Array<{ from: string; to: string; type: string }> };
    total_checked: number;
  } {
    const { operations, stock, workholding } = input;
    const deadEnds: DeadEndPair[] = [];
    const depEdges: Array<{ from: string; to: string; type: string }> = [];

    logObj.info( `[SequenceFeasibility] Detecting dead-ends in ${operations.length} operations`);

    let totalChecked = 0;

    for (let i = 0; i < operations.length; i++) {
      for (let j = i + 1; j < operations.length; j++) {
        const opA = operations[i];
        const opB = operations[j];
        totalChecked++;

        // Datum dependency
        if (opA.removes_surface && opB.requires_datum === opA.removes_surface) {
          deadEnds.push({
            blocking_op: opA.id, blocked_op: opB.id,
            reason: `Op '${opA.id}' removes surface '${opA.removes_surface}' which is datum for '${opB.id}'`,
            constraint_type: "datum_dependency",
          });
          depEdges.push({ from: opB.id, to: opA.id, type: "datum_dependency" });
        }

        // Surface dependency
        if (opA.removes_surface && opB.requires_surface === opA.removes_surface) {
          deadEnds.push({
            blocking_op: opA.id, blocked_op: opB.id,
            reason: `Op '${opA.id}' removes surface '${opA.removes_surface}' required by '${opB.id}'`,
            constraint_type: "surface_dependency",
          });
          depEdges.push({ from: opB.id, to: opA.id, type: "surface_dependency" });
        }

        // Clamping dependency
        if (opB.forces) {
          const removalA = opRemovalAABB(opA);
          for (const clamp of workholding.clamp_positions) {
            if (removalOverlapsClampFace(removalA, stock.bounds, clamp.face)) {
              const removalsUpToA = operations.slice(0, i + 1).map(opRemovalAABB);
              const areaAfterA = remainingClampArea(stock.bounds, removalsUpToA, clamp.face);
              const clampMu = workholding.friction_coefficient ?? DEFAULT_FRICTION_COEFFICIENT;
              const clampP = workholding.clamping_pressure_MPa ?? DEFAULT_CLAMPING_PRESSURE_MPA;
              const holdingForce = areaAfterA * clampMu * clampP;
              const requiredForce = opB.forces.cutting_force_N * DEFAULT_SAFETY_FACTOR;

              if (holdingForce < requiredForce * 0.5) {
                deadEnds.push({
                  blocking_op: opA.id, blocked_op: opB.id,
                  reason: `Op '${opA.id}' reduces clamping on '${clamp.face}' to ${holdingForce.toFixed(0)}N, insufficient for '${opB.id}' requiring ${requiredForce.toFixed(0)}N`,
                  constraint_type: "clamping_dependency",
                });
                depEdges.push({ from: opB.id, to: opA.id, type: "clamping_dependency" });
                break;
              }
            }
          }
        }

        // Access dependency
        const removalA2 = opRemovalAABB(opA);
        const removalB2 = opRemovalAABB(opB);
        const holderB = opB.tool.holder_diameter_mm ?? opB.tool.diameter_mm * DEFAULT_HOLDER_DIAMETER_FACTOR;

        const xOverlap = removalA2.max_x > removalB2.min_x && removalA2.min_x < removalB2.max_x;
        const yOverlap = removalA2.max_y > removalB2.min_y && removalA2.min_y < removalB2.max_y;
        if (xOverlap && yOverlap) {
          const gapWidth = Math.min(
            Math.abs(removalB2.min_x - removalA2.max_x),
            Math.abs(removalA2.min_x - removalB2.max_x),
            Math.abs(removalB2.min_y - removalA2.max_y),
            Math.abs(removalA2.min_y - removalB2.max_y)
          );
          if (gapWidth < holderB / 2 && removalA2.min_z < removalB2.min_z) {
            deadEnds.push({
              blocking_op: opA.id, blocked_op: opB.id,
              reason: `Op '${opA.id}' restricts holder access to '${opB.id}' (gap ${gapWidth.toFixed(1)}mm < holder radius ${(holderB / 2).toFixed(1)}mm)`,
              constraint_type: "access_dependency",
            });
            depEdges.push({ from: opB.id, to: opA.id, type: "access_dependency" });
          }
        }

        // Rigidity dependency
        if (opB.forces) {
          const removalsUpToA = operations.slice(0, i + 1).map(opRemovalAABB);
          const wallAfterA = estimateMinWallThickness(stock.bounds, removalsUpToA);
          const minForB = opB.tool.diameter_mm * MIN_WALL_THICKNESS_FACTOR;
          if (wallAfterA < minForB && wallAfterA < Infinity) {
            const alreadyCaptured = deadEnds.some(
              d => d.blocking_op === opA.id && d.blocked_op === opB.id
            );
            if (!alreadyCaptured) {
              deadEnds.push({
                blocking_op: opA.id, blocked_op: opB.id,
                reason: `Op '${opA.id}' leaves wall ${wallAfterA.toFixed(2)}mm < chatter limit ${minForB.toFixed(2)}mm for '${opB.id}'`,
                constraint_type: "rigidity_dependency",
              });
              depEdges.push({ from: opB.id, to: opA.id, type: "rigidity_dependency" });
            }
          }
        }
      }
    }

    // Implicit forward dependencies
    for (const opA of operations) {
      for (const opB of operations) {
        if (opA.id === opB.id) continue;
        if (opA.creates_surface && opB.requires_surface === opA.creates_surface) {
          depEdges.push({ from: opA.id, to: opB.id, type: "surface_dependency" });
        }
      }
    }

    return {
      dead_end_pairs: deadEnds,
      dependency_graph: { nodes: operations.map(o => o.id), edges: depEdges },
      total_checked: totalChecked,
    };
  }

  // --- 3. Auto-Resequencing ---

  /**
   * Find valid orderings via backtracking search with constraint propagation.
   *
   * Algorithm:
   *   1. Build constraint graph (must-before / must-after)
   *   2. Pre-compute constraint propagation
   *   3. Backtracking search with pruning
   *   4. Score valid candidates by: cycle time, tool changes, setup changes
   *   5. Return top N or proof of infeasibility
   */
  resequence(input: ResequenceInput): ResequenceResult {
    const { operations, stock, workholding } = input;
    const maxCandidates = input.max_candidates ?? MAX_RESEQUENCE_CANDIDATES;
    const toolChangeTime = input.tool_change_time_sec ?? DEFAULT_TOOL_CHANGE_TIME_SEC;
    const setupChangeTime = input.setup_change_time_sec ?? DEFAULT_SETUP_CHANGE_TIME_SEC;

    logObj.info( `[SequenceFeasibility] Resequencing ${operations.length} operations`);

    const graphResult = this.buildConstraintGraph({ operations, stock, workholding });

    if (graphResult.has_cycles) {
      return {
        valid_sequences: [],
        total_candidates_evaluated: 0,
        proof_of_infeasibility: `Circular constraints detected: ${graphResult.cycles.map(c => c.join(" -> ")).join("; ")}`,
        best_sequence: null,
        improvement_pct: null,
      };
    }

    // Build must-before map from hard constraint edges
    const mustBefore = new Map<string, Set<string>>();
    for (const edge of graphResult.edges) {
      if (edge.weight < 5) continue;
      if (!mustBefore.has(edge.to)) mustBefore.set(edge.to, new Set());
      mustBefore.get(edge.to)!.add(edge.from);
    }

    const validSequences: ScoredSequence[] = [];
    const opIds = operations.map(o => o.id);
    let candidatesEvaluated = 0;

    const backtrack = (current: string[], remaining: Set<string>): void => {
      if (candidatesEvaluated >= maxCandidates) return;
      if (validSequences.length >= MAX_VALID_SEQUENCES_RETURNED * 3) return;

      if (remaining.size === 0) {
        const reorderedOps = current.map(id => operations.find(o => o.id === id)!);
        const simResult = this.simulateSequence({ operations: reorderedOps, stock, workholding });
        candidatesEvaluated++;

        if (simResult.feasible) {
          validSequences.push(this._scoreSequence(current, operations, toolChangeTime, setupChangeTime));
        }
        return;
      }

      for (const opId of remaining) {
        const prereqs = mustBefore.get(opId);
        if (prereqs) {
          let allSatisfied = true;
          for (const pre of prereqs) {
            if (!current.includes(pre)) { allSatisfied = false; break; }
          }
          if (!allSatisfied) continue;
        }
        const newRemaining = new Set(remaining);
        newRemaining.delete(opId);
        backtrack([...current, opId], newRemaining);
      }
    };

    backtrack([], new Set(opIds));

    validSequences.sort((a, b) => a.score - b.score);
    const topSequences = validSequences.slice(0, MAX_VALID_SEQUENCES_RETURNED);

    const originalScored = this._scoreSequence(opIds, operations, toolChangeTime, setupChangeTime);
    let improvement: number | null = null;
    if (topSequences.length > 0 && originalScored.score > 0) {
      improvement = ((originalScored.score - topSequences[0].score) / originalScored.score) * 100;
    }

    return {
      valid_sequences: topSequences,
      total_candidates_evaluated: candidatesEvaluated,
      proof_of_infeasibility: validSequences.length === 0
        ? `No feasible ordering found after evaluating ${candidatesEvaluated} candidates`
        : null,
      best_sequence: topSequences[0] ?? null,
      improvement_pct: improvement,
    };
  }

  // --- 4. Constraint Graph ---

  /**
   * Build directed graph of operation ordering constraints with cycle detection.
   *
   * Constraint types:
   *   - datum_dependency: op B needs datum that op A creates (weight 10)
   *   - surface_dependency: op B needs surface created by op A (weight 10)
   *   - access_dependency: type-based ordering for overlapping regions (weight 5)
   *   - tool_dependency: same tool grouping preference (weight 1)
   *   - rigidity_dependency: must machine before thin walls form
   */
  buildConstraintGraph(input: ConstraintGraphInput): ConstraintGraph {
    const { operations } = input;
    const edges: ConstraintEdge[] = [];
    const nodes = operations.map(o => o.id);

    logObj.info( `[SequenceFeasibility] Building constraint graph for ${operations.length} operations`);

    // Surface/datum dependencies
    for (const opA of operations) {
      for (const opB of operations) {
        if (opA.id === opB.id) continue;

        if (opA.creates_surface && opB.requires_surface === opA.creates_surface) {
          edges.push({
            from: opA.id, to: opB.id, type: "surface_dependency",
            reason: `'${opB.id}' requires surface '${opA.creates_surface}' created by '${opA.id}'`,
            weight: 10,
          });
        }

        if (opA.creates_surface && opB.requires_datum === opA.creates_surface) {
          edges.push({
            from: opA.id, to: opB.id, type: "datum_dependency",
            reason: `'${opB.id}' uses datum '${opA.creates_surface}' created by '${opA.id}'`,
            weight: 10,
          });
        }

        if (opB.removes_surface && opA.requires_datum === opB.removes_surface) {
          edges.push({
            from: opA.id, to: opB.id, type: "datum_dependency",
            reason: `'${opA.id}' needs datum '${opB.removes_surface}' before '${opB.id}' destroys it`,
            weight: 10,
          });
        }
      }
    }

    // Type-based implicit ordering (rough before finish on overlapping regions)
    for (const opA of operations) {
      for (const opB of operations) {
        if (opA.id === opB.id) continue;
        const typeOrder: Record<string, number> = {
          rough: 0, semi_finish: 1, finish: 2, deburr: 3, chamfer: 3,
        };
        const orderA = typeOrder[opA.type];
        const orderB = typeOrder[opB.type];
        if (orderA !== undefined && orderB !== undefined && orderA < orderB) {
          const remA = opRemovalAABB(opA);
          const remB = opRemovalAABB(opB);
          if (this._aabbOverlap(remA, remB)) {
            edges.push({
              from: opA.id, to: opB.id, type: "access_dependency",
              reason: `${opA.type} before ${opB.type} on overlapping region`,
              weight: 5,
            });
          }
        }
      }
    }

    // Tool grouping (soft constraint)
    for (let i = 0; i < operations.length; i++) {
      for (let j = i + 1; j < operations.length; j++) {
        if (operations[i].tool.id === operations[j].tool.id) {
          edges.push({
            from: operations[i].id, to: operations[j].id, type: "tool_dependency",
            reason: `Same tool '${operations[i].tool.id}'`,
            weight: 1,
          });
        }
      }
    }

    // Setup grouping
    for (const opA of operations) {
      for (const opB of operations) {
        if (opA.id === opB.id) continue;
        if (opA.setup_id && opB.setup_id && opA.setup_id === opB.setup_id && opA.id < opB.id) {
          edges.push({
            from: opA.id, to: opB.id, type: "access_dependency",
            reason: `Same setup '${opA.setup_id}'`,
            weight: 2,
          });
        }
      }
    }

    // Cycle detection on hard constraints (weight >= 5)
    const hardEdges = edges.filter(e => e.weight >= 5);
    const { hasCycles, cycles, topoOrder } = this._detectCycles(nodes, hardEdges);

    return { nodes, edges, has_cycles: hasCycles, cycles, topological_order: topoOrder };
  }

  // --- Private Helpers ---

  /** Nearest wall distance from a point to any removal zone boundary. */
  private _nearestWallDistance(
    point: { x: number; y: number; z: number },
    removals: SeqAABB[],
    stock: SeqAABB,
  ): number {
    let minDist = Infinity;
    for (const r of removals) {
      const dx = Math.max(0, r.min_x - point.x, point.x - r.max_x);
      const dy = Math.max(0, r.min_y - point.y, point.y - r.max_y);
      if (dx === 0 && dy === 0) continue;
      const dist = Math.sqrt(dx * dx + dy * dy);
      minDist = Math.min(minDist, dist);
    }
    minDist = Math.min(minDist,
      point.x - stock.min_x, stock.max_x - point.x,
      point.y - stock.min_y, stock.max_y - point.y,
    );
    return Math.max(0, minDist);
  }

  /** Check if two AABBs overlap. */
  private _aabbOverlap(a: SeqAABB, b: SeqAABB): boolean {
    return a.min_x < b.max_x && a.max_x > b.min_x &&
           a.min_y < b.max_y && a.max_y > b.min_y &&
           a.min_z < b.max_z && a.max_z > b.min_z;
  }

  /** Detect cycles in directed graph using Kahn's algorithm. */
  private _detectCycles(
    nodes: string[],
    edges: ConstraintEdge[],
  ): { hasCycles: boolean; cycles: string[][]; topoOrder: string[] | null } {
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();

    for (const n of nodes) {
      inDegree.set(n, 0);
      adj.set(n, []);
    }

    for (const e of edges) {
      if (!adj.has(e.from) || !adj.has(e.to)) continue;
      adj.get(e.from)!.push(e.to);
      inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
    }

    const queue: string[] = [];
    for (const [n, d] of inDegree) {
      if (d === 0) queue.push(n);
    }

    const topoOrder: string[] = [];
    while (queue.length > 0) {
      const node = queue.shift()!;
      topoOrder.push(node);
      for (const neighbor of adj.get(node) ?? []) {
        const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
        inDegree.set(neighbor, newDeg);
        if (newDeg === 0) queue.push(neighbor);
      }
    }

    if (topoOrder.length === nodes.length) {
      return { hasCycles: false, cycles: [], topoOrder };
    }

    // Find cycles: nodes not in topo order participate in cycles
    const inCycle = nodes.filter(n => !topoOrder.includes(n));
    const cycles: string[][] = [];
    const visited = new Set<string>();

    for (const start of inCycle) {
      if (visited.has(start)) continue;
      const path: string[] = [];
      const pathSet = new Set<string>();

      const dfs = (node: string): void => {
        if (pathSet.has(node)) {
          const cycleStart = path.indexOf(node);
          if (cycleStart >= 0) cycles.push([...path.slice(cycleStart), node]);
          return;
        }
        if (visited.has(node)) return;
        visited.add(node);
        path.push(node);
        pathSet.add(node);
        for (const next of adj.get(node) ?? []) {
          if (inCycle.includes(next)) dfs(next);
        }
        path.pop();
        pathSet.delete(node);
      };

      dfs(start);
    }

    if (cycles.length === 0 && inCycle.length > 0) cycles.push(inCycle);
    return { hasCycles: true, cycles, topoOrder: null };
  }

  /** Score a sequence by cycle time, tool changes, and setup changes. */
  private _scoreSequence(
    order: string[],
    operations: SeqOperation[],
    toolChangeTime: number,
    setupChangeTime: number,
  ): ScoredSequence {
    const opMap = new Map<string, SeqOperation>();
    for (const op of operations) opMap.set(op.id, op);

    let cycleTime = 0;
    let toolChanges = 0;
    let setupChanges = 0;
    let prevToolId: string | null = null;
    let prevSetupId: string | null = null;

    for (const id of order) {
      const op = opMap.get(id);
      if (!op) continue;
      cycleTime += op.estimated_time_sec ?? 30;
      if (prevToolId !== null && op.tool.id !== prevToolId) {
        toolChanges++;
        cycleTime += toolChangeTime;
      }
      if (prevSetupId !== null && op.setup_id !== prevSetupId && op.setup_id !== undefined) {
        setupChanges++;
        cycleTime += setupChangeTime;
      }
      prevToolId = op.tool.id;
      prevSetupId = op.setup_id ?? prevSetupId;
    }

    return {
      order,
      score: cycleTime + toolChanges * 5 + setupChanges * 50,
      cycle_time_sec: cycleTime,
      tool_changes: toolChanges,
      setup_changes: setupChanges,
      feasible: true,
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const sequenceFeasibilityEngine = new SequenceFeasibilityEngine();
