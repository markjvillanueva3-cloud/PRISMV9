/**
 * RestMachiningEngine — CAMK-MS3/U01
 * IPW-aware re-machining with novel algorithm selection per rest zone.
 *
 * Given IPW from a previous operation, identifies remaining stock regions,
 * decomposes them into zones, and selects the appropriate novel algorithm
 * for each zone. Handles corner rest, floor rest, wall rest, and multi-tool
 * rest sequencing.
 *
 * Models:
 * - Minkowski difference for rest material detection (simplified AABB)
 * - Zone classification: corner / floor / wall / pocket / slot
 * - Algorithm selection per zone type (SFCR for corners, CFSF for floors, PTDC for walls)
 * - Multi-tool sequencing via dynamic programming (DPLS-inspired)
 *
 * References:
 * - Choi & Jerard (1998): Sculptured Surface Machining, Ch. 12 — Rest milling
 * - Elber & Cohen (1994): Toolpath generation for freeform surface models
 */

// ── Types ──────────────────────────────────────────────────────────────────

interface AABB {
  min_x: number; min_y: number; min_z: number;
  max_x: number; max_y: number; max_z: number;
}

interface ToolSpec {
  type: string;
  diameter_mm: number;
  corner_radius_mm?: number;
}

interface RestZone {
  id: string;
  type: "corner" | "floor" | "wall" | "pocket" | "slot" | "general";
  bounds: AABB;
  volume_mm3: number;
  max_depth_mm: number;
  min_width_mm: number;
  recommended_algorithm: string;
  recommended_tool_diameter_mm: number;
  reason: string;
}

interface PreviousOperation {
  tool: ToolSpec;
  strategy: string;
  stock_before: AABB;
  stock_after_ipw?: AABB;        // simplified IPW as AABB
  zones_cut?: AABB[];            // regions already machined
}

interface RestMachiningInput {
  target_geometry: AABB;          // desired final part shape
  stock: AABB;                    // original stock
  previous_ops: PreviousOperation[];
  available_tools?: ToolSpec[];
  tolerance_mm?: number;          // machining tolerance (default 0.01)
  corner_threshold_mm?: number;   // max width for corner classification (default 5)
}

interface RestOperation {
  sequence: number;
  zone: RestZone;
  tool: ToolSpec;
  algorithm: string;
  estimated_time_sec: number;
  priority: "critical" | "high" | "medium" | "low";
}

interface RestMachiningResult {
  rest_zones: RestZone[];
  operations: RestOperation[];
  total_rest_volume_mm3: number;
  zone_count: number;
  tool_changes: number;
  estimated_total_time_sec: number;
  optimization_notes: string[];
}

// ── Algorithm selection rules ──────────────────────────────────────────────

const ZONE_ALGORITHM_MAP: Record<string, { algorithm: string; reason: string }> = {
  corner: { algorithm: "SFCR", reason: "Space-filling curve for tight corners with continuous engagement" },
  floor: { algorithm: "CFSF", reason: "Constant-force spiral finishing for flat floor surfaces" },
  wall: { algorithm: "PTDC", reason: "Predictive tool deflection compensation for vertical walls" },
  pocket: { algorithm: "TGAR", reason: "Thermal-gradient adaptive roughing for pocket clearing" },
  slot: { algorithm: "VCER", reason: "Vortex chip evacuation for deep slot re-machining" },
  general: { algorithm: "MTHZD", reason: "Multi-tool hybrid zone decomposition for complex geometry" },
};

// ── Engine ──────────────────────────────────────────────────────────────────

class RestMachiningEngine {
  /**
   * Compute AABB volume.
   */
  aabbVolume(b: AABB): number {
    return Math.max(0, b.max_x - b.min_x) *
           Math.max(0, b.max_y - b.min_y) *
           Math.max(0, b.max_z - b.min_z);
  }

  /**
   * AABB intersection (Minkowski-style overlap detection).
   */
  aabbIntersection(a: AABB, b: AABB): AABB | null {
    const min_x = Math.max(a.min_x, b.min_x);
    const min_y = Math.max(a.min_y, b.min_y);
    const min_z = Math.max(a.min_z, b.min_z);
    const max_x = Math.min(a.max_x, b.max_x);
    const max_y = Math.min(a.max_y, b.max_y);
    const max_z = Math.min(a.max_z, b.max_z);
    if (min_x >= max_x || min_y >= max_y || min_z >= max_z) return null;
    return { min_x, min_y, min_z, max_x, max_y, max_z };
  }

