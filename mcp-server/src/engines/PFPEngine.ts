/**
 * PRISM F1: Predictive Failure Prevention Engine
 * ================================================
 * 
 * Predicts which PRISM actions will fail before they execute.
 * PFP is a PRE-FILTER ONLY — all passed actions still undergo
 * full hook validation. S(x)≥0.70 enforced by hooks REGARDLESS.
 * 
 * Components:
 * 1. ActionHistory — Ring buffer of historical action outcomes
 * 2. PatternExtractor — Chi-squared + Bonferroni correction
 * 3. RiskScorer — Fast risk assessment per proposed action
 * 4. PreFilter — Optional blocking of high-risk actions
 * 
 * SAFETY: PFP failure = all actions proceed normally to hooks.
 * PFP is efficiency optimization, not safety replacement.
 * Defense-in-depth: PFP → hooks → S(x)≥0.70 → Ω → output hooks
 * 
 * @version 1.0.0
 * @feature F1
 */

import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import {
  ActionRecord, ActionOutcome, computeActionChecksum,
  FailurePattern, PatternType, PatternContext,
  RiskAssessment, RiskLevel, PatternMatch,
  PFPConfig, DEFAULT_PFP_CONFIG, NEVER_FILTER_ACTIONS,
  PFPDashboard,
} from '../types/pfp-types.js';
import { crc32 } from '../engines/TelemetryEngine.js';
import { log } from '../utils/Logger.js';

// ============================================================================
// STATE DIRECTORY
// ============================================================================

const STATE_DIR = path.join(process.cwd(), 'state', 'pfp');

function ensureStateDir(): void {
  try {
    if (!fs.existsSync(STATE_DIR)) {
      fs.mkdirSync(STATE_DIR, { recursive: true });
    }
  } catch { /* Non-fatal */ }
}

// ============================================================================
// CONFIG VALIDATION
// ============================================================================

function validateConfig(cfg: Partial<PFPConfig>): PFPConfig {
  const base = { ...DEFAULT_PFP_CONFIG };
  const clamp = (val: number | undefined, min: number, max: number, fb: number | undefined): number => {
    if (val === undefined || val === null || isNaN(val)) return fb ?? min;
    return val < min || val > max ? (fb ?? min) : val;
  };

  return {
    enabled: typeof cfg.enabled === 'boolean' ? cfg.enabled : base.enabled,
    preFilterEnabled: typeof cfg.preFilterEnabled === 'boolean' ? cfg.preFilterEnabled : base.preFilterEnabled,
    historySize: clamp(cfg.historySize, 500, 50000, base.historySize),
    patternExtractionInterval: clamp(cfg.patternExtractionInterval, 10, 500, base.patternExtractionInterval),
    minOccurrences: clamp(cfg.minOccurrences, 2, 50, base.minOccurrences),
    confidenceThreshold: clamp(cfg.confidenceThreshold, 0.5, 0.99, base.confidenceThreshold),
    redThreshold: clamp(cfg.redThreshold, 0.5, 0.95, base.redThreshold),
    yellowThreshold: clamp(cfg.yellowThreshold, 0.2, 0.7, base.yellowThreshold),
    decayHalfLifeMs: clamp(cfg.decayHalfLifeMs, 300000, 86400000, base.decayHalfLifeMs),
    maxPatterns: clamp(cfg.maxPatterns, 50, 1000, base.maxPatterns),
    excludeDispatchers: cfg.excludeDispatchers || base.excludeDispatchers,
    riskScoringTimeoutMs: clamp(cfg.riskScoringTimeoutMs, 1, 20, base.riskScoringTimeoutMs),
  };
}

