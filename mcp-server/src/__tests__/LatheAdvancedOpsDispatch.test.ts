/**
 * LatheAdvancedOpsDispatch.test.ts -- U-LW-ADV-OPS-WIRE (slot:whiskey, 2026-07-01)
 * ============================================================================
 * Coverage-audit gap #5: LatheAdvancedOperationsEngine had 5 public methods reachable ONLY as
 * in-process calls -- getPolygonTurningParams / getAdvancedThreadingParams / getGroovingParams /
 * getEccentricParams / getContourParams (only getLiveToolingParams was dispatcher-wired). These
 * dispatcher-PARITY tests prove each new prism_turning action returns the SAME result as the direct
 * engine call (a wiring miss / wrong-method-mapping would diverge), and that the schema gate rejects
 * bad input.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { latheAdvancedOperationsEngine } from "../engines/LatheAdvancedOperationsEngine.js";
import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ type: string; text: string }> }>;
}
function makeStubServer() {
  const captured: CapturedTool[] = [];
  return {
    tools: captured,
    tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
      captured.push({ name, description, schema, handler });
    },
  };
}

const eng = latheAdvancedOperationsEngine;

// Reference inputs (parity is robust to input specifics -- both paths use the SAME input).
const polygonIn = { number_of_flats: 6, flat_width_mm: 10, part_diameter_mm: 20, material: "steel" };
const threadIn = { thread_form: "metric", pitch_mm: 1.5, diameter_mm: 20, length_mm: 30 };
const grooveIn = { groove_type: "od_groove", width_mm: 3, depth_mm: 2, diameter_mm: 40, material: "steel" };
const eccentricIn = { offset_mm: 2, diameter_mm: 25, length_mm: 40, material: "steel" };
const contourIn = { profile_type: "convex", roughing_allowance_mm: 0.5, finish_allowance_mm: 0.1, material: "steel" };

describe("U-LW-ADV-OPS-WIRE -- 5 advanced-ops actions round-trip via prism_turning (parity)", () => {
  let handler: CapturedTool["handler"];
  beforeAll(() => {
    const server = makeStubServer();
    registerTurningDispatcher(server as unknown as Parameters<typeof registerTurningDispatcher>[0]);
    const tool = server.tools.find((t) => t.name === "prism_turning");
    if (!tool) throw new Error("prism_turning tool was not registered");
    handler = tool.handler;
  });

  async function invoke(action: string, params: Record<string, unknown>) {
    const res = await handler({ action, params });
    const text = res.content[0]?.text ?? "";
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return { __raw: text };
    }
  }
  const unwrap = (v: Record<string, unknown>) => (v.result ?? v.data ?? v) as Record<string, unknown>;

  it("tool description advertises all 5 advanced-ops actions", () => {
    const server = makeStubServer();
    registerTurningDispatcher(server as unknown as Parameters<typeof registerTurningDispatcher>[0]);
    const tool = server.tools.find((t) => t.name === "prism_turning")!;
    for (const a of [
      "lathe_advanced_polygon",
      "lathe_advanced_threading",
      "lathe_advanced_grooving",
      "lathe_advanced_eccentric",
      "lathe_advanced_contour",
    ]) {
      expect(tool.description).toContain(a);
    }
  });

  it("lathe_advanced_polygon parity (speed_ratio matches direct engine)", async () => {
    const direct = eng.getPolygonTurningParams(polygonIn as Parameters<typeof eng.getPolygonTurningParams>[0]);
    const r = unwrap(await invoke("lathe_advanced_polygon", polygonIn));
    expect(r.speed_ratio).toBe(direct.speed_ratio);
    expect(r.feasible).toBe(direct.feasible);
  });

  it("lathe_advanced_threading parity (total_passes matches direct engine)", async () => {
    const direct = eng.getAdvancedThreadingParams(threadIn as Parameters<typeof eng.getAdvancedThreadingParams>[0]);
    const r = unwrap(await invoke("lathe_advanced_threading", threadIn));
    expect(r.total_passes).toBe(direct.total_passes);
    expect(r.thread_form).toBe(direct.thread_form);
  });

  it("lathe_advanced_grooving parity (tool_width_mm matches direct engine)", async () => {
    const direct = eng.getGroovingParams(grooveIn as Parameters<typeof eng.getGroovingParams>[0]);
    const r = unwrap(await invoke("lathe_advanced_grooving", grooveIn));
    expect(r.tool_width_mm).toBe(direct.tool_width_mm);
    expect(r.groove_type).toBe(direct.groove_type);
  });

  it("lathe_advanced_eccentric parity (method matches direct engine)", async () => {
    const direct = eng.getEccentricParams(eccentricIn as Parameters<typeof eng.getEccentricParams>[0]);
    const r = unwrap(await invoke("lathe_advanced_eccentric", eccentricIn));
    expect(r.method).toBe(direct.method);
  });

  it("lathe_advanced_contour parity (roughing_strategy matches direct engine)", async () => {
    const direct = eng.getContourParams(contourIn as Parameters<typeof eng.getContourParams>[0]);
    const r = unwrap(await invoke("lathe_advanced_contour", contourIn));
    expect(r.roughing_strategy).toBe(direct.roughing_strategy);
    expect(r.profile_type).toBe(direct.profile_type);
  });

  it("schema gate rejects bad input (non-numeric required field)", async () => {
    const res = await invoke("lathe_advanced_polygon", { number_of_flats: "six", flat_width_mm: 10, part_diameter_mm: 20, material: "steel" });
    expect(JSON.stringify(res).toLowerCase()).toMatch(/invalid|number|expected/);
  });

  it("pre-existing lathe_advanced_ops_live_tooling round-trips getLiveToolingParams (was never round-tripped)", async () => {
    const input = { operation: "cross_drilling", live_tool_rpm: 2000, feature_depth_mm: 10 };
    const direct = eng.getLiveToolingParams(input as Parameters<typeof eng.getLiveToolingParams>[0]);
    const r = unwrap(await invoke("lathe_advanced_ops_live_tooling", input));
    const plan = (r.data ?? r) as Record<string, unknown>; // case wraps {success, data}
    expect((plan.recommended_parameters as Record<string, unknown>).feed_mm_rev)
      .toBe(direct.recommended_parameters.feed_mm_rev);
    expect(plan.spindle_mode).toBe(direct.spindle_mode);
  });
});
