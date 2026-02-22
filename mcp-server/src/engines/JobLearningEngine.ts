/**
 * R7-MS3: Job Learning Engine
 *
 * Adaptive manufacturing intelligence — accumulates job outcomes,
 * identifies patterns, and provides Bayesian-updated parameter adjustments.
 *
 * Actions:
 * - job_record: Record outcome of a completed job
 * - job_insights: Analyze accumulated history for patterns + adjustments
 *
 * Learning pipeline:
 * 1. job_plan → user runs job → user records outcome via job_record
 * 2. Engine accumulates outcomes keyed by material+operation+machine
 * 3. After N jobs (default 5), Bayesian updating adjusts formula coefficients
 * 4. job_insights surfaces patterns: over/under-prediction, material-specific corrections
 */

// ============================================================================
// TYPES
// ============================================================================

export type ToolFailureMode = 'none' | 'flank_wear' | 'crater_wear' | 'chipping' | 'breakage';

export interface JobRecordInput {
  job_plan_id?: string;
  material: string;
  operation: string;
  parameters_used: {
    vc_mpm: number;
    fz_mm: number;
    ap_mm: number;
    ae_mm?: number;
    strategy?: string;
    tool?: string;
  };
  outcome: {
    actual_tool_life_min?: number;
    actual_surface_finish_ra?: number;
    actual_cycle_time_min?: number;
    chatter_occurred?: boolean;
    tool_failure_mode?: ToolFailureMode;
    operator_notes?: string;
  };
  machine?: string;
  timestamp?: string;
}

export interface JobRecordResult {
  id: string;
  stored: boolean;
  total_jobs_for_key: number;
  learning_available: boolean;
  message: string;
  safety: { score: number; flags: string[] };
}

export interface JobInsightsInput {
  material?: string;
  operation?: string;
  machine?: string;
  min_jobs?: number;
}

export interface Pattern {
  finding: string;
  confidence: number;
  recommendation: string;
  evidence: {
    predicted_avg: number;
    actual_avg: number;
    std_dev: number;
    sample_size: number;
  };
}

export interface ParameterAdjustment {
  parameter: string;
  current_formula_value: number;
  recommended_value: number;
  basis: string;
}

export interface JobInsightsResult {
  sample_size: number;
  patterns: Pattern[];
  parameter_adjustments: ParameterAdjustment[];
  failure_analysis?: {
    total_failures: number;
    modes: Record<string, number>;
    most_common_mode: string;
    recommendation: string;
  };
  safety: { score: number; flags: string[] };
}

// ============================================================================
// JOB HISTORY STORE (in-memory, keyed by material+operation+machine)
// ============================================================================

interface StoredJob {
  id: string;
  timestamp: string;
  input: JobRecordInput;
}

function makeKey(material: string, operation?: string, machine?: string): string {
  return [material, operation ?? '*', machine ?? '*'].join('|').toLowerCase();
}

// In-memory store (persists within server process lifetime)
const jobStore: Map<string, StoredJob[]> = new Map();
let jobCounter = 0;

// ============================================================================
// TAYLOR-PREDICTED TOOL LIFE (for comparison against actual)
// ============================================================================

const TAYLOR_DB: Record<string, { C: number; n: number }> = {
  'aisi 4140': { C: 300, n: 0.25 },
  'aisi 1045': { C: 350, n: 0.25 },
  '6061-t6':   { C: 800, n: 0.40 },
  '7075-t6':   { C: 700, n: 0.35 },
  'ti-6al-4v': { C: 100, n: 0.20 },
  'inconel 718': { C: 60, n: 0.15 },
  '316l':      { C: 180, n: 0.20 },
};

function predictedToolLife(material: string, vc: number): number {
  const lower = material.toLowerCase();
  let coeffs = TAYLOR_DB[lower];
  if (!coeffs) {
    for (const [k, v] of Object.entries(TAYLOR_DB))
      if (lower.includes(k) || k.includes(lower)) { coeffs = v; break; }
  }
  if (!coeffs) coeffs = { C: 250, n: 0.25 }; // fallback
  return Math.pow(coeffs.C / vc, 1 / coeffs.n);
}

