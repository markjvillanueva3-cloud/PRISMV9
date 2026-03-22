/**
 * InverseThermalCompensationEngine — Real-Time Machine Thermal Correction
 *
 * Combines machine error model (21-parameter) with environmental thermal
 * model to predict thermal growth field, then applies inverse coordinate
 * offsets to compensate. Supports real-time sensor updating.
 *
 * Physics: δ(x,y,z) = Σ αᵢ × ΔTᵢ × Lᵢ for each error source
 * Correction: corrected = nominal - δ
 *
 * References:
 *   - Mayr et al. (2012): Thermal issues in machine tools, CIRP Annals
 *   - Bryan (1990): International status of thermal error research
 *   - Ramesh et al. (2000): Error compensation in machine tools — review
 *
 * @module InverseThermalCompensationEngine
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface ThermalSource {
  name: string;
  /** Location on machine (mm from origin) */
  position: { x: number; y: number; z: number };
  /** Temperature rise above ambient (°C) */
  delta_T_C: number;
  /** Affected length (mm) — distance over which this source causes growth */
  affected_length_mm: number;
  /** Material CTE (μm/m/°C) — default 12 for steel */
  cte_um_m_C?: number;
  /** Source type for modeling */
  type: "spindle" | "ballscrew_x" | "ballscrew_y" | "ballscrew_z" | "motor" | "ambient" | "coolant" | "cutting";
}

export interface MachineModel {
  name: string;
  /** Machine workspace envelope (mm) */
  workspace: { x: number; y: number; z: number };
  /** Default CTE for structure (μm/m/°C) */
  structure_cte: number;
  /** Thermal sources */
  sources: ThermalSource[];
  /** Warm-up time constant (minutes) — how fast the machine reaches thermal equilibrium */
  time_constant_min: number;
}

export interface ThermalField {
  /** Grid of thermal deformation vectors (μm) at sample points */
  grid: ThermalFieldPoint[];
  /** Maximum deformation magnitude (μm) */
  max_deformation_um: number;
  /** Average deformation (μm) */
  avg_deformation_um: number;
  /** Dominant axis of deformation */
  dominant_axis: "x" | "y" | "z";
  /** Machine state at computation time */
  machine_run_time_min: number;
}

export interface ThermalFieldPoint {
  /** Position in workspace (mm) */
  x: number; y: number; z: number;
  /** Thermal deformation at this point (μm) */
  dx_um: number; dy_um: number; dz_um: number;
  /** Total magnitude (μm) */
  magnitude_um: number;
}

export interface CompensationResult {
  /** Original coordinates */
  original: { x: number; y: number; z: number }[];
  /** Compensated coordinates */
  compensated: { x: number; y: number; z: number }[];
  /** Applied offsets (μm) */
  offsets: { dx_um: number; dy_um: number; dz_um: number }[];
  /** Maximum correction applied (μm) */
  max_correction_um: number;
  /** Average correction (μm) */
  avg_correction_um: number;
}

export interface SensorUpdate {
  /** Sensor readings: name → temperature °C */
  temperatures: Record<string, number>;
  /** Ambient temperature */
  ambient_C?: number;
  /** Machine run time since cold start (minutes) */
  run_time_min?: number;
}

export interface WarmUpProfile {
  /** Time points (minutes) */
  time_min: number[];
  /** Deformation at tool tip per time point (μm) */
  tip_deformation_um: number[];
  /** Time to reach 90% of steady-state (minutes) */
  time_to_90pct_min: number;
  /** Steady-state deformation (μm) */
  steady_state_um: number;
  /** Recommended warm-up time (minutes) */
  recommended_warmup_min: number;
}

// ─── Default Machine Models ─────────────────────────────────────────

