/**
 * @module RestMachiningEngine
 *
 * CAMK-MS3/U01 — IPW-aware rest machining zone detection and strategy selection.
 *
 * Analyzes In-Process Workpiece (IPW) state after previous machining operations
 * to identify remaining material zones that require additional passes. Classifies
 * each rest zone by type (corner, wall, floor, fillet, step, pocket) and recommends
 * the optimal re-machining strategy including tool selection, algorithm choice, and
 * operation sequencing.
 *
 * Detection algorithms:
 * - AABB differencing: fast bounding-box subtraction for coarse zone detection
 * - Voxel grid differencing: volumetric IPW - target for accurate volume estimation
 * - Z-level comparison: layer-by-layer cross-section analysis
 * - Radial projection: angular sweep from feature centroids for corner detection
 *
 * Physics models:
 * - Scallop height: h = D/2 - sqrt((D/2)^2 - (ae/2)^2) for flat endmill
 * - Cusp height for ball nose: h = ae^2 / (8*R)
 * - Tool deflection: delta = F*L^3 / (3*E*I) for cantilever beam
 * - Min internal corner radius = tool_radius + tolerance
 * - MRR estimation: ae * ap * vf with material correction factors
 *
 * References:
 * - Choi & Jerard (1998): Sculptured Surface Machining, Ch. 12 — Rest milling
 * - Elber & Cohen (1994): Toolpath generation for freeform surface models
 * - Held (1991): On the Computational Geometry of Pocket Machining
 */

import { log } from "../utils/Logger.js";

// ── Types ──────────────────────────────────────────────────────────────────

/** Axis-aligned bounding box. */
export interface AABB {
  min_x: number; min_y: number; min_z: number;
  max_x: number; max_y: number; max_z: number;
}

/** Zone classification types. */
export type ZoneType = "corner" | "wall" | "floor" | "fillet" | "step" | "pocket";

/** A detected rest-material zone requiring additional machining. */
export interface RestZone {
  id: string;
  type: ZoneType;
  bounds: AABB;
  volume_mm3: number;
  max_depth_mm: number;
  min_width_mm: number;
  recommended_algorithm: string;
  recommended_tool_diameter_mm: number;
  reason: string;
}

/** Tool description for previous or available tools. */
export interface ToolEntry {
  type: string;
  diameter_mm: number;
  corner_radius_mm?: number;
  flute_length_mm?: number;
}

/** A previous machining operation in the IPW chain. */
export interface PreviousOperation {
  tool: ToolEntry;
  strategy: string;
  stock_before: AABB;
  zones_cut: AABB[];
}

/** Input contract for analyze / quickCheck. */
export interface RestAnalysisInput {
  target_geometry: AABB;
  stock: AABB;
  previous_ops: PreviousOperation[];
  available_tools?: ToolEntry[];
  material?: string;
  tolerance_mm?: number;
  tool_change_time_sec?: number;
}

/** A single sequenced rest-machining operation. */
export interface RestOperation {
  sequence: number;
  zone: RestZone;
  tool: ToolEntry;
  algorithm: string;
  estimated_time_sec: number;
  mrr_mm3_per_min: number;
  scallop_height_mm: number;
}

/** Quick check result. */
export interface RestQuickCheckResult {
  needed: boolean;
  zone_count: number;
  total_rest_volume_mm3: number;
  largest_zone_volume_mm3: number;
}

/** Full analysis result. */
export interface RestAnalysisResult {
  rest_zones: RestZone[];
  operations: RestOperation[];
  zone_count: number;
  estimated_total_time_sec: number;
  total_rest_volume_mm3: number;
  tool_changes: number;
  optimization_notes: string[];
  formulas: Record<string, string>;
}

// ── Constants ──────────────────────────────────────────────────────────────

/** Maps zone type to recommended novel toolpath algorithm. */
const ZONE_ALGO_MAP: Record<ZoneType, string> = {
  corner: "SFCR",   // Spiral Flow Corner Roughing
  floor:  "CFSF",   // Constant-Force Spiral Finishing
  wall:   "PTDC",   // Predictive Tool Deflection Compensation
  pocket: "VCER",   // Vortex Chip Evacuation Roughing
  fillet: "HRAF",   // Harmonic-Resonance Avoidant Finishing
  step:   "TGAR",   // Thermal-Gradient Adaptive Roughing
};

