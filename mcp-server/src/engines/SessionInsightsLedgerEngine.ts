/**
 * SessionInsightsLedgerEngine — Append-only reflection ledger
 *
 * Phase 0.13 U-SAW7 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Writes
 * schema-validated insight entries to `SESSION_INSIGHTS_LEDGER.jsonl`. Each
 * entry records what a session learned when a milestone completed so the
 * next session can reference it.
 *
 * Write-contract:
 *   - Append-only — existing lines are never rewritten.
 *   - One JSON object per line (JSONL).
 *   - schemaVersion=1 on every entry; readers gate on it.
 *
 * The engine exposes validation + serialization; the actual file I/O is
 * performed via the `writer` callback so callers can plug in atomic-write
 * utilities, in-memory sinks, or tests without patching fs.
 *
 * @module engines/SessionInsightsLedgerEngine
 * @milestone PP-0.13-U-SAW7
 */

export type InsightCategory =
  | "duplication-avoided"
  | "goal-completed"
  | "error-recovery"
  | "dedup-hit"
  | "blocked-action"
  | "user-preference"
  | "pattern-learned"
  | "other";

export interface InsightEntry {
  schemaVersion: 1;
  id: string;
  sessionId: string;
  at: string; // ISO timestamp
  category: InsightCategory;
  summary: string;
  detail?: string;
  relatedGoalIds?: string[];
  confidence?: number; // 0..1
}

export interface LedgerAppendResult {
  ok: boolean;
  entry?: InsightEntry;
  errors?: string[];
}

const VALID_CATEGORIES: readonly InsightCategory[] = [
  "duplication-avoided",
  "goal-completed",
  "error-recovery",
  "dedup-hit",
  "blocked-action",
  "user-preference",
  "pattern-learned",
  "other",
];

export type LedgerWriter = (line: string) => void | Promise<void>;

export class SessionInsightsLedgerEngine {
  private nextId = 1;
  private readonly writer: LedgerWriter | null;

  constructor(writer?: LedgerWriter) {
    this.writer = writer ?? null;
  }

  validate(candidate: Partial<InsightEntry>): { ok: true } | { ok: false; errors: string[] } {
    const errors: string[] = [];
    if (candidate.schemaVersion !== 1) errors.push("schemaVersion must be 1");
    if (!candidate.id || typeof candidate.id !== "string") errors.push("id required");
    if (!candidate.sessionId || typeof candidate.sessionId !== "string") errors.push("sessionId required");
    if (!candidate.at || !/^\d{4}-\d{2}-\d{2}T/.test(String(candidate.at))) errors.push("at must be ISO timestamp");
    if (!candidate.category || !VALID_CATEGORIES.includes(candidate.category)) {
      errors.push(`category must be one of: ${VALID_CATEGORIES.join(", ")}`);
    }
    if (!candidate.summary || typeof candidate.summary !== "string" || candidate.summary.trim().length === 0) {
      errors.push("summary required");
    }
    if (candidate.confidence !== undefined) {
      if (typeof candidate.confidence !== "number" || candidate.confidence < 0 || candidate.confidence > 1) {
        errors.push("confidence must be a number in [0, 1]");
      }
    }
    if (candidate.relatedGoalIds !== undefined && !Array.isArray(candidate.relatedGoalIds)) {
      errors.push("relatedGoalIds must be an array of strings");
    }
    return errors.length === 0 ? { ok: true } : { ok: false, errors };
  }

  buildEntry(input: Omit<InsightEntry, "schemaVersion" | "id" | "at"> & { at?: string; id?: string }): InsightEntry {
    const id = input.id ?? `ins-${this.nextId++}`;
    const entry: InsightEntry = {
      schemaVersion: 1,
      id,
      sessionId: input.sessionId,
      at: input.at ?? new Date().toISOString(),
      category: input.category,
      summary: input.summary,
      detail: input.detail,
      relatedGoalIds: input.relatedGoalIds,
      confidence: input.confidence,
    };
    return entry;
  }

  serialize(entry: InsightEntry): string {
    return JSON.stringify(entry);
  }

  parse(line: string): InsightEntry | null {
    try {
      const data = JSON.parse(line);
      const v = this.validate(data);
      return v.ok ? (data as InsightEntry) : null;
    } catch {
      return null;
    }
  }

  async append(entry: InsightEntry): Promise<LedgerAppendResult> {
    const v = this.validate(entry);
    if (!v.ok) return { ok: false, errors: v.errors };
    if (!this.writer) return { ok: false, errors: ["no writer configured"] };
    await this.writer(this.serialize(entry) + "\n");
    return { ok: true, entry };
  }

  /**
   * Build + validate + append in one call. Primary API for hook handlers.
   */
  async record(
    input: Omit<InsightEntry, "schemaVersion" | "id" | "at"> & { at?: string; id?: string }
  ): Promise<LedgerAppendResult> {
    const entry = this.buildEntry(input);
    return this.append(entry);
  }
}
