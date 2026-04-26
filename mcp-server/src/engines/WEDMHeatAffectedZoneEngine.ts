/**
 * WEDMHeatAffectedZoneEngine — Heat Affected Zone depth and microstructure prediction
 *
 * WEDM-NEXT-MS0 / U-WN07
 *
 * Predicts HAZ characteristics from EDM parameters using thermal diffusion
 * physics and empirical microstructure models. HAZ is the region below the
 * recast layer where material properties are altered by thermal cycling.
 *
 * Physics foundation:
 * - Temperature profile: T(z,t) = (Q/ρcₚ) × erfc(z / 2√(αt)) — Carslaw-Jaeger
 * - HAZ boundary: where T_peak > A₁ transformation temperature
 * - Thermal diffusivity α = k / (ρ × cₚ)
 * - Cooling rate determines microstructure (martensite vs bainite vs pearlite)
 *
 * Literature:
 * - Klocke 2013 §8.3 — subsurface damage in EDM
 * - Ho & Newman 2003 — metallurgical alterations
 * - Ekmekci et al. 2009 — white layer and HAZ characterization
 * - Kruth 1985 — thermal modeling of EDM process
 *
 * @module engines/WEDMHeatAffectedZoneEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface HAZInput {
  material: string;
  thicknessMm: number;
  peakCurrentA: number;
  voltageV: number;
  pulseOnUs: number;
  pulseOffUs: number;
  wireDiameterMm: number;
  wireMaterial: "brass" | "zinc_coated" | "molybdenum" | "tungsten";
  flushingMode?: "submerged" | "upper_lower" | "coaxial" | "none";
  numPasses?: number;
  passType?: "rough" | "skim1" | "skim2" | "skim3" | "finish";
  targetHardnessHRC?: number;
}

export interface HAZPrediction {
  hazDepthUm: number;
  recastDepthUm: number;
  totalAffectedDepthUm: number;
  temperatureProfile: Array<{ depthUm: number; peakTempC: number }>;
  microstructure: {
    zone: "recast" | "haz_hard" | "haz_tempered" | "base";
    depthRangeUm: [number, number];
    hardnessHRC: number;
    grainSizeUm: number;
    phase: string;
  }[];
  coolingRateCperS: number;
  thermalDamageRisk: "low" | "moderate" | "high" | "critical";
  fatigueLifeReduction: number;
  mitigationSuggestions: string[];
  confidence: number;
  source: string;
}

interface MaterialThermal {
  name: string;
  k_W_mK: number;           // Thermal conductivity
  rho_kg_m3: number;        // Density
  cp_J_kgK: number;         // Specific heat
  alpha_mm2_s: number;      // Thermal diffusivity (derived)
  A1_C: number;             // Austenite start temperature
  A3_C: number;             // Austenite finish temperature
  melt_C: number;           // Melting point
  Ms_C: number;             // Martensite start temperature
  baseHardnessHRC: number;  // Base material hardness
}

// ============================================================================
// MATERIAL DATABASE
// ============================================================================

const MATERIAL_THERMAL: Record<string, MaterialThermal> = {
  steel: {
    name: "Carbon Steel",
    k_W_mK: 50, rho_kg_m3: 7850, cp_J_kgK: 480,
    alpha_mm2_s: 13.3, A1_C: 727, A3_C: 850, melt_C: 1500, Ms_C: 350,
    baseHardnessHRC: 25,
  },
  tool_steel: {
    name: "Tool Steel (D2/A2)",
    k_W_mK: 25, rho_kg_m3: 7700, cp_J_kgK: 460,
    alpha_mm2_s: 7.1, A1_C: 788, A3_C: 880, melt_C: 1420, Ms_C: 180,
    baseHardnessHRC: 60,
  },
  stainless: {
    name: "Stainless Steel (304/316)",
    k_W_mK: 16, rho_kg_m3: 8000, cp_J_kgK: 500,
    alpha_mm2_s: 4.0, A1_C: 800, A3_C: 900, melt_C: 1450, Ms_C: -50,
    baseHardnessHRC: 20,
  },
  inconel: {
    name: "Inconel 718",
    k_W_mK: 11, rho_kg_m3: 8190, cp_J_kgK: 435,
    alpha_mm2_s: 3.1, A1_C: 650, A3_C: 980, melt_C: 1340, Ms_C: 100,
    baseHardnessHRC: 40,
  },
  titanium: {
    name: "Titanium Ti-6Al-4V",
    k_W_mK: 7, rho_kg_m3: 4430, cp_J_kgK: 560,
    alpha_mm2_s: 2.8, A1_C: 600, A3_C: 995, melt_C: 1660, Ms_C: 800,
    baseHardnessHRC: 36,
  },
  aluminum: {
    name: "Aluminum 6061",
    k_W_mK: 167, rho_kg_m3: 2700, cp_J_kgK: 896,
    alpha_mm2_s: 69.0, A1_C: 500, A3_C: 580, melt_C: 650, Ms_C: 0,
    baseHardnessHRC: 15,
  },
  carbide: {
    name: "Tungsten Carbide",
    k_W_mK: 84, rho_kg_m3: 15600, cp_J_kgK: 290,
    alpha_mm2_s: 18.6, A1_C: 1200, A3_C: 1400, melt_C: 2870, Ms_C: 0,
    baseHardnessHRC: 75,
  },
  copper: {
    name: "Copper",
    k_W_mK: 400, rho_kg_m3: 8960, cp_J_kgK: 385,
    alpha_mm2_s: 116.0, A1_C: 400, A3_C: 500, melt_C: 1085, Ms_C: 0,
    baseHardnessHRC: 10,
  },
};

// Material alias resolution
const MATERIAL_ALIASES: Record<string, string> = {
  "d2": "tool_steel", "a2": "tool_steel", "m2": "tool_steel", "h13": "tool_steel",
  "s7": "tool_steel", "o1": "tool_steel", "w1": "tool_steel",
  "304": "stainless", "316": "stainless", "17-4": "stainless", "440c": "stainless",
  "625": "inconel", "718": "inconel", "x750": "inconel", "hastelloy": "inconel",
  "ti64": "titanium", "ti-6al-4v": "titanium", "grade5": "titanium",
  "6061": "aluminum", "7075": "aluminum", "2024": "aluminum",
  "wc": "carbide", "tungsten_carbide": "carbide",
  "c110": "copper", "c101": "copper", "beryllium_copper": "copper",
  "1045": "steel", "4140": "steel", "4340": "steel", "8620": "steel",
};

// ============================================================================
// ENGINE
// ============================================================================

class WEDMHeatAffectedZoneEngine {
  /**
   * Predict HAZ depth and microstructure from EDM parameters
   */
  predict(input: HAZInput): HAZPrediction {
    const mat = this.getMaterial(input.material);
    const energy = this.computeSparkEnergy(input);
    const thermalPenetration = this.computeThermalPenetration(input, mat, energy);

    // Compute temperature profile
    const tempProfile = this.computeTemperatureProfile(mat, energy, input.pulseOnUs);

    // Determine zone boundaries
    const recastDepth = this.estimateRecastDepth(tempProfile, mat);
    const hazDepth = this.estimateHAZDepth(tempProfile, mat);
    const totalDepth = recastDepth + hazDepth;

    // Compute cooling rate (critical for microstructure)
    const coolingRate = this.computeCoolingRate(mat, energy, input.pulseOffUs);

    // Generate microstructure zones
    const microstructure = this.predictMicrostructure(
      mat, recastDepth, hazDepth, coolingRate, input.passType
    );

    // Risk assessment
    const risk = this.assessThermalDamageRisk(hazDepth, coolingRate, mat, input.passType, energy);
    const fatigueReduction = this.estimateFatigueLifeReduction(hazDepth, microstructure);
    const mitigations = this.generateMitigations(risk, input, hazDepth);

    // Confidence based on material match and parameter validity
    const confidence = this.computeConfidence(input, mat);

    return {
      hazDepthUm: Math.max(0, hazDepth),
      recastDepthUm: Math.max(0, recastDepth),
      totalAffectedDepthUm: Math.max(0, totalDepth),
      temperatureProfile: tempProfile,
      microstructure,
      coolingRateCperS: coolingRate,
      thermalDamageRisk: risk,
      fatigueLifeReduction: Math.min(1, Math.max(0, fatigueReduction)),
      mitigationSuggestions: mitigations,
      confidence,
      source: "WEDMHeatAffectedZoneEngine:thermal_diffusion",
    };
  }

  /**
   * Estimate stock allowance needed to remove HAZ
   */
  recommendStockAllowance(input: HAZInput): {
    minimumAllowanceMm: number;
    recommendedAllowanceMm: number;
    safetyFactor: number;
    rationale: string;
  } {
    const prediction = this.predict(input);
    const totalUm = prediction.totalAffectedDepthUm;

    // Convert to mm and add safety margin
    const minMm = totalUm / 1000;
    const safetyFactor = prediction.thermalDamageRisk === "critical" ? 2.0 :
                         prediction.thermalDamageRisk === "high" ? 1.5 :
                         prediction.thermalDamageRisk === "moderate" ? 1.25 : 1.1;
    const recMm = minMm * safetyFactor;

    return {
      minimumAllowanceMm: Math.ceil(minMm * 100) / 100,
      recommendedAllowanceMm: Math.ceil(recMm * 100) / 100,
      safetyFactor,
      rationale: `HAZ depth ${totalUm.toFixed(1)}µm with ${prediction.thermalDamageRisk} risk. ` +
                 `Safety factor ${safetyFactor}× applied for ${prediction.microstructure[0]?.phase || 'unknown'} phase.`,
    };
  }

  /**
   * Compare HAZ impact across multiple parameter sets
   */
  compareParameters(inputs: HAZInput[]): {
    predictions: HAZPrediction[];
    bestIndex: number;
    comparison: {
      parameter: string;
      values: number[];
      winner: number;
    }[];
  } {
    const predictions = inputs.map(i => this.predict(i));

    // Score each: lower HAZ, lower risk, lower fatigue reduction is better
    const scores = predictions.map((p, i) => {
      const hazScore = 1 - Math.min(1, p.hazDepthUm / 100);
      const riskScore = p.thermalDamageRisk === "low" ? 1 :
                        p.thermalDamageRisk === "moderate" ? 0.66 :
                        p.thermalDamageRisk === "high" ? 0.33 : 0;
      const fatigueScore = 1 - p.fatigueLifeReduction;
      return { index: i, total: hazScore * 0.4 + riskScore * 0.3 + fatigueScore * 0.3 };
    });

    const bestIndex = scores.sort((a, b) => b.total - a.total)[0].index;

    return {
      predictions,
      bestIndex,
      comparison: [
        { parameter: "HAZ Depth (µm)", values: predictions.map(p => p.hazDepthUm), winner: predictions.indexOf(predictions.reduce((a, b) => a.hazDepthUm < b.hazDepthUm ? a : b)) },
        { parameter: "Cooling Rate (°C/s)", values: predictions.map(p => p.coolingRateCperS), winner: predictions.indexOf(predictions.reduce((a, b) => a.coolingRateCperS < b.coolingRateCperS ? a : b)) },
        { parameter: "Fatigue Reduction", values: predictions.map(p => p.fatigueLifeReduction), winner: predictions.indexOf(predictions.reduce((a, b) => a.fatigueLifeReduction < b.fatigueLifeReduction ? a : b)) },
      ],
    };
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  private getMaterial(name: string): MaterialThermal {
    const key = name.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const resolved = MATERIAL_ALIASES[key] || key;
    return MATERIAL_THERMAL[resolved] || MATERIAL_THERMAL.tool_steel;
  }

  private computeSparkEnergy(input: HAZInput): number {
    // Energy per spark in millijoules
    // E = V × I × t_on (simplified — actual is integral over pulse shape)
    return (input.voltageV * input.peakCurrentA * input.pulseOnUs) / 1000;
  }

  private computeThermalPenetration(
    input: HAZInput,
    mat: MaterialThermal,
    energyMJ: number
  ): number {
    // Thermal penetration depth ≈ 2√(α × t)
    // α in mm²/s, t in seconds
    const t_s = input.pulseOnUs * 1e-6;
    const penetration_mm = 2 * Math.sqrt(mat.alpha_mm2_s * t_s);
    return penetration_mm * 1000; // Convert to µm
  }

  private computeTemperatureProfile(
    mat: MaterialThermal,
    energyMJ: number,
    pulseOnUs: number
  ): Array<{ depthUm: number; peakTempC: number }> {
    const profile: Array<{ depthUm: number; peakTempC: number }> = [];

    // Empirical WEDM temperature model calibrated to published data
    // Ho & Newman 2003, Ekmekci 2009: HAZ depths 10-60µm typical
    //
    // Surface temperature scales with power density (energy/area/time)
    // T_surface ∝ √(E × I) where E = energy in mJ
    // Calibrated: 1mJ @ 0.25mm wire → ~2000°C surface
    const baseSurfaceTemp = 1500 * Math.sqrt(energyMJ);
    const materialFactor = 1.0 / Math.sqrt(mat.k_W_mK / 50); // Normalize to steel k=50
    const T_surface = Math.min(mat.melt_C * 1.8, 25 + baseSurfaceTemp * materialFactor);

    // Characteristic thermal penetration depth
    // Empirical: charLength ∝ √(α × t) with calibration factor
    // α in mm²/s, t in seconds → √(α×t) in mm → ×1000 for µm
    // Literature calibration: Ho & Newman 2003 report HAZ 10-60µm typical
    // Multiply by ~5 to account for cumulative heating (multiple sparks/area)
    // Energy scaling: more energy → larger affected volume → deeper penetration
    const t_s = pulseOnUs * 1e-6;
    const rawPenetration = Math.sqrt(mat.alpha_mm2_s * t_s) * 1000; // µm
    const energyScale = 1 + 0.3 * Math.sqrt(energyMJ); // Higher energy → deeper
    const charLength = Math.max(5, rawPenetration * 5 * energyScale); // µm, minimum 5µm

    // Temperature profile follows error function
    // Use 1µm resolution for first 20µm (steep gradient region), then 5µm
    for (let z = 0; z <= 20; z += 1) {
      const dimlessZ = z / charLength;
      const erfcVal = this.erfc(dimlessZ);
      const T_z = 25 + (T_surface - 25) * erfcVal;
      profile.push({ depthUm: z, peakTempC: Math.max(25, T_z) });
    }
    for (let z = 25; z <= 150; z += 5) {
      const dimlessZ = z / charLength;
      const erfcVal = this.erfc(dimlessZ);
      const T_z = 25 + (T_surface - 25) * erfcVal;
      profile.push({ depthUm: z, peakTempC: Math.max(25, T_z) });
    }

    return profile;
  }

  private erfc(x: number): number {
    // Complementary error function approximation (Abramowitz & Stegun 7.1.26)
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    const absX = Math.abs(x);
    const t = 1 / (1 + p * absX);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
    return 1 - sign * y;
  }

  private estimateRecastDepth(
    profile: Array<{ depthUm: number; peakTempC: number }>,
    mat: MaterialThermal
  ): number {
    // Recast layer = region where T > T_melt
    for (let i = 0; i < profile.length; i++) {
      if (profile[i].peakTempC < mat.melt_C) {
        return i > 0 ? profile[i - 1].depthUm : 0;
      }
    }
    return profile[profile.length - 1].depthUm;
  }

  private estimateHAZDepth(
    profile: Array<{ depthUm: number; peakTempC: number }>,
    mat: MaterialThermal
  ): number {
    // HAZ = region where T_melt > T > A1 (austenite transformation)
    let hazStart = -1;
    for (let i = 0; i < profile.length; i++) {
      if (hazStart < 0 && profile[i].peakTempC < mat.melt_C) {
        hazStart = i;
      }
      if (hazStart >= 0 && profile[i].peakTempC < mat.A1_C) {
        return profile[i].depthUm - profile[hazStart].depthUm;
      }
    }
    return hazStart >= 0 ? profile[profile.length - 1].depthUm - profile[hazStart].depthUm : 0;
  }

  private computeCoolingRate(
    mat: MaterialThermal,
    energyMJ: number,
    pulseOffUs: number
  ): number {
    // Cooling rate during pulse-off: heat diffuses into bulk
    // Higher thermal diffusivity → faster cooling → more martensite
    // Literature: WEDM cooling rates typically 10³-10⁶ °C/s (Klocke 2013)
    //
    // Empirical model calibrated to preserve material differentiation:
    // Base rate ~10⁵ °C/s for steel (α=13), scales with √α
    const steelAlpha = 13.3; // Reference: carbon steel
    const alphaRatio = mat.alpha_mm2_s / steelAlpha;

    // Higher diffusivity → faster cooling
    const baseCoolingRate = 1e5; // °C/s for steel
    const coolingRate = baseCoolingRate * Math.sqrt(alphaRatio);

    // Energy effect: more energy → larger melt pool → slower cooling
    const energyFactor = 1 / (1 + 0.1 * energyMJ);

    // Pulse-off effect: longer off-time → more cooling
    const offTimeFactor = 1 + (pulseOffUs - 20) * 0.01;

    return Math.max(1e3, Math.min(5e5, coolingRate * energyFactor * Math.max(0.5, offTimeFactor)));
  }

  private predictMicrostructure(
    mat: MaterialThermal,
    recastUm: number,
    hazUm: number,
    coolingRate: number,
    passType?: string
  ): HAZPrediction["microstructure"] {
    const zones: HAZPrediction["microstructure"] = [];
    const isFinish = passType === "finish" || passType === "skim3";

    // Zone 1: Recast layer (resolidified, typically hard/brittle)
    if (recastUm > 0) {
      zones.push({
        zone: "recast",
        depthRangeUm: [0, recastUm],
        hardnessHRC: Math.min(70, mat.baseHardnessHRC + 15),
        grainSizeUm: 0.5, // Fine dendritic structure
        phase: this.predictPhase(mat, coolingRate, "recast"),
      });
    }

    // Zone 2: Hard HAZ (quenched, above Ms)
    const hardHAZDepth = hazUm * 0.6;
    if (hardHAZDepth > 0) {
      zones.push({
        zone: "haz_hard",
        depthRangeUm: [recastUm, recastUm + hardHAZDepth],
        hardnessHRC: Math.min(68, mat.baseHardnessHRC + 10),
        grainSizeUm: 2,
        phase: this.predictPhase(mat, coolingRate, "hard_haz"),
      });
    }

    // Zone 3: Tempered HAZ (partial transformation)
    const temperedHAZDepth = hazUm * 0.4;
    if (temperedHAZDepth > 0) {
      zones.push({
        zone: "haz_tempered",
        depthRangeUm: [recastUm + hardHAZDepth, recastUm + hazUm],
        hardnessHRC: Math.max(mat.baseHardnessHRC - 5, mat.baseHardnessHRC * 0.9),
        grainSizeUm: 5,
        phase: this.predictPhase(mat, coolingRate, "tempered_haz"),
      });
    }

    // Zone 4: Base material
    zones.push({
      zone: "base",
      depthRangeUm: [recastUm + hazUm, Infinity],
      hardnessHRC: mat.baseHardnessHRC,
      grainSizeUm: 10,
      phase: "original",
    });

    return zones;
  }

  private predictPhase(mat: MaterialThermal, coolingRate: number, zone: string): string {
    // CCT diagram approximation
    if (mat.Ms_C < 0) return "austenite"; // Stainless stays austenitic
    if (mat.name.includes("Aluminum")) return "solution_treated";
    if (mat.name.includes("Copper")) return "annealed";
    if (mat.name.includes("Carbide")) return "wc_co_matrix";

    if (zone === "recast") {
      return coolingRate > 1e5 ? "untempered_martensite" : "martensite_retained_austenite";
    }
    if (zone === "hard_haz") {
      return coolingRate > 5e4 ? "martensite" : coolingRate > 1e4 ? "bainite" : "fine_pearlite";
    }
    if (zone === "tempered_haz") {
      return coolingRate > 1e4 ? "tempered_martensite" : "pearlite_ferrite";
    }
    return "original";
  }

  private assessThermalDamageRisk(
    hazUm: number,
    coolingRate: number,
    mat: MaterialThermal,
    passType?: string,
    energyMJ?: number
  ): "low" | "moderate" | "high" | "critical" {
    const isFinish = passType === "finish" || passType === "skim3";
    const thresholds = isFinish ? [5, 15, 30] : [15, 40, 80];

    // Material difficulty factor: low-conductivity superalloys are harder to machine
    const difficultMaterial = mat.k_W_mK < 15; // inconel, titanium
    const energy = energyMJ ?? 1;

    // High cooling rate in hardenable steels with significant energy → crack risk
    // Threshold raised to 1.5e5 to avoid false positives on light finish passes
    const crackRisk = mat.Ms_C > 100 && coolingRate > 1.5e5 && energy > 1;

    // Energy-based risk escalation for difficult materials
    const energyRisk = difficultMaterial && energy > 10;

    if (hazUm > thresholds[2] || crackRisk || energyRisk) return "critical";
    if (hazUm > thresholds[1] || (difficultMaterial && energy > 5)) return "high";
    if (hazUm > thresholds[0]) return "moderate";
    return "low";
  }

  private estimateFatigueLifeReduction(
    hazUm: number,
    microstructure: HAZPrediction["microstructure"]
  ): number {
    // Fatigue life reduction based on HAZ depth and brittleness
    // Empirical: ~2% reduction per 10µm HAZ for tool steels
    const baseReduction = hazUm * 0.002;

    // Additional penalty for untempered martensite (crack initiation sites)
    const hasUntemperedMartensite = microstructure.some(
      z => z.phase.includes("untempered")
    );
    const martensitePenalty = hasUntemperedMartensite ? 0.15 : 0;

    return Math.min(0.8, baseReduction + martensitePenalty);
  }

  private generateMitigations(
    risk: string,
    input: HAZInput,
    hazUm: number
  ): string[] {
    const suggestions: string[] = [];

    if (risk === "critical" || risk === "high") {
      suggestions.push("Add stress relief heat treatment (150-200°C for 2h)");
      suggestions.push("Use multiple skim passes to progressively reduce HAZ");
    }

    if (hazUm > 40) {
      suggestions.push("Reduce peak current to lower thermal input");
      suggestions.push("Reduce pulse on-time to limit heat penetration");
    }

    if (input.flushingMode === "none" || !input.flushingMode) {
      suggestions.push("Enable submerged flushing for improved heat extraction");
    }

    if (input.passType === "rough" && hazUm > 20) {
      suggestions.push("Plan finish stock allowance ≥" + Math.ceil(hazUm * 1.5 / 10) * 10 + "µm");
    }

    if (suggestions.length === 0) {
      suggestions.push("Current parameters produce acceptable HAZ depth");
    }

    return suggestions;
  }

  private computeConfidence(input: HAZInput, mat: MaterialThermal): number {
    let conf = 0.75; // Base confidence

    // Penalty for unknown material
    if (mat.name === MATERIAL_THERMAL.tool_steel.name &&
        !input.material.toLowerCase().includes("tool")) {
      conf -= 0.15;
    }

    // Penalty for extreme parameters
    if (input.peakCurrentA > 20 || input.peakCurrentA < 1) conf -= 0.1;
    if (input.pulseOnUs > 15 || input.pulseOnUs < 0.5) conf -= 0.1;

    // Boost for complete input
    if (input.flushingMode) conf += 0.05;
    if (input.passType) conf += 0.05;

    return Math.min(0.95, Math.max(0.3, conf));
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const wedmHeatAffectedZoneEngine = new WEDMHeatAffectedZoneEngine();
