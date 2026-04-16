/**
 * DigitalTwinSyncEngine — Digital twin state synchronization for CNC machining.
 *
 * Maintains synchronized physics model states across four domains:
 * 1. Thermal — Jaeger moving heat source model for cutting zone temperature
 * 2. Wear — Flank wear (VB) and crater depth (KT) tracking with stage detection
 * 3. Surface Integrity — Residual stress accumulation from cutting/thermal loads
 * 4. Stock — Material removal volume and bounding box updates
 *
 * Designed to feed real-time state to novel toolpath algorithms (TGAR, PTDC,
 * RSMP, CFSF, etc.) via the queryForAlgorithm() method.
 *
 * Physics references:
 * - Jaeger (1942): Moving heat source, ΔT = (q·L)/(k·√(π·a·L/v))
 * - Taylor (1907): Tool life VB growth with Arrhenius acceleration
 * - Brammertz surface stress model for residual stress estimation
 */

// ============================================================================
// TYPES
// ============================================================================

/** Full digital twin state snapshot at a single time step. */
export interface DigitalTwinState {
  thermal: {
    cutting_zone_temp_C: number;
    workpiece_bulk_temp_C: number;
    thermal_gradient_C_per_mm: number;
    cumulative_heat_J: number;
  };
  wear: {
    vb_mm: number;
    kt_mm: number;
    wear_rate_mm_per_min: number;
    cutting_time_min: number;
    wear_stage: "initial" | "steady" | "accelerated";
  };
  surface: {
    residual_stress_mpa: number;
    stress_type: "compressive" | "tensile" | "neutral";
    surface_hardness_change_pct: number;
    white_layer_risk: boolean;
  };
  stock: {
    volume_remaining_mm3: number;
    volume_removed_mm3: number;
    removal_pct: number;
    bounding_box: {
      min_x: number; min_y: number; min_z: number;
      max_x: number; max_y: number; max_z: number;
    };
  };
  timestamp_ms: number;
  step_count: number;
}

/** Single machining update step with sensor/process data. */
export interface TwinUpdateStep {
  force_N?: number;
  temperature_C?: number;
  vibration_g?: number;
  feed_mmmin: number;
  rpm: number;
  depth_mm: number;
  width_mm: number;
  tool_diameter_mm: number;
  dt_sec?: number;
}

/** Input configuration for sync operation. */
export interface TwinSyncInput {
  initial_state?: Partial<DigitalTwinState>;
  updates: TwinUpdateStep[];
  material?: {
    conductivity_W_mK?: number;
    diffusivity_mm2_s?: number;
    density_kg_m3?: number;
    specific_heat_J_kgK?: number;
    hardness_HRC?: number;
  };
  stock_volume_mm3?: number;
  algorithm_context?: string;
}

/** Algorithm-specific query arrays for novel toolpath engines. */
export interface AlgorithmQueries {
  tgar_thermal_field: number[];
  ptdc_deflection_um: number[];
  rsmp_stress_mpa: number[];
}

