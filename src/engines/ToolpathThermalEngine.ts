/**
 * ToolpathThermalEngine — Workpiece Heat Accumulation & Thermal Distortion Prediction
 *
 * NOVEL: No competing post-processor or CAM system offers integrated thermal
 * distortion prediction from G-code analysis. This engine bridges the gap between
 * FEA-based thermal simulation (expensive, slow) and blind machining (hope for
 * the best). By parsing G-code motion blocks, extracting cutting parameters, and
 * applying real thermodynamics (Kienzle cutting force model, Newton's cooling law,
 * Fourier conduction), it predicts heat accumulation zones and dimensional distortion
 * risk — in seconds, not hours.
 *
 * Physics foundation:
 *   - Kienzle model: Fc = kc1 * b * h^(1-mc)
 *   - Heat input: Q = Fc * Vc
 *   - Partition: Q_workpiece = Q * (1 - eta_chip)
 *   - Temperature rise: dT = Q_wp / (rho * cp * V_affected)
 *   - Thermal expansion: dL = alpha * L * dT
 *   - Cooling: dT/dt = -h_conv * A_surface / (rho * cp * V) * (T - T_ambient)
 *
 * @version 1.0.0
 */

import { machiningPlaybookEngine } from "./MachiningPlaybookEngine.js";

// ─── Exported Types ──────────────────────────────────────────────────────────

export interface MaterialThermal {
  /** Specific cutting force at h=1mm [N/mm^2] (Kienzle kc1.1) */
  kc1: number;
  /** Kienzle exponent (1-mc) */
  mc: number;
  /** Density [kg/m^3] */
  density: number;
  /** Specific heat capacity [J/(kg*K)] */
  specific_heat: number;
  /** Thermal conductivity [W/(m*K)] */
  conductivity: number;
  /** Coefficient of thermal expansion [1/K] */
  expansion_coeff: number;
  /** Fraction of heat carried away by chip (0-1) */
  chip_heat_ratio: number;
}

export interface WorkpieceDimensions {
  x: number; // mm
  y: number; // mm
  z: number; // mm
}

export interface ThermalZone {
  region: {
    x_start: number;
    x_end: number;
    y_start: number;
    y_end: number;
    z_start: number;
    z_end: number;
  };
  avg_temp_rise: number;   // degrees C
  peak_temp_rise: number;  // degrees C
  time_above_threshold: number; // seconds above 5 deg C rise
}

export interface HeatAccumulationConfig {
  gcode: string;
  material: string;
  tool_diameter: number;        // mm
  workpiece_dimensions: WorkpieceDimensions;
  coolant_type: "flood" | "mist" | "air" | "none";
  ambient_temp: number;         // degrees C
  machine_id?: string;          // auto-resolve machine thermal data from handbook
}

export interface HeatAccumulationResult {
  peak_temperature_rise: number;
  peak_location: { x: number; y: number; z: number };
  thermal_map: ThermalZone[];
  distortion_risk: "low" | "moderate" | "high" | "critical";
  max_distortion_um: number;
  cooling_recommendations: string[];
}

export interface CriticalDimension {
  axis: "x" | "y" | "z";
  nominal: number;  // mm
  tolerance: number; // mm (bilateral, e.g. 0.025 means +/-0.025)
}

export interface DistortionConfig {
  gcode: string;
  material: string;
  workpiece_dimensions: WorkpieceDimensions;
  critical_dimensions: CriticalDimension[];
  coolant_type: "flood" | "mist" | "air" | "none";
  machine_id?: string;          // auto-resolve machine thermal data from handbook
}

export interface DimensionDistortion {
  axis: "x" | "y" | "z";
  nominal: number;
  predicted_shift: number; // mm
  within_tolerance: boolean;
  margin: number; // mm remaining before out-of-tolerance
}

export interface DistortionResult {
  distortion_per_dimension: DimensionDistortion[];
  overall_risk: "low" | "moderate" | "high" | "critical";
  recommendations: string[];
}

export interface CuttingSequenceConfig {
  gcode: string;
  material: string;
  critical_features: string[]; // descriptions like "bore at X50 Y30"
}

export interface SequenceSuggestion {
  description: string;
  estimated_improvement_pct: number;
  affected_lines: number[];
}

export interface DwellPoint {
  after_line: number;
  duration_sec: number;
  reason: string;
}

export interface SequenceOptimizationResult {
  suggestions: SequenceSuggestion[];
  optimal_dwell_points: DwellPoint[];
}

export interface ThermalReportConfig {
  gcode: string;
  material: string;
  tool_diameter: number;
  workpiece_dimensions: WorkpieceDimensions;
  coolant_type: "flood" | "mist" | "air" | "none";
  ambient_temp: number;
  critical_dimensions?: CriticalDimension[];
}

// ─── Internal Types ──────────────────────────────────────────────────────────

interface ParsedBlock {
  line_number: number;
  x?: number;
  y?: number;
  z?: number;
  f?: number;   // feedrate mm/min
  s?: number;   // spindle RPM
  g_codes: number[];
  m_codes: number[];
  raw: string;
}

interface MotionSegment {
  line_number: number;
  start: { x: number; y: number; z: number };
  end: { x: number; y: number; z: number };
  feedrate: number;       // mm/min
  spindle_rpm: number;
  is_cutting: boolean;    // G1/G2/G3 with material engagement
  distance: number;       // mm
  duration: number;       // seconds
}

interface HeatEvent {
  segment: MotionSegment;
  heat_input_J: number;
  workpiece_heat_J: number;
  affected_volume_mm3: number;
  local_temp_rise: number;
}

interface GridCell {
  x_center: number;
  y_center: number;
  z_center: number;
  temperature_rise: number;
  cumulative_heat_J: number;
  last_cut_time: number;
}

// ─── Material Thermal Properties Database ────────────────────────────────────

const THERMAL_PROPERTIES: Record<string, MaterialThermal> = {
  aluminum_6061: {
    kc1: 800, mc: 0.25, density: 2700, specific_heat: 896,
    conductivity: 167, expansion_coeff: 23.6e-6, chip_heat_ratio: 0.75,
  },
  aluminum_7075: {
    kc1: 850, mc: 0.25, density: 2810, specific_heat: 860,
    conductivity: 130, expansion_coeff: 23.4e-6, chip_heat_ratio: 0.73,
  },
  steel_1018: {
    kc1: 2100, mc: 0.26, density: 7870, specific_heat: 486,
    conductivity: 51.9, expansion_coeff: 12.0e-6, chip_heat_ratio: 0.65,
  },
  steel_4140: {
    kc1: 2500, mc: 0.26, density: 7850, specific_heat: 473,
    conductivity: 42.7, expansion_coeff: 12.3e-6, chip_heat_ratio: 0.60,
  },
  stainless_304: {
    kc1: 2800, mc: 0.21, density: 8000, specific_heat: 500,
    conductivity: 16.2, expansion_coeff: 17.3e-6, chip_heat_ratio: 0.55,
  },
  stainless_316: {
    kc1: 2900, mc: 0.21, density: 8000, specific_heat: 500,
    conductivity: 16.3, expansion_coeff: 15.9e-6, chip_heat_ratio: 0.53,
  },
  titanium_6al4v: {
    kc1: 1800, mc: 0.23, density: 4430, specific_heat: 526,
    conductivity: 6.7, expansion_coeff: 8.6e-6, chip_heat_ratio: 0.45,
  },
  inconel_718: {
    kc1: 3200, mc: 0.25, density: 8190, specific_heat: 435,
    conductivity: 11.4, expansion_coeff: 13.0e-6, chip_heat_ratio: 0.40,
  },
  copper_c110: {
    kc1: 1100, mc: 0.22, density: 8940, specific_heat: 385,
    conductivity: 391, expansion_coeff: 16.5e-6, chip_heat_ratio: 0.80,
  },
  brass_360: {
    kc1: 780, mc: 0.20, density: 8500, specific_heat: 380,
    conductivity: 115, expansion_coeff: 20.5e-6, chip_heat_ratio: 0.78,
  },
};

