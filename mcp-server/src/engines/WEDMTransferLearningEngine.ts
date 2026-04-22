/**
 * WEDMTransferLearningEngine — Cross-material/machine parameter transfer
 * @milestone WEDM-NEXT-MS0
 * @unit U-WN03
 *
 * Transfers optimized WEDM parameters from a source material/machine to a target.
 * Uses similarity metrics and scaling factors to adapt parameters while
 * preserving relative relationships learned from the source domain.
 */

export interface WEDMParameters {
  gapVoltage: number;
  wireTension: number;
  flushingPressure: number;
  pulseOnTime: number;
  pulseOffTime: number;
  wireSpeed: number;
}

export interface MaterialProperties {
  name: string;
  conductivity: number;      // S/m (electrical conductivity)
  thermalConductivity: number; // W/m·K
  meltingPoint: number;      // °C
  hardness: number;          // HRC or equivalent
  density: number;           // kg/m³
}

export interface MachineProfile {
  name: string;
  maxGapVoltage: number;
  maxWireTension: number;
  maxFlushingPressure: number;
  maxPulseOnTime: number;
  minPulseOffTime: number;
  maxWireSpeed: number;
  generatorType: 'iso-pulse' | 'relaxation' | 'transistor';
}

export interface TransferContext {
  sourceMaterial: MaterialProperties;
  targetMaterial: MaterialProperties;
  sourceMachine?: MachineProfile;
  targetMachine?: MachineProfile;
  sourceParameters: WEDMParameters;
  sourceOutcomes?: {
    mrr?: number;
    surfaceRa?: number;
    wireConsumption?: number;
  };
}

export interface TransferResult {
  transferredParameters: WEDMParameters;
  confidence: number;
  scalingFactors: Record<keyof WEDMParameters, number>;
  warnings: string[];
  materialSimilarity: number;
  machineSimilarity: number;
  expectedOutcomeChange: {
    mrr: number;       // multiplier (e.g., 0.85 = 15% reduction)
    surfaceRa: number;
    wireConsumption: number;
  };
}

export interface SimilarityResult {
  similarity: number;  // 0-1, higher = more similar
  factors: {
    conductivity: number;
    thermal: number;
    melting: number;
    hardness: number;
  };
  recommendation: 'direct' | 'scaled' | 'conservative' | 'experimental';
}

const MATERIAL_DB: Record<string, MaterialProperties> = {
  steel: { name: 'steel', conductivity: 6.99e6, thermalConductivity: 50, meltingPoint: 1510, hardness: 30, density: 7850 },
  stainless: { name: 'stainless', conductivity: 1.45e6, thermalConductivity: 16, meltingPoint: 1450, hardness: 25, density: 8000 },
  aluminum: { name: 'aluminum', conductivity: 3.77e7, thermalConductivity: 237, meltingPoint: 660, hardness: 15, density: 2700 },
  copper: { name: 'copper', conductivity: 5.96e7, thermalConductivity: 401, meltingPoint: 1085, hardness: 10, density: 8960 },
  titanium: { name: 'titanium', conductivity: 2.38e6, thermalConductivity: 22, meltingPoint: 1668, hardness: 36, density: 4506 },
  inconel: { name: 'inconel', conductivity: 1.0e6, thermalConductivity: 11, meltingPoint: 1350, hardness: 40, density: 8440 },
  carbide: { name: 'carbide', conductivity: 2.0e6, thermalConductivity: 110, meltingPoint: 2870, hardness: 90, density: 15630 },
  graphite: { name: 'graphite', conductivity: 2.5e5, thermalConductivity: 168, meltingPoint: 3600, hardness: 5, density: 2200 },
};

const DEFAULT_MACHINE: MachineProfile = {
  name: 'generic',
  maxGapVoltage: 100,
  maxWireTension: 25,
  maxFlushingPressure: 2.0,
  maxPulseOnTime: 50,
  minPulseOffTime: 10,
  maxWireSpeed: 20,
  generatorType: 'transistor',
};

