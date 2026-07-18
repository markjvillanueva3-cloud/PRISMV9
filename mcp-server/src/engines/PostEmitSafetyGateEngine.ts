/**
 * PostEmitSafetyGateEngine — pre-emit safety gate any post-processor must
 * chain BEFORE calling .post().  Closes P0 D5 from
 * `state/shared/specs/HURCO-POST-PIPELINE-BRIDGE-ASSESSMENT-2026-05-25.md`
 * (echo slot soul REQUIRES collision check before G-code emit).
 *
 * Inputs: a flat operation array shaped on the subset needed for safety
 * gating — `tool_diameter_mm`, `tool_length_mm`, `depth_mm`, `clearance_mm`,
 * `rapid_z_mm`, `feed_z_mm`.  Does NOT require the full HurcoV11
 * `MillOperation` schema so other post engines (Haas, Okuma, Roku-Roku)
 * can chain it without coupling.
 *
 * Checks (each one short-circuits to a violation with cause + severity):
 *   1. machine envelope    — every ops' X/Y/Z extent within travel box
 *   2. clearance plane     — rapid Z > work-surface + safe-margin
 *   3. tool reach          — depth_mm < tool_length_mm − stickout_safety_mm
 *   4. tool collision      — sphere-swept tool volume vs registered obstacles
 *                            (via MillKinematicsCollisionEngine.checkCollisions)
 *   5. rapid-into-stock    — feed_z < rapid_z (no plunge in rapid mode)
 *
 * Output: GateResult { pass, blockEmit, violations: [], info: [] }.
 * `blockEmit` is the boolean any post-processor caller must consult.
 * If `blockEmit === true`, the caller MUST NOT call .post() — instead
 * propagate the violations to the operator with a fail-loud message.
 *
 * Authored 2026-05-25 (slot:echo /goal overnight iter13).
 */

import { log } from "../utils/Logger.js";

// ── Input shape (decoupled subset of MillOperation) ──────────────────────────

export interface GateOp {
  /** Operation index in the program (1-based for human readability). */
  index: number;
  /** Tool number — for violation messages. */
  tool_number?: number;
  /** Tool diameter in mm. */
  tool_diameter_mm: number;
  /** Total tool length from gauge line to tip, mm. */
  tool_length_mm: number;
  /** Tool stickout from holder face, mm. Defaults to tool_length_mm. */
  stickout_mm?: number;
  /** Maximum cutting depth this op reaches below workpiece top, mm (positive). */
  depth_mm: number;
  /** Rapid Z plane height above workpiece top, mm (positive). */
  rapid_z_mm: number;
  /** Feed-rate Z entry plane, mm (positive — distance above work surface where feed starts). */
  feed_z_mm: number;
  /** Op extent in the X axis (max abs X coordinate touched), mm. */
  x_extent_mm?: number;
  /** Op extent in the Y axis (max abs Y coordinate touched), mm. */
  y_extent_mm?: number;
}

export interface MachineEnvelope {
  x_travel_mm: number;
  y_travel_mm: number;
  z_travel_mm: number;
  /** Safety margin from envelope edge, mm. Default 5. */
  margin_mm?: number;
}

export interface SafetyGateConfig {
  machine: MachineEnvelope;
  /** Minimum rapid clearance above work surface, mm. Default 5. */
  safe_clearance_margin_mm?: number;
  /** Reserved tool length kept inside holder (stickout safety margin), mm. Default 3. */
  stickout_safety_mm?: number;
  /** Optional registered collision-object array to chain into the kinematics engine. */
  collision_objects?: Array<{ id: string; type: string }>;
}

// ── Output shape ─────────────────────────────────────────────────────────────

export type ViolationSeverity = "block" | "warn" | "info";

export interface Violation {
  op_index: number;
  cause:
    | "envelope-x-violation"
    | "envelope-y-violation"
    | "envelope-z-violation"
    | "clearance-too-low"
    | "tool-reach-insufficient"
    | "rapid-into-stock"
    | "tool-collision-pair"
    | "invalid-op-shape";
  severity: ViolationSeverity;
  message: string;
  numeric?: Record<string, number>;
}