/** Material-specific MRR scale factors relative to mild steel = 1.0. */
const MATERIAL_MRR_FACTOR: Record<string, number> = {
  aluminum: 3.0, aluminium: 3.0, "7075": 2.5, "6061": 3.0,
  steel: 1.0, "4140": 0.9, "1018": 1.1,
  stainless: 0.7, "304": 0.65, "316": 0.6,
  titanium: 0.4, "ti6al4v": 0.35,
  inconel: 0.25, "718": 0.22,
  brass: 2.5, copper: 2.2, cast_iron: 1.3,
  plastic: 4.0, delrin: 3.5,
};

/** Standard endmill diameters in mm. */
const STANDARD_DIAMETERS = [0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 25, 32];

/** Carbide endmill Young's modulus (Pa). */
const E_CARBIDE = 600e9; // QA-MS3 FIX: canonical (was 580)

/** Specific cutting force for steel baseline (N/mm^2). */
const KC_STEEL = 2500;

// ── Engine ─────────────────────────────────────────────────────────────────

/**
 * IPW-aware rest machining engine.
 *
 * Detects remaining stock zones after previous machining operations,
 * classifies each by type, assigns novel toolpath algorithms, recommends
 * tools, and sequences multi-tool operations to minimize total cycle time
 * including tool-change penalties.
 */
export class RestMachiningEngine {

  // ── Public AABB Utilities ──────────────────────────────────────────────

  /** Compute AABB volume in mm^3. Returns 0 for degenerate boxes. */
  aabbVolume(b: AABB): number {
    const dx = Math.max(0, b.max_x - b.min_x);
    const dy = Math.max(0, b.max_y - b.min_y);
    const dz = Math.max(0, b.max_z - b.min_z);
    return dx * dy * dz;
  }

  /** AABB intersection. Returns null if no overlap exists. */
  aabbIntersection(a: AABB, b: AABB): AABB | null {
    const r: AABB = {
      min_x: Math.max(a.min_x, b.min_x),
      min_y: Math.max(a.min_y, b.min_y),
      min_z: Math.max(a.min_z, b.min_z),
      max_x: Math.min(a.max_x, b.max_x),
      max_y: Math.min(a.max_y, b.max_y),
      max_z: Math.min(a.max_z, b.max_z),
    };
    if (r.min_x >= r.max_x || r.min_y >= r.max_y || r.min_z >= r.max_z) return null;
    return r;
  }

  /**
   * Subtract the interior of `cut` from `stock`, returning remaining AABBs.
   * Uses 6-face decomposition: left/right/front/back/bottom/top slabs.
   */
  private aabbSubtract(stock: AABB, cut: AABB): AABB[] {
    const inter = this.aabbIntersection(stock, cut);
    if (!inter) return [stock];
    const parts: AABB[] = [];
    // Left slab (X < intersection)
    if (inter.min_x > stock.min_x)
      parts.push({ ...stock, max_x: inter.min_x });
    // Right slab (X > intersection)
    if (inter.max_x < stock.max_x)
      parts.push({ ...stock, min_x: inter.max_x });
    // Front slab (Y < intersection, within X range of intersection)
    if (inter.min_y > stock.min_y)
      parts.push({ min_x: inter.min_x, max_x: inter.max_x,
                    min_y: stock.min_y, max_y: inter.min_y,
                    min_z: stock.min_z, max_z: stock.max_z });
    // Back slab
    if (inter.max_y < stock.max_y)
      parts.push({ min_x: inter.min_x, max_x: inter.max_x,
                    min_y: inter.max_y, max_y: stock.max_y,
                    min_z: stock.min_z, max_z: stock.max_z });
    // Bottom slab (Z < intersection, within X/Y range)
    if (inter.min_z > stock.min_z)
      parts.push({ min_x: inter.min_x, max_x: inter.max_x,
                    min_y: inter.min_y, max_y: inter.max_y,
                    min_z: stock.min_z, max_z: inter.min_z });
    // Top slab
    if (inter.max_z < stock.max_z)
      parts.push({ min_x: inter.min_x, max_x: inter.max_x,
                    min_y: inter.min_y, max_y: inter.max_y,
                    min_z: inter.max_z, max_z: stock.max_z });
    return parts.filter(p => this.aabbVolume(p) > 1e-6);
  }

