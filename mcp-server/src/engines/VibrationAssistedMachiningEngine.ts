/**
 * VibrationAssistedMachiningEngine — Vibration-assisted machining process analysis
 *
 * Models: Ultrasonic VAM (20-40 kHz), low-frequency VAM (50-1000 Hz),
 *         chip breaking mechanics, cutting force reduction, surface quality improvement.
 * References: Brehl & Dow (2008), Shamoto & Moriwaki (ultrasonic elliptical vibration),
 *             Zheng et al. (VAM force models), Weber & Endrino (tool life in VAM)
 */

export type VAMMode = "ultrasonic_linear" | "ultrasonic_elliptical" | "low_freq_linear" | "low_freq_torsional" | "resonant_2d";
export type VAMOperation = "turning" | "drilling" | "milling" | "grinding" | "micro_machining";

export interface VAMInput {
  mode?: VAMMode;
  operation?: VAMOperation;
  frequency_Hz?: number;
  amplitude_um?: number;
  cutting_speed_m_min?: number;
  feed_mm_rev?: number;
  depth_of_cut_mm?: number;
  material_hardness_HRC?: number;
  tool_material?: "carbide" | "cbn" | "pcd" | "diamond" | "hss";
  workpiece?: "steel" | "titanium" | "aluminum" | "inconel" | "ceramic" | "composite" | "glass";
}

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty?: number;
  source: string;
  warning?: string;
}

export interface VAMResult {
  force_reduction_pct: AtomicValue;
  surface_roughness_improvement_pct: AtomicValue;
  tool_life_multiplier: AtomicValue;
  critical_speed_ratio: AtomicValue;
  duty_cycle_pct: AtomicValue;
  chip_breaking_effectiveness: AtomicValue;
  power_consumption_W: AtomicValue;
  is_intermittent_cutting: boolean;
  recommendations: string[];
}

// Material: [base_force_N/mm2, surface_Ra_um, machinability_factor]
const MATERIAL_DATA: Record<string, [number, number, number]> = {
  steel:     [2500, 1.6, 1.0],
  titanium:  [3200, 2.0, 0.6],
  aluminum:  [800,  0.8, 2.0],
  inconel:   [4000, 2.5, 0.4],
  ceramic:   [5000, 0.4, 0.3],
  composite: [600,  1.2, 1.5],
  glass:     [6000, 0.3, 0.2],
};

// Mode: [typical_freq_Hz, typical_amp_um, force_reduction_base, surface_improvement_base, power_factor]
const MODE_DATA: Record<VAMMode, [number, number, number, number, number]> = {
  ultrasonic_linear:    [20000, 10,  0.40, 0.50, 1.0],
  ultrasonic_elliptical:[20000, 8,   0.55, 0.65, 1.3],
  low_freq_linear:      [100,   200, 0.20, 0.25, 0.5],
  low_freq_torsional:   [100,   150, 0.25, 0.30, 0.6],
  resonant_2d:          [5000,  30,  0.45, 0.55, 1.1],
};

