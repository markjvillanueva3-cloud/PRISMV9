/**
 * PRISM F1: Predictive Failure Prevention Engine
 * ================================================
 * 
 * Predicts which PRISM actions will fail BEFORE dispatch.
 * PFP is a PRE-FILTER only — all passed actions still go through
 * full hook validation including S(x)≥0.70 hard threshold.
 * 
 * Architecture:
 * 1. HistoryBuffer — ring buffer of ActionRecords with CRC32
 * 2. PatternExtractor — chi-squared significance testing
 * 3. RiskScorer — pattern matching → risk assessment
 * 
 * SAFETY: PFP failure = all actions pass normally to hooks.
 * PFP NEVER blocks safety-critical calculations.
 * 
 * @version 1.0.0
 * @feature F1
 */

import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import {
  ActionRecord, ActionOutcome, FailurePattern, PatternType, PatternDetails,
  RiskAssessment, RiskLevel, PatternMatch,
  PFPConfig, DEFAULT_PFP_CONFIG,
  PFPDashboard, ExtractionStats, PFPHealthMetrics,
} from '../types/pfp-types.js';
import { log } from '../utils/Logger.js';
import { safeWriteSync } from "../utils/atomicWrite.js";

// ============================================================================
// CRC32 (same as TelemetryEngine — shared utility)
// ============================================================================

const CRC32_TABLE: number[] = [];
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC32_TABLE[i] = c;
}