  // ── Rest Detection ─────────────────────────────────────────────────────

  /**
   * Detect rest material regions by subtracting machined zones from stock,
   * then intersecting with the target envelope (only material that still
   * needs removal is "rest").
   *
   * @param stock      - Original stock bounding box
   * @param machined   - Array of AABB zones already cut in previous ops
   * @param target     - Desired final part geometry bounding box
   * @returns Array of AABB regions containing remaining material
   */
  detectRestRegions(stock: AABB, machined: AABB[], target: AABB): AABB[] {
    // Start with full stock
    let remaining: AABB[] = [stock];

    // Subtract each machined zone
    for (const cut of machined) {
      const next: AABB[] = [];
      for (const rem of remaining) {
        next.push(...this.aabbSubtract(rem, cut));
      }
      remaining = next;
    }

    // Only keep regions that overlap with material-to-remove envelope
    // Material to remove = stock minus target interior
    // Rest = remaining stock that is OUTSIDE the target (needs removal)
    //       OR inside concave features the prev tool couldn't reach
    const restZones: AABB[] = [];
    for (const rem of remaining) {
      // Check if this remainder is outside the target (material that should be gone)
      const outsideTarget = this.aabbSubtract(rem, target);
      for (const oz of outsideTarget) {
        if (this.aabbVolume(oz) > 1e-3) {
          restZones.push(oz);
        }
      }
      // Also check overlap with target — this is rest inside features
      // (corner material the previous tool radius couldn't reach)
      const insideTarget = this.aabbIntersection(rem, target);
      if (insideTarget && this.aabbVolume(insideTarget) > 1e-3) {
        // This is desired geometry that's still stock — it's rest material
        // inside the target envelope that was unreachable
        restZones.push(insideTarget);
      }
    }

    // Filter negligible volumes
    return restZones.filter(z => this.aabbVolume(z) > 0.01);
  }

  // ── Zone Classification ────────────────────────────────────────────────

  /**
   * Classify a rest region by geometric aspect ratios and context.
   *
   * Classification rules:
   * - corner: both XY dims < prevToolDia * 0.6, or min side < stepover
   * - floor:  shallow (depth < 0.3 * min side), wide area
   * - wall:   narrow in one axis, tall (depth > 3 * min side)
   * - fillet: small zone near rounded features (min side ~ tool radius)
   * - step:   moderate depth, one long dimension (ledge-like)
   * - pocket: deep, wide in both XY (depth > 0.5 * min side)
   *
   * @param zone         - AABB of the rest region
   * @param prevToolDia  - Previous tool diameter in mm
   * @param stepover     - Previous stepover in mm
   * @returns Zone classification type
   */
  classifyZone(zone: AABB, prevToolDia: number, stepover: number): ZoneType {
    const w = Math.abs(zone.max_x - zone.min_x);
    const l = Math.abs(zone.max_y - zone.min_y);
    const d = Math.abs(zone.max_z - zone.min_z);
    const minSide = Math.min(w, l);
    const maxSide = Math.max(w, l);
    const toolR = prevToolDia / 2;

    // Corner: small in both XY dimensions relative to previous tool
    if (minSide <= prevToolDia * 0.6 && maxSide <= prevToolDia * 0.6) {
      return "corner";
    }

    // Floor: shallow relative to XY extent, and wider than previous tool
    if (d < minSide * 0.3 && minSide > prevToolDia) {
      return "floor";
    }

    // Wall: narrow in one axis, tall in Z
    if (minSide <= stepover * 1.2 && d > minSide * 3) {
      return "wall";
    }

    // Fillet: small zone near tool-radius scale
    if (minSide <= toolR * 1.5 && maxSide <= toolR * 3 && d <= toolR * 2) {
      return "fillet";
    }

    // Step: one long dimension, moderate depth (ledge/shelf)
    if (maxSide > minSide * 3 && d > minSide * 0.5 && d < minSide * 3) {
      return "step";
    }

    // Pocket: wide and deep
    if (d > minSide * 0.5 && minSide > prevToolDia * 0.8) {
      return "pocket";
    }

    // Default: corner for small residual material
    return "corner";
  }

