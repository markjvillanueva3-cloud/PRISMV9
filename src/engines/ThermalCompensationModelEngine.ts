/**
 * ThermalCompensationModelEngine — Thermal drift prediction and compensation.
 *
 * Models thermal growth of spindle, column, and bed during long machining cycles.
 * Uses exponential heating/cooling model with time constants per axis.
 *
 * Physics: ΔL = α × L × ΔT, where ΔT follows exponential approach:
 *   T(t) = T_final × (1 - e^(-t/τ)) + T_initial
 */

interface AtomicValue<T> { value: T; unit: string; formula?: string; confidence?: number; }

export interface ThermalInput {
  machine: {
    type: "vmc" | "hmc" | "5axis";
    spindle_bore_mm: number;
    column_height_mm: number;
    bed_length_mm: number;
    spindle_material?: "steel" | "cast_iron";
    has_thermal_compensation?: boolean;
  };
  cutting: {
    spindle_rpm: number;
    spindle_power_kw: number;
    cycle_time_min: number;
    coolant_temp_c?: number;
    ambient_temp_c?: number;
  };
  part: {
    tolerance_mm: number;
    critical_axis: "X" | "Y" | "Z";
    feature_position_mm: number; // distance from spindle center
  };
}

export interface ThermalDriftPoint {
  time_min: number;
  spindle_temp_rise_c: number;
  x_drift_um: number;
  y_drift_um: number;
  z_drift_um: number;
  total_drift_um: number;
  within_tolerance: boolean;
}

export interface ThermalResult {
  drift_profile: ThermalDriftPoint[];
  peak_drift_um: number;
  peak_drift_axis: string;
  time_to_steady_state_min: number;
  warmup_time_min: number;
  compensation_offsets: { x_um: number; y_um: number; z_um: number };
  probing_intervals_min: number[];
  risk_level: "low" | "medium" | "high" | "critical";
  recommendations: string[];
}

// Thermal expansion coefficients (μm/m/°C)
const ALPHA: Record<string, number> = {
  steel: 11.7,
  cast_iron: 10.5,
  aluminum: 23.1,
};

// Time constants (minutes) for exponential approach to steady state
const TAU: Record<string, { spindle: number; column: number; bed: number }> = {
  vmc:   { spindle: 15, column: 45, bed: 90 },
  hmc:   { spindle: 12, column: 40, bed: 80 },
  "5axis": { spindle: 10, column: 35, bed: 70 },
};

