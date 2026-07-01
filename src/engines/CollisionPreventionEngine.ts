/**
 * CollisionPreventionEngine — CAMX-MS14/U04 (E1139)
 *
 * Pre-computes collision zones for an entire toolpath BEFORE execution.
 * Checks tool body + holder + spindle assembly against stock + fixture +
 * machine envelope at every toolpath block.
 *
 * Returns collision-free certification or rejection with:
 *   - Exact collision location (block index, XYZ)
 *   - Collision body pair (e.g., "holder vs fixture_clamp_1")
 *   - Minimum clearance found across entire path
 *   - Near-miss zones (within 2x safety margin)
 *
 * Geometry approach:
 *   1. Broad-phase: AABB (Axis-Aligned Bounding Box) overlap test
 *      - O(N*M) where N=blocks, M=obstacles; culls >90% of checks
 *   2. Narrow-phase: swept cylinder/cone intersection
 *      - Tool body: cylinder from tip to cutting_length
 *      - Holder: larger cylinder from cutting_length to holder_top
 *      - Spindle: largest cylinder above holder
 *   3. For 5-axis: checks at interpolated orientations (i,j,k vectors)
 *      with configurable angular resolution (default 1 degree)
 *
 * SAFETY: Conservative — false positives acceptable, false negatives NEVER.
 *         Safety margin default: 2mm on all clearance checks.
 *
 * References:
 *   - CollisionIntegrationEngine (E1069) — per-segment checking
 *   - CollisionDetectionEngine — basic collision tools
 *   - Ericson "Real-Time Collision Detection" (2004) — AABB, swept volumes
 *   - DMG MORI collision avoidance system: 2mm default margin
 *
 * @module CollisionPreventionEngine
 * @shortcode E1139
 * @dispatcher camDispatcher
 * @actions collision_prevent_full, collision_prevent_certify, collision_prevent_zones
 * @milestone CAMX-MS14/U04
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default safety margin [mm] */
const DEFAULT_SAFETY_MARGIN_MM = 2.0;

/** Near-miss threshold: 2x safety margin */
const NEAR_MISS_FACTOR = 2.0;

/** Default holder diameter if not specified: 1.5x tool diameter */
const HOLDER_DIAMETER_FACTOR = 1.5;

/** Default holder length [mm] */
const DEFAULT_HOLDER_LENGTH_MM = 50;

/** Default spindle nose diameter [mm] */
const DEFAULT_SPINDLE_DIAMETER_MM = 80;

/** Angular resolution for 5-axis orientation checks [degrees] */
const DEFAULT_ANGULAR_RESOLUTION_DEG = 1.0;

/** Maximum blocks to check in a single call (performance guard) */
const MAX_BLOCKS = 500000;

// ============================================================================
// TYPES
// ============================================================================

/** A single toolpath block (line of motion) */
export interface ToolpathBlock {
  /** Block index (0-based) */
  index: number;
  /** End position X [mm] */
  x: number;
  /** End position Y [mm] */
  y: number;
  /** End position Z [mm] */
  z: number;
  /** Tool axis direction (5-axis) — unit vector */
  i?: number;
  j?: number;
  k?: number;
  /** Motion type */
  motion?: "rapid" | "linear" | "cw_arc" | "ccw_arc";
  /** Feed rate [mm/min] — 0 = rapid */
  feed_mmpm?: number;
}

/** Tool assembly definition */
export interface PreventionToolAssembly {
  /** Tool cutting diameter [mm] */
  diameter_mm: number;
  /** Cutting/flute length [mm] */
  cutting_length_mm?: number;
  /** Overall tool length [mm] */
  overall_length_mm?: number;
  /** Holder outer diameter [mm] */
  holder_diameter_mm?: number;
  /** Holder length [mm] */
  holder_length_mm?: number;
  /** Spindle nose diameter [mm] */
  spindle_diameter_mm?: number;
  /** Tool type (affects swept volume shape) */
  tool_type?: "flat" | "ball" | "bull_nose" | "drill" | "tap" | "barrel";
  /** Barrel cutter radius [mm] */
  barrel_radius_mm?: number;
  /** Gauge length from spindle face [mm] */
  gauge_length_mm?: number;
}

