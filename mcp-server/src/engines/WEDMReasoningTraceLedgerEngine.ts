/**
 * WEDMReasoningTraceLedgerEngine — MS-P0.5-COORD U-P0.5-COORD-02
 *
 * Append-only JSONL ledger of WEDM dispatcher reasoning traces. Each entry
 * records a decision point: which dispatcher, action, keywords, a short
 * summary of inputs/outputs, confidence, and which downstream engines were
 * consulted. Provides an audit trail for post-hoc analysis and drives the
 * reasoning-ledger heartbeat hook.
 *
 * Write-contract:
 *   - Append-only; existing lines are never rewritten.
 *   - One JSON object per line (JSONL).
 *   - schemaVersion=1 on every entry; readers gate on it.
 *   - fs.appendFile writes on POSIX/Windows use O_APPEND semantics so
 *     concurrent appends from multiple processes do not interleave mid-line
 *     for writes under the OS atomic-append size.
 *
 * In-memory ring buffer (TRACE_RING_SIZE=1000) serves fast query needs;
 * disk is the durable source of truth but not read back (forward-only).
 */
import * as path from "path";
import { appendToFile, writeTextFile } from "../utils/files.js";
import { log } from "../utils/Logger.js";

export interface ReasoningTraceEntry {
  schemaVersion: 1;
  id: string;
  at: string;
  dispatcher: string;
  action: string;
  keywords: string[];
  inputs_summary?: string;
  outputs_summary?: string;
  confidence?: number;
  awareness_used: boolean;
  tribal_tips_used?: number;
  duration_ms?: number;
  engines_consulted?: string[];
  error?: string;
}

export interface LedgerStats {
  totalTraces: number;
  recentWindowSize: number;
  recentRate_per_min: number;
  topActions: Array<{ action: string; count: number }>;
  errorRate: number;
  awarenessAdoption: number;
  lastTraceAt: string | null;
  silentMinutes: number;
}

export interface LedgerAppendResult {
  ok: boolean;
  entry?: ReasoningTraceEntry;
  errors?: string[];
}

const TRACE_RING_SIZE = 1000;
const RECENT_WINDOW_MS = 5 * 60 * 1000;
const DEFAULT_LEDGER_PATH = path.resolve(
  process.cwd(),
  "data",
  "state",
  "WEDM_REASONING_TRACE_LEDGER.jsonl",
);

export class WEDMReasoningTraceLedgerEngine {
  private ring: ReasoningTraceEntry[] = [];
  private nextId = 1;
  private ledgerPath: string;
  private diskWritesEnabled = true;

  constructor(ledgerPath: string = DEFAULT_LEDGER_PATH) {
    this.ledgerPath = ledgerPath;
  }

  setLedgerPath(p: string): void {
    this.ledgerPath = p;
  }

  setDiskWrites(enabled: boolean): void {
    this.diskWritesEnabled = enabled;
  }

  private generateId(): string {
    const now = Date.now().toString(36);
    const seq = (this.nextId++).toString(36).padStart(4, "0");
    return `wrt-${now}-${seq}`;
  }

  validate(candidate: Partial<ReasoningTraceEntry>): { ok: true } | { ok: false; errors: string[] } {
    const errors: string[] = [];
    if (candidate.schemaVersion !== 1) errors.push("schemaVersion must be 1");
    if (!candidate.id || typeof candidate.id !== "string") errors.push("id required");
    if (!candidate.at || !/^\d{4}-\d{2}-\d{2}T/.test(String(candidate.at))) errors.push("at must be ISO timestamp");
    if (!candidate.dispatcher || typeof candidate.dispatcher !== "string") errors.push("dispatcher required");
    if (!candidate.action || typeof candidate.action !== "string") errors.push("action required");
    if (!Array.isArray(candidate.keywords)) errors.push("keywords must be array");
    if (typeof candidate.awareness_used !== "boolean") errors.push("awareness_used must be boolean");
    if (candidate.confidence !== undefined && (candidate.confidence < 0 || candidate.confidence > 1)) {
      errors.push("confidence must be in [0,1]");
    }
    return errors.length === 0 ? { ok: true } : { ok: false, errors };
  }