  /**
   * Detect rest material: stock minus machined zones.
   * Returns AABB regions where material remains.
   */
  detectRestRegions(stock: AABB, machinedZones: AABB[], target: AABB): AABB[] {
    // Simplified: find regions of stock that overlap with target but weren't machined
    const restRegions: AABB[] = [];
    const targetInStock = this.aabbIntersection(stock, target);
    if (!targetInStock) return [];

    // Grid-based subdivision for rest detection
    const gridStep = Math.max(
      (stock.max_x - stock.min_x) / 8,
      (stock.max_y - stock.min_y) / 8,
      1
    );

    for (let x = stock.min_x; x < stock.max_x; x += gridStep) {
      for (let y = stock.min_y; y < stock.max_y; y += gridStep) {
        const cell: AABB = {
          min_x: x, min_y: y, min_z: stock.min_z,
          max_x: Math.min(x + gridStep, stock.max_x),
          max_y: Math.min(y + gridStep, stock.max_y),
          max_z: stock.max_z,
        };

        // Check if cell overlaps with target (needs machining)
        const overlap = this.aabbIntersection(cell, target);
        if (!overlap) continue;

        // Check if cell was already machined
        const machined = machinedZones.some(mz => {
          const inter = this.aabbIntersection(cell, mz);
          return inter && this.aabbVolume(inter) > this.aabbVolume(cell) * 0.8;
        });

        if (!machined) {
          restRegions.push(overlap);
        }
      }
    }

    return this.mergeAdjacentRegions(restRegions, gridStep);
  }

  /**
   * Merge adjacent grid cells into larger regions.
   */
  mergeAdjacentRegions(regions: AABB[], tolerance: number): AABB[] {
    if (regions.length <= 1) return regions;

    const merged: AABB[] = [];
    const used = new Set<number>();

    for (let i = 0; i < regions.length; i++) {
      if (used.has(i)) continue;
      let current = { ...regions[i] };
      used.add(i);

      let changed = true;
      while (changed) {
        changed = false;
        for (let j = 0; j < regions.length; j++) {
          if (used.has(j)) continue;
          const r = regions[j];
          // Check if adjacent (within tolerance)
          const adjacent =
            Math.abs(current.max_x - r.min_x) < tolerance * 1.5 ||
            Math.abs(r.max_x - current.min_x) < tolerance * 1.5 ||
            Math.abs(current.max_y - r.min_y) < tolerance * 1.5 ||
            Math.abs(r.max_y - current.min_y) < tolerance * 1.5;

          if (adjacent) {
            current = {
              min_x: Math.min(current.min_x, r.min_x),
              min_y: Math.min(current.min_y, r.min_y),
              min_z: Math.min(current.min_z, r.min_z),
              max_x: Math.max(current.max_x, r.max_x),
              max_y: Math.max(current.max_y, r.max_y),
              max_z: Math.max(current.max_z, r.max_z),
            };
            used.add(j);
            changed = true;
          }
        }
      }
      merged.push(current);
    }

    return merged;
  }

  /**
   * Classify a rest zone by its geometry.
   */
  classifyZone(zone: AABB, prevToolDia: number, cornerThreshold: number): RestZone["type"] {
    const width = zone.max_x - zone.min_x;
    const length = zone.max_y - zone.min_y;
    const depth = zone.max_z - zone.min_z;
    const minSide = Math.min(width, length);
    const maxSide = Math.max(width, length);
    const aspect = maxSide / (minSide || 0.001);

    // Corner: narrow in both XY, typically left by larger tool radius
    if (minSide <= cornerThreshold && maxSide <= cornerThreshold) return "corner";
    // Wall: thin in one direction, deep (check before slot — walls are vertical thin features)
    if (minSide <= prevToolDia * 0.5 && depth > minSide * 2) return "wall";
    // Slot: narrow in one direction, long in other
    if (minSide <= prevToolDia * 0.8 && aspect > 3) return "slot";
    // Floor: wide and shallow
    if (depth < minSide * 0.3 && minSide > cornerThreshold) return "floor";
    // Pocket: enclosed deeper region
    if (depth > minSide * 0.5 && minSide > cornerThreshold) return "pocket";

    return "general";
  }

