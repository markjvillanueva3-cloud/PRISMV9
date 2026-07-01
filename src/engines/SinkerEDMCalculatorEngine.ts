/**
 * SinkerEDMCalculatorEngine — Reverse-engineered from PRISM v8.89 monolith
 *
 * Sinker (die-sinking) EDM parameter calculator from pulse settings:
 * MRR from current/pulse/duty cycle, electrode wear ratio, surface roughness
 * from pulse energy (VDI scale), HAZ depth, spark gap (overburn),
 * burn time estimation, and electrode count planning.
 *
 * Complements ElectrodeDesignEngine (geometry/orbiting) with physics-based
 * pulse parameter calculation.
 *
 * Material database: 18 workpiece materials with thermal properties from monolith.
 * Electrode materials: graphite, copper, copper-tungsten, brass, silver-tungsten.
 */

// ---------------------------------------------------------------------------
// Electrode Material Database
// ---------------------------------------------------------------------------

interface ElectrodeMaterialProps {
  name: string;
  mrrFactor: number;     // MRR multiplier vs baseline
  wearFactor: number;    // Wear rate multiplier (lower = less wear)
  finishFactor: number;  // Surface finish factor (higher = better finish)
  thermalCond: number;   // W/m·K
  meltingPoint: number;  // °C
}

const ELECTRODE_MATERIALS: Record<string, ElectrodeMaterialProps> = {
  graphite:          { name: "Graphite (EDM Grade)",    mrrFactor: 1.3,  wearFactor: 0.6,  finishFactor: 0.85, thermalCond: 130, meltingPoint: 3550 },
  graphite_fine:     { name: "Graphite (Fine Grain)",   mrrFactor: 1.1,  wearFactor: 0.5,  finishFactor: 1.1,  thermalCond: 100, meltingPoint: 3550 },
  copper:            { name: "Electrolytic Copper",     mrrFactor: 1.0,  wearFactor: 1.0,  finishFactor: 1.0,  thermalCond: 390, meltingPoint: 1083 },
  copper_tungsten:   { name: "Copper-Tungsten (75/25)", mrrFactor: 0.8,  wearFactor: 0.4,  finishFactor: 1.2,  thermalCond: 200, meltingPoint: 2000 },
  brass:             { name: "Brass",                   mrrFactor: 1.1,  wearFactor: 1.5,  finishFactor: 0.9,  thermalCond: 120, meltingPoint: 920  },
  silver_tungsten:   { name: "Silver-Tungsten",         mrrFactor: 0.7,  wearFactor: 0.3,  finishFactor: 1.3,  thermalCond: 310, meltingPoint: 2200 },
};

// ---------------------------------------------------------------------------
// Workpiece Material Database (18 materials from monolith Wire EDM DB)
// ---------------------------------------------------------------------------

interface WorkpieceMaterialProps {
  name: string;
  meltingPoint: number;    // °C
  thermalCond: number;     // W/m·K
  resistivity: number;     // µΩ·cm
  mrrFactor: number;       // Relative to D2 tool steel
  finishFactor: number;    // Surface finish achievability
}