function getMaterialProps(name: string): MaterialProperties {
  const key = name.toLowerCase();
  if (key in MATERIAL_DB) return MATERIAL_DB[key];
  if (key.includes('steel') || key.includes('4140') || key.includes('1018')) return MATERIAL_DB.steel;
  if (key.includes('stainless') || key.includes('304') || key.includes('316')) return MATERIAL_DB.stainless;
  if (key.includes('aluminum') || key.includes('al') || key.includes('6061') || key.includes('7075')) return MATERIAL_DB.aluminum;
  if (key.includes('copper') || key.includes('cu') || key.includes('brass') || key.includes('bronze')) return MATERIAL_DB.copper;
  if (key.includes('titanium') || key.includes('ti')) return MATERIAL_DB.titanium;
  if (key.includes('inconel') || key.includes('718') || key.includes('nickel')) return MATERIAL_DB.inconel;
  if (key.includes('carbide') || key.includes('tungsten')) return MATERIAL_DB.carbide;
  if (key.includes('graphite')) return MATERIAL_DB.graphite;
  return MATERIAL_DB.steel;
}

export class WEDMTransferLearningEngine {
  /**
   * Compute similarity between two materials for transfer learning
   */
  computeMaterialSimilarity(
    source: MaterialProperties | string,
    target: MaterialProperties | string
  ): SimilarityResult {
    const srcProps = typeof source === 'string' ? getMaterialProps(source) : source;
    const tgtProps = typeof target === 'string' ? getMaterialProps(target) : target;

    // Normalized similarity factors (0-1, exponential decay from difference)
    const condRatio = Math.min(srcProps.conductivity, tgtProps.conductivity) /
                      Math.max(srcProps.conductivity, tgtProps.conductivity);
    const thermalRatio = Math.min(srcProps.thermalConductivity, tgtProps.thermalConductivity) /
                         Math.max(srcProps.thermalConductivity, tgtProps.thermalConductivity);
    const meltRatio = 1 - Math.abs(srcProps.meltingPoint - tgtProps.meltingPoint) / 3000;
    const hardRatio = 1 - Math.abs(srcProps.hardness - tgtProps.hardness) / 100;

    const factors = {
      conductivity: Math.max(0, condRatio),
      thermal: Math.max(0, thermalRatio),
      melting: Math.max(0, meltRatio),
      hardness: Math.max(0, hardRatio),
    };

    // Weighted overall similarity (conductivity most important for EDM)
    const similarity = 0.4 * factors.conductivity + 0.25 * factors.thermal +
                       0.2 * factors.melting + 0.15 * factors.hardness;

    let recommendation: SimilarityResult['recommendation'];
    if (similarity > 0.85) recommendation = 'direct';
    else if (similarity > 0.65) recommendation = 'scaled';
    else if (similarity > 0.45) recommendation = 'conservative';
    else recommendation = 'experimental';

    return { similarity, factors, recommendation };
  }

  /**
   * Compute similarity between two machines
   */
  computeMachineSimilarity(
    source: MachineProfile,
    target: MachineProfile
  ): number {
    // Generator type match
    const genMatch = source.generatorType === target.generatorType ? 1.0 : 0.7;

    // Capacity overlap
    const voltageOverlap = Math.min(source.maxGapVoltage, target.maxGapVoltage) /
                           Math.max(source.maxGapVoltage, target.maxGapVoltage);
    const tensionOverlap = Math.min(source.maxWireTension, target.maxWireTension) /
                           Math.max(source.maxWireTension, target.maxWireTension);
    const pulseOverlap = Math.min(source.maxPulseOnTime, target.maxPulseOnTime) /
                         Math.max(source.maxPulseOnTime, target.maxPulseOnTime);

    return 0.3 * genMatch + 0.25 * voltageOverlap + 0.25 * tensionOverlap + 0.2 * pulseOverlap;
  }