  async recordTrace(
    partial: Omit<ReasoningTraceEntry, "schemaVersion" | "id" | "at">,
  ): Promise<LedgerAppendResult> {
    const entry: ReasoningTraceEntry = {
      schemaVersion: 1,
      id: this.generateId(),
      at: new Date().toISOString(),
      ...partial,
    };
    const v = this.validate(entry);
    if (!v.ok) {
      return { ok: false, errors: v.errors };
    }
    this.ring.push(entry);
    if (this.ring.length > TRACE_RING_SIZE) {
      this.ring.splice(0, this.ring.length - TRACE_RING_SIZE);
    }
    if (this.diskWritesEnabled) {
      try {
        await appendToFile(this.ledgerPath, JSON.stringify(entry) + "\n");
      } catch (e) {
        log.warn(`[wedm-trace-ledger] disk write failed (in-memory preserved): ${(e as Error).message}`);
      }
    }
    return { ok: true, entry };
  }

  recordTraceSync(
    partial: Omit<ReasoningTraceEntry, "schemaVersion" | "id" | "at">,
  ): LedgerAppendResult {
    const entry: ReasoningTraceEntry = {
      schemaVersion: 1,
      id: this.generateId(),
      at: new Date().toISOString(),
      ...partial,
    };
    const v = this.validate(entry);
    if (!v.ok) return { ok: false, errors: v.errors };
    this.ring.push(entry);
    if (this.ring.length > TRACE_RING_SIZE) {
      this.ring.splice(0, this.ring.length - TRACE_RING_SIZE);
    }
    if (this.diskWritesEnabled) {
      void appendToFile(this.ledgerPath, JSON.stringify(entry) + "\n").catch((e) => {
        log.warn(`[wedm-trace-ledger] async disk write failed: ${(e as Error).message}`);
      });
    }
    return { ok: true, entry };
  }

  getRecent(limit = 100): ReasoningTraceEntry[] {
    return this.ring.slice(-limit);
  }

  queryByDispatcher(dispatcher: string, limit = 100): ReasoningTraceEntry[] {
    return this.ring.filter((e) => e.dispatcher === dispatcher).slice(-limit);
  }

  queryByAction(action: string, limit = 100): ReasoningTraceEntry[] {
    return this.ring.filter((e) => e.action === action).slice(-limit);
  }

  queryByKeyword(keyword: string, limit = 100): ReasoningTraceEntry[] {
    const kw = keyword.toLowerCase();
    return this.ring.filter((e) => e.keywords.some((k) => k.toLowerCase().includes(kw))).slice(-limit);
  }

  getStats(): LedgerStats {
    const now = Date.now();
    const recent = this.ring.filter((e) => now - new Date(e.at).getTime() <= RECENT_WINDOW_MS);
    const actionCounts = new Map<string, number>();
    let errors = 0;
    let awarenessUses = 0;
    for (const e of this.ring) {
      actionCounts.set(e.action, (actionCounts.get(e.action) ?? 0) + 1);
      if (e.error) errors++;
      if (e.awareness_used) awarenessUses++;
    }
    const topActions = Array.from(actionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([action, count]) => ({ action, count }));
    const lastTraceAt = this.ring.length > 0 ? this.ring[this.ring.length - 1].at : null;
    const silentMinutes = lastTraceAt
      ? Math.floor((now - new Date(lastTraceAt).getTime()) / 60000)
      : 0;
    return {
      totalTraces: this.ring.length,
      recentWindowSize: recent.length,
      recentRate_per_min: recent.length === 0 ? 0 : Math.round((recent.length / 5) * 10) / 10,
      topActions,
      errorRate: this.ring.length === 0 ? 0 : Math.round((errors / this.ring.length) * 1000) / 10,
      awarenessAdoption: this.ring.length === 0 ? 0 : Math.round((awarenessUses / this.ring.length) * 1000) / 10,
      lastTraceAt,
      silentMinutes,
    };
  }

  async truncateDiskLedger(): Promise<void> {
    await writeTextFile(this.ledgerPath, "");
  }

  resetForTests(): void {
    this.ring.length = 0;
    this.nextId = 1;
    this.diskWritesEnabled = false;
  }
}

export const wedmReasoningTraceLedgerEngine = new WEDMReasoningTraceLedgerEngine();
