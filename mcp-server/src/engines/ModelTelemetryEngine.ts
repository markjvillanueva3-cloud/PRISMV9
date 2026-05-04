/**
 * ModelTelemetryEngine — per-model invocation logger + rolling-window aggregator
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / P23-U01.
 *
 * Every Ollama (or Claude) call passes through `recordCall(...)`. Lines append
 * to `mcp-server/data/state/model-telemetry.jsonl` (one JSON per line) and a
 * bounded in-memory ring buffer for fast `summary(...)` queries.
 *
 * Storage rationale:
 *   - JSONL: append-only, crash-safe, easy to grep/jq, no migration headaches
 *   - In-memory ring: P23-U02 adaptive-router-tuner reads many summaries per
 *     run; loading 7d of JSONL on every read would swamp the script. The ring
 *     is hydrated from the tail of the file on first call.
 *
 * Engine is stateful (the ring is mutable) but the file write is the only
 * I/O — every other method is pure or hits the ring. Failures during write
 * surface as `ok: false` returns; we never throw on disk pressure.
 *
 * @module engines/ModelTelemetryEngine
 */

import { promises as fs } from "node:fs";
import path from "node:path";

export type CallOutcome = "ok" | "error" | "timeout" | "escalated";

export interface CallRecord {
  ts: string;                  // ISO8601 wall-clock
  model: string;
  tier: number;                // ModelTier (0..5) — Claude is tier 5
  outcome: CallOutcome;
  latencyMs: number;
  promptTokens: number;        // 0 if unknown — must always be a number
  completionTokens: number;    // 0 if unknown
  qualityScore?: number;       // 0..1 — only set when downstream evaluator scores it
  caller?: string;             // dispatcher action / hook name / "manual"
  error?: string;              // populated on outcome=error|timeout
}

export interface ModelSummary {
  model: string;
  calls: number;
  okCount: number;
  errorCount: number;
  timeoutCount: number;
  meanLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  meanPromptTokens: number;
  meanCompletionTokens: number;
  meanQualityScore: number | null;
  successRate: number;         // ok / calls
}

export interface TelemetryReport {
  windowStart: string;         // ISO of earliest considered ts
  windowEnd: string;           // ISO of latest considered ts
  totalCalls: number;
  perModel: ModelSummary[];
}

export interface RecordResult {
  ok: boolean;
  error: string | null;
  fileBytes: number;           // size of telemetry file after append (best-effort)
}

const DEFAULT_TELEMETRY_FILE = "H:/prism/mcp-server/data/state/model-telemetry.jsonl";
const RING_CAPACITY = 5000;
const HYDRATE_TAIL_BYTES = 1_500_000; // ~1.5 MB tail on first load — covers ~10k recent calls

export class ModelTelemetryEngine {
  private filePath: string = DEFAULT_TELEMETRY_FILE;
  private ring: CallRecord[] = [];
  private hydrated = false;

  setFilePath(p: string): void {
    if (typeof p !== "string" || p.length === 0) {
      throw new Error("filePath must be a non-empty string");
    }
    this.filePath = p;
    this.ring = [];
    this.hydrated = false;
  }

  getFilePath(): string {
    return this.filePath;
  }

  async recordCall(input: Omit<CallRecord, "ts"> & { ts?: string }): Promise<RecordResult> {
    this.validateInput(input);
    // Hydrate from disk on first call so a future summary() doesn't double-count
    // records by re-reading the file we are about to append to.
    if (!this.hydrated) await this.hydrate();
    const rec: CallRecord = {
      ts: input.ts ?? new Date().toISOString(),
      model: input.model,
      tier: input.tier,
      outcome: input.outcome,
      latencyMs: input.latencyMs,
      promptTokens: input.promptTokens,
      completionTokens: input.completionTokens,
      qualityScore: input.qualityScore,
      caller: input.caller,
      error: input.error,
    };

    // In-memory ring is updated even if disk write fails — losing a single
    // line is fine; losing the live summary view is more painful.
    this.pushRing(rec);

    let bytes = 0;
    try {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      await fs.appendFile(this.filePath, JSON.stringify(rec) + "\n", "utf-8");
      const stat = await fs.stat(this.filePath);
      bytes = stat.size;
    } catch (e) {
      return { ok: false, error: (e as Error).message, fileBytes: bytes };
    }
    return { ok: true, error: null, fileBytes: bytes };
  }

  async summary(windowMs: number = 7 * 24 * 60 * 60 * 1000): Promise<TelemetryReport> {
    if (!Number.isFinite(windowMs) || windowMs <= 0) {
      throw new Error("windowMs must be a positive number");
    }
    if (!this.hydrated) await this.hydrate();

    const cutoff = Date.now() - windowMs;
    const recent = this.ring.filter((r) => Date.parse(r.ts) >= cutoff);

    if (recent.length === 0) {
      return {
        windowStart: new Date(cutoff).toISOString(),
        windowEnd: new Date().toISOString(),
        totalCalls: 0,
        perModel: [],
      };
    }

    const byModel = new Map<string, CallRecord[]>();
    for (const r of recent) {
      let arr = byModel.get(r.model);
      if (!arr) {
        arr = [];
        byModel.set(r.model, arr);
      }
      arr.push(r);
    }

    const perModel: ModelSummary[] = [];
    for (const [model, recs] of byModel) {
      perModel.push(this.summarizeModel(model, recs));
    }
    perModel.sort((a, b) => b.calls - a.calls);

    const tsList = recent.map((r) => Date.parse(r.ts)).sort((a, b) => a - b);
    return {
      windowStart: new Date(tsList[0]).toISOString(),
      windowEnd: new Date(tsList[tsList.length - 1]).toISOString(),
      totalCalls: recent.length,
      perModel,
    };
  }

