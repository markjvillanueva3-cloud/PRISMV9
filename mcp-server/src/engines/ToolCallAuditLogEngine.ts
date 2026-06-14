/**
 * ToolCallAuditLogEngine — HMPI13 append-only tool-call audit ring.
 *
 * Pure-core: appends tool-call audit entries to a bounded ring (FIFO
 * eviction at max_entries), and reports per-tool call counts + failure
 * rate + recent failures for governance dashboards.
 *
 * @module engines/ToolCallAuditLogEngine
 */

import { z } from "zod";

export const ToolCallEntrySchema = z.object({
  at: z.string().min(1),
  tool: z.string().min(1).max(120),
  tenant_id: z.string().min(1).max(120),
  ok: z.boolean(),
  duration_ms: z.number().min(0).max(600_000),
  failure_reason: z.string().max(500).optional(),
});
export type ToolCallEntry = z.infer<typeof ToolCallEntrySchema>;

export interface AuditSummary {
  tool: string;
  total_calls: number;
  ok_calls: number;
  failure_count: number;
  failure_rate: number;
  p95_duration_ms: number;
  recent_failures: ToolCallEntry[];
}

export class ToolCallAuditLogEngine {
  static readonly MAX_ENTRIES_DEFAULT = 10_000;

  static append(ring: ToolCallEntry[], entry: ToolCallEntry, maxEntries: number = ToolCallAuditLogEngine.MAX_ENTRIES_DEFAULT): ToolCallEntry[] {
    if (!Array.isArray(ring)) throw new Error("ToolCallAuditLog.append: ring must be array");
    if (!Number.isInteger(maxEntries) || maxEntries < 1) throw new Error("ToolCallAuditLog.append: maxEntries must be positive integer");
    const v = ToolCallEntrySchema.parse(entry);
    const next = [...ring, v];
    if (next.length > maxEntries) return next.slice(next.length - maxEntries);
    return next;
  }

  static summarize(ring: ToolCallEntry[], tool: string, recent_n: number = 5): AuditSummary {
    if (!Array.isArray(ring)) throw new Error("ToolCallAuditLog.summarize: ring must be array");
    if (typeof tool !== "string" || tool.length === 0) throw new Error("ToolCallAuditLog.summarize: tool required");
    const own = ring.filter((e) => e.tool === tool);
    const ok = own.filter((e) => e.ok).length;
    const fail = own.length - ok;
    const sortedDur = own.map((e) => e.duration_ms).sort((a, b) => a - b);
    const p95Idx = Math.max(0, Math.floor(sortedDur.length * 0.95) - 1);
    const p95 = sortedDur.length ? sortedDur[p95Idx] : 0;
    const recent_failures = own.filter((e) => !e.ok).slice(-recent_n);
    return {
      tool,
      total_calls: own.length,
      ok_calls: ok,
      failure_count: fail,
      failure_rate: own.length ? fail / own.length : 0,
      p95_duration_ms: p95,
      recent_failures,
    };
  }

  static renderSummary(s: AuditSummary): string {
    const pct = (s.failure_rate * 100).toFixed(1);
    return `[AUDIT ${s.tool}] calls=${s.total_calls} ok=${s.ok_calls} fail=${s.failure_count} (${pct}%) p95=${s.p95_duration_ms}ms`;
  }
}

export const toolCallAuditLogEngine = ToolCallAuditLogEngine;