function crc32(str: string): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < str.length; i++) {
    crc = CRC32_TABLE[(crc ^ str.charCodeAt(i)) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function computeActionChecksum(r: Omit<ActionRecord, 'checksum'>): number {
  return crc32(`${r.id}|${r.timestamp}|${r.dispatcher}|${r.action}|${r.outcome}|${r.latencyMs}|${r.errorClass || ''}|${r.paramSignature}|${r.contextDepthPercent}|${r.callNumber}`);
}

function validateActionChecksum(r: ActionRecord): boolean {
  return computeActionChecksum(r) === r.checksum;
}

// ============================================================================
// CONFIG VALIDATION
// ============================================================================

function validateConfig(cfg: Partial<PFPConfig>): PFPConfig {
  const base = { ...DEFAULT_PFP_CONFIG } as any;
  const clamp = (val: number | undefined, min: number, max: number, fb: number): number => {
    if (val === undefined || val === null || isNaN(val)) return fb;
    return val < min || val > max ? fb : val;
  };

  // DEFAULT_PFP_CONFIG uses flat fields (yellowThreshold/redThreshold/historySize)
  // but this engine uses nested/renamed fields — bridge the gap safely
  const yellowFb = base.riskThresholds?.yellow ?? base.yellowThreshold ?? 0.4;
  const redFb = base.riskThresholds?.red ?? base.redThreshold ?? 0.7;

  return {
    enabled: typeof cfg.enabled === 'boolean' ? cfg.enabled : base.enabled,
    historyBufferSize: clamp(cfg.historyBufferSize ?? cfg.historySize, 500, 50000, base.historyBufferSize ?? base.historySize ?? 5000),
    patternExtractionIntervalCalls: clamp(cfg.patternExtractionIntervalCalls ?? cfg.patternExtractionInterval, 10, 500, base.patternExtractionIntervalCalls ?? base.patternExtractionInterval ?? 50),
    minSamplesForPattern: clamp(cfg.minSamplesForPattern ?? cfg.minOccurrences, 5, 100, base.minSamplesForPattern ?? base.minOccurrences ?? 3),
    confidenceThreshold: clamp(cfg.confidenceThreshold, 0.50, 0.95, base.confidenceThreshold ?? 0.75),
    decayHalfLifeMs: clamp(cfg.decayHalfLifeMs, 300000, 86400000, base.decayHalfLifeMs ?? 3600000),
    riskThresholds: {
      yellow: clamp(cfg.riskThresholds?.yellow ?? cfg.yellowThreshold, 0.10, 0.50, yellowFb),
      red: clamp(cfg.riskThresholds?.red ?? cfg.redThreshold, 0.40, 0.90, redFb),
    },
    maxPatternsPerAction: clamp(cfg.maxPatternsPerAction ?? cfg.maxPatterns, 5, 100, base.maxPatternsPerAction ?? base.maxPatterns ?? 200),
    maxAssessmentTimeMs: clamp(cfg.maxAssessmentTimeMs ?? cfg.riskScoringTimeoutMs, 1, 50, base.maxAssessmentTimeMs ?? base.riskScoringTimeoutMs ?? 5),
    chiSquaredAlpha: clamp(cfg.chiSquaredAlpha, 0.001, 0.10, base.chiSquaredAlpha ?? 0.05),
  } as PFPConfig;
}

// ============================================================================
// STATE DIRECTORY
// ============================================================================

const STATE_DIR = path.join(process.cwd(), 'state', 'pfp');

function ensureStateDir(): void {
  try {
    if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
  } catch { /* non-fatal */ }
}

// ============================================================================
// CHI-SQUARED SIGNIFICANCE TEST
// ============================================================================

/**
 * Chi-squared test for independence (2x2 contingency table).
 * Tests whether failure rate for a subset differs significantly from overall.
 * Returns p-value approximation. Bonferroni correction applied externally.
 */
function chiSquared2x2(
  subsetFailures: number, subsetTotal: number,
  overallFailures: number, overallTotal: number
): number {
  if (subsetTotal <= 0 || overallTotal <= 0) return 1.0;

  const subsetSuccess = subsetTotal - subsetFailures;
  const otherFailures = overallFailures - subsetFailures;
  const otherTotal = overallTotal - subsetTotal;
  const otherSuccess = otherTotal - otherFailures;

  if (otherTotal <= 0) return 1.0;

  // Expected values
  const n = overallTotal;
  const rowTotals = [subsetTotal, otherTotal];
  const colTotals = [overallFailures, overallTotal - overallFailures];

  // Compute chi-squared statistic
  const cells = [
    [subsetFailures, subsetSuccess],
    [otherFailures, otherSuccess],
  ];

  let chiSq = 0;
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      const expected = (rowTotals[i] * colTotals[j]) / n;
      if (expected > 0) {
        chiSq += Math.pow(cells[i][j] - expected, 2) / expected;
      }
    }
  }

  // Approximate p-value from chi-squared distribution (1 df)
  // Using Wilson-Hilferty approximation
  if (chiSq <= 0) return 1.0;
  const p = Math.exp(-chiSq / 2); // Simple exponential approximation for 1 df
  return Math.max(0, Math.min(1, p));
}

// ============================================================================
// PARAM SIGNATURE — hash key parameter names (not values)
// ============================================================================

function computeParamSignature(params: any): string {
  try {
    if (!params || typeof params !== 'object') return 'empty';
    const keys = Object.keys(params).sort().join(',');
    return String(crc32(keys));
  } catch {
    return 'unknown';
  }
}


// ============================================================================
// PREDICTIVE FAILURE ENGINE — SINGLETON
// ============================================================================

export class PredictiveFailureEngine {
  private config: PFPConfig;
  private history: ActionRecord[] = [];
  private historyWriteIndex: number = 0;
  private historySize: number = 0;
  private patterns: Map<string, FailurePattern[]> = new Map(); // dispatcher:action → patterns
  private recentAssessments: RiskAssessment[] = [];
  private recordsSinceExtraction: number = 0;
  private initialized: boolean = false;

  // Stats
  private stats: ExtractionStats = {
    lastExtractionTime: 0,
    totalExtractions: 0,
    patternsDiscovered: 0,
    patternsExpired: 0,
    avgExtractionTimeMs: 0,
  };
  private assessmentTimes: number[] = [];
  private totalAssessments: number = 0;
  private totalSkipRecommendations: number = 0;