const DEFAULT_VMC: MachineModel = {
  name: "Generic VMC",
  workspace: { x: 800, y: 500, z: 500 },
  structure_cte: 12, // steel
  time_constant_min: 45,
  sources: [
    { name: "spindle_bearing", position: { x: 400, y: 250, z: 500 }, delta_T_C: 8, affected_length_mm: 150, type: "spindle" },
    { name: "ballscrew_x", position: { x: 400, y: 0, z: 0 }, delta_T_C: 3, affected_length_mm: 800, type: "ballscrew_x" },
    { name: "ballscrew_y", position: { x: 0, y: 250, z: 0 }, delta_T_C: 2.5, affected_length_mm: 500, type: "ballscrew_y" },
    { name: "ballscrew_z", position: { x: 0, y: 0, z: 250 }, delta_T_C: 2, affected_length_mm: 500, type: "ballscrew_z" },
    { name: "x_motor", position: { x: 0, y: 0, z: 0 }, delta_T_C: 15, affected_length_mm: 100, type: "motor" },
    { name: "y_motor", position: { x: 0, y: 0, z: 0 }, delta_T_C: 12, affected_length_mm: 80, type: "motor" },
  ],
};

const DEFAULT_HMC: MachineModel = {
  name: "Generic HMC",
  workspace: { x: 600, y: 600, z: 600 },
  structure_cte: 12,
  time_constant_min: 60,
  sources: [
    { name: "spindle_bearing", position: { x: 300, y: 300, z: 600 }, delta_T_C: 10, affected_length_mm: 200, type: "spindle" },
    { name: "ballscrew_x", position: { x: 300, y: 0, z: 0 }, delta_T_C: 3.5, affected_length_mm: 600, type: "ballscrew_x" },
    { name: "ballscrew_y", position: { x: 0, y: 300, z: 0 }, delta_T_C: 3, affected_length_mm: 600, type: "ballscrew_y" },
    { name: "ballscrew_z", position: { x: 0, y: 0, z: 300 }, delta_T_C: 2.5, affected_length_mm: 600, type: "ballscrew_z" },
  ],
};

// ─── Engine ─────────────────────────────────────────────────────────

export class InverseThermalCompensationEngine {