/** Result of a full sync operation. */
export interface TwinSyncResult {
  states: DigitalTwinState[];
  final_state: DigitalTwinState;
  summary: {
    peak_temperature_C: number;
    final_wear_vb_mm: number;
    total_volume_removed_mm3: number;
    peak_residual_stress_mpa: number;
    white_layer_detected: boolean;
    algorithm_recommendations: string[];
  };
  algorithm_queries: AlgorithmQueries;
  warnings: string[];
  formula: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_MATERIAL = {
  conductivity_W_mK: 50,
  diffusivity_mm2_s: 14,
  density_kg_m3: 7850,
  specific_heat_J_kgK: 480,
  hardness_HRC: 30,
};

/** VB thresholds for wear stage classification. */
const VB_INITIAL_LIMIT = 0.05;
const VB_ACCELERATED_ONSET = 0.25;
const VB_CRITICAL = 0.30;

/** White layer risk threshold (°C). */
const WHITE_LAYER_TEMP_THRESHOLD = 700;

/** Ambient/cooldown reference temperature (°C). */
const AMBIENT_TEMP_C = 25;

/** Heat partition fraction going into workpiece. */
const HEAT_PARTITION_WORKPIECE = 0.3;

// ============================================================================
// ENGINE
// ============================================================================

/**
 * DigitalTwinSyncEngine synchronizes multi-physics state for CNC digital twins.
 *
 * Processes a sequence of machining update steps and maintains coupled thermal,
 * wear, surface integrity, and stock states. Provides algorithm-specific queries
 * for integration with novel toolpath engines (TGAR, PTDC, RSMP, CFSF, etc.).
 */
export class DigitalTwinSyncEngine {
  /**
   * Main synchronization method — processes all update steps and returns
   * the full state history plus summary analytics.
   * @param input - Sync configuration with updates, material, and stock data
   * @returns Full state history, summary, algorithm queries, and warnings
   */
  sync(input: TwinSyncInput): TwinSyncResult {
    const mat = { ...DEFAULT_MATERIAL, ...input.material };
    const states: DigitalTwinState[] = [];
    const warnings: string[] = [];
    const algoQueries: AlgorithmQueries = {
      tgar_thermal_field: [],
      ptdc_deflection_um: [],
      rsmp_stress_mpa: [],
    };

    let state = this.createInitialState(input);
    let peakTemp = AMBIENT_TEMP_C;
    let peakStress = 0;
    let whiteLayerDetected = false;

    for (let i = 0; i < input.updates.length; i++) {
      const update = input.updates[i];
      state = this.cloneState(state);
      state.step_count = i + 1;
      state.timestamp_ms = Date.now();

      this.updateThermal(state, update, mat);
      this.updateWear(state, update);
      this.updateSurface(state, update);
      this.updateStock(state, update);

      // Track peaks
      if (state.thermal.cutting_zone_temp_C > peakTemp) {
        peakTemp = state.thermal.cutting_zone_temp_C;
      }
      const absStress = Math.abs(state.surface.residual_stress_mpa);
      if (absStress > peakStress) {
        peakStress = absStress;
      }
      if (state.surface.white_layer_risk) {
        whiteLayerDetected = true;
      }

      // Build algorithm query data
      algoQueries.tgar_thermal_field.push(state.thermal.cutting_zone_temp_C);
      const algoData = this.queryForAlgorithm(state, input.algorithm_context ?? "");
      algoQueries.ptdc_deflection_um.push(algoData["deflection_um"] ?? 0);
      algoQueries.rsmp_stress_mpa.push(state.surface.residual_stress_mpa);

      // Generate warnings
      if (state.thermal.cutting_zone_temp_C > WHITE_LAYER_TEMP_THRESHOLD) {
        warnings.push(`Step ${i + 1}: Cutting zone temp ${state.thermal.cutting_zone_temp_C.toFixed(1)}°C exceeds white layer threshold`);
      }
      if (state.wear.vb_mm > VB_CRITICAL) {
        warnings.push(`Step ${i + 1}: VB wear ${state.wear.vb_mm.toFixed(3)}mm exceeds critical limit`);
      }
      if (state.stock.volume_remaining_mm3 < 0) {
        state.stock.volume_remaining_mm3 = 0;
        warnings.push(`Step ${i + 1}: Stock fully consumed`);
      }

      states.push(state);
    }

    const finalState = states.length > 0 ? states[states.length - 1] : state;
    const recommendations = this.generateRecommendations(finalState, peakTemp, whiteLayerDetected);

    return {
      states,
      final_state: finalState,
      summary: {
        peak_temperature_C: peakTemp,
        final_wear_vb_mm: finalState.wear.vb_mm,
        total_volume_removed_mm3: finalState.stock.volume_removed_mm3,
        peak_residual_stress_mpa: peakStress,
        white_layer_detected: whiteLayerDetected,
        algorithm_recommendations: recommendations,
      },
      algorithm_queries: algoQueries,
      warnings,
      formula: "Jaeger: ΔT = (q·L)/(k·√(π·a·L/v)); VB: dVB/dt = C·V^n·f^m·α(VB); Stress: σ = F/(A) - σ_thermal",
    };
  }