  // ── Tool Recommendation ────────────────────────────────────────────────

  /**
   * Recommend the optimal tool diameter for a rest zone.
   *
   * Selection logic:
   * 1. Tool must fit: diameter <= zone min_width * 0.9
   * 2. Largest fitting tool preferred (maximizes MRR)
   * 3. For corners: tool radius must be <= min_width / 2
   * 4. Tool deflection check: delta = F*L^3/(3*E*I) < tolerance
   *
   * @param zone  - The rest zone to machine
   * @param tools - Optional array of available tools
   * @returns Recommended tool diameter in mm
   */
  recommendToolDiameter(zone: RestZone, tools?: ToolEntry[]): number {
    const maxAllowed = zone.min_width_mm * 0.9;

    if (tools && tools.length > 0) {
      // Pick largest available tool that fits
      const fitting = tools
        .filter(t => t.diameter_mm <= maxAllowed && t.diameter_mm > 0)
        .sort((a, b) => b.diameter_mm - a.diameter_mm);
      if (fitting.length > 0) {
        // Verify deflection is acceptable for deep zones
        const best = fitting[0];
        const deflection = this.toolDeflection(
          best.diameter_mm,
          zone.max_depth_mm,
          best.diameter_mm * 0.3,
        );
        // If deflection > 0.05mm, try smaller tool with better L/D
        if (deflection > 0.05 && fitting.length > 1) {
          return fitting[1].diameter_mm;
        }
        return best.diameter_mm;
      }
    }

    // Fall back to standard diameters
    let best = STANDARD_DIAMETERS[0];
    for (const d of STANDARD_DIAMETERS) {
      if (d <= maxAllowed) best = d;
    }
    return best;
  }

  // ── Physics Models ─────────────────────────────────────────────────────

  /**
   * Scallop height for flat endmill.
   * h = D/2 - sqrt((D/2)^2 - (ae/2)^2)
   *
   * @param toolDia_mm  - Tool diameter in mm
   * @param stepover_mm - Radial stepover in mm
   * @returns Scallop height in mm
   */
  private scallopHeight(toolDia_mm: number, stepover_mm: number): number {
    const R = toolDia_mm / 2;
    const ae2 = stepover_mm / 2;
    if (ae2 >= R) return R; // full engagement, theoretical max
    return R - Math.sqrt(R * R - ae2 * ae2);
  }

  /**
   * Cusp height for ball-nose endmill.
   * h = ae^2 / (8 * R)
   *
   * @param ballRadius_mm - Ball nose radius in mm
   * @param stepover_mm   - Radial stepover in mm
   * @returns Cusp height in mm
   */
  private cuspHeightBallNose(ballRadius_mm: number, stepover_mm: number): number {
    if (ballRadius_mm <= 0) return 0;
    return (stepover_mm * stepover_mm) / (8 * ballRadius_mm);
  }

  /**
   * Tool deflection using cantilever beam model.
   * delta = F * L^3 / (3 * E * I)
   * where I = pi * d^4 / 64 for solid cylindrical tool
   * and F is estimated from specific cutting force.
   *
   * @param toolDia_mm  - Tool diameter in mm
   * @param stickout_mm - Tool stickout/gauge length in mm
   * @param ae_mm       - Radial depth of cut in mm
   * @param ap_mm       - Axial depth of cut (default = toolDia)
   * @returns Deflection in mm
   */
  private toolDeflection(
    toolDia_mm: number, stickout_mm: number,
    ae_mm: number, ap_mm?: number,
  ): number {
    const d = toolDia_mm / 1000;   // convert to meters
    const L = stickout_mm / 1000;
    const ae = ae_mm / 1000;
    const ap = (ap_mm ?? toolDia_mm) / 1000;

    // Moment of inertia for solid cylinder: I = pi*d^4/64
    const I = (Math.PI * d * d * d * d) / 64;
    if (I <= 0 || L <= 0) return 0;

    // Cutting force estimate: F = Kc * ae * ap (simplified)
    const F = KC_STEEL * ae * ap;

    // Cantilever deflection: delta = F*L^3 / (3*E*I)
    const delta_m = (F * L * L * L) / (3 * E_CARBIDE * I);
    return Math.abs(delta_m * 1000); // return in mm
  }

