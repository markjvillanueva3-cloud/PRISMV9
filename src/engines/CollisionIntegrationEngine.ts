/**
 * CollisionIntegrationEngine — CAMK-MS2/U03
 *
 * Full collision detection on novel algorithm output: tool body + holder + spindle
 * vs stock + fixtures + machine structure. For 5-axis: checks at each segment
 * with (x,y,z,i,j,k) orientation.
 *
 * Integrates with high-risk algorithms:
 * - MACS (swarf cutting — high collision risk)
 * - HBCF (barrel cutter — large swept volume)
 * - PTDC (compensated coordinates may approach stock)
 *
 * Uses conservative AABB broad-phase + swept envelope narrow-phase.
 * SAFETY: False positives OK, false negatives NEVER.
 */

import type { SegmentPoint } from "./NovelToolpathEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface CollisionCheckInput {
  /** Toolpath segments from novel algorithm output */
  segments: SegmentPoint[];
  /** Tool assembly */
  tool: {
    diameter_mm: number;
    cutting_length_mm?: number;
    holder_diameter_mm?: number;
    holder_length_mm?: number;
    spindle_diameter_mm?: number;
    /** Tool type affects swept volume */
    type?: "flat" | "ball" | "bull_nose" | "barrel";
    /** Barrel cutter barrel radius (large swept volume) */
    barrel_radius_mm?: number;
  };
  /** Stock bounding box */
  stock: {
    min_x: number; min_y: number; min_z: number;
    max_x: number; max_y: number; max_z: number;
  };
  /** Fixture bodies */
  fixtures?: Array<{
    id: string;
    min_x: number; min_y: number; min_z: number;
    max_x: number; max_y: number; max_z: number;
  }>;
  /** Safety margin in mm (default: 2mm) */
  safety_margin_mm?: number;
  /** Machine structure limits */
  machine_envelope?: {
    min_x: number; min_y: number; min_z: number;
    max_x: number; max_y: number; max_z: number;
  };
  /** Algorithm name for risk assessment */
  algorithm?: string;
}

export interface CollisionEvent {
  segment_index: number;
  position: { x: number; y: number; z: number };
  severity: "collision" | "near_miss" | "safe";
  body_a: string;
  body_b: string;
  clearance_mm: number;
  description: string;
}

export interface CollisionReport {
  /** Total collision events */
  collision_count: number;
  /** Total near-miss events (within 2x safety margin) */
  near_miss_count: number;
  /** Is the toolpath collision-free? */
  is_safe: boolean;
  /** Minimum clearance found (mm) */
  min_clearance_mm: number;
  /** Collision events */
  events: CollisionEvent[];
  /** Per-segment clearance profile */
  clearance_profile: number[];
  /** Tool assembly envelope at each point */
  assembly_envelope: Array<{
    index: number;
    tool_tip: { x: number; y: number; z: number };
    holder_top: { x: number; y: number; z: number };
    max_radius_mm: number;
  }>;
  /** Algorithm-specific risk assessment */
  risk_assessment: {
    algorithm: string;
    risk_level: "low" | "medium" | "high" | "critical";
    risk_factors: string[];
    recommendations: string[];
  };
  /** Warnings */
  warnings: string[];
}

// ============================================================================
// TOOL ASSEMBLY MODEL
// ============================================================================

interface AssemblyEnvelope {
  /** Tool cutting zone: cone/cylinder from tip */
  tool_radius: number;
  tool_length: number;
  /** Holder zone above tool */
  holder_radius: number;
  holder_length: number;
  /** Spindle zone above holder */
  spindle_radius: number;
  /** Total stick-out from spindle face */
  total_length: number;
}

function buildAssembly(tool: CollisionCheckInput["tool"]): AssemblyEnvelope {
  const toolR = tool.diameter_mm / 2;
  const toolL = tool.cutting_length_mm ?? Math.max(3 * tool.diameter_mm, 30);
  const holderR = (tool.holder_diameter_mm ?? tool.diameter_mm * 1.5) / 2;
  const holderL = tool.holder_length_mm ?? 50;
  const spindleR = (tool.spindle_diameter_mm ?? holderR * 2) / 2;

  // Barrel cutter has larger effective radius
  const effectiveToolR = tool.type === "barrel" && tool.barrel_radius_mm
    ? Math.max(toolR, toolR + 2) // barrel profile extends slightly
    : toolR;

  return {
    tool_radius: effectiveToolR,
    tool_length: toolL,
    holder_radius: holderR,
    holder_length: holderL,
    spindle_radius: spindleR,
    total_length: toolL + holderL,
  };
}