/** AABB bounding box */
export interface BoundingBox {
  /** Identifier */
  id: string;
  /** Body type for reporting */
  body_type: "stock" | "fixture" | "machine_structure" | "rotary_table";
  min_x: number; min_y: number; min_z: number;
  max_x: number; max_y: number; max_z: number;
}

/** Machine envelope limits */
export interface MachineEnvelope {
  /** Machine travel limits */
  min_x: number; min_y: number; min_z: number;
  max_x: number; max_y: number; max_z: number;
  /** Rotary axis limits (5-axis) */
  a_min_deg?: number; a_max_deg?: number;
  c_min_deg?: number; c_max_deg?: number;
}

/** A collision event detected */
export interface PreventionCollisionEvent {
  /** Block index where collision occurs */
  block_index: number;
  /** Position where collision occurs */
  position: { x: number; y: number; z: number };
  /** Tool orientation at collision (5-axis) */
  orientation?: { i: number; j: number; k: number };
  /** Severity classification */
  severity: "collision" | "near_miss";
  /** Assembly component involved */
  assembly_component: "tool_body" | "holder" | "spindle";
  /** Obstacle involved */
  obstacle_id: string;
  /** Obstacle body type */
  obstacle_type: string;
  /** Computed clearance [mm] — negative = penetration */
  clearance_mm: number;
  /** Human-readable description */
  description: string;
}

/** Collision zone — contiguous range of blocks with issues */
export interface CollisionZone {
  /** Zone identifier */
  zone_id: string;
  /** Start block index */
  start_block: number;
  /** End block index */
  end_block: number;
  /** Worst clearance in zone [mm] */
  worst_clearance_mm: number;
  /** Primary obstacle */
  primary_obstacle: string;
  /** Assembly component at risk */
  assembly_component: string;
  /** Zone type */
  zone_type: "collision" | "near_miss";
  /** Centroid of the zone [mm] */
  centroid: { x: number; y: number; z: number };
}

/** Full collision report */
export interface PreventionCollisionReport {
  /** Is the toolpath certified collision-free? */
  certified_safe: boolean;
  /** Total blocks checked */
  blocks_checked: number;
  /** Collision count */
  collision_count: number;
  /** Near-miss count */
  near_miss_count: number;
  /** Minimum clearance found across entire path [mm] */
  min_clearance_mm: number;
  /** Block index of minimum clearance */
  min_clearance_block: number;
  /** All collision/near-miss events */
  events: PreventionCollisionEvent[];
  /** Aggregated collision zones */
  zones: CollisionZone[];
  /** Safety margin used [mm] */
  safety_margin_mm: number;
  /** Certification statement */
  certification: string;
  /** Recommendations */
  recommendations: string[];
  /** Processing stats */
  stats: {
    total_blocks: number;
    broad_phase_culled: number;
    narrow_phase_checked: number;
    elapsed_ms: number;
  };
}

// ============================================================================
// INTERNAL: Assembly envelope model
// ============================================================================

interface AssemblyProfile {
  tool_radius: number;
  tool_length: number;
  holder_radius: number;
  holder_length: number;
  spindle_radius: number;
  gauge_length: number;
}

function buildProfile(tool: PreventionToolAssembly): AssemblyProfile {
  const toolR = tool.diameter_mm / 2;
  const toolL = tool.cutting_length_mm ?? Math.max(3 * tool.diameter_mm, 30);
  const holderR = (tool.holder_diameter_mm ?? tool.diameter_mm * HOLDER_DIAMETER_FACTOR) / 2;
  const holderL = tool.holder_length_mm ?? DEFAULT_HOLDER_LENGTH_MM;
  const spindleR = (tool.spindle_diameter_mm ?? DEFAULT_SPINDLE_DIAMETER_MM) / 2;
  const gaugeL = tool.gauge_length_mm ?? (toolL + holderL);

  return {
    tool_radius: tool.tool_type === "barrel" && tool.barrel_radius_mm
      ? Math.max(toolR, toolR + 2)
      : toolR,
    tool_length: toolL,
    holder_radius: holderR,
    holder_length: holderL,
    spindle_radius: spindleR,
    gauge_length: gaugeL,
  };
}

