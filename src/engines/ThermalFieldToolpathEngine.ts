/**
 * ThermalFieldToolpathEngine — 2D Transient Thermal Field Routing
 *
 * Solves the 2D transient heat equation on a coarse grid to track the
 * cumulative thermal field as a toolpath progresses. Routes toolpath passes
 * to avoid heat-accumulation zones, improving surface integrity and tool life.
 *
 * Physics basis:
 *   Heat equation: ∂T/∂t = α∇²T + Q̇/(ρc)
 *   Explicit finite difference (forward Euler), stable when dt < h²/(4α)
 *   Thermal diffusivity α = k/(ρc) [m²/s]
 *   Cutting heat: Q = Fc·Vc/60 [W], ~30% partition to workpiece
 *
 * @module ThermalFieldToolpathEngine
 */

// ============================================================================
// TYPES
// ============================================================================

/** 2D temperature grid representing the workpiece thermal state */
export interface ThermalGrid {
  /** Row-major 2D temperature array [row][col] in °C */
  temps: number[][];
  /** Number of columns (x-direction cells) */
  width: number;
  /** Number of rows (y-direction cells) */
  height: number;
  /** Physical size of each cell in mm */
  cell_size_mm: number;
  /** Ambient / initial temperature in °C */
  ambient_C: number;
  /** Current simulation time in seconds */
  time_s: number;
  /** Physical width of the grid in mm */
  phys_width_mm: number;
  /** Physical height of the grid in mm */
  phys_height_mm: number;
}

/** Thermal material properties */
export interface ThermalMaterial {
  /** Thermal conductivity [W/(m·K)] */
  k: number;
  /** Density [kg/m³] */
  rho: number;
  /** Specific heat capacity [J/(kg·K)] */
  c: number;
  /** Thermal diffusivity [m²/s] — computed if omitted */
  alpha?: number;
  /** Kienzle specific cutting force kc1.1 [MPa] */
  kc1_1?: number;
  /** Kienzle exponent mc */
  mc?: number;
}

/** A cell in the grid that is below the thermal threshold */
export interface CoolZone {
  /** Row index */
  i: number;
  /** Column index */
  j: number;
  /** Physical X position [mm] */
  x_mm: number;
  /** Physical Y position [mm] */
  y_mm: number;
  /** Current temperature at this cell [°C] */
  temp_C: number;
}

/** A single toolpath pass to route */
export interface ToolpathPass {
  /** Unique pass identifier */
  id: number;
  /** Start position [mm] */
  start: Point2D;
  /** End position [mm] */
  end: Point2D;
  /** Pass type (roughing, finishing, etc.) */
  type: string;
}

/** Result of thermal simulation along a path */
export interface ThermalSimResult {
  /** Maximum temperature reached during simulation [°C] */
  max_temp_C: number;
  /** Average temperature across the grid after simulation [°C] */
  avg_temp_C: number;
  /** Number of cells exceeding a danger threshold (ambient + 100°C) */
  hot_spots: number;
  /** 2D gradient magnitude map [°C/mm] */
  thermal_gradient_map: number[][];
}

/** 2D point */
export interface Point2D {
  x: number;
  y: number;
}

/** Result of the toolpath routing with thermal awareness */
export interface RoutedToolpath {
  /** Reordered passes */
  sequence: Array<{
    pass: ToolpathPass;
    order: number;
    entry_temp_C: number;
    exit_max_temp_C: number;
    was_deferred: boolean;
  }>;
  /** Total cooling pauses inserted [s] */
  total_cooling_time_s: number;
  /** Number of passes that were deferred at least once */
  deferred_count: number;
}

/** Comparison result: 2D field vs TGAR point estimate */
export interface FieldVsTGARComparison {
  /** Maximum temperature from 2D field simulation [°C] */
  field_max_C: number;
  /** Maximum temperature from TGAR point estimate [°C] */
  tgar_max_C: number;
  /** Temperature delta [°C] — positive means field found higher temps */
  delta_C: number;
  /** Number of hot zones detected by field that point-estimate missed */
  missed_hotspots: number;
  /** Cases where 2D field catches accumulation that point estimates miss */
  accumulation_cases: string[];
  /** Recommendation */
  recommendation: string;
}