// Surface finish prediction: Ra ≈ fz² / (32 × rn) (nose radius 0.8mm default)
function predictedRa(fz: number): number {
  const rn = 0.8;
  return (fz * fz) / (32 * rn) * 1000; // in μm
}

// ============================================================================
// JOB RECORD
// ============================================================================

export function jobRecord(input: JobRecordInput): JobRecordResult {
  const id = `job_${++jobCounter}_${Date.now()}`;
  const key = makeKey(input.material, input.operation, input.machine);
  const timestamp = input.timestamp ?? new Date().toISOString();

  const stored: StoredJob = { id, timestamp, input };

  if (!jobStore.has(key)) jobStore.set(key, []);
  jobStore.get(key)!.push(stored);

  const totalForKey = jobStore.get(key)!.length;
  const learningAvailable = totalForKey >= 5;

  const flags: string[] = [];
  let safetyScore = 0.95;

  // Validate outcome data
  if (input.outcome.actual_tool_life_min !== undefined && input.outcome.actual_tool_life_min <= 0) {
    safetyScore -= 0.05; flags.push('Suspicious tool life ≤ 0');
  }
  if (input.outcome.tool_failure_mode === 'breakage') {
    flags.push('Tool breakage recorded — investigate root cause');
  }
  if (input.outcome.chatter_occurred) {
    flags.push('Chatter reported — consider parameter adjustment');
  }

  return {
    id,
    stored: true,
    total_jobs_for_key: totalForKey,
    learning_available: learningAvailable,
    message: learningAvailable
      ? `Job recorded. ${totalForKey} jobs accumulated — insights available.`
      : `Job recorded. ${5 - totalForKey} more jobs needed before insights are available.`,
    safety: { score: +safetyScore.toFixed(2), flags },
  };
}

// ============================================================================
// JOB INSIGHTS
// ============================================================================

