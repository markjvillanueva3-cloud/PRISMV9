/**
 * PRISM F1: Predictive Failure Prevention — Type Definitions
 * ===========================================================
 * 
 * PFP predicts which PRISM dispatcher actions will fail and blocks them
 * BEFORE wasting compute. PFP is a PRE-FILTER only — all passed actions
 * still go through full hook validation. S(x)≥0.70 hard threshold
 * enforced by hooks REGARDLESS. PFP is efficiency optimization, not
 * safety replacement.
 * 
 * Defense-in-depth: PFP → Pre-calc hooks → Calculation → Post-calc hooks
 *   → S(x)≥0.70 hard gate → Ω quality → Output hooks
 * 
 * @version 1.0.0
 * @feature F1
 */

import { crc32 } from '../engines/TelemetryEngine.js';

// ============================================================================
// ACTION HISTORY RECORD
// ============================================================================

export type ActionOutcome = 'success' | 'failure' | 'partial' | 'blocked' | 'timeout';

/**
 * Historical record of a dispatcher action invocation.
 * CRC32 integrity, UUID identity, typed outcome.
 */
export interface ActionRecord {
  readonly id: string;                  // UUID v4
  readonly timestamp: number;           // Unix ms
  readonly dispatcher: string;
  readonly action: string;
  readonly outcome: ActionOutcome;
  readonly durationMs: number;
  readonly errorClass?: string;
  readonly errorMessage?: string;
  readonly paramSignature: string;      // Hash of key param names (not values)
  readonly contextDepthPercent: number; // 0-100 at time of call
  readonly callNumber: number;          // Session dispatch count
  readonly checksum: number;            // CRC32 of all fields
}

export function computeActionChecksum(r: Omit<ActionRecord, 'checksum'>): number {
  const payload = `${r.id}|${r.timestamp}|${r.dispatcher}|${r.action}|${r.outcome}|${r.durationMs}|${r.errorClass || ''}|${r.paramSignature}|${r.contextDepthPercent}|${r.callNumber}`;
  return crc32(payload);
}

// ============================================================================
// FAILURE PATTERN
// ============================================================================

export type PatternType =
  | 'REPEATED_ERROR'         // Same error class on same dispatcher:action
  | 'CONTEXT_PRESSURE_FAIL'  // Failures correlate with high context depth
  | 'SEQUENCE_FAIL'          // Specific call sequences that lead to failure
  | 'TEMPORAL_CLUSTER'       // Failures cluster at certain call counts
  | 'PARAM_CORRELATION';     // Certain parameter combinations fail

/**
 * Extracted failure pattern from historical data.
 * Confidence interval, exponential decay weight.
 */
export interface FailurePattern {
  readonly id: string;                  // Pattern UUID
  readonly type: PatternType;
  readonly dispatcher: string;
  readonly action: string;
  readonly signature: string;           // Pattern fingerprint
  readonly confidence: number;          // 0.0-1.0 (Chi-squared w/ Bonferroni)
  readonly confidenceInterval: [number, number]; // [lower, upper] bounds
  readonly occurrences: number;         // Total times observed
  readonly lastSeen: number;            // Unix ms
  readonly decayWeight: number;         // Exponential decay (recent = higher)
  readonly context: PatternContext;
}

export interface PatternContext {
  readonly errorClass?: string;
  readonly avgContextDepth?: number;
  readonly callNumberRange?: [number, number];
  readonly paramKeys?: string[];
  readonly triggerSequence?: string[];  // e.g. ['prism_calc:cutting_force', 'prism_calc:tool_life']
}

// ============================================================================
// RISK ASSESSMENT
// ============================================================================

export type RiskLevel = 'GREEN' | 'YELLOW' | 'RED';

/**
 * Risk assessment for a proposed action.
 * RED risk actions with high overhead can be pre-filtered.
 */
export interface RiskAssessment {
  readonly dispatcher: string;
  readonly action: string;
  readonly riskLevel: RiskLevel;
  readonly riskScore: number;           // 0.0-1.0 (0=safe, 1=certain failure)
  readonly matchedPatterns: PatternMatch[];
  readonly recommendation: 'PROCEED' | 'WARN' | 'PRE_FILTER';
  readonly assessmentMs: number;
  readonly reason: string;
}

export interface PatternMatch {
  readonly patternId: string;
  readonly patternType: PatternType;
  readonly confidence: number;
  readonly decayWeight: number;
  readonly contribution: number;        // How much this pattern affects the score
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface PFPConfig {
  enabled: boolean;                     // default true (assess only, don't filter)
  preFilterEnabled: boolean;            // default false (assessment only until proven)
  historySize: number;                  // default 5000, range [500, 50000]
  patternExtractionInterval: number;    // default 50 (every N records)
  minOccurrences: number;               // default 3 (min times to form pattern)
  confidenceThreshold: number;          // default 0.75, range [0.5, 0.99]
  redThreshold: number;                 // default 0.7, range [0.5, 0.95]
  yellowThreshold: number;              // default 0.4, range [0.2, 0.7]
  decayHalfLifeMs: number;             // default 3600000 (1 hour)
  maxPatterns: number;                  // default 200
  excludeDispatchers: string[];         // Never pre-filter these
  riskScoringTimeoutMs: number;         // default 5, range [1, 20]
}

export const DEFAULT_PFP_CONFIG: PFPConfig = {
  enabled: true,
  preFilterEnabled: false,
  historySize: 5000,
  patternExtractionInterval: 50,
  minOccurrences: 3,
  confidenceThreshold: 0.75,
  redThreshold: 0.7,
  yellowThreshold: 0.4,
  decayHalfLifeMs: 3_600_000,
  maxPatterns: 200,
  excludeDispatchers: [
    'prism_safety',    // Never pre-filter safety checks
    'prism_session',   // Never pre-filter session management
    'prism_telemetry', // Never pre-filter telemetry itself
  ],
  riskScoringTimeoutMs: 5,
};

/**
 * Actions that must NEVER be pre-filtered regardless of risk.
 * Safety-critical actions always proceed to full hook validation.
 */
export const NEVER_FILTER_ACTIONS: ReadonlySet<string> = new Set([
  'check_toolpath_collision',
  'validate_rapid_moves',
  'check_fixture_clearance',
  'check_spindle_torque',
  'check_spindle_power',
  'predict_tool_breakage',
  'calculate_tool_stress',
  'check_chip_load_limits',
  'calculate_clamp_force_required',
  'validate_workholding_setup',
]);

// ============================================================================
// PFP STATS (DASHBOARD)
// ============================================================================

export interface PFPDashboard {
  readonly enabled: boolean;
  readonly preFilterEnabled: boolean;
  readonly historySize: number;
  readonly currentHistoryCount: number;
  readonly patternCount: number;
  readonly assessmentsTotal: number;
  readonly assessmentsByRisk: Record<RiskLevel, number>;
  readonly preFiltered: number;
  readonly avgAssessmentMs: number;
  readonly topPatterns: FailurePattern[];
}
