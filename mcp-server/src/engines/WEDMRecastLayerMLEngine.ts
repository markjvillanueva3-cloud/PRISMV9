/**
 * WEDMRecastLayerMLEngine — ML-based recast layer thickness prediction
 *
 * WEDM-NEXT-MS0 / U-WN06
 *
 * Uses ensemble ML (gradient boosting + random forest) for recast layer
 * prediction from empirical production data. Complements physics-based
 * WEDMRecastDepthPredictorEngine with data-driven approach.
 *
 * Features:
 * - Gradient boosting + random forest ensemble with uncertainty quantification
 * - SHAP-style feature importance from tree splits
 * - Online learning from production outcomes via PSAU loop
 * - Multi-pass scenario handling (cumulative recast from roughing + skims)
 * - Handles sparse/partial input gracefully with median imputation
 *
 * Physics context (for feature engineering):
 * - Recast depth ∝ √(energy × time) — Carslaw-Jaeger diffusion
 * - Energy = V × I × t_on (joules per spark)
 * - Flushing reduces debris accumulation → lower secondary discharge
 *
 * Literature:
 * - Klocke 2013 §8.2 — energy partition in EDM
 * - Ho & Newman 2003 — recast layer metallurgy
 * - Chakraborty et al. 2021 — ML for EDM parameter optimization
 *
 * @module engines/WEDMRecastLayerMLEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface RecastMLInput {
  material: string;
  thicknessMm: number;
  peakCurrentA: number;
  voltageV: number;
  pulseOnUs: number;
  pulseOffUs: number;
  wireDiameterMm: number;
  wireMaterial: "brass" | "zinc_coated" | "molybdenum" | "tungsten";
  flushingPressureBar?: number;
  flushingMode?: "submerged" | "upper_lower" | "coaxial" | "none";
  numPasses?: number;
  passType?: "rough" | "skim1" | "skim2" | "skim3" | "finish";
  dielectricType?: "deionized_water" | "oil" | "kerosene";
  machineAge?: number;
}

export interface RecastMLPrediction {
  recastDepthUm: number;
  uncertainty: number;
  confidence: number;
  featureImportance: Array<{ feature: string; importance: number }>;
  passBreakdown?: Array<{ pass: string; depthUm: number }>;
  riskLevel: "low" | "moderate" | "high" | "critical";
  mitigationSuggestions: string[];
  source: string;
}

export interface RecastMLTrainingSample {
  input: RecastMLInput;
  measuredDepthUm: number;
  timestamp?: number;
  machineId?: string;
  jobId?: string;
}

interface TreeNode {
  feature: number | null;
  threshold: number;
  left: TreeNode | null;
  right: TreeNode | null;
  value: number;
  samples: number;
}

interface DecisionTree {
  root: TreeNode;
  featureImportances: number[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FEATURE_NAMES = [
  "material_idx",
  "thickness_mm",
  "peak_current_A",
  "voltage_V",
  "pulse_on_us",
  "pulse_off_us",
  "wire_diameter_mm",
  "wire_material_idx",
  "flushing_pressure_bar",
  "flushing_mode_idx",
  "num_passes",
  "pass_type_idx",
  "dielectric_idx",
  "machine_age",
  "energy_mJ",
  "duty_cycle",
  "energy_density_J_mm2",
];

const MATERIAL_INDEX: Record<string, number> = {
  steel: 0, tool_steel: 1, stainless: 2, aluminum: 3, carbide: 4,
  titanium: 5, inconel: 6, copper: 7, brass: 8, graphite: 9,
};

const WIRE_MATERIAL_INDEX: Record<string, number> = {
  brass: 0, zinc_coated: 1, molybdenum: 2, tungsten: 3,
};

const FLUSHING_MODE_INDEX: Record<string, number> = {
  submerged: 0, upper_lower: 1, coaxial: 2, none: 3,
};

const PASS_TYPE_INDEX: Record<string, number> = {
  rough: 0, skim1: 1, skim2: 2, skim3: 3, finish: 4,
};

const DIELECTRIC_INDEX: Record<string, number> = {
  deionized_water: 0, oil: 1, kerosene: 2,
};

const DEFAULT_MEDIANS: number[] = [
  1,    // material_idx (tool_steel)
  25,   // thickness_mm
  8,    // peak_current_A
  80,   // voltage_V
  4,    // pulse_on_us
  20,   // pulse_off_us
  0.25, // wire_diameter_mm
  0,    // wire_material_idx (brass)
  4,    // flushing_pressure_bar
  0,    // flushing_mode_idx (submerged)
  3,    // num_passes
  0,    // pass_type_idx (rough)
  0,    // dielectric_idx (deionized_water)
  5,    // machine_age
  2.56, // energy_mJ (80V × 8A × 4µs)
  0.167,// duty_cycle (4/(4+20))
  0.041,// energy_density_J_mm2
];

// ============================================================================
// ENGINE
// ============================================================================

class WEDMRecastLayerMLEngine {
  private trees: DecisionTree[] = [];
  private trainingSamples: RecastMLTrainingSample[] = [];
  private featureMedians: number[] = [...DEFAULT_MEDIANS];
  private readonly maxTrees = 50;
  private readonly maxDepth = 8;
  private readonly minSamplesLeaf = 3;
  private readonly learningRate = 0.1;

  predict(input: RecastMLInput): RecastMLPrediction {
    const features = this.extractFeatures(input);

    if (this.trees.length === 0) {
      return this.physicsBasedFallback(input, features);
    }

    const predictions = this.trees.map(tree => this.traverseTree(tree.root, features));
    const mean = predictions.reduce((a, b) => a + b, 0) / predictions.length;
    const variance = predictions.reduce((a, b) => a + (b - mean) ** 2, 0) / predictions.length;
    const uncertainty = Math.sqrt(variance);

    const aggregateImportance = this.aggregateFeatureImportance();
    const passBreakdown = this.computePassBreakdown(input, mean);
    const riskLevel = this.assessRisk(mean, input.passType);
    const mitigations = this.generateMitigations(mean, riskLevel, input);

    return {
      recastDepthUm: Math.max(0, mean),
      uncertainty,
      confidence: Math.min(0.95, 0.7 + 0.005 * this.trainingSamples.length),
      featureImportance: aggregateImportance,
      passBreakdown,
      riskLevel,
      mitigationSuggestions: mitigations,
      source: "WEDMRecastLayerMLEngine:ensemble",
    };
  }

  train(samples: RecastMLTrainingSample[]): {
    treesBuilt: number;
    sampleCount: number;
    oobError: number;
    featureImportance: Array<{ feature: string; importance: number }>;
  } {
    const valid = samples.filter(s =>
      Number.isFinite(s.measuredDepthUm) &&
      s.measuredDepthUm >= 0 &&
      Number.isFinite(s.input.peakCurrentA) &&
      s.input.peakCurrentA > 0
    );

    if (valid.length < this.minSamplesLeaf * 2) {
      return { treesBuilt: 0, sampleCount: 0, oobError: 0, featureImportance: [] };
    }

    this.trainingSamples = valid;
    this.updateMedians(valid);

    const featureMatrix = valid.map(s => this.extractFeatures(s.input));
    const targets = valid.map(s => s.measuredDepthUm);

    this.trees = [];
    let residuals = [...targets];
    let oobPredictions = new Array(valid.length).fill(0);
    let oobCounts = new Array(valid.length).fill(0);

    for (let t = 0; t < this.maxTrees; t++) {
      const { inBag, outOfBag } = this.bootstrapSample(valid.length);

      const bagFeatures = inBag.map(i => featureMatrix[i]);
      const bagTargets = inBag.map(i => residuals[i]);

      const tree = this.buildTree(bagFeatures, bagTargets, 0);
      this.trees.push(tree);

      for (let i = 0; i < valid.length; i++) {
        const pred = this.traverseTree(tree.root, featureMatrix[i]);
        residuals[i] -= this.learningRate * pred;
      }

      for (const i of outOfBag) {
        oobPredictions[i] += this.learningRate * this.traverseTree(tree.root, featureMatrix[i]);
        oobCounts[i]++;
      }
    }

    let oobError = 0;
    let oobN = 0;
    for (let i = 0; i < valid.length; i++) {
      if (oobCounts[i] > 0) {
        const pred = oobPredictions[i];
        oobError += (targets[i] - pred) ** 2;
        oobN++;
      }
    }
    oobError = oobN > 0 ? Math.sqrt(oobError / oobN) : 0;

    const importance = this.aggregateFeatureImportance();

    return {
      treesBuilt: this.trees.length,
      sampleCount: valid.length,
      oobError,
      featureImportance: importance,
    };
  }

  addSample(sample: RecastMLTrainingSample): { accepted: boolean; sampleCount: number } {
    if (!Number.isFinite(sample.measuredDepthUm) || sample.measuredDepthUm < 0) {
      return { accepted: false, sampleCount: this.trainingSamples.length };
    }
    this.trainingSamples.push(sample);

    if (this.trainingSamples.length % 20 === 0) {
      this.train(this.trainingSamples);
    }
    return { accepted: true, sampleCount: this.trainingSamples.length };
  }

  getStats(): {
    treeCount: number;
    sampleCount: number;
    featureCount: number;
    maxDepth: number;
  } {
    return {
      treeCount: this.trees.length,
      sampleCount: this.trainingSamples.length,
      featureCount: FEATURE_NAMES.length,
      maxDepth: this.maxDepth,
    };
  }

  reset(): void {
    this.trees = [];
    this.trainingSamples = [];
    this.featureMedians = [...DEFAULT_MEDIANS];
  }

  // --------------------------------------------------------------------------
  // FEATURE EXTRACTION
  // --------------------------------------------------------------------------

  private extractFeatures(input: RecastMLInput): number[] {
    const materialKey = this.resolveMaterial(input.material);
    const materialIdx = MATERIAL_INDEX[materialKey] ?? 1;
    const wireIdx = WIRE_MATERIAL_INDEX[input.wireMaterial] ?? 0;
    const flushIdx = FLUSHING_MODE_INDEX[input.flushingMode ?? "submerged"] ?? 0;
    const passIdx = PASS_TYPE_INDEX[input.passType ?? "rough"] ?? 0;
    const dielectricIdx = DIELECTRIC_INDEX[input.dielectricType ?? "deionized_water"] ?? 0;

    const energyMJ = (input.voltageV * input.peakCurrentA * input.pulseOnUs) / 1000;
    const dutyCycle = input.pulseOnUs / (input.pulseOnUs + input.pulseOffUs);
    const crossSection = input.thicknessMm * input.wireDiameterMm;
    const energyDensity = crossSection > 0 ? energyMJ / crossSection : 0;

    const raw: (number | undefined)[] = [
      materialIdx,
      input.thicknessMm,
      input.peakCurrentA,
      input.voltageV,
      input.pulseOnUs,
      input.pulseOffUs,
      input.wireDiameterMm,
      wireIdx,
      input.flushingPressureBar,
      flushIdx,
      input.numPasses,
      passIdx,
      dielectricIdx,
      input.machineAge,
      energyMJ,
      dutyCycle,
      energyDensity,
    ];

    return raw.map((v, i) =>
      v !== undefined && Number.isFinite(v) ? v : this.featureMedians[i]
    );
  }

  private resolveMaterial(material: string): string {
    const m = (material || "").toLowerCase();
    const map: Record<string, string> = {
      "p20": "tool_steel", "h13": "tool_steel", "d2": "tool_steel",
      "1018": "steel", "4140": "steel", "carbon": "steel",
      "304": "stainless", "316": "stainless", "ss": "stainless",
      "6061": "aluminum", "7075": "aluminum", "al": "aluminum",
      "wc": "carbide", "tungsten_carbide": "carbide",
      "ti": "titanium", "ti6al4v": "titanium",
      "in718": "inconel", "inconel718": "inconel",
      "cu": "copper",
    };
    if (map[m]) return map[m];
    if (MATERIAL_INDEX[m] !== undefined) return m;
    return "tool_steel";
  }

  private updateMedians(samples: RecastMLTrainingSample[]): void {
    if (samples.length < 5) return;
    const featureMatrix = samples.map(s => this.extractFeatures(s.input));
    for (let j = 0; j < FEATURE_NAMES.length; j++) {
      const col = featureMatrix.map(row => row[j]).filter(Number.isFinite).sort((a, b) => a - b);
      if (col.length > 0) {
        this.featureMedians[j] = col[Math.floor(col.length / 2)];
      }
    }
  }

  // --------------------------------------------------------------------------
  // TREE BUILDING (Gradient Boosting)
  // --------------------------------------------------------------------------

  private buildTree(features: number[][], targets: number[], depth: number): DecisionTree {
    const root = this.buildNode(features, targets, depth);
    const importances = new Array(FEATURE_NAMES.length).fill(0);
    this.accumulateImportance(root, importances, targets.length);
    return { root, featureImportances: importances };
  }

  private buildNode(features: number[][], targets: number[], depth: number): TreeNode {
    const n = targets.length;
    const mean = targets.reduce((a, b) => a + b, 0) / n;

    if (depth >= this.maxDepth || n < this.minSamplesLeaf * 2) {
      return { feature: null, threshold: 0, left: null, right: null, value: mean, samples: n };
    }

    let bestGain = 0;
    let bestFeature = -1;
    let bestThreshold = 0;
    let bestLeftIdx: number[] = [];
    let bestRightIdx: number[] = [];

    const variance = targets.reduce((a, b) => a + (b - mean) ** 2, 0);

    for (let f = 0; f < FEATURE_NAMES.length; f++) {
      const sorted = features.map((row, i) => ({ val: row[f], idx: i }))
        .sort((a, b) => a.val - b.val);

      let leftSum = 0, leftSq = 0, leftN = 0;
      let rightSum = targets.reduce((a, b) => a + b, 0);
      let rightSq = targets.reduce((a, b) => a + b * b, 0);
      let rightN = n;

      for (let s = 0; s < n - 1; s++) {
        const t = targets[sorted[s].idx];
        leftSum += t; leftSq += t * t; leftN++;
        rightSum -= t; rightSq -= t * t; rightN--;

        if (leftN < this.minSamplesLeaf || rightN < this.minSamplesLeaf) continue;
        if (sorted[s].val === sorted[s + 1].val) continue;

        const leftVar = leftSq - (leftSum * leftSum) / leftN;
        const rightVar = rightSq - (rightSum * rightSum) / rightN;
        const gain = variance - leftVar - rightVar;

        if (gain > bestGain) {
          bestGain = gain;
          bestFeature = f;
          bestThreshold = (sorted[s].val + sorted[s + 1].val) / 2;
          bestLeftIdx = sorted.slice(0, s + 1).map(x => x.idx);
          bestRightIdx = sorted.slice(s + 1).map(x => x.idx);
        }
      }
    }

    if (bestFeature < 0) {
      return { feature: null, threshold: 0, left: null, right: null, value: mean, samples: n };
    }

    const leftFeatures = bestLeftIdx.map(i => features[i]);
    const leftTargets = bestLeftIdx.map(i => targets[i]);
    const rightFeatures = bestRightIdx.map(i => features[i]);
    const rightTargets = bestRightIdx.map(i => targets[i]);

    return {
      feature: bestFeature,
      threshold: bestThreshold,
      left: this.buildNode(leftFeatures, leftTargets, depth + 1),
      right: this.buildNode(rightFeatures, rightTargets, depth + 1),
      value: mean,
      samples: n,
    };
  }

  private traverseTree(node: TreeNode, features: number[]): number {
    if (node.feature === null || !node.left || !node.right) {
      return node.value;
    }
    if (features[node.feature] <= node.threshold) {
      return this.traverseTree(node.left, features);
    }
    return this.traverseTree(node.right, features);
  }

  private accumulateImportance(node: TreeNode, importances: number[], totalSamples: number): void {
    if (node.feature === null || !node.left || !node.right) return;

    const weight = node.samples / totalSamples;
    const leftVar = this.nodeVariance(node.left);
    const rightVar = this.nodeVariance(node.right);
    const parentVar = this.nodeVariance(node);
    const reduction = parentVar - (node.left.samples * leftVar + node.right.samples * rightVar) / node.samples;

    importances[node.feature] += weight * Math.max(0, reduction);
    this.accumulateImportance(node.left, importances, totalSamples);
    this.accumulateImportance(node.right, importances, totalSamples);
  }

  private nodeVariance(node: TreeNode): number {
    return node.value * node.value;
  }

  private bootstrapSample(n: number): { inBag: number[]; outOfBag: number[] } {
    const selected = new Set<number>();
    const inBag: number[] = [];
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(Math.random() * n);
      inBag.push(idx);
      selected.add(idx);
    }
    const outOfBag = Array.from({ length: n }, (_, i) => i).filter(i => !selected.has(i));
    return { inBag, outOfBag };
  }

  private aggregateFeatureImportance(): Array<{ feature: string; importance: number }> {
    if (this.trees.length === 0) return [];

    const sums = new Array(FEATURE_NAMES.length).fill(0);
    for (const tree of this.trees) {
      for (let i = 0; i < FEATURE_NAMES.length; i++) {
        sums[i] += tree.featureImportances[i];
      }
    }

    const total = sums.reduce((a, b) => a + b, 0) || 1;
    return FEATURE_NAMES.map((name, i) => ({
      feature: name,
      importance: sums[i] / total,
    })).sort((a, b) => b.importance - a.importance);
  }

  // --------------------------------------------------------------------------
  // PHYSICS FALLBACK (when no training data)
  // --------------------------------------------------------------------------

  private physicsBasedFallback(input: RecastMLInput, features: number[]): RecastMLPrediction {
    const energyMJ = features[14];
    const dutyCycle = features[15];

    const baseDepth = 2.5 * Math.sqrt(energyMJ) * (1 + dutyCycle);
    const materialFactor = this.materialRecastFactor(input.material);
    const passFactor = this.passRecastFactor(input.passType ?? "rough");
    const flushFactor = input.flushingMode === "none" ? 1.3 :
                        input.flushingMode === "submerged" ? 0.8 : 1.0;

    const depthUm = baseDepth * materialFactor * passFactor * flushFactor;
    const riskLevel = this.assessRisk(depthUm, input.passType);
    const passBreakdown = this.computePassBreakdown(input, depthUm);

    return {
      recastDepthUm: Math.max(0, depthUm),
      uncertainty: depthUm * 0.25,
      confidence: 0.5,
      featureImportance: [
        { feature: "energy_mJ", importance: 0.35 },
        { feature: "duty_cycle", importance: 0.20 },
        { feature: "material_idx", importance: 0.15 },
        { feature: "flushing_mode_idx", importance: 0.15 },
        { feature: "pass_type_idx", importance: 0.15 },
      ],
      passBreakdown,
      riskLevel,
      mitigationSuggestions: this.generateMitigations(depthUm, riskLevel, input),
      source: "WEDMRecastLayerMLEngine:physics_fallback",
    };
  }

  private materialRecastFactor(material: string): number {
    const m = this.resolveMaterial(material);
    const factors: Record<string, number> = {
      steel: 1.0, tool_steel: 1.2, stainless: 1.1, aluminum: 0.6,
      carbide: 0.8, titanium: 1.3, inconel: 1.4, copper: 0.5, brass: 0.55, graphite: 0.3,
    };
    return factors[m] ?? 1.0;
  }

  private passRecastFactor(passType: string): number {
    const factors: Record<string, number> = {
      rough: 1.0, skim1: 0.5, skim2: 0.25, skim3: 0.12, finish: 0.08,
    };
    return factors[passType] ?? 1.0;
  }

  private computePassBreakdown(input: RecastMLInput, totalDepth: number): Array<{ pass: string; depthUm: number }> | undefined {
    const numPasses = input.numPasses ?? 1;
    if (numPasses <= 1) return undefined;

    const breakdown: Array<{ pass: string; depthUm: number }> = [];
    const passes = ["rough", "skim1", "skim2", "skim3", "finish"].slice(0, numPasses);

    let remaining = totalDepth;
    for (let i = 0; i < passes.length; i++) {
      const factor = this.passRecastFactor(passes[i]);
      const contribution = i === passes.length - 1 ? remaining : totalDepth * factor * 0.5;
      breakdown.push({ pass: passes[i], depthUm: Math.max(0, contribution) });
      remaining -= contribution;
    }
    return breakdown;
  }

  private assessRisk(depthUm: number, passType?: string): "low" | "moderate" | "high" | "critical" {
    const isFinish = passType === "finish" || passType === "skim3";
    const thresholds = isFinish ? [2, 5, 10] : [5, 15, 30];

    if (depthUm < thresholds[0]) return "low";
    if (depthUm < thresholds[1]) return "moderate";
    if (depthUm < thresholds[2]) return "high";
    return "critical";
  }

  private generateMitigations(
    depthUm: number,
    risk: string,
    input: RecastMLInput
  ): string[] {
    const suggestions: string[] = [];

    if (risk === "critical" || risk === "high") {
      suggestions.push("Add finish skim pass with <2A peak current");
      suggestions.push("Consider mechanical polishing or lapping post-process");
    }

    if (depthUm > 15 && input.peakCurrentA > 10) {
      suggestions.push(`Reduce peak current from ${input.peakCurrentA}A to <8A for finish`);
    }

    if (input.flushingMode === "none" || !input.flushingMode) {
      suggestions.push("Enable submerged or upper/lower flushing");
    }

    if (input.pulseOnUs > 6) {
      suggestions.push(`Reduce pulse-on time from ${input.pulseOnUs}µs to <4µs`);
    }

    if ((input.numPasses ?? 1) < 3 && risk !== "low") {
      suggestions.push("Add additional skim passes (recommend 3-4 total)");
    }

    if (suggestions.length === 0 && risk === "low") {
      suggestions.push("Parameters are optimal for minimal recast layer");
    }

    return suggestions;
  }
}

export const wedmRecastLayerMLEngine = new WEDMRecastLayerMLEngine();
export { WEDMRecastLayerMLEngine };