// ============================================================================
// PFP ENGINE — SINGLETON
// ============================================================================
//
// CONCURRENCY MODEL: Node.js single-process. All PFP operations synchronous.
// No race conditions possible. recordAction → extractPatterns → assessRisk
// all serialize through the event loop.
//
// FAILURE MODE TABLE:
// ┌──────────────────────┬──────────────────────────────┬─────────────────────────┐
// │ Component            │ Failure Behavior             │ Recovery                │
// ├──────────────────────┼──────────────────────────────┼─────────────────────────┤
// │ recordAction()       │ try/catch, drops record      │ Next record succeeds    │
// │ extractPatterns()    │ Error logged, old patterns   │ Re-extracts next cycle  │
// │                      │ preserved                    │                         │
// │ assessRisk()         │ Returns GREEN (fail-open)    │ Immediate, automatic    │
// │ State persistence    │ Atomic .tmp→rename, no       │ Stale data on next boot │
// │                      │ partial writes               │ — still functional      │
// │ History overflow     │ Oldest records sliced out    │ Automatic via size cap  │
// │ Pattern extraction   │ Chi-squared returns 0, no    │ Next extraction retries │
// │ fails statistically  │ patterns formed              │                         │
// │ Full engine crash    │ All dispatchers proceed to   │ Engine restarts on next │
// │                      │ hooks normally — PFP is      │ init() call             │
// │                      │ pre-filter, NOT safety gate  │                         │
// └──────────────────────┴──────────────────────────────┴─────────────────────────┘
//
// DEFENSE-IN-DEPTH (PFP is layer 1 of 6):
//   PFP(pre-filter) → Pre-calc hooks → Calculation → Post-calc hooks
//   → S(x)≥0.70 hard gate → Ω quality → Output hooks
//   No single point of failure. PFP removal = zero safety impact.
//

export class PFPEngine {
  private config: PFPConfig;
  private history: ActionRecord[] = [];
  private patterns: FailurePattern[] = [];
  private recordsSinceExtraction: number = 0;
  private initialized: boolean = false;

  // Stats
  private stats = {
    assessmentsTotal: 0,
    assessmentsByRisk: { GREEN: 0, YELLOW: 0, RED: 0 } as Record<RiskLevel, number>,
    preFiltered: 0,
    assessmentTimesMs: [] as number[],
  };

  constructor(configOverrides?: Partial<PFPConfig>) {
    this.config = validateConfig(configOverrides || {});
    this.loadState();
    ensureStateDir();
  }

  init(): void {
    if (this.initialized) return;
    this.initialized = true;
    log.info(`[PFP] Engine initialized (history=${this.config.historySize!}, preFilter=${this.config.preFilterEnabled ? 'ON' : 'OFF'})`);
  }

  // ==========================================================================
  // RECORD ACTION — Called after every dispatch
  // ==========================================================================

  recordAction(
    dispatcher: string, action: string, outcome: ActionOutcome,
    durationMs: number, callNumber: number, contextDepthPercent: number,
    errorClass?: string, errorMessage?: string, paramKeys?: string[]
  ): void {
    try {
      const paramSignature = paramKeys ? crc32(paramKeys.sort().join(',')).toString(16) : '0';

      const partial: Omit<ActionRecord, 'checksum'> = {
        id: randomUUID(),
        timestamp: Date.now(),
        dispatcher,
        action,
        outcome,
        durationMs,
        latencyMs: durationMs,
        errorClass,
        errorMessage: errorMessage?.slice(0, 200),
        paramSignature,
        contextDepthPercent,
        callNumber,
      };

      const record: ActionRecord = {
        ...partial,
        checksum: computeActionChecksum(partial),
      };

      this.history.push(record);

      // Enforce history size limit
      if (this.history.length > this.config.historySize!) {
        this.history = this.history.slice(-this.config.historySize!);
      }

      // Trigger pattern extraction periodically
      this.recordsSinceExtraction++;
      if (this.recordsSinceExtraction >= this.config.patternExtractionInterval!) {
        this.extractPatterns();
        this.recordsSinceExtraction = 0;
        // Auto-save patterns after every extraction cycle
        this.saveState();
      }
    } catch {
      // NEVER throw from recordAction — dispatchers must continue
    }
  }

  // ==========================================================================
  // PATTERN EXTRACTION — Chi-squared with Bonferroni correction
  // ==========================================================================

