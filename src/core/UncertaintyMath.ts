/**
 * PRISM Uncertainty Propagation Utilities v1.0
 * =============================================
 * Mathematical operations with automatic uncertainty propagation.
 * Implements error propagation rules from PRISM SKILL: prism-uncertainty-propagation
 * 
 * @module prism/core/UncertaintyMath
 * @version 1.0.0
 * @created 2026-01-26
 */

import { AtomicValue, ConfidenceLevel, createAtomicValue } from './AtomicValue.types';

// =============================================================================
// Z-SCORES FOR CONFIDENCE LEVEL CONVERSION
// =============================================================================

const Z_SCORES: Record<ConfidenceLevel, number> = {
  0.68: 1.0,
  0.90: 1.645,
  0.95: 1.96,
  0.99: 2.576,
  0.997: 3.0
};

// =============================================================================
// CONFIDENCE LEVEL CONVERSION
// =============================================================================

/**
 * Convert uncertainty from one confidence level to another
 */
export function convertConfidence(
  av: AtomicValue,
  targetCI: ConfidenceLevel
): AtomicValue {
  if (av.confidence === targetCI) return av;
  
  const currentZ = Z_SCORES[av.confidence];
  const targetZ = Z_SCORES[targetCI];
  const newUncertainty = av.uncertainty * (targetZ / currentZ);
  
  return {
    ...av,
    uncertainty: newUncertainty,
    confidence: targetCI,
    source: {
      type: 'CALCULATED',
      confidenceMethod: 'PROPAGATED',
      inputs: ['confidence_conversion']
    }
  };
}

/**
 * Normalize two values to the same confidence level (95% default)
 */
function normalizeConfidence(
  a: AtomicValue,
  b: AtomicValue,
  targetCI: ConfidenceLevel = 0.95
): [AtomicValue, AtomicValue] {
  return [
    convertConfidence(a, targetCI),
    convertConfidence(b, targetCI)
  ];
}

// =============================================================================
// BASIC ARITHMETIC WITH UNCERTAINTY PROPAGATION
// =============================================================================

/**
 * Addition: z = x + y
 * Uncertainty: sigma_z = sqrt(sigma_x^2 + sigma_y^2)
 */
export function add(a: AtomicValue, b: AtomicValue): AtomicValue {
  // Unit check
  if (a.unit !== b.unit) {
    throw new Error(`Unit mismatch in addition: ${a.unit} vs ${b.unit}`);
  }
  
  // Normalize to same CI
  const [aNorm, bNorm] = normalizeConfidence(a, b);
  
  const value = aNorm.value + bNorm.value;
  const uncertainty = Math.sqrt(
    Math.pow(aNorm.uncertainty, 2) + Math.pow(bNorm.uncertainty, 2)
  );
  
  return createAtomicValue(value, uncertainty, a.unit, {
    confidence: 0.95,
    source: {
      type: 'CALCULATED',
      confidenceMethod: 'PROPAGATED',
      formulaId: 'F-PROP-ADD'
    }
  });
}

/**
 * Subtraction: z = x - y
 * Uncertainty: sigma_z = sqrt(sigma_x^2 + sigma_y^2)
 */
export function subtract(a: AtomicValue, b: AtomicValue): AtomicValue {
  if (a.unit !== b.unit) {
    throw new Error(`Unit mismatch in subtraction: ${a.unit} vs ${b.unit}`);
  }
  
  const [aNorm, bNorm] = normalizeConfidence(a, b);
  
  const value = aNorm.value - bNorm.value;
  const uncertainty = Math.sqrt(
    Math.pow(aNorm.uncertainty, 2) + Math.pow(bNorm.uncertainty, 2)
  );
  
  return createAtomicValue(value, uncertainty, a.unit, {
    confidence: 0.95,
    source: {
      type: 'CALCULATED',
      confidenceMethod: 'PROPAGATED',
      formulaId: 'F-PROP-SUB'
    }
  });
}

/**
 * Multiplication: z = x * y
 * Relative uncertainty: sigma_z/z = sqrt((sigma_x/x)^2 + (sigma_y/y)^2)
 */
export function multiply(a: AtomicValue, b: AtomicValue, resultUnit: string): AtomicValue {
  const [aNorm, bNorm] = normalizeConfidence(a, b);
  
  const value = aNorm.value * bNorm.value;
  
  // Handle zero values
  if (value === 0) {
    return createAtomicValue(0, 0, resultUnit, {
      confidence: 0.95,
      source: { type: 'CALCULATED', confidenceMethod: 'PROPAGATED' }
    });
  }
  
  const relUncA = aNorm.value !== 0 ? aNorm.uncertainty / Math.abs(aNorm.value) : 0;
  const relUncB = bNorm.value !== 0 ? bNorm.uncertainty / Math.abs(bNorm.value) : 0;
  const relUncZ = Math.sqrt(Math.pow(relUncA, 2) + Math.pow(relUncB, 2));
  const uncertainty = Math.abs(value) * relUncZ;
  
  return createAtomicValue(value, uncertainty, resultUnit, {
    confidence: 0.95,
    source: {
      type: 'CALCULATED',
      confidenceMethod: 'PROPAGATED',
      formulaId: 'F-PROP-MUL'
    }
  });
}