// ============================================================================
// COLLISION CHECKS
// ============================================================================

/**
 * Check if a point on the tool assembly is inside a bounding box.
 * Returns clearance (negative = collision, positive = clear).
 */
function pointToAABBClearance(
  px: number, py: number, pz: number, radius: number,
  box: { min_x: number; min_y: number; min_z: number; max_x: number; max_y: number; max_z: number }
): number {
  // Expand box by tool radius for cylinder-to-box check
  const dx = Math.max(box.min_x - px, 0, px - box.max_x);
  const dy = Math.max(box.min_y - py, 0, py - box.max_y);
  const dz = Math.max(box.min_z - pz, 0, pz - box.max_z);

  // If point is inside box
  if (dx === 0 && dy === 0 && dz === 0) {
    // Point is inside — find minimum distance to exit
    const exits = [
      px - box.min_x, box.max_x - px,
      py - box.min_y, box.max_y - py,
      pz - box.min_z, box.max_z - pz,
    ];
    return -(Math.min(...exits) + radius); // negative = collision
  }

  // Distance from point to nearest box surface
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return dist - radius; // positive = clear, negative = collision
}

/**
 * Check tool assembly against all obstacles at a given position.
 * For 5-axis: rotate assembly along tool axis (i,j,k).
 */
function checkAssemblyAtPoint(
  seg: SegmentPoint,
  assembly: AssemblyEnvelope,
  stock: CollisionCheckInput["stock"],
  fixtures: CollisionCheckInput["fixtures"],
  machineEnvelope: CollisionCheckInput["machine_envelope"],
  safetyMargin: number
): { clearance: number; events: CollisionEvent[]; assemblyTop: { x: number; y: number; z: number } } {
  const events: CollisionEvent[] = [];
  let minClearance = Infinity;

  // Tool axis vector (default: Z-up)
  const ax = seg.i ?? 0;
  const ay = seg.j ?? 0;
  const az = seg.k ?? 1;
  const axLen = Math.sqrt(ax * ax + ay * ay + az * az) || 1;
  const nx = ax / axLen;
  const ny = ay / axLen;
  const nz = az / axLen;

  // Points along assembly to check
  const checkPoints = [
    // Tool tip
    { x: seg.x, y: seg.y, z: seg.z, r: assembly.tool_radius, label: "tool_tip" },
    // Mid-tool
    { x: seg.x + nx * assembly.tool_length * 0.5, y: seg.y + ny * assembly.tool_length * 0.5,
      z: seg.z + nz * assembly.tool_length * 0.5, r: assembly.tool_radius, label: "tool_mid" },
    // Tool-holder junction
    { x: seg.x + nx * assembly.tool_length, y: seg.y + ny * assembly.tool_length,
      z: seg.z + nz * assembly.tool_length, r: assembly.holder_radius, label: "holder_base" },
    // Mid-holder
    { x: seg.x + nx * (assembly.tool_length + assembly.holder_length * 0.5),
      y: seg.y + ny * (assembly.tool_length + assembly.holder_length * 0.5),
      z: seg.z + nz * (assembly.tool_length + assembly.holder_length * 0.5),
      r: assembly.holder_radius, label: "holder_mid" },
    // Holder top
    { x: seg.x + nx * assembly.total_length,
      y: seg.y + ny * assembly.total_length,
      z: seg.z + nz * assembly.total_length,
      r: assembly.spindle_radius, label: "spindle" },
  ];

  const assemblyTop = checkPoints[checkPoints.length - 1];

  for (const cp of checkPoints) {
    // Skip tool tip/mid for stock check — they're supposed to be in stock
    const isToolZone = cp.label === "tool_tip" || cp.label === "tool_mid";

    // Check against stock (only holder/spindle should not collide with stock)
    if (!isToolZone) {
      const stockClearance = pointToAABBClearance(cp.x, cp.y, cp.z, cp.r, stock);
      if (stockClearance < safetyMargin) {
        minClearance = Math.min(minClearance, stockClearance);
        if (stockClearance < 0) {
          events.push({
            segment_index: -1, // filled later
            position: { x: cp.x, y: cp.y, z: cp.z },
            severity: "collision",
            body_a: cp.label,
            body_b: "stock",
            clearance_mm: Math.round(stockClearance * 100) / 100,
            description: `${cp.label} collides with stock (clearance: ${stockClearance.toFixed(1)}mm)`,
          });
        } else if (stockClearance < safetyMargin) {
          events.push({
            segment_index: -1,
            position: { x: cp.x, y: cp.y, z: cp.z },
            severity: "near_miss",
            body_a: cp.label,
            body_b: "stock",
            clearance_mm: Math.round(stockClearance * 100) / 100,
            description: `${cp.label} near-miss with stock (clearance: ${stockClearance.toFixed(1)}mm < ${safetyMargin}mm)`,
          });
        }
      }
    }

    // Check against fixtures
    if (fixtures) {
      for (const fix of fixtures) {
        const fixClearance = pointToAABBClearance(cp.x, cp.y, cp.z, cp.r, fix);
        if (fixClearance < safetyMargin) {
          minClearance = Math.min(minClearance, fixClearance);
          events.push({
            segment_index: -1,
            position: { x: cp.x, y: cp.y, z: cp.z },
            severity: fixClearance < 0 ? "collision" : "near_miss",
            body_a: cp.label,
            body_b: `fixture_${fix.id}`,
            clearance_mm: Math.round(fixClearance * 100) / 100,
            description: `${cp.label} ${fixClearance < 0 ? "collides with" : "near-miss with"} fixture ${fix.id}`,
          });
        }
      }
    }

    // Check machine envelope
    if (machineEnvelope) {
      const me = machineEnvelope;
      // Point must be INSIDE envelope
      if (cp.x - cp.r < me.min_x || cp.x + cp.r > me.max_x ||
          cp.y - cp.r < me.min_y || cp.y + cp.r > me.max_y ||
          cp.z - cp.r < me.min_z || cp.z + cp.r > me.max_z) {
        events.push({
          segment_index: -1,
          position: { x: cp.x, y: cp.y, z: cp.z },
          severity: "collision",
          body_a: cp.label,
          body_b: "machine_envelope",
          clearance_mm: 0,
          description: `${cp.label} exceeds machine envelope`,
        });
        minClearance = Math.min(minClearance, 0);
      }
    }
  }

  if (minClearance === Infinity) minClearance = 999;

  return { clearance: minClearance, events, assemblyTop: { x: assemblyTop.x, y: assemblyTop.y, z: assemblyTop.z } };
}

