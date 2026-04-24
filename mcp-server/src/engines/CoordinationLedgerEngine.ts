// WIRE-EXEMPT: append-only event log for multi-agent coordination; consumed by agent hooks and reconciliation scripts
/**
 * CoordinationLedgerEngine — U-FORE-18 (Multi-Agent Coordination Spine)
 *
 * Append-only ledger of coordination events from concurrent agents.
 * Each event records {agent, kind, target, at, payload}. The ledger
 * provides read views (since, byAgent, byTarget) and detects conflict
 * patterns (two agents claiming the same target, overlapping edits).
 *
 * Deliberately in-memory + bounded — persistence belongs with a
 * reliability primitive (AtomicWritesEngine). This engine focuses on
 * the coordination semantics.
 */

export type CoordinationEventKind =
  | "claim"
  | "release"
  | "edit_start"
  | "edit_end"
  | "handoff"
  | "note"
  | "conflict_detected";

export interface CoordinationEvent {
  id: string;
  agent: string;
  kind: CoordinationEventKind;
  target: string;
  at: number;
  payload?: Record<string, unknown>;
}

export interface ConflictReport {
  target: string;
  agents: string[];
  kinds: CoordinationEventKind[];
  windowMs: number;
}

const DEFAULT_MAX_EVENTS = 10_000;
const DEFAULT_CLAIM_CONFLICT_WINDOW = 30_000;

export class CoordinationLedgerEngine {
  readonly name = "CoordinationLedgerEngine";
  private events: CoordinationEvent[] = [];
  private maxEvents: number;
  private idCounter = 0;

  constructor(maxEvents: number = DEFAULT_MAX_EVENTS) {
    if (!Number.isFinite(maxEvents) || maxEvents < 10) {
      throw new Error("CoordinationLedgerEngine: maxEvents must be >= 10");
    }
    this.maxEvents = maxEvents;
  }

  record(event: Omit<CoordinationEvent, "id" | "at"> & { at?: number }): CoordinationEvent {
    if (!event || typeof event.agent !== "string" || event.agent.length === 0) {
      throw new Error("CoordinationLedgerEngine.record: agent required");
    }
    if (typeof event.target !== "string" || event.target.length === 0) {
      throw new Error("CoordinationLedgerEngine.record: target required");
    }
    if (typeof event.kind !== "string") {
      throw new Error("CoordinationLedgerEngine.record: kind required");
    }
    this.idCounter += 1;
    const id = `evt-${Date.now()}-${this.idCounter}`;
    const at = event.at ?? Date.now();
    const full: CoordinationEvent = {
      id,
      agent: event.agent,
      kind: event.kind,
      target: event.target,
      at,
      payload: event.payload,
    };
    this.events.push(full);
    if (this.events.length > this.maxEvents) this.events.shift();
    return full;
  }

  since(at: number): CoordinationEvent[] {
    return this.events.filter((e) => e.at >= at);
  }

  byAgent(agent: string): CoordinationEvent[] {
    return this.events.filter((e) => e.agent === agent);
  }

  byTarget(target: string): CoordinationEvent[] {
    return this.events.filter((e) => e.target === target);
  }

  detectConflicts(windowMs: number = DEFAULT_CLAIM_CONFLICT_WINDOW): ConflictReport[] {
    const conflicts: ConflictReport[] = [];
    const byTarget = new Map<string, CoordinationEvent[]>();
    for (const e of this.events) {
      if (!byTarget.has(e.target)) byTarget.set(e.target, []);
      byTarget.get(e.target)!.push(e);
    }
    for (const [target, list] of byTarget) {
      const claims = list.filter((e) => e.kind === "claim" || e.kind === "edit_start");
      if (claims.length < 2) continue;
      const agents = new Set(claims.map((e) => e.agent));
      if (agents.size < 2) continue;
      const sorted = claims.sort((a, b) => a.at - b.at);
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const cur = sorted[i];
        if (prev.agent === cur.agent) continue;
        if (cur.at - prev.at <= windowMs) {
          const released = list.some(
            (e) => (e.kind === "release" || e.kind === "edit_end") &&
              e.agent === prev.agent &&
              e.at > prev.at &&
              e.at < cur.at,
          );
          if (!released) {
            conflicts.push({
              target,
              agents: Array.from(agents),
              kinds: [prev.kind, cur.kind],
              windowMs,
            });
            break;
          }
        }
      }
    }
    return conflicts;
  }

  count(): number {
    return this.events.length;
  }

  reset(): void {
    this.events = [];
    this.idCounter = 0;
  }

  /**
   * Hydrate the in-memory ledger from already-read JSONL lines.
   * Each line must be a JSON object with at least {agent, kind, target, at}.
   * Malformed lines are skipped and returned in `errors`. Events beyond
   * maxEvents keep only the most recent (FIFO eviction matches runtime
   * behavior). `id` is preserved if present, otherwise synthesized.
   *
   * @param lines Raw JSONL lines (already split).
   * @returns Counts of hydrated / skipped / errored lines.
   */
  hydrateFromJSONL(lines: string[]): {
    hydrated: number;
    skipped: number;
    errors: Array<{ line: number; reason: string }>;
  } {
    const errors: Array<{ line: number; reason: string }> = [];
    let hydrated = 0;
    let skipped = 0;
    const parsed: CoordinationEvent[] = [];
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i].trim();
      if (!raw) {
        skipped++;
        continue;
      }
      try {
        const obj = JSON.parse(raw) as Partial<CoordinationEvent>;
        if (!obj || typeof obj !== "object") {
          errors.push({ line: i, reason: "not an object" });
          continue;
        }
        if (typeof obj.agent !== "string" || obj.agent.length === 0) {
          errors.push({ line: i, reason: "missing agent" });
          continue;
        }
        if (typeof obj.target !== "string" || obj.target.length === 0) {
          errors.push({ line: i, reason: "missing target" });
          continue;
        }
        if (typeof obj.kind !== "string") {
          errors.push({ line: i, reason: "missing kind" });
          continue;
        }
        const at = typeof obj.at === "number" && Number.isFinite(obj.at) ? obj.at : Date.now();
        this.idCounter += 1;
        const id = typeof obj.id === "string" && obj.id.length > 0
          ? obj.id
          : `evt-${at}-${this.idCounter}`;
        parsed.push({
          id,
          agent: obj.agent,
          kind: obj.kind as CoordinationEventKind,
          target: obj.target,
          at,
          payload: obj.payload,
        });
        hydrated++;
      } catch (err) {
        errors.push({ line: i, reason: (err as Error).message });
      }
    }
    // Preserve FIFO ordering across existing + parsed events, then trim
    this.events = [...this.events, ...parsed].sort((a, b) => a.at - b.at);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(this.events.length - this.maxEvents);
    }
    return { hydrated, skipped, errors };
  }

  /**
   * Serialize the current ledger as JSONL — one event per line, sorted
   * by timestamp ascending. Consumers can write this to a file to
   * persist the in-memory state.
   *
   * @returns JSONL string (no trailing newline on the last record).
   */
  toJSONL(): string {
    return this.events
      .slice()
      .sort((a, b) => a.at - b.at)
      .map((e) => JSON.stringify(e))
      .join("\n");
  }
}

export const coordinationLedgerEngine = new CoordinationLedgerEngine();
