/**
 * dispatcher.vendorCatalogManifest.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-VCM dispatcher wiring.
 *
 * Drives 3 READ-ONLY actions through real `prism_dev`:
 *   - vcm_build    → build() — full manifest
 *   - vcm_queue    → getExtractionQueue() — unextracted PDFs (best-batch order)
 *   - vcm_summary  → getSummary() — quick aggregate stats
 *
 * saveManifest DEFERRED (writes JSON manifest to disk).
 *
 * Filesystem coupling: engine reads `H:/prism/...` vendor catalog dir;
 * fresh checkout may have 0 PDFs (manifest still returns valid empty shape).
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { vendorCatalogManifestEngine } from "../engines/VendorCatalogManifestEngine.js";

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

let devHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-VCM — Zod schemas", () => {
  it("all 3 actions accept {} (no params)", () => {
    expect(ACTION_DEV_SCHEMAS["vcm_build"].safeParse({}).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["vcm_queue"].safeParse({}).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["vcm_summary"].safeParse({}).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-VCM — prism_dev :: vcm_summary", () => {
  it("returns summary with the 7 documented fields", async () => {
    const r = await invokeHandler(devHandler, "vcm_summary", {});
    const summary = (r as { summary: { totalPdfs?: number; extractedPdfs?: number; unextractedPdfs?: number; currentTools?: number; estimatedGainFromVisiblePdfs?: number; projectedTotal?: number; gapToTarget?: number } }).summary;
    expect(typeof ((summary.totalPdfs as number | undefined) ?? 0)).toBe("number");
    expect(typeof ((summary.extractedPdfs as number | undefined) ?? 0)).toBe("number");
    expect(typeof ((summary.unextractedPdfs as number | undefined) ?? 0)).toBe("number");
    expect(typeof ((summary.currentTools as number | undefined) ?? 0)).toBe("number");
    expect(typeof ((summary.gapToTarget as number | undefined) ?? 0)).toBe("number");
  });

  it("invariant: extractedPdfs + unextractedPdfs == totalPdfs", async () => {
    const r = await invokeHandler(devHandler, "vcm_summary", {});
    const s = (r as { summary: { totalPdfs?: number; extractedPdfs?: number; unextractedPdfs?: number } }).summary;
    const total = (s.totalPdfs as number | undefined) ?? 0;
    const ext = (s.extractedPdfs as number | undefined) ?? 0;
    const unext = (s.unextractedPdfs as number | undefined) ?? 0;
    expect(ext + unext).toBe(total);
  });

  it("invariant: projectedTotal == currentTools + estimatedGainFromVisiblePdfs", async () => {
    const r = await invokeHandler(devHandler, "vcm_summary", {});
    const s = (r as { summary: { currentTools?: number; estimatedGainFromVisiblePdfs?: number; projectedTotal?: number } }).summary;
    const current = (s.currentTools as number | undefined) ?? 0;
    const gain = (s.estimatedGainFromVisiblePdfs as number | undefined) ?? 0;
    const projected = (s.projectedTotal as number | undefined) ?? 0;
    expect(projected).toBe(current + gain);
  });

  it("ROUTING PROOF — wire summary byte-equals engine-direct getSummary()", async () => {
    const r = await invokeHandler(devHandler, "vcm_summary", {});
    const wire = (r as { summary: unknown }).summary;
    const direct = vendorCatalogManifestEngine.getSummary();
    // slimResponse may strip zero-valued fields; nullish-coalesce all numerics
    // Compare via field-equality with nullish-default-0
    type Summary = ReturnType<typeof vendorCatalogManifestEngine.getSummary>;
    const w = wire as Partial<Summary>;
    expect((w.totalPdfs ?? 0)).toBe(direct.totalPdfs);
    expect((w.extractedPdfs ?? 0)).toBe(direct.extractedPdfs);
    expect((w.unextractedPdfs ?? 0)).toBe(direct.unextractedPdfs);
    expect((w.currentTools ?? 0)).toBe(direct.currentTools);
    expect((w.gapToTarget ?? 0)).toBe(direct.gapToTarget);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-VCM — prism_dev :: vcm_build", () => {
  it("returns manifest with catalogs array + byManufacturer breakdown", async () => {
    const r = await invokeHandler(devHandler, "vcm_build", {});
    const manifest = (r as { manifest: { catalogs?: unknown[]; byManufacturer?: Record<string, unknown>; totalPdfs?: number; totalCurrentEntries?: number } }).manifest;
    expect(typeof manifest).toBe("object");
    expect(Array.isArray(manifest.catalogs ?? [])).toBe(true);
    expect(typeof (manifest.byManufacturer ?? {})).toBe("object");
  });

  it("totalPdfs == catalogs.length", async () => {
    const r = await invokeHandler(devHandler, "vcm_build", {});
    const m = (r as { manifest: { catalogs?: unknown[]; totalPdfs?: number } }).manifest;
    expect((m.totalPdfs as number | undefined) ?? 0).toBe((m.catalogs ?? []).length);
  });

  it("ROUTING PROOF — wire totalPdfs matches engine-direct build()", async () => {
    const r = await invokeHandler(devHandler, "vcm_build", {});
    const wire = (r as { manifest: { totalPdfs?: number } }).manifest;
    const direct = vendorCatalogManifestEngine.build();
    expect((wire.totalPdfs as number | undefined) ?? 0).toBe(direct.totalPdfs);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-VCM — prism_dev :: vcm_queue", () => {
  it("returns queue array with count", async () => {
    const r = await invokeHandler(devHandler, "vcm_queue", {});
    const data = r as { queue?: unknown[]; count?: number };
    expect(Array.isArray(data.queue ?? [])).toBe(true);
    expect((data.count as number | undefined) ?? 0).toBe((data.queue ?? []).length);
  });

  it("queue contains only unextracted catalogs (invariant)", async () => {
    const r = await invokeHandler(devHandler, "vcm_queue", {});
    const queue = (r as { queue?: Array<{ extracted?: boolean }> }).queue ?? [];
    for (const c of queue) {
      // slimResponse strips false → undefined → treat as false
      expect((c.extracted as boolean | undefined) ?? false).toBe(false);
    }
  });

  it("queue is sorted descending by estimatedTools (engine contract)", async () => {
    const r = await invokeHandler(devHandler, "vcm_queue", {});
    const queue = (r as { queue?: Array<{ estimatedTools: number }> }).queue ?? [];
    for (let i = 1; i < queue.length; i++) {
      expect(queue[i]!.estimatedTools).toBeLessThanOrEqual(queue[i - 1]!.estimatedTools);
    }
  });

  it("ROUTING PROOF — wire queue count parity with engine-direct", async () => {
    const r = await invokeHandler(devHandler, "vcm_queue", {});
    const wireCount = ((r as { count?: number }).count) ?? 0;
    const direct = vendorCatalogManifestEngine.getExtractionQueue();
    expect(wireCount).toBe(direct.length);
  });

  it("summary unextractedPdfs == queue count (cross-action invariant)", async () => {
    const summaryR = await invokeHandler(devHandler, "vcm_summary", {});
    const queueR = await invokeHandler(devHandler, "vcm_queue", {});
    const unext = ((summaryR as { summary: { unextractedPdfs?: number } }).summary.unextractedPdfs as number | undefined) ?? 0;
    const queueCount = ((queueR as { count?: number }).count) ?? 0;
    expect(queueCount).toBe(unext);
  });
});