const WORKPIECE_MATERIALS: Record<string, WorkpieceMaterialProps> = {
  D2:           { name: "D2 Tool Steel",       meltingPoint: 1421, thermalCond: 20.0,  resistivity: 65,  mrrFactor: 1.0,  finishFactor: 1.0  },
  A2:           { name: "A2 Tool Steel",       meltingPoint: 1430, thermalCond: 25.0,  resistivity: 55,  mrrFactor: 1.05, finishFactor: 0.95 },
  M2:           { name: "M2 HSS",              meltingPoint: 1430, thermalCond: 25.5,  resistivity: 52,  mrrFactor: 0.95, finishFactor: 1.05 },
  S7:           { name: "S7 Shock-Resistant",   meltingPoint: 1420, thermalCond: 28.0,  resistivity: 45,  mrrFactor: 1.1,  finishFactor: 0.9  },
  H13:          { name: "H13 Hot Work",         meltingPoint: 1427, thermalCond: 24.6,  resistivity: 52,  mrrFactor: 1.05, finishFactor: 0.95 },
  O1:           { name: "O1 Oil-Hardening",     meltingPoint: 1450, thermalCond: 30.0,  resistivity: 48,  mrrFactor: 1.1,  finishFactor: 0.9  },
  P20:          { name: "P20 Mold Steel",       meltingPoint: 1450, thermalCond: 29.0,  resistivity: 42,  mrrFactor: 1.15, finishFactor: 0.85 },
  "304SS":      { name: "304 Stainless",        meltingPoint: 1450, thermalCond: 16.2,  resistivity: 72,  mrrFactor: 0.85, finishFactor: 1.1  },
  "316SS":      { name: "316 Stainless",        meltingPoint: 1400, thermalCond: 14.6,  resistivity: 74,  mrrFactor: 0.8,  finishFactor: 1.15 },
  "17-4PH":     { name: "17-4 PH Stainless",   meltingPoint: 1440, thermalCond: 18.4,  resistivity: 80,  mrrFactor: 0.75, finishFactor: 1.1  },
  "6061":       { name: "6061-T6 Aluminum",     meltingPoint: 582,  thermalCond: 167,   resistivity: 4.0, mrrFactor: 1.8,  finishFactor: 0.7  },
  "7075":       { name: "7075-T6 Aluminum",     meltingPoint: 635,  thermalCond: 130,   resistivity: 5.2, mrrFactor: 1.7,  finishFactor: 0.75 },
  C110:         { name: "C110 Copper",          meltingPoint: 1083, thermalCond: 390,   resistivity: 1.7, mrrFactor: 2.0,  finishFactor: 0.6  },
  CuBe2:        { name: "Beryllium Copper",     meltingPoint: 1050, thermalCond: 118,   resistivity: 7.0, mrrFactor: 1.3,  finishFactor: 0.9  },
  Ti6Al4V:      { name: "Ti-6Al-4V",           meltingPoint: 1660, thermalCond: 6.7,   resistivity: 178, mrrFactor: 0.5,  finishFactor: 1.3  },
  "WC-Co":      { name: "Tungsten Carbide",    meltingPoint: 2870, thermalCond: 110,   resistivity: 20,  mrrFactor: 0.3,  finishFactor: 1.5  },
  Inconel718:   { name: "Inconel 718",          meltingPoint: 1336, thermalCond: 11.4,  resistivity: 125, mrrFactor: 0.6,  finishFactor: 1.2  },
  Hastelloy:    { name: "Hastelloy X",          meltingPoint: 1355, thermalCond: 9.1,   resistivity: 116, mrrFactor: 0.55, finishFactor: 1.25 },
};

// ---------------------------------------------------------------------------
// VDI 3400 Surface Finish Scale
// ---------------------------------------------------------------------------

const VDI_SCALE: Record<number, { ra: number; description: string }> = {
  0:  { ra: 0.1,  description: "Mirror polish" },
  3:  { ra: 0.14, description: "Ultra-fine" },
  6:  { ra: 0.2,  description: "Very fine" },
  9:  { ra: 0.28, description: "Fine" },
  12: { ra: 0.4,  description: "Semi-fine" },
  15: { ra: 0.56, description: "Smooth" },
  18: { ra: 0.8,  description: "Semi-smooth" },
  21: { ra: 1.12, description: "Light texture" },
  24: { ra: 1.6,  description: "Standard" },
  27: { ra: 2.24, description: "Medium texture" },
  30: { ra: 3.15, description: "Moderate" },
  33: { ra: 4.5,  description: "Rough texture" },
  36: { ra: 6.3,  description: "Rough" },
  39: { ra: 9.0,  description: "Very rough" },
  42: { ra: 12.5, description: "Coarse" },
  45: { ra: 18.0, description: "Very coarse" },
};

// ---------------------------------------------------------------------------
// Result Types
// ---------------------------------------------------------------------------

export interface SinkerEDMResult {
  mrr: number;              // mm³/min
  wearRatio: number;        // % electrode volume loss per workpiece volume
  surfaceRoughness: number; // Ra µm
  sparkGap: number;         // µm overburn per side
  hazDepth: number;         // mm heat-affected zone
  pulseEnergy: number;      // mJ per pulse
  dutyCycle: number;        // 0-1
  frequency: number;        // Hz
  burnTime: number;         // hours for given cavity
  electrodesNeeded: number;
  vdiEquivalent: number;    // nearest VDI 3400 class
  warnings: string[];
  recommendations: string[];
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

class SinkerEDMCalculatorEngineImpl {