// ============================================================================
// INLINE MATERIALS DATABASE
// ============================================================================

const MATERIALS_DB: Record<string, ThermalMaterial> = {
  steel_1045: { k: 49.8, rho: 7870, c: 486, kc1_1: 1800, mc: 0.25 },
  aluminum_6061: { k: 167, rho: 2700, c: 896, kc1_1: 800, mc: 0.23 },
  titanium_6al4v: { k: 6.7, rho: 4430, c: 526, kc1_1: 2800, mc: 0.28 },
  inconel_718: { k: 11.4, rho: 8190, c: 435, kc1_1: 2800, mc: 0.28 },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Resolve material: accept a ThermalMaterial object or a string key.
 */
function resolveMaterial(material: ThermalMaterial | string): ThermalMaterial {
  if (typeof material === "string") {
    const m = MATERIALS_DB[material];
    if (!m) {
      throw new Error(`Unknown material: ${material}. Available: ${Object.keys(MATERIALS_DB).join(", ")}`);
    }
    return { ...m };
  }
  return { ...material };
}

/**
 * Compute thermal diffusivity α = k / (ρ·c) [m²/s]
 */
function computeAlpha(mat: ThermalMaterial): number {
  if (mat.alpha !== undefined) return mat.alpha;
  return mat.k / (mat.rho * mat.c);
}

/**
 * Kienzle cutting force: Fc = kc1.1 · ap · fz^(1-mc) [N]
 * Simplified single-tooth model for heat generation estimate.
 */
function kienzleFc(kc1_1: number, mc: number, ap_mm: number, fz_mm: number): number {
  if (fz_mm <= 0 || ap_mm <= 0) return 0;
  return kc1_1 * ap_mm * Math.pow(fz_mm, 1 - mc);
}

/**
 * Clamp value between min and max.
 */
function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Convert grid indices to physical position [mm].
 */
function gridToPhys(i: number, j: number, cellSize: number): Point2D {
  return { x: (j + 0.5) * cellSize, y: (i + 0.5) * cellSize };
}

/**
 * Convert physical position [mm] to grid indices (clamped).
 */
function physToGrid(x_mm: number, y_mm: number, grid: ThermalGrid): { i: number; j: number } {
  const j = clamp(Math.floor(x_mm / grid.cell_size_mm), 0, grid.width - 1);
  const i = clamp(Math.floor(y_mm / grid.cell_size_mm), 0, grid.height - 1);
  return { i, j };
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

/**
 * ThermalFieldToolpathEngine
 *
 * Tracks the 2D transient thermal field of a workpiece during machining.
 * Uses explicit finite-difference solution to the heat equation to
 * route toolpath passes away from heat-accumulation zones.
 */
export class ThermalFieldToolpathEngine {

  /**
   * Create a 2D temperature grid initialized to ambient temperature.
   *
   * @param width_mm  - Physical width of workpiece region [mm]
   * @param height_mm - Physical height of workpiece region [mm]
   * @param resolution - Number of cells along the longer axis (default 32)
   * @returns Initialized ThermalGrid
   */
  initializeGrid(width_mm: number, height_mm: number, resolution = 32): ThermalGrid {
    if (width_mm <= 0 || height_mm <= 0) {
      throw new Error("Grid dimensions must be positive");
    }
    if (resolution < 2) {
      throw new Error("Resolution must be at least 2");
    }

    const maxDim = Math.max(width_mm, height_mm);
    const cell_size_mm = maxDim / resolution;
    const nx = Math.max(2, Math.round(width_mm / cell_size_mm));
    const ny = Math.max(2, Math.round(height_mm / cell_size_mm));
    const ambient = 25.0;

    const temps: number[][] = [];
    for (let i = 0; i < ny; i++) {
      temps.push(new Array(nx).fill(ambient));
    }

    return {
      temps,
      width: nx,
      height: ny,
      cell_size_mm,
      ambient_C: ambient,
      time_s: 0,
      phys_width_mm: width_mm,
      phys_height_mm: height_mm,
    };
  }

  /**
   * Apply a localized heat source at a physical position on the grid.
   *
   * Distributes heat across nearby cells using a 2D Gaussian kernel
   * with σ = 2 cells. Temperature rise: ΔT = Q·dt / (ρ·c·V_cell).
   *
   * @param grid       - Current thermal grid (mutated in place)
   * @param x_mm       - Heat source X position [mm]
   * @param y_mm       - Heat source Y position [mm]
   * @param Q_watts    - Heat source power [W]
   * @param duration_s - Duration of heat application [s]
   * @param material   - Material properties or name string
   * @returns The grid (same reference, mutated)
   */
  applyHeatSource(
    grid: ThermalGrid,
    x_mm: number,
    y_mm: number,
    Q_watts: number,
    duration_s: number,
    material: ThermalMaterial | string = "steel_1045"
  ): ThermalGrid {
    const mat = resolveMaterial(material);
    const sigma = 2; // cells
    const { i: ci, j: cj } = physToGrid(x_mm, y_mm, grid);
    const h_m = grid.cell_size_mm / 1000; // cell size in meters
    const V_cell = h_m * h_m * h_m; // approximate cubic cell volume [m³]
    const radius = Math.ceil(sigma * 3); // 3-sigma coverage

    // Build Gaussian weights and normalize
    let totalWeight = 0;
    const weights: Array<{ i: number; j: number; w: number }> = [];

    for (let di = -radius; di <= radius; di++) {
      for (let dj = -radius; dj <= radius; dj++) {
        const ni = ci + di;
        const nj = cj + dj;
        if (ni < 0 || ni >= grid.height || nj < 0 || nj >= grid.width) continue;
        const r2 = di * di + dj * dj;
        const w = Math.exp(-r2 / (2 * sigma * sigma));
        weights.push({ i: ni, j: nj, w });
        totalWeight += w;
      }
    }

    if (totalWeight === 0) return grid;

    // Apply heat: ΔT = (Q * dt * w_normalized) / (ρ * c * V_cell)
    const denom = mat.rho * mat.c * V_cell;
    for (const { i, j, w } of weights) {
      const fraction = w / totalWeight;
      const dT = (Q_watts * duration_s * fraction) / denom;
      grid.temps[i][j] += dT;
    }

    grid.time_s += duration_s;
    return grid;
  }

  /**
   * Advance the thermal field by dt seconds using explicit finite difference.
   *
   * Discretization (forward Euler):
   *   T_new(i,j) = T(i,j) + α·dt/h² · [T(i+1,j) + T(i-1,j) + T(i,j+1) + T(i,j-1) - 4·T(i,j)]
   *
   * Boundary condition: Dirichlet (ambient temperature at boundaries).
   * Stability requirement: dt < h²/(4α). If violated, sub-steps are used.
   *
   * @param grid     - Current thermal grid (mutated in place)
   * @param dt_s     - Time step [s]
   * @param material - Material properties or name string
   * @returns The grid (same reference, mutated)
   */
  stepTimeForward(
    grid: ThermalGrid,
    dt_s: number,
    material: ThermalMaterial | string = "steel_1045"
  ): ThermalGrid {
    const mat = resolveMaterial(material);
    const alpha = computeAlpha(mat); // [m²/s]
    const h_m = grid.cell_size_mm / 1000; // cell size in meters
    const h2 = h_m * h_m;

    // Stability limit
    const dt_max = h2 / (4 * alpha);
    const nSteps = Math.max(1, Math.ceil(dt_s / dt_max));
    const dt_sub = dt_s / nSteps;
    const coeff = alpha * dt_sub / h2;

    for (let step = 0; step < nSteps; step++) {
      // Copy current temps for explicit update
      const old: number[][] = grid.temps.map(row => [...row]);

      for (let i = 0; i < grid.height; i++) {
        for (let j = 0; j < grid.width; j++) {
          // Boundary cells: Dirichlet ambient
          if (i === 0 || i === grid.height - 1 || j === 0 || j === grid.width - 1) {
            // Partial boundary: use ambient for out-of-domain neighbors
            const Tup = i > 0 ? old[i - 1][j] : grid.ambient_C;
            const Tdn = i < grid.height - 1 ? old[i + 1][j] : grid.ambient_C;
            const Tlf = j > 0 ? old[i][j - 1] : grid.ambient_C;
            const Trt = j < grid.width - 1 ? old[i][j + 1] : grid.ambient_C;
            grid.temps[i][j] = old[i][j] + coeff * (Tup + Tdn + Tlf + Trt - 4 * old[i][j]);
          } else {
            const laplacian = old[i - 1][j] + old[i + 1][j] + old[i][j - 1] + old[i][j + 1] - 4 * old[i][j];
            grid.temps[i][j] = old[i][j] + coeff * laplacian;
          }
        }
      }
    }

    grid.time_s += dt_s;
    return grid;
  }

  /**
   * Find all grid cells below a temperature threshold (cool zones safe for cutting).
   *
   * @param grid        - Current thermal grid
   * @param threshold_C - Maximum temperature considered safe [°C]
   * @returns Array of CoolZone entries sorted by temperature (coolest first)
   */
  findCoolZones(grid: ThermalGrid, threshold_C: number): CoolZone[] {
    const zones: CoolZone[] = [];

    for (let i = 0; i < grid.height; i++) {
      for (let j = 0; j < grid.width; j++) {
        if (grid.temps[i][j] < threshold_C) {
          const pos = gridToPhys(i, j, grid.cell_size_mm);
          zones.push({
            i,
            j,
            x_mm: +pos.x.toFixed(2),
            y_mm: +pos.y.toFixed(2),
            temp_C: +grid.temps[i][j].toFixed(2),
          });
        }
      }
    }

    zones.sort((a, b) => a.temp_C - b.temp_C);
    return zones;
  }

  /**
   * Route toolpath passes to avoid heat-accumulation zones.
   *
   * Algorithm:
   *   1. For each pending pass, check if its entry zone is below the thermal threshold.
   *   2. If hot, defer and try the next pass.
   *   3. After executing a pass, simulate heat injection + cooling step.
   *   4. If all remaining passes are hot, insert a cooling pause and retry.
   *
   * @param grid        - Current thermal grid (will be mutated)
   * @param passes      - Array of toolpath passes to execute
   * @param threshold_C - Maximum safe temperature at pass entry [°C]
   * @param material    - Material properties or name string
   * @param Q_per_pass  - Approximate heat per pass [W] (default 50)
   * @param pass_time_s - Approximate time per pass [s] (default 2)
   * @param cool_step_s - Cooling step duration when all passes are hot [s] (default 5)
   * @returns RoutedToolpath with reordered sequence and thermal data
   */
  routeToolpath(
    grid: ThermalGrid,
    passes: ToolpathPass[],
    threshold_C: number,
    material: ThermalMaterial | string = "steel_1045",
    Q_per_pass = 50,
    pass_time_s = 2,
    cool_step_s = 5
  ): RoutedToolpath {
    const mat = resolveMaterial(material);
    const pending = passes.map(p => ({ pass: p, deferred: false, deferCount: 0 }));
    const sequence: RoutedToolpath["sequence"] = [];
    let totalCooling = 0;
    let order = 0;
    const maxIterations = passes.length * 10; // safety limit
    let iterations = 0;

    while (pending.length > 0 && iterations < maxIterations) {
      iterations++;
      let executed = false;

      for (let idx = 0; idx < pending.length; idx++) {
        const entry = pending[idx];
        const { i, j } = physToGrid(entry.pass.start.x, entry.pass.start.y, grid);
        const entryTemp = grid.temps[i]?.[j] ?? grid.ambient_C;

        if (entryTemp < threshold_C) {
          // Execute this pass
          const midX = (entry.pass.start.x + entry.pass.end.x) / 2;
          const midY = (entry.pass.start.y + entry.pass.end.y) / 2;

          // Inject heat along pass
          this.applyHeatSource(grid, entry.pass.start.x, entry.pass.start.y, Q_per_pass * 0.3, pass_time_s * 0.3, mat);
          this.applyHeatSource(grid, midX, midY, Q_per_pass * 0.4, pass_time_s * 0.4, mat);
          this.applyHeatSource(grid, entry.pass.end.x, entry.pass.end.y, Q_per_pass * 0.3, pass_time_s * 0.3, mat);

          // Allow some diffusion
          this.stepTimeForward(grid, pass_time_s * 0.5, mat);

          const { i: ei, j: ej } = physToGrid(entry.pass.end.x, entry.pass.end.y, grid);
          const exitTemp = grid.temps[ei]?.[ej] ?? grid.ambient_C;

          sequence.push({
            pass: entry.pass,
            order: order++,
            entry_temp_C: +entryTemp.toFixed(2),
            exit_max_temp_C: +exitTemp.toFixed(2),
            was_deferred: entry.deferCount > 0,
          });

          pending.splice(idx, 1);
          executed = true;
          break;
        } else {
          entry.deferCount++;
          entry.deferred = true;
        }
      }

      if (!executed && pending.length > 0) {
        // All remaining passes are hot — insert cooling pause
        this.stepTimeForward(grid, cool_step_s, mat);
        totalCooling += cool_step_s;
      }
    }

    return {
      sequence,
      total_cooling_time_s: +totalCooling.toFixed(2),
      deferred_count: sequence.filter(s => s.was_deferred).length,
    };
  }

  /**
   * Simulate cutting along a 2D path, injecting heat at each position.
   *
   * Heat generation: Q_cut = Fc·Vc/60 [W], with ~30% partition to workpiece.
   * Fc from Kienzle: Fc = kc1.1 · ap · fz^(1-mc).
   *
   * @param grid     - Current thermal grid (will be mutated)
   * @param path     - Sequence of 2D points defining the cut path [mm]
   * @param Vc       - Cutting speed [m/min]
   * @param feed     - Feed per tooth [mm]
   * @param ap       - Axial depth of cut [mm]
   * @param ae       - Radial depth of cut [mm]
   * @param material - Material properties or name string
   * @returns ThermalSimResult with max/avg temps, hot spots, and gradient map
   */
  simulateCuttingThermal(
    grid: ThermalGrid,
    path: Point2D[],
    Vc: number,
    feed: number,
    ap: number,
    ae: number,
    material: ThermalMaterial | string = "steel_1045"
  ): ThermalSimResult {
    if (path.length < 2) {
      throw new Error("Path must have at least 2 points");
    }

    const mat = resolveMaterial(material);
    const kc1_1 = mat.kc1_1 ?? 1800;
    const mc = mat.mc ?? 0.25;

    // Kienzle cutting force [N]
    const Fc = kienzleFc(kc1_1, mc, ap, feed);
    // Total cutting power [W], 30% to workpiece
    const Q_total = (Fc * Vc) / 60;
    const Q_workpiece = Q_total * 0.3;

    // Feed rate [mm/s] (approximate: Vc in m/min → mm/s, scaled by ae/diameter ratio)
    const feed_rate_mm_s = (Vc * 1000 / 60) * (feed / ae) * 0.1; // simplified
    const effectiveFeedRate = Math.max(feed_rate_mm_s, 1); // floor at 1 mm/s

    let maxTemp = grid.ambient_C;

    for (let p = 0; p < path.length - 1; p++) {
      const dx = path[p + 1].x - path[p].x;
      const dy = path[p + 1].y - path[p].y;
      const segLen = Math.sqrt(dx * dx + dy * dy);
      if (segLen < 1e-6) continue;

      const dt_seg = segLen / effectiveFeedRate; // time for this segment [s]

      // Inject heat at midpoint of segment
      const mx = (path[p].x + path[p + 1].x) / 2;
      const my = (path[p].y + path[p + 1].y) / 2;

      this.applyHeatSource(grid, mx, my, Q_workpiece, dt_seg, mat);
      this.stepTimeForward(grid, dt_seg, mat);

      // Track max
      for (let i = 0; i < grid.height; i++) {
        for (let j = 0; j < grid.width; j++) {
          if (grid.temps[i][j] > maxTemp) maxTemp = grid.temps[i][j];
        }
      }
    }

    // Compute final statistics
    let sumTemp = 0;
    let hotSpots = 0;
    const dangerThreshold = grid.ambient_C + 100;

    for (let i = 0; i < grid.height; i++) {
      for (let j = 0; j < grid.width; j++) {
        sumTemp += grid.temps[i][j];
        if (grid.temps[i][j] > dangerThreshold) hotSpots++;
      }
    }

    const avgTemp = sumTemp / (grid.height * grid.width);

    // Compute gradient magnitude map: |∇T| ≈ √((dT/dx)² + (dT/dy)²)
    const gradientMap: number[][] = [];
    const h = grid.cell_size_mm;

    for (let i = 0; i < grid.height; i++) {
      const row: number[] = [];
      for (let j = 0; j < grid.width; j++) {
        const dTdx = j < grid.width - 1 && j > 0
          ? (grid.temps[i][j + 1] - grid.temps[i][j - 1]) / (2 * h)
          : 0;
        const dTdy = i < grid.height - 1 && i > 0
          ? (grid.temps[i + 1][j] - grid.temps[i - 1][j]) / (2 * h)
          : 0;
        row.push(+Math.sqrt(dTdx * dTdx + dTdy * dTdy).toFixed(4));
      }
      gradientMap.push(row);
    }

    return {
      max_temp_C: +maxTemp.toFixed(2),
      avg_temp_C: +avgTemp.toFixed(2),
      hot_spots: hotSpots,
      thermal_gradient_map: gradientMap,
    };
  }

  /**
   * Compare 2D transient field tracking vs TGAR's point-estimate approach.
   *
   * TGAR uses a 1D point-estimate per zone: each zone has a single temperature
   * that cools via exponential decay. This 2D engine tracks full spatial diffusion.
   * The comparison reveals cases where adjacent-pass heat accumulation is missed
   * by point estimates but caught by the 2D field solver.
   *
   * @param path     - Cut path points [mm]
   * @param material - Material properties or name string
   * @param tool     - Tool parameters: { diameter_mm, flute_count, ap_mm, ae_mm, fz_mm, rpm }
   * @returns FieldVsTGARComparison with delta analysis and recommendations
   */
  compareVsTGAR(
    path: Point2D[],
    material: ThermalMaterial | string = "steel_1045",
    tool: {
      diameter_mm: number;
      flute_count: number;
      ap_mm: number;
      ae_mm: number;
      fz_mm: number;
      rpm: number;
    } = { diameter_mm: 12, flute_count: 4, ap_mm: 3, ae_mm: 3, fz_mm: 0.08, rpm: 5000 }
  ): FieldVsTGARComparison {
    const mat = resolveMaterial(material);
    const kc1_1 = mat.kc1_1 ?? 1800;
    const mc = mat.mc ?? 0.25;
    const Vc = (Math.PI * tool.diameter_mm * tool.rpm) / 1000; // m/min

    // ---- 2D Field simulation ----
    const xCoords = path.map(p => p.x);
    const yCoords = path.map(p => p.y);
    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minY = Math.min(...yCoords);
    const maxY = Math.max(...yCoords);
    const margin = tool.diameter_mm * 3;
    const gridW = Math.max(maxX - minX + 2 * margin, 20);
    const gridH = Math.max(maxY - minY + 2 * margin, 20);

    const fieldGrid = this.initializeGrid(gridW, gridH, 24);

    // Shift path to grid coords
    const shiftedPath = path.map(p => ({
      x: p.x - minX + margin,
      y: p.y - minY + margin,
    }));

    const fieldResult = this.simulateCuttingThermal(
      fieldGrid, shiftedPath, Vc, tool.fz_mm, tool.ap_mm, tool.ae_mm, mat
    );

    // ---- TGAR point-estimate simulation ----
    // TGAR divides into thermal zones and tracks one temperature per zone.
    // Simulate: for each segment, compute heat and apply to zone, then decay.
    const nZones = 8;
    const zoneTempsTGAR = new Array(nZones).fill(25.0);
    const totalPathLen = shiftedPath.reduce((sum, p, i) => {
      if (i === 0) return 0;
      const dx = p.x - shiftedPath[i - 1].x;
      const dy = p.y - shiftedPath[i - 1].y;
      return sum + Math.sqrt(dx * dx + dy * dy);
    }, 0);
    const zoneLen = totalPathLen / nZones;

    const Fc = kienzleFc(kc1_1, mc, tool.ap_mm, tool.fz_mm);
    const Q_cut = (Fc * Vc) / 60 * 0.3; // 30% to workpiece
    const feedRate = tool.fz_mm * tool.flute_count * tool.rpm; // mm/min
    const feedRateMs = feedRate / 60; // mm/s

    let accLen = 0;
    for (let p = 1; p < shiftedPath.length; p++) {
      const dx = shiftedPath[p].x - shiftedPath[p - 1].x;
      const dy = shiftedPath[p].y - shiftedPath[p - 1].y;
      const segLen = Math.sqrt(dx * dx + dy * dy);
      accLen += segLen;
      const zoneIdx = clamp(Math.floor(accLen / zoneLen), 0, nZones - 1);
      const dt_seg = segLen / Math.max(feedRateMs, 1);

      // TGAR: zone-local heat injection
      const h_m = gridW / (nZones * 1000);
      const V_zone = h_m * h_m * h_m;
      const dT = Q_cut * dt_seg / (mat.rho * mat.c * V_zone);
      zoneTempsTGAR[zoneIdx] += dT;

      // Simple exponential cooling (TGAR style)
      const alpha = computeAlpha(mat);
      const coolingRate = alpha * 1e4; // simplified point cooling
      for (let z = 0; z < nZones; z++) {
        if (z !== zoneIdx) {
          zoneTempsTGAR[z] = 25 + (zoneTempsTGAR[z] - 25) * Math.exp(-coolingRate * dt_seg);
        }
      }
    }

    const tgarMax = Math.max(...zoneTempsTGAR);

    // ---- Accumulation analysis ----
    // Count field hot spots that TGAR zones would miss
    const dangerThresh = 25 + 100;
    let fieldHotCells = 0;
    for (let i = 0; i < fieldGrid.height; i++) {
      for (let j = 0; j < fieldGrid.width; j++) {
        if (fieldGrid.temps[i][j] > dangerThresh) fieldHotCells++;
      }
    }

    // TGAR would flag zones above danger as hot
    const tgarHotZones = zoneTempsTGAR.filter(t => t > dangerThresh).length;
    // Approximate TGAR's spatial coverage of hot cells
    const cellsPerZone = (fieldGrid.width * fieldGrid.height) / nZones;
    const tgarCoveredHotCells = Math.round(tgarHotZones * cellsPerZone);
    const missedHotspots = Math.max(0, fieldHotCells - tgarCoveredHotCells);

    const accumulationCases: string[] = [];
    if (fieldResult.max_temp_C > tgarMax + 5) {
      accumulationCases.push(
        `Adjacent-pass heat buildup: 2D field detected ${fieldResult.max_temp_C.toFixed(1)}°C vs TGAR point-estimate ${tgarMax.toFixed(1)}°C`
      );
    }
    if (missedHotspots > 0) {
      accumulationCases.push(
        `${missedHotspots} hot cells in inter-zone boundary regions invisible to TGAR's per-zone tracking`
      );
    }
    if (fieldResult.hot_spots > tgarHotZones * 2) {
      accumulationCases.push(
        `Heat diffusion between zones creates ${fieldResult.hot_spots} distributed hot spots vs ${tgarHotZones} discrete TGAR zones`
      );
    }

    const delta = fieldResult.max_temp_C - tgarMax;
    let recommendation: string;
    if (Math.abs(delta) < 5) {
      recommendation = "TGAR point-estimate is adequate for this geometry. Use 2D field for complex pockets.";
    } else if (delta > 20) {
      recommendation = "Significant heat accumulation missed by TGAR. Use 2D field tracking for thermal safety.";
    } else if (delta > 0) {
      recommendation = "Moderate accumulation detected. Consider 2D field for tight-tolerance work.";
    } else {
      recommendation = "TGAR overestimates local temperature (no spatial diffusion). 2D field gives more accurate lower estimate.";
    }

    return {
      field_max_C: +fieldResult.max_temp_C.toFixed(2),
      tgar_max_C: +tgarMax.toFixed(2),
      delta_C: +delta.toFixed(2),
      missed_hotspots: missedHotspots,
      accumulation_cases: accumulationCases,
      recommendation,
    };
  }

  /**
   * Get the inline materials database for reference.
   * @returns Record of available material keys and their properties
   */
  getMaterials(): Record<string, ThermalMaterial> {
    return { ...MATERIALS_DB };
  }

  /**
   * Dispatcher entry point — routes action strings to methods.
   *
   * Actions:
   *   - initialize_grid
   *   - apply_heat
   *   - step_forward
   *   - find_cool_zones
   *   - route_toolpath
   *   - simulate_cutting
   *   - compare_vs_tgar
   */
  async dispatch(action: string, params: Record<string, unknown>): Promise<unknown> {
    switch (action) {
      case "initialize_grid":
        return this.initializeGrid(
          params.width_mm as number,
          params.height_mm as number,
          (params.resolution as number) ?? 32
        );

      case "apply_heat":
        return this.applyHeatSource(
          params.grid as ThermalGrid,
          params.x_mm as number,
          params.y_mm as number,
          params.Q_watts as number,
          params.duration_s as number,
          (params.material as ThermalMaterial | string) ?? "steel_1045"
        );

      case "step_forward":
        return this.stepTimeForward(
          params.grid as ThermalGrid,
          params.dt_s as number,
          (params.material as ThermalMaterial | string) ?? "steel_1045"
        );

      case "find_cool_zones":
        return this.findCoolZones(
          params.grid as ThermalGrid,
          params.threshold_C as number
        );

      case "route_toolpath":
        return this.routeToolpath(
          params.grid as ThermalGrid,
          params.passes as ToolpathPass[],
          params.threshold_C as number,
          (params.material as ThermalMaterial | string) ?? "steel_1045",
          (params.Q_per_pass as number) ?? 50,
          (params.pass_time_s as number) ?? 2,
          (params.cool_step_s as number) ?? 5
        );

      case "simulate_cutting":
        return this.simulateCuttingThermal(
          params.grid as ThermalGrid,
          params.path as Point2D[],
          params.Vc as number,
          params.feed as number,
          params.ap as number,
          params.ae as number,
          (params.material as ThermalMaterial | string) ?? "steel_1045"
        );

      case "compare_vs_tgar":
        return this.compareVsTGAR(
          params.path as Point2D[],
          (params.material as ThermalMaterial | string) ?? "steel_1045",
          params.tool as {
            diameter_mm: number;
            flute_count: number;
            ap_mm: number;
            ae_mm: number;
            fz_mm: number;
            rpm: number;
          }
        );

      default:
        throw new Error(`ThermalFieldToolpathEngine: unknown action "${action}"`);
    }
  }
}

/** Singleton instance */
export const thermalFieldToolpathEngine = new ThermalFieldToolpathEngine();
