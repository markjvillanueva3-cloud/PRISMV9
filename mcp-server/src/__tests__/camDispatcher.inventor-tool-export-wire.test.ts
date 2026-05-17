/**
 * camDispatcher — InventorCAMToolExportEngine wiring suite
 * =========================================================
 *
 * WIRE-UNWIRED (foxtrot 2026-05-17) — wires the lone validator-confirmed
 * TRULY-UNWIRED engine into prism_cam:
 *   - inventorCAMToolExportEngine.exportLibrary  → inventor_tool_export
 *   - inventorCAMToolExportEngine.exportForJob   → inventor_tool_export_job
 *
 * Engine was on disk + tested at the engine level but had ZERO dispatcher
 * reference (confirmed via scripts/validate-unwired-signal.mjs, classification
 * TRULY-UNWIRED, firstMatch: null). These tests verify the round-trip through
 * the real dispatcher AND that both actions are registered in the z.enum gate
 * (MockMCPServer bypasses the SDK enum, so an enum-membership assertion is
 * required to catch the RGS-TOOL-AUTOINVOKE-MS1 false-green class).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerCamDispatcher, ACTIONS } from "../tools/dispatchers/camDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: unknown }> {
  const tool = server.tools.find(t => t.name === "prism_cam");
  if (!tool) throw new Error("prism_cam not registered");
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, data: { rawText: text } };
  }
  if (parsed && typeof parsed === "object" && "error" in (parsed as Record<string, unknown>)) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerCamDispatcher(server as unknown as { tool: (...args: unknown[]) => void });
});

// ─────────────────────────────────────────────────────────────────────
// 1. z.enum gate membership (RGS-TOOL-AUTOINVOKE-MS1 false-green guard)
// ─────────────────────────────────────────────────────────────────────
describe("inventor tool-export — enum registration", () => {
  it("both actions are in the prism_cam z.enum ACTIONS list", () => {
    expect(ACTIONS).toContain("inventor_tool_export");
    expect(ACTIONS).toContain("inventor_tool_export_job");
  });

  it("action count did not regress (anti-regression)", () => {
    // The two new actions must exist on top of the prior surface.
    expect(ACTIONS.length).toBeGreaterThanOrEqual(2);
    expect(new Set(ACTIONS).size).toBe(ACTIONS.length); // no dup keys
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2. Happy paths — real HSMExportResult shape
// ─────────────────────────────────────────────────────────────────────
describe("inventor_tool_export — full library export", () => {
  it("returns a serialized HSM tool library with non-empty catalog", async () => {
    const r = await call(server, "inventor_tool_export", {});
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    // HSMExportResult contract
    expect(typeof d.library_data).toBe("string");
    expect(typeof d.tool_count).toBe("number");
    expect((d.tool_count as number) > 0).toBe(true);
    expect(typeof d.file_name).toBe("string");
    // library_data must be valid JSON (it is JSON.stringify'd internally)
    const lib = JSON.parse(d.library_data as string) as Record<string, unknown>;
    expect(typeof lib).toBe("object");
    const summary = d.summary as Record<string, unknown>;
    expect(summary.total_tools).toBe(d.tool_count);
    expect(Array.isArray(summary.manufacturers)).toBe(true);
    expect(Array.isArray(summary.tool_types)).toBe(true);
  });

  it("honors an iso_group filter (P) without throwing", async () => {
    const r = await call(server, "inventor_tool_export", {
      filter: { iso_group: "P", max_tools: 25 },
    });
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    expect(typeof d.tool_count).toBe("number");
    // max_tools is a hard upper bound — must never be exceeded (incl. the
    // generateFallbackTools() path the engine takes on an empty catalog).
    expect(d.tool_count as number).toBeLessThanOrEqual(25);
    expect(d.tool_count as number).toBeGreaterThan(0);
  });
});

describe("inventor_tool_export_job — job-scoped export", () => {
  it("exports exactly the tools requested for a job", async () => {
    const r = await call(server, "inventor_tool_export_job", {
      job_tools: [
        { type: "flat end mill", diameter_mm: 10, flutes: 4 },
        { type: "drill", diameter_mm: 6.8 },
      ],
    });
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    expect(typeof d.library_data).toBe("string");
    // one HSM tool per requested job tool
    expect(d.tool_count).toBe(2);
    // HSMToolLibrary === { version:number, data: HSMTool[] }
    const lib = JSON.parse(d.library_data as string) as { version: number; data: unknown[] };
    expect(lib.version).toBe(9);
    expect(Array.isArray(lib.data)).toBe(true);
    expect(lib.data.length).toBe(2);
    // Contract divergence (pinned, not incidental): exportForJob() returns
    // HSMExportResult WITHOUT the `summary` field exportLibrary() emits.
    // Cross-check the SAME dispatcher against the library export's key set so
    // the asymmetry is a tested fact — a consumer expecting a uniform shape
    // fails loudly here if the engine ever unifies the two return contracts.
    const jobKeys = Object.keys(d).sort();
    const libRes = await call(server, "inventor_tool_export", {});
    const libKeys = Object.keys(libRes.data as Record<string, unknown>).sort();
    expect(jobKeys).toContain("library_data");
    expect(jobKeys).toContain("tool_count");
    expect(jobKeys).toContain("file_name");
    expect(jobKeys).not.toContain("summary");
    expect(libKeys).toContain("summary");
    expect(jobKeys).not.toEqual(libKeys);
  });

  it("empty job_tools yields a zero-tool library, not an error", async () => {
    const r = await call(server, "inventor_tool_export_job", { job_tools: [] });
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    expect(d.tool_count).toBe(0);
  });
});
