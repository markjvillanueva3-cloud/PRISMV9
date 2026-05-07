/**
 * WEDMThermalFieldEngine — FEM-based thermal field prediction during cutting
 * @milestone WEDM-NEXT-MS0
 * @unit U-WN05
 *
 * Predicts temperature distribution in workpiece during WEDM using simplified
 * finite element methods. Models heat input from spark discharge, conduction
 * through material, and cooling from flushing fluid.
 */

export interface ThermalMaterialProps {
  name: string;
  thermalConductivity: number;    // W/(m·K)
  specificHeat: number;           // J/(kg·K)
  density: number;                // kg/m³
  meltingPoint: number;           // °C
  thermalDiffusivity?: number;    // m²/s (computed if not provided)
}

export interface SparkParameters {
  pulseOnTime: number;            // µs
  pulseOffTime: number;           // µs
  gapVoltage: number;             // V
  peakCurrent: number;            // A
  sparkGap: number;               // mm
  frequency?: number;             // Hz (computed from on/off times)
}

export interface FlushingConditions {
  flushingPressure: number;       // MPa
  fluidTemperature: number;       // °C
  flowRate?: number;              // L/min
  submerged: boolean;
}

export interface ThermalFieldInput {
  material: ThermalMaterialProps | string;
  thickness: number;              // mm
  sparkParams: SparkParameters;
  flushing: FlushingConditions;
  cutLength?: number;             // mm (profile length)
  ambientTemp?: number;           // °C
}

export interface TemperatureNode {
  x: number;                      // mm from spark center
  y: number;                      // mm depth into material
  temperature: number;            // °C
  phase: 'solid' | 'melted' | 'vaporized';
}

export interface ThermalFieldResult {
  peakTemperature: number;        // °C at spark center
  meltPoolRadius: number;         // mm
  heatAffectedZoneDepth: number;  // mm (above recrystallization temp)
  temperatureField: TemperatureNode[];
  coolingRate: number;            // °C/s
  thermalGradient: number;        // °C/mm at HAZ boundary
  energyBalance: {
    sparkEnergy: number;          // J per pulse
    conductedHeat: number;        // J into workpiece
    flushingHeat: number;         // J removed by fluid
    materialRemoval: number;      // J for melting/vaporization
  };
  warnings: string[];
  recommendations: string[];
}

export interface TransientAnalysis {
  timeSteps: number[];            // µs
  temperatures: number[][];       // [timeStep][nodeIndex]
  peakPerPulse: number[];
  averageTemperature: number;
  thermalCycling: {
    heatingRate: number;          // °C/µs
    coolingRate: number;          // °C/µs
    cycleCount: number;           // per second
  };
}

const MATERIAL_DB: Record<string, ThermalMaterialProps> = {
  steel: { name: 'steel', thermalConductivity: 50, specificHeat: 486, density: 7850, meltingPoint: 1510 },
  stainless: { name: 'stainless', thermalConductivity: 16, specificHeat: 500, density: 8000, meltingPoint: 1450 },
  aluminum: { name: 'aluminum', thermalConductivity: 237, specificHeat: 897, density: 2700, meltingPoint: 660 },
  copper: { name: 'copper', thermalConductivity: 401, specificHeat: 385, density: 8960, meltingPoint: 1085 },
  titanium: { name: 'titanium', thermalConductivity: 22, specificHeat: 523, density: 4506, meltingPoint: 1668 },
  inconel: { name: 'inconel', thermalConductivity: 11, specificHeat: 435, density: 8440, meltingPoint: 1350 },
  carbide: { name: 'carbide', thermalConductivity: 110, specificHeat: 290, density: 15630, meltingPoint: 2870 },
  d2: { name: 'd2', thermalConductivity: 20, specificHeat: 460, density: 7700, meltingPoint: 1420 },
  h13: { name: 'h13', thermalConductivity: 25, specificHeat: 460, density: 7800, meltingPoint: 1480 },
  a2: { name: 'a2', thermalConductivity: 26, specificHeat: 460, density: 7860, meltingPoint: 1430 },
};

