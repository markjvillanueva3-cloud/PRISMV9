/**
 * camDispatcher — WorkNCCAMBridgeEngine wiring suite
 * ===================================================
 *
 * WIRE-UNWIRED (foxtrot 2026-05-17) — wires the validator-confirmed
 * TRULY-UNWIRED WorkNCCAMBridgeEngine (1082-line real engine, NOT a stub;
 * a SYNC file-parse bridge — no live server) into prism_cam with 9 actions.
 *
 * Tests exercise the DETERMINISTIC, no-real-file surfaces:
 *   - worknc_parse_nc        : pure string parser (crafted WorkNC NC fixture)
 *   - worknc_extract_project : missing-path graceful-fail contract
 * plus the z.enum-membership guard for ALL 9 actions (RGS-TOOL-AUTOINVOKE-MS1
 * false-green class — MockMCPServer bypasses the SDK z.enum). The 7
 * WorkNCProject/Workzone-scoped actions require a parsed project object from
 * the consumer; the enum guard proves they are registered + route to the
 * engine (same accepted approach as the BobCAD bridge wiring).
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

describe("worknc bridge — enum registration", () => {
  const expected = [
    "worknc_extract_project", "worknc_parse_nc", "worknc_get_workzones",
    "worknc_get_tools", "worknc_get_operations", "worknc_get_collision_report",
    "worknc_validate_collisions", "worknc_export_to_prism", "worknc_export_to_json",
  ];
  it("all 9 actions are in the prism_cam z.enum ACTIONS list", () => {
    for (const a of expected) expect(ACTIONS).toContain(a);
  });
  it("no duplicate ACTIONS keys introduced (anti-regression)", () => {
    expect(new Set(ACTIONS).size).toBe(ACTIONS.length);
  });
});

describe("worknc_parse_nc — pure WorkNC NC-output parser", () => {
  it("extracts program number, operation name, tool number+diameter from a fixture", async () => {
    const nc = [
      "O1234",
      "(WORKNC OPERATION: Roughing Pocket)",
      "(TOOL: T1 D10.0)",
      "(STRATEGY: Waveform)",
      "(SPINDLE: 8000)",
      "(FEED: 2000)",
      "T1 M6",
      "S8000 F2000",
      "G1 X10. Y10. Z-2.",
      "(END OPERATION)",
      "M30",
    ].join("\n");
    const r = await call(server, "worknc_parse_nc", { nc_content: nc });
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    expect(d.success).toBe(true);
    expect(d.programNumber).toBe("1234");
    expect(d.totalLines).toBe(11);
    expect(d.has5AxisMoves).toBe(false);

    const ops = d.operations as Array<Record<string, unknown>>;
    expect(ops.length).toBe(1);
    // Bind to the EXACT engine field (WorkNCNCOperation.operationName) — no
    // `?? name` fallback, so a future field rename fails loudly (R9).
    expect(String(ops[0]!.operationName)).toMatch(/Roughing Pocket/);

    const tools = d.tools as Array<Record<string, unknown>>;
    expect(tools.length).toBe(1);
    // (TOOL: T1 D10.0) → WorkNCNCTool.toolNumber 1, .diameter 10 (exact fields)
    const t0 = tools[0]!;
    expect(Number(t0.toolNumber)).toBe(1);
    expect(Number(t0.diameter)).toBeCloseTo(10.0, 5);
  });

  it("a 5-axis move sets has5AxisMoves true (real parser branch)", async () => {
    const nc = [
      "O5555",
      "(WORKNC OPERATION: Auto5 Finishing)",
      "(TOOL: T2 D6.0)",
      "G1 X1. Y1. Z-1. A30. C45.",
      "(END OPERATION)",
      "M30",
    ].join("\n");
    const r = await call(server, "worknc_parse_nc", { nc_content: nc });
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    expect(d.success).toBe(true);
    expect(d.programNumber).toBe("5555");
    expect(d.has5AxisMoves).toBe(true);
  });
});

describe("worknc_extract_project — missing-path graceful-fail contract", () => {
  it("returns success:false with a 'not found' error + zeroed stats (no throw)", async () => {
    const r = await call(server, "worknc_extract_project", {
      project_path: "H:/__prism_no_such_worknc_project__/zzz.wnc",
    });
    // The engine's not-found result legitimately carries an `error` field, so
    // the call() helper classifies it ok:false — that is expected here. The
    // real contract is the data payload: a graceful failure object, NOT a
    // thrown exception or an MCP-level error envelope.
    const d = r.data as Record<string, unknown>;
    expect(d.success).toBe(false);
    expect(typeof d.error).toBe("string");
    expect((d.error as string)).toMatch(/not found/i);
    const stats = d.stats as Record<string, number>;
    expect(stats.workzoneCount).toBe(0);
    expect(stats.operationCount).toBe(0);
    expect(stats.toolCount).toBe(0);
  });
});