  /**
   * Update thermal state using Jaeger moving heat source model.
   * ΔT = (q * L) / (k * √(π * a * L / v))
   * @param state - Current twin state (mutated in place)
   * @param update - Machining step parameters
   * @param material - Material thermal properties
   */
  updateThermal(
    state: DigitalTwinState,
    update: TwinUpdateStep,
    material?: TwinSyncInput["material"]
  ): void {
    const mat = { ...DEFAULT_MATERIAL, ...material };
    const dt = update.dt_sec ?? 0.1;
    const v_m_s = (update.rpm * Math.PI * update.tool_diameter_mm / 1000) / 60;
    const v_mm_s = v_m_s * 1000;
    const contactLength = Math.min(update.depth_mm, update.tool_diameter_mm * 0.5);

    // Cutting power estimate: P = Fc * v (use provided force or estimate from Kienzle-like)
    const force = update.force_N ?? (update.depth_mm * update.width_mm * 2500 *
      (update.feed_mmmin / update.rpm / (update.tool_diameter_mm > 0 ? 2 : 1)) ** 0.75);
    const cuttingPower_W = force * v_m_s;

    // Heat flux into workpiece (W/mm²)
    const contactArea = contactLength * update.width_mm;
    const q = contactArea > 0
      ? (HEAT_PARTITION_WORKPIECE * cuttingPower_W) / contactArea
      : 0;

    // Jaeger moving heat source: ΔT = (q * L) / (k * √(π * a * L / v))
    const k = mat.conductivity_W_mK / 1000; // W/mm·K
    const a = mat.diffusivity_mm2_s;
    const denomArg = v_mm_s > 0 ? (Math.PI * a * contactLength / v_mm_s) : 1;
    const denom = k * Math.sqrt(Math.max(denomArg, 1e-9));
    const deltaT = denom > 0 ? (q * contactLength) / denom : 0;

    // Apply sensor override if provided
    const sensorTemp = update.temperature_C;
    const modelTemp = AMBIENT_TEMP_C + deltaT;
    const zoneTemp = sensorTemp !== undefined
      ? 0.7 * modelTemp + 0.3 * sensorTemp
      : modelTemp;

    state.thermal.cutting_zone_temp_C = zoneTemp;

    // Bulk workpiece temperature — slow rise with time constant
    const bulkRise = (zoneTemp - state.thermal.workpiece_bulk_temp_C) * 0.02 * dt;
    state.thermal.workpiece_bulk_temp_C += bulkRise;

    // Thermal gradient (°C/mm) across contact zone
    state.thermal.thermal_gradient_C_per_mm = contactLength > 0
      ? (zoneTemp - state.thermal.workpiece_bulk_temp_C) / contactLength
      : 0;

    // Cumulative heat (J)
    state.thermal.cumulative_heat_J += HEAT_PARTITION_WORKPIECE * cuttingPower_W * dt;
  }

  /**
   * Update tool wear state (VB flank wear, KT crater depth).
   * Uses simplified Taylor-Arrhenius model with three wear stages.
   * @param state - Current twin state (mutated in place)
   * @param update - Machining step parameters
   */
  updateWear(state: DigitalTwinState, update: TwinUpdateStep): void {
    const dt = update.dt_sec ?? 0.1;
    const dtMin = dt / 60;
    const v = (update.rpm * Math.PI * update.tool_diameter_mm / 1000); // m/min
    const fz = update.feed_mmmin / Math.max(update.rpm, 1);

    // Base wear rate: C * V^1.5 * f^0.8 (empirical, units: mm/min)
    const C_vb = 2e-6;
    const baseRate = C_vb * Math.pow(Math.max(v, 1), 1.5) * Math.pow(Math.max(fz, 0.01), 0.8);

    // Acceleration factor based on current wear stage
    let accelFactor = 1.0;
    if (state.wear.vb_mm > VB_ACCELERATED_ONSET) {
      accelFactor = 1.0 + 3.0 * (state.wear.vb_mm - VB_ACCELERATED_ONSET) / VB_ACCELERATED_ONSET;
    } else if (state.wear.vb_mm < VB_INITIAL_LIMIT) {
      accelFactor = 1.5; // initial break-in has slightly higher rate
    }

    // Temperature effect on wear (Arrhenius-like)
    const tempFactor = 1.0 + 0.002 * Math.max(state.thermal.cutting_zone_temp_C - 400, 0);

    const wearRate = baseRate * accelFactor * tempFactor;
    state.wear.wear_rate_mm_per_min = wearRate;
    state.wear.vb_mm += wearRate * dtMin;
    state.wear.cutting_time_min += dtMin;

    // Crater wear: proportional to VB but slower
    state.wear.kt_mm += wearRate * 0.3 * dtMin;

    // Classify wear stage
    if (state.wear.vb_mm < VB_INITIAL_LIMIT) {
      state.wear.wear_stage = "initial";
    } else if (state.wear.vb_mm < VB_ACCELERATED_ONSET) {
      state.wear.wear_stage = "steady";
    } else {
      state.wear.wear_stage = "accelerated";
    }
  }