function getMaterialProps(mat: ThermalMaterialProps | string): ThermalMaterialProps {
  if (typeof mat !== 'string') return mat;
  const key = mat.toLowerCase().replace(/[- ]/g, '');
  if (key in MATERIAL_DB) return MATERIAL_DB[key];
  if (key.includes('steel') || key.includes('4140')) return MATERIAL_DB.steel;
  if (key.includes('stainless') || key.includes('304') || key.includes('316')) return MATERIAL_DB.stainless;
  if (key.includes('aluminum') || key.includes('6061') || key.includes('7075')) return MATERIAL_DB.aluminum;
  if (key.includes('copper') || key.includes('brass')) return MATERIAL_DB.copper;
  if (key.includes('titanium') || key.includes('ti64')) return MATERIAL_DB.titanium;
  if (key.includes('inconel') || key.includes('718')) return MATERIAL_DB.inconel;
  if (key.includes('carbide') || key.includes('tungsten')) return MATERIAL_DB.carbide;
  return MATERIAL_DB.steel;
}

export class WEDMThermalFieldEngine {
  /**
   * Compute thermal field during WEDM cutting
   */
  computeThermalField(input: ThermalFieldInput): ThermalFieldResult {
    const mat = getMaterialProps(input.material);
    const spark = input.sparkParams;
    const flush = input.flushing;
    const ambientTemp = input.ambientTemp ?? 25;

    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Compute thermal diffusivity if not provided
    const alpha = mat.thermalDiffusivity ?? (mat.thermalConductivity / (mat.density * mat.specificHeat));

    // Spark frequency and duty cycle
    const cycleTime = spark.pulseOnTime + spark.pulseOffTime; // µs
    const frequency = 1e6 / cycleTime; // Hz
    const dutyCycle = spark.pulseOnTime / cycleTime;

    // Energy per spark (simplified model)
    const sparkEnergy = spark.gapVoltage * spark.peakCurrent * spark.pulseOnTime * 1e-6; // J

    // Heat partition: ~50% to workpiece, ~40% to wire, ~10% to dielectric
    const workpieceHeatFraction = 0.5;
    const heatToWorkpiece = sparkEnergy * workpieceHeatFraction;

    // Peak temperature using modified Rosenthal point heat source solution
    // For EDM, use instantaneous power during pulse, not total energy
    // T_peak = P / (4 * pi * k * r) where P is power and r is plasma radius
    const instantPower = heatToWorkpiece / (spark.pulseOnTime * 1e-6); // W
    const plasmaRadius = 0.00005; // 50µm typical EDM plasma channel radius
    const peakTempRise = instantPower / (4 * Math.PI * mat.thermalConductivity * plasmaRadius);
    const peakTemperature = Math.min(ambientTemp + peakTempRise, mat.meltingPoint * 1.5);

    // Melt pool radius estimation (where T > meltingPoint)
    // Using inverse of point source: r = Q / (4 * pi * k * (T - T_ambient))
    const meltPoolRadius = heatToWorkpiece / (4 * Math.PI * mat.thermalConductivity * (mat.meltingPoint - ambientTemp) / 1000);

    // HAZ depth: where T > 0.6 * meltingPoint (recrystallization threshold)
    const hazThreshold = mat.meltingPoint * 0.6;
    const hazDepth = heatToWorkpiece / (4 * Math.PI * mat.thermalConductivity * (hazThreshold - ambientTemp) / 1000);

    // Cooling rate during pulse-off time
    const coolingTime = spark.pulseOffTime * 1e-6; // s
    const coolingRate = (peakTemperature - flush.fluidTemperature) / Math.max(coolingTime, 1e-9);

    // Thermal gradient at HAZ boundary
    const thermalGradient = (mat.meltingPoint - hazThreshold) / Math.max(hazDepth - meltPoolRadius, 0.001);

    // Heat removed by flushing (convection model)
    const convectionCoeff = this.estimateConvectionCoeff(flush);
    const surfaceArea = Math.PI * meltPoolRadius * meltPoolRadius * 4; // mm²
    const flushingHeat = convectionCoeff * (surfaceArea / 1e6) * (peakTemperature - flush.fluidTemperature) * coolingTime;

    // Energy for material removal
    const latentHeatFusion = 270000; // J/kg typical for steel
    const removedMass = (4/3) * Math.PI * Math.pow(meltPoolRadius/1000, 3) * mat.density;
    const materialRemovalEnergy = removedMass * (mat.specificHeat * (mat.meltingPoint - ambientTemp) + latentHeatFusion);

    // Generate temperature field nodes (simplified 2D grid)
    const temperatureField = this.generateTemperatureField(
      mat, spark, meltPoolRadius, hazDepth, ambientTemp, peakTemperature
    );

    // Warnings and recommendations
    if (peakTemperature > mat.meltingPoint * 1.3) {
      warnings.push('Peak temperature significantly exceeds melting point - risk of excessive material removal');
    }
    if (hazDepth > 0.05) {
      warnings.push(`HAZ depth (${(hazDepth * 1000).toFixed(1)} µm) may affect part integrity`);
      recommendations.push('Consider reducing pulse energy or adding skim cuts');
    }
    if (coolingRate > 1e7) {
      recommendations.push('Very high cooling rate may cause micro-cracking in brittle materials');
    }
    if (!flush.submerged && mat.thermalConductivity < 20) {
      recommendations.push('Submerged cutting recommended for low thermal conductivity materials');
    }

    return {
      peakTemperature,
      meltPoolRadius: meltPoolRadius * 1000, // convert to µm for output
      heatAffectedZoneDepth: hazDepth * 1000, // µm
      temperatureField,
      coolingRate,
      thermalGradient: thermalGradient / 1000, // °C/µm
      energyBalance: {
        sparkEnergy,
        conductedHeat: heatToWorkpiece,
        flushingHeat,
        materialRemoval: materialRemovalEnergy,
      },
      warnings,
      recommendations,
    };
  }

