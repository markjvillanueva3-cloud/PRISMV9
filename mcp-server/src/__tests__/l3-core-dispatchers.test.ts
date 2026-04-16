/**
 * L3-P0-MS1: 6 Core New Dispatchers + 12 actions on existing dispatchers
 * Tests dispatcher registration, action routing, and basic response shapes.
 */
import { describe, it, expect } from "vitest";

// Import dispatcher registration functions to verify they exist and are callable
import { registerCadDispatcher } from "../tools/dispatchers/cadDispatcher.js";
import { registerCamDispatcher } from "../tools/dispatchers/camDispatcher.js";
import { registerQualityDispatcher } from "../tools/dispatchers/qualityDispatcher.js";
import { registerSchedulingDispatcher } from "../tools/dispatchers/schedulingDispatcher.js";
import { registerAuthDispatcher } from "../tools/dispatchers/authDispatcher.js";
import { registerExportDispatcher } from "../tools/dispatchers/exportDispatcher.js";

// ============================================================================
// HELPER: Mock MCP server that captures tool registrations
// ============================================================================
interface CapturedTool {
  name: string;
  description: string;
  schema: any;
  handler: (args: any) => Promise<any>;
}

function createMockServer(): { server: any; tools: CapturedTool[] } {
  const tools: CapturedTool[] = [];
  const server = {
    tool(name: string, description: string, schema: any, handler: any) {
      tools.push({ name, description, schema, handler });
    },
  };
  return { server, tools };
}

async function callAction(tool: CapturedTool, action: string, params: Record<string, any> = {}): Promise<any> {
  const result = await tool.handler({ action, params });
  const text = result?.content?.[0]?.text;
  return text ? JSON.parse(text) : result;
}

// ============================================================================
// prism_cad (10 actions)
// ============================================================================
describe("prism_cad dispatcher", () => {
  const { server, tools } = createMockServer();
  registerCadDispatcher(server);
  const cad = tools[0];

  it("registers as prism_cad", () => {
    expect(cad.name).toBe("prism_cad");
  });

  it("geometry_create returns result", async () => {
    const r = await callAction(cad, "geometry_create", { type: "box", width: 100, height: 50, depth: 30 });
    expect(r).toBeDefined();
    expect(r.error).toBeUndefined();
  });

  it("mesh_generate returns result", async () => {
    const r = await callAction(cad, "mesh_generate", { element_size_mm: 2.0 });
    expect(r).toBeDefined();
  });

  it("feature_recognize returns result", async () => {
    const r = await callAction(cad, "feature_recognize", { geometry_id: "g1" });
    expect(r).toBeDefined();
  });

  it("wcs_setup returns result", async () => {
    const r = await callAction(cad, "wcs_setup", { origin: [0, 0, 0], rotation: 0 });
    expect(r).toBeDefined();
  });
});

// ============================================================================
// prism_cam (9 actions)
// ============================================================================
describe("prism_cam dispatcher", () => {
  const { server, tools } = createMockServer();
  registerCamDispatcher(server);
  const cam = tools[0];

  it("registers as prism_cam", () => {
    expect(cam.name).toBe("prism_cam");
  });

  it("toolpath_generate returns result", async () => {
    const r = await callAction(cam, "toolpath_generate", { strategy: "adaptive", tool_diameter: 12 });
    expect(r).toBeDefined();
  });

  it("post_process returns result", async () => {
    const r = await callAction(cam, "post_process", { controller: "fanuc" });
    expect(r).toBeDefined();
  });

  it("collision_check_full returns result", async () => {
    const r = await callAction(cam, "collision_check_full", { toolpath_id: "tp1" });
    expect(r).toBeDefined();
  });

  it("fixture_setup returns result", async () => {
    const r = await callAction(cam, "fixture_setup", { type: "vise", jaw_width: 150 });
    expect(r).toBeDefined();
  });
});

// ============================================================================
// prism_quality (8 actions)
// ============================================================================
describe("prism_quality dispatcher", () => {
  const { server, tools } = createMockServer();
  registerQualityDispatcher(server);
  const quality = tools[0];

  it("registers as prism_quality", () => {
    expect(quality.name).toBe("prism_quality");
  });

  it("spc_calculate computes statistics", async () => {
    const r = await callAction(quality, "spc_calculate", {
      measurements: [10.01, 10.02, 9.99, 10.00, 10.01, 9.98, 10.03, 10.00, 9.99, 10.01],
      usl: 10.05, lsl: 9.95,
    });
    expect(r.mean).toBeCloseTo(10.004, 2);
    expect(r.cpk).toBeDefined();
    expect(r.n).toBe(10);
  });

  it("gauge_rr computes measurement system analysis", async () => {
    const r = await callAction(quality, "gauge_rr", {
      parts: 10, operators: 3, trials: 3, tolerance: 0.1,
    });
    expect(r.grr).toBeGreaterThan(0);
    expect(r.ndc).toBeGreaterThan(0);
    expect(r.acceptable).toBeDefined();
  });

  it("gdt_validate checks tolerance", async () => {
    const r = await callAction(quality, "gdt_validate", {
      nominal: 25.0, actual: 25.02, tolerance: 0.1, gdt_type: "position",
    });
    expect(r.within_tolerance).toBe(true);
    expect(r.deviation).toBeCloseTo(0.02, 3);
  });

  it("cmm_plan estimates measurement time", async () => {
    const r = await callAction(quality, "cmm_plan", {
      features: [{ type: "bore" }, { type: "plane" }, { type: "slot" }],
      points_per_feature: 8,
    });
    expect(r.total_points).toBe(24);
    expect(r.estimated_time_min).toBeGreaterThan(0);
  });
});

