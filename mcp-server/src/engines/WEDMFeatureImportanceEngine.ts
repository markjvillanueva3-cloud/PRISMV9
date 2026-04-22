/**
 * WEDMFeatureImportanceEngine — SHAP-inspired feature importance for WEDM parameters
 * @milestone WEDM-NEXT-MS0
 * @unit U-WN02
 *
 * Computes feature importance scores to understand which cutting parameters
 * most influence outcomes (MRR, surface quality, wire consumption, etc.).
 * Uses permutation importance and partial dependence analysis.
 */

export interface WEDMDataPoint {
  parameters: {
    gapVoltage: number;
    wireTension: number;
    flushingPressure: number;
    pulseOnTime: number;
    pulseOffTime: number;
    wireSpeed: number;
  };
  outcomes: {
    mrr: number;
    surfaceRa: number;
    wireConsumption: number;
    energyConsumption: number;
  };
  material: string;
  thickness: number;
}

export interface FeatureImportanceResult {
  feature: string;
  importance: number;
  stdDev: number;
  rank: number;
}

export interface PartialDependencePoint {
  value: number;
  predictedOutcome: number;
  confidence: number;
}

export interface PartialDependenceResult {
  feature: string;
  outcome: string;
  points: PartialDependencePoint[];
  trend: 'increasing' | 'decreasing' | 'nonlinear' | 'flat';
  sensitivity: number;
}

export interface InteractionEffect {
  feature1: string;
  feature2: string;
  interactionStrength: number;
  type: 'synergistic' | 'antagonistic' | 'independent';
}

const FEATURE_NAMES = ['gapVoltage', 'wireTension', 'flushingPressure', 'pulseOnTime', 'pulseOffTime', 'wireSpeed'] as const;
type FeatureName = typeof FEATURE_NAMES[number];

const OUTCOME_NAMES = ['mrr', 'surfaceRa', 'wireConsumption', 'energyConsumption'] as const;
type OutcomeName = typeof OUTCOME_NAMES[number];

/**
 * Material-specific baseline coefficients for outcome prediction
 * Values derived from empirical WEDM cutting data
 */
const MATERIAL_COEFFICIENTS: Record<string, Record<OutcomeName, Record<FeatureName, number>>> = {
  steel: {
    mrr: { gapVoltage: 0.35, wireTension: -0.05, flushingPressure: 0.15, pulseOnTime: 0.30, pulseOffTime: -0.20, wireSpeed: 0.10 },
    surfaceRa: { gapVoltage: 0.25, wireTension: -0.10, flushingPressure: -0.05, pulseOnTime: 0.35, pulseOffTime: -0.15, wireSpeed: 0.05 },
    wireConsumption: { gapVoltage: 0.20, wireTension: 0.30, flushingPressure: 0.05, pulseOnTime: 0.25, pulseOffTime: -0.10, wireSpeed: 0.40 },
    energyConsumption: { gapVoltage: 0.40, wireTension: 0.05, flushingPressure: 0.10, pulseOnTime: 0.35, pulseOffTime: -0.25, wireSpeed: 0.15 },
  },
  aluminum: {
    mrr: { gapVoltage: 0.40, wireTension: -0.03, flushingPressure: 0.20, pulseOnTime: 0.25, pulseOffTime: -0.15, wireSpeed: 0.12 },
    surfaceRa: { gapVoltage: 0.20, wireTension: -0.08, flushingPressure: -0.03, pulseOnTime: 0.30, pulseOffTime: -0.12, wireSpeed: 0.03 },
    wireConsumption: { gapVoltage: 0.15, wireTension: 0.25, flushingPressure: 0.03, pulseOnTime: 0.20, pulseOffTime: -0.08, wireSpeed: 0.35 },
    energyConsumption: { gapVoltage: 0.35, wireTension: 0.03, flushingPressure: 0.08, pulseOnTime: 0.30, pulseOffTime: -0.20, wireSpeed: 0.12 },
  },
  titanium: {
    mrr: { gapVoltage: 0.30, wireTension: -0.08, flushingPressure: 0.12, pulseOnTime: 0.35, pulseOffTime: -0.25, wireSpeed: 0.08 },
    surfaceRa: { gapVoltage: 0.30, wireTension: -0.12, flushingPressure: -0.08, pulseOnTime: 0.40, pulseOffTime: -0.18, wireSpeed: 0.08 },
    wireConsumption: { gapVoltage: 0.25, wireTension: 0.35, flushingPressure: 0.08, pulseOnTime: 0.30, pulseOffTime: -0.12, wireSpeed: 0.45 },
    energyConsumption: { gapVoltage: 0.45, wireTension: 0.08, flushingPressure: 0.12, pulseOnTime: 0.40, pulseOffTime: -0.30, wireSpeed: 0.18 },
  },
};

function getCoefficients(material: string): Record<OutcomeName, Record<FeatureName, number>> {
  const key = material.toLowerCase();
  if (key in MATERIAL_COEFFICIENTS) return MATERIAL_COEFFICIENTS[key];
  if (key.includes('aluminum') || key.includes('al')) return MATERIAL_COEFFICIENTS.aluminum;
  if (key.includes('titanium') || key.includes('ti')) return MATERIAL_COEFFICIENTS.titanium;
  return MATERIAL_COEFFICIENTS.steel;
}