  constructor(configOverrides?: Partial<PFPConfig>) {
    this.config = validateConfig(configOverrides || {});
    this.history = new Array(this.config.historyBufferSize!!);
    this.loadConfig();
    ensureStateDir();
  }

  init(): void {
    if (this.initialized) return;
    this.loadPatterns();
    this.initialized = true;
    log.info(`[PFP] Engine initialized (buffer=${this.config.historyBufferSize!!}, extraction_interval=${this.config.patternExtractionIntervalCalls!!}, confidence=${this.config.confidenceThreshold})`);
  }

  // ==========================================================================
  // HISTORY RECORDING
  // ==========================================================================

  /**
   * Record a completed action. Called by autoHookWrapper after dispatch.
   * MUST be try/catch safe — never throws, never blocks.
   */
  recordAction(
    dispatcher: string, action: string, outcome: ActionOutcome,
    latencyMs: number, errorClass?: string, params?: any,
    contextDepthPercent: number = 0, callNumber: number = 0
  ): void {
    try {
      const partial: Omit<ActionRecord, 'checksum'> = {
        id: randomUUID(),
        timestamp: Date.now(),
        dispatcher,
        action,
        outcome,
        durationMs: latencyMs,
        latencyMs,
        errorClass,
        paramSignature: computeParamSignature(params),
        contextDepthPercent,
        callNumber,
      };

      const record: ActionRecord = {
        ...partial,
        checksum: computeActionChecksum(partial),
      };

      this.history[this.historyWriteIndex] = record;
      this.historyWriteIndex = (this.historyWriteIndex + 1) % this.config.historyBufferSize!;
      if (this.historySize < this.config.historyBufferSize!) this.historySize++;

      // Trigger extraction when enough new records accumulated
      this.recordsSinceExtraction++;
      if (this.recordsSinceExtraction >= this.config.patternExtractionIntervalCalls!) {
        this.extractPatterns();
        this.recordsSinceExtraction = 0;
      }
    } catch { /* NEVER throw from recordAction */ }
  }

  // ==========================================================================
  // RISK ASSESSMENT — The core pre-filter
  // ==========================================================================