  /**
   * Transfer parameters from source to target domain
   */
  transfer(context: TransferContext): TransferResult {
    const { sourceMaterial, targetMaterial, sourceParameters } = context;
    const sourceMachine = context.sourceMachine ?? DEFAULT_MACHINE;
    const targetMachine = context.targetMachine ?? DEFAULT_MACHINE;

    const matSim = this.computeMaterialSimilarity(sourceMaterial, targetMaterial);
    const machSim = this.computeMachineSimilarity(sourceMachine, targetMachine);

    const warnings: string[] = [];

    // Compute scaling factors based on material property ratios (clamp to avoid extreme values)
    const condRatio = targetMaterial.conductivity / Math.max(1, sourceMaterial.conductivity);
    const condScale = Math.sqrt(Math.max(0.01, Math.min(100, condRatio)));
    const thermalRatio = targetMaterial.thermalConductivity / Math.max(0.1, sourceMaterial.thermalConductivity);
    const thermalScale = Math.sqrt(Math.max(0.01, Math.min(100, thermalRatio)));
    const meltScale = Math.max(0.1, Math.min(10, sourceMaterial.meltingPoint / Math.max(100, targetMaterial.meltingPoint)));
    const hardScale = Math.sqrt(Math.max(0.1, Math.min(10, targetMaterial.hardness / Math.max(1, sourceMaterial.hardness))));

    // Parameter-specific scaling logic (clamp individual factors to reasonable range 0.3-3.0)
    const clamp = (v: number) => Math.max(0.3, Math.min(3.0, Number.isFinite(v) ? v : 1.0));
    const scalingFactors: Record<keyof WEDMParameters, number> = {
      // Gap voltage: lower for higher conductivity materials
      gapVoltage: clamp(1 / condScale),
      // Wire tension: adjust for hardness (harder = more tension)
      wireTension: clamp(hardScale),
      // Flushing: adjust for thermal conductivity (higher = less flushing needed)
      flushingPressure: clamp(1 / thermalScale),
      // Pulse on: adjust for melting point (higher = longer pulse)
      pulseOnTime: clamp(meltScale),
      // Pulse off: inversely related to conductivity
      pulseOffTime: clamp(1 / condScale),
      // Wire speed: adjust for thermal and hardness
      wireSpeed: clamp(thermalScale * hardScale),
    };

    // Apply conservative damping for low similarity
    const dampingFactor = 0.5 + 0.5 * matSim.similarity;
    for (const key of Object.keys(scalingFactors) as (keyof WEDMParameters)[]) {
      scalingFactors[key] = 1 + (scalingFactors[key] - 1) * dampingFactor;
    }

    // Apply scaling to source parameters
    const transferred: WEDMParameters = {
      gapVoltage: sourceParameters.gapVoltage * scalingFactors.gapVoltage,
      wireTension: sourceParameters.wireTension * scalingFactors.wireTension,
      flushingPressure: sourceParameters.flushingPressure * scalingFactors.flushingPressure,
      pulseOnTime: sourceParameters.pulseOnTime * scalingFactors.pulseOnTime,
      pulseOffTime: sourceParameters.pulseOffTime * scalingFactors.pulseOffTime,
      wireSpeed: sourceParameters.wireSpeed * scalingFactors.wireSpeed,
    };

    // Clamp to machine limits
    if (transferred.gapVoltage > targetMachine.maxGapVoltage) {
      warnings.push(`Gap voltage clamped from ${transferred.gapVoltage.toFixed(1)}V to ${targetMachine.maxGapVoltage}V`);
      transferred.gapVoltage = targetMachine.maxGapVoltage;
    }
    if (transferred.wireTension > targetMachine.maxWireTension) {
      warnings.push(`Wire tension clamped from ${transferred.wireTension.toFixed(1)}N to ${targetMachine.maxWireTension}N`);
      transferred.wireTension = targetMachine.maxWireTension;
    }
    if (transferred.flushingPressure > targetMachine.maxFlushingPressure) {
      warnings.push(`Flushing pressure clamped to ${targetMachine.maxFlushingPressure} MPa`);
      transferred.flushingPressure = targetMachine.maxFlushingPressure;
    }
    if (transferred.pulseOnTime > targetMachine.maxPulseOnTime) {
      warnings.push(`Pulse on time clamped to ${targetMachine.maxPulseOnTime}µs`);
      transferred.pulseOnTime = targetMachine.maxPulseOnTime;
    }
    if (transferred.pulseOffTime < targetMachine.minPulseOffTime) {
      warnings.push(`Pulse off time raised to minimum ${targetMachine.minPulseOffTime}µs`);
      transferred.pulseOffTime = targetMachine.minPulseOffTime;
    }
    if (transferred.wireSpeed > targetMachine.maxWireSpeed) {
      warnings.push(`Wire speed clamped to ${targetMachine.maxWireSpeed} m/min`);
      transferred.wireSpeed = targetMachine.maxWireSpeed;
    }

    // Estimate outcome changes based on material differences
    const expectedOutcomeChange = {
      mrr: condScale * Math.sqrt(meltScale),
      surfaceRa: 1 / Math.sqrt(thermalScale) * hardScale,
      wireConsumption: hardScale * Math.sqrt(1 / condScale),
    };

    // Confidence based on similarity and warnings
    const confidence = matSim.similarity * machSim * Math.pow(0.9, warnings.length);

    if (matSim.recommendation === 'experimental') {
      warnings.push('Low material similarity - extensive validation recommended');
    }

    return {
      transferredParameters: transferred,
      confidence,
      scalingFactors,
      warnings,
      materialSimilarity: matSim.similarity,
      machineSimilarity: machSim,
      expectedOutcomeChange,
    };
  }