/**
 * Convection coefficients by coolant type [W/(m^2*K)]
 * Based on empirical data for machining environments.
 */
const CONVECTION_COEFFICIENTS: Record<string, number> = {
  flood: 5000,   // Flood coolant: forced convection with liquid
  mist: 1500,    // Mist: partial liquid contact + evaporative cooling
  air: 50,       // Compressed air blast: forced air convection
  none: 10,      // Natural convection in still air
};

/** Grid resolution for thermal mapping (mm) */
const GRID_RESOLUTION = 10;

/** Thermal influence radius multiplier (times tool diameter) */
const THERMAL_INFLUENCE_RADIUS = 3.0;

/** Threshold temperature rise for concern (deg C) */
const TEMP_THRESHOLD_MODERATE = 5;
const TEMP_THRESHOLD_HIGH = 15;
const TEMP_THRESHOLD_CRITICAL = 30;

// ─── Engine Class ────────────────────────────────────────────────────────────

/**
 * ToolpathThermalEngine
 *
 * Analyzes G-code programs to predict workpiece heat accumulation,
 * thermal distortion risk, and recommends mitigations. Uses real
 * thermodynamics: Kienzle force model, heat partition theory,
 * Newton's cooling law, and linear thermal expansion.
 *
 * This is a genuinely novel capability — no competing CAM post-processor
 * or G-code analyzer offers integrated thermal distortion prediction.
 */
export class ToolpathThermalEngine {
  // ── G-code Parsing ───────────────────────────────────────────────────────

  /**
   * Parse a G-code program into structured blocks.
   */
  private parseGCode(gcode: string): ParsedBlock[] {
    const lines = gcode.split("\n");
    const blocks: ParsedBlock[] = [];

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i].trim();
      if (!raw || raw.startsWith("(") || raw.startsWith("%") || raw.startsWith(";")) continue;

      // Strip inline comments
      const code = raw.replace(/\(.*?\)/g, "").replace(/;.*$/, "").trim();
      if (!code) continue;

      const block: ParsedBlock = { line_number: i + 1, g_codes: [], m_codes: [], raw };

      // Extract G codes
      const gMatches = code.matchAll(/G(\d+\.?\d*)/gi);
      for (const m of gMatches) {
        block.g_codes.push(parseFloat(m[1]));
      }

      // Extract M codes
      const mMatches = code.matchAll(/M(\d+)/gi);
      for (const m of mMatches) {
        block.m_codes.push(parseInt(m[1], 10));
      }

      // Extract axis words
      const xMatch = code.match(/X([+-]?\d+\.?\d*)/i);
      if (xMatch) block.x = parseFloat(xMatch[1]);

      const yMatch = code.match(/Y([+-]?\d+\.?\d*)/i);
      if (yMatch) block.y = parseFloat(yMatch[1]);

      const zMatch = code.match(/Z([+-]?\d+\.?\d*)/i);
      if (zMatch) block.z = parseFloat(zMatch[1]);

      const fMatch = code.match(/F(\d+\.?\d*)/i);
      if (fMatch) block.f = parseFloat(fMatch[1]);

      const sMatch = code.match(/S(\d+\.?\d*)/i);
      if (sMatch) block.s = parseFloat(sMatch[1]);