  /**
   * Update surface integrity state — residual stress and hardness changes.
   * Combines mechanical (compressive from cutting force) and thermal (tensile
   * from heat) contributions.
   * @param state - Current twin state (mutated in place)
   * @param update - Machining step parameters
   */
  updateSurface(state: DigitalTwinState, update: TwinUpdateStep): void {
    const force = update.force_N ?? (update.depth_mm * update.width_mm * 2500 *
      (update.feed_mmmin / Math.max(update.rpm, 1) / 2) ** 0.75);

    // Mechanical stress contribution (compressive, negative convention)
    const contactArea_mm2 = update.depth_mm * update.width_mm;
    const mechanicalStress = contactArea_mm2 > 0 ? -force / contactArea_mm2 : 0;

    // Thermal stress contribution (tensile, positive) — proportional to temp above ambient
    const thermalStress = 0.5 * Math.max(state.thermal.cutting_zone_temp_C - AMBIENT_TEMP_C, 0);

    // Net residual stress (weighted moving average with new contribution)
    const netContribution = mechanicalStress + thermalStress;
    state.surface.residual_stress_mpa =
      0.85 * state.surface.residual_stress_mpa + 0.15 * netContribution;

    // Classify stress type
    if (state.surface.residual_stress_mpa < -10) {
      state.surface.stress_type = "compressive";
    } else if (state.surface.residual_stress_mpa > 10) {
      state.surface.stress_type = "tensile";
    } else {
      state.surface.stress_type = "neutral";
    }

    // Surface hardness change from work hardening + thermal softening
    const workHardening = 0.01 * Math.sqrt(Math.abs(force));
    const thermalSoftening = state.thermal.cutting_zone_temp_C > 500
      ? -0.005 * (state.thermal.cutting_zone_temp_C - 500) : 0;
    state.surface.surface_hardness_change_pct += workHardening + thermalSoftening;

    // White layer risk: high temperature + aggressive cutting
    state.surface.white_layer_risk =
      state.thermal.cutting_zone_temp_C > WHITE_LAYER_TEMP_THRESHOLD &&
      state.wear.vb_mm > 0.15;
  }

  /**
   * Update stock state — track material removal volume and bounding box.
   * @param state - Current twin state (mutated in place)
   * @param update - Machining step parameters
   */
  updateStock(state: DigitalTwinState, update: TwinUpdateStep): void {
    const dt = update.dt_sec ?? 0.1;
    const feedRate_mm_s = update.feed_mmmin / 60;

    // Material removal rate: depth × width × feed_distance_per_step
    const mrr_mm3 = update.depth_mm * update.width_mm * feedRate_mm_s * dt;
    state.stock.volume_removed_mm3 += mrr_mm3;
    state.stock.volume_remaining_mm3 -= mrr_mm3;

    // Update removal percentage
    const totalVol = state.stock.volume_remaining_mm3 + state.stock.volume_removed_mm3;
    state.stock.removal_pct = totalVol > 0
      ? (state.stock.volume_removed_mm3 / totalVol) * 100
      : 100;

    // Shrink bounding box proportionally (simplified — uniform shrink in Z)
    if (totalVol > 0) {
      const shrinkRatio = state.stock.volume_remaining_mm3 / totalVol;
      const bb = state.stock.bounding_box;
      const zRange = bb.max_z - bb.min_z;
      bb.max_z = bb.min_z + zRange * Math.max(shrinkRatio, 0);
    }
  }

