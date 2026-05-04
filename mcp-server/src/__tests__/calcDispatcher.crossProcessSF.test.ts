/**
 * calcDispatcher.crossProcessSF.test.ts — U-XPROC-SFC-01 dispatcher tests
 *
 * Round-trip tests for the cross-process speed/feed bridge dispatcher actions:
 *   - cross_process_sf_recommend
 *   - cross_process_sf_capabilities
 *
 * @see src/engines/CrossProcessSpeedFeedBridge.ts
 * @see src/tools/dispatchers/calcDispatcher.ts
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{
    content: Array<{ type: string; text: string }>;
  }>;
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

let handler: CapturedTool["handler"];

async function invoke(action: string, params: Record<string, unknown> = {}) {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (!res.content) return res;
  const content = res.content as Array<{ text?: string }>;
  const text = content[0]?.text ?? "";
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { __raw: text } as Record<string, unknown>;
  }
}

beforeAll(() => {
  const server = makeStubServer();
  registerCalcDispatcher(server as unknown as Parameters<typeof registerCalcDispatcher>[0]);
  const tool = server.tools.find((t) => t.name === "prism_calc");
  if (!tool) throw new Error("prism_calc tool not registered");
  handler = tool.handler;
});

describe("calcDispatcher cross-process speed/feed bridge (U-XPROC-SFC-01)", () => {
  describe("cross_process_sf_capabilities", () => {
    it("returns all 3 process capability snapshots in canonical order", async () => {
      const r = await invoke("cross_process_sf_capabilities");
      const caps = r.capabilities as Array<{ process: string }>;
      expect(caps.map((c) => c.process)).toEqual(["mill", "lathe", "wedm"]);
    });
  });

  describe("cross_process_sf_recommend — mill route", () => {
    it("returns rotational outputs for carbide on aluminum", async () => {
      const r = await invoke("cross_process_sf_recommend", {
        process: "mill",
        material: "aluminum",
        tool_material: "Carbide",
        mill_operation: "roughing",
        tool_diameter_mm: 12,
        number_of_teeth: 4,
        material_hardness_hb: 95,
      });
      expect(r.process).toBe("mill");
      expect(r.spindle_rpm).toBeGreaterThan(0);
      expect(r.feed_rate_mm_min).toBeGreaterThan(0);
      expect(r.cutting_speed_m_min).toBeGreaterThan(50);
    });

    it("propagates engine validation errors through the dispatcher", async () => {
      const r = await invoke("cross_process_sf_recommend", {
        process: "mill",
        material: "steel",
        tool_material: "Carbide",
        // missing tool_diameter_mm and number_of_teeth
      });
      expect(r.success).toBe(false);
      expect(String(r.error)).toMatch(/tool_diameter_mm|number_of_teeth/);
    });
  });

  describe("cross_process_sf_recommend — lathe route", () => {
    it("returns turning outputs (rpm + feed_per_rev) for 4140 with iso_group hint", async () => {
      const r = await invoke("cross_process_sf_recommend", {
        process: "lathe",
        material: "4140",
        iso_group: "P",
        lathe_tool_type: "turning_insert",
        lathe_operation: "finishing",
        tool_diameter_mm: 50,
        depth_of_cut_mm: 0.3,
      });
      expect(r.process).toBe("lathe");
      expect(r.cutting_speed_m_min).toBeGreaterThan(50);
      expect(r.spindle_rpm).toBeGreaterThan(0);
      expect(r.feed_per_rev_mm).toBeGreaterThan(0);
    });
  });

  describe("cross_process_sf_recommend — wedm route", () => {
    it("returns thin-band steel pulse/current defaults at 4mm thickness", async () => {
      const r = await invoke("cross_process_sf_recommend", {
        process: "wedm",
        material: "steel",
        workpiece_thickness_mm: 4,
      });
      expect(r.process).toBe("wedm");
      expect(r.pulse_on_us).toBe(2);
      expect(r.pulse_off_us).toBe(10);
      expect(r.current_A).toBe(8);
      expect(r.voltage_V).toBe(60);
      expect(r.predicted_mrr_mm3_min).toBeGreaterThan(0);
    });

    it("propagates wedm material-not-supported error through dispatcher", async () => {
      const r = await invoke("cross_process_sf_recommend", {
        process: "wedm",
        material: "unobtainium",
        workpiece_thickness_mm: 10,
      });
      expect(r.success).toBe(false);
      expect(String(r.error)).toContain("not in default table");
    });
  });

  describe("cross_process_sf_recommend — cross-cutting", () => {
    it("propagates unsupported-process error through dispatcher", async () => {
      const r = await invoke("cross_process_sf_recommend", {
        process: "ultrasonic",
        material: "steel",
      });
      expect(r.success).toBe(false);
      expect(String(r.error)).toContain("unsupported process");
    });
  });
});