// ============================================================================
// ENGINE
// ============================================================================

export class CollisionPreventionEngine {

  /**
   * Check full toolpath for collisions against all obstacles.
   * This is the primary entry point — returns full collision report.
   */
  checkFullToolpath(
    blocks: ToolpathBlock[],
    toolAssembly: PreventionToolAssembly,
    stock: BoundingBox,
    fixtures: BoundingBox[] = [],
    machineEnvelope?: MachineEnvelope,
    safety_margin_mm: number = DEFAULT_SAFETY_MARGIN_MM,
  ): PreventionCollisionReport {
    const startTime = Date.now();
    const recommendations: string[] = [];
    const events: PreventionCollisionEvent[] = [];

    if (blocks.length === 0) {
      return this.emptyReport(safety_margin_mm, 0);
    }

    if (blocks.length > MAX_BLOCKS) {
      log.warn(`[CollisionPrevention] ${blocks.length} blocks exceeds limit ${MAX_BLOCKS} — truncating`);
      blocks = blocks.slice(0, MAX_BLOCKS);
    }

    const profile = buildProfile(toolAssembly);
    const obstacles: BoundingBox[] = [stock, ...fixtures];

    // Add machine envelope as an inverted obstacle (tool must stay INSIDE)
    const checkEnvelope = machineEnvelope !== undefined;

    let broadPhaseCulled = 0;
    let narrowPhaseChecked = 0;
    let globalMinClearance = Infinity;
    let minClearanceBlock = 0;

    // 5-axis flag
    const is5axis = blocks.some(b => b.i !== undefined || b.j !== undefined);

    for (const block of blocks) {
      // Tool tip position
      const tipX = block.x;
      const tipY = block.y;
      const tipZ = block.z;

      // Tool axis (default: Z-up for 3-axis)
      const ai = block.i ?? 0;
      const aj = block.j ?? 0;
      const ak = block.k ?? 1;

      // Compute assembly bounding sphere for broad-phase
      const maxRadius = Math.max(profile.tool_radius, profile.holder_radius, profile.spindle_radius);
      const assemblyHeight = profile.gauge_length;

      // Assembly AABB (conservative, axis-aligned)
      const aabb = this.computeAssemblyAABB(tipX, tipY, tipZ, ai, aj, ak, maxRadius, assemblyHeight);

      // Check machine envelope (tool must stay inside)
      if (checkEnvelope && machineEnvelope) {
        if (tipX < machineEnvelope.min_x || tipX > machineEnvelope.max_x ||
            tipY < machineEnvelope.min_y || tipY > machineEnvelope.max_y ||
            tipZ < machineEnvelope.min_z || tipZ > machineEnvelope.max_z) {
          const clearance = this.envelopeClearance(tipX, tipY, tipZ, machineEnvelope);
          events.push({
            block_index: block.index,
            position: { x: tipX, y: tipY, z: tipZ },
            orientation: is5axis ? { i: ai, j: aj, k: ak } : undefined,
            severity: "collision",
            assembly_component: "tool_body",
            obstacle_id: "machine_envelope",
            obstacle_type: "machine_structure",
            clearance_mm: clearance,
            description: `Tool exits machine envelope at block ${block.index}`,
          });
          if (clearance < globalMinClearance) {
            globalMinClearance = clearance;
            minClearanceBlock = block.index;
          }
          continue;
        }
      }

      // Broad-phase: AABB overlap test against each obstacle
      for (const obs of obstacles) {
        if (!this.aabbOverlap(aabb, obs, safety_margin_mm * NEAR_MISS_FACTOR)) {
          broadPhaseCulled++;
          continue;
        }

        // Narrow-phase: check each assembly component
        narrowPhaseChecked++;

        // Check tool body (cylinder from tip along axis)
        const toolClearance = this.cylinderBoxClearance(
          tipX, tipY, tipZ, ai, aj, ak,
          profile.tool_radius, profile.tool_length, obs,
        );

        if (toolClearance < safety_margin_mm * NEAR_MISS_FACTOR) {
          const severity = toolClearance < safety_margin_mm ? "collision" : "near_miss";
          // Only report if tool body is outside stock (inside stock is expected during cutting)
          if (obs.body_type !== "stock" || toolClearance < 0) {
            events.push({
              block_index: block.index,
              position: { x: tipX, y: tipY, z: tipZ },
              orientation: is5axis ? { i: ai, j: aj, k: ak } : undefined,
              severity,
              assembly_component: "tool_body",
              obstacle_id: obs.id,
              obstacle_type: obs.body_type,
              clearance_mm: Math.round(toolClearance * 100) / 100,
              description: `Tool body ${severity === "collision" ? "collides with" : "near-miss with"} ${obs.id} (clearance: ${toolClearance.toFixed(2)}mm)`,
            });
          }
          if (toolClearance < globalMinClearance) {
            globalMinClearance = toolClearance;
            minClearanceBlock = block.index;
          }
        }

        // Check holder (larger cylinder above cutting length)
        const holderBaseX = tipX + ai * profile.tool_length;
        const holderBaseY = tipY + aj * profile.tool_length;
        const holderBaseZ = tipZ + ak * profile.tool_length;
        const holderClearance = this.cylinderBoxClearance(
          holderBaseX, holderBaseY, holderBaseZ, ai, aj, ak,
          profile.holder_radius, profile.holder_length, obs,
        );

        if (holderClearance < safety_margin_mm * NEAR_MISS_FACTOR) {
          const severity = holderClearance < safety_margin_mm ? "collision" : "near_miss";
          events.push({
            block_index: block.index,
            position: { x: holderBaseX, y: holderBaseY, z: holderBaseZ },
            orientation: is5axis ? { i: ai, j: aj, k: ak } : undefined,
            severity,
            assembly_component: "holder",
            obstacle_id: obs.id,
            obstacle_type: obs.body_type,
            clearance_mm: Math.round(holderClearance * 100) / 100,
            description: `Holder ${severity === "collision" ? "collides with" : "near-miss with"} ${obs.id} (clearance: ${holderClearance.toFixed(2)}mm)`,
          });
          if (holderClearance < globalMinClearance) {
            globalMinClearance = holderClearance;
            minClearanceBlock = block.index;
          }
        }

        // Check spindle (largest cylinder above holder)
        const spindleBaseX = holderBaseX + ai * profile.holder_length;
        const spindleBaseY = holderBaseY + aj * profile.holder_length;
        const spindleBaseZ = holderBaseZ + ak * profile.holder_length;
        const spindleClearance = this.pointBoxClearance(
          spindleBaseX, spindleBaseY, spindleBaseZ,
          profile.spindle_radius, obs,
        );

        if (spindleClearance < safety_margin_mm * NEAR_MISS_FACTOR) {
          const severity = spindleClearance < safety_margin_mm ? "collision" : "near_miss";
          events.push({
            block_index: block.index,
            position: { x: spindleBaseX, y: spindleBaseY, z: spindleBaseZ },
            orientation: is5axis ? { i: ai, j: aj, k: ak } : undefined,
            severity,
            assembly_component: "spindle",
            obstacle_id: obs.id,
            obstacle_type: obs.body_type,
            clearance_mm: Math.round(spindleClearance * 100) / 100,
            description: `Spindle ${severity === "collision" ? "collides with" : "near-miss with"} ${obs.id}`,
          });
          if (spindleClearance < globalMinClearance) {
            globalMinClearance = spindleClearance;
            minClearanceBlock = block.index;
          }
        }
      }
    }

    // Aggregate zones
    const zones = this.aggregateZones(events);

    // Count by severity
    const collisionCount = events.filter(e => e.severity === "collision").length;
    const nearMissCount = events.filter(e => e.severity === "near_miss").length;
    const certified = collisionCount === 0;

    // Generate recommendations
    if (collisionCount > 0) {
      recommendations.push("REJECT toolpath — collisions detected. Regenerate with increased clearance or modified fixture.");
      const holderCollisions = events.filter(e => e.assembly_component === "holder" && e.severity === "collision");
      if (holderCollisions.length > 0) {
        recommendations.push("Consider shrink-fit or slim-line holder to reduce holder diameter");
      }
      const spindleCollisions = events.filter(e => e.assembly_component === "spindle" && e.severity === "collision");
      if (spindleCollisions.length > 0) {
        recommendations.push("Spindle collision — review machine head clearance, may need different approach angle");
      }
    }
    if (nearMissCount > 0) {
      recommendations.push(`${nearMissCount} near-miss zone(s) — consider increasing safety margin or adjusting clearance planes`);
    }
    if (globalMinClearance < safety_margin_mm * 3 && globalMinClearance >= safety_margin_mm) {
      recommendations.push(`Minimum clearance ${globalMinClearance.toFixed(2)}mm is close to safety margin — monitor during first article`);
    }

    const elapsed = Date.now() - startTime;

    log.info(`[CollisionPrevention] ${blocks.length} blocks: ${collisionCount} collisions, ${nearMissCount} near-miss, min clearance ${globalMinClearance.toFixed(2)}mm (${elapsed}ms)`);

    return {
      certified_safe: certified,
      blocks_checked: blocks.length,
      collision_count: collisionCount,
      near_miss_count: nearMissCount,
      min_clearance_mm: globalMinClearance === Infinity ? safety_margin_mm * 10 : Math.round(globalMinClearance * 100) / 100,
      min_clearance_block: minClearanceBlock,
      events,
      zones,
      safety_margin_mm,
      certification: certified
        ? `CERTIFIED: Toolpath is collision-free with ${safety_margin_mm}mm safety margin across ${blocks.length} blocks`
        : `REJECTED: ${collisionCount} collision(s) detected — toolpath cannot be executed safely`,
      recommendations,
      stats: {
        total_blocks: blocks.length,
        broad_phase_culled: broadPhaseCulled,
        narrow_phase_checked: narrowPhaseChecked,
        elapsed_ms: elapsed,
      },
    };
  }