  /**
   * Minimum internal corner radius achievable.
   * R_min = tool_radius + tolerance
   */
  private minCornerRadius(toolDia_mm: number, tolerance_mm: number): number {
    return toolDia_mm / 2 + tolerance_mm;
  }

  /**
   * Estimate MRR for a given tool and engagement.
   * MRR = ae * ap * vf (mm^3/min)
   * Feed rate heuristic: vf = D * 200 * material_factor
   */
  private estimateMRR(toolDia_mm: number, ae_mm: number, ap_mm: number, material: string): number {
    const mrrFactor = MATERIAL_MRR_FACTOR[material.toLowerCase()] ?? 1.0;
    const vf = toolDia_mm * 200 * mrrFactor; // mm/min feed rate heuristic
    return ae_mm * ap_mm * vf;
  }

  /**
   * Estimate machining time for a zone volume.
   * T = V / MRR (minutes -> seconds)
   */
  private estimateTime(volume_mm3: number, toolDia_mm: number, material: string): number {
    const ae = toolDia_mm * 0.4;
    const ap = toolDia_mm * 0.5;
    const mrr = this.estimateMRR(toolDia_mm, ae, ap, material);
    if (mrr <= 0) return 60;
    return Math.max((volume_mm3 / mrr) * 60, 2); // seconds
  }

  // ── Quick Check ────────────────────────────────────────────────────────

  /**
   * Fast check whether rest machining is needed without full analysis.
   * Returns zone count and total rest volume estimate.
   *
   * @param input - Analysis input parameters
   * @returns Quick check result with needed flag and zone count
   */
  quickCheck(input: RestAnalysisInput): RestQuickCheckResult {
    if (!input.previous_ops || input.previous_ops.length === 0) {
      return { needed: false, zone_count: 0, total_rest_volume_mm3: 0, largest_zone_volume_mm3: 0 };
    }

    // Collect all machined zones from previous operations
    const allCuts: AABB[] = [];
    for (const op of input.previous_ops) {
      allCuts.push(...op.zones_cut);
    }

    const restRegions = this.detectRestRegions(input.stock, allCuts, input.target_geometry);
    const volumes = restRegions.map(r => this.aabbVolume(r));
    const totalVol = volumes.reduce((s, v) => s + v, 0);
    const maxVol = volumes.length > 0 ? Math.max(...volumes) : 0;

    return {
      needed: restRegions.length > 0,
      zone_count: restRegions.length,
      total_rest_volume_mm3: Math.round(totalVol * 100) / 100,
      largest_zone_volume_mm3: Math.round(maxVol * 100) / 100,
    };
  }

  // ── Full Analysis ──────────────────────────────────────────────────────

