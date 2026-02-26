/**
 * PRISM AtomicValue Types v1.0
 * ============================
 * Foundation types for ALL numerical values in PRISM Manufacturing Intelligence.
 * Implements COMMANDMENT 5: NEVER bare numbers.
 * 
 * @module prism/core/AtomicValue
 * @version 1.0.0
 * @created 2026-01-26
 */

// =============================================================================
// CORE TYPES
// =============================================================================

/**
 * Confidence levels supported by PRISM
 * Default: 0.95 (95% CI)
 */
export type ConfidenceLevel = 0.68 | 0.90 | 0.95 | 0.99 | 0.997;

/**
 * How a value was obtained - for provenance tracking
 */
export type ValueSourceType = 
  | 'MEASURED'      // Physical measurement
  | 'CALCULATED'    // Computed from formula
  | 'ESTIMATED'     // Engineering estimate
  | 'LITERATURE'    // From published paper
  | 'HANDBOOK'      // From engineering handbook
  | 'EMPIRICAL'     // From experimental data
  | 'DEFAULT'       // System default value
  | 'USER_INPUT'    // User-provided value
  | 'LEARNED';      // ML/AI learned value

/**
 * How uncertainty was determined
 */
export type ConfidenceMethod = 
  | 'STATISTICAL'           // From statistical analysis
  | 'ENGINEERING_JUDGMENT'  // Expert estimate
  | 'PROPAGATED'            // Computed from input uncertainties
  | 'HANDBOOK';             // From handbook tolerance

/**
 * Coordinate systems for vectors
 */
export type CoordinateSystem = 'CARTESIAN' | 'CYLINDRICAL' | 'SPHERICAL' | 'MACHINE';

// =============================================================================
// VALUE SOURCE (PROVENANCE)
// =============================================================================

/**
 * Tracks the origin and provenance of a value
 */
export interface ValueSource {
  type: ValueSourceType;
  reference?: string;           // Citation, handbook page, etc.
  formulaId?: string;           // F-XXX-NNN if calculated
  inputs?: string[];            // IDs of input values
  dataPoints?: number;          // Sample size if empirical
  confidenceMethod?: ConfidenceMethod;
}

// =============================================================================
// ATOMIC VALUE - THE CORE TYPE
// =============================================================================

/**
 * AtomicValue: A numerical value with mandatory uncertainty bounds.
 * The fundamental unit of mathematical certainty in PRISM.
 * 
 * Format: value +/- uncertainty unit (confidence% CI)
 * Example: 412 +/- 85 calls (95% CI)
 */
export interface AtomicValue {
  /** The central/nominal value */
  value: number;
  
  /** Absolute uncertainty (same units as value). Use 0 for exact counts. */
  uncertainty: number;
  
  /** Confidence level as decimal. PRISM default: 0.95 */
  confidence: ConfidenceLevel;
  
  /** SI unit or derived unit. Use 'count' for dimensionless, 'ratio' for ratios */
  unit: string;
  
  /** Origin/provenance of the value */
  source?: ValueSource;
  
  /** When the value was determined/measured */
  timestamp?: string;
  
  /** True if value is an exact count (uncertainty must be 0) */
  isExact?: boolean;
}

// =============================================================================
// DERIVED TYPES
// =============================================================================

/**
 * A range of values with uncertainty on both bounds
 */
export interface AtomicRange {
  min: AtomicValue;
  max: AtomicValue;
  typical?: AtomicValue;
}

/**
 * Multi-dimensional value with uncertainty
 */
export interface AtomicVector {
  components: AtomicValue[];
  unit: string;
  coordinateSystem?: CoordinateSystem;
  magnitude?: AtomicValue;
}

/**
 * SI base unit exponents for dimensional analysis
 */
export interface DimensionalAnalysis {
  kg?: number;   // Mass
  m?: number;    // Length
  s?: number;    // Time
  A?: number;    // Electric current
  K?: number;    // Temperature
  mol?: number;  // Amount of substance
  cd?: number;   // Luminous intensity
}

// =============================================================================
// PRISM-SPECIFIC ATOMIC TYPES
// =============================================================================

export interface MaterialProperty extends AtomicValue {
  propertyName: string;
  temperature?: AtomicValue;
  condition?: string;
}

export interface CuttingParameter extends AtomicValue {
  parameterType: 'speed' | 'feed' | 'depth' | 'width' | 'engagement';
  operatingRange?: AtomicRange;
  optimumValue?: AtomicValue;
}

export interface ForceComponent extends AtomicValue {
  direction: 'Fc' | 'Ff' | 'Fp' | 'tangential' | 'radial' | 'axial';
  formula?: string;
}

export interface ToolLifePrediction extends AtomicValue {
  criterion: 'VB' | 'crater' | 'fracture' | 'total_failure';
  taylorN?: AtomicValue;
  taylorC?: AtomicValue;
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

export function isAtomicValue(obj: unknown): obj is AtomicValue {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'value' in obj &&
    'uncertainty' in obj &&
    'confidence' in obj &&
    'unit' in obj &&
    typeof (obj as AtomicValue).value === 'number' &&
    typeof (obj as AtomicValue).uncertainty === 'number' &&
    (obj as AtomicValue).uncertainty >= 0
  );
}

export function isExactValue(av: AtomicValue): boolean {
  return av.isExact === true || av.uncertainty === 0;
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

export function createAtomicValue(
  value: number,
  uncertainty: number,
  unit: string,
  options?: Partial<AtomicValue>
): AtomicValue {
  return {
    value,
    uncertainty: Math.abs(uncertainty),
    confidence: 0.95,
    unit,
    timestamp: new Date().toISOString(),
    ...options
  };
}

export function exactCount(value: number, unit: string = 'count'): AtomicValue {
  return {
    value,
    uncertainty: 0,
    confidence: 0.95,
    unit,
    isExact: true,
    source: { type: 'MEASURED' }
  };
}

export function handbookValue(
  value: number,
  uncertainty: number,
  unit: string,
  reference: string
): AtomicValue {
  return {
    value,
    uncertainty,
    confidence: 0.95,
    unit,
    source: {
      type: 'HANDBOOK',
      reference,
      confidenceMethod: 'HANDBOOK'
    }
  };
}

// =============================================================================
// FORMATTING
// =============================================================================

export function formatAtomicValue(av: AtomicValue): string {
  if (av.isExact || av.uncertainty === 0) {
    return `${av.value} ${av.unit} (exact)`;
  }
  const ciPercent = Math.round(av.confidence * 100);
  return `${av.value} +/- ${av.uncertainty} ${av.unit} (${ciPercent}% CI)`;
}

export function parseAtomicValue(str: string): AtomicValue | null {
  const fullPattern = /^([\d.]+)\s*\+\/-\s*([\d.]+)\s+(\w+)\s*\((\d+)%\s*CI\)$/;
  const match = str.match(fullPattern);
  
  if (match) {
    return {
      value: parseFloat(match[1]),
      uncertainty: parseFloat(match[2]),
      confidence: (parseInt(match[4]) / 100) as ConfidenceLevel,
      unit: match[3]
    };
  }
  
  const simplePattern = /^([\d.]+)\s+(\w+)$/;
  const simpleMatch = str.match(simplePattern);
  
  if (simpleMatch) {
    const value = parseFloat(simpleMatch[1]);
    return {
      value,
      uncertainty: value * 0.1,
      confidence: 0.95,
      unit: simpleMatch[2],
      source: { type: 'ESTIMATED', confidenceMethod: 'ENGINEERING_JUDGMENT' }
    };
  }
  
  return null;
}