  /**
   * Select recommended tool diameter for rest zone.
   */
  recommendToolDiameter(zone: RestZone, availableTools?: ToolSpec[]): number {
    const minWidth = zone.min_width_mm;

    if (availableTools && availableTools.length > 0) {
      // Find largest tool that fits
      const fitting = availableTools
        .filter(t => t.diameter_mm <= minWidth * 0.9)
        .sort((a, b) => b.diameter_mm - a.diameter_mm);
      return fitting.length > 0 ? fitting[0].diameter_mm : minWidth * 0.8;
    }

    // Default: 80% of minimum width, rounded to standard sizes
    const ideal = minWidth * 0.8;
    const standards = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 25];
    return standards.reduce((best, s) => s <= ideal ? s : best, 1);
  }

  /**
   * Sequence operations using priority + tool grouping (DP-inspired).
   * Groups by tool to minimize tool changes, then orders by priority.
   */
  sequenceOperations(zones: RestZone[], availableTools?: ToolSpec[]): RestOperation[] {
    const ops: RestOperation[] = zones.map((zone, idx) => {
      const toolDia = this.recommendToolDiameter(zone, availableTools);
      const tool: ToolSpec = { type: "endmill", diameter_mm: toolDia };
      const algoInfo = ZONE_ALGORITHM_MAP[zone.type] || ZONE_ALGORITHM_MAP.general;

      // Estimate time based on volume and tool size
      const mrr = toolDia * (toolDia * 0.4) * (zone.max_depth_mm * 0.5); // rough MRR
      const time = mrr > 0 ? (zone.volume_mm3 / mrr) * 60 : 30;

      const priority: RestOperation["priority"] =
        zone.type === "wall" ? "critical" :
        zone.type === "corner" ? "high" :
        zone.type === "floor" ? "medium" : "low";

      return {
        sequence: idx,
        zone,
        tool,
        algorithm: algoInfo.algorithm,
        estimated_time_sec: Math.max(time, 5),
        priority,
      };
    });

    // Group by tool diameter to minimize changes (DP-style greedy)
    ops.sort((a, b) => {
      // First by tool diameter (group same tools)
      if (a.tool.diameter_mm !== b.tool.diameter_mm) {
        return b.tool.diameter_mm - a.tool.diameter_mm; // largest first
      }
      // Then by priority
      const pri = { critical: 0, high: 1, medium: 2, low: 3 };
      return pri[a.priority] - pri[b.priority];
    });

    // Renumber sequence
    ops.forEach((op, i) => op.sequence = i + 1);

    return ops;
  }

  /**
   * Full rest machining analysis.
   */
  analyze(input: RestMachiningInput): RestMachiningResult {
    const {
      target_geometry, stock, previous_ops,
      available_tools, tolerance_mm = 0.01,
      corner_threshold_mm = 5,
    } = input;

    if (previous_ops.length === 0) {
      return {
        rest_zones: [], operations: [],
        total_rest_volume_mm3: 0, zone_count: 0,
        tool_changes: 0, estimated_total_time_sec: 0,
        optimization_notes: ["No previous operations — full machining needed"],
      };
    }

    // Collect all machined zones from previous operations
    const machinedZones: AABB[] = [];
    let prevToolDia = 10; // default
    for (const op of previous_ops) {
      prevToolDia = op.tool.diameter_mm;
      if (op.zones_cut) {
        machinedZones.push(...op.zones_cut);
      }
      if (op.stock_after_ipw) {
        // IPW represents what remains — invert to get what was cut
        const cutRegion = this.aabbIntersection(stock, {
          min_x: stock.min_x, min_y: stock.min_y, min_z: op.stock_after_ipw.max_z,
          max_x: stock.max_x, max_y: stock.max_y, max_z: stock.max_z,
        });
        if (cutRegion) machinedZones.push(cutRegion);
      }
    }

    // Detect rest material
    const restRegions = this.detectRestRegions(stock, machinedZones, target_geometry);

    // Classify and build rest zones
    const restZones: RestZone[] = restRegions.map((region, idx) => {
      const width = region.max_x - region.min_x;
      const length = region.max_y - region.min_y;
      const depth = region.max_z - region.min_z;
      const type = this.classifyZone(region, prevToolDia, corner_threshold_mm);
      const algoInfo = ZONE_ALGORITHM_MAP[type] || ZONE_ALGORITHM_MAP.general;

      const zone: RestZone = {
        id: `rest_${idx + 1}`,
        type,
        bounds: region,
        volume_mm3: this.aabbVolume(region),
        max_depth_mm: depth,
        min_width_mm: Math.min(width, length),
        recommended_algorithm: algoInfo.algorithm,
        recommended_tool_diameter_mm: 0, // set below
        reason: algoInfo.reason,
      };

      zone.recommended_tool_diameter_mm = this.recommendToolDiameter(zone, available_tools);
      return zone;
    });

    // Filter tiny zones below tolerance
    const significantZones = restZones.filter(z => z.volume_mm3 > tolerance_mm * tolerance_mm * tolerance_mm);

    // Sequence operations
    const operations = this.sequenceOperations(significantZones, available_tools);

    // Count tool changes
    let toolChanges = 0;
    for (let i = 1; i < operations.length; i++) {
      if (operations[i].tool.diameter_mm !== operations[i - 1].tool.diameter_mm) {
        toolChanges++;
      }
    }

    const totalTime = operations.reduce((s, o) => s + o.estimated_time_sec, 0);
    const totalVolume = significantZones.reduce((s, z) => s + z.volume_mm3, 0);

    // Optimization notes
    const notes: string[] = [];
    if (toolChanges > 3) notes.push(`${toolChanges} tool changes — consider consolidating with hybrid zones (MTHZD)`);
    if (significantZones.some(z => z.type === "corner")) {
      notes.push("Corner rest detected — use smaller tool with SFCR for continuous engagement");
    }
    if (significantZones.length === 0) {
      notes.push("No significant rest material — previous operations fully covered target");
    }

    return {
      rest_zones: significantZones,
      operations,
      total_rest_volume_mm3: totalVolume,
      zone_count: significantZones.length,
      tool_changes: toolChanges,
      estimated_total_time_sec: totalTime,
      optimization_notes: notes,
    };
  }

  /**
   * Quick check: is rest machining needed?
   */
  quickCheck(input: RestMachiningInput): { needed: boolean; zone_count: number; volume_mm3: number } {
    const result = this.analyze(input);
    return {
      needed: result.zone_count > 0,
      zone_count: result.zone_count,
      volume_mm3: result.total_rest_volume_mm3,
    };
  }
}

export const restMachiningEngine = new RestMachiningEngine();
export { RestMachiningEngine };