function predictOutcome(
  params: WEDMDataPoint['parameters'],
  outcome: OutcomeName,
  coeffs: Record<FeatureName, number>,
  thickness: number
): number {
  let pred = 0;
  const thicknessFactor = Math.sqrt(thickness / 25);
  for (const feat of FEATURE_NAMES) {
    pred += coeffs[feat] * (params[feat] / getFeatureScale(feat));
  }
  // Base value + coefficient sum scaled by thickness
  const bases: Record<OutcomeName, number> = { mrr: 30, surfaceRa: 1.5, wireConsumption: 50, energyConsumption: 5 };
  return Math.max(0, bases[outcome] * (1 + pred) * thicknessFactor);
}

function getFeatureScale(feat: FeatureName): number {
  const scales: Record<FeatureName, number> = {
    gapVoltage: 60, wireTension: 15, flushingPressure: 1.0,
    pulseOnTime: 25, pulseOffTime: 50, wireSpeed: 10
  };
  return scales[feat];
}

export class WEDMFeatureImportanceEngine {
  /**
   * Compute permutation-based feature importance
   */
  computeImportance(
    data: WEDMDataPoint[],
    targetOutcome: OutcomeName,
    options?: { nPermutations?: number }
  ): FeatureImportanceResult[] {
    if (data.length === 0) {
      return FEATURE_NAMES.map((f, i) => ({ feature: f, importance: 0, stdDev: 0, rank: i + 1 }));
    }

    const nPerm = options?.nPermutations ?? 10;
    const material = data[0]?.material ?? 'steel';
    const coeffs = getCoefficients(material);
    const thickness = data[0]?.thickness ?? 25;

    // Baseline predictions
    const baselinePreds = data.map(d => predictOutcome(d.parameters, targetOutcome, coeffs[targetOutcome], thickness));
    const baselineError = this.computeMSE(data.map(d => d.outcomes[targetOutcome]), baselinePreds);

    const importances: { feature: string; scores: number[] }[] = [];

    for (const feat of FEATURE_NAMES) {
      const permScores: number[] = [];

      for (let p = 0; p < nPerm; p++) {
        // Permute feature values
        const permutedData = this.permuteFeature(data, feat);
        const permPreds = permutedData.map(d => predictOutcome(d.parameters, targetOutcome, coeffs[targetOutcome], thickness));
        const permError = this.computeMSE(data.map(d => d.outcomes[targetOutcome]), permPreds);
        permScores.push(permError - baselineError);
      }

      importances.push({ feature: feat, scores: permScores });
    }

    // Normalize and rank
    const results = importances.map(imp => {
      const mean = imp.scores.reduce((a, b) => a + b, 0) / imp.scores.length;
      const variance = imp.scores.reduce((a, b) => a + (b - mean) ** 2, 0) / imp.scores.length;
      return { feature: imp.feature, importance: Math.max(0, mean), stdDev: Math.sqrt(variance), rank: 0 };
    });

    // Normalize importances to sum to 1
    const total = results.reduce((a, b) => a + b.importance, 0) || 1;
    results.forEach(r => { r.importance /= total; });

    // Assign ranks
    results.sort((a, b) => b.importance - a.importance);
    results.forEach((r, i) => { r.rank = i + 1; });

    return results;
  }

  /**
   * Compute partial dependence for a feature-outcome pair
   */
  computePartialDependence(
    data: WEDMDataPoint[],
    feature: FeatureName,
    outcome: OutcomeName,
    options?: { nPoints?: number }
  ): PartialDependenceResult {
    const nPoints = options?.nPoints ?? 20;
    const material = data[0]?.material ?? 'steel';
    const coeffs = getCoefficients(material)[outcome];
    const thickness = data[0]?.thickness ?? 25;

    // Get feature range
    const values = data.map(d => d.parameters[feature]);
    const minVal = Math.min(...values, getFeatureScale(feature) * 0.5);
    const maxVal = Math.max(...values, getFeatureScale(feature) * 1.5);
    const step = (maxVal - minVal) / (nPoints - 1);

    const points: PartialDependencePoint[] = [];

    for (let i = 0; i < nPoints; i++) {
      const testValue = minVal + i * step;
      const preds: number[] = [];

      for (const d of data.length > 0 ? data : [this.createDefaultDataPoint(material, thickness)]) {
        const testParams = { ...d.parameters, [feature]: testValue };
        preds.push(predictOutcome(testParams, outcome, coeffs, thickness));
      }

      const mean = preds.reduce((a, b) => a + b, 0) / preds.length;
      const variance = preds.reduce((a, b) => a + (b - mean) ** 2, 0) / preds.length;

      points.push({
        value: testValue,
        predictedOutcome: mean,
        confidence: 1 / (1 + Math.sqrt(variance))
      });
    }

    // Determine trend
    const firstHalf = points.slice(0, Math.floor(nPoints / 2));
    const secondHalf = points.slice(Math.floor(nPoints / 2));
    const firstMean = firstHalf.reduce((a, b) => a + b.predictedOutcome, 0) / firstHalf.length;
    const secondMean = secondHalf.reduce((a, b) => a + b.predictedOutcome, 0) / secondHalf.length;
    const diff = secondMean - firstMean;
    const range = Math.max(...points.map(p => p.predictedOutcome)) - Math.min(...points.map(p => p.predictedOutcome));

    let trend: PartialDependenceResult['trend'];
    if (range < 0.01 * firstMean) trend = 'flat';
    else if (Math.abs(diff) < 0.1 * range) trend = 'nonlinear';
    else if (diff > 0) trend = 'increasing';
    else trend = 'decreasing';

    const sensitivity = range / (maxVal - minVal) * getFeatureScale(feature);

    return { feature, outcome, points, trend, sensitivity };
  }