export class ThermalCompensationModelEngine {
  compute(input: ThermalInput): AtomicValue<ThermalResult> {
    const { machine, cutting, part } = input;
    const alpha = ALPHA[machine.spindle_material || "steel"] || 11.7;
    const tau = TAU[machine.type] || TAU.vmc;
    const ambientTemp = cutting.ambient_temp_c || 20;
    const coolantTemp = cutting.coolant_temp_c || 20;

    // Steady-state temperature rise estimation
    // Heat generated ≈ 15% of spindle power (bearing friction + windage)
    const heatGenerated_kw = cutting.spindle_power_kw * 0.15;
    // RPM contribution to bearing heat
    const rpmFactor = Math.pow(cutting.spindle_rpm / 10000, 1.5);
    const steadyStateTempRise = heatGenerated_kw * 8 * rpmFactor; // °C

    // Generate drift profile at intervals
    const totalTime = cutting.cycle_time_min;
    const intervals = Math.min(20, Math.max(5, Math.ceil(totalTime / 5)));
    const dt = totalTime / intervals;

    const profile: ThermalDriftPoint[] = [];
    let peakDrift = 0;
    let peakAxis = "Z";
    const toleranceUm = part.tolerance_mm * 1000;

    for (let i = 0; i <= intervals; i++) {
      const t = i * dt;

      // Spindle temperature rise (exponential approach)
      const spindleTempRise = steadyStateTempRise * (1 - Math.exp(-t / tau.spindle));

      // Column temperature rise (slower)
      const columnTempRise = steadyStateTempRise * 0.3 * (1 - Math.exp(-t / tau.column));

      // Bed temperature rise (slowest)
      const bedTempRise = steadyStateTempRise * 0.1 * (1 - Math.exp(-t / tau.bed));

      // Coolant effect: reduces drift if coolant is colder than ambient
      const coolantEffect = (coolantTemp - ambientTemp) < 0 ? 0.7 : 1.0;

      // Drift calculation: ΔL = α × L × ΔT (in μm)
      // Z-axis: spindle bore expansion + column growth
      const zDrift = (alpha * machine.spindle_bore_mm * spindleTempRise +
                      alpha * machine.column_height_mm * columnTempRise * 0.001) * coolantEffect;

      // X/Y: bed expansion (less significant)
      const xDrift = alpha * machine.bed_length_mm * bedTempRise * 0.001 * coolantEffect;
      const yDrift = xDrift * 0.8; // Y typically less affected

      const totalDriftUm = Math.sqrt(xDrift * xDrift + yDrift * yDrift + zDrift * zDrift);

      if (totalDriftUm > peakDrift) {
        peakDrift = totalDriftUm;
        if (Math.abs(zDrift) > Math.abs(xDrift) && Math.abs(zDrift) > Math.abs(yDrift)) peakAxis = "Z";
        else if (Math.abs(xDrift) > Math.abs(yDrift)) peakAxis = "X";
        else peakAxis = "Y";
      }

      profile.push({
        time_min: Math.round(t * 10) / 10,
        spindle_temp_rise_c: Math.round(spindleTempRise * 10) / 10,
        x_drift_um: Math.round(xDrift * 10) / 10,
        y_drift_um: Math.round(yDrift * 10) / 10,
        z_drift_um: Math.round(zDrift * 10) / 10,
        total_drift_um: Math.round(totalDriftUm * 10) / 10,
        within_tolerance: totalDriftUm < toleranceUm / 2,
      });
    }

    // Time to 90% steady state
    const steadyStateTime = Math.max(tau.spindle, tau.column) * 2.3; // ln(10) ≈ 2.3

    // Warmup recommendation: time until drift rate < 0.5 μm/min
    const warmupTime = tau.spindle * 2; // ~2 time constants

    // Compensation offsets at steady state
    const ssPoint = profile[profile.length - 1];
    const compensation = {
      x_um: -Math.round(ssPoint.x_drift_um * 10) / 10,
      y_um: -Math.round(ssPoint.y_drift_um * 10) / 10,
      z_um: -Math.round(ssPoint.z_drift_um * 10) / 10,
    };

    // Probing interval: probe when drift exceeds tolerance/4
    const probingIntervals: number[] = [];
    const driftThreshold = toleranceUm / 4;
    let lastProbeTime = 0;
    for (const p of profile) {
      const driftSinceProbe = p.total_drift_um - (lastProbeTime > 0 ?
        profile.find(pp => pp.time_min === lastProbeTime)?.total_drift_um || 0 : 0);
      if (Math.abs(driftSinceProbe) > driftThreshold && p.time_min > lastProbeTime) {
        probingIntervals.push(Math.round(p.time_min));
        lastProbeTime = p.time_min;
      }
    }

    // Risk assessment
    const driftToToleranceRatio = peakDrift / (toleranceUm / 2);
    const risk = driftToToleranceRatio > 2 ? "critical" as const
      : driftToToleranceRatio > 1 ? "high" as const
      : driftToToleranceRatio > 0.5 ? "medium" as const
      : "low" as const;

    // Recommendations
    const recs: string[] = [];
    if (risk === "critical" || risk === "high") {
      recs.push(`Peak drift ${peakDrift.toFixed(1)}μm exceeds tolerance band — run warmup cycle first`);
    }
    if (warmupTime > 10) {
      recs.push(`Recommend ${Math.round(warmupTime)}min spindle warmup at ${Math.round(cutting.spindle_rpm * 0.7)} RPM`);
    }
    if (probingIntervals.length > 0) {
      recs.push(`Probe critical features every ${probingIntervals[0]}min to compensate drift`);
    }
    if (!machine.has_thermal_compensation) {
      recs.push("Machine lacks built-in thermal compensation — use probing-based offset updates");
    }
    if (cutting.coolant_temp_c && cutting.coolant_temp_c > 25) {
      recs.push("Coolant temperature above 25°C — consider chiller to reduce thermal drift");
    }

    const result: ThermalResult = {
      drift_profile: profile,
      peak_drift_um: Math.round(peakDrift * 10) / 10,
      peak_drift_axis: peakAxis,
      time_to_steady_state_min: Math.round(steadyStateTime),
      warmup_time_min: Math.round(warmupTime),
      compensation_offsets: compensation,
      probing_intervals_min: probingIntervals,
      risk_level: risk,
      recommendations: recs,
    };

    return {
      value: result,
      unit: "μm",
      formula: "ΔL=α×L×ΔT, T(t)=T_ss×(1-e^(-t/τ))",
      confidence: machine.has_thermal_compensation ? 0.7 : 0.75,
    };
  }
}

export const thermalCompensationModelEngine = new ThermalCompensationModelEngine();