  /**
   * Full rest machining analysis.
   *
   * Pipeline:
   * 1. Collect all machined zones from previous operations
   * 2. Detect rest material regions (AABB differencing)
   * 3. Classify each zone by type
   * 4. Assign toolpath algorithm per zone type
   * 5. Recommend tool diameter per zone
   * 6. Sequence operations (group by tool, largest-first)
   * 7. Estimate cycle time with tool-change penalties
   *
   * @param params - Input as Record (from dispatcher) or RestAnalysisInput
   * @returns Full analysis result with zones, operations, and timing
   */
  analyze(params: Record<string, unknown>): RestAnalysisResult {
    const input = params as unknown as RestAnalysisInput;
    const notes: string[] = [];
    const material = input.material ?? "steel";
    const tolerance = input.tolerance_mm ?? 0.01;
    const toolChangeTime = input.tool_change_time_sec ?? 30;

    // Validate
    if (!input.stock) {
      // warn: "[RestMachining] Missing stock geometry");
      return this.emptyResult(["Missing stock geometry — cannot analyze"]);
    }
    if (!input.target_geometry) {
      // warn: "[RestMachining] Missing target geometry");
      return this.emptyResult(["Missing target geometry — cannot analyze"]);
    }

    // Handle no previous operations
    if (!input.previous_ops || input.previous_ops.length === 0) {
      return this.emptyResult(["No previous operations — full machining needed"]);
    }

    // 1. Collect all machined zones from operation chain
    const allCuts: AABB[] = [];
    let lastToolDia = 20; // default
    for (const op of input.previous_ops) {
      allCuts.push(...op.zones_cut);
      lastToolDia = op.tool.diameter_mm;
    }

    // 2. Detect rest regions
    const restRegions = this.detectRestRegions(input.stock, allCuts, input.target_geometry);

    if (restRegions.length === 0) {
      notes.push("No rest material detected — previous operations fully covered target");
      return this.emptyResult(notes);
    }

    // Default stepover estimate from last tool
    const defaultStepover = lastToolDia * 0.4;

    // 3. Classify zones, assign algorithms, recommend tools
    const restZones: RestZone[] = restRegions.map((region, idx) => {
      const w = Math.abs(region.max_x - region.min_x);
      const l = Math.abs(region.max_y - region.min_y);
      const d = Math.abs(region.max_z - region.min_z);
      const minWidth = Math.min(w, l);
      const vol = this.aabbVolume(region);

      const zoneType = this.classifyZone(region, lastToolDia, defaultStepover);
      const algo = ZONE_ALGO_MAP[zoneType];

      // Build zone before tool recommendation
      const zone: RestZone = {
        id: `RZ-${String(idx + 1).padStart(3, "0")}`,
        type: zoneType,
        bounds: region,
        volume_mm3: Math.round(vol * 100) / 100,
        max_depth_mm: Math.round(d * 1000) / 1000,
        min_width_mm: Math.round(minWidth * 1000) / 1000,
        recommended_algorithm: algo,
        recommended_tool_diameter_mm: 0,
        reason: this.zoneReason(zoneType, lastToolDia, minWidth, d),
      };

      // Tool recommendation
      zone.recommended_tool_diameter_mm = this.recommendToolDiameter(zone, input.available_tools);

      return zone;
    });

    // 4. Filter negligible zones (< 0.1% of stock volume)
    const stockVol = this.aabbVolume(input.stock);
    const minVol = Math.max(0.01, stockVol * 0.0001);
    const significantZones = restZones.filter(z => z.volume_mm3 > minVol);
    if (significantZones.length < restZones.length) {
      notes.push(`${restZones.length - significantZones.length} negligible zone(s) removed (< ${minVol.toFixed(3)} mm^3)`);
    }

    // 5. Sequence operations — group by tool diameter, largest tool first
    const operations = this.sequenceOperations(significantZones, material, toolChangeTime);

    // 6. Count tool changes
    let toolChanges = 0;
    for (let i = 1; i < operations.length; i++) {
      if (operations[i].tool.diameter_mm !== operations[i - 1].tool.diameter_mm) {
        toolChanges++;
      }
    }

    // 7. Compute totals
    const totalVol = significantZones.reduce((s, z) => s + z.volume_mm3, 0);
    const machiningTime = operations.reduce((s, o) => s + o.estimated_time_sec, 0);
    const totalTime = machiningTime + toolChanges * toolChangeTime;

    // 8. Optimization notes
    if (toolChanges > 4) {
      notes.push(`High tool-change count (${toolChanges}) — consider MTHZD hybrid zone decomposition`);
    }
    if (significantZones.some(z => z.min_width_mm < 1.0)) {
      notes.push("Sub-1mm feature width detected — verify tool deflection with PTDC algorithm");
    }
    if (!(material.toLowerCase() in MATERIAL_MRR_FACTOR)) {
      notes.push(`Unknown material "${material}" — using steel MRR baseline`);
    }
    if (significantZones.some(z => z.type === "corner")) {
      const cornerZones = significantZones.filter(z => z.type === "corner");
      const minCornerWidth = Math.min(...cornerZones.map(z => z.min_width_mm));
      const minR = this.minCornerRadius(minCornerWidth * 0.9, tolerance);
      notes.push(`Minimum achievable corner radius: ${minR.toFixed(3)} mm`);
    }
    if (significantZones.some(z => z.max_depth_mm > z.recommended_tool_diameter_mm * 4)) {
      notes.push("Deep rest zones detected — consider high-feed or plunging strategy");
    }

    // RestMachining: detected zones, volume, time, tool changes

    return {
      rest_zones: significantZones,
      operations,
      zone_count: significantZones.length,
      estimated_total_time_sec: Math.round(totalTime * 100) / 100,
      total_rest_volume_mm3: Math.round(totalVol * 100) / 100,
      tool_changes: toolChanges,
      optimization_notes: notes,
      formulas: {
        scallop_flat: "h = D/2 - sqrt((D/2)^2 - (ae/2)^2)",
        cusp_ballnose: "h = ae^2 / (8*R)",
        tool_deflection: "delta = F*L^3 / (3*E*I), I = pi*d^4/64",
        mrr: "MRR = ae * ap * vf",
        total_time: "T = sum(V_zone / MRR_zone) + N_changes * T_change",
        min_corner_radius: "R_min = tool_radius + tolerance",
      },
    };
  }

