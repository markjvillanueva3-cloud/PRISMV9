/**
 * SelfModelEngine — "Who I am" slice of the triple-model decomposition
 *
 * Phase 0.13 U-SAW4 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Tracks the
 * session's own capabilities, recent actions, and self-assessment. Pairs with
 * UserModelEngine and WorldModelEngine to form the triple the hook layer uses
 * for situational briefing.
 *
 *   SelfModel   — capabilities I have, tools I've used, confidence per domain
 *   UserModel   — what I believe the user knows, their preferences (separate file)
 *   WorldModel  — what exists in PRISM — engines, registries, etc. (separate file)
 *
 * Methods are pure over internal state — no I/O. Serialize via toJSON().
 *
 * @module engines/SelfModelEngine
 * @milestone PP-0.13-U-SAW4
 */

export interface CapabilityEntry {
  name: string;
  lastUsed: string | null;
  useCount: number;
  confidence: number; // 0..1
}

export interface ActionLogEntry {
  at: string;
  action: string;
  outcome: "success" | "failure" | "blocked";
  note?: string;
}

export interface SelfSnapshot {
  schemaVersion: 1;
  sessionId: string;
  capabilities: CapabilityEntry[];
  recentActions: ActionLogEntry[];
  overallConfidence: number;
  updatedAt: string;
}

const MAX_ACTION_LOG = 50;

export class SelfModelEngine {
  private readonly sessionId: string;
  private readonly capabilities = new Map<string, CapabilityEntry>();
  private actions: ActionLogEntry[] = [];
  private updatedAt: string;

  constructor(sessionId: string) {
    if (!sessionId || sessionId.trim() === "") {
      throw new Error("SelfModelEngine requires a non-empty sessionId");
    }
    this.sessionId = sessionId;
    this.updatedAt = new Date().toISOString();
  }

  getSessionId(): string {
    return this.sessionId;
  }

  declareCapability(name: string, initialConfidence = 0.5): CapabilityEntry {
    const key = name.trim();
    if (!key) throw new Error("capability name must be non-empty");
    if (initialConfidence < 0 || initialConfidence > 1) {
      throw new Error("initialConfidence must be in [0, 1]");
    }
    const existing = this.capabilities.get(key);
    if (existing) return existing;

    const entry: CapabilityEntry = {
      name: key,
      lastUsed: null,
      useCount: 0,
      confidence: initialConfidence,
    };
    this.capabilities.set(key, entry);
    this.touch();
    return entry;
  }

  getCapability(name: string): CapabilityEntry | null {
    return this.capabilities.get(name.trim()) ?? null;
  }

  recordAction(action: string, outcome: ActionLogEntry["outcome"], opts: { note?: string; at?: string } = {}): void {
    const at = opts.at ?? new Date().toISOString();
    const entry: ActionLogEntry = { at, action, outcome, note: opts.note };
    this.actions.push(entry);
    if (this.actions.length > MAX_ACTION_LOG) {
      this.actions.splice(0, this.actions.length - MAX_ACTION_LOG);
    }

    const cap = this.capabilities.get(action);
    if (cap) {
      cap.lastUsed = at;
      cap.useCount += 1;
      cap.confidence = this.nudgeConfidence(cap.confidence, outcome);
    }
    this.touch();
  }

  getRecentActions(limit = 10): ActionLogEntry[] {
    if (limit <= 0) return [];
    return this.actions.slice(-limit);
  }

  overallConfidence(): number {
    if (this.capabilities.size === 0) return 0;
    let sum = 0;
    for (const c of this.capabilities.values()) sum += c.confidence;
    return Math.round((sum / this.capabilities.size) * 10000) / 10000;
  }

  snapshot(): SelfSnapshot {
    return {
      schemaVersion: 1,
      sessionId: this.sessionId,
      capabilities: [...this.capabilities.values()].map((c) => ({ ...c })),
      recentActions: [...this.actions],
      overallConfidence: this.overallConfidence(),
      updatedAt: this.updatedAt,
    };
  }

  toJSON(): SelfSnapshot {
    return this.snapshot();
  }

  static fromJSON(data: SelfSnapshot): SelfModelEngine {
    if (data.schemaVersion !== 1) {
      throw new Error(`SelfModelEngine.fromJSON: unsupported schemaVersion ${data.schemaVersion}`);
    }
    const e = new SelfModelEngine(data.sessionId);
    for (const c of data.capabilities) e.capabilities.set(c.name, { ...c });
    e.actions = [...data.recentActions];
    e.updatedAt = data.updatedAt;
    return e;
  }

  private touch(): void {
    this.updatedAt = new Date().toISOString();
  }

  private nudgeConfidence(current: number, outcome: ActionLogEntry["outcome"]): number {
    const delta = outcome === "success" ? +0.05 : outcome === "failure" ? -0.10 : -0.03;
    const next = Math.max(0, Math.min(1, current + delta));
    return Math.round(next * 10000) / 10000;
  }
}
