/**
 * speedfeed_outcome_* -- calcDispatcher wiring test (OSCAR-SFC-SELFLEARN-WIRE, bravo 2026-06-11)
 * ============================================================================================
 * Wires the orphan SpeedFeedOutcomeFeedbackBridgeEngine (0 dispatcher refs; previously consumed
 * ONLY by SpeedFeedNineAxisOrchestratorEngine) so the SFC self-learning fold-back loop has an
 * external surface: shop-floor ACTUALS -> calibration, plus introspection (stats / recent).
 * Round-tripped THROUGH the dispatcher; seeded via the engine's own capture() (in-process closed loop).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";
import { speedFeedOutcomeFeedbackBridgeEngine } from "../engines/SpeedFeedOutcomeFeedbackBridgeEngine.js";

interface CapturedTool {
  name: string;
  handler: (a: { action: string; params: Record<string, unknown> }) => Promise<unknown>;
}
function createMockServer() {
  const tools: CapturedTool[] = [];
  const server = {
    tool(name: string, _d: string, _s: unknown, handler: CapturedTool["handler"]) {
      tools.push({ name, handler });
    },
  };
  return { server, tools };
}
async function callAction(tool: CapturedTool, action: string, params: Record<string, unknown> = {}) {
  const out = await tool.handler({ action, params });
  const r = out as { content?: Array<{ text: string }> };
  const text = r?.content?.[0]?.text;
  return (text ? JSON.parse(text) : out) as Record<string, unknown>;
}
const { server, tools } = createMockServer();
registerCalcDispatcher(server);
const calc = tools[0];

// capture() reads only ~12 fields; the cast avoids constructing the full NineAxisInput/Result types.
// The assertions below verify REAL fold-back behavior, so this is not a stub seam.
function seed(machine: string, material: string, dia: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal capture() seed (12 read fields)
  const input = { machine: { name: machine }, material: { name: material }, tooling: { tool_diameter_mm: dia } } as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = { mode: "balanced", sfc: { resolved: { iso_group: "P", tool_material: "carbide", operation: "milling", cut_type: "slot" } }, recommendation: { cutting_speed_mpm: 120, feed_per_tooth_mm: 0.05, mrr_cm3min: 30, tool_life_min: 45 } } as any;
  speedFeedOutcomeFeedbackBridgeEngine.capture(input, result);
}

describe("speedfeed_outcome_* -- SFC self-learning fold-back wiring", () => {
  beforeEach(() => speedFeedOutcomeFeedbackBridgeEngine.clear());

  it("stats on empty buffer: records_count 0, actuals_count 0", async () => {
    const r = await callAction(calc, "speedfeed_outcome_stats");
    expect(r.success).toBe(true);
    expect((r.stats as { records_count: number }).records_count).toBe(0);
    expect(r.actuals_count).toBe(0);
  });

  it("record_actuals folds shop-floor actuals onto the most-recent matching prediction (folded:true)", async () => {
    seed("VMC-01", "4140", 10);
    const r = await callAction(calc, "speedfeed_outcome_record_actuals", {
      key: { machine_name: "VMC-01", material_name: "4140", tool_diameter_mm: 10 },
      actuals: { actual_vc_mpm: 115, actual_tool_life_min: 52 },
    });
    expect(r.success).toBe(true);
    expect(r.folded).toBe(true);
    expect(r.actuals_count).toBe(1);
  });

  it("record_actuals with a non-matching key folds nothing (folded:false) -- no fabricated calibration", async () => {
    seed("VMC-01", "4140", 10);
    const r = await callAction(calc, "speedfeed_outcome_record_actuals", {
      key: { machine_name: "VMC-99", material_name: "Ti6Al4V", tool_diameter_mm: 6 },
      actuals: { actual_vc_mpm: 60 },
    });
    expect(r.folded).toBe(false);
    expect(r.actuals_count).toBe(0);
  });

  it("missing key fields -> success:false with a descriptive error (R12, no silent no-op)", async () => {
    const r = await callAction(calc, "speedfeed_outcome_record_actuals", { actuals: { actual_vc_mpm: 100 } });
    expect(r.success).toBe(false);
    expect(String(r.error)).toMatch(/key requires/);
  });

  it("recent returns the seeded record for its key, with the folded override attached", async () => {
    seed("MILL-3", "6061", 8);
    await callAction(calc, "speedfeed_outcome_record_actuals", {
      key: { machine_name: "MILL-3", material_name: "6061", tool_diameter_mm: 8 },
      actuals: { actual_fz_mm: 0.06 },
    });
    const r = await callAction(calc, "speedfeed_outcome_recent", {
      key: { machine_name: "MILL-3", material_name: "6061", tool_diameter_mm: 8 }, limit: 5,
    });
    expect(r.success).toBe(true);
    expect(r.count).toBe(1);
    const rec = (r.records as Array<{ machine_name: string; operator_override: { actual_fz_mm: number } }>)[0];
    expect(rec.machine_name).toBe("MILL-3");
    expect(rec.operator_override.actual_fz_mm).toBeCloseTo(0.06, 6);
  });

  it("stats reflects unique_keys across distinct seeds (introspection is real, not hardcoded)", async () => {
    seed("VMC-01", "4140", 10);
    seed("VMC-02", "304SS", 12);
    seed("VMC-01", "4140", 10); // same key as the first
    const r = await callAction(calc, "speedfeed_outcome_stats");
    expect((r.stats as { records_count: number }).records_count).toBe(3);
    expect((r.stats as { unique_keys: number }).unique_keys).toBe(2);
  });

  it("recent with a non-seeded key returns count 0 (no cross-key leakage)", async () => {
    seed("VMC-01", "4140", 10);
    const r = await callAction(calc, "speedfeed_outcome_recent", {
      key: { machine_name: "NOPE", material_name: "NONE", tool_diameter_mm: 1 },
    });
    expect(r.count ?? 0).toBe(0);
  });

  it("machine_name fallback: capture without machine.name keys under default_3axis_vmc; fold-back matches it (capture-key == fold-key boundary)", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal capture seed with machine.name ABSENT
    const input = { material: { name: "4140" }, tooling: { tool_diameter_mm: 10 } } as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = { mode: "balanced", sfc: { resolved: { iso_group: "P", tool_material: "carbide", operation: "milling", cut_type: "slot" } }, recommendation: { cutting_speed_mpm: 120, feed_per_tooth_mm: 0.05, mrr_cm3min: 30, tool_life_min: 45 } } as any;
    speedFeedOutcomeFeedbackBridgeEngine.capture(input, result);
    const r = await callAction(calc, "speedfeed_outcome_record_actuals", {
      key: { machine_name: "default_3axis_vmc", material_name: "4140", tool_diameter_mm: 10 },
      actuals: { actual_vc_mpm: 118 },
    });
    expect(r.folded).toBe(true);
  });

  it("empty actuals (no finite field) -> success:false (R12 -- a content-free override would inflate the calibration set)", async () => {
    seed("VMC-01", "4140", 10);
    const r = await callAction(calc, "speedfeed_outcome_record_actuals", {
      key: { machine_name: "VMC-01", material_name: "4140", tool_diameter_mm: 10 },
      actuals: {},
    });
    expect(r.success).toBe(false);
    expect(String(r.error)).toMatch(/at least one finite field/);
    const s = await callAction(calc, "speedfeed_outcome_stats");
    expect(s.actuals_count).toBe(0); // nothing folded -> training set NOT inflated
  });
});