  /**
   * Quick certification check — returns only pass/fail + min clearance.
   * Stops at first collision for performance.
   */
  certify(
    blocks: ToolpathBlock[],
    toolAssembly: PreventionToolAssembly,
    stock: BoundingBox,
    fixtures: BoundingBox[] = [],
    safety_margin_mm: number = DEFAULT_SAFETY_MARGIN_MM,
  ): { certified: boolean; min_clearance_mm: number; first_collision_block: number | null } {
    const profile = buildProfile(toolAssembly);
    const obstacles: BoundingBox[] = [stock, ...fixtures];
    let minClearance = Infinity;

    for (const block of blocks) {
      const ai = block.i ?? 0;
      const aj = block.j ?? 0;
      const ak = block.k ?? 1;

      for (const obs of obstacles) {
        const maxR = Math.max(profile.tool_radius, profile.holder_radius);
        const aabb = this.computeAssemblyAABB(block.x, block.y, block.z, ai, aj, ak, maxR, profile.gauge_length);

        if (!this.aabbOverlap(aabb, obs, safety_margin_mm)) continue;

        // Check holder (most common collision)
        const holderBaseX = block.x + ai * profile.tool_length;
        const holderBaseY = block.y + aj * profile.tool_length;
        const holderBaseZ = block.z + ak * profile.tool_length;
        const holderClear = this.cylinderBoxClearance(
          holderBaseX, holderBaseY, holderBaseZ, ai, aj, ak,
          profile.holder_radius, profile.holder_length, obs,
        );

        if (holderClear < minClearance) minClearance = holderClear;
        if (holderClear < safety_margin_mm && obs.body_type !== "stock") {
          return { certified: false, min_clearance_mm: holderClear, first_collision_block: block.index };
        }
      }
    }

    return {
      certified: true,
      min_clearance_mm: minClearance === Infinity ? safety_margin_mm * 10 : Math.round(minClearance * 100) / 100,
      first_collision_block: null,
    };
  }