  /**
   * Assess risk for a pending action. Called BEFORE dispatch.
   * Must be fast (<5ms). Returns GREEN if PFP is disabled or has no data.
   */
  assessRisk(dispatcher: string, action: string, params?: any, contextDepthPercent: number = 0, callNumber: number = 0): RiskAssessment {
    const assessStart = performance.now();

    try {
      if (!this.config.enabled || this.historySize < this.config.minSamplesForPattern!) {
        return this.greenAssessment(dispatcher, action, assessStart);
      }

      const key = `${dispatcher}:${action}`;
      const actionPatterns = this.patterns.get(key);

      if (!actionPatterns || actionPatterns.length === 0) {
        return this.greenAssessment(dispatcher, action, assessStart);
      }

      // Score against matched patterns
      const matches: PatternMatch[] = [];
      let totalRisk = 0;
      const paramSig = computeParamSignature(params);
      const now = Date.now();

      for (const pattern of actionPatterns) {
        // Apply exponential decay
        const age = now - pattern.lastSeen;
        const decayFactor = Math.exp(-0.693 * age / this.config.decayHalfLifeMs!); // ln(2) = 0.693
        const effectiveConfidence = pattern.confidence * decayFactor;

        if (effectiveConfidence < 0.1) continue; // decayed below relevance

        let matched = false;
        let contribution = 0;

        const det = pattern.details as any;
        switch (pattern.type) {
          case 'ACTION_ERROR_RATE':
            matched = true;
            contribution = (pattern.failureRate || 0) * effectiveConfidence;
            break;

          case 'PARAM_COMBO_FAILURE':
            if (det && det.type === 'PARAM_COMBO_FAILURE' && det.paramSignature === paramSig) {
              matched = true;
              contribution = (pattern.failureRate || 0) * effectiveConfidence * 1.5; // boost for specific param match
            }
            break;

          case 'CONTEXT_DEPTH_FAILURE':
            if (det && det.type === 'CONTEXT_DEPTH_FAILURE' && contextDepthPercent > det.thresholdPercent) {
              matched = true;
              contribution = det.failureRateAbove * effectiveConfidence;
            }
            break;

          case 'SEQUENCE_FAILURE':
            // Check if preceding action matches (look at last history entry)
            if (det && det.type === 'SEQUENCE_FAILURE') {
              const lastRecord = this.getLastRecord();
              if (lastRecord && `${lastRecord.dispatcher}:${lastRecord.action}` === det.precedingAction) {
                matched = true;
                contribution = det.failureRateAfter * effectiveConfidence;
              }
            }
            break;

          case 'TEMPORAL_FAILURE':
            if (det && det.type === 'TEMPORAL_FAILURE' && callNumber > det.callCountThreshold) {
              matched = true;
              contribution = det.failureRateAbove * effectiveConfidence;
            }
            break;
        }

        if (matched) {
          matches.push({
            patternId: pattern.id,
            patternType: pattern.type,
            confidence: effectiveConfidence,
            contribution,
          });
          totalRisk += contribution;
        }
      }

      // Clamp risk score 0-1
      const riskScore = Math.min(1.0, Math.max(0, totalRisk));

      // Determine risk level
      let riskLevel: RiskLevel = 'GREEN';
      let recommendation: 'PROCEED' | 'WARN' | 'CONSIDER_SKIP' = 'PROCEED';

      if (riskScore >= this.config.riskThresholds!.red) {
        riskLevel = 'RED';
        recommendation = 'CONSIDER_SKIP';
      } else if (riskScore >= this.config.riskThresholds!.yellow) {
        riskLevel = 'YELLOW';
        recommendation = 'WARN';
      }

      // Estimate latency from history
      const estimatedLatency = this.estimateLatency(dispatcher, action);
      const assessmentTime = performance.now() - assessStart;

      const assessment: RiskAssessment = {
        dispatcher, action, riskLevel, riskScore,
        matchedPatterns: matches,
        recommendation,
        estimatedLatencyMs: estimatedLatency,
        assessmentTimeMs: assessmentTime,
      };

      // Track assessment
      this.totalAssessments++;
      this.assessmentTimes.push(assessmentTime);
      if (this.assessmentTimes.length > 500) this.assessmentTimes.splice(0, 250);
      if (recommendation === 'CONSIDER_SKIP') this.totalSkipRecommendations++;

      // Store recent assessments (bounded)
      this.recentAssessments.push(assessment);
      if (this.recentAssessments.length > 50) this.recentAssessments.splice(0, 25);

      return assessment;
    } catch {
      // PFP failure = GREEN (all actions pass normally)
      return this.greenAssessment(dispatcher, action, assessStart);
    }
  }

  private greenAssessment(dispatcher: string, action: string, startTime: number): RiskAssessment {
    return {
      dispatcher, action,
      riskLevel: 'GREEN', riskScore: 0,
      matchedPatterns: [],
      recommendation: 'PROCEED',
      estimatedLatencyMs: 0,
      assessmentTimeMs: performance.now() - startTime,
    };
  }

  private getLastRecord(): ActionRecord | null {
    if (this.historySize === 0) return null;
    const idx = (this.historyWriteIndex - 1 + this.config.historyBufferSize!) % this.config.historyBufferSize!;
    return this.history[idx] || null;
  }

  private estimateLatency(dispatcher: string, action: string): number {
    let totalMs = 0, count = 0;
    const startIdx = this.historySize < this.config.historyBufferSize! ? 0 : this.historyWriteIndex;
    for (let i = 0; i < this.historySize && count < 100; i++) {
      const idx = (startIdx + i) % this.config.historyBufferSize!;
      const r = this.history[idx];
      if (r && r.dispatcher === dispatcher && r.action === action && r.outcome === 'success') {
        totalMs += r.latencyMs;
        count++;
      }
    }
    return count > 0 ? totalMs / count : 0;
  }