  /**
   * Transient thermal analysis over multiple pulses
   */
  computeTransientAnalysis(
    input: ThermalFieldInput,
    numPulses: number = 10,
    timeResolution: number = 5 // µs
  ): TransientAnalysis {
    const mat = getMaterialProps(input.material);
    const spark = input.sparkParams;
    const ambientTemp = input.ambientTemp ?? 25;

    const cycleTime = spark.pulseOnTime + spark.pulseOffTime;
    const totalTime = cycleTime * numPulses;
    const numSteps = Math.ceil(totalTime / timeResolution);

    const timeSteps: number[] = [];
    const temperatures: number[][] = [];
    const peakPerPulse: number[] = [];

    // Simplified 1D thermal model with 10 nodes
    const numNodes = 10;
    const nodeSpacing = 0.01; // mm
    let nodeTemps = new Array(numNodes).fill(ambientTemp);

    const alpha = mat.thermalDiffusivity ?? (mat.thermalConductivity / (mat.density * mat.specificHeat));
    const alphaScaled = alpha * 1e6; // m²/s to mm²/µs scaling

    for (let step = 0; step < numSteps; step++) {
      const t = step * timeResolution;
      timeSteps.push(t);

      const pulseNum = Math.floor(t / cycleTime);
      const withinPulse = (t % cycleTime) < spark.pulseOnTime;

      // Heat input during pulse-on
      if (withinPulse) {
        const heatInput = spark.gapVoltage * spark.peakCurrent * 0.5 * timeResolution * 1e-6;
        const tempRise = heatInput / (mat.specificHeat * mat.density * Math.pow(nodeSpacing/1000, 3));
        nodeTemps[0] += Math.min(tempRise, mat.meltingPoint * 0.5);
      }

      // Diffusion step (explicit finite difference)
      const newTemps = [...nodeTemps];
      const Fo = alphaScaled * timeResolution / (nodeSpacing * nodeSpacing); // Fourier number
      const stableFo = Math.min(Fo, 0.4); // stability limit

      for (let i = 1; i < numNodes - 1; i++) {
        newTemps[i] = nodeTemps[i] + stableFo * (nodeTemps[i-1] - 2*nodeTemps[i] + nodeTemps[i+1]);
      }

      // Boundary conditions: convective cooling at surface
      const hConv = this.estimateConvectionCoeff(input.flushing);
      const Bi = hConv * nodeSpacing / 1000 / mat.thermalConductivity;
      newTemps[0] = newTemps[0] - stableFo * Bi * (newTemps[0] - input.flushing.fluidTemperature);
      newTemps[numNodes-1] = ambientTemp; // far field

      nodeTemps = newTemps;
      temperatures.push([...nodeTemps]);

      // Track peak per pulse
      if (((t + timeResolution) % cycleTime) < timeResolution && pulseNum < numPulses) {
        peakPerPulse.push(nodeTemps[0]);
      }
    }

    // Compute heating/cooling rates
    const heatingPhase = temperatures.slice(0, Math.ceil(spark.pulseOnTime / timeResolution));
    const coolingPhase = temperatures.slice(
      Math.ceil(spark.pulseOnTime / timeResolution),
      Math.ceil(cycleTime / timeResolution)
    );

    const heatingRate = heatingPhase.length > 1
      ? (heatingPhase[heatingPhase.length-1][0] - heatingPhase[0][0]) / (heatingPhase.length * timeResolution)
      : 0;
    const coolingRateTransient = coolingPhase.length > 1
      ? (coolingPhase[0][0] - coolingPhase[coolingPhase.length-1][0]) / (coolingPhase.length * timeResolution)
      : 0;

    const avgTemp = temperatures.reduce((sum, row) => sum + row[0], 0) / temperatures.length;

    return {
      timeSteps,
      temperatures,
      peakPerPulse,
      averageTemperature: avgTemp,
      thermalCycling: {
        heatingRate,
        coolingRate: coolingRateTransient,
        cycleCount: 1e6 / cycleTime,
      },
    };
  }