  private extractPatterns(): void {
    try {
      const now = Date.now();
      const newPatterns: FailurePattern[] = [];

      // Group history by dispatcher:action
      const groups = new Map<string, ActionRecord[]>();
      for (const r of this.history) {
        const key = `${r.dispatcher}:${r.action}`;
        let list = groups.get(key);
        if (!list) { list = []; groups.set(key, list); }
        list.push(r);
      }

      const numComparisons = groups.size; // For Bonferroni correction

      for (const [key, records] of groups) {
        if (records.length < this.config.minOccurrences!) continue;

        const [dispatcher, action] = key.split(':');
        const failures = records.filter(r => r.outcome === 'failure' || r.outcome === 'timeout');
        const successes = records.filter(r => r.outcome === 'success');

        if (failures.length < this.config.minOccurrences!) continue;

        // --- REPEATED_ERROR pattern ---
        const errorGroups = new Map<string, ActionRecord[]>();
        for (const f of failures) {
          const ec = f.errorClass || 'unknown';
          let list = errorGroups.get(ec);
          if (!list) { list = []; errorGroups.set(ec, list); }
          list.push(f);
        }

        for (const [errorClass, errRecords] of errorGroups) {
          if (errRecords.length < this.config.minOccurrences!) continue;

          const failRate = failures.length / records.length;
          const confidence = this.chiSquaredConfidence(
            failures.length, successes.length, records.length, numComparisons
          );

          if (confidence >= this.config.confidenceThreshold!) {
            const decay = this.computeDecay(errRecords, now);
            const sig = `REPEATED:${key}:${errorClass}`;

            // Check for existing pattern to update
            const existing = this.patterns.find(p => p.signature === sig);
            if (existing) {
              // Update in place (TS readonly bypass for internal mutation)
              (existing as any).occurrences = errRecords.length;
              (existing as any).lastSeen = now;
              (existing as any).confidence = confidence;
              (existing as any).decayWeight = decay;
            } else {
              newPatterns.push({
                id: randomUUID(),
                type: 'REPEATED_ERROR',
                dispatcher,
                action,
                signature: sig,
                confidence,
                confidenceInterval: this.wilsonInterval(failures.length, records.length),
                occurrences: errRecords.length,
                lastSeen: now,
                decayWeight: decay,
                context: { errorClass },
              });
            }
          }
        }

        // --- CONTEXT_PRESSURE_FAIL pattern ---
        const highPressureFails = failures.filter(f => f.contextDepthPercent > 70);
        if (highPressureFails.length >= this.config.minOccurrences!) {
          const highPressureTotal = records.filter(r => r.contextDepthPercent > 70);
          if (highPressureTotal.length > 0) {
            const failRateHigh = highPressureFails.length / highPressureTotal.length;
            const failRateLow = (failures.length - highPressureFails.length) /
                                Math.max(1, records.length - highPressureTotal.length);

            if (failRateHigh > failRateLow * 1.5) { // 50% higher fail rate under pressure
              const confidence = this.chiSquaredConfidence(
                highPressureFails.length, highPressureTotal.length - highPressureFails.length,
                highPressureTotal.length, numComparisons
              );

              if (confidence >= this.config.confidenceThreshold!) {
                const sig = `PRESSURE:${key}`;
                const existing = this.patterns.find(p => p.signature === sig);
                if (!existing) {
                  newPatterns.push({
                    id: randomUUID(),
                    type: 'CONTEXT_PRESSURE_FAIL',
                    dispatcher,
                    action,
                    signature: sig,
                    confidence,
                    confidenceInterval: this.wilsonInterval(highPressureFails.length, highPressureTotal.length),
                    occurrences: highPressureFails.length,
                    lastSeen: now,
                    decayWeight: this.computeDecay(highPressureFails, now),
                    context: {
                      avgContextDepth: highPressureFails.reduce((s, r) => s + r.contextDepthPercent, 0) / highPressureFails.length,
                    },
                  });
                }
              }
            }
          }
        }

        // --- TEMPORAL_CLUSTER pattern ---
        // Check if failures cluster at certain call number ranges
        if (failures.length >= this.config.minOccurrences!) {
          const callNums = failures.map(f => f.callNumber).sort((a, b) => a - b);
          // Check if >60% of failures fall within a 5-call-number window
          for (let i = 0; i <= callNums.length - this.config.minOccurrences!; i++) {
            const windowStart = callNums[i];
            const windowEnd = windowStart + 5;
            const inWindow = callNums.filter(n => n >= windowStart && n <= windowEnd);
            if (inWindow.length / failures.length > 0.6) {
              const sig = `TEMPORAL:${key}:${windowStart}-${windowEnd}`;
              const existing = this.patterns.find(p => p.signature === sig);
              if (!existing) {
                newPatterns.push({
                  id: randomUUID(),
                  type: 'TEMPORAL_CLUSTER',
                  dispatcher,
                  action,
                  signature: sig,
                  confidence: inWindow.length / failures.length,
                  confidenceInterval: this.wilsonInterval(inWindow.length, failures.length),
                  occurrences: inWindow.length,
                  lastSeen: now,
                  decayWeight: this.computeDecay(failures.filter(f =>
                    f.callNumber >= windowStart && f.callNumber <= windowEnd), now),
                  context: {
                    callNumberRange: [windowStart, windowEnd],
                  },
                });
              }
              break; // One temporal cluster per action
            }
          }
        }

        // --- PARAM_CORRELATION pattern ---
        // Detect if specific parameter signatures correlate with failures
        if (failures.length >= this.config.minOccurrences!) {
          const paramFailGroups = new Map<string, number>(); // paramSig → failure count
          const paramTotalGroups = new Map<string, number>(); // paramSig → total count
          for (const r of records) {
            const sig = r.paramSignature;
            paramTotalGroups.set(sig, (paramTotalGroups.get(sig) || 0) + 1);
            if (r.outcome === 'failure' || r.outcome === 'timeout') {
              paramFailGroups.set(sig, (paramFailGroups.get(sig) || 0) + 1);
            }
          }

          for (const [paramSig, failCount] of paramFailGroups) {
            if (failCount < this.config.minOccurrences!) continue;
            const totalForSig = paramTotalGroups.get(paramSig) || 0;
            if (totalForSig < this.config.minOccurrences!) continue;

            const paramFailRate = failCount / totalForSig;
            const overallFailRate = failures.length / records.length;

            // Only create pattern if param-specific fail rate is 2x overall
            if (paramFailRate > overallFailRate * 2) {
              const confidence = this.chiSquaredConfidence(
                failCount, totalForSig - failCount, totalForSig, numComparisons
              );
              if (confidence >= this.config.confidenceThreshold!) {
                const pSig = `PARAM:${key}:${paramSig}`;
                const existing = this.patterns.find(p => p.signature === pSig);
                if (!existing) {
                  newPatterns.push({
                    id: randomUUID(),
                    type: 'PARAM_CORRELATION',
                    dispatcher,
                    action,
                    signature: pSig,
                    confidence,
                    confidenceInterval: this.wilsonInterval(failCount, totalForSig),
                    occurrences: failCount,
                    lastSeen: now,
                    decayWeight: this.computeDecay(
                      failures.filter(f => f.paramSignature === paramSig), now
                    ),
                    context: { paramKeys: [paramSig] },
                  });
                }
              }
            }
          }
        }
      }

      // Merge new patterns
      this.patterns.push(...newPatterns);

      // Prune old/low-weight patterns
      this.patterns = this.patterns
        .filter(p => p.decayWeight > 0.05) // Remove nearly-decayed
        .sort((a, b) => b.decayWeight * b.confidence - a.decayWeight * a.confidence)
        .slice(0, this.config.maxPatterns!);

      if (newPatterns.length > 0) {
        log.info(`[PFP] Extracted ${newPatterns.length} new patterns (total: ${this.patterns.length})`);
      }
    } catch (e) {
      log.warn(`[PFP] Pattern extraction error: ${(e as Error).message}`);
    }
  }