  // ==========================================================================
  // PATTERN EXTRACTION — Chi-squared significance testing
  // ==========================================================================

  extractPatterns(): void {
    try {
      const extractStart = performance.now();
      const now = Date.now();
      const newPatterns: Map<string, FailurePattern[]> = new Map();

      // Gather valid records
      const records: ActionRecord[] = [];
      const startIdx = this.historySize < this.config.historyBufferSize! ? 0 : this.historyWriteIndex;
      for (let i = 0; i < this.historySize; i++) {
        const idx = (startIdx + i) % this.config.historyBufferSize!;
        const r = this.history[idx];
        if (r && validateActionChecksum(r)) records.push(r);
      }

      if (records.length < this.config.minSamplesForPattern!) return;

      // Group by dispatcher:action
      const groups: Map<string, ActionRecord[]> = new Map();
      for (const r of records) {
        const key = `${r.dispatcher}:${r.action}`;
        const list = groups.get(key) || [];
        list.push(r);
        groups.set(key, list);
      }

      const overallFailures = records.filter(r => r.outcome === 'failure').length;
      const bonferroniCorrection = Math.max(1, groups.size * 5); // 5 pattern types per group

      for (const [key, groupRecords] of groups) {
        if (groupRecords.length < this.config.minSamplesForPattern!) continue;

        const [dispatcher, action] = key.split(':');
        const failures = groupRecords.filter(r => r.outcome === 'failure');
        const failureRate = failures.length / groupRecords.length;
        const actionPatterns: FailurePattern[] = [];

        // Pattern 1: ACTION_ERROR_RATE
        if (failures.length >= 3) {
          const pValue = chiSquared2x2(failures.length, groupRecords.length, overallFailures, records.length);
          const adjustedAlpha = this.config.chiSquaredAlpha! / bonferroniCorrection;

          if (pValue < adjustedAlpha && failureRate > 0.05) {
            const errorClasses: Record<string, number> = {};
            for (const f of failures) {
              if (f.errorClass) errorClasses[f.errorClass] = (errorClasses[f.errorClass] || 0) + 1;
            }

            const ci = this.wilsonCI(failures.length, groupRecords.length, 0.95);
            actionPatterns.push({
              id: randomUUID(), type: 'ACTION_ERROR_RATE',
              dispatcher, action,
              confidence: 1 - pValue,
              confidenceInterval: ci,
              sampleSize: groupRecords.length,
              failureRate,
              decayWeight: 1.0,
              firstSeen: groupRecords[0].timestamp,
              lastSeen: groupRecords[groupRecords.length - 1].timestamp,
              details: { type: 'ACTION_ERROR_RATE', errorClasses },
            });
          }
        }

        // Pattern 2: PARAM_COMBO_FAILURE
        const paramGroups: Map<string, { total: number; failures: number }> = new Map();
        for (const r of groupRecords) {
          const pg = paramGroups.get(r.paramSignature) || { total: 0, failures: 0 };
          pg.total++;
          if (r.outcome === 'failure') pg.failures++;
          paramGroups.set(r.paramSignature, pg);
        }

        for (const [sig, pg] of paramGroups) {
          if (pg.total >= this.config.minSamplesForPattern! && pg.failures >= 3) {
            const paramFailRate = pg.failures / pg.total;
            if (paramFailRate > failureRate * 1.5) { // Significantly worse than overall
              const ci = this.wilsonCI(pg.failures, pg.total, 0.95);
              actionPatterns.push({
                id: randomUUID(), type: 'PARAM_COMBO_FAILURE',
                dispatcher, action,
                confidence: Math.min(0.99, paramFailRate / failureRate - 0.5),
                confidenceInterval: ci,
                sampleSize: pg.total,
                failureRate: paramFailRate,
                decayWeight: 1.0,
                firstSeen: now, lastSeen: now,
                details: { type: 'PARAM_COMBO_FAILURE', paramSignature: sig, failCount: pg.failures, totalCount: pg.total },
              });
            }
          }
        }

        // Pattern 3: CONTEXT_DEPTH_FAILURE — test at 50%, 60%, 70%, 80%
        for (const threshold of [50, 60, 70, 80]) {
          const above = groupRecords.filter(r => r.contextDepthPercent > threshold);
          const aboveFailures = above.filter(r => r.outcome === 'failure');
          const below = groupRecords.filter(r => r.contextDepthPercent <= threshold);
          const belowFailures = below.filter(r => r.outcome === 'failure');

          if (above.length >= this.config.minSamplesForPattern! && below.length >= this.config.minSamplesForPattern!) {
            const aboveRate = aboveFailures.length / above.length;
            const belowRate = belowFailures.length / below.length;

            if (aboveRate > belowRate * 2 && aboveRate > 0.1) {
              const ci = this.wilsonCI(aboveFailures.length, above.length, 0.95);
              actionPatterns.push({
                id: randomUUID(), type: 'CONTEXT_DEPTH_FAILURE',
                dispatcher, action,
                confidence: Math.min(0.99, (aboveRate - belowRate) / aboveRate),
                confidenceInterval: ci,
                sampleSize: above.length,
                failureRate: aboveRate,
                decayWeight: 1.0,
                firstSeen: now, lastSeen: now,
                details: { type: 'CONTEXT_DEPTH_FAILURE', thresholdPercent: threshold, failureRateAbove: aboveRate, failureRateBelow: belowRate },
              });
              break; // Take first significant threshold
            }
          }
        }

        // Pattern 4: TEMPORAL_FAILURE — failures at high call counts
        for (const threshold of [15, 20, 25, 30]) {
          const above = groupRecords.filter(r => r.callNumber > threshold);
          const aboveFailures = above.filter(r => r.outcome === 'failure');
          if (above.length >= this.config.minSamplesForPattern!) {
            const aboveRate = aboveFailures.length / above.length;
            if (aboveRate > failureRate * 2 && aboveRate > 0.1) {
              const ci = this.wilsonCI(aboveFailures.length, above.length, 0.95);
              actionPatterns.push({
                id: randomUUID(), type: 'TEMPORAL_FAILURE',
                dispatcher, action,
                confidence: Math.min(0.99, (aboveRate - failureRate) / aboveRate),
                confidenceInterval: ci,
                sampleSize: above.length,
                failureRate: aboveRate,
                decayWeight: 1.0,
                firstSeen: now, lastSeen: now,
                details: { type: 'TEMPORAL_FAILURE', callCountThreshold: threshold, failureRateAbove: aboveRate },
              });
              break;
            }
          }
        }

        // Bound patterns per action
        if (actionPatterns.length > this.config.maxPatternsPerAction!) {
          actionPatterns.sort((a, b) => b.confidence - a.confidence);
          actionPatterns.length = this.config.maxPatternsPerAction!;
        }

        if (actionPatterns.length > 0) {
          newPatterns.set(key, actionPatterns);
        }
      }

      // Pattern 5: SEQUENCE_FAILURE — pair analysis
      for (let i = 1; i < records.length; i++) {
        const curr = records[i];
        const prev = records[i - 1];
        if (curr.outcome === 'failure' && prev) {
          const key = `${curr.dispatcher}:${curr.action}`;
          const precedingKey = `${prev.dispatcher}:${prev.action}`;
          const existing = newPatterns.get(key) || [];

          // Check if this sequence pattern already exists
          const hasSequence = existing.some(p =>
            p.type === 'SEQUENCE_FAILURE' && (p.details as any)?.type === 'SEQUENCE_FAILURE' && (p.details as any)?.precedingAction === precedingKey
          );

          if (!hasSequence && existing.length < this.config.maxPatternsPerAction!) {
            // Count occurrences of this sequence
            let seqTotal = 0, seqFailures = 0;
            for (let j = 1; j < records.length; j++) {
              const c = records[j];
              const p = records[j - 1];
              if (c.dispatcher === curr.dispatcher && c.action === curr.action &&
                  `${p.dispatcher}:${p.action}` === precedingKey) {
                seqTotal++;
                if (c.outcome === 'failure') seqFailures++;
              }
            }

            if (seqTotal >= this.config.minSamplesForPattern! && seqFailures >= 3) {
              const seqRate = seqFailures / seqTotal;
              // Compute local failure rate for this action from overall records
              const actionRecords = records.filter(r => r.dispatcher === curr.dispatcher && r.action === curr.action);
              const localFailureRate = actionRecords.length > 0 ? actionRecords.filter(r => r.outcome === 'failure').length / actionRecords.length : 0;
              if (seqRate > localFailureRate * 2) {
                const ci = this.wilsonCI(seqFailures, seqTotal, 0.95);
                existing.push({
                  id: randomUUID(), type: 'SEQUENCE_FAILURE',
                  dispatcher: curr.dispatcher, action: curr.action,
                  confidence: Math.min(0.99, (seqRate - localFailureRate) / seqRate),
                  confidenceInterval: ci,
                  sampleSize: seqTotal,
                  failureRate: seqRate,
                  decayWeight: 1.0,
                  firstSeen: now, lastSeen: now,
                  details: { type: 'SEQUENCE_FAILURE', precedingAction: precedingKey, failureRateAfter: seqRate },
                });
                newPatterns.set(key, existing);
              }
            }
          }
        }
      }

      // Update patterns
      this.patterns = newPatterns;

      const extractTime = performance.now() - extractStart;
      let totalPatterns = 0;
      for (const [, p] of this.patterns) totalPatterns += p.length;

      this.stats = {
        lastExtractionTime: now,
        totalExtractions: this.stats.totalExtractions + 1,
        patternsDiscovered: totalPatterns,
        patternsExpired: this.stats.patternsExpired,
        avgExtractionTimeMs: (this.stats.avgExtractionTimeMs * this.stats.totalExtractions + extractTime) / (this.stats.totalExtractions + 1),
      };

      this.savePatterns();
      log.info(`[PFP] Extracted ${totalPatterns} patterns from ${records.length} records in ${extractTime.toFixed(1)}ms`);
    } catch (e) {
      log.warn(`[PFP] Pattern extraction error: ${(e as Error).message}`);
    }
  }

