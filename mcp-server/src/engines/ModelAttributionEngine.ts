/**
 * ModelAttributionEngine — Track which model answered each response
 *
 * Phase 0.25.6 U-UX3 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. PRISM mixes
 * local LLMs, Claude, and heuristic engines. Users benefit from knowing
 * which one produced a given answer — it sets expectations on speed,
 * latency, and confidence. This engine:
 *
 *   - records per-response attribution with token counts and latency
 *   - produces a compact "badge" (e.g. "[claude-opus-4.7 · 42ms]") suitable
 *     for prefixing / appending to response text
 *   - aggregates usage statistics for a dashboard or `/aware` skill
 *
 * No I/O. A higher-level sink writes to the attribution ledger.
 *
 * @module engines/ModelAttributionEngine
 * @milestone PP-0.25.6-U-UX3
 */

export type ModelProvenance = "local" | "claude" | "heuristic" | "external";

export interface AttributionRecord {
  responseId: string;
  model: string;
  provenance: ModelProvenance;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  at: string;
  correlationId?: string;
}

export interface UsageSummary {
  byModel: Record<string, { calls: number; tokensIn: number; tokensOut: number; avgLatencyMs: number }>;
  byProvenance: Record<ModelProvenance, number>;
  totalCalls: number;
}

export class ModelAttributionEngine {
  private readonly records: AttributionRecord[] = [];
  private readonly maxRecords: number;

  constructor(maxRecords = 500) {
    if (!Number.isInteger(maxRecords) || maxRecords <= 0) {
      throw new Error("maxRecords must be positive integer");
    }
    this.maxRecords = maxRecords;
  }

  record(entry: Omit<AttributionRecord, "at"> & { at?: string }): AttributionRecord {
    this.validate(entry);
    const record: AttributionRecord = {
      ...entry,
      at: entry.at ?? new Date().toISOString(),
    };
    this.records.push(record);
    if (this.records.length > this.maxRecords) {
      this.records.splice(0, this.records.length - this.maxRecords);
    }
    return record;
  }

  badge(record: AttributionRecord): string {
    const tag = this.provenanceTag(record.provenance);
    return `[${tag}${record.model} · ${record.latencyMs}ms]`;
  }

  /** Build a badge without a recorded entry (e.g., for live display). */
  buildBadge(model: string, provenance: ModelProvenance, latencyMs: number): string {
    if (!model) throw new Error("model required");
    if (!Number.isFinite(latencyMs) || latencyMs < 0) throw new Error("latencyMs must be ≥ 0");
    const tag = this.provenanceTag(provenance);
    return `[${tag}${model} · ${latencyMs}ms]`;
  }

  summary(): UsageSummary {
    const byModel: UsageSummary["byModel"] = {};
    const byProvenance: Record<ModelProvenance, number> = {
      local: 0,
      claude: 0,
      heuristic: 0,
      external: 0,
    };
    for (const r of this.records) {
      byProvenance[r.provenance] = (byProvenance[r.provenance] ?? 0) + 1;
      const bucket = byModel[r.model] ?? { calls: 0, tokensIn: 0, tokensOut: 0, avgLatencyMs: 0 };
      const calls = bucket.calls + 1;
      bucket.avgLatencyMs = round4(bucket.avgLatencyMs + (r.latencyMs - bucket.avgLatencyMs) / calls);
      bucket.calls = calls;
      bucket.tokensIn += r.tokensIn;
      bucket.tokensOut += r.tokensOut;
      byModel[r.model] = bucket;
    }
    return { byModel, byProvenance, totalCalls: this.records.length };
  }

  recent(limit = 20): AttributionRecord[] {
    if (!Number.isInteger(limit) || limit < 0) throw new Error("limit must be ≥ 0 integer");
    return this.records.slice(-limit);
  }

  findByResponseId(responseId: string): AttributionRecord | null {
    if (!responseId) return null;
    for (let i = this.records.length - 1; i >= 0; i -= 1) {
      if (this.records[i].responseId === responseId) return this.records[i];
    }
    return null;
  }

  size(): number {
    return this.records.length;
  }

  clear(): void {
    this.records.length = 0;
  }

  // --- internals ---------------------------------------------------------

  private provenanceTag(p: ModelProvenance): string {
    switch (p) {
      case "local":
        return "🪨 local · ";
      case "claude":
        return "☁ claude · ";
      case "heuristic":
        return "⚙ heuristic · ";
      case "external":
        return "↗ external · ";
    }
  }

  private validate(e: Omit<AttributionRecord, "at"> & { at?: string }): void {
    if (!e.responseId || e.responseId.trim() === "") throw new Error("responseId required");
    if (!e.model || e.model.trim() === "") throw new Error("model required");
    if (!["local", "claude", "heuristic", "external"].includes(e.provenance)) {
      throw new Error("provenance invalid");
    }
    if (!Number.isInteger(e.tokensIn) || e.tokensIn < 0) throw new Error("tokensIn must be non-negative integer");
    if (!Number.isInteger(e.tokensOut) || e.tokensOut < 0) throw new Error("tokensOut must be non-negative integer");
    if (!Number.isFinite(e.latencyMs) || e.latencyMs < 0) throw new Error("latencyMs must be ≥ 0");
  }
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export const modelAttributionEngine = new ModelAttributionEngine();