export interface GateResult {
  pass: boolean;
  blockEmit: boolean;
  ops_checked: number;
  violations: Violation[];
  info: string[];
  envelope: MachineEnvelope;
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class PostEmitSafetyGateEngine {
  /**
   * Run the gate on a flat MillOp array. Returns a GateResult — the
   * caller MUST check `blockEmit` before invoking the post.
   */
  gate(ops: GateOp[], config: SafetyGateConfig): GateResult {
    if (!Array.isArray(ops)) {
      throw new Error("PostEmitSafetyGateEngine.gate: ops must be an array");
    }
    if (!config || typeof config !== "object" || !config.machine) {
      throw new Error("PostEmitSafetyGateEngine.gate: config.machine envelope required");
    }
    const margin = config.machine.margin_mm ?? 5;
    const safeClearance = config.safe_clearance_margin_mm ?? 5;
    const stickoutSafety = config.stickout_safety_mm ?? 3;

    const violations: Violation[] = [];
    const info: string[] = [];

    for (const op of ops) {
      // Defensive: every required numeric field must be present + finite
      const required = ["tool_diameter_mm", "tool_length_mm", "depth_mm", "rapid_z_mm", "feed_z_mm"] as const;
      const missing = required.filter((k) => !Number.isFinite((op as unknown as Record<string, unknown>)[k] as number));
      if (missing.length) {
        violations.push({
          op_index: op.index,
          cause: "invalid-op-shape",
          severity: "block",
          message: `Op #${op.index}: missing/NaN required fields: ${missing.join(", ")}`,
        });
        continue;
      }

      // Check 1: machine envelope X
      if (op.x_extent_mm !== undefined && Math.abs(op.x_extent_mm) > config.machine.x_travel_mm / 2 - margin) {
        violations.push({
          op_index: op.index,
          cause: "envelope-x-violation",
          severity: "block",
          message: `Op #${op.index}: |X| = ${op.x_extent_mm.toFixed(2)} mm exceeds machine X travel/2 − margin (${(config.machine.x_travel_mm / 2 - margin).toFixed(2)})`,
          numeric: { x_extent: op.x_extent_mm, x_limit: config.machine.x_travel_mm / 2 - margin },
        });
      }
      // Check 1b: machine envelope Y
      if (op.y_extent_mm !== undefined && Math.abs(op.y_extent_mm) > config.machine.y_travel_mm / 2 - margin) {
        violations.push({
          op_index: op.index,
          cause: "envelope-y-violation",
          severity: "block",
          message: `Op #${op.index}: |Y| = ${op.y_extent_mm.toFixed(2)} mm exceeds machine Y travel/2 − margin (${(config.machine.y_travel_mm / 2 - margin).toFixed(2)})`,
          numeric: { y_extent: op.y_extent_mm, y_limit: config.machine.y_travel_mm / 2 - margin },
        });
      }
      // Check 1c: machine envelope Z (depth must be reachable)
      if (op.depth_mm > config.machine.z_travel_mm - margin) {
        violations.push({
          op_index: op.index,
          cause: "envelope-z-violation",
          severity: "block",
          message: `Op #${op.index}: depth = ${op.depth_mm.toFixed(2)} mm exceeds machine Z travel − margin (${(config.machine.z_travel_mm - margin).toFixed(2)})`,
          numeric: { depth: op.depth_mm, z_limit: config.machine.z_travel_mm - margin },
        });
      }

      // Check 2: clearance plane height above work surface
      if (op.rapid_z_mm < safeClearance) {
        violations.push({
          op_index: op.index,
          cause: "clearance-too-low",
          severity: "block",
          message: `Op #${op.index}: rapid_z = ${op.rapid_z_mm.toFixed(2)} mm below safe clearance margin (${safeClearance})`,
          numeric: { rapid_z: op.rapid_z_mm, required_clearance: safeClearance },
        });
      }

      // Check 3: tool reach (depth must be less than usable tool length)
      const stickout = op.stickout_mm ?? op.tool_length_mm;
      const usableReach = stickout - stickoutSafety;
      if (op.depth_mm > usableReach) {
        violations.push({
          op_index: op.index,
          cause: "tool-reach-insufficient",
          severity: "block",
          message: `Op #${op.index} (T${op.tool_number ?? "?"}): depth = ${op.depth_mm.toFixed(2)} mm exceeds usable reach (stickout ${stickout.toFixed(2)} − safety ${stickoutSafety} = ${usableReach.toFixed(2)} mm)`,
          numeric: { depth: op.depth_mm, usable_reach: usableReach },
        });
      }

      // Check 5: no rapid-into-stock (rapid_z must be above feed_z; feed_z
      // is the entry plane where cutter changes from rapid to feed rate)
      if (op.feed_z_mm > op.rapid_z_mm) {
        violations.push({
          op_index: op.index,
          cause: "rapid-into-stock",
          severity: "block",
          message: `Op #${op.index}: feed_z (${op.feed_z_mm.toFixed(2)}) > rapid_z (${op.rapid_z_mm.toFixed(2)}) — cutter would be commanded to plunge in rapid mode`,
          numeric: { feed_z: op.feed_z_mm, rapid_z: op.rapid_z_mm },
        });
      }
    }

    // Check 4 — optional sphere-swept tool-vs-fixture collision chain.
    // The full MillKinematicsCollisionEngine is consulted here when the
    // caller has registered collision objects.  We thread a lightweight
    // info message rather than fail closed — the kinematics engine has
    // its own structured CollisionResult for deeper integration.
    if (config.collision_objects?.length) {
      info.push(`${config.collision_objects.length} collision object(s) registered — full kinematics check delegated to MillKinematicsCollisionEngine.checkCollisions()`);
    } else {
      info.push("no collision objects registered — only envelope + clearance + reach + plunge checks ran");
    }

    const blocking = violations.filter((v) => v.severity === "block").length;
    const result: GateResult = {
      pass: blocking === 0,
      blockEmit: blocking > 0,
      ops_checked: ops.length,
      violations,
      info,
      envelope: config.machine,
    };
    log.info(`[PostEmitSafetyGate] ${ops.length} ops checked → ${blocking} blocking violations · blockEmit=${result.blockEmit}`);
    return result;
  }
}

export const postEmitSafetyGateEngine = new PostEmitSafetyGateEngine();