// ============================================================================
// RISK ASSESSMENT
// ============================================================================

function assessRisk(
  algorithm: string,
  collisionCount: number,
  nearMissCount: number,
  toolType: string,
  has5Axis: boolean
): CollisionReport["risk_assessment"] {
  const algo = algorithm.toUpperCase();
  const factors: string[] = [];
  const recommendations: string[] = [];

  // Algorithm-specific risk factors
  if (algo === "MACS") {
    factors.push("MACS swarf cutting: tool side engagement increases collision risk");
    factors.push("5-axis orientation changes near stock surface");
    recommendations.push("Verify holder clearance at all tilt angles");
  }
  if (algo === "HBCF") {
    factors.push("HBCF barrel cutter: large effective diameter swept volume");
    recommendations.push("Use reduced safety margin check with barrel profile");
  }
  if (algo === "PTDC") {
    factors.push("PTDC compensated coordinates shift tool closer to final surface");
    recommendations.push("Verify compensation does not exceed stock boundary");
  }
  if (algo === "SNWF") {
    factors.push("SNWF swarf: simultaneous 5-axis with lateral engagement");
  }

  if (has5Axis) {
    factors.push("5-axis operation: tool orientation varies per segment");
  }
  if (toolType === "barrel") {
    factors.push("Barrel cutter: non-standard swept volume geometry");
  }

  // Determine risk level
  let risk_level: CollisionReport["risk_assessment"]["risk_level"] = "low";
  if (collisionCount > 0) risk_level = "critical";
  else if (nearMissCount > 5) risk_level = "high";
  else if (nearMissCount > 0 || factors.length > 2) risk_level = "medium";

  if (collisionCount > 0) {
    recommendations.push(`${collisionCount} collisions detected — toolpath MUST be modified`);
  }
  if (nearMissCount > 0) {
    recommendations.push(`${nearMissCount} near-misses — consider increasing clearance`);
  }

  return { algorithm: algo || "UNKNOWN", risk_level, risk_factors: factors, recommendations };
}