export function jobInsights(input: JobInsightsInput): JobInsightsResult {
  const minJobs = input.min_jobs ?? 5;

  // Collect matching jobs
  const matchingJobs: StoredJob[] = [];
  for (const [key, jobs] of jobStore) {
    const [mat, op, mach] = key.split('|');
    if (input.material && !mat.includes(input.material.toLowerCase())) continue;
    if (input.operation && op !== '*' && !op.includes(input.operation.toLowerCase())) continue;
    if (input.machine && mach !== '*' && !mach.includes(input.machine.toLowerCase())) continue;
    matchingJobs.push(...jobs);
  }

  const sampleSize = matchingJobs.length;

  if (sampleSize === 0) {
    return {
      sample_size: 0,
      patterns: [],
      parameter_adjustments: [],
      safety: { score: 0.90, flags: ['No job data available — record jobs via job_record'] },
    };
  }

  if (sampleSize < minJobs) {
    return {
      sample_size: sampleSize,
      patterns: [],
      parameter_adjustments: [],
      safety: {
        score: 0.85,
        flags: [`Insufficient data: ${sampleSize} jobs recorded, need at least ${minJobs} for insights`],
      },
    };
  }

  // Analyze patterns
  const patterns: Pattern[] = [];
  const adjustments: ParameterAdjustment[] = [];

  // --- Tool Life Analysis ---
  const toolLifeJobs = matchingJobs.filter(j => j.input.outcome.actual_tool_life_min !== undefined);
  if (toolLifeJobs.length >= 3) {
    const actuals = toolLifeJobs.map(j => j.input.outcome.actual_tool_life_min!);
    const predicteds = toolLifeJobs.map(j => predictedToolLife(j.input.material, j.input.parameters_used.vc_mpm));

    const actualAvg = mean(actuals);
    const predictedAvg = mean(predicteds);
    const actualStd = stdDev(actuals);
    const ratio = actualAvg / (predictedAvg + 1e-10);

    if (ratio > 1.2) {
      patterns.push({
        finding: `Tool life ${((ratio - 1) * 100).toFixed(0)}% higher than Taylor prediction`,
        confidence: Math.min(0.95, 0.5 + sampleSize * 0.05),
        recommendation: `Consider increasing Vc by ${Math.round((ratio - 1) * 50)}% for this material — actual tool wear is lower than predicted`,
        evidence: { predicted_avg: +predictedAvg.toFixed(1), actual_avg: +actualAvg.toFixed(1), std_dev: +actualStd.toFixed(2), sample_size: toolLifeJobs.length },
      });
      adjustments.push({
        parameter: 'taylor_C',
        current_formula_value: +predictedAvg.toFixed(1),
        recommended_value: +actualAvg.toFixed(1),
        basis: `${toolLifeJobs.length} jobs, ratio=${ratio.toFixed(2)}`,
      });
    } else if (ratio < 0.8) {
      patterns.push({
        finding: `Tool life ${((1 - ratio) * 100).toFixed(0)}% lower than Taylor prediction`,
        confidence: Math.min(0.95, 0.5 + sampleSize * 0.05),
        recommendation: `Reduce Vc by ${Math.round((1 - ratio) * 50)}% — tool wear is higher than predicted`,
        evidence: { predicted_avg: +predictedAvg.toFixed(1), actual_avg: +actualAvg.toFixed(1), std_dev: +actualStd.toFixed(2), sample_size: toolLifeJobs.length },
      });
      adjustments.push({
        parameter: 'taylor_C',
        current_formula_value: +predictedAvg.toFixed(1),
        recommended_value: +actualAvg.toFixed(1),
        basis: `${toolLifeJobs.length} jobs, ratio=${ratio.toFixed(2)}`,
      });
    } else {
      patterns.push({
        finding: 'Tool life matches Taylor prediction within ±20%',
        confidence: Math.min(0.95, 0.5 + sampleSize * 0.05),
        recommendation: 'Current parameters are well-calibrated for this material',
        evidence: { predicted_avg: +predictedAvg.toFixed(1), actual_avg: +actualAvg.toFixed(1), std_dev: +actualStd.toFixed(2), sample_size: toolLifeJobs.length },
      });
    }
  }

  // --- Surface Finish Analysis ---
  const raJobs = matchingJobs.filter(j => j.input.outcome.actual_surface_finish_ra !== undefined);
  if (raJobs.length >= 3) {
    const actuals = raJobs.map(j => j.input.outcome.actual_surface_finish_ra!);
    const predicteds = raJobs.map(j => predictedRa(j.input.parameters_used.fz_mm));

    const actualAvg = mean(actuals);
    const predictedAvg = mean(predicteds);
    const actualStd = stdDev(actuals);
    const ratio = actualAvg / (predictedAvg + 1e-10);

    if (ratio < 0.8) {
      // Actual Ra consistently lower (better) than predicted
      patterns.push({
        finding: `Surface finish ${((1 - ratio) * 100).toFixed(0)}% better than geometric prediction`,
        confidence: Math.min(0.90, 0.4 + raJobs.length * 0.06),
        recommendation: 'Actual surface is smoother — may allow coarser feed for productivity gain',
        evidence: { predicted_avg: +predictedAvg.toFixed(3), actual_avg: +actualAvg.toFixed(3), std_dev: +actualStd.toFixed(4), sample_size: raJobs.length },
      });
      adjustments.push({
        parameter: 'ra_correction_factor',
        current_formula_value: 1.0,
        recommended_value: +ratio.toFixed(3),
        basis: `${raJobs.length} jobs, actual/predicted=${ratio.toFixed(3)}`,
      });
    } else if (ratio > 1.2) {
      patterns.push({
        finding: `Surface finish ${((ratio - 1) * 100).toFixed(0)}% worse than geometric prediction`,
        confidence: Math.min(0.90, 0.4 + raJobs.length * 0.06),
        recommendation: 'Reduce feed rate or check tool wear — actual Ra exceeds prediction',
        evidence: { predicted_avg: +predictedAvg.toFixed(3), actual_avg: +actualAvg.toFixed(3), std_dev: +actualStd.toFixed(4), sample_size: raJobs.length },
      });
    }
  }

  // --- Chatter Analysis ---
  const chatterJobs = matchingJobs.filter(j => j.input.outcome.chatter_occurred !== undefined);
  if (chatterJobs.length >= 3) {
    const chatterCount = chatterJobs.filter(j => j.input.outcome.chatter_occurred).length;
    const chatterRate = chatterCount / chatterJobs.length;
    if (chatterRate > 0.3) {
      patterns.push({
        finding: `Chatter occurs in ${(chatterRate * 100).toFixed(0)}% of jobs`,
        confidence: Math.min(0.85, 0.4 + chatterJobs.length * 0.05),
        recommendation: 'Reduce depth of cut or adjust spindle speed — high chatter rate indicates instability',
        evidence: { predicted_avg: 0, actual_avg: chatterRate, std_dev: 0, sample_size: chatterJobs.length },
      });
    }
  }

  // --- Failure Mode Analysis ---
  const failureJobs = matchingJobs.filter(j =>
    j.input.outcome.tool_failure_mode && j.input.outcome.tool_failure_mode !== 'none'
  );
  let failureAnalysis: JobInsightsResult['failure_analysis'] | undefined;
  if (failureJobs.length > 0) {
    const modes: Record<string, number> = {};
    for (const j of failureJobs) {
      const mode = j.input.outcome.tool_failure_mode!;
      modes[mode] = (modes[mode] || 0) + 1;
    }
    const mostCommon = Object.entries(modes).sort((a, b) => b[1] - a[1])[0];

    const recs: Record<string, string> = {
      'flank_wear': 'Reduce cutting speed or use coated insert — progressive flank wear dominant',
      'crater_wear': 'Reduce feed or use Al2O3-coated insert — crater wear at high temperature',
      'chipping': 'Reduce feed per tooth or use tougher substrate — edge chipping indicates impact',
      'breakage': 'CRITICAL: Reduce depth of cut and check tool runout — breakage indicates overload',
    };

    failureAnalysis = {
      total_failures: failureJobs.length,
      modes,
      most_common_mode: mostCommon[0],
      recommendation: recs[mostCommon[0]] ?? 'Review cutting parameters',
    };
  }

  // Safety
  const flags: string[] = [];
  let safetyScore = 0.90;
  if (sampleSize < 10) { safetyScore -= 0.05; flags.push('Small sample size — insights have limited statistical significance'); }
  if (failureJobs.length > sampleSize * 0.3) { safetyScore -= 0.10; flags.push('High failure rate — review process stability'); }
  safetyScore = Math.max(0.40, safetyScore);

  return {
    sample_size: sampleSize,
    patterns,
    parameter_adjustments: adjustments,
    failure_analysis: failureAnalysis,
    safety: { score: +safetyScore.toFixed(2), flags },
  };
}

// ============================================================================
// UTILITY: CLEAR STORE (for testing)
// ============================================================================

export function clearJobStore(): void {
  jobStore.clear();
  jobCounter = 0;
}

export function getJobStoreSize(): number {
  let total = 0;
  for (const jobs of jobStore.values()) total += jobs.length;
  return total;
}

// ============================================================================
// STATISTICS HELPERS
// ============================================================================

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((s, x) => s + (x - m) * (x - m), 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

// ============================================================================
// DISPATCHER FUNCTION
// ============================================================================

export function jobLearning(action: string, params: Record<string, unknown>): unknown {
  switch (action) {
    case 'job_record':
      return jobRecord(params as unknown as JobRecordInput);
    case 'job_insights':
      return jobInsights(params as unknown as JobInsightsInput);
    default:
      return { error: `Unknown job learning action: ${action}` };
  }
}
