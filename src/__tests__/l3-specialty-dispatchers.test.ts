/**
 * L3-P1-MS1: 6 PASS2 Specialty Dispatchers — registration + action routing tests
 */
import { describe, it, expect } from "vitest";
import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";
import { registerFiveAxisDispatcher } from "../tools/dispatchers/fiveAxisDispatcher.js";
import { registerEdmDispatcher } from "../tools/dispatchers/edmDispatcher.js";
import { registerGrindingDispatcher } from "../tools/dispatchers/grindingDispatcher.js";
import { registerIndustryDispatcher } from "../tools/dispatchers/industryDispatcher.js";
import { registerAutomationDispatcher } from "../tools/dispatchers/automationDispatcher.js";

interface CapturedTool {
  name: string;
  handler: (args: any) => Promise<any>;
}

function createMockServer(): { server: any; tools: CapturedTool[] } {
  const tools: CapturedTool[] = [];
  return {
    server: { tool(name: string, _desc: string, _schema: any, handler: any) { tools.push({ name, handler }); } },
    tools,
  };
}

async function callAction(tool: CapturedTool, action: string, params: Record<string, any> = {}): Promise<any> {
  const result = await tool.handler({ action, params });
  const text = result?.content?.[0]?.text;
  return text ? JSON.parse(text) : result;
}

// ============================================================================
// prism_turning (6 actions) — SAFETY CRITICAL
// ============================================================================
describe("prism_turning dispatcher", () => {
  const { server, tools } = createMockServer();
  registerTurningDispatcher(server);
  const turning = tools[0];

  it("registers as prism_turning", () => {
    expect(turning.name).toBe("prism_turning");
  });

  it("chuck_force routes to engine", async () => {
    const r = await callAction(turning, "chuck_force", { workpiece_diameter_mm: 50, spindle_rpm: 3000 });
    expect(r).toBeDefined();
  });

  it("tailstock routes to engine", async () => {
    const r = await callAction(turning, "tailstock", { workpiece_length_mm: 300, workpiece_diameter_mm: 40 });
    expect(r).toBeDefined();
  });

  it("thread_single_point routes to engine", async () => {
    const r = await callAction(turning, "thread_single_point", { pitch_mm: 1.5, major_diameter_mm: 20 });
    expect(r).toBeDefined();
  });
});

// ============================================================================
// prism_5axis (5 actions) — SAFETY CRITICAL
// ============================================================================
describe("prism_5axis dispatcher", () => {
  const { server, tools } = createMockServer();
  registerFiveAxisDispatcher(server);
  const axis5 = tools[0];

  it("registers as prism_5axis", () => {
    expect(axis5.name).toBe("prism_5axis");
  });

  it("rtcp_calc routes to engine", async () => {
    const r = await callAction(axis5, "rtcp_calc", { tool_length: 150, pivot_distance: 200 });
    expect(r).toBeDefined();
  });

  it("singularity_check routes to engine", async () => {
    const r = await callAction(axis5, "singularity_check", { A_angle_deg: 0, C_angle_deg: 45 });
    expect(r).toBeDefined();
  });

  it("work_envelope routes to engine", async () => {
    const r = await callAction(axis5, "work_envelope", { X_mm: 200, Y_mm: 150, Z_mm: 100 });
    expect(r).toBeDefined();
  });
});

// ============================================================================
// prism_edm (4 actions)
// ============================================================================
describe("prism_edm dispatcher", () => {
  const { server, tools } = createMockServer();
  registerEdmDispatcher(server);
  const edm = tools[0];

  it("registers as prism_edm", () => {
    expect(edm.name).toBe("prism_edm");
  });

  it("electrode_design routes to engine", async () => {
    const r = await callAction(edm, "electrode_design", { cavity_depth_mm: 15, material: "graphite" });
    expect(r).toBeDefined();
  });

  it("wire_settings routes to engine", async () => {
    const r = await callAction(edm, "wire_settings", { material: "steel", thickness_mm: 25 });
    expect(r).toBeDefined();
  });

  it("micro_edm routes to engine", async () => {
    const r = await callAction(edm, "micro_edm", { feature_size_um: 50 });
    expect(r).toBeDefined();
  });
});

