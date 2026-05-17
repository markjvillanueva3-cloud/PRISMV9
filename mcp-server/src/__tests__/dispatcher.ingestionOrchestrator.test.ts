/**
 * dispatcher.ingestionOrchestrator.test.ts — round-trip integration coverage
 * for WIRE-UNWIRED-MS0/U-WIRE-INGEST dispatcher wiring.
 *
 * Drives 2 read-only observability actions through the real `prism_infra`:
 *   - ingestion_stats        → IngestionOrchestratorEngine.getStats
 *   - ingestion_get_failed   → IngestionOrchestratorEngine.getFailedRecords
 *
 * Verifies (a) Zod schemas resolve action params correctly through the real
 * validateActionParams gate, and (b) calls reach the engine and produce real
 * shapes (stats object + failed array wrapper).
 *
 * processBatch + routeFile are intentionally NOT wired here — they need the
 * full ScannedFile schema and ideally pair with FolderScannerEngine wiring.
 * Deferred to a follow-up unit.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerInfraDispatcher } from "../tools/dispatchers/infraDispatcher.js";
import { ACTION_INFRA_SCHEMAS } from "../schemas/infraActionSchemas.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer(): {
  tools: CapturedTool[];
  tool: (name: string, desc: string, schema: unknown, h: CapturedTool["handler"]) => void;
} {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name, _desc, _schema, handler) { tools.push({ name, handler }); },
  };
}

async function invokeHandler(
  handler: CapturedTool["handler"],
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (Array.isArray((res as { content?: unknown[] }).content)) {
    const text = ((res as { content: Array<{ text?: string }> }).content[0]?.text) ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res;
}

let infraHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerInfraDispatcher(srv as unknown as Parameters<typeof registerInfraDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_infra");
  if (!t) throw new Error("prism_infra not registered");
  infraHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-INGEST — Zod schema behavior", () => {
  it("ingestion_stats schema accepts {} and returns parsed empty object", () => {
    const s = ACTION_INFRA_SCHEMAS["ingestion_stats"];
    const r = s.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).toEqual({});
    }
  });

  it("ingestion_get_failed schema accepts {} and returns parsed empty object", () => {
    const s = ACTION_INFRA_SCHEMAS["ingestion_get_failed"];
    const r = s.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).toEqual({});
    }
  });

  it("ingestion_stats schema strips unknown keys (strict z.object default)", () => {
    const s = ACTION_INFRA_SCHEMAS["ingestion_stats"];
    const r = s.safeParse({ unknown_key: "should_be_stripped" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).toEqual({});
      expect("unknown_key" in (r.data as object)).toBe(false);
    }
  });

  it("ingestion_get_failed schema strips unknown keys (strict z.object default)", () => {
    const s = ACTION_INFRA_SCHEMAS["ingestion_get_failed"];
    const r = s.safeParse({ unknown_key: "should_be_stripped" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).toEqual({});
      expect("unknown_key" in (r.data as object)).toBe(false);
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-INGEST — prism_infra :: ingestion_stats", () => {
  it("returns IngestionState.stats shape with string last_run_at", async () => {
    const r = await invokeHandler(infraHandler, "ingestion_stats", {});
    // Engine returns getStats() output directly → top-level fields:
    //   total, pending, processing, complete, failed, skipped, last_run_at
    // last_run_at is always present (string, may be empty for fresh state).
    const data = r as {
      total?: number;
      pending?: number;
      processing?: number;
      complete?: number;
      failed?: number;
      skipped?: number;
      last_run_at?: string;
    };
    // ROUTING PROOF: only the real engine produces a `last_run_at` string field.
    // A failed call (validation error / unknown action) would return
    // {success:false, error, action:"ingestion_stats", dispatcher:"prism_infra"}.
    expect(typeof data.last_run_at).toBe("string");
    expect("success" in data).toBe(false);
    expect("error" in data).toBe(false);
    // Numeric stats: if present, must be non-negative integers.
    // (slimResponse may strip zeros — that's the expected wire-shrink behavior.)
    for (const key of ["total", "pending", "processing", "complete", "failed", "skipped"] as const) {
      const v = data[key];
      if (v !== undefined) {
        expect(typeof v).toBe("number");
        expect(v).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(v)).toBe(true);
      }
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-INGEST — prism_infra :: ingestion_get_failed", () => {
  it("returns {failed: Array} envelope and all records carry status==='failed'", async () => {
    const r = await invokeHandler(infraHandler, "ingestion_get_failed", {});
    // ROUTING PROOF: dispatcher wraps engine's IngestionRecord[] as {failed:[...]}
    // — a failed call would return {success:false, error, action, dispatcher}.
    const data = r as { failed?: Array<{ file_path?: string; status?: string }> };
    expect("success" in data).toBe(false);
    expect("error" in data).toBe(false);
    // failed[] may be stripped by slimResponse if empty (inverse-check pattern).
    if (data.failed !== undefined) {
      expect(Array.isArray(data.failed)).toBe(true);
      // Every record must have status === "failed" — engine semantics.
      for (const rec of data.failed) {
        expect(rec).not.toBeNull();
        expect(typeof rec).toBe("object");
        expect(rec.status).toBe("failed");
        expect(typeof rec.file_path).toBe("string");
      }
    }
  });
});