  /**
   * Wilson score confidence interval for proportions.
   */
  private wilsonCI(successes: number, total: number, confidence: number): [number, number] {
    if (total <= 0) return [0, 1];
    const z = confidence === 0.95 ? 1.96 : 2.576; // 95% or 99%
    const p = successes / total;
    const denom = 1 + z * z / total;
    const center = (p + z * z / (2 * total)) / denom;
    const margin = (z * Math.sqrt(p * (1 - p) / total + z * z / (4 * total * total))) / denom;
    return [Math.max(0, center - margin), Math.min(1, center + margin)];
  }

  // ==========================================================================
  // DASHBOARD & QUERY API
  // ==========================================================================

  getDashboard(): PFPDashboard {
    const topRiskyActions: PFPDashboard['topRiskyActions'] = [];
    for (const [key, patterns] of this.patterns) {
      const [dispatcher, action] = key.split(':');
      const maxRisk = Math.max(...patterns.map(p => (p.failureRate || 0) * p.confidence), 0);
      topRiskyActions.push({ dispatcher, action, riskScore: maxRisk, patternCount: patterns.length });
    }
    topRiskyActions.sort((a, b) => b.riskScore - a.riskScore);

    return {
      timestamp: Date.now(),
      enabled: this.config.enabled,
      historySize: this.historySize,
      patternCount: this.getTotalPatterns(),
      topRiskyActions: topRiskyActions.slice(0, 10),
      recentAssessments: this.recentAssessments.slice(-10),
      extractionStats: this.stats,
    };
  }