// ============================================================================
// prism_grinding (4 actions)
// ============================================================================
describe("prism_grinding dispatcher", () => {
  const { server, tools } = createMockServer();
  registerGrindingDispatcher(server);
  const grinding = tools[0];

  it("registers as prism_grinding", () => {
    expect(grinding.name).toBe("prism_grinding");
  });

  it("wheel_select recommends specification", async () => {
    const r = await callAction(grinding, "wheel_select", {
      material: "hardened steel", hardness_hrc: 62, target_Ra_um: 0.3,
    });
    expect(r.abrasive_type).toBe("cbn");
    expect(r.grit_size).toBe(120);
    expect(r.wheel_specification).toBeDefined();
  });

  it("burn_threshold assesses risk", async () => {
    const r = await callAction(grinding, "burn_threshold", {
      specific_energy_J_mm3: 50, stock_removal_mm3_s: 12, coolant: "flood",
    });
    expect(r.grinding_power_W).toBe(600);
    expect(r.burn_risk_ratio).toBeGreaterThan(0);
    expect(r.severity).toBeDefined();
  });

  it("surface_integrity evaluates quality", async () => {
    const r = await callAction(grinding, "surface_integrity", {
      Ra_um: 0.3, residual_stress_MPa: -250, burn_detected: false,
    });
    expect(r.stress_type).toBe("compressive");
    expect(r.integrity_grade).toBe("acceptable");
  });
});

// ============================================================================
// prism_industry (4 actions)
// ============================================================================
describe("prism_industry dispatcher", () => {
  const { server, tools } = createMockServer();
  registerIndustryDispatcher(server);
  const industry = tools[0];

  it("registers as prism_industry", () => {
    expect(industry.name).toBe("prism_industry");
  });

  it("aerospace_check validates AS9100", async () => {
    const r = await callAction(industry, "aerospace_check", {
      material_cert: true, fai_complete: true, nadcap_approved: true,
      surface_verified: true, cmm_complete: true,
    });
    expect(r.standard).toContain("AS9100");
    expect(r.compliant).toBe(true);
  });

  it("medical_check validates ISO 13485", async () => {
    const r = await callAction(industry, "medical_check", {
      biocompat_tested: false, lot_traceable: true,
    });
    expect(r.standard).toContain("13485");
    expect(r.compliant).toBe(false);
  });

  it("automotive_check validates IATF", async () => {
    const r = await callAction(industry, "automotive_check", {
      ppap_level: 3, control_plan: true, msa_complete: true,
      cpk: 1.67, fmea_complete: true,
    });
    expect(r.standard).toContain("IATF");
    expect(r.compliant).toBe(true);
  });
});

// ============================================================================
// prism_automation (5 actions)
// ============================================================================
describe("prism_automation dispatcher", () => {
  const { server, tools } = createMockServer();
  registerAutomationDispatcher(server);
  const auto = tools[0];

  it("registers as prism_automation", () => {
    expect(auto.name).toBe("prism_automation");
  });

  it("oee_calc routes to engine", async () => {
    const r = await callAction(auto, "oee_calc", { availability: 0.9, performance: 0.85, quality: 0.99 });
    expect(r).toBeDefined();
  });

  it("bottleneck routes to engine", async () => {
    const r = await callAction(auto, "bottleneck", { work_centers: [] });
    expect(r).toBeDefined();
  });

  it("shift_handoff routes to engine", async () => {
    const r = await callAction(auto, "shift_handoff", { shift: "day", operator: "J. Smith" });
    expect(r).toBeDefined();
  });
});