  /**
   * Query twin state for a specific novel toolpath algorithm.
   * Returns a flat record of relevant values the algorithm needs.
   * @param state - Current twin state
   * @param algorithm - Algorithm identifier (e.g., "TGAR", "PTDC", "RSMP")
   * @returns Key-value pairs relevant to the algorithm
   */
  queryForAlgorithm(state: DigitalTwinState, algorithm: string): Record<string, number> {
    const base: Record<string, number> = {
      temp_C: state.thermal.cutting_zone_temp_C,
      vb_mm: state.wear.vb_mm,
      stress_mpa: state.surface.residual_stress_mpa,
      removal_pct: state.stock.removal_pct,
    };

    switch (algorithm.toUpperCase()) {
      case "TGAR": // Thermal-gradient adaptive roughing
        return {
          ...base,
          thermal_gradient: state.thermal.thermal_gradient_C_per_mm,
          bulk_temp_C: state.thermal.workpiece_bulk_temp_C,
          cumulative_heat_J: state.thermal.cumulative_heat_J,
        };
      case "PTDC": { // Predictive tool deflection compensation
        // Estimate deflection from wear-adjusted stiffness
        const stiffnessLoss = 1 + state.wear.vb_mm * 2;
        const deflection_um = (state.thermal.cutting_zone_temp_C - AMBIENT_TEMP_C) * 0.05 * stiffnessLoss;
        return { ...base, deflection_um, stiffness_loss_factor: stiffnessLoss };
      }
      case "RSMP": // Residual stress minimization path
        return {
          ...base,
          hardness_change_pct: state.surface.surface_hardness_change_pct,
          white_layer_risk: state.surface.white_layer_risk ? 1 : 0,
        };
      case "CFSF": // Constant-force spiral finishing
        return { ...base, wear_rate: state.wear.wear_rate_mm_per_min, wear_stage: state.wear.wear_stage === "accelerated" ? 2 : state.wear.wear_stage === "steady" ? 1 : 0 };
      case "HRAF": // Harmonic-resonance avoidant finishing
        return { ...base, cutting_time_min: state.wear.cutting_time_min };
      case "VCER": // Vortex chip evacuation roughing
        return { ...base, volume_remaining_mm3: state.stock.volume_remaining_mm3 };
      default:
        return base;
    }
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /** Create a fresh initial state from input or defaults. */
  private createInitialState(input: TwinSyncInput): DigitalTwinState {
    const init = input.initial_state ?? {};
    const stockVol = input.stock_volume_mm3 ?? 1e6;

    return {
      thermal: {
        cutting_zone_temp_C: AMBIENT_TEMP_C,
        workpiece_bulk_temp_C: AMBIENT_TEMP_C,
        thermal_gradient_C_per_mm: 0,
        cumulative_heat_J: 0,
        ...init.thermal,
      },
      wear: {
        vb_mm: 0,
        kt_mm: 0,
        wear_rate_mm_per_min: 0,
        cutting_time_min: 0,
        wear_stage: "initial" as const,
        ...init.wear,
      },
      surface: {
        residual_stress_mpa: 0,
        stress_type: "neutral" as const,
        surface_hardness_change_pct: 0,
        white_layer_risk: false,
        ...init.surface,
      },
      stock: {
        volume_remaining_mm3: stockVol,
        volume_removed_mm3: 0,
        removal_pct: 0,
        bounding_box: { min_x: 0, min_y: 0, min_z: 0, max_x: 100, max_y: 100, max_z: 50 },
        ...init.stock,
      },
      timestamp_ms: Date.now(),
      step_count: 0,
    };
  }

  /** Deep-clone a state to preserve history immutably. */
  private cloneState(s: DigitalTwinState): DigitalTwinState {
    return {
      thermal: { ...s.thermal },
      wear: { ...s.wear },
      surface: { ...s.surface },
      stock: { ...s.stock, bounding_box: { ...s.stock.bounding_box } },
      timestamp_ms: s.timestamp_ms,
      step_count: s.step_count,
    };
  }

  /** Generate algorithm recommendations based on final state and peaks. */
  private generateRecommendations(
    finalState: DigitalTwinState,
    peakTemp: number,
    whiteLayer: boolean
  ): string[] {
    const recs: string[] = [];

    if (peakTemp > 600) {
      recs.push("Consider TGAR algorithm — thermal gradient is significant");
    }
    if (finalState.wear.wear_stage === "accelerated") {
      recs.push("Tool change recommended — wear in accelerated stage");
    }
    if (whiteLayer) {
      recs.push("White layer risk detected — reduce speed or increase coolant");
    }
    if (Math.abs(finalState.surface.residual_stress_mpa) > 500) {
      recs.push("High residual stress — consider RSMP algorithm for stress-aware paths");
    }
    if (finalState.wear.vb_mm > 0.1) {
      recs.push("Moderate wear — PTDC deflection compensation may improve accuracy");
    }
    if (recs.length === 0) {
      recs.push("Process parameters within normal bounds");
    }

    return recs;
  }
}

/** Singleton instance for direct use. */
export const digitalTwinSyncEngine = new DigitalTwinSyncEngine();