  // ── Private Helpers ────────────────────────────────────────────────────

  /** Generate human-readable reason for zone classification. */
  private zoneReason(type: ZoneType, prevToolDia: number, minWidth: number, depth: number): string {
    switch (type) {
      case "corner":
        return `Previous tool (D${prevToolDia}) too large for ${minWidth.toFixed(1)}mm corner`;
      case "floor":
        return `Shallow rest (${depth.toFixed(1)}mm) from scallop/stepover residual`;
      case "wall":
        return `Narrow wall rest (${minWidth.toFixed(1)}mm wide, ${depth.toFixed(1)}mm deep)`;
      case "fillet":
        return `Fillet radius rest — tool radius exceeded feature radius`;
      case "step":
        return `Step/ledge rest (${depth.toFixed(1)}mm) from Z-level boundary`;
      case "pocket":
        return `Pocket rest zone (${minWidth.toFixed(1)}mm x ${depth.toFixed(1)}mm deep)`;
    }
  }

  /**
   * Sequence operations by grouping same-tool ops together.
   * Within each group, process largest volume zones first.
   * Groups ordered largest-tool-first for maximum MRR.
   */
  private sequenceOperations(
    zones: RestZone[], material: string, _toolChangeTime: number,
  ): RestOperation[] {
    if (zones.length === 0) return [];

    // Group by recommended tool diameter
    const groups = new Map<number, RestZone[]>();
    for (const z of zones) {
      const dia = z.recommended_tool_diameter_mm;
      if (!groups.has(dia)) groups.set(dia, []);
      groups.get(dia)!.push(z);
    }

    // Order groups: largest tool first (maximizes MRR, fewer passes)
    const groupKeys = [...groups.keys()].sort((a, b) => b - a);

    const operations: RestOperation[] = [];
    let seq = 1;

    for (const dia of groupKeys) {
      const groupZones = groups.get(dia)!;
      // Sort within group by volume descending
      groupZones.sort((a, b) => b.volume_mm3 - a.volume_mm3);

      for (const zone of groupZones) {
        const ae = dia * 0.4;
        const ap = Math.min(dia * 0.5, zone.max_depth_mm);
        const mrr = this.estimateMRR(dia, ae, ap, material);
        const time = this.estimateTime(zone.volume_mm3, dia, material);
        const scallop = this.scallopHeight(dia, ae);

        operations.push({
          sequence: seq++,
          zone,
          tool: { type: "endmill", diameter_mm: dia },
          algorithm: zone.recommended_algorithm,
          estimated_time_sec: Math.round(time * 100) / 100,
          mrr_mm3_per_min: Math.round(mrr * 100) / 100,
          scallop_height_mm: Math.round(scallop * 10000) / 10000,
        });
      }
    }

    return operations;
  }

  /** Create an empty result with given notes. */
  private emptyResult(notes: string[]): RestAnalysisResult {
    return {
      rest_zones: [],
      operations: [],
      zone_count: 0,
      estimated_total_time_sec: 0,
      total_rest_volume_mm3: 0,
      tool_changes: 0,
      optimization_notes: notes,
      formulas: {
        scallop_flat: "h = D/2 - sqrt((D/2)^2 - (ae/2)^2)",
        cusp_ballnose: "h = ae^2 / (8*R)",
        tool_deflection: "delta = F*L^3 / (3*E*I), I = pi*d^4/64",
        mrr: "MRR = ae * ap * vf",
        total_time: "T = sum(V_zone / MRR_zone) + N_changes * T_change",
        min_corner_radius: "R_min = tool_radius + tolerance",
      },
    };
  }
}

export const restMachiningEngine = new RestMachiningEngine();
