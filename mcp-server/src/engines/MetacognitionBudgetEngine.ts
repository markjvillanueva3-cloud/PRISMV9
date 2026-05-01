/**
 * MetacognitionBudgetEngine — Rate-limit metacognition to prevent infinite loops
 *
 * Phase 0.16 U-OP15 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Phase 0.13's
 * metacognition hook could, if unbounded, trigger itself from its own reflection
 * output and burn context in a runaway loop. This engine enforces:
 *
 *   - At most 1 metacognition call every N PostTool events (default 15)
 *   - At most M metacognition calls per user turn (default 3)
 *   - Stack depth cap of 1 — self-triggered metacog cannot re-trigger
 *
 * No I/O. State is a counter per turn + an invocation ring buffer. Reset with
 * `startTurn()` at each UserPromptSubmit so counters track turn-scope only.
 *
 * @module engines/MetacognitionBudgetEngine
 * @milestone PP-0.16-U-OP15
 */

export interface BudgetConfig {
  maxPerTurn: number;
  postToolSpacing: number;
  stackDepthCap: number;
}

export const DEFAULT_CONFIG: BudgetConfig = Object.freeze({
  maxPerTurn: 3,
  postToolSpacing: 15,
  stackDepthCap: 1,
});

export interface AllowResult {
  allowed: boolean;
  reason?: string;
  remainingThisTurn: number;
}

export class MetacognitionBudgetEngine {
  private config: BudgetConfig;
  private turnId: string | null = null;
  private invocationsThisTurn = 0;
  private postToolSinceLast = 0;
  private stackDepth = 0;

  constructor(config: BudgetConfig = DEFAULT_CONFIG) {
    this.validateConfig(config);
    this.config = config;
  }

  startTurn(turnId: string): void {
    if (!turnId || turnId.trim() === "") throw new Error("turnId must be non-empty");
    this.turnId = turnId;
    this.invocationsThisTurn = 0;
    this.postToolSinceLast = this.config.postToolSpacing; // allow first call immediately
    this.stackDepth = 0;
  }

  observePostTool(): void {
    this.postToolSinceLast = Math.min(this.postToolSinceLast + 1, 1_000_000);
  }

  /**
   * Ask the budget if a metacognition call is allowed right now.
   * `fromSelf` = true marks a call that was triggered by a prior metacog
   * reflection (subject to the stack depth cap).
   */
  tryInvoke(fromSelf = false): AllowResult {
    if (this.turnId === null) {
      return { allowed: false, reason: "no turn started", remainingThisTurn: 0 };
    }
    if (this.invocationsThisTurn >= this.config.maxPerTurn) {
      return {
        allowed: false,
        reason: `per-turn cap reached (${this.config.maxPerTurn})`,
        remainingThisTurn: 0,
      };
    }
    if (fromSelf && this.stackDepth >= this.config.stackDepthCap) {
      return {
        allowed: false,
        reason: `stack depth cap reached (${this.config.stackDepthCap})`,
        remainingThisTurn: this.config.maxPerTurn - this.invocationsThisTurn,
      };
    }
    if (this.postToolSinceLast < this.config.postToolSpacing) {
      return {
        allowed: false,
        reason: `spacing not met (${this.postToolSinceLast}/${this.config.postToolSpacing} PostTool)`,
        remainingThisTurn: this.config.maxPerTurn - this.invocationsThisTurn,
      };
    }

    this.invocationsThisTurn += 1;
    this.postToolSinceLast = 0;
    if (fromSelf) this.stackDepth += 1;
    return {
      allowed: true,
      remainingThisTurn: this.config.maxPerTurn - this.invocationsThisTurn,
    };
  }

  /** Called when a metacog call completes — decrements stack depth if self-triggered. */
  completeInvoke(fromSelf = false): void {
    if (fromSelf) this.stackDepth = Math.max(0, this.stackDepth - 1);
  }

  snapshot(): {
    turnId: string | null;
    invocationsThisTurn: number;
    postToolSinceLast: number;
    stackDepth: number;
    config: BudgetConfig;
  } {
    return {
      turnId: this.turnId,
      invocationsThisTurn: this.invocationsThisTurn,
      postToolSinceLast: this.postToolSinceLast,
      stackDepth: this.stackDepth,
      config: { ...this.config },
    };
  }

  /** Test-compat: reset all state and start a fresh turn. */
  reset(): void {
    this.startTurn(`test-${Date.now()}`);
    this.invocationsThisTurn = 0;
  }

  /** Test-compat: check if an invocation is allowed. */
  canInvoke(): boolean {
    if (this.turnId === null) this.startTurn(`implicit-${Date.now()}`);
    return this.invocationsThisTurn < this.config.maxPerTurn;
  }

  /** Test-compat: record an invocation. */
  recordInvocation(): void {
    if (this.turnId === null) this.startTurn(`implicit-${Date.now()}`);
    this.invocationsThisTurn += 1;
  }

  /** Test-compat: get current recursion depth. */
  getCurrentDepth(): number {
    return this.stackDepth;
  }

  private validateConfig(c: BudgetConfig): void {
    if (!Number.isInteger(c.maxPerTurn) || c.maxPerTurn < 1) throw new Error("maxPerTurn must be >= 1");
    if (!Number.isInteger(c.postToolSpacing) || c.postToolSpacing < 1) throw new Error("postToolSpacing must be >= 1");
    if (!Number.isInteger(c.stackDepthCap) || c.stackDepthCap < 0) throw new Error("stackDepthCap must be >= 0");
  }
}

export const metacognitionBudgetEngine = new MetacognitionBudgetEngine();