  /**
   * Predict thermal deformation field across workspace.
   *
   * For each source: δ = α × ΔT × L (linear thermal expansion)
   * Direction of growth depends on source type:
   *   - spindle: primarily Z growth (spindle nose drops)
   *   - ballscrew_x: X positioning error increases with distance
   *   - ambient: uniform expansion of structure
   *
   * Warm-up factor: (1 - e^(-t/τ)) models transient thermal growth
   */
  predictThermalField(
    machine: MachineModel | string,
    runTime_min: number,
    ambientOffset_C?: number,
    gridResolution?: number,
  ): ThermalField {
    const model = typeof machine === "string"
      ? (machine === "hmc" ? DEFAULT_HMC : DEFAULT_VMC)
      : machine;

    const res = gridResolution ?? 5; // 5×5×5 grid
    const grid: ThermalFieldPoint[] = [];
    let maxDef = 0;
    let totalDef = 0;
    let maxAxisDef = { x: 0, y: 0, z: 0 };

    // Warm-up factor: exponential approach to steady state
    const warmupFactor = 1 - Math.exp(-runTime_min / model.time_constant_min);

    // Ambient offset contribution
    const ambientDelta = ambientOffset_C ?? 0;

    for (let ix = 0; ix <= res; ix++) {
      for (let iy = 0; iy <= res; iy++) {
        for (let iz = 0; iz <= res; iz++) {
          const x = (ix / res) * model.workspace.x;
          const y = (iy / res) * model.workspace.y;
          const z = (iz / res) * model.workspace.z;

          let dx = 0, dy = 0, dz = 0; // deformation in μm

          // Sum contributions from all thermal sources
          for (const src of model.sources) {
            const cte = (src.cte_um_m_C ?? model.structure_cte) * 1e-6; // convert to m/m/°C
            const dT = src.delta_T_C * warmupFactor;
            const L = src.affected_length_mm; // mm

            // Deformation = α × ΔT × L (result in μm since α in μm/m/°C, L in mm)
            const growth_um = (src.cte_um_m_C ?? model.structure_cte) * dT * (L / 1000);

            // Direction depends on source type
            switch (src.type) {
              case "spindle":
                dz += growth_um; // spindle grows downward (Z)
                break;
              case "ballscrew_x":
                // Positioning error proportional to distance from screw start
                dx += growth_um * (x / model.workspace.x);
                break;
              case "ballscrew_y":
                dy += growth_um * (y / model.workspace.y);
                break;
              case "ballscrew_z":
                dz += growth_um * (z / model.workspace.z);
                break;
              case "motor":
                // Motor heat conducts along axis, affecting nearby region
                dx += growth_um * 0.3 * Math.exp(-x / 200);
                break;
              case "ambient":
                // Uniform expansion
                dx += growth_um * (x / model.workspace.x);
                dy += growth_um * (y / model.workspace.y);
                dz += growth_um * (z / model.workspace.z);
                break;
              case "coolant":
                // Coolant stabilizes — reduces other sources
                dx *= 0.7;
                dy *= 0.7;
                dz *= 0.7;
                break;
              case "cutting":
                // Localized heat at cutting zone
                const dist = Math.sqrt((x - src.position.x) ** 2 + (y - src.position.y) ** 2);
                const localFactor = Math.exp(-dist / 50);
                dz += growth_um * localFactor;
                break;
            }
          }

          // Add ambient offset contribution
          if (ambientDelta !== 0) {
            dx += model.structure_cte * ambientDelta * (x / 1000);
            dy += model.structure_cte * ambientDelta * (y / 1000);
            dz += model.structure_cte * ambientDelta * (z / 1000);
          }

          const mag = Math.sqrt(dx * dx + dy * dy + dz * dz);
          grid.push({
            x, y, z,
            dx_um: parseFloat(dx.toFixed(3)),
            dy_um: parseFloat(dy.toFixed(3)),
            dz_um: parseFloat(dz.toFixed(3)),
            magnitude_um: parseFloat(mag.toFixed(3)),
          });

          maxDef = Math.max(maxDef, mag);
          totalDef += mag;
          maxAxisDef.x = Math.max(maxAxisDef.x, Math.abs(dx));
          maxAxisDef.y = Math.max(maxAxisDef.y, Math.abs(dy));
          maxAxisDef.z = Math.max(maxAxisDef.z, Math.abs(dz));
        }
      }
    }

    const dominant = maxAxisDef.z >= maxAxisDef.x && maxAxisDef.z >= maxAxisDef.y ? "z"
      : maxAxisDef.x >= maxAxisDef.y ? "x" : "y";

    return {
      grid,
      max_deformation_um: parseFloat(maxDef.toFixed(3)),
      avg_deformation_um: parseFloat((totalDef / grid.length).toFixed(3)),
      dominant_axis: dominant,
      machine_run_time_min: runTime_min,
    };
  }

  /**
   * Compute inverse compensation — apply -δ to each toolpath coordinate.
   */
  computeCompensation(
    field: ThermalField,
    coordinates: { x: number; y: number; z: number }[],
  ): CompensationResult {
    const compensated: { x: number; y: number; z: number }[] = [];
    const offsets: { dx_um: number; dy_um: number; dz_um: number }[] = [];
    let maxCorr = 0;
    let totalCorr = 0;

    for (const coord of coordinates) {
      // Find nearest grid point (or interpolate)
      let bestDist = Infinity;
      let bestPoint = field.grid[0];

      for (const gp of field.grid) {
        const dist = (gp.x - coord.x) ** 2 + (gp.y - coord.y) ** 2 + (gp.z - coord.z) ** 2;
        if (dist < bestDist) {
          bestDist = dist;
          bestPoint = gp;
        }
      }

      // Inverse compensation: subtract deformation
      const dx_mm = -bestPoint.dx_um / 1000;
      const dy_mm = -bestPoint.dy_um / 1000;
      const dz_mm = -bestPoint.dz_um / 1000;

      compensated.push({
        x: parseFloat((coord.x + dx_mm).toFixed(6)),
        y: parseFloat((coord.y + dy_mm).toFixed(6)),
        z: parseFloat((coord.z + dz_mm).toFixed(6)),
      });

      offsets.push({
        dx_um: bestPoint.dx_um,
        dy_um: bestPoint.dy_um,
        dz_um: bestPoint.dz_um,
      });

      const mag = bestPoint.magnitude_um;
      maxCorr = Math.max(maxCorr, mag);
      totalCorr += mag;
    }

    return {
      original: coordinates,
      compensated,
      offsets,
      max_correction_um: parseFloat(maxCorr.toFixed(3)),
      avg_correction_um: parseFloat((totalCorr / Math.max(coordinates.length, 1)).toFixed(3)),
    };
  }

