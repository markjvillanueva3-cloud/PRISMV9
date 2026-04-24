/**
 * BobCAD dispatcher round-trip — CAM-EXHAUST-MS0/U-CAM55
 *
 * Verifies all 10 actions wire through camDispatcher and the zod schemas
 * accept/reject correctly.
 */
import { describe, it, expect, beforeAll } from "vitest";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{
    content: Array<{ type: string; text: string }>;
  }>;
}

function makeStub() {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name: string, _d: string, _s: unknown, handler: CapturedTool["handler"]) {
      tools.push({ name, handler });
    },
  };
}

let dispatchCam: CapturedTool["handler"];

beforeAll(async () => {
  const { registerCamDispatcher } = await import(
    "../tools/dispatchers/camDispatcher.js"
  );
  const stub = makeStub();
  registerCamDispatcher(stub as any);
  const tool = stub.tools.find((t) => t.name === "prism_cam");
  if (!tool) throw new Error("prism_cam not registered");
  dispatchCam = tool.handler;
});

async function invoke(action: string, params: Record<string, unknown> = {}) {
  const res: any = await dispatchCam({ action, params });
  if (res && Array.isArray(res.content) && res.content[0]?.text) {
    try {
      return JSON.parse(res.content[0].text);
    } catch {
      return { __raw: res.content[0].text };
    }
  }
  return res;
}

describe("BobCAD dispatcher round-trip", () => {
  it("bobcad_summary → 9 ops / 88 params / 8 categories", async () => {
    const r = await invoke("bobcad_summary");
    expect(r.total_operations).toBe(9);
    expect(r.total_parameters).toBe(88);
    expect(r.categories).toHaveLength(8);
    expect(r.system_id).toBe("bobcad-cam");
  });

  it("bobcad_index returns full catalog", async () => {
    const r = await invoke("bobcad_index");
    expect(Object.keys(r.operations)).toHaveLength(9);
  });

  it("bobcad_list_ops → 9 entries", async () => {
    const r = await invoke("bobcad_list_ops");
    expect(Array.isArray(r)).toBe(true);
    expect(r).toHaveLength(9);
  });

  it("bobcad_get_op('mill_dynamic_pocket') resolves engagement defaults", async () => {
    const r = await invoke("bobcad_get_op", { operation_id: "mill_dynamic_pocket" });
    expect(r.parameters.engagement.max_radial_engagement_pct.default).toBe(12);
  });

  it("bobcad_by_category('lathe_2_axis') returns rough + thread (2 ops)", async () => {
    const r = await invoke("bobcad_by_category", { category: "lathe_2_axis" });
    expect(r).toHaveLength(2);
  });

  it("bobcad_find_param('rtcp_mode') hits mill_4_5axis_simul exactly once", async () => {
    const r = await invoke("bobcad_find_param", { parameter_name: "rtcp_mode" });
    expect(r).toHaveLength(1);
    expect(r[0].operation_id).toBe("mill_4_5axis_simul");
  });

  it("bobcad_recommend({intent:'wedm_taper'}) → wedm_4axis_taper / WEDM Pro", async () => {
    const r = await invoke("bobcad_recommend", { intent: "wedm_taper" });
    expect(r.primary).toBe("wedm_4axis_taper");
    expect(r.required_tier).toBe("WEDM Pro");
  });

  it("bobcad_tier_for_op('mill_4_5axis_simul') → Mill Premium", async () => {
    const r = await invoke("bobcad_tier_for_op", { operation_id: "mill_4_5axis_simul" });
    expect(r.required_tier).toBe("Mill Premium");
  });

  it("bobcad_dynamic_motion_envelope → 12% radial / 2×D / smooth arcs", async () => {
    const r = await invoke("bobcad_dynamic_motion_envelope");
    expect(r.max_radial_engagement_pct).toBe(12);
    expect(r.max_axial_doc_to_dia).toBe(2);
    expect(r.smooth_arcs_required).toBe(true);
  });

  it("bobcad_wedm_lead_strategy({visibility:'cosmetic'}) → arc", async () => {
    const r = await invoke("bobcad_wedm_lead_strategy", { visibility: "cosmetic" });
    expect(r.lead_in_mode).toBe("arc");
  });

  it("bobcad_wedm_lead_strategy({visibility:'hidden'}) → perpendicular", async () => {
    const r = await invoke("bobcad_wedm_lead_strategy", { visibility: "hidden" });
    expect(r.lead_in_mode).toBe("perpendicular");
  });

  it("[SCHEMA] bobcad_recommend rejects invalid intent enum", async () => {
    const r = await invoke("bobcad_recommend", { intent: "not_a_real_intent" });
    // schema rejection surfaces as content[0].text: "Validation error..." or thrown
    expect(JSON.stringify(r).toLowerCase()).toMatch(/error|invalid|enum/);
  });

  it("[SCHEMA] bobcad_wedm_lead_strategy rejects invalid visibility", async () => {
    const r = await invoke("bobcad_wedm_lead_strategy", { visibility: "rainbow" });
    expect(JSON.stringify(r).toLowerCase()).toMatch(/error|invalid|enum/);
  });
});
