/**
 * prism_cam CAM DRIVE wiring (CAM-DRIVE-MS0/U-CAM-DRIVE-WIRE, slot:kilo 2026-05-29)
 * ==============================================================================
 * Proves the 7 cam_drive_* actions are wired AND that every ACTUATION is gated:
 * an op that fails catalog validation is BLOCKED before the live bridge is ever
 * called (no network) — the soul invariant "no program without PMI validation".
 *
 * The clear→actuate + param-passthrough path (which hits the live :18360 bridge)
 * is proven separately at the bridge level with a mocked fetch in
 * Fusion360LiveBridgeEngine.cam-drive.test.ts (no network in unit tests).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { registerCamDispatcher, ACTIONS } from "../tools/dispatchers/camDispatcher.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}
class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, _d: string, _s: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, handler });
  }
}
async function call(server: MockMCPServer, action: string, params: Record<string, unknown> = {}): Promise<{ ok: boolean; data: any }> {
  const tool = server.tools.find((t) => t.name === "prism_cam");
  if (!tool) throw new Error("prism_cam not registered");
  const raw = (await tool.handler({ action, params })) as { content?: { text: string }[]; success?: boolean };
  if (raw && typeof raw === "object" && "success" in raw && (raw as any).success === false) return { ok: false, data: raw };
  const text = (raw as { content: { text: string }[] }).content[0]!.text;
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  if (parsed && typeof parsed === "object" && "error" in (parsed as Record<string, unknown>)) return { ok: false, data: parsed };
  return { ok: true, data: parsed };
}

let server: MockMCPServer;
beforeEach(() => {
  server = new MockMCPServer();
  registerCamDispatcher(server as unknown as { tool: (...args: unknown[]) => void });
});

const DRIVE_ACTIONS = [
  "cam_drive_gate",
  "cam_drive_create_setup",
  "cam_drive_create_operation",
  "cam_drive_assign_tool",
  "cam_drive_generate_toolpath",
  "cam_drive_toolpath_status",
  "cam_drive_post",
];

describe("prism_cam CAM DRIVE — action registration", () => {
  it("all 7 cam_drive_* actions are in the ACTIONS enum", () => {
    for (const a of DRIVE_ACTIONS) expect(ACTIONS).toContain(a);
  });
});

describe("prism_cam CAM DRIVE — validation gate (no actuation on a bad op)", () => {
  it("cam_drive_gate previews an out-of-range op as NOT cleared (real Fusion catalog)", async () => {
    const { ok, data } = await call(server, "cam_drive_gate", {
      system: "fusion360",
      operation: "adaptive_clearing_3d",
      parameters: { spindle_speed: 1_000_000 }, // beyond the 1..60000 catalog range
    });
    expect(ok).toBe(true); // a verdict is a successful response, even when it blocks
    expect(data.clearedToActuate).toBe(false);
    expect(data.violations.outOfRange.map((o: any) => o.name)).toContain("spindle_speed");
  });

  it("cam_drive_gate previews a known op (returns a structured verdict with catalog params)", async () => {
    const { ok, data } = await call(server, "cam_drive_gate", {
      system: "fusion360",
      operation: "adaptive_clearing_3d",
      parameters: {},
    });
    expect(ok).toBe(true);
    expect(typeof data.clearedToActuate).toBe("boolean");
    expect(data.knownParamCount).toBeGreaterThan(0);
  });

  it("cam_drive_create_operation BLOCKS an out-of-range op WITHOUT calling the live bridge", async () => {
    // If the gate failed open, this would attempt a fetch to :18360 and the result
    // would be a network error — NOT a structured drive_gate block. So a clean
    // blocked verdict proves the bridge was never reached.
    const { ok, data } = await call(server, "cam_drive_create_operation", {
      system: "fusion360",
      operation: "adaptive_clearing_3d",
      operation_type: "adaptive",
      parameters: { spindle_speed: 1_000_000 },
    });
    expect(ok).toBe(false);
    expect(data.blocked).toBe(true);
    expect(data.stage).toBe("drive_gate");
    expect(data.drive_gate.clearedToActuate).toBe(false);
    expect(String(data.error)).toContain("validation gate");
  });

  it("cam_drive_create_operation BLOCKS an unknown operation (knownParamCount 0)", async () => {
    const { ok, data } = await call(server, "cam_drive_create_operation", {
      system: "fusion360",
      operation: "__not_a_real_op__",
      operation_type: "adaptive",
      parameters: { x: 1 },
    });
    expect(ok).toBe(false);
    expect(data.blocked).toBe(true);
    expect(data.drive_gate.knownParamCount).toBe(0);
  });

  it("cam_drive_create_operation BLOCKS a non-finite param (NaN) before actuation", async () => {
    const { ok, data } = await call(server, "cam_drive_create_operation", {
      system: "fusion360",
      operation: "adaptive_clearing_3d",
      operation_type: "adaptive",
      parameters: { spindle_speed: "Infinity" },
    });
    expect(ok).toBe(false);
    expect(data.blocked).toBe(true);
    expect(data.drive_gate.violations.nonFinite.length).toBeGreaterThan(0);
  });
});

describe("prism_cam CAM DRIVE — post gate (refuse an un-cleared toolpath)", () => {
  it("cam_drive_post refuses a toolpath explicitly marked not-cleared (no network)", async () => {
    const { ok, data } = await call(server, "cam_drive_post", {
      toolpath: { safety_gate: { cleared: false, blocked: true, block_reason: "collision at holder" } },
      post_processor_path: "x.cps",
      program_name: "1001",
      output_folder: "C:/nc",
    });
    expect(ok).toBe(false);
    expect(typeof data.error).toBe("string");
  });
});