  /**
   * Calculate sinker EDM parameters from pulse settings.
   */
  calculate(params: {
    electrodeMaterial?: string;
    workpieceMaterial?: string;
    peakCurrent?: number;       // A (default 25)
    pulseOn?: number;           // µs (default 100)
    pulseOff?: number;          // µs (default 50)
    gapVoltage?: number;        // V (default 80)
    electrodeArea?: number;     // mm² (default 625 = 25×25)
    cavityDepth?: number;       // mm (default 15)
    targetVDI?: number;         // VDI 3400 class
    polarity?: "positive" | "negative";
  }): SinkerEDMResult {
    const electrode = ELECTRODE_MATERIALS[params.electrodeMaterial ?? "graphite"]
      ?? ELECTRODE_MATERIALS.graphite;
    const workpiece = WORKPIECE_MATERIALS[params.workpieceMaterial ?? "D2"]
      ?? WORKPIECE_MATERIALS.D2;

    const peakCurrent = params.peakCurrent ?? 25;
    const pulseOn = params.pulseOn ?? 100;       // µs
    const pulseOff = params.pulseOff ?? 50;      // µs
    const gapVoltage = params.gapVoltage ?? 80;  // V
    const electrodeArea = params.electrodeArea ?? 625;
    const cavityDepth = params.cavityDepth ?? 15;
    const polarity = params.polarity ?? "positive";
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Duty cycle
    const dutyCycle = pulseOn / (pulseOn + pulseOff);

    // Frequency
    const frequency = 1_000_000 / (pulseOn + pulseOff); // µs → Hz

    // Pulse energy (mJ)
    const pulseEnergy = gapVoltage * peakCurrent * pulseOn / 1000; // V × A × µs / 1000 = mJ

    // MRR: k × I × ton × duty × area-factor × material factors
    const mrrConstant = 0.00015 * electrode.mrrFactor;
    const mrr = mrrConstant * peakCurrent * pulseOn * dutyCycle
      * (electrodeArea / 100) * workpiece.mrrFactor;

    // Electrode wear ratio (%)
    const polarityFactor = polarity === "positive" ? 1.0 : 0.6;
    const baseWear = 15 * electrode.wearFactor * polarityFactor;
    const wearRatio = baseWear * (1 + peakCurrent / 100) * (pulseOn / 200);

    // Surface roughness from pulse energy
    const calculatedRa = 0.5 * Math.pow(pulseEnergy, 0.4) / electrode.finishFactor / workpiece.finishFactor;

    // VDI target clamping
    let targetRa = calculatedRa;
    if (params.targetVDI !== undefined) {
      const vdiTarget = VDI_SCALE[params.targetVDI];
      if (vdiTarget) {
        targetRa = Math.max(calculatedRa, vdiTarget.ra * 0.8);
      }
    }

    // Find nearest VDI class
    const vdiEntries = Object.entries(VDI_SCALE);
    let nearestVDI = 30;
    let minDiff = Infinity;
    for (const [vdi, data] of vdiEntries) {
      const diff = Math.abs(data.ra - targetRa);
      if (diff < minDiff) {
        minDiff = diff;
        nearestVDI = parseInt(vdi);
      }
    }

    // Spark gap (overburn) in µm
    const sparkGap = 5 + (peakCurrent * 0.5) + (pulseOn * 0.02);

    // HAZ depth (mm)
    const hazDepth = 0.01 * Math.sqrt(pulseEnergy);

    // Burn time estimate
    const cavityVolume = electrodeArea * cavityDepth;
    const burnTime = mrr > 0 ? cavityVolume / mrr / 60 : Infinity; // hours

    // Electrodes needed
    const volumePerElectrode = wearRatio > 0
      ? electrodeArea * cavityDepth * (100 / wearRatio) / 100
      : Infinity;
    const electrodesNeeded = volumePerElectrode > 0
      ? Math.ceil(cavityVolume / volumePerElectrode)
      : 1;

    // Warnings
    if (hazDepth > 0.05) {
      warnings.push(`HAZ depth ${(hazDepth * 1000).toFixed(0)} µm — consider reducing current for critical surfaces`);
    }
    if (peakCurrent > 50) {
      warnings.push("High peak current — increased electrode wear and HAZ risk");
    }
    if (dutyCycle > 0.8) {
      warnings.push("Very high duty cycle — risk of arcing and DC arc damage");
    }
    if (wearRatio > 40) {
      warnings.push(`High electrode wear (${wearRatio.toFixed(0)}%) — consider copper-tungsten or silver-tungsten electrode`);
    }
    if (workpiece.meltingPoint > 2000) {
      warnings.push("Refractory material — expect slow MRR and high electrode wear");
    }

    // Recommendations
    if (targetRa < 1.0 && electrode.finishFactor < 1.0) {
      recommendations.push("Switch to fine-grain graphite or copper-tungsten for better surface finish");
    }
    if (burnTime > 10) {
      recommendations.push("Long burn time — consider orbiting to improve flushing and reduce electrode count");
    }
    if (electrodesNeeded > 3) {
      recommendations.push(`${electrodesNeeded} electrodes needed — consider roughing with graphite, finishing with copper-tungsten`);
    }

    return {
      mrr: Math.round(mrr * 10) / 10,
      wearRatio: Math.round(wearRatio * 10) / 10,
      surfaceRoughness: Math.round(targetRa * 100) / 100,
      sparkGap: Math.round(sparkGap),
      hazDepth: Math.round(hazDepth * 1000) / 1000,
      pulseEnergy: Math.round(pulseEnergy * 10) / 10,
      dutyCycle: Math.round(dutyCycle * 1000) / 1000,
      frequency: Math.round(frequency),
      burnTime: Math.round(burnTime * 100) / 100,
      electrodesNeeded,
      vdiEquivalent: nearestVDI,
      warnings,
      recommendations,
    };
  }