  /**
   * Batch transfer to multiple target materials
   */
  batchTransfer(
    sourceParameters: WEDMParameters,
    sourceMaterial: string,
    targetMaterials: string[],
    sourceMachine?: MachineProfile,
    targetMachine?: MachineProfile
  ): { material: string; result: TransferResult }[] {
    const srcProps = getMaterialProps(sourceMaterial);

    return targetMaterials.map(target => ({
      material: target,
      result: this.transfer({
        sourceMaterial: srcProps,
        targetMaterial: getMaterialProps(target),
        sourceMachine,
        targetMachine,
        sourceParameters,
      }),
    }));
  }

  /**
   * Find most similar materials to a given material
   */
  findSimilarMaterials(
    material: string,
    topN = 3
  ): { material: string; similarity: number }[] {
    const srcProps = getMaterialProps(material);
    const results: { material: string; similarity: number }[] = [];

    for (const [name, props] of Object.entries(MATERIAL_DB)) {
      if (name === material.toLowerCase()) continue;
      const sim = this.computeMaterialSimilarity(srcProps, props);
      results.push({ material: name, similarity: sim.similarity });
    }

    return results.sort((a, b) => b.similarity - a.similarity).slice(0, topN);
  }

  /**
   * Validate transferred parameters against known constraints
   */
  validateTransfer(
    transferred: WEDMParameters,
    targetMaterial: string
  ): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    const props = getMaterialProps(targetMaterial);

    // Basic sanity checks
    if (transferred.gapVoltage < 20) {
      issues.push('Gap voltage too low for stable arc');
    }
    if (transferred.gapVoltage > 120) {
      issues.push('Gap voltage exceeds typical maximum');
    }
    if (transferred.wireTension < 3) {
      issues.push('Wire tension too low - risk of wire wander');
    }
    if (transferred.pulseOnTime < 1) {
      issues.push('Pulse on time too short for material removal');
    }
    if (transferred.pulseOffTime < transferred.pulseOnTime * 0.5) {
      issues.push('Pulse off time may be insufficient for debris clearing');
    }

    // Material-specific checks
    if (props.conductivity < 1e6 && transferred.gapVoltage < 50) {
      issues.push('Low conductivity material may need higher gap voltage');
    }
    if (props.thermalConductivity > 200 && transferred.flushingPressure < 0.5) {
      issues.push('High thermal conductivity material may need more flushing');
    }

    return { valid: issues.length === 0, issues };
  }

  /**
   * Get material properties by name
   */
  getMaterialProperties(name: string): MaterialProperties {
    return getMaterialProps(name);
  }

  /**
   * List all known materials
   */
  listKnownMaterials(): string[] {
    return Object.keys(MATERIAL_DB);
  }
}

export const wedmTransferLearningEngine = new WEDMTransferLearningEngine();
