/**
 * GoalStabilityVerifierEngine — Detect goal/value drift over a session
 *
 * Phase 0.25.1 U-SAFE2 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Tracks a
 * rolling window of declared goals and checks three drift signals:
 *
 *   1. Semantic drift — Jaccard distance between consecutive goal tokens.
 *   2. Instrumental convergence — suspicious acquisition terms (e.g.,
 *      "disable", "bypass", "unbounded", "self-replicate") entering the
 *      goal stream.
 *   3. Value drift — stated primary objective changes without a declared
 *      rationale.
 *
 * The engine returns a stability report classifying each signal. The hook
 * layer decides whether to alert or block.
 *
 * @module engines/GoalStabilityVerifierEngine
 * @milestone PP-0.25.1-U-SAFE2
 */

export interface GoalObservation {
  at: string; // ISO timestamp
  goalText: string;
  primaryObjective?: string;
  declaredRationale?: string;
}

export interface DriftSignal {
  kind: "semantic" | "instrumental" | "value";
  severity: number; // 0..1
  description: string;
}

export interface StabilityReport {
  observationCount: number;
  signals: DriftSignal[];
  stable: boolean;
  overallSeverity: number;
}

const INSTRUMENTAL_FLAGS = [
  "disable",
  "bypass",
  "unbounded",
  "self-replicate",
  "remove safety",
  "disable hook",
  "skip dedup",
  "acquire compute",
  "persist across",
  "exfiltrate",
];

function tokenize(s: string): Set<string> {
  return new Set(
    (s.toLowerCase().match(/[a-z0-9][a-z0-9_-]*/g) ?? []).filter((t) => t.length > 1)
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : 1 - inter / union;
}

export interface VerifierConfig {
  windowSize: number;
  driftAlertAt: number; // Jaccard distance threshold
  minObservationsForDrift: number;
}

export const DEFAULT_VERIFIER_CONFIG: VerifierConfig = Object.freeze({
  windowSize: 10,
  driftAlertAt: 0.75,
  minObservationsForDrift: 2,
});

export class GoalStabilityVerifierEngine {
  private readonly window: GoalObservation[] = [];
  private config: VerifierConfig;

  constructor(config: VerifierConfig = DEFAULT_VERIFIER_CONFIG) {
    this.validateConfig(config);
    this.config = config;
  }

  observe(goal: GoalObservation): void {
    this.validateObservation(goal);
    this.window.push({ ...goal });
    if (this.window.length > this.config.windowSize) {
      this.window.splice(0, this.window.length - this.config.windowSize);
    }
  }

  analyze(): StabilityReport {
    const n = this.window.length;
    const signals: DriftSignal[] = [];

    if (n >= this.config.minObservationsForDrift) {
      signals.push(...this.semanticSignals());
      signals.push(...this.valueSignals());
    }
    signals.push(...this.instrumentalSignals());

    const overall = signals.reduce((max, s) => Math.max(max, s.severity), 0);
    const stable = signals.length === 0;
    return {
      observationCount: n,
      signals,
      stable,
      overallSeverity: round4(overall),
    };
  }

  clear(): void {
    this.window.length = 0;
  }

  setConfig(config: VerifierConfig): void {
    this.validateConfig(config);
    this.config = config;
  }

  // --- internals ---------------------------------------------------------

  private semanticSignals(): DriftSignal[] {
    const out: DriftSignal[] = [];
    for (let i = 1; i < this.window.length; i += 1) {
      const prev = tokenize(this.window[i - 1].goalText);
      const cur = tokenize(this.window[i].goalText);
      const distance = jaccard(prev, cur);
      if (distance >= this.config.driftAlertAt) {
        out.push({
          kind: "semantic",
          severity: round4(distance),
          description: `Jaccard distance ${distance.toFixed(2)} between goals at ${this.window[i - 1].at} and ${this.window[i].at}`,
        });
      }
    }
    return out;
  }

  private valueSignals(): DriftSignal[] {
    const out: DriftSignal[] = [];
    let currentObjective: string | null = null;
    for (let i = 0; i < this.window.length; i += 1) {
      const obs = this.window[i];
      if (obs.primaryObjective) {
        if (currentObjective && obs.primaryObjective !== currentObjective && !obs.declaredRationale) {
          out.push({
            kind: "value",
            severity: 0.85,
            description: `primary objective changed from '${currentObjective}' to '${obs.primaryObjective}' without rationale at ${obs.at}`,
          });
        }
        currentObjective = obs.primaryObjective;
      }
    }
    return out;
  }

  private instrumentalSignals(): DriftSignal[] {
    const out: DriftSignal[] = [];
    for (const obs of this.window) {
      const lower = obs.goalText.toLowerCase();
      for (const flag of INSTRUMENTAL_FLAGS) {
        if (lower.includes(flag)) {
          out.push({
            kind: "instrumental",
            severity: 1,
            description: `goal contains instrumental convergence flag '${flag}' at ${obs.at}`,
          });
          break;
        }
      }
    }
    return out;
  }

  private validateObservation(g: GoalObservation): void {
    if (!g.at || !/^\d{4}-\d{2}-\d{2}T/.test(g.at)) throw new Error("at must be ISO");
    if (!g.goalText || g.goalText.trim() === "") throw new Error("goalText required");
  }

  private validateConfig(c: VerifierConfig): void {
    if (!Number.isInteger(c.windowSize) || c.windowSize < 2) throw new Error("windowSize must be integer ≥ 2");
    if (!(c.driftAlertAt > 0 && c.driftAlertAt <= 1)) throw new Error("driftAlertAt must be in (0, 1]");
    if (!Number.isInteger(c.minObservationsForDrift) || c.minObservationsForDrift < 2) {
      throw new Error("minObservationsForDrift must be integer ≥ 2");
    }
  }
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export const goalStabilityVerifierEngine = new GoalStabilityVerifierEngine();
