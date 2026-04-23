/**
 * FeedbackLoopDoctorEngine — U-FORE-14 (New-Coder Safety Net)
 * =============================================================
 *
 * Detects when the agent (or a developer working alongside the agent)
 * is in a feedback loop — repeatedly trying near-duplicate tool calls,
 * re-reading the same file, or escalating the same error. Emits a
 * loop-break suggestion so the loop can be interrupted early instead
 * of burning tokens / time.
 *
 * Inputs  → record({ kind, target, outcome }) → void
 *            diagnose() → LoopVerdict
 *
 * Signals tracked:
 *   - Same (kind,target) repeated ≥ THRESHOLD_REPEATS within WINDOW
 *   - Alternating between two targets (ping-pong)
 *   - Error outcome ≥ ERROR_STREAK times in a row
 *   - Growing error diversity (user hitting more and more new errors)
 */

type Outcome = "ok" | "error" | "unknown";

export interface LoopEvent {
  kind: "read" | "edit" | "bash" | "test" | "build" | "search";
  target: string;
  outcome: Outcome;
  error?: string;
  at?: number;
}

export interface LoopVerdict {
  looping: boolean;
  severity: "none" | "warn" | "alarm";
  patterns: string[];
  breakSuggestion: string;
  recentEvents: number;
}

const DEFAULT_WINDOW = 20;
const THRESHOLD_REPEATS = 3;
const ERROR_STREAK = 3;
const PING_PONG_MIN = 4;

export class FeedbackLoopDoctorEngine {
  readonly name = "FeedbackLoopDoctorEngine";
  private events: LoopEvent[] = [];
  private window: number;

  constructor(window: number = DEFAULT_WINDOW) {
    if (!Number.isFinite(window) || window < 2) {
      throw new Error("FeedbackLoopDoctorEngine: window must be finite and >= 2");
    }
    this.window = window;
  }

  record(e: LoopEvent): void {
    if (!e || typeof e.kind !== "string" || typeof e.target !== "string") {
      throw new Error("FeedbackLoopDoctorEngine.record: kind and target required");
    }
    this.events.push({ ...e, at: e.at ?? Date.now() });
    if (this.events.length > this.window) this.events.shift();
  }

  diagnose(): LoopVerdict {
    const patterns: string[] = [];
    if (this.events.length < THRESHOLD_REPEATS) {
      return {
        looping: false,
        severity: "none",
        patterns: [],
        breakSuggestion: "Not enough signal yet.",
        recentEvents: this.events.length,
      };
    }

    const counts = new Map<string, number>();
    for (const e of this.events) {
      const key = `${e.kind}:${e.target}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    for (const [key, n] of counts) {
      if (n >= THRESHOLD_REPEATS) patterns.push(`repeat:${key}:x${n}`);
    }

    if (this.events.length >= PING_PONG_MIN) {
      const tail = this.events.slice(-PING_PONG_MIN);
      const a = tail[0]?.target;
      const b = tail[1]?.target;
      if (a && b && a !== b) {
        const pingPong = tail.every((ev, i) => ev.target === (i % 2 === 0 ? a : b));
        if (pingPong) patterns.push(`ping_pong:${a}<->${b}`);
      }
    }

    let streak = 0;
    for (let i = this.events.length - 1; i >= 0; i--) {
      if (this.events[i].outcome === "error") streak++;
      else break;
    }
    if (streak >= ERROR_STREAK) patterns.push(`error_streak:${streak}`);

    const uniqueErrors = new Set(
      this.events.filter((e) => e.outcome === "error" && e.error).map((e) => e.error!)
    );
    if (uniqueErrors.size >= ERROR_STREAK && this.events.filter((e) => e.outcome === "error").length >= ERROR_STREAK + 1) {
      patterns.push(`diverging_errors:${uniqueErrors.size}`);
    }

    const severity: LoopVerdict["severity"] =
      patterns.length >= 2 ? "alarm" : patterns.length === 1 ? "warn" : "none";
    const looping = severity !== "none";

    const breakSuggestion = looping
      ? this.suggestBreak(patterns)
      : "No loop detected.";

    return { looping, severity, patterns, breakSuggestion, recentEvents: this.events.length };
  }

  reset(): void {
    this.events = [];
  }

  get size(): number {
    return this.events.length;
  }

  private suggestBreak(patterns: string[]): string {
    if (patterns.some((p) => p.startsWith("error_streak"))) {
      return "Stop. Re-read the first error in full — the rest are cascades.";
    }
    if (patterns.some((p) => p.startsWith("ping_pong"))) {
      return "Unify the two targets into one change set, then act.";
    }
    if (patterns.some((p) => p.startsWith("diverging_errors"))) {
      return "You are fighting symptoms. Revert the last change and start from a known-good state.";
    }
    if (patterns.some((p) => p.startsWith("repeat:"))) {
      return "Something is not changing between attempts. Inspect the actual on-disk state before retrying.";
    }
    return "Check context and reconsider the plan.";
  }
}

export const feedbackLoopDoctorEngine = new FeedbackLoopDoctorEngine();