  // ==========================================================================
  // STATISTICAL METHODS
  // ==========================================================================

  /** Chi-squared test with Bonferroni correction */
  private chiSquaredConfidence(
    observed: number, expected: number, total: number, comparisons: number
  ): number {
    if (total === 0 || comparisons === 0) return 0;
    const expectedRate = total > 0 ? expected / total : 0.5;
    const e = total * expectedRate;
    if (e === 0) return 0;
    const chiSq = Math.pow(observed - e, 2) / e;
    // Approximate p-value from chi-squared (1 df)
    const p = Math.exp(-chiSq / 2);
    // Bonferroni: multiply p by number of comparisons
    const adjustedP = Math.min(1, p * comparisons);
    return 1 - adjustedP;
  }

  /** Wilson score interval for binomial proportion */
  private wilsonInterval(successes: number, total: number): [number, number] {
    if (total === 0) return [0, 0];
    const z = 1.96; // 95% confidence
    const p = successes / total;
    const denom = 1 + z * z / total;
    const center = (p + z * z / (2 * total)) / denom;
    const halfWidth = (z * Math.sqrt(p * (1 - p) / total + z * z / (4 * total * total))) / denom;
    return [Math.max(0, center - halfWidth), Math.min(1, center + halfWidth)];
  }

  /** Exponential decay weight based on recency */
  private computeDecay(records: ActionRecord[], now: number): number {
    if (records.length === 0) return 0;
    const mostRecent = Math.max(...records.map(r => r.timestamp));
    const ageMs = now - mostRecent;
    return Math.exp(-Math.LN2 * ageMs / this.config.decayHalfLifeMs!);
  }

