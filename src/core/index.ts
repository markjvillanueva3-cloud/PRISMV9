/**
 * PRISM Core Module - Barrel Export
 * ==================================
 * Central export point for all core types and utilities.
 * 
 * @module prism/core
 * @version 1.0.0
 */

// AtomicValue types and factories
export {
  AtomicValue,
  AtomicRange,
  AtomicVector,
  ValueSource,
  ValueSourceType,
  ConfidenceLevel,
  ConfidenceMethod,
  CoordinateSystem,
  DimensionalAnalysis,
  MaterialProperty,
  CuttingParameter,
  ForceComponent,
  ToolLifePrediction,
  isAtomicValue,
  isExactValue,
  createAtomicValue,
  exactCount,
  handbookValue,
  formatAtomicValue,
  parseAtomicValue
} from './AtomicValue.types';

// Uncertainty propagation utilities
export {
  convertConfidence,
  add,
  subtract,
  multiply,
  divide,
  power,
  sqrt,
  exp,
  ln,
  sum,
  weightedMean,
  areEquivalent,
  isGreaterThan,
  monteCarloPropagate,
  validateAtomicValue
} from './UncertaintyMath';