  /**
   * Estimate recast layer thickness based on thermal analysis
   */
  estimateRecastLayer(input: ThermalFieldInput): {
    thickness: number;        // µm
    confidence: number;
    factors: Record<string, number>;
  } {
    const field = this.computeThermalField(input);
    const mat = getMaterialProps(input.material);

    // Recast layer forms where material melts and resolidifies
    // Simplified model: proportional to melt pool depth and cooling rate
    const meltDepth = field.meltPoolRadius; // µm
    const coolingFactor = Math.min(1, 1e6 / field.coolingRate); // slower cooling = thicker recast

    // Material factor: higher melting point materials have thinner recast
    const materialFactor = 1500 / mat.meltingPoint;

    // Energy factor: higher pulse energy = thicker recast
    const energyFactor = Math.sqrt(field.energyBalance.sparkEnergy / 0.001); // normalized to 1mJ

    const thickness = meltDepth * 0.3 * coolingFactor * materialFactor * energyFactor;

    return {
      thickness: Math.max(0.5, Math.min(thickness, 50)), // clamp to realistic range
      confidence: 0.7, // simplified model
      factors: {
        meltDepth,
        coolingFactor,
        materialFactor,
        energyFactor,
      },
    };
  }

  /**
   * Get material thermal properties
   */
  getMaterialProperties(name: string): ThermalMaterialProps {
    return getMaterialProps(name);
  }

  /**
   * List available materials
   */
  listMaterials(): string[] {
    return Object.keys(MATERIAL_DB);
  }

  /**
   * Validate thermal parameters against material limits
   */
  validateParameters(input: ThermalFieldInput): {
    valid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    const mat = getMaterialProps(input.material);

    const field = this.computeThermalField(input);

    if (field.peakTemperature > mat.meltingPoint * 2) {
      issues.push('Peak temperature excessively high - risk of material damage');
    }

    if (field.heatAffectedZoneDepth > 100) {
      issues.push(`HAZ depth ${field.heatAffectedZoneDepth.toFixed(0)} µm exceeds typical tolerance`);
      suggestions.push('Reduce pulse-on time or peak current');
    }

    if (field.energyBalance.sparkEnergy > 0.01) {
      suggestions.push('High pulse energy - consider multiple skim passes');
    }

    if (input.sparkParams.pulseOffTime < input.sparkParams.pulseOnTime) {
      issues.push('Pulse-off time shorter than pulse-on - insufficient cooling');
      suggestions.push('Increase pulse-off time for better debris evacuation');
    }

    if (!input.flushing.submerged && mat.thermalConductivity < 25) {
      suggestions.push('Submerged cutting recommended for this material');
    }

    return {
      valid: issues.length === 0,
      issues,
      suggestions,
    };
  }