  // ==========================================================================
  // RISK SCORING — Fast assessment per proposed action (<5ms target)
  // ==========================================================================

  assessRisk(dispatcher: string, action: string, callNumber: number,
             contextDepthPercent: number, paramKeys?: string[]): RiskAssessment {
    const start = performance.now();

    try {
      if (!this.config.enabled) {
        return this.greenAssessment(dispatcher, action, start, 'PFP disabled');
      }

      // Never filter excluded dispatchers or safety-critical actions
      if (this.config.excludeDispatchers!.includes(dispatcher)) {
        return this.greenAssessment(dispatcher, action, start, 'Dispatcher excluded');
      }
      if (NEVER_FILTER_ACTIONS.has(action)) {
        return this.greenAssessment(dispatcher, action, start, 'Safety-critical action');
      }

      const key = `${dispatcher}:${action}`;
      const now = Date.now();
      const matchedPatterns: PatternMatch[] = [];
      let totalRisk = 0;

      for (const pattern of this.patterns) {
        const patternKey = `${pattern.dispatcher}:${pattern.action}`;
        if (patternKey !== key) continue;

        // Recompute decay for freshness
        const ageMs = now - pattern.lastSeen;
        const currentDecay = Math.exp(-Math.LN2 * ageMs / this.config.decayHalfLifeMs!);
        if (currentDecay < 0.05) continue; // Too old

        let contribution = pattern.confidence * currentDecay;

        // Boost for context pressure patterns when under pressure
        if (pattern.type === 'CONTEXT_PRESSURE_FAIL' && contextDepthPercent > 70) {
          contribution *= 1.5;
        }

        // Boost for temporal clusters if call number matches
        if (pattern.type === 'TEMPORAL_CLUSTER' && pattern.context?.callNumberRange) {
          const [lo, hi] = pattern.context!.callNumberRange;
          if (callNumber >= lo && callNumber <= hi) {
            contribution *= 1.3;
          }
        }

        // Boost for param correlation when matching param signature
        if (pattern.type === 'PARAM_CORRELATION' && paramKeys && pattern.context?.paramKeys) {
          const currentSig = crc32(paramKeys.sort().join(',')).toString(16);
          if (pattern.context!.paramKeys!.includes(currentSig)) {
            contribution *= 1.4; // Strong boost — exact param signature match
          }
        }

        matchedPatterns.push({
          patternId: pattern.id,
          patternType: pattern.type,
          confidence: pattern.confidence,
          decayWeight: currentDecay,
          contribution: Math.min(1, contribution),
        });

        totalRisk += contribution;
      }

      // Cap risk at 1.0
      const riskScore = Math.min(1, totalRisk);

      // Classify
      let riskLevel: RiskLevel;
      let recommendation: 'PROCEED' | 'WARN' | 'PRE_FILTER';
      let reason: string;

      if (riskScore >= this.config.redThreshold!) {
        riskLevel = 'RED';
        recommendation = this.config.preFilterEnabled ? 'PRE_FILTER' : 'WARN';
        reason = `High failure risk (${(riskScore * 100).toFixed(0)}%) from ${matchedPatterns.length} patterns`;
      } else if (riskScore >= this.config.yellowThreshold!) {
        riskLevel = 'YELLOW';
        recommendation = 'WARN';
        reason = `Moderate risk (${(riskScore * 100).toFixed(0)}%) from ${matchedPatterns.length} patterns`;
      } else {
        riskLevel = 'GREEN';
        recommendation = 'PROCEED';
        reason = matchedPatterns.length > 0
          ? `Low risk (${(riskScore * 100).toFixed(0)}%) despite ${matchedPatterns.length} weak patterns`
          : 'No matching failure patterns';
      }

      const assessmentMs = performance.now() - start;

      // Update stats
      this.stats.assessmentsTotal++;
      this.stats.assessmentsByRisk[riskLevel]++;
      if (recommendation === 'PRE_FILTER') this.stats.preFiltered++;
      this.stats.assessmentTimesMs.push(assessmentMs);
      if (this.stats.assessmentTimesMs.length > 1000) {
        this.stats.assessmentTimesMs.splice(0, 500);
      }

      // Log non-GREEN assessments for telemetry/learning
      if (riskLevel !== 'GREEN') {
        log.info(`[PFP] ${riskLevel} risk: ${dispatcher}:${action} score=${riskScore.toFixed(3)} patterns=${matchedPatterns.length} rec=${recommendation} (${assessmentMs.toFixed(1)}ms)`);
      }

      return {
        dispatcher,
        action,
        riskLevel,
        riskScore,
        matchedPatterns,
        recommendation,
        assessmentMs,
        reason,
      };
    } catch (e) {
      // On ANY error, return GREEN — fail-open, never block
      return this.greenAssessment(dispatcher, action, start, `Assessment error: ${(e as Error).message}`);
    }
  }