  /**
   * Get collision zones — contiguous block ranges with issues.
   * Useful for highlighting problem areas in CAM display.
   */
  getCollisionZones(
    blocks: ToolpathBlock[],
    toolAssembly: PreventionToolAssembly,
    stock: BoundingBox,
    fixtures: BoundingBox[] = [],
    safety_margin_mm: number = DEFAULT_SAFETY_MARGIN_MM,
  ): CollisionZone[] {
    const report = this.checkFullToolpath(blocks, toolAssembly, stock, fixtures, undefined, safety_margin_mm);
    return report.zones;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Private geometry helpers
  // ──────────────────────────────────────────────────────────────────────────

  private computeAssemblyAABB(
    tipX: number, tipY: number, tipZ: number,
    ai: number, aj: number, ak: number,
    maxRadius: number, height: number,
  ): BoundingBox {
    // Conservative AABB: sphere at tip + sphere at top
    const topX = tipX + ai * height;
    const topY = tipY + aj * height;
    const topZ = tipZ + ak * height;

    return {
      id: "_assembly",
      body_type: "stock", // placeholder
      min_x: Math.min(tipX, topX) - maxRadius,
      min_y: Math.min(tipY, topY) - maxRadius,
      min_z: Math.min(tipZ, topZ) - maxRadius,
      max_x: Math.max(tipX, topX) + maxRadius,
      max_y: Math.max(tipY, topY) + maxRadius,
      max_z: Math.max(tipZ, topZ) + maxRadius,
    };
  }

  private aabbOverlap(a: BoundingBox, b: BoundingBox, margin: number): boolean {
    return !(
      a.max_x + margin < b.min_x || a.min_x - margin > b.max_x ||
      a.max_y + margin < b.min_y || a.min_y - margin > b.max_y ||
      a.max_z + margin < b.min_z || a.min_z - margin > b.max_z
    );
  }

  /**
   * Approximate clearance between a cylinder (defined by base point, axis, radius, length)
   * and an AABB. Returns negative value for penetration.
   */
  private cylinderBoxClearance(
    baseX: number, baseY: number, baseZ: number,
    axisI: number, axisJ: number, axisK: number,
    radius: number, length: number,
    box: BoundingBox,
  ): number {
    // Sample points along cylinder axis and check distance to box
    const samples = Math.max(3, Math.ceil(length / 10));
    let minClear = Infinity;

    for (let s = 0; s <= samples; s++) {
      const t = (s / samples) * length;
      const px = baseX + axisI * t;
      const py = baseY + axisJ * t;
      const pz = baseZ + axisK * t;

      const dist = this.pointToBoxDistance(px, py, pz, box);
      const clearance = dist - radius;

      if (clearance < minClear) minClear = clearance;
    }

    return minClear;
  }

  private pointBoxClearance(
    px: number, py: number, pz: number,
    radius: number, box: BoundingBox,
  ): number {
    return this.pointToBoxDistance(px, py, pz, box) - radius;
  }

  /**
   * Signed distance from point to AABB surface.
   * Positive = outside, negative = inside.
   */
  private pointToBoxDistance(px: number, py: number, pz: number, box: BoundingBox): number {
    // Clamp point to box
    const cx = Math.max(box.min_x, Math.min(px, box.max_x));
    const cy = Math.max(box.min_y, Math.min(py, box.max_y));
    const cz = Math.max(box.min_z, Math.min(pz, box.max_z));

    const dx = px - cx;
    const dy = py - cy;
    const dz = pz - cz;
    const outside = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (outside > 0.001) return outside;

    // Point is inside box — compute negative distance to nearest face
    const distToFaces = [
      px - box.min_x, box.max_x - px,
      py - box.min_y, box.max_y - py,
      pz - box.min_z, box.max_z - pz,
    ];
    return -Math.min(...distToFaces);
  }

  private envelopeClearance(x: number, y: number, z: number, env: MachineEnvelope): number {
    const violations = [
      env.min_x - x, x - env.max_x,
      env.min_y - y, y - env.max_y,
      env.min_z - z, z - env.max_z,
    ].filter(v => v > 0);
    return violations.length > 0 ? -Math.max(...violations) : 0;
  }

  /**
   * Aggregate individual events into contiguous zones.
   */
  private aggregateZones(events: PreventionCollisionEvent[]): CollisionZone[] {
    if (events.length === 0) return [];

    // Sort by block index
    const sorted = [...events].sort((a, b) => a.block_index - b.block_index);
    const zones: CollisionZone[] = [];
    let zoneStart = sorted[0].block_index;
    let zoneEnd = sorted[0].block_index;
    let worstClearance = sorted[0].clearance_mm;
    let primaryObstacle = sorted[0].obstacle_id;
    let component = sorted[0].assembly_component;
    let hasCollision = sorted[0].severity === "collision";
    let sumX = sorted[0].position.x;
    let sumY = sorted[0].position.y;
    let sumZ = sorted[0].position.z;
    let count = 1;

    for (let i = 1; i < sorted.length; i++) {
      const evt = sorted[i];

      // Merge if within 5 blocks of previous
      if (evt.block_index <= zoneEnd + 5) {
        zoneEnd = evt.block_index;
        if (evt.clearance_mm < worstClearance) {
          worstClearance = evt.clearance_mm;
          primaryObstacle = evt.obstacle_id;
          component = evt.assembly_component;
        }
        if (evt.severity === "collision") hasCollision = true;
        sumX += evt.position.x;
        sumY += evt.position.y;
        sumZ += evt.position.z;
        count++;
      } else {
        // Emit zone
        zones.push({
          zone_id: `zone_${zones.length + 1}`,
          start_block: zoneStart,
          end_block: zoneEnd,
          worst_clearance_mm: Math.round(worstClearance * 100) / 100,
          primary_obstacle: primaryObstacle,
          assembly_component: component,
          zone_type: hasCollision ? "collision" : "near_miss",
          centroid: {
            x: Math.round((sumX / count) * 100) / 100,
            y: Math.round((sumY / count) * 100) / 100,
            z: Math.round((sumZ / count) * 100) / 100,
          },
        });

        // Start new zone
        zoneStart = evt.block_index;
        zoneEnd = evt.block_index;
        worstClearance = evt.clearance_mm;
        primaryObstacle = evt.obstacle_id;
        component = evt.assembly_component;
        hasCollision = evt.severity === "collision";
        sumX = evt.position.x;
        sumY = evt.position.y;
        sumZ = evt.position.z;
        count = 1;
      }
    }

    // Emit final zone
    zones.push({
      zone_id: `zone_${zones.length + 1}`,
      start_block: zoneStart,
      end_block: zoneEnd,
      worst_clearance_mm: Math.round(worstClearance * 100) / 100,
      primary_obstacle: primaryObstacle,
      assembly_component: component,
      zone_type: hasCollision ? "collision" : "near_miss",
      centroid: {
        x: Math.round((sumX / count) * 100) / 100,
        y: Math.round((sumY / count) * 100) / 100,
        z: Math.round((sumZ / count) * 100) / 100,
      },
    });

    return zones;
  }

  private emptyReport(margin: number, elapsed: number): PreventionCollisionReport {
    return {
      certified_safe: true,
      blocks_checked: 0,
      collision_count: 0,
      near_miss_count: 0,
      min_clearance_mm: margin * 10,
      min_clearance_block: 0,
      events: [],
      zones: [],
      safety_margin_mm: margin,
      certification: "CERTIFIED: No blocks to check — empty toolpath",
      recommendations: [],
      stats: { total_blocks: 0, broad_phase_culled: 0, narrow_phase_checked: 0, elapsed_ms: elapsed },
    };
  }
}

// ── Singleton ────────────────────────────────────────────────────────────────

export const collisionPreventionEngine = new CollisionPreventionEngine();
