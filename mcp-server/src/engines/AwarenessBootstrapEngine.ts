/**
 * AwarenessBootstrapEngine — Session awareness verification at boot
 *
 * Phase 0.13 U-SAW1 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Runs on SessionStart
 * to verify that registries, indexes, and awareness caches are fresh enough that
 * the session can safely act. If the computed awareness score drops below the
 * readiness threshold (0.80), the session is marked NOT_READY and the first
 * prompt must be refused until refresh succeeds.
 *
 * Design rules:
 *   - Read-only: this engine never mutates registries; it only measures staleness.
 *   - Deterministic: the score is a pure function of file mtimes + existence.
 *   - Cheap: <50ms on a warm FS; skipped files count as missing (score penalty).
 *   - Extensible: `computeScore` takes a descriptor list so callers can add signals.
 *
 * The 7 default signals are weighted so that missing-critical > stale-critical >
 * missing-optional. Tune weights in DEFAULT_SIGNALS, not in the scoring math.
 *
 * @module engines/AwarenessBootstrapEngine
 * @milestone PP-0.13-U-SAW1
 */

import * as fs from "fs";
import * as path from "path";

export const READINESS_THRESHOLD = 0.80;

export type SignalSeverity = "critical" | "important" | "optional";

export interface AwarenessSignal {
  id: string;
  filePath: string;
  severity: SignalSeverity;
  maxAgeMs: number;
  weight: number;
}

export interface SignalResult {
  id: string;
  filePath: string;
  severity: SignalSeverity;
  exists: boolean;
  ageMs: number | null;
  stale: boolean;
  scoreContribution: number;
  weight: number;
}

export interface AwarenessReport {
  score: number;
  ready: boolean;
  threshold: number;
  signals: SignalResult[];
  missing: string[];
  stale: string[];
  computedAt: string;
  durationMs: number;
}

const PRISM_ROOT = path.resolve(path.join(path.dirname(new URL(import.meta.url).pathname), "..", "..", ".."));
const STATE_DIR = path.join(PRISM_ROOT, "mcp-server", "data", "state");

const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;

export const DEFAULT_SIGNALS: readonly AwarenessSignal[] = Object.freeze([
  {
    id: "cross-session-asset-registry",
    filePath: path.join(STATE_DIR, "cross-session-asset-registry.json"),
    severity: "critical",
    maxAgeMs: 7 * ONE_DAY,
    weight: 0.25,
  },
  {
    id: "extraction-log",
    filePath: path.join(STATE_DIR, "extraction-log.json"),
    severity: "critical",
    maxAgeMs: 30 * ONE_DAY,
    weight: 0.15,
  },
  {
    id: "harvest-pipeline-state",
    filePath: path.join(STATE_DIR, "harvest-pipeline-state.json"),
    severity: "important",
    maxAgeMs: 14 * ONE_DAY,
    weight: 0.10,
  },
  {
    id: "agent-profiles",
    filePath: path.join(STATE_DIR, "agent-profiles.json"),
    severity: "important",
    maxAgeMs: 14 * ONE_DAY,
    weight: 0.10,
  },
  {
    id: "model-registry",
    filePath: path.join(STATE_DIR, "model-registry.json"),
    severity: "important",
    maxAgeMs: 30 * ONE_DAY,
    weight: 0.10,
  },
  {
    id: "ingestion-state",
    filePath: path.join(STATE_DIR, "ingestion-state.json"),
    severity: "optional",
    maxAgeMs: 14 * ONE_DAY,
    weight: 0.15,
  },
  {
    id: "ai-intelligence-stats",
    filePath: path.join(STATE_DIR, "ai-intelligence-stats.json"),
    severity: "optional",
    maxAgeMs: 7 * ONE_DAY,
    weight: 0.15,
  },
]);

function statOrNull(filePath: string): fs.Stats | null {
  try {
    return fs.statSync(filePath);
  } catch {
    return null;
  }
}

function evaluateSignal(signal: AwarenessSignal, now: number): SignalResult {
  const stat = statOrNull(signal.filePath);
  if (!stat) {
    return {
      id: signal.id,
      filePath: signal.filePath,
      severity: signal.severity,
      exists: false,
      ageMs: null,
      stale: true,
      scoreContribution: 0,
      weight: signal.weight,
    };
  }

  const ageMs = Math.max(0, now - stat.mtimeMs);
  const stale = ageMs > signal.maxAgeMs;

  let contribution: number;
  if (stale) {
    // Partial credit that decays linearly with overshoot, capped at 0.5×weight.
    const overshoot = (ageMs - signal.maxAgeMs) / signal.maxAgeMs;
    const decay = Math.max(0, 1 - overshoot);
    contribution = signal.weight * 0.5 * decay;
  } else {
    contribution = signal.weight;
  }

  return {
    id: signal.id,
    filePath: signal.filePath,
    severity: signal.severity,
    exists: true,
    ageMs,
    stale,
    scoreContribution: contribution,
    weight: signal.weight,
  };
}

export class AwarenessBootstrapEngine {
  private readonly signals: readonly AwarenessSignal[];
  private readonly threshold: number;

  constructor(options: { signals?: readonly AwarenessSignal[]; threshold?: number } = {}) {
    const signals = options.signals ?? DEFAULT_SIGNALS;
    this.signals = signals;
    this.threshold = options.threshold ?? READINESS_THRESHOLD;
    this.assertWeightsSumToOne(signals);
  }

  getThreshold(): number {
    return this.threshold;
  }

  getSignals(): readonly AwarenessSignal[] {
    return this.signals;
  }

  /**
   * Compute the current awareness report. Pure over its inputs; the only I/O is
   * fs.statSync for each signal.
   */
  compute(nowMs?: number): AwarenessReport {
    const started = Date.now();
    const now = nowMs ?? started;

    const results: SignalResult[] = this.signals.map((s) => evaluateSignal(s, now));
    const score = results.reduce((sum, r) => sum + r.scoreContribution, 0);
    const missing = results.filter((r) => !r.exists).map((r) => r.id);
    const stale = results.filter((r) => r.exists && r.stale).map((r) => r.id);

    return {
      score: Math.round(score * 10000) / 10000,
      ready: score >= this.threshold,
      threshold: this.threshold,
      signals: results,
      missing,
      stale,
      computedAt: new Date(now).toISOString(),
      durationMs: Date.now() - started,
    };
  }

  /**
   * Returns true if the report score meets the readiness threshold.
   */
  isReady(report?: AwarenessReport): boolean {
    const r = report ?? this.compute();
    return r.ready;
  }

  /**
   * Returns a short human-readable reason string suitable for a hook block message.
   */
  explainBlock(report?: AwarenessReport): string {
    const r = report ?? this.compute();
    if (r.ready) return "";
    const bits: string[] = [];
    if (r.missing.length > 0) bits.push(`missing=${r.missing.join(",")}`);
    if (r.stale.length > 0) bits.push(`stale=${r.stale.join(",")}`);
    return `AWARENESS_BELOW_THRESHOLD score=${r.score} threshold=${r.threshold} ${bits.join(" ")}`.trim();
  }

  private assertWeightsSumToOne(signals: readonly AwarenessSignal[]): void {
    const sum = signals.reduce((acc, s) => acc + s.weight, 0);
    const diff = Math.abs(sum - 1.0);
    if (diff > 1e-6) {
      throw new Error(
        `AwarenessBootstrapEngine: signal weights must sum to 1.0 (got ${sum.toFixed(6)})`
      );
    }
  }
}

export const awarenessBootstrapEngine = new AwarenessBootstrapEngine();