/**
 * Division: z = x / y
 * Relative uncertainty: sigma_z/z = sqrt((sigma_x/x)^2 + (sigma_y/y)^2)
 */
export function divide(a: AtomicValue, b: AtomicValue, resultUnit: string): AtomicValue {
  if (b.value === 0) {
    throw new Error('Division by zero');
  }
  
  const [aNorm, bNorm] = normalizeConfidence(a, b);
  
  const value = aNorm.value / bNorm.value;
  
  const relUncA = aNorm.value !== 0 ? aNorm.uncertainty / Math.abs(aNorm.value) : 0;
  const relUncB = bNorm.uncertainty / Math.abs(bNorm.value);
  const relUncZ = Math.sqrt(Math.pow(relUncA, 2) + Math.pow(relUncB, 2));
  const uncertainty = Math.abs(value) * relUncZ;
  
  return createAtomicValue(value, uncertainty, resultUnit, {
    confidence: 0.95,
    source: {
      type: 'CALCULATED',
      confidenceMethod: 'PROPAGATED',
      formulaId: 'F-PROP-DIV'
    }
  });
}

// =============================================================================
// POWER AND EXPONENTIAL FUNCTIONS
// =============================================================================

/**
 * Power: z = x^n
 * Relative uncertainty: sigma_z/z = |n| * (sigma_x/x)
 */
export function power(base: AtomicValue, exponent: number, resultUnit: string): AtomicValue {
  const value = Math.pow(base.value, exponent);
  
  const relUncBase = base.value !== 0 ? base.uncertainty / Math.abs(base.value) : 0;
  const relUncZ = Math.abs(exponent) * relUncBase;
  const uncertainty = Math.abs(value) * relUncZ;
  
  return createAtomicValue(value, uncertainty, resultUnit, {
    confidence: base.confidence,
    source: {
      type: 'CALCULATED',
      confidenceMethod: 'PROPAGATED',
      formulaId: 'F-PROP-POW'
    }
  });
}

/**
 * Square root: z = sqrt(x)
 * Relative uncertainty: sigma_z/z = 0.5 * (sigma_x/x)
 */
export function sqrt(a: AtomicValue, resultUnit: string): AtomicValue {
  if (a.value < 0) {
    throw new Error('Cannot take square root of negative value');
  }
  return power(a, 0.5, resultUnit);
}

/**
 * Exponential: z = e^x
 * Uncertainty: sigma_z = z * sigma_x
 */
export function exp(a: AtomicValue): AtomicValue {
  const value = Math.exp(a.value);
  const uncertainty = value * a.uncertainty;
  
  return createAtomicValue(value, uncertainty, 'ratio', {
    confidence: a.confidence,
    source: {
      type: 'CALCULATED',
      confidenceMethod: 'PROPAGATED',
      formulaId: 'F-PROP-EXP'
    }
  });
}

/**
 * Natural logarithm: z = ln(x)
 * Uncertainty: sigma_z = sigma_x / x
 */
export function ln(a: AtomicValue): AtomicValue {
  if (a.value <= 0) {
    throw new Error('Cannot take logarithm of non-positive value');
  }
  
  const value = Math.log(a.value);
  const uncertainty = a.uncertainty / a.value;
  
  return createAtomicValue(value, uncertainty, 'ratio', {
    confidence: a.confidence,
    source: {
      type: 'CALCULATED',
      confidenceMethod: 'PROPAGATED',
      formulaId: 'F-PROP-LN'
    }
  });
}

// =============================================================================
// AGGREGATION FUNCTIONS
// =============================================================================

/**
 * Sum multiple values
 */
export function sum(values: AtomicValue[]): AtomicValue {
  if (values.length === 0) {
    throw new Error('Cannot sum empty array');
  }
  
  const unit = values[0].unit;
  if (!values.every(v => v.unit === unit)) {
    throw new Error('All values must have the same unit for summation');
  }
  
  const normalized = values.map(v => convertConfidence(v, 0.95));
  const totalValue = normalized.reduce((sum, v) => sum + v.value, 0);
  const totalUncertainty = Math.sqrt(
    normalized.reduce((sum, v) => sum + Math.pow(v.uncertainty, 2), 0)
  );
  
  return createAtomicValue(totalValue, totalUncertainty, unit, {
    confidence: 0.95,
    source: {
      type: 'CALCULATED',
      confidenceMethod: 'PROPAGATED',
      formulaId: 'F-PROP-SUM'
    }
  });
}