  getPatterns(dispatcher?: string, action?: string): FailurePattern[] {
    const results: FailurePattern[] = [];
    for (const [key, patterns] of this.patterns) {
      if (dispatcher && !key.startsWith(dispatcher)) continue;
      if (action && !key.endsWith(`:${action}`)) continue;
      results.push(...patterns);
    }
    return results;
  }

  getHealthMetrics(): PFPHealthMetrics {
    const sorted = [...this.assessmentTimes].sort((a, b) => a - b);
    const p99Idx = Math.ceil(sorted.length * 0.99) - 1;
    const p99 = sorted.length > 0 ? sorted[Math.max(0, p99Idx)] : 0;

    let patternMemory = 0;
    for (const [, p] of this.patterns) patternMemory += p.length * 300; // ~300 bytes per pattern estimate

    return {
      assessmentP99Ms: p99,
      historyUtilization: this.historySize / this.config.historyBufferSize!,
      patternMemoryBytes: patternMemory,
      extractionCycleTimes: this.assessmentTimes.slice(-10),
      totalAssessments: this.totalAssessments,
      totalSkipRecommendations: this.totalSkipRecommendations,
    };
  }

  getConfig(): PFPConfig {
    return { ...this.config };
  }

  updateConfig(overrides: Partial<PFPConfig>): PFPConfig {
    this.config = validateConfig({ ...this.config, ...overrides });
    this.saveConfig();
    return this.config;
  }

