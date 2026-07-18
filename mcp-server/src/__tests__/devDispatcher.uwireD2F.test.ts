/**
 * devDispatcher U-WIRE-D2F round-trip tests -- DesignToFloorPipelineEngine.
 *
 * Validates the 3 new design-to-floor actions wire through prism_dev:
 *   d2f_preflight          -> runPreFlightAnalysis(input)  (physics + safety + MC risk; stores a job)
 *   d2f_job_count          -> getJobCount()                (in-memory job count)
 *   d2f_calibration_state  -> getCalibrationState(material?)(read calibration state)
 *
 * runPreFlightAnalysis is the core: a g-code program in -> Kienzle force / tool
 * deflection / Taylor tool-life / Monte-Carlo risk (fixed seed 42 = deterministic)
 * + safety analysis out, and an in-memory job is stored. It is in-memory (no fs),
 * defaults every optional param, and sources material physics canonically via
 * resolveMaterial (NO inlined constants -- papa wires, never edits physics). The
 * record/submit mutator surfaces and getSPCDashboard/getJobHistory are NOT wired
 * here (they need their own input contracts + job-lifecycle setup).
 *
 * Pattern mirrors the prior WIRE-UNWIRED-PAPA dispatcher tests. The singleton is
 * reset() in beforeEach so job-count assertions are deterministic.
 *
 * Wired slot:papa 2026-06-15 -- WIRE-UNWIRED-PAPA cross-galaxy v2
 * (galaxy:foxtrot/golf engine wired into prism_dev, papa's home dispatcher).
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-D2F
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { designToFloorPipelineEngine } from "../engines/DesignToFloorPipelineEngine.js";

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
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string; action: string; dispatcher: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed) &&
      ("engine_error" in parsed || ("error" in parsed && !("success" in parsed)))) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

const GCODE = [
  "O0001 (D2F TEST)",
  "G21 G90 G54",
  "G0 X0 Y0 Z5.",
  "S3000 M3",
  "G1 Z-1. F200",
  "G1 X50. F400",
  "G0 Z25.",
  "M30",
].join("\n");

const RISK_LEVELS = ["low", "medium", "high", "critical"];

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerDevDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
  designToFloorPipelineEngine.reset(); // deterministic job counter
});

// -- Engine-direct contract + physics reference behavior ---------------------
describe("U-WIRE-D2F -- runPreFlightAnalysis contract", () => {
  it("produces real physics + safety + risk and stores a job", () => {
    expect(designToFloorPipelineEngine.getJobCount()).toBe(0);
    const r = designToFloorPipelineEngine.runPreFlightAnalysis({ gcode: GCODE, mc_samples: 64 });
    expect(r.job_id).toMatch(/^D2F-\d{4}$/);
    expect(r.block_count).toBeGreaterThan(0);
    expect(r.simulation.cutting_force_N).toBeGreaterThan(0);   // Kienzle ran (not a stub returning 0)
    expect(r.simulation.tool_life_min).toBeGreaterThan(0);     // Taylor ran
    expect(typeof r.safety.pass).toBe("boolean");
    expect(RISK_LEVELS).toContain(r.risk.overall_risk);
    expect(r.recommendations.length).toBeGreaterThan(0);
    expect(designToFloorPipelineEngine.getJobCount()).toBe(1); // job stored
  });

  it("defaults the material to steel_1045 when omitted", () => {
    const r = designToFloorPipelineEngine.runPreFlightAnalysis({ gcode: GCODE, mc_samples: 16 });
    expect(r.context.material).toBe("steel_1045");
  });

  it("increments the job counter across runs with distinct ids", () => {
    const a = designToFloorPipelineEngine.runPreFlightAnalysis({ gcode: GCODE, mc_samples: 16 });
    const b = designToFloorPipelineEngine.runPreFlightAnalysis({ gcode: GCODE, mc_samples: 16 });
    expect(a.job_id).not.toBe(b.job_id);
    expect(designToFloorPipelineEngine.getJobCount()).toBe(2);
  });

  it("getCalibrationState() returns an object (empty after reset)", () => {
    expect(designToFloorPipelineEngine.getCalibrationState()).toEqual({});
  });
});

// -- LIVE round-trip through prism_dev (the wire proof) -----------------------
describe("U-WIRE-D2F -- dispatcher round-trip (prism_dev)", () => {
  it("d2f_preflight returns the analysis through the dispatcher", async () => {
    const r = await call(server, "d2f_preflight", { gcode: GCODE, mc_samples: 64 });
    expect(r.ok).toBe(true);
    expect(r.data.job_id as string).toMatch(/^D2F-\d{4}$/);
    expect(typeof r.data.block_count).toBe("number");
    expect((r.data.simulation as { cutting_force_N: number }).cutting_force_N).toBeGreaterThan(0);
    expect(RISK_LEVELS).toContain((r.data.risk as { overall_risk: string }).overall_risk);
  });

  it("d2f_job_count reflects the stored jobs after a preflight", async () => {
    await call(server, "d2f_preflight", { gcode: GCODE, mc_samples: 16 });
    const r = await call(server, "d2f_job_count", {});
    expect(r.ok).toBe(true);
    expect(r.data.job_count).toBe(1);
  });

  it("d2f_calibration_state returns the (empty, post-reset) calibration map through the dispatcher", async () => {
    const r = await call(server, "d2f_calibration_state", {});
    expect(r.ok).toBe(true);
    expect(r.data.calibration).toEqual({}); // post-reset: no calibration state; empty objects survive slimResponse
  });

  it("all 3 d2f_* actions are accepted by the registered dispatcher", async () => {
    const calls: Array<[string, Record<string, unknown>]> = [
      ["d2f_preflight", { gcode: GCODE, mc_samples: 16 }],
      ["d2f_job_count", {}],
      ["d2f_calibration_state", {}],
    ];
    for (const [action, params] of calls) {
      const r = await call(server, action, params);
      expect(r.ok, `${action} should succeed`).toBe(true);
    }
  });
});

// -- Schema validation through the dispatcher (adversarial) -------------------
describe("U-WIRE-D2F -- schema rejection (prism_dev)", () => {
  it("d2f_preflight rejects a missing gcode", async () => {
    const r = await call(server, "d2f_preflight", { material: "steel_1045" });
    expect(r.ok).toBe(false);
  });

  it("d2f_preflight rejects an empty gcode (min 1)", async () => {
    const r = await call(server, "d2f_preflight", { gcode: "" });
    expect(r.ok).toBe(false);
  });

  it("d2f_preflight rejects a non-positive tool_diameter_mm", async () => {
    const r = await call(server, "d2f_preflight", { gcode: GCODE, tool_diameter_mm: -5 });
    expect(r.ok).toBe(false);
  });
});