  async getRecent(limit: number = 50): Promise<CallRecord[]> {
    if (!Number.isInteger(limit) || limit <= 0) {
      throw new Error("limit must be a positive integer");
    }
    if (!this.hydrated) await this.hydrate();
    return this.ring.slice(-limit);
  }

  // Used by tests + adaptive-tuner to start clean.
  resetForTesting(): void {
    this.ring = [];
    this.hydrated = false;
  }

  // ---- internals ----

  private summarizeModel(model: string, recs: CallRecord[]): ModelSummary {
    const calls = recs.length;
    const okCount = recs.filter((r) => r.outcome === "ok").length;
    const errorCount = recs.filter((r) => r.outcome === "error").length;
    const timeoutCount = recs.filter((r) => r.outcome === "timeout").length;
    const latencies = recs.map((r) => r.latencyMs).sort((a, b) => a - b);
    const promptT = recs.map((r) => r.promptTokens);
    const completionT = recs.map((r) => r.completionTokens);
    const qualityScores = recs
      .map((r) => r.qualityScore)
      .filter((x): x is number => typeof x === "number");

    const mean = (xs: number[]) =>
      xs.length === 0 ? 0 : xs.reduce((s, x) => s + x, 0) / xs.length;
    const percentile = (sorted: number[], p: number) => {
      if (sorted.length === 0) return 0;
      const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
      return sorted[idx];
    };

    return {
      model,
      calls,
      okCount,
      errorCount,
      timeoutCount,
      meanLatencyMs: Math.round(mean(latencies)),
      p50LatencyMs: percentile(latencies, 50),
      p95LatencyMs: percentile(latencies, 95),
      meanPromptTokens: Math.round(mean(promptT)),
      meanCompletionTokens: Math.round(mean(completionT)),
      meanQualityScore: qualityScores.length === 0 ? null : Number(mean(qualityScores).toFixed(3)),
      successRate: calls === 0 ? 0 : Number((okCount / calls).toFixed(3)),
    };
  }

  private pushRing(rec: CallRecord): void {
    this.ring.push(rec);
    if (this.ring.length > RING_CAPACITY) {
      this.ring.splice(0, this.ring.length - RING_CAPACITY);
    }
  }

  private async hydrate(): Promise<void> {
    this.hydrated = true; // mark first so a failed read doesn't loop
    try {
      const stat = await fs.stat(this.filePath);
      const start = Math.max(0, stat.size - HYDRATE_TAIL_BYTES);
      const handle = await fs.open(this.filePath, "r");
      try {
        const buf = Buffer.alloc(stat.size - start);
        await handle.read(buf, 0, buf.length, start);
        // Drop the (likely-partial) first line if we didn't read from byte 0.
        const lines = buf.toString("utf-8").split("\n").filter((l) => l.length > 0);
        const usable = start === 0 ? lines : lines.slice(1);
        for (const line of usable) {
          try {
            const rec = JSON.parse(line) as CallRecord;
            if (this.isCallRecord(rec)) this.pushRing(rec);
          } catch {
            // bad line — skip silently; jsonl tolerates corruption per-line
          }
        }
      } finally {
        await handle.close();
      }
    } catch {
      // file doesn't exist yet — that's fine, the next recordCall creates it
    }
  }

  private isCallRecord(x: unknown): x is CallRecord {
    if (!x || typeof x !== "object") return false;
    const r = x as Record<string, unknown>;
    return typeof r.ts === "string"
      && typeof r.model === "string"
      && typeof r.tier === "number"
      && typeof r.outcome === "string"
      && typeof r.latencyMs === "number"
      && typeof r.promptTokens === "number"
      && typeof r.completionTokens === "number";
  }

  private validateInput(x: Omit<CallRecord, "ts"> & { ts?: string }): void {
    if (!x || typeof x !== "object") throw new Error("CallRecord input required");
    if (typeof x.model !== "string" || x.model.length === 0) {
      throw new Error("model must be a non-empty string");
    }
    if (!Number.isInteger(x.tier) || x.tier < 0 || x.tier > 5) {
      throw new Error("tier must be integer 0..5");
    }
    const validOutcomes: CallOutcome[] = ["ok", "error", "timeout", "escalated"];
    if (!validOutcomes.includes(x.outcome)) {
      throw new Error(`outcome must be one of ${validOutcomes.join("|")}`);
    }
    if (!Number.isFinite(x.latencyMs) || x.latencyMs < 0) {
      throw new Error("latencyMs must be non-negative number");
    }
    if (!Number.isFinite(x.promptTokens) || x.promptTokens < 0) {
      throw new Error("promptTokens must be non-negative number");
    }
    if (!Number.isFinite(x.completionTokens) || x.completionTokens < 0) {
      throw new Error("completionTokens must be non-negative number");
    }
    if (x.qualityScore !== undefined) {
      if (!Number.isFinite(x.qualityScore) || x.qualityScore < 0 || x.qualityScore > 1) {
        throw new Error("qualityScore must be in [0, 1]");
      }
    }
  }
}

export const modelTelemetryEngine = new ModelTelemetryEngine();