  private generateTemperatureField(
    mat: ThermalMaterialProps,
    spark: SparkParameters,
    meltRadius: number,
    hazDepth: number,
    ambientTemp: number,
    peakTemp: number
  ): TemperatureNode[] {
    const nodes: TemperatureNode[] = [];
    const gridSize = 5; // 5x5 grid

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const x = i * hazDepth * 1000 / gridSize; // µm
        const y = j * hazDepth * 1000 / gridSize; // µm
        const r = Math.sqrt(x*x + y*y) / 1000; // mm

        // Temperature decay with distance (exponential approximation)
        const temp = r < meltRadius
          ? peakTemp
          : ambientTemp + (peakTemp - ambientTemp) * Math.exp(-r / (hazDepth * 2));

        let phase: 'solid' | 'melted' | 'vaporized' = 'solid';
        if (temp > mat.meltingPoint * 1.2) phase = 'vaporized';
        else if (temp > mat.meltingPoint) phase = 'melted';

        nodes.push({ x, y, temperature: temp, phase });
      }
    }

    return nodes;
  }

  private estimateConvectionCoeff(flushing: FlushingConditions): number {
    // Convection coefficient based on flushing conditions (W/m²·K)
    const baseCoeff = flushing.submerged ? 5000 : 500;
    const pressureFactor = 1 + flushing.flushingPressure * 2;
    const tempFactor = (80 - flushing.fluidTemperature) / 60; // higher for cooler fluid

    return baseCoeff * pressureFactor * Math.max(0.5, tempFactor);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Dispatcher-compatible wrapper methods (simplified parameter interface)
  // ─────────────────────────────────────────────────────────────────────────

  private buildInput(
    material: string,
    params: { gapVoltage: number; pulseOnTime: number; pulseOffTime: number; peakCurrent?: number; flushingPressure?: number; wireSpeed?: number },
    thickness = 25
  ): ThermalFieldInput {
    return {
      material: getMaterialProps(material),
      thickness,
      sparkParams: {
        pulseOnTime: params.pulseOnTime,
        pulseOffTime: params.pulseOffTime,
        gapVoltage: params.gapVoltage,
        peakCurrent: params.peakCurrent ?? params.gapVoltage * 0.8,
        sparkGap: 0.025,
      },
      flushing: {
        flushingPressure: params.flushingPressure ?? 0.5,
        fluidTemperature: 25,
        submerged: true,
      },
    };
  }

  /**
   * Dispatcher wrapper: compute thermal field from simplified params
   */
  computeThermalFieldSimple(
    material: string,
    params: { gapVoltage: number; pulseOnTime: number; pulseOffTime: number; peakCurrent?: number; flushingPressure?: number },
    thickness = 25
  ): {
    peakTemperature: number;
    meltPoolRadius: number;
    hazDepth: number;
    recastEstimate: number;
    energyBalance: { totalEnergy: number; workpieceFraction: number; wireFraction: number; dielectricFraction: number };
    warnings: string[];
  } {
    const input = this.buildInput(material, params, thickness);
    const result = this.computeThermalField(input);
    const recast = this.estimateRecastLayer(input);

    return {
      peakTemperature: result.peakTemperature,
      meltPoolRadius: result.meltPoolRadius, // already in µm from computeThermalField
      hazDepth: result.heatAffectedZoneDepth, // already in µm from computeThermalField
      recastEstimate: recast.thickness,
      energyBalance: {
        totalEnergy: result.energyBalance.sparkEnergy * 1000, // mJ
        workpieceFraction: result.energyBalance.conductedHeat / result.energyBalance.sparkEnergy,
        wireFraction: 0.2, // typical wire absorption
        dielectricFraction: result.energyBalance.flushingHeat / result.energyBalance.sparkEnergy,
      },
      warnings: result.warnings,
    };
  }

  /**
   * Dispatcher wrapper: transient analysis with simplified params
   */
  computeTransientAnalysisSimple(
    material: string,
    params: { gapVoltage: number; pulseOnTime: number; pulseOffTime: number; peakCurrent?: number; flushingPressure?: number },
    pulseCount = 10,
    timeResolution = 0.1
  ): {
    timeSteps: number[];
    temperatures: number[];
    coolingRate: number;
    thermalCycleCount: number;
    peakTemperatureHistory: number[];
    steadyStateReached: boolean;
  } {
    const input = this.buildInput(material, params);
    const result = this.computeTransientAnalysis(input, pulseCount);

    const cycleTime = params.pulseOnTime + params.pulseOffTime;
    const timeSteps: number[] = [];
    const temperatures: number[] = [];
    const peakHistory = result.peakPerPulse;

    for (let i = 0; i < pulseCount; i++) {
      for (let t = 0; t <= cycleTime; t += timeResolution * 10) {
        timeSteps.push(i * cycleTime + t);
        const peakIdx = Math.min(i, result.peakPerPulse.length - 1);
        const decay = t > params.pulseOnTime ? Math.exp(-(t - params.pulseOnTime) / params.pulseOffTime) : 1;
        temperatures.push(result.peakPerPulse[peakIdx] * decay);
      }
    }

    const steadyStateReached = pulseCount > 5 &&
      Math.abs(peakHistory[peakHistory.length - 1] - peakHistory[Math.floor(peakHistory.length / 2)]) < 50;

    return {
      timeSteps,
      temperatures,
      coolingRate: result.thermalCycling.coolingRate,
      thermalCycleCount: pulseCount,
      peakTemperatureHistory: peakHistory,
      steadyStateReached,
    };
  }

  /**
   * Dispatcher wrapper: estimate recast layer thickness
   */
  estimateRecastLayerSimple(
    material: string,
    params: { gapVoltage: number; pulseOnTime: number; pulseOffTime: number; peakCurrent?: number; flushingPressure?: number },
    passType: 'roughing' | 'semi-finish' | 'finish' | 'skim' = 'roughing',
    flushingEfficiency = 0.7
  ): {
    recastThickness: number;
    hazDepth: number;
    microhardness: number;
    tensileResidualStress: number;
    recommendations: string[];
  } {
    const input = this.buildInput(material, params);
    const baseResult = this.estimateRecastLayer(input);
    const thermalField = this.computeThermalField(input);
    const mat = getMaterialProps(material);

    // Adjust for pass type
    const passFactors: Record<string, number> = {
      roughing: 1.0,
      'semi-finish': 0.6,
      finish: 0.35,
      skim: 0.15,
    };
    const factor = passFactors[passType] ?? 1.0;
    // Better flushing (higher efficiency) removes more debris and reduces recast
    const flushFactor = 1.5 - 0.5 * flushingEfficiency; // 0.3 eff → 1.35, 0.9 eff → 1.05

    const recastThickness = baseResult.thickness * factor * flushFactor;
    const hazDepth = thermalField.heatAffectedZoneDepth * factor;

    // Microhardness increases with finer passes due to work hardening
    const baseMicrohardness = mat.meltingPoint / 5; // rough correlation
    const microhardness = baseMicrohardness + (1 - factor) * 100;

    // Tensile residual stress from thermal cycling
    const tensileResidualStress = 200 * factor * (thermalField.coolingRate / 1e6);

    const recommendations: string[] = [];
    if (passType === 'roughing' && recastThickness > 15) {
      recommendations.push('Consider additional skim passes to reduce recast layer');
    }
    if (flushingEfficiency < 0.5) {
      recommendations.push('Improve flushing to reduce recast layer thickness');
    }
    if (recastThickness > 10 && passType !== 'roughing') {
      recommendations.push('Reduce pulse energy for better surface integrity');
    }

    return {
      recastThickness,
      hazDepth,
      microhardness,
      tensileResidualStress,
      recommendations,
    };
  }

  /**
   * Dispatcher wrapper: validate parameters against targets
   */
  validateParametersSimple(
    material: string,
    params: { gapVoltage: number; pulseOnTime: number; pulseOffTime: number; peakCurrent?: number; flushingPressure?: number },
    targetRecast?: number,
    targetHAZ?: number
  ): {
    valid: boolean;
    issues: string[];
    predictions: { recastThickness: number; hazDepth: number; peakTemperature: number };
    recommendations: string[];
  } {
    const input = this.buildInput(material, params);
    const field = this.computeThermalField(input);
    const recast = this.estimateRecastLayer(input);
    const validation = this.validateParameters(input);

    const issues = [...validation.issues];
    const recommendations = [...validation.suggestions];

    const recastThickness = recast.thickness;
    const hazDepth = field.heatAffectedZoneDepth;

    if (targetRecast !== undefined && recastThickness > targetRecast) {
      issues.push(`Predicted recast ${recastThickness.toFixed(1)} µm exceeds target ${targetRecast} µm`);
      recommendations.push('Reduce pulse-on time or add skim passes');
    }

    if (targetHAZ !== undefined && hazDepth > targetHAZ) {
      issues.push(`Predicted HAZ ${hazDepth.toFixed(1)} µm exceeds target ${targetHAZ} µm`);
      recommendations.push('Reduce pulse energy or increase cooling');
    }

    return {
      valid: issues.length === 0,
      issues,
      predictions: {
        recastThickness,
        hazDepth,
        peakTemperature: field.peakTemperature,
      },
      recommendations,
    };
  }

  /**
   * Dispatcher wrapper: list materials by category
   */
  listMaterialsByCategory(category: 'all' | 'steel' | 'aluminum' | 'copper' | 'titanium' | 'superalloy' | 'carbide' = 'all'): {
    materials: Array<{ name: string; meltingPoint: number; thermalConductivity: number }>;
    category: string;
  } {
    const categoryMap: Record<string, string[]> = {
      all: Object.keys(MATERIAL_DB),
      steel: ['steel', 'd2', 'h13', 'a2'],
      aluminum: ['aluminum'],
      copper: ['copper'],
      titanium: ['titanium'],
      superalloy: ['inconel', 'stainless'],
      carbide: ['carbide'],
    };

    const names = categoryMap[category] ?? categoryMap.all;
    return {
      materials: names.map(name => {
        const m = MATERIAL_DB[name];
        return { name: m.name, meltingPoint: m.meltingPoint, thermalConductivity: m.thermalConductivity };
      }),
      category,
    };
  }

  /**
   * Dispatcher wrapper: optimize parameters for target recast layer
   */
  optimizeForRecast(
    material: string,
    targetRecast: number,
    targetMRR?: number,
    constraints?: { maxGapVoltage?: number; maxPulseOnTime?: number; minPulseOffTime?: number }
  ): {
    optimizedParams: { gapVoltage: number; pulseOnTime: number; pulseOffTime: number; peakCurrent: number };
    predictedRecast: number;
    predictedMRR: number;
    tradeoffs: string[];
    convergenceIterations: number;
  } {
    const mat = getMaterialProps(material);
    const maxV = constraints?.maxGapVoltage ?? 80;
    const maxTon = constraints?.maxPulseOnTime ?? 10;
    const minToff = constraints?.minPulseOffTime ?? 20;

    // Simple gradient-based optimization
    let bestParams = { gapVoltage: 50, pulseOnTime: 5, pulseOffTime: 30 };
    let bestRecast = Infinity;
    let iterations = 0;

    // Grid search for simplicity
    for (let v = 30; v <= maxV; v += 10) {
      for (let ton = 1; ton <= maxTon; ton += 1) {
        for (let toff = minToff; toff <= 100; toff += 10) {
          iterations++;
          const params = { gapVoltage: v, pulseOnTime: ton, pulseOffTime: toff };
          const recast = this.estimateRecastLayerSimple(material, params).recastThickness;

          if (Math.abs(recast - targetRecast) < Math.abs(bestRecast - targetRecast)) {
            bestRecast = recast;
            bestParams = params;
          }
        }
      }
    }

    // Estimate MRR (simplified model)
    const pulseEnergy = bestParams.gapVoltage * (bestParams.gapVoltage * 0.8) * bestParams.pulseOnTime * 1e-6;
    const frequency = 1e6 / (bestParams.pulseOnTime + bestParams.pulseOffTime);
    const avgPower = pulseEnergy * frequency;
    const mrr = avgPower * 0.1 / mat.density; // very rough estimate mm³/min

    const tradeoffs: string[] = [];
    if (targetMRR && mrr < targetMRR * 0.8) {
      tradeoffs.push(`MRR ${mrr.toFixed(2)} mm³/min is below target ${targetMRR} mm³/min — increase pulse energy or accept higher recast`);
    }
    if (bestRecast > targetRecast * 1.2) {
      tradeoffs.push(`Cannot achieve target recast within constraints — consider additional skim passes`);
    }

    return {
      optimizedParams: { ...bestParams, peakCurrent: bestParams.gapVoltage * 0.8 },
      predictedRecast: bestRecast,
      predictedMRR: mrr,
      tradeoffs,
      convergenceIterations: iterations,
    };
  }
}

export const wedmThermalFieldEngine = new WEDMThermalFieldEngine();