/**
 * Weighted mean with uncertainty
 */
export function weightedMean(values: AtomicValue[], weights: number[]): AtomicValue {
  if (values.length !== weights.length) {
    throw new Error('Values and weights must have same length');
  }
  if (values.length === 0) {
    throw new Error('Cannot compute mean of empty array');
  }
  
  const unit = values[0].unit;
  const normalized = values.map(v => convertConfidence(v, 0.95));
  
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const weightedSum = normalized.reduce((sum, v, i) => sum + v.value * weights[i], 0);
  const mean = weightedSum / totalWeight;
  
  // Uncertainty of weighted mean
  const varianceSum = normalized.reduce(
    (sum, v, i) => sum + Math.pow(weights[i] * v.uncertainty / totalWeight, 2),
    0
  );
  const uncertainty = Math.sqrt(varianceSum);
  
  return createAtomicValue(mean, uncertainty, unit, {
    confidence: 0.95,
    source: {
      type: 'CALCULATED',
      confidenceMethod: 'PROPAGATED',
      formulaId: 'F-PROP-WMEAN'
    }
  });
}

// =============================================================================
// COMPARISON FUNCTIONS
// =============================================================================

/**
 * Check if two values are statistically equivalent (overlapping CIs)
 */
export function areEquivalent(a: AtomicValue, b: AtomicValue): boolean {
  if (a.unit !== b.unit) return false;
  
  const [aNorm, bNorm] = normalizeConfidence(a, b);
  
  const aLow = aNorm.value - aNorm.uncertainty;
  const aHigh = aNorm.value + aNorm.uncertainty;
  const bLow = bNorm.value - bNorm.uncertainty;
  const bHigh = bNorm.value + bNorm.uncertainty;
  
  return !(aHigh < bLow || bHigh < aLow);
}

/**
 * Check if a > b with statistical significance
 */
export function isGreaterThan(a: AtomicValue, b: AtomicValue): boolean {
  if (a.unit !== b.unit) {
    throw new Error('Cannot compare values with different units');
  }
  
  const [aNorm, bNorm] = normalizeConfidence(a, b);
  
  // a > b if lower bound of a exceeds upper bound of b
  return (aNorm.value - aNorm.uncertainty) > (bNorm.value + bNorm.uncertainty);
}

// =============================================================================
// MONTE CARLO SIMULATION (for complex formulas)
// =============================================================================

/**
 * Monte Carlo uncertainty propagation for arbitrary functions
 */
export function monteCarloPropagate(
  inputs: AtomicValue[],
  fn: (values: number[]) => number,
  resultUnit: string,
  iterations: number = 10000
): AtomicValue {
  const samples: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    // Sample from Gaussian distribution for each input
    const sampledValues = inputs.map(input => {
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      // Convert 95% CI uncertainty to 1-sigma
      const sigma = input.uncertainty / 1.96;
      return input.value + z * sigma;
    });
    
    samples.push(fn(sampledValues));
  }
  
  // Compute mean and standard deviation
  const mean = samples.reduce((sum, v) => sum + v, 0) / iterations;
  const variance = samples.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (iterations - 1);
  const stdDev = Math.sqrt(variance);
  
  // Convert 1-sigma to 95% CI
  const uncertainty95 = stdDev * 1.96;
  
  return createAtomicValue(mean, uncertainty95, resultUnit, {
    confidence: 0.95,
    source: {
      type: 'CALCULATED',
      confidenceMethod: 'STATISTICAL',
      dataPoints: iterations,
      formulaId: 'F-PROP-MC'
    }
  });
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate an AtomicValue meets PRISM requirements
 */
export function validateAtomicValue(av: AtomicValue): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (typeof av.value !== 'number' || isNaN(av.value)) {
    errors.push('Value must be a valid number');
  }
  
  if (typeof av.uncertainty !== 'number' || isNaN(av.uncertainty)) {
    errors.push('Uncertainty must be a valid number');
  }
  
  if (av.uncertainty < 0) {
    errors.push('Uncertainty cannot be negative');
  }
  
  if (av.isExact && av.uncertainty !== 0) {
    errors.push('Exact values must have uncertainty = 0');
  }
  
  if (!av.unit || av.unit.trim() === '') {
    errors.push('Unit is required');
  }
  
  const validCI: ConfidenceLevel[] = [0.68, 0.90, 0.95, 0.99, 0.997];
  if (!validCI.includes(av.confidence)) {
    errors.push(`Confidence must be one of: ${validCI.join(', ')}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