  /**
   * Detect feature interactions
   */
  computeInteractions(
    data: WEDMDataPoint[],
    outcome: OutcomeName
  ): InteractionEffect[] {
    const interactions: InteractionEffect[] = [];
    const material = data[0]?.material ?? 'steel';
    const coeffs = getCoefficients(material)[outcome];
    const thickness = data[0]?.thickness ?? 25;

    for (let i = 0; i < FEATURE_NAMES.length; i++) {
      for (let j = i + 1; j < FEATURE_NAMES.length; j++) {
        const f1 = FEATURE_NAMES[i];
        const f2 = FEATURE_NAMES[j];

        // Compute interaction strength via variance of cross-effects
        const basePoint = data[0]?.parameters ?? this.createDefaultDataPoint(material, thickness).parameters;
        const scale1 = getFeatureScale(f1);
        const scale2 = getFeatureScale(f2);

        const lowLow = predictOutcome({ ...basePoint, [f1]: scale1 * 0.7, [f2]: scale2 * 0.7 }, outcome, coeffs, thickness);
        const lowHigh = predictOutcome({ ...basePoint, [f1]: scale1 * 0.7, [f2]: scale2 * 1.3 }, outcome, coeffs, thickness);
        const highLow = predictOutcome({ ...basePoint, [f1]: scale1 * 1.3, [f2]: scale2 * 0.7 }, outcome, coeffs, thickness);
        const highHigh = predictOutcome({ ...basePoint, [f1]: scale1 * 1.3, [f2]: scale2 * 1.3 }, outcome, coeffs, thickness);

        // Interaction = deviation from additive model
        const additiveExpected = (lowLow + highHigh) / 2;
        const crossExpected = (lowHigh + highLow) / 2;
        const interactionStrength = Math.abs(additiveExpected - crossExpected) / Math.max(additiveExpected, 0.01);

        let type: InteractionEffect['type'];
        if (interactionStrength < 0.05) type = 'independent';
        else if (highHigh > additiveExpected + crossExpected) type = 'synergistic';
        else type = 'antagonistic';

        interactions.push({ feature1: f1, feature2: f2, interactionStrength, type });
      }
    }

    return interactions.sort((a, b) => b.interactionStrength - a.interactionStrength);
  }

  /**
   * Get recommended parameters based on importance analysis
   */
  getOptimizationGuidance(
    importance: FeatureImportanceResult[],
    targetOutcome: OutcomeName,
    direction: 'maximize' | 'minimize'
  ): { feature: string; recommendation: string; priority: number }[] {
    const coeffs = MATERIAL_COEFFICIENTS.steel[targetOutcome];

    return importance.slice(0, 4).map(imp => {
      const coeff = coeffs[imp.feature as FeatureName];
      const shouldIncrease = (direction === 'maximize' && coeff > 0) || (direction === 'minimize' && coeff < 0);

      return {
        feature: imp.feature,
        recommendation: shouldIncrease ? 'increase' : 'decrease',
        priority: imp.importance
      };
    });
  }

  private computeMSE(actual: number[], predicted: number[]): number {
    if (actual.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < actual.length; i++) {
      sum += (actual[i] - predicted[i]) ** 2;
    }
    return sum / actual.length;
  }

  private permuteFeature(data: WEDMDataPoint[], feature: FeatureName): WEDMDataPoint[] {
    const values = data.map(d => d.parameters[feature]);
    // Fisher-Yates shuffle
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }
    return data.map((d, i) => ({
      ...d,
      parameters: { ...d.parameters, [feature]: values[i] }
    }));
  }

  private createDefaultDataPoint(material: string, thickness: number): WEDMDataPoint {
    return {
      parameters: { gapVoltage: 60, wireTension: 15, flushingPressure: 1.0, pulseOnTime: 25, pulseOffTime: 50, wireSpeed: 10 },
      outcomes: { mrr: 30, surfaceRa: 1.5, wireConsumption: 50, energyConsumption: 5 },
      material, thickness
    };
  }
}

export const wedmFeatureImportanceEngine = new WEDMFeatureImportanceEngine();