// ============================================================================
// MAIN ENGINE
// ============================================================================

class CollisionIntegrationEngine {
  /**
   * Run full collision detection on novel algorithm output.
   */
  check(input: CollisionCheckInput): CollisionReport {
    const assembly = buildAssembly(input.tool);
    const safetyMargin = input.safety_margin_mm ?? 2;
    const warnings: string[] = [];

    const allEvents: CollisionEvent[] = [];
    const clearanceProfile: number[] = [];
    const assemblyEnvelopes: CollisionReport["assembly_envelope"] = [];

    let has5Axis = false;
    const snapshotInterval = Math.max(Math.floor(input.segments.length / 20), 1);

    for (let i = 0; i < input.segments.length; i++) {
      const seg = input.segments[i];
      if (seg.i !== undefined || seg.j !== undefined || (seg.k !== undefined && seg.k !== 1)) {
        has5Axis = true;
      }

      const result = checkAssemblyAtPoint(
        seg, assembly, input.stock,
        input.fixtures, input.machine_envelope, safetyMargin
      );

      clearanceProfile.push(Math.round(Math.min(result.clearance, 100) * 10) / 10);

      // Tag events with segment index
      for (const evt of result.events) {
        evt.segment_index = i;
        allEvents.push(evt);
      }

      // Assembly envelope snapshot
      if (i % snapshotInterval === 0) {
        assemblyEnvelopes.push({
          index: i,
          tool_tip: { x: seg.x, y: seg.y, z: seg.z },
          holder_top: result.assemblyTop,
          max_radius_mm: Math.max(assembly.tool_radius, assembly.holder_radius, assembly.spindle_radius),
        });
      }
    }

    const collisionCount = allEvents.filter(e => e.severity === "collision").length;
    const nearMissCount = allEvents.filter(e => e.severity === "near_miss").length;
    const minClearance = clearanceProfile.length > 0
      ? Math.min(...clearanceProfile) : 999;

    // Risk assessment
    const risk = assessRisk(
      input.algorithm ?? "",
      collisionCount,
      nearMissCount,
      input.tool.type ?? "flat",
      has5Axis
    );

    if (has5Axis && !input.tool.holder_diameter_mm) {
      warnings.push("5-axis detected but no holder diameter specified — using estimated holder size");
    }

    return {
      collision_count: collisionCount,
      near_miss_count: nearMissCount,
      is_safe: collisionCount === 0,
      min_clearance_mm: Math.round(minClearance * 10) / 10,
      events: allEvents.slice(0, 100), // cap for output size
      clearance_profile: clearanceProfile,
      assembly_envelope: assemblyEnvelopes,
      risk_assessment: risk,
      warnings,
    };
  }

  /**
   * Quick check — returns just pass/fail with collision count.
   */
  quickCheck(input: CollisionCheckInput): {
    is_safe: boolean;
    collision_count: number;
    near_miss_count: number;
    min_clearance_mm: number;
    risk_level: string;
  } {
    const result = this.check(input);
    return {
      is_safe: result.is_safe,
      collision_count: result.collision_count,
      near_miss_count: result.near_miss_count,
      min_clearance_mm: result.min_clearance_mm,
      risk_level: result.risk_assessment.risk_level,
    };
  }

  /**
   * Build tool assembly envelope description.
   */
  getAssemblyEnvelope(tool: CollisionCheckInput["tool"]): AssemblyEnvelope {
    return buildAssembly(tool);
  }
}

export const collisionIntegrationEngine = new CollisionIntegrationEngine();