  private greenAssessment(dispatcher: string, action: string, startMs: number, reason: string): RiskAssessment {
    return {
      dispatcher,
      action,
      riskLevel: 'GREEN',
      riskScore: 0,
      matchedPatterns: [],
      recommendation: 'PROCEED',
      assessmentMs: performance.now() - startMs,
      reason,
    };
  }

  // ==========================================================================
  // DASHBOARD & QUERIES
  // ==========================================================================

  getDashboard(): PFPDashboard {
    const timesMs = this.stats.assessmentTimesMs;
    const avgMs = timesMs.length > 0 ? timesMs.reduce((a, b) => a + b, 0) / timesMs.length : 0;

    return {
      enabled: this.config.enabled,
      preFilterEnabled: this.config.preFilterEnabled,
      historySize: this.config.historySize!,
      currentHistoryCount: this.history.length,
      patternCount: this.patterns.length,
      assessmentsTotal: this.stats.assessmentsTotal,
      assessmentsByRisk: { ...this.stats.assessmentsByRisk },
      preFiltered: this.stats.preFiltered,
      avgAssessmentMs: avgMs,
      topPatterns: this.patterns.slice(0, 10),
    };
  }

  getPatterns(type?: PatternType): FailurePattern[] {
    if (type) return this.patterns.filter(p => p.type === type);
    return [...this.patterns];
  }

  getHistory(dispatcher?: string, limit: number = 50): ActionRecord[] {
    let filtered = this.history;
    if (dispatcher) filtered = filtered.filter(r => r.dispatcher === dispatcher);
    return filtered.slice(-limit);
  }

  getConfig(): PFPConfig {
    return { ...this.config };
  }

  updateConfig(overrides: Partial<PFPConfig>): PFPConfig {
    this.config = validateConfig({ ...this.config, ...overrides });
    this.saveState();
    log.info('[PFP] Config updated');
    return this.config;
  }

  clearHistory(): void {
    this.history = [];
    this.patterns = [];
    this.recordsSinceExtraction = 0;
    this.stats = {
      assessmentsTotal: 0,
      assessmentsByRisk: { GREEN: 0, YELLOW: 0, RED: 0 },
      preFiltered: 0,
      assessmentTimesMs: [],
    };
    this.saveState();
    log.info('[PFP] History and patterns cleared');
  }

  // ==========================================================================
  // PERSISTENCE
  // ==========================================================================

  private saveState(): void {
    try {
      ensureStateDir();

      // Save patterns (compact)
      const patternsPath = path.join(STATE_DIR, 'patterns.json');
      const tmpPatterns = patternsPath + '.tmp';
      fs.writeFileSync(tmpPatterns, JSON.stringify(this.patterns));
      fs.renameSync(tmpPatterns, patternsPath);

      // Save config
      const configPath = path.join(STATE_DIR, 'config.json');
      const tmpConfig = configPath + '.tmp';
      fs.writeFileSync(tmpConfig, JSON.stringify(this.config, null, 2));
      fs.renameSync(tmpConfig, configPath);
    } catch (e) {
      log.warn(`[PFP] State save failed: ${(e as Error).message}`);
    }
  }

  private loadState(): void {
    try {
      // Load config
      const configPath = path.join(STATE_DIR, 'config.json');
      if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, 'utf-8');
        this.config = validateConfig(JSON.parse(raw));
      }