// ============================================================================
// prism_scheduling (8 actions)
// ============================================================================
describe("prism_scheduling dispatcher", () => {
  const { server, tools } = createMockServer();
  registerSchedulingDispatcher(server);
  const sched = tools[0];

  it("registers as prism_scheduling", () => {
    expect(sched.name).toBe("prism_scheduling");
  });

  it("capacity_plan detects over-capacity", async () => {
    const r = await callAction(sched, "capacity_plan", {
      available_hours_per_day: 16, demand_hours: 20,
    });
    expect(r.over_capacity).toBe(true);
    expect(r.utilization_pct).toBe(125);
    expect(r.overtime_needed_hours).toBe(4);
  });

  it("lead_time_estimate calculates queue time", async () => {
    const r = await callAction(sched, "lead_time_estimate", {
      operations: [{ time_min: 15 }, { time_min: 30 }, { time_min: 10 }],
      queue_factor: 3.0,
    });
    expect(r.process_time_min).toBe(55);
    expect(r.lead_time_min).toBe(165);
    expect(r.operations_count).toBe(3);
  });

  it("resource_balance checks machine utilization", async () => {
    const r = await callAction(sched, "resource_balance", {
      machines: [
        { id: "M1", utilization_pct: 90 },
        { id: "M2", utilization_pct: 60 },
        { id: "M3", utilization_pct: 75 },
      ],
    });
    expect(r.machines_count).toBe(3);
    expect(r.avg_utilization_pct).toBe(75);
    expect(r.balanced).toBe(false); // 90-60=30 > 20
  });

  it("priority_queue sorts by urgency", async () => {
    const r = await callAction(sched, "priority_queue", {
      jobs: [
        { id: "J1", priority: "low", days_until_due: 10 },
        { id: "J2", priority: "critical", days_until_due: 2 },
        { id: "J3", priority: "high", days_until_due: 5 },
      ],
    });
    expect(r.queue[0].id).toBe("J2"); // critical + urgent
  });
});

// ============================================================================
// prism_auth (8 actions) — SECURITY CRITICAL
// ============================================================================
describe("prism_auth dispatcher", () => {
  const { server, tools } = createMockServer();
  registerAuthDispatcher(server);
  const auth = tools[0];

  it("registers as prism_auth", () => {
    expect(auth.name).toBe("prism_auth");
  });

  it("register creates account", async () => {
    const r = await callAction(auth, "register", {
      username: "machinist1", email: "m@shop.com", password: "s3cur3!",
    });
    expect(r).toBeDefined();
    // Should NOT contain password hash
    expect(r.password_hash).toBeUndefined();
  });

  it("permission_check returns result", async () => {
    const r = await callAction(auth, "permission_check", {
      user_id: "usr_1", permission: "edit_program", resource: "program_42",
    });
    expect(r).toBeDefined();
    expect(r.user_id).toBe("usr_1");
  });

  it("mfa_setup returns backup codes", async () => {
    const r = await callAction(auth, "mfa_setup", {
      user_id: "usr_1", operation: "enable",
    });
    expect(r.enabled).toBe(true);
    expect(r.backup_codes).toBeDefined();
    expect(r.backup_codes.length).toBe(8);
  });
});

// ============================================================================
// prism_export (8 actions)
// ============================================================================
describe("prism_export dispatcher", () => {
  const { server, tools } = createMockServer();
  registerExportDispatcher(server);
  const exp = tools[0];

  it("registers as prism_export", () => {
    expect(exp.name).toBe("prism_export");
  });

  it("render_pdf returns result", async () => {
    const r = await callAction(exp, "render_pdf", { template: "setup_sheet", job_id: "J001" });
    expect(r).toBeDefined();
    expect(r.error).toBeUndefined();
  });

  it("render_csv returns result", async () => {
    const r = await callAction(exp, "render_csv", {
      data: [{ part: "A", qty: 10 }, { part: "B", qty: 20 }],
      columns: ["part", "qty"],
    });
    expect(r).toBeDefined();
    expect(r.error).toBeUndefined();
  });

  it("render_gcode returns result", async () => {
    const r = await callAction(exp, "render_gcode", { controller: "haas", operations: 5 });
    expect(r).toBeDefined();
    expect(r.error).toBeUndefined();
  });

  it("batch_export queues items", async () => {
    const r = await callAction(exp, "batch_export", {
      items: [
        { format: "pdf", template: "report" },
        { format: "csv", template: "data" },
      ],
    });
    expect(r).toBeDefined();
    expect(r.error).toBeUndefined();
  });
});