  /**
   * Update thermal model from sensor readings.
   */
  updateFromSensors(
    machine: MachineModel | string,
    sensors: SensorUpdate,
  ): MachineModel {
    const model = typeof machine === "string"
      ? JSON.parse(JSON.stringify(machine === "hmc" ? DEFAULT_HMC : DEFAULT_VMC)) as MachineModel
      : JSON.parse(JSON.stringify(machine)) as MachineModel;

    const ambient = sensors.ambient_C ?? 20;

    // Update source temperatures from sensor readings
    for (const src of model.sources) {
      const sensorTemp = sensors.temperatures[src.name];
      if (sensorTemp !== undefined) {
        src.delta_T_C = sensorTemp - ambient;
      }
    }

    return model;
  }

  /**
   * Predict warm-up profile — deformation at tool tip over time.
   */
  warmUpProfile(
    machine: MachineModel | string,
    maxTime_min?: number,
    timeStep_min?: number,
  ): WarmUpProfile {
    const model = typeof machine === "string"
      ? (machine === "hmc" ? DEFAULT_HMC : DEFAULT_VMC)
      : machine;

    const tMax = maxTime_min ?? 120;
    const dt = timeStep_min ?? 5;
    const times: number[] = [];
    const deformations: number[] = [];

    // Compute at tool tip position (center of workspace, top Z)
    const tipCoord = [{ x: model.workspace.x / 2, y: model.workspace.y / 2, z: model.workspace.z }];

    let steadyState = 0;

    for (let t = 0; t <= tMax; t += dt) {
      const field = this.predictThermalField(model, t, 0, 3);
      const comp = this.computeCompensation(field, tipCoord);
      const defMag = comp.max_correction_um;

      times.push(t);
      deformations.push(defMag);

      if (t >= tMax - dt) steadyState = defMag;
    }

    // Find time to 90% of steady state
    const target90 = steadyState * 0.9;
    let time90 = tMax;
    for (let i = 0; i < deformations.length; i++) {
      if (deformations[i] >= target90) {
        time90 = times[i];
        break;
      }
    }

    return {
      time_min: times,
      tip_deformation_um: deformations,
      time_to_90pct_min: time90,
      steady_state_um: steadyState,
      recommended_warmup_min: Math.ceil(time90 / 5) * 5, // round up to nearest 5 min
    };
  }

  /**
   * Dispatcher-compatible calculate method.
   */
  calculate(input: {
    action: "predict_field" | "compute_compensation" | "update_sensors" | "warmup_profile";
    [key: string]: unknown;
  }): unknown {
    switch (input.action) {
      case "predict_field":
        return this.predictThermalField(
          (input.machine as MachineModel | string) ?? "vmc",
          (input.run_time_min as number) ?? 30,
          input.ambient_offset_C as number | undefined,
          input.grid_resolution as number | undefined,
        );

      case "compute_compensation": {
        const field = input.field as ThermalField;
        const coords = input.coordinates as { x: number; y: number; z: number }[];
        return this.computeCompensation(field, coords);
      }

      case "update_sensors":
        return this.updateFromSensors(
          (input.machine as MachineModel | string) ?? "vmc",
          input.sensors as SensorUpdate,
        );

      case "warmup_profile":
        return this.warmUpProfile(
          (input.machine as MachineModel | string) ?? "vmc",
          input.max_time_min as number | undefined,
        );

      default:
        return { error: `Unknown action: ${input.action}` };
    }
  }
}