export class VibrationAssistedMachiningEngine {
  calculate(input: VAMInput = {}): VAMResult {
    const mode = input.mode ?? "ultrasonic_linear";
    const operation = input.operation ?? "turning";
    const [typFreq, typAmp, forceRedBase, surfImpBase, powerFactor] = MODE_DATA[mode];
    const freq = input.frequency_Hz ?? typFreq;
    const amp = input.amplitude_um ?? typAmp;
    const Vc = input.cutting_speed_m_min ?? 100;
    const feed = input.feed_mm_rev ?? 0.1;
    const doc = input.depth_of_cut_mm ?? 0.5;
    const workpiece = input.workpiece ?? "steel";
    const toolMat = input.tool_material ?? "carbide";
    const hardness = input.material_hardness_HRC ?? 30;

    const [baseForce, baseRa, machinFactor] = MATERIAL_DATA[workpiece];
    const recs: string[] = [];

    // Critical speed ratio (Vc_crit = 2*pi*f*A)
    // When cutting speed < vibration velocity, intermittent cutting occurs (beneficial)
    const vibVelocity_m_min = 2 * Math.PI * freq * (amp * 1e-6) * 60; // m/min
    const speedRatio = Vc / Math.max(vibVelocity_m_min, 0.001);
    const isIntermittent = speedRatio < 1.0;

    // Duty cycle: fraction of time tool is in contact with workpiece
    // For intermittent cutting: DC = 1 - (1 - speedRatio) when speedRatio < 1
    const dutyCycle = isIntermittent
      ? Math.max(speedRatio, 0.05) * 100
      : 100;

    // Force reduction model
    // Based on Brehl & Dow: force reduction scales with (1 - dutyCycle/100) for intermittent
    // Plus material-dependent reduction
    let forceReduction = forceRedBase;
    if (isIntermittent) {
      forceReduction = forceRedBase + (1 - dutyCycle / 100) * 0.3;
    }
    // Hard materials benefit more from VAM
    const hardnessFactor = Math.min(hardness / 30, 2.0);
    forceReduction *= (0.7 + 0.3 * hardnessFactor);
    forceReduction = Math.min(forceReduction, 0.85); // cap at 85% reduction

    // Surface roughness improvement
    // VAM creates micro-textured surface with lower Ra
    let surfImprovement = surfImpBase;
    if (mode.includes("elliptical")) surfImprovement *= 1.3;
    if (operation === "micro_machining") surfImprovement *= 1.2;
    surfImprovement = Math.min(surfImprovement, 0.80);

    // Tool life multiplier
    // VAM reduces tool-chip contact, lowers temperature, extends life
    let toolLifeMult = 1.0 + forceReduction * 0.8;
    if (workpiece === "titanium" || workpiece === "inconel") {
      toolLifeMult *= 1.5; // VAM most beneficial for difficult materials
    }
    if (toolMat === "diamond" || toolMat === "pcd") {
      toolLifeMult *= 1.2; // Diamond tools pair well with VAM
    }

    // Chip breaking effectiveness (0-1 scale)
    // Higher frequency and amplitude improve chip breaking
    const chipBreaking = Math.min(
      0.3 + (freq / 40000) * 0.4 + (amp / 50) * 0.3,
      1.0
    );

    // Power consumption for vibration actuator
    // P = 2 * pi^2 * f^2 * A^2 * m_eff * loss_factor
    const effectiveMass_kg = operation === "turning" ? 0.5 :
                             operation === "drilling" ? 0.3 :
                             operation === "milling" ? 0.8 : 0.4;
    const lossFactor = 0.15;
    const power_W = 2 * Math.PI * Math.PI * freq * freq *
                    (amp * 1e-6) * (amp * 1e-6) * effectiveMass_kg / lossFactor * powerFactor;

    // Recommendations
    if (!isIntermittent) {
      recs.push(`Speed ratio ${speedRatio.toFixed(1)} > 1 — reduce cutting speed below ${vibVelocity_m_min.toFixed(1)} m/min for intermittent cutting benefits`);
    }
    if (workpiece === "steel" && hardness < 20) {
      recs.push("Low-hardness steel has limited VAM benefit — consider conventional machining");
    }
    if (mode === "ultrasonic_linear" && operation === "milling") {
      recs.push("Ultrasonic elliptical mode may be more effective for milling operations");
    }
    if (freq > 30000) {
      recs.push("Frequencies >30 kHz require specialized ultrasonic transducer and horn design");
    }
    if (amp > 30 && mode.includes("ultrasonic")) {
      recs.push("High amplitude ultrasonic vibration may cause transducer overheating — monitor temperature");
    }
    if (workpiece === "composite") {
      recs.push("VAM significantly reduces delamination in composite machining");
    }

    return {
      force_reduction_pct: {
        value: Math.round(forceReduction * 1000) / 10,
        unit: "%",
        source: "Brehl-Dow intermittent cutting model + material hardness factor",
      },
      surface_roughness_improvement_pct: {
        value: Math.round(surfImprovement * 1000) / 10,
        unit: "%",
        source: "VAM micro-texture model (Shamoto-Moriwaki)",
      },
      tool_life_multiplier: {
        value: Math.round(toolLifeMult * 100) / 100,
        unit: "x",
        source: "Weber-Endrino VAM tool wear reduction model",
      },
      critical_speed_ratio: {
        value: Math.round(speedRatio * 1000) / 1000,
        unit: "ratio",
        source: "Vc / (2*pi*f*A) — <1 = intermittent cutting",
        warning: speedRatio > 2 ? "Far above critical ratio — minimal VAM benefit" : undefined,
      },
      duty_cycle_pct: {
        value: Math.round(dutyCycle * 10) / 10,
        unit: "%",
        source: "Intermittent contact ratio from speed/vibration velocity",
      },
      chip_breaking_effectiveness: {
        value: Math.round(chipBreaking * 100) / 100,
        unit: "0-1",
        source: "Frequency-amplitude chip segmentation model",
      },
      power_consumption_W: {
        value: Math.round(power_W * 10) / 10,
        unit: "W",
        source: "Actuator power = 2*pi^2*f^2*A^2*m/eta",
      },
      is_intermittent_cutting: isIntermittent,
      recommendations: recs,
    };
  }
}

export const vibrationAssistedMachiningEngine = new VibrationAssistedMachiningEngine();