  /**
   * List available electrode materials.
   */
  listElectrodeMaterials(): Array<{ id: string; name: string; mrrFactor: number; wearFactor: number; finishFactor: number }> {
    return Object.entries(ELECTRODE_MATERIALS).map(([id, m]) => ({
      id, name: m.name, mrrFactor: m.mrrFactor, wearFactor: m.wearFactor, finishFactor: m.finishFactor,
    }));
  }

  /**
   * List available workpiece materials with thermal properties.
   */
  listWorkpieceMaterials(): Array<{ id: string; name: string; meltingPoint: number; thermalCond: number; mrrFactor: number }> {
    return Object.entries(WORKPIECE_MATERIALS).map(([id, m]) => ({
      id, name: m.name, meltingPoint: m.meltingPoint, thermalCond: m.thermalCond, mrrFactor: m.mrrFactor,
    }));
  }

  /**
   * List VDI 3400 surface finish scale.
   */
  listVDIScale(): Array<{ vdi: number; ra: number; description: string }> {
    return Object.entries(VDI_SCALE).map(([vdi, data]) => ({
      vdi: parseInt(vdi), ra: data.ra, description: data.description,
    }));
  }

  /**
   * Recommend pulse settings for a target surface finish.
   */
  recommendSettings(params: {
    targetRa: number;           // µm
    workpieceMaterial?: string;
    electrodeMaterial?: string;
    electrodeArea?: number;     // mm²
    priority?: "speed" | "finish" | "wear";
  }): {
    peakCurrent: number;
    pulseOn: number;
    pulseOff: number;
    gapVoltage: number;
    expectedRa: number;
    expectedMRR: number;
    rationale: string;
  } {
    const targetRa = params.targetRa;
    const priority = params.priority ?? "finish";
    const electrode = ELECTRODE_MATERIALS[params.electrodeMaterial ?? "graphite"]
      ?? ELECTRODE_MATERIALS.graphite;

    // Reverse-engineer pulse energy from target Ra:
    // Ra = 0.5 × E^0.4 / finishFactor → E = ((Ra × finishFactor) / 0.5)^2.5
    const requiredEnergy = Math.pow((targetRa * electrode.finishFactor) / 0.5, 2.5);

    // Select parameters based on priority
    let peakCurrent: number, pulseOn: number, pulseOff: number, gapVoltage: number;

    if (priority === "speed") {
      // Higher current, shorter pulses
      gapVoltage = 80;
      peakCurrent = Math.max(5, Math.min(80, requiredEnergy / 8));
      pulseOn = Math.max(10, requiredEnergy * 1000 / (gapVoltage * peakCurrent));
      pulseOff = pulseOn * 0.4;
    } else if (priority === "wear") {
      // Lower current, longer pulses, higher voltage
      gapVoltage = 100;
      peakCurrent = Math.max(3, Math.min(30, requiredEnergy / 15));
      pulseOn = Math.max(10, requiredEnergy * 1000 / (gapVoltage * peakCurrent));
      pulseOff = pulseOn * 0.8;
    } else {
      // Balanced for finish
      gapVoltage = 60;
      peakCurrent = Math.max(2, Math.min(40, requiredEnergy / 10));
      pulseOn = Math.max(5, requiredEnergy * 1000 / (gapVoltage * peakCurrent));
      pulseOff = pulseOn * 0.6;
    }

    // Round to practical values
    peakCurrent = Math.round(peakCurrent);
    pulseOn = Math.round(pulseOn);
    pulseOff = Math.round(pulseOff);

    // Verify expected Ra
    const actualEnergy = gapVoltage * peakCurrent * pulseOn / 1000;
    const expectedRa = 0.5 * Math.pow(actualEnergy, 0.4) / electrode.finishFactor;

    // Estimate MRR
    const electrodeArea = params.electrodeArea ?? 625;
    const dutyCycle = pulseOn / (pulseOn + pulseOff);
    const expectedMRR = 0.00015 * electrode.mrrFactor * peakCurrent * pulseOn * dutyCycle * (electrodeArea / 100);

    const rationale = priority === "speed"
      ? "Optimized for maximum MRR — higher current, shorter off-time"
      : priority === "wear"
        ? "Optimized for minimum electrode wear — lower current, longer off-time for cooling"
        : "Optimized for surface finish — lower voltage and current for finer sparks";

    return {
      peakCurrent, pulseOn, pulseOff, gapVoltage,
      expectedRa: Math.round(expectedRa * 100) / 100,
      expectedMRR: Math.round(expectedMRR * 10) / 10,
      rationale,
    };
  }
}

export const sinkerEDMCalculatorEngine = new SinkerEDMCalculatorEngineImpl();