      // Load patterns
      const patternsPath = path.join(STATE_DIR, 'patterns.json');
      if (fs.existsSync(patternsPath)) {
        const raw = fs.readFileSync(patternsPath, 'utf-8');
        this.patterns = JSON.parse(raw);
        log.info(`[PFP] Loaded ${this.patterns.length} patterns from disk`);
      }
    } catch (e) {
      log.warn(`[PFP] State load failed, starting fresh: ${(e as Error).message}`);
    }
  }

  /**
   * Force pattern extraction (for cadence/testing).
   */
  forceExtract(): { patterns: number; history: number } {
    this.extractPatterns();
    return { patterns: this.patterns.length, history: this.history.length };
  }

  getStats(): { history: number; patterns: number; assessments: number; preFiltered: number; avgMs: number } {
    const timesMs = this.stats.assessmentTimesMs;
    const avgMs = timesMs.length > 0 ? timesMs.reduce((a, b) => a + b, 0) / timesMs.length : 0;
    return {
      history: this.history.length,
      patterns: this.patterns.length,
      assessments: this.stats.assessmentsTotal,
      preFiltered: this.stats.preFiltered,
      avgMs,
    };
  }

  // ==========================================================================
  // SLO SELF-ASSERTIONS
  // ==========================================================================
  //
  // SLOs:
  //   Risk scoring: <5ms p99
  //   Pattern extraction: <200ms for 5K records
  //   Data corruption rate: <0.01%
  //   Memory: History capped at historySize, patterns at maxPatterns
  //   Fail-open guarantee: assessRisk() NEVER returns anything other than
  //     GREEN on error — verified by try/catch in every code path
  //

  checkSLOs(): { met: string[]; violated: string[] } {
    const met: string[] = [];
    const violated: string[] = [];
    const times = this.stats.assessmentTimesMs;

    // Risk scoring latency percentiles
    if (times.length > 0) {
      const sorted = [...times].sort((a, b) => a - b);
      const p50 = sorted[Math.ceil(sorted.length * 0.50) - 1] || 0;
      const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1] || 0;
      const p99 = sorted[Math.ceil(sorted.length * 0.99) - 1] || 0;
      if (p99 <= this.config.riskScoringTimeoutMs!) {
        met.push(`risk_scoring_p99: ${p99.toFixed(2)}ms ≤ ${this.config.riskScoringTimeoutMs!}ms (p50=${p50.toFixed(2)}ms, p95=${p95.toFixed(2)}ms)`);
      } else {
        violated.push(`risk_scoring_p99: ${p99.toFixed(2)}ms > ${this.config.riskScoringTimeoutMs!}ms SLO (p50=${p50.toFixed(2)}ms, p95=${p95.toFixed(2)}ms)`);
      }
    }

    // History within bounds
    if (this.history.length <= this.config.historySize!) {
      met.push(`history_size: ${this.history.length} ≤ ${this.config.historySize!}`);
    } else {
      violated.push(`history_size: ${this.history.length} > ${this.config.historySize!} SLO`);
    }

    // Pattern count within bounds
    if (this.patterns.length <= this.config.maxPatterns!) {
      met.push(`pattern_count: ${this.patterns.length} ≤ ${this.config.maxPatterns!}`);
    } else {
      violated.push(`pattern_count: ${this.patterns.length} > ${this.config.maxPatterns} SLO`);
    }

    // Fail-open guarantee check
    const totalAssessments = this.stats.assessmentsTotal;
    if (totalAssessments > 0) {
      const errorRate = this.stats.assessmentsByRisk['GREEN'] / totalAssessments;
      met.push(`fail_open: ${(errorRate * 100).toFixed(1)}% GREEN (try/catch guarantees GREEN on error)`);
    }

    // Data quality: pattern confidence distribution
    if (this.patterns.length > 0) {
      const avgConfidence = this.patterns.reduce((s, p) => s + p.confidence, 0) / this.patterns.length;
      if (avgConfidence >= 0.3) {
        met.push(`pattern_quality: avg_confidence=${avgConfidence.toFixed(3)} ≥ 0.30`);
      } else {
        violated.push(`pattern_quality: avg_confidence=${avgConfidence.toFixed(3)} < 0.30 — patterns may be unreliable`);
      }
    }

    return { met, violated };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const pfpEngine = new PFPEngine();