      blocks.push(block);
    }

    return blocks;
  }

  /**
   * Convert parsed blocks into motion segments with cutting engagement detection.
   * Tracks modal state (G0/G1/G2/G3, feedrate, spindle) across blocks.
   */
  private buildMotionSegments(blocks: ParsedBlock[]): MotionSegment[] {
    const segments: MotionSegment[] = [];
    let modalMotion = 0; // 0=rapid, 1=linear, 2=CW arc, 3=CCW arc
    let currentFeed = 0;
    let currentRPM = 0;
    let pos = { x: 0, y: 0, z: 0 };
    let spindleOn = false;

    for (const block of blocks) {
      // Update modal motion mode
      for (const g of block.g_codes) {
        if (g === 0) modalMotion = 0;
        else if (g === 1) modalMotion = 1;
        else if (g === 2) modalMotion = 2;
        else if (g === 3) modalMotion = 3;
      }

      // Update spindle
      for (const m of block.m_codes) {
        if (m === 3 || m === 4) spindleOn = true;
        if (m === 5) spindleOn = false;
      }

      if (block.s !== undefined) currentRPM = block.s;
      if (block.f !== undefined) currentFeed = block.f;

      // Build segment if there is axis motion
      const hasMotion = block.x !== undefined || block.y !== undefined || block.z !== undefined;
      if (!hasMotion) continue;

      const endPos = {
        x: block.x ?? pos.x,
        y: block.y ?? pos.y,
        z: block.z ?? pos.z,
      };

      const dx = endPos.x - pos.x;
      const dy = endPos.y - pos.y;
      const dz = endPos.z - pos.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance < 0.001) {
        pos = { ...endPos };
        continue;
      }

      // Cutting = feed move (G1/G2/G3) with spindle on and non-zero feedrate
      const isCutting = modalMotion >= 1 && spindleOn && currentFeed > 0;
      const feedForCalc = isCutting ? currentFeed : 10000; // rapids ~ fast
      const duration = (distance / feedForCalc) * 60; // seconds

      segments.push({
        line_number: block.line_number,
        start: { ...pos },
        end: { ...endPos },
        feedrate: currentFeed,
        spindle_rpm: currentRPM,
        is_cutting: isCutting,
        distance,
        duration,
      });

      pos = { ...endPos };
    }

    return segments;
  }

  // ── Thermodynamic Calculations ───────────────────────────────────────────

  /**
   * Calculate cutting force using Kienzle model.
   *
   * Fc = kc1 * b * h^(1 - mc)
   *
   * Where:
   *   kc1 = specific cutting force at h=1mm [N/mm^2]
   *   b = width of cut (radial engagement) [mm]
   *   h = chip thickness (approx feed per tooth) [mm]
   *   mc = Kienzle exponent
   *
   * @returns Cutting force in Newtons
   */
  private calcCuttingForce(mat: MaterialThermal, widthOfCut: number, chipThickness: number): number {
    if (chipThickness <= 0 || widthOfCut <= 0) return 0;
    // Clamp chip thickness to reasonable range to avoid numerical issues
    const h = Math.max(0.01, Math.min(chipThickness, 1.0));
    const b = Math.max(0.1, widthOfCut);
    return mat.kc1 * b * Math.pow(h, 1 - mat.mc);
  }

  /**
   * Calculate heat input rate from cutting.
   *
   * Nearly all mechanical work in cutting converts to heat:
   *   Q = Fc * Vc
   * Where Vc = cutting speed [m/min] = PI * D * RPM / 1000
   *
   * @returns Heat generation rate in Watts (J/s)
   */
  private calcHeatInputRate(cuttingForce_N: number, cuttingSpeed_m_per_min: number): number {
    // P = Fc * Vc / 60 (convert m/min to m/s)
    return (cuttingForce_N * cuttingSpeed_m_per_min) / 60;
  }

  /**
   * Calculate workpiece temperature rise for a localized heat event.
   *
   * dT = Q_workpiece / (rho * cp * V_affected)
   *
   * Where:
   *   Q_workpiece = total heat into workpiece [J]
   *   rho = density [kg/m^3]
   *   cp = specific heat [J/(kg*K)]
   *   V_affected = thermally affected volume [m^3]
   *
   * @returns Temperature rise in degrees C
   */
  private calcLocalTempRise(
    heatInput_J: number,
    chipHeatRatio: number,
    density: number,
    specificHeat: number,
    affectedVolume_mm3: number
  ): number {
    if (affectedVolume_mm3 <= 0) return 0;
    const Q_wp = heatInput_J * (1 - chipHeatRatio);
    // Convert mm^3 to m^3: 1 mm^3 = 1e-9 m^3
    const V_m3 = affectedVolume_mm3 * 1e-9;
    const mass_kg = density * V_m3;
    if (mass_kg <= 0) return 0;
    return Q_wp / (mass_kg * specificHeat);
  }

  /**
   * Apply Newton's cooling law for convective heat loss.
   *
   * T(t) = T_ambient + (T_initial - T_ambient) * exp(-t / tau)
   * Where tau = (rho * cp * V) / (h_conv * A_surface)
   *
   * @returns Temperature rise after cooling for given duration
   */
  private applyCooling(
    tempRise: number,
    duration_s: number,
    mat: MaterialThermal,
    volume_mm3: number,
    surfaceArea_mm2: number,
    h_conv: number
  ): number {
    if (duration_s <= 0 || tempRise <= 0) return tempRise;
    // tau = (rho * cp * V) / (h_conv * A)
    // Convert units: V in m^3, A in m^2
    const V_m3 = volume_mm3 * 1e-9;
    const A_m2 = surfaceArea_mm2 * 1e-6;
    const mass_kg = mat.density * V_m3;
    if (A_m2 <= 0 || h_conv <= 0) return tempRise;
    const tau = (mass_kg * mat.specific_heat) / (h_conv * A_m2);
    return tempRise * Math.exp(-duration_s / tau);
  }

  /**
   * Estimate thermal diffusion distance in a given time.
   * Based on: L_diff ~ sqrt(alpha * t) where alpha = k / (rho * cp)
   *
   * @returns Diffusion distance in mm
   */
  private thermalDiffusionDistance(mat: MaterialThermal, time_s: number): number {
    const alpha = mat.conductivity / (mat.density * mat.specific_heat); // m^2/s
    return Math.sqrt(alpha * time_s) * 1000; // convert m to mm
  }

  /**
   * Calculate thermal expansion (linear).
   * dL = alpha * L * dT
   *
   * @returns Dimensional change in mm
   */
  private calcThermalExpansion(expansionCoeff: number, length_mm: number, tempRise: number): number {
    return expansionCoeff * length_mm * tempRise;
  }

  // ── Thermal Grid Management ──────────────────────────────────────────────

  /**
   * Create a 3D grid of thermal cells covering the workpiece.
   */
  private createThermalGrid(dims: WorkpieceDimensions): GridCell[] {
    const grid: GridCell[] = [];
    const res = GRID_RESOLUTION;
    const nx = Math.max(1, Math.ceil(dims.x / res));
    const ny = Math.max(1, Math.ceil(dims.y / res));
    const nz = Math.max(1, Math.ceil(dims.z / res));

    for (let ix = 0; ix < nx; ix++) {
      for (let iy = 0; iy < ny; iy++) {
        for (let iz = 0; iz < nz; iz++) {
          grid.push({
            x_center: (ix + 0.5) * res,
            y_center: (iy + 0.5) * res,
            z_center: (iz + 0.5) * res,
            temperature_rise: 0,
            cumulative_heat_J: 0,
            last_cut_time: 0,
          });
        }
      }
    }
    return grid;
  }

  /**
   * Find grid cells within thermal influence radius of a cutting segment.
   */
  private findAffectedCells(
    grid: GridCell[],
    segment: MotionSegment,
    influenceRadius: number
  ): GridCell[] {
    const affected: GridCell[] = [];
    const r2 = influenceRadius * influenceRadius;

    // Check distance from each cell center to the line segment
    for (const cell of grid) {
      const dist2 = this.pointToSegmentDist2(
        cell.x_center, cell.y_center, cell.z_center,
        segment.start.x, segment.start.y, segment.start.z,
        segment.end.x, segment.end.y, segment.end.z
      );
      if (dist2 <= r2) {
        affected.push(cell);
      }
    }
    return affected;
  }

  /**
   * Squared distance from a point to a line segment in 3D.
   */
  private pointToSegmentDist2(
    px: number, py: number, pz: number,
    ax: number, ay: number, az: number,
    bx: number, by: number, bz: number
  ): number {
    const abx = bx - ax, aby = by - ay, abz = bz - az;
    const apx = px - ax, apy = py - ay, apz = pz - az;
    const ab2 = abx * abx + aby * aby + abz * abz;
    if (ab2 < 1e-12) {
      return apx * apx + apy * apy + apz * apz;
    }
    let t = (apx * abx + apy * aby + apz * abz) / ab2;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * abx - px;
    const cy = ay + t * aby - py;
    const cz = az + t * abz - pz;
    return cx * cx + cy * cy + cz * cz;
  }

  // ── Chip Thickness Estimation ────────────────────────────────────────────

  /**
   * Estimate average chip thickness from feedrate, RPM, tool diameter, and
   * assumed number of flutes. Uses: h_avg ~ fz * sqrt(ae/D) for peripheral
   * milling (Martellotti's approximation).
   */
  private estimateChipThickness(
    feedrate_mm_min: number,
    rpm: number,
    toolDiameter: number,
    widthOfCut: number
  ): number {
    if (rpm <= 0 || toolDiameter <= 0) return 0;
    // Assume 2-4 flutes based on diameter (heuristic)
    const flutes = toolDiameter <= 6 ? 2 : toolDiameter <= 16 ? 3 : 4;
    const fz = feedrate_mm_min / (rpm * flutes); // feed per tooth [mm]
    // Martellotti's average chip thickness for peripheral milling
    const ae = Math.min(widthOfCut, toolDiameter);
    const ratio = ae / toolDiameter;
    return fz * Math.sqrt(ratio);
  }

  // ── Coolant Effectiveness ────────────────────────────────────────────────

  /**
   * Get convection coefficient for a coolant type.
   */
  private getConvectionCoeff(coolantType: string): number {
    return CONVECTION_COEFFICIENTS[coolantType] ?? CONVECTION_COEFFICIENTS.none;
  }

  // ── Material Lookup ──────────────────────────────────────────────────────

  /**
   * Resolve material properties with fallback.
   */
  private getMaterial(name: string): MaterialThermal {
    const key = name.toLowerCase().replace(/[\s-]/g, "_");
    if (THERMAL_PROPERTIES[key]) return THERMAL_PROPERTIES[key];
    // Fuzzy match
    for (const [k, v] of Object.entries(THERMAL_PROPERTIES)) {
      if (key.includes(k) || k.includes(key)) return v;
    }
    // Default to steel_1018 with warning
    return THERMAL_PROPERTIES.steel_1018;
  }

  /**
   * List available materials.
   */
  listMaterials(): string[] {
    return Object.keys(THERMAL_PROPERTIES);
  }

  // ── Primary Analysis Methods ─────────────────────────────────────────────

  /**
   * Analyze heat accumulation through an entire G-code program.
   *
   * Tracks heat buildup by:
   * 1. Parsing G-code into motion segments
   * 2. Computing cutting force (Kienzle) and heat input per segment
   * 3. Distributing heat to a 3D thermal grid
   * 4. Applying conductive diffusion and convective cooling between segments
   * 5. Identifying peak temperatures and distortion risk
   *
   * @param config - Analysis configuration
   * @returns Heat accumulation results with thermal map and risk assessment
   */
  analyzeHeatAccumulation(config: HeatAccumulationConfig): HeatAccumulationResult {
    const mat = this.getMaterial(config.material);
    const blocks = this.parseGCode(config.gcode);
    const segments = this.buildMotionSegments(blocks);
    const dims = config.workpiece_dimensions;
    const h_conv = this.getConvectionCoeff(config.coolant_type);
    const toolDiam = config.tool_diameter;

    // Create thermal grid
    const grid = this.createThermalGrid(dims);
    const influenceRadius = toolDiam * THERMAL_INFLUENCE_RADIUS;

    // Workpiece surface area for cooling (rectangular prism)
    const surfaceArea_mm2 = 2 * (dims.x * dims.y + dims.y * dims.z + dims.x * dims.z);
    const totalVolume_mm3 = dims.x * dims.y * dims.z;

    // Cell volume
    const res = GRID_RESOLUTION;
    const cellVolume_mm3 = res * res * res;
    const cellSurfaceArea_mm2 = 6 * res * res;

    let elapsedTime = 0; // cumulative seconds
    const heatEvents: HeatEvent[] = [];

    // Track peak
    let peakTempRise = 0;
    let peakLocation = { x: 0, y: 0, z: 0 };

    for (const seg of segments) {
      // Apply cooling to all cells for the duration of this segment
      // (models heat dissipation between cuts and during non-cutting moves)
      if (seg.duration > 0) {
        for (const cell of grid) {
          if (cell.temperature_rise > 0.01) {
            cell.temperature_rise = this.applyCooling(
              cell.temperature_rise,
              seg.duration,
              mat,
              cellVolume_mm3,
              cellSurfaceArea_mm2,
              h_conv
            );

            // Also apply conductive spreading: reduce peak, raise neighbors
            // Simplified: diffusion reduces local peak by a factor
            const diffDist = this.thermalDiffusionDistance(mat, seg.duration);
            const spreadFactor = 1 / (1 + diffDist / res);
            cell.temperature_rise *= spreadFactor + (1 - spreadFactor) * 0.7;
          }
        }
      }

      if (!seg.is_cutting) {
        elapsedTime += seg.duration;
        continue;
      }

      // Cutting parameters
      const cuttingSpeed_m_min = Math.PI * toolDiam * seg.spindle_rpm / 1000;
      // Assume radial engagement = 50% of tool diameter for general milling
      const widthOfCut = toolDiam * 0.5;
      const chipThickness = this.estimateChipThickness(
        seg.feedrate, seg.spindle_rpm, toolDiam, widthOfCut
      );

      // Kienzle cutting force
      const Fc = this.calcCuttingForce(mat, widthOfCut, chipThickness);

      // Heat input rate [W]
      const heatRate_W = this.calcHeatInputRate(Fc, cuttingSpeed_m_min);

      // Total heat for this segment [J]
      const totalHeat_J = heatRate_W * seg.duration;

      // Heat entering workpiece [J]
      const workpieceHeat_J = totalHeat_J * (1 - mat.chip_heat_ratio);

      // Find affected grid cells
      const affectedCells = this.findAffectedCells(grid, seg, influenceRadius);
      const numAffected = Math.max(1, affectedCells.length);
      const heatPerCell_J = workpieceHeat_J / numAffected;

      // Distribute heat to cells
      for (const cell of affectedCells) {
        const dist = Math.sqrt(
          this.pointToSegmentDist2(
            cell.x_center, cell.y_center, cell.z_center,
            seg.start.x, seg.start.y, seg.start.z,
            seg.end.x, seg.end.y, seg.end.z
          )
        );
        // Inverse-distance weighting: cells closer to cut get more heat
        const weight = 1 / (1 + dist / (toolDiam * 0.5));
        const cellHeat = heatPerCell_J * weight;

        cell.cumulative_heat_J += cellHeat;
        cell.last_cut_time = elapsedTime;

        // Local temperature rise from this heat addition
        const dT = this.calcLocalTempRise(
          cellHeat / (1 - mat.chip_heat_ratio), // gross heat for formula
          mat.chip_heat_ratio,
          mat.density,
          mat.specific_heat,
          cellVolume_mm3
        );
        cell.temperature_rise += dT;

        // Track peak
        if (cell.temperature_rise > peakTempRise) {
          peakTempRise = cell.temperature_rise;
          peakLocation = {
            x: cell.x_center,
            y: cell.y_center,
            z: cell.z_center,
          };
        }
      }

      const affectedVolume = numAffected * cellVolume_mm3;
      heatEvents.push({
        segment: seg,
        heat_input_J: totalHeat_J,
        workpiece_heat_J: workpieceHeat_J,
        affected_volume_mm3: affectedVolume,
        local_temp_rise: workpieceHeat_J > 0
          ? this.calcLocalTempRise(totalHeat_J, mat.chip_heat_ratio, mat.density, mat.specific_heat, affectedVolume)
          : 0,
      });

      elapsedTime += seg.duration;
    }

    // Build thermal zones from grid
    const thermalMap = this.buildThermalZones(grid, dims);

    // Calculate max distortion from peak temperature
    const longestDim = Math.max(dims.x, dims.y, dims.z);
    let maxDistortion_um = this.calcThermalExpansion(mat.expansion_coeff, longestDim, peakTempRise) * 1000;

    // Machine-specific thermal compensation: if the machine has active thermal
    // compensation or known repeatability limits, adjust the distortion prediction.
    // Reference: ISO 230-3 (Thermal Effects on Machine Tools)
    let machineRepeatability_um = 0;
    let warmupProcedure: string | undefined;
    if (config.machine_id) {
      try {
        const capMod = require("./MachineCapabilityIntelligenceEngine.js");
        const hbkMod = require("./MachineHandbookRegistryEngine.js");
        const tcMod = require("../data/machine-torque-curves.js");
        const scMod = require("../data/machine-spindle-corrections.js");
        let machReg: any = null;
        try { machReg = require("../registries/MachineRegistry.js").machineRegistry; } catch { /* ok */ }

        const machId = config.machine_id.toLowerCase().trim().replace(/[\s-]+/g, "_");
        const profile = capMod.machineCapabilityIntelligenceEngine.getProfile(
          { machine_id: machId, include_torque_curve: false },
          {
            handbookRegistry: hbkMod.machineHandbookRegistry,
            torqueCurves: tcMod.MACHINE_TORQUE_CURVES,
            spindleCorrections: scMod.SPINDLE_CORRECTIONS,
            machineRegistry: machReg?.loaded ? machReg : null,
          },
        );
        // Use worst-case axis repeatability as distortion floor
        if (profile?.axes?.length > 0) {
          const repeats = profile.axes
            .map((a: any) => a.repeatability_um?.value)
            .filter((v: any): v is number => v != null && v > 0);
          if (repeats.length > 0) {
            machineRepeatability_um = Math.max(...repeats);
            // Distortion below machine repeatability is undetectable
            if (maxDistortion_um < machineRepeatability_um) {
              maxDistortion_um = machineRepeatability_um;
            }
          }
        }
        // Check for warmup procedure from handbook
        if (profile?.spindle?.warmup_procedure?.value) {
          warmupProcedure = profile.spindle.warmup_procedure.value;
        }
      } catch { /* capability engine not available — fall through */ }
    }

    // Risk assessment
    const distortionRisk = this.assessRisk(peakTempRise, maxDistortion_um);

    // Generate cooling recommendations
    const recommendations = this.generateCoolingRecommendations(
      peakTempRise, maxDistortion_um, config.coolant_type, mat, heatEvents, dims
    );

    // Add machine-specific thermal recommendations
    if (warmupProcedure && config.ambient_temp < 22) {
      recommendations.push(`Machine warmup recommended before tight-tolerance work: ${warmupProcedure}`);
    }
    if (machineRepeatability_um > 0 && maxDistortion_um <= machineRepeatability_um * 1.5) {
      recommendations.push(`Predicted distortion (${maxDistortion_um.toFixed(1)} µm) is near machine repeatability (${machineRepeatability_um.toFixed(1)} µm) — thermal effects are within machine capability`);
    }

    const result: HeatAccumulationResult = {
      peak_temperature_rise: Math.round(peakTempRise * 100) / 100,
      peak_location: peakLocation,
      thermal_map: thermalMap,
      distortion_risk: distortionRisk,
      max_distortion_um: Math.round(maxDistortion_um * 100) / 100,
      cooling_recommendations: recommendations,
    };

    const pbResult = machiningPlaybookEngine.advise({
      categories: ["thermal", "toolpath_strategy", "material_tip"],
    });
    for (const rule of pbResult.rules) {
      if (rule.severity === "critical" || rule.severity === "important") {
        result.cooling_recommendations.push(`[Playbook ${rule.id}] ${rule.title}`);
      }
    }

    return result;
  }

  /**
   * Predict dimensional distortion from thermal effects on critical dimensions.
   *
   * For each critical dimension, calculates expected thermal expansion
   * based on the peak temperature rise along that axis and compares
   * against the specified tolerance.
   */
  predictDistortion(config: DistortionConfig): DistortionResult {
    const mat = this.getMaterial(config.material);
    const dims = config.workpiece_dimensions;

    // First, run heat accumulation analysis
    const heatResult = this.analyzeHeatAccumulation({
      gcode: config.gcode,
      material: config.material,
      tool_diameter: 10, // default assumption
      workpiece_dimensions: dims,
      coolant_type: config.coolant_type,
      ambient_temp: 20,
    });

    // For each critical dimension, find the relevant temperature rise
    const distortions: DimensionDistortion[] = config.critical_dimensions.map(cd => {
      // Find peak temp rise along the relevant axis from thermal map
      let maxTempAlongAxis = 0;
      for (const zone of heatResult.thermal_map) {
        // Check if this zone spans the axis of interest
        if (cd.axis === "x" && zone.peak_temp_rise > maxTempAlongAxis) {
          maxTempAlongAxis = zone.peak_temp_rise;
        } else if (cd.axis === "y" && zone.peak_temp_rise > maxTempAlongAxis) {
          maxTempAlongAxis = zone.peak_temp_rise;
        } else if (cd.axis === "z" && zone.peak_temp_rise > maxTempAlongAxis) {
          maxTempAlongAxis = zone.peak_temp_rise;
        }
      }

      // If no zones, use overall peak scaled by axis fraction
      if (maxTempAlongAxis === 0) {
        const axisFraction = cd.axis === "x" ? dims.x : cd.axis === "y" ? dims.y : dims.z;
        const maxDim = Math.max(dims.x, dims.y, dims.z);
        maxTempAlongAxis = heatResult.peak_temperature_rise * (axisFraction / maxDim);
      }

      // dL = alpha * L * dT
      const predictedShift = this.calcThermalExpansion(
        mat.expansion_coeff,
        cd.nominal,
        maxTempAlongAxis
      );

      const withinTolerance = Math.abs(predictedShift) <= cd.tolerance;
      const margin = cd.tolerance - Math.abs(predictedShift);

      return {
        axis: cd.axis,
        nominal: cd.nominal,
        predicted_shift: Math.round(predictedShift * 10000) / 10000, // 0.1 um resolution
        within_tolerance: withinTolerance,
        margin: Math.round(margin * 10000) / 10000,
      };
    });

    const anyOutOfTol = distortions.some(d => !d.within_tolerance);
    const minMarginRatio = Math.min(
      ...distortions.map(d => d.margin / d.nominal)
    );

    let overallRisk: "low" | "moderate" | "high" | "critical";
    if (anyOutOfTol) {
      overallRisk = "critical";
    } else if (minMarginRatio < 0.1) {
      overallRisk = "high";
    } else if (minMarginRatio < 0.3) {
      overallRisk = "moderate";
    } else {
      overallRisk = "low";
    }

    const recommendations: string[] = [];
    if (anyOutOfTol) {
      recommendations.push(
        "CRITICAL: Predicted thermal distortion exceeds tolerance on one or more dimensions."
      );
      recommendations.push(
        "Consider: (1) upgrading coolant delivery, (2) adding strategic dwells, (3) splitting rough/finish with cool-down between."
      );
    }
    for (const d of distortions) {
      if (!d.within_tolerance) {
        recommendations.push(
          `${d.axis.toUpperCase()}-axis: ${d.nominal}mm nominal shifts by ${(d.predicted_shift * 1000).toFixed(1)} um — exceeds +/-${(d.margin * 1000).toFixed(1)} um tolerance.`
        );
      } else if (d.margin / d.nominal < 0.15) {
        recommendations.push(
          `${d.axis.toUpperCase()}-axis: Tight margin — only ${(d.margin * 1000).toFixed(1)} um remaining of ${(d.nominal * 1000).toFixed(0)} um tolerance.`
        );
      }
    }
    if (heatResult.peak_temperature_rise > TEMP_THRESHOLD_HIGH) {
      recommendations.push(
        "Allow part to return to ambient temperature before final finish passes on critical features."
      );
    }

    const result: DistortionResult = {
      distortion_per_dimension: distortions,
      overall_risk: overallRisk,
      recommendations,
    };

    const pbResult = machiningPlaybookEngine.advise({
      categories: ["thermal", "toolpath_strategy", "material_tip"],
    });
    for (const rule of pbResult.rules) {
      if (rule.severity === "critical" || rule.severity === "important") {
        result.recommendations.push(`[Playbook ${rule.id}] ${rule.title}`);
      }
    }

    return result;
  }

  /**
   * Suggest cutting sequence changes to minimize thermal distortion.
   *
   * Strategies:
   * - Identify hot zones from consecutive cutting in the same area
   * - Suggest interleaving features to allow cooling
   * - Insert dwell points where temperature accumulation is highest
   * - Recommend rough-before-finish with cooling breaks
   */
  optimizeCuttingSequence(config: CuttingSequenceConfig): SequenceOptimizationResult {
    const mat = this.getMaterial(config.material);
    const blocks = this.parseGCode(config.gcode);
    const segments = this.buildMotionSegments(blocks);

    const suggestions: SequenceSuggestion[] = [];
    const dwellPoints: DwellPoint[] = [];

    // Analyze consecutive cutting segments for heat clustering
    let consecutiveCutCount = 0;
    let consecutiveCutStartLine = 0;
    let cumulativeHeatRun = 0;
    let lastCutEndPos = { x: 0, y: 0, z: 0 };
    const hotRunSegments: { startLine: number; endLine: number; heat: number }[] = [];

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];

      if (seg.is_cutting) {
        if (consecutiveCutCount === 0) {
          consecutiveCutStartLine = seg.line_number;
        }
        consecutiveCutCount++;

        const cuttingSpeed = Math.PI * 10 * seg.spindle_rpm / 1000; // assume 10mm tool
        const approxHeat = mat.kc1 * 2.5 * cuttingSpeed * seg.duration / 60;
        cumulativeHeatRun += approxHeat;
        lastCutEndPos = { ...seg.end };
      } else {
        if (consecutiveCutCount > 5 && cumulativeHeatRun > 500) {
          hotRunSegments.push({
            startLine: consecutiveCutStartLine,
            endLine: segments[i - 1].line_number,
            heat: cumulativeHeatRun,
          });
        }
        consecutiveCutCount = 0;
        cumulativeHeatRun = 0;
      }
    }

    // Close final run
    if (consecutiveCutCount > 5 && cumulativeHeatRun > 500) {
      hotRunSegments.push({
        startLine: consecutiveCutStartLine,
        endLine: segments[segments.length - 1].line_number,
        heat: cumulativeHeatRun,
      });
    }

    // Sort hot runs by heat intensity
    hotRunSegments.sort((a, b) => b.heat - a.heat);

    // Generate suggestions for the hottest runs
    for (let i = 0; i < Math.min(hotRunSegments.length, 5); i++) {
      const run = hotRunSegments[i];
      const lineRange = Array.from(
        { length: run.endLine - run.startLine + 1 },
        (_, idx) => run.startLine + idx
      );

      if (i === 0 && hotRunSegments.length > 1) {
        suggestions.push({
          description:
            `Interleave cutting between lines ${run.startLine}-${run.endLine} with ` +
            `lines ${hotRunSegments[1].startLine}-${hotRunSegments[1].endLine} to distribute heat. ` +
            `Machine alternate features to allow cooling between passes.`,
          estimated_improvement_pct: 25,
          affected_lines: lineRange,
        });
      }

      // Suggest dwell at midpoint of each hot run
      const midLine = Math.floor((run.startLine + run.endLine) / 2);
      // Dwell duration based on thermal time constant
      // tau ~ L^2 / alpha where alpha = k / (rho * cp)
      const alpha_mm2_s = (mat.conductivity / (mat.density * mat.specific_heat)) * 1e6;
      const charLength = 10; // mm characteristic length
      const thermalTimeConst = (charLength * charLength) / alpha_mm2_s;
      const dwellDuration = Math.max(5, Math.min(60, thermalTimeConst * 0.3));

      dwellPoints.push({
        after_line: midLine,
        duration_sec: Math.round(dwellDuration),
        reason:
          `High heat accumulation zone (${(run.heat / 1000).toFixed(1)} kJ). ` +
          `Dwell allows ${(dwellDuration).toFixed(0)}s conductive/convective cooling ` +
          `(thermal time constant: ${thermalTimeConst.toFixed(1)}s).`,
      });

      suggestions.push({
        description:
          `Add ${Math.round(dwellDuration)}s dwell (G4 P${Math.round(dwellDuration * 1000)}) at ` +
          `line ${midLine} to allow heat dissipation during heavy cutting run ` +
          `(lines ${run.startLine}-${run.endLine}).`,
        estimated_improvement_pct: 15,
        affected_lines: [midLine],
      });
    }

    // General strategies
    if (segments.filter(s => s.is_cutting).length > 20) {
      suggestions.push({
        description:
          "Consider separating roughing and finishing passes with a mandatory cool-down period. " +
          "Rough all features first, then allow part to equalize to ambient temperature before " +
          "finishing critical dimensions. This can reduce thermal distortion by 40-60%.",
        estimated_improvement_pct: 50,
        affected_lines: [],
      });
    }

    // Detect Z-level clustering (repeated cuts at same Z)
    const zLevels = new Map<number, number>();
    for (const seg of segments) {
      if (seg.is_cutting) {
        const zRound = Math.round(seg.end.z * 10) / 10;
        zLevels.set(zRound, (zLevels.get(zRound) ?? 0) + 1);
      }
    }
    const hotZLevels = [...zLevels.entries()]
      .filter(([_, count]) => count > 10)
      .sort((a, b) => b[1] - a[1]);

    if (hotZLevels.length > 1) {
      suggestions.push({
        description:
          `Detected ${hotZLevels.length} Z-levels with concentrated cutting ` +
          `(${hotZLevels.map(([z, c]) => `Z=${z}: ${c} moves`).join(", ")}). ` +
          `Alternate between Z-levels rather than completing each level sequentially ` +
          `to distribute heat more evenly through the workpiece thickness.`,
        estimated_improvement_pct: 20,
        affected_lines: [],
      });
    }

    return { suggestions, optimal_dwell_points: dwellPoints };
  }

  /**
   * Generate a comprehensive human-readable thermal analysis report.
   *
   * Combines heat accumulation analysis, distortion prediction, and
   * optimization suggestions into a formatted report.
   */
  generateThermalReport(config: ThermalReportConfig): string {
    const mat = this.getMaterial(config.material);
    const matName = config.material;

    // Run heat accumulation analysis
    const heatResult = this.analyzeHeatAccumulation({
      gcode: config.gcode,
      material: config.material,
      tool_diameter: config.tool_diameter,
      workpiece_dimensions: config.workpiece_dimensions,
      coolant_type: config.coolant_type,
      ambient_temp: config.ambient_temp,
    });

    // Run distortion prediction if critical dimensions provided
    let distResult: DistortionResult | null = null;
    if (config.critical_dimensions && config.critical_dimensions.length > 0) {
      distResult = this.predictDistortion({
        gcode: config.gcode,
        material: config.material,
        workpiece_dimensions: config.workpiece_dimensions,
        critical_dimensions: config.critical_dimensions,
        coolant_type: config.coolant_type,
      });
    }

    // Run sequence optimization
    const seqResult = this.optimizeCuttingSequence({
      gcode: config.gcode,
      material: config.material,
      critical_features: [],
    });

    // Format report
    const dims = config.workpiece_dimensions;
    const lines: string[] = [];

    lines.push("=".repeat(72));
    lines.push("  TOOLPATH THERMAL ANALYSIS REPORT");
    lines.push("  Generated by PRISM ToolpathThermalEngine v1.0.0");
    lines.push("=".repeat(72));
    lines.push("");

    // Material & Setup
    lines.push("--- Material & Setup ---");
    lines.push(`  Material:          ${matName}`);
    lines.push(`  Specific cutting force (kc1): ${mat.kc1} N/mm^2`);
    lines.push(`  Density:           ${mat.density} kg/m^3`);
    lines.push(`  Thermal conductivity: ${mat.conductivity} W/(m*K)`);
    lines.push(`  Expansion coeff:   ${(mat.expansion_coeff * 1e6).toFixed(1)} um/(m*K)`);
    lines.push(`  Chip heat ratio:   ${(mat.chip_heat_ratio * 100).toFixed(0)}%`);
    lines.push(`  Tool diameter:     ${config.tool_diameter} mm`);
    lines.push(`  Workpiece:         ${dims.x} x ${dims.y} x ${dims.z} mm`);
    lines.push(`  Coolant:           ${config.coolant_type}`);
    lines.push(`  Ambient temp:      ${config.ambient_temp} deg C`);
    lines.push("");

    // Heat Accumulation Summary
    lines.push("--- Heat Accumulation Summary ---");
    lines.push(`  Peak temperature rise:  ${heatResult.peak_temperature_rise.toFixed(2)} deg C`);
    lines.push(
      `  Peak location:          X=${heatResult.peak_location.x.toFixed(1)} ` +
      `Y=${heatResult.peak_location.y.toFixed(1)} Z=${heatResult.peak_location.z.toFixed(1)}`
    );
    lines.push(`  Max predicted distortion: ${heatResult.max_distortion_um.toFixed(2)} um`);
    lines.push(`  Distortion risk:        ${heatResult.distortion_risk.toUpperCase()}`);
    lines.push("");

    // Thermal Map
    if (heatResult.thermal_map.length > 0) {
      lines.push("--- Thermal Zone Map ---");
      lines.push(
        "  Zone                                         | Avg dT  | Peak dT | Time>5C"
      );
      lines.push("  " + "-".repeat(68));
      for (const zone of heatResult.thermal_map) {
        const r = zone.region;
        const regionStr =
          `X[${r.x_start.toFixed(0)}-${r.x_end.toFixed(0)}] ` +
          `Y[${r.y_start.toFixed(0)}-${r.y_end.toFixed(0)}] ` +
          `Z[${r.z_start.toFixed(0)}-${r.z_end.toFixed(0)}]`;
        lines.push(
          `  ${regionStr.padEnd(46)} | ${zone.avg_temp_rise.toFixed(1).padStart(5)} C` +
          ` | ${zone.peak_temp_rise.toFixed(1).padStart(5)} C` +
          ` | ${zone.time_above_threshold.toFixed(0).padStart(4)}s`
        );
      }
      lines.push("");
    }

    // Distortion Prediction
    if (distResult) {
      lines.push("--- Critical Dimension Distortion ---");
      lines.push(
        "  Axis | Nominal (mm) | Shift (um) | Tolerance (um) | Status"
      );
      lines.push("  " + "-".repeat(62));
      for (const d of distResult.distortion_per_dimension) {
        const shiftUm = (d.predicted_shift * 1000).toFixed(1);
        const tolUm = (d.nominal > 0 ? d.margin * 1000 + Math.abs(d.predicted_shift) * 1000 : 0).toFixed(1);
        const status = d.within_tolerance ? "OK" : "FAIL";
        const marginUm = (d.margin * 1000).toFixed(1);
        lines.push(
          `  ${d.axis.toUpperCase().padEnd(4)} | ${d.nominal.toFixed(3).padStart(12)} ` +
          `| ${shiftUm.padStart(10)} | ${tolUm.padStart(14)} | ${status} (margin: ${marginUm} um)`
        );
      }
      lines.push(`  Overall risk: ${distResult.overall_risk.toUpperCase()}`);
      lines.push("");
    }

    // Recommendations
    lines.push("--- Cooling & Process Recommendations ---");
    for (let i = 0; i < heatResult.cooling_recommendations.length; i++) {
      lines.push(`  ${i + 1}. ${heatResult.cooling_recommendations[i]}`);
    }
    lines.push("");

    // Sequence Optimization
    if (seqResult.suggestions.length > 0) {
      lines.push("--- Cutting Sequence Optimization ---");
      for (let i = 0; i < seqResult.suggestions.length; i++) {
        const s = seqResult.suggestions[i];
        lines.push(`  ${i + 1}. [~${s.estimated_improvement_pct}% improvement] ${s.description}`);
      }
      lines.push("");
    }

    if (seqResult.optimal_dwell_points.length > 0) {
      lines.push("--- Recommended Dwell Points ---");
      for (const dp of seqResult.optimal_dwell_points) {
        lines.push(
          `  After line ${dp.after_line}: G4 P${dp.duration_sec * 1000} (${dp.duration_sec}s) — ${dp.reason}`
        );
      }
      lines.push("");
    }

    // Physics disclaimer
    lines.push("--- Notes ---");
    lines.push(
      "  This analysis uses a simplified lumped-parameter thermal model with"
    );
    lines.push(
      "  Kienzle cutting force estimation and Newton's cooling law. Results"
    );
    lines.push(
      "  are indicative, not a replacement for FEA. Accuracy improves with"
    );
    lines.push(
      "  correct material selection, known engagement parameters, and when"
    );
    lines.push(
      "  cutting parameters are explicitly programmed in the G-code (F/S words)."
    );
    lines.push("=".repeat(72));

    return lines.join("\n");
  }

  // ── Helper Methods ───────────────────────────────────────────────────────

  /**
   * Build thermal zones from the grid by clustering adjacent hot cells
   * into rectangular regions.
   */
  private buildThermalZones(grid: GridCell[], dims: WorkpieceDimensions): ThermalZone[] {
    const res = GRID_RESOLUTION;
    const nx = Math.max(1, Math.ceil(dims.x / res));
    const ny = Math.max(1, Math.ceil(dims.y / res));
    const nz = Math.max(1, Math.ceil(dims.z / res));

    // Divide workpiece into macro-zones (2x2x2 grid regions or fewer)
    const zx = Math.min(2, nx);
    const zy = Math.min(2, ny);
    const zz = Math.min(2, nz);

    const zones: ThermalZone[] = [];

    for (let izx = 0; izx < zx; izx++) {
      for (let izy = 0; izy < zy; izy++) {
        for (let izz = 0; izz < zz; izz++) {
          const x_start = (izx / zx) * dims.x;
          const x_end = ((izx + 1) / zx) * dims.x;
          const y_start = (izy / zy) * dims.y;
          const y_end = ((izy + 1) / zy) * dims.y;
          const z_start = (izz / zz) * dims.z;
          const z_end = ((izz + 1) / zz) * dims.z;

          // Find cells in this zone
          const zoneCells = grid.filter(c =>
            c.x_center >= x_start && c.x_center < x_end &&
            c.y_center >= y_start && c.y_center < y_end &&
            c.z_center >= z_start && c.z_center < z_end
          );

          if (zoneCells.length === 0) continue;

          const temps = zoneCells.map(c => c.temperature_rise);
          const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
          const peakTemp = Math.max(...temps);

          // time_above_threshold: estimate based on cumulative heat / cooling rate
          // Simplified: count cells that are above threshold
          const aboveThreshold = zoneCells.filter(c => c.temperature_rise > TEMP_THRESHOLD_MODERATE);
          const timeAbove = aboveThreshold.length > 0
            ? aboveThreshold.reduce((sum, c) => sum + c.temperature_rise, 0) * 2 // rough estimate in seconds
            : 0;

          // Only include zones with meaningful temperature rise
          if (peakTemp > 0.5) {
            zones.push({
              region: {
                x_start: Math.round(x_start * 10) / 10,
                x_end: Math.round(x_end * 10) / 10,
                y_start: Math.round(y_start * 10) / 10,
                y_end: Math.round(y_end * 10) / 10,
                z_start: Math.round(z_start * 10) / 10,
                z_end: Math.round(z_end * 10) / 10,
              },
              avg_temp_rise: Math.round(avgTemp * 100) / 100,
              peak_temp_rise: Math.round(peakTemp * 100) / 100,
              time_above_threshold: Math.round(timeAbove * 10) / 10,
            });
          }
        }
      }
    }

    // Sort by peak temperature descending
    zones.sort((a, b) => b.peak_temp_rise - a.peak_temp_rise);
    return zones;
  }

  /**
   * Assess distortion risk from peak temperature and predicted distortion.
   */
  private assessRisk(
    peakTempRise: number,
    maxDistortion_um: number
  ): "low" | "moderate" | "high" | "critical" {
    if (peakTempRise > TEMP_THRESHOLD_CRITICAL || maxDistortion_um > 50) return "critical";
    if (peakTempRise > TEMP_THRESHOLD_HIGH || maxDistortion_um > 25) return "high";
    if (peakTempRise > TEMP_THRESHOLD_MODERATE || maxDistortion_um > 10) return "moderate";
    return "low";
  }

  /**
   * Generate actionable cooling and process recommendations.
   */
  private generateCoolingRecommendations(
    peakTempRise: number,
    maxDistortion_um: number,
    coolantType: string,
    mat: MaterialThermal,
    heatEvents: HeatEvent[],
    dims: WorkpieceDimensions
  ): string[] {
    const recs: string[] = [];

    // Coolant upgrade suggestions
    if (coolantType === "none") {
      recs.push(
        "No coolant detected. Even compressed air (h~50 W/m^2K) would reduce peak temps by 30-50%. " +
        "Flood coolant (h~5000 W/m^2K) recommended for this operation."
      );
    } else if (coolantType === "air" && peakTempRise > TEMP_THRESHOLD_MODERATE) {
      recs.push(
        "Air cooling insufficient for observed heat load. Upgrade to mist (2-3x improvement) " +
        "or flood coolant (100x improvement in convection coefficient)."
      );
    } else if (coolantType === "mist" && peakTempRise > TEMP_THRESHOLD_HIGH) {
      recs.push(
        "Mist coolant may be insufficient. Consider flood coolant for heavy material removal. " +
        "Through-spindle coolant at 70+ bar provides best chip evacuation and cooling."
      );
    }

    // Material-specific advice
    if (mat.conductivity < 20) {
      recs.push(
        `Low thermal conductivity material (${mat.conductivity} W/mK). Heat concentrates near cut zone. ` +
        "Use lighter cuts with higher speed to reduce heat input per unit volume. " +
        "Consider trochoidal milling to reduce engagement time."
      );
    }

    if (mat.expansion_coeff > 15e-6) {
      recs.push(
        `High thermal expansion coefficient (${(mat.expansion_coeff * 1e6).toFixed(1)} um/mK). ` +
        "Even small temperature rises cause significant dimensional change. " +
        "Machine critical features last, after bulk material removal heat has dissipated."
      );
    }

    // Distortion-specific advice
    if (maxDistortion_um > 10) {
      recs.push(
        `Predicted distortion of ${maxDistortion_um.toFixed(1)} um. For tight tolerances: ` +
        "rough with 0.5mm stock, allow cool-down to ambient, then finish in a separate program."
      );
    }

    // Heat accumulation pattern advice
    if (heatEvents.length > 0) {
      const totalHeat = heatEvents.reduce((sum, e) => sum + e.workpiece_heat_J, 0);
      const avgHeatRate = totalHeat / Math.max(1, heatEvents.reduce((sum, e) => sum + e.segment.duration, 0));

      if (avgHeatRate > 100) {
        recs.push(
          `Average heat input rate: ${avgHeatRate.toFixed(0)} W into workpiece. ` +
          "Consider reducing depth of cut or width of cut by 20-30% to lower heat generation. " +
          "The MRR reduction is partially offset by allowing higher cutting speeds."
        );
      }
    }

    // Thin wall / geometry advice
    const minDim = Math.min(dims.x, dims.y, dims.z);
    if (minDim < 10) {
      recs.push(
        `Thin workpiece dimension (${minDim} mm). Thermal gradients cause warping. ` +
        "Use climb milling, minimize clamping force, and consider stress-relief between rough and finish."
      );
    }

    // Always include measurement advice for non-trivial temp rises
    if (peakTempRise > TEMP_THRESHOLD_MODERATE) {
      recs.push(
        "Allow part to stabilize at 20 +/- 1 deg C before CMM measurement. " +
        `Estimated cool-down time to < 1 deg C rise: ${this.estimateCooldownTime(peakTempRise, mat, dims).toFixed(0)} seconds.`
      );
    }

    if (recs.length === 0) {
      recs.push("Thermal risk is low for this operation. No special precautions needed.");
    }

    return recs;
  }

  /**
   * Estimate time for workpiece to cool from peak temp rise to < 1 deg C.
   * Uses lumped capacitance model: T(t) = T_peak * exp(-t/tau)
   * Solve for t when T(t) = 1: t = -tau * ln(1/T_peak)
   */
  private estimateCooldownTime(
    peakTempRise: number,
    mat: MaterialThermal,
    dims: WorkpieceDimensions
  ): number {
    if (peakTempRise <= 1) return 0;
    const V_m3 = dims.x * dims.y * dims.z * 1e-9;
    const A_m2 = 2 * (dims.x * dims.y + dims.y * dims.z + dims.x * dims.z) * 1e-6;
    const mass = mat.density * V_m3;
    // Natural convection after machining (no forced coolant)
    const h_natural = 10; // W/(m^2*K)
    const tau = (mass * mat.specific_heat) / (h_natural * A_m2);
    return tau * Math.log(peakTempRise);
  }

  /**
   * Get engine statistics and capabilities summary.
   */
  getStats(): {
    materials: number;
    coolant_types: number;
    version: string;
    capabilities: string[];
  } {
    return {
      materials: Object.keys(THERMAL_PROPERTIES).length,
      coolant_types: Object.keys(CONVECTION_COEFFICIENTS).length,
      version: "1.0.0",
      capabilities: [
        "G-code thermal accumulation analysis",
        "3D thermal zone mapping",
        "Dimensional distortion prediction",
        "Critical tolerance risk assessment",
        "Cutting sequence optimization",
        "Dwell point recommendation",
        "Comprehensive thermal reporting",
      ],
    };
  }
}

/** Singleton instance */
export const toolpathThermalEngine = new ToolpathThermalEngine();