  // ==========================================================================
  // PERSISTENCE
  // ==========================================================================

  private savePatterns(): void {
    try {
      ensureStateDir();
      const data: Record<string, FailurePattern[]> = {};
      for (const [key, patterns] of this.patterns) data[key] = patterns;
      const patternsPath = path.join(STATE_DIR, 'patterns.json');
      const tmpPath = patternsPath + '.tmp';
      const json = JSON.stringify(data);
      JSON.parse(json); // Validate parseable
      safeWriteSync(tmpPath, json);
      fs.renameSync(tmpPath, patternsPath);
    } catch (e) {
      log.warn(`[PFP] Pattern save failed: ${(e as Error).message}`);
    }
  }

  private loadPatterns(): void {
    try {
      const patternsPath = path.join(STATE_DIR, 'patterns.json');
      if (!fs.existsSync(patternsPath)) return;
      const raw = fs.readFileSync(patternsPath, 'utf-8');
      const data = JSON.parse(raw);
      this.patterns = new Map(Object.entries(data));
      let count = 0;
      for (const [, p] of this.patterns) count += p.length;
      log.info(`[PFP] Loaded ${count} patterns from disk`);
    } catch (e) {
      log.warn(`[PFP] Pattern load failed: ${(e as Error).message}`);
    }
  }

  private loadConfig(): void {
    try {
      const configPath = path.join(STATE_DIR, 'config.json');
      if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, 'utf-8');
        this.config = validateConfig(JSON.parse(raw));
      }
    } catch { /* use defaults */ }
  }

  private saveConfig(): void {
    try {
      ensureStateDir();
      const configPath = path.join(STATE_DIR, 'config.json');
      const tmpPath = configPath + '.tmp';
      safeWriteSync(tmpPath, JSON.stringify(this.config, null, 2));
      fs.renameSync(tmpPath, configPath);
    } catch { /* non-fatal */ }
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  private getTotalPatterns(): number {
    let total = 0;
    for (const [, p] of this.patterns) total += p.length;
    return total;
  }

  /**
   * Force pattern extraction (for cadence/testing).
   */
  forceExtraction(): void {
    this.extractPatterns();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const pfpEngine = new PredictiveFailureEngine();

export { computeParamSignature, computeActionChecksum, validateActionChecksum };
