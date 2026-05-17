/**
 * camDispatcher — BobCADCAMBridgeEngine wiring suite
 * ===================================================
 *
 * WIRE-UNWIRED (foxtrot 2026-05-17) — wires the validator-confirmed
 * TRULY-UNWIRED live-CAM bridge into prism_cam (0 prior dispatcher refs;
 * the 40 "bobcad" refs in camDispatcher belong to BobCADStrategyEngine /
 * BobCADFunctionIndexEngine, NOT this bridge). 11 actions mirror the
 * EspritCAMBridge wiring pattern (cam_esprit_*).
 *
 * Tests exercise the DETERMINISTIC, no-I/O surfaces only:
 *   - cam_bobcad_check_version : pure function (minimumVersion V30)
 *   - cam_bobcad_run_simulation / _generate_nc : not-connected guards
 *     (return immediately with errors[]/warnings[] — no network call)
 *   - cam_bobcad_disconnect : best-effort, always resolves
 * plus the z.enum-membership guard (RGS-TOOL-AUTOINVOKE-MS1 false-green
 * class — MockMCPServer bypasses the SDK enum gate).
 * Connect / extract / get_tools / get_operations are intentionally NOT
 * tested here: they reach localhost:18380 and would be flaky in CI.
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
describe("bobcad bridge — enum registration", () => {
  const expected = [
    "cam_bobcad_connect", "cam_bobcad_get_status", "cam_bobcad_disconnect",
    "cam_bobcad_extract_project", "cam_bobcad_get_tools", "cam_bobcad_get_operations",
    "cam_bobcad_run_simulation", "cam_bobcad_generate_nc", "cam_bobcad_push_parameters",
    "cam_bobcad_sync_tools", "cam_bobcad_check_version",
  ];
  it("all 11 actions are in the prism_cam z.enum ACTIONS list", () => {
    for (const a of expected) expect(ACTIONS).toContain(a);
  });
  it("no duplicate keys introduced (anti-regression)", () => {
    expect(new Set(ACTIONS).size).toBe(ACTIONS.length);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2. cam_bobcad_check_version — pure, fully deterministic
// ─────────────────────────────────────────────────────────────────────
describe("cam_bobcad_check_version — version compatibility logic", () => {
  it("V35 is compatible with zero warnings", async () => {
    const r = await call(server, "cam_bobcad_check_version", { version: "V35" });
    expect(r.ok).toBe(true);
    // Exact slimmed-transport shape: the MCP responseSlimmer strips the
    // empty `warnings: []` array (see reference_slimresponse_strips_empty_arrays),
    // so a real consumer sees `warnings` ABSENT when there are none. Pin the
    // full surviving object so this contract is a tested fact.
    expect(r.data).toEqual({
      success: true,
      version: "V35",
      compatible: true,
      minimumVersion: "V30",
      detectedVersion: "V35",
    });
  });

  it("V28 is below minimum → incompatible + below-minimum warning", async () => {
    const r = await call(server, "cam_bobcad_check_version", { version: "V28" });
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    expect(d.compatible).toBe(false);
    const w = d.warnings as string[];
    expect(w.some(x => /below minimum supported version V30/.test(x))).toBe(true);
  });

  it("V31 is compatible but emits the V30-V32 advisory", async () => {
    const r = await call(server, "cam_bobcad_check_version", { version: "V31" });
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    expect(d.compatible).toBe(true);
    const w = d.warnings as string[];
    expect(w.some(x => /V30-V32/.test(x))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 3. not-connected guards — real behavior, no network I/O
// ─────────────────────────────────────────────────────────────────────
describe("bobcad bridge — not-connected guards return loudly, no I/O", () => {
  it("cam_bobcad_generate_nc rejects with explicit 'Not connected' error", async () => {
    const r = await call(server, "cam_bobcad_generate_nc", {
      output_path: "C:/tmp/out.nc",
      post_processor: "fanuc",
    });
    expect(r.ok).toBe(true); // envelope success:true; engine result carries the failure
    const d = (r.data as Record<string, unknown>).nc as Record<string, unknown>;
    expect(d.success).toBe(false);
    expect(d.totalLines).toBe(0);
    expect((d.errors as string[])).toContain("Not connected to BobCAD");
  });

  it("cam_bobcad_run_simulation returns success:false + warning when disconnected", async () => {
    const r = await call(server, "cam_bobcad_run_simulation", { operation_ids: ["op1"] });
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    // `...sim` spreads success:false over the case's success:true (real
    // engine guard). The empty `results: []` is stripped by the transport
    // slimmer; the non-empty `warnings` survives. Pin the exact shape.
    expect(d.success).toBe(false);
    expect(d.results).toBeUndefined(); // empty array stripped at MCP transport
    expect(d.warnings).toEqual(["Not connected to BobCAD"]);
  });

  it("cam_bobcad_disconnect is best-effort and always resolves disconnected:true", async () => {
    const r = await call(server, "cam_bobcad_disconnect", {});
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    expect(d.disconnected).toBe(true);
    expect(typeof d.message).toBe("string");
  });
});
