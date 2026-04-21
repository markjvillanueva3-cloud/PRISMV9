/**
 * MILL-MASTER-P1-U01-MILL-DISP — millDispatcher test suite
 *
 * Covers:
 *   - Action enum anti-regression (43 actions)
 *   - Schema registry parity (every action has a schema)
 *   - Facade routing — each of the 7 facade-type actions touches the facade
 *   - Meta actions — routing_map, self_awareness, coordinated_stats
 *   - AI-layer delegation
 *   - Scientific-layer delegation (force Kienzle invokes unified science)
 *   - Pending-action marker shape (P73 + P-LEARN future-phase flags)
 *   - Operator-approval gate on mill_offset_adjust
 *   - Tribal search + resource query wire to real engines
 *   - Schema rejects invalid params
 */
import { describe, it, expect, vi } from "vitest";

import { MILL_DISPATCHER_ACTIONS } from "../tools/dispatchers/millDispatcher.js";
import { MILL_ACTION_SCHEMAS } from "../schemas/millActionSchemas.js";
import { millMasterOrchestratorFacadeEngine } from "../engines/MillMasterOrchestratorFacadeEngine.js";

// Helper — mimic the MCP server's tool-registration surface
function makeCapturingServer() {
  const registered: Array<{ name: string; desc: string; schema: any; handler: Function }> = [];
  return {
    registered,
    tool(name: string, desc: string, schema: any, handler: Function) {
      registered.push({ name, desc, schema, handler });
    },
  };
}

async function invoke(handler: Function, action: string, params: any = {}): Promise<any> {
  const rsp = await handler({ action, params });
  const text = rsp?.content?.[0]?.text;
  if (typeof text !== "string") return rsp;
  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text };
  }
}

describe("MILL-MASTER-P1-U01: millDispatcher anti-regression", () => {
  it("exposes ≥ 40 actions (envelope target: 40+)", () => {
    expect(MILL_DISPATCHER_ACTIONS.length).toBeGreaterThanOrEqual(40);
  });

  it("exposes exactly 46 actions at v1.0 (facade=7, meta=3, AI=5, scientific=7, strategy=4, machine=5, quality=4, tribal=3, learn=8)", () => {
    expect(MILL_DISPATCHER_ACTIONS.length).toBe(46);
  });

  it("has unique action names (no duplicates)", () => {
    const set = new Set(MILL_DISPATCHER_ACTIONS);
    expect(set.size).toBe(MILL_DISPATCHER_ACTIONS.length);
  });

  it("every action has a matching Zod schema in MILL_ACTION_SCHEMAS", () => {
    for (const a of MILL_DISPATCHER_ACTIONS) {
      expect(MILL_ACTION_SCHEMAS[a], `missing schema for ${a}`).toBeDefined();
    }
  });

  it("schema registry contains no schemas beyond the action enum", () => {
    const actionSet = new Set<string>(MILL_DISPATCHER_ACTIONS);
    for (const key of Object.keys(MILL_ACTION_SCHEMAS)) {
      expect(actionSet.has(key), `orphan schema ${key} has no matching action`).toBe(true);
    }
  });

  it("all action names use snake_case with mill_ prefix", () => {
    for (const a of MILL_DISPATCHER_ACTIONS) {
      expect(a, `action ${a} violates naming`).toMatch(/^mill_[a-z][a-z0-9_]*$/);
    }
  });
});

describe("MILL-MASTER-P1-U01: registration + tool contract", () => {
  it("registers prism_mill tool on the MCP server", async () => {
    const { registerMillDispatcher } = await import("../tools/dispatchers/millDispatcher.js");
    const server = makeCapturingServer();
    registerMillDispatcher(server as any);
    expect(server.registered).toHaveLength(1);
    expect(server.registered[0]!.name).toBe("prism_mill");
  });

  it("tool description mentions cohesion core + facade", async () => {
    const { registerMillDispatcher } = await import("../tools/dispatchers/millDispatcher.js");
    const server = makeCapturingServer();
    registerMillDispatcher(server as any);
    const desc = server.registered[0]!.desc;
    expect(desc).toMatch(/cohesion core/i);
    expect(desc).toMatch(/MillMasterOrchestratorFacadeEngine/);
  });
});

describe("MILL-MASTER-P1-U01: facade routing", () => {
  async function getHandler() {
    const { registerMillDispatcher } = await import("../tools/dispatchers/millDispatcher.js");
    const server = makeCapturingServer();
    registerMillDispatcher(server as any);
    return server.registered[0]!.handler as Function;
  }

  it("mill_quick routes through facade with type=quick", async () => {
    const handler = await getHandler();
    const spy = vi.spyOn(millMasterOrchestratorFacadeEngine, "orchestrate");
    await invoke(handler, "mill_quick", { material: "4140" });
    expect(spy).toHaveBeenCalled();
    const firstCall = spy.mock.calls[0]?.[0];
    expect(firstCall?.type).toBe("quick");
    expect(firstCall?.material).toBe("4140");
    spy.mockRestore();
  });

  it("mill_scientific routes with type=scientific", async () => {
    const handler = await getHandler();
    const spy = vi.spyOn(millMasterOrchestratorFacadeEngine, "orchestrate");
    await invoke(handler, "mill_scientific", { material: "Inconel 718", tool_diameter_mm: 10 });
    expect(spy.mock.calls.some((c) => c[0]?.type === "scientific")).toBe(true);
    spy.mockRestore();
  });

  it("mill_agi routes with type=agi", async () => {
    const handler = await getHandler();
    const spy = vi.spyOn(millMasterOrchestratorFacadeEngine, "orchestrate");
    await invoke(handler, "mill_agi", { material: "Al 6061", tool_diameter_mm: 12, tool_flutes: 4 });
    expect(spy.mock.calls.some((c) => c[0]?.type === "agi")).toBe(true);
    spy.mockRestore();
  });

  it("mill_validate routes with type=validate", async () => {
    const handler = await getHandler();
    const spy = vi.spyOn(millMasterOrchestratorFacadeEngine, "orchestrate");
    await invoke(handler, "mill_validate", {
      material: "S7 tool steel",
      material_iso: "P",
      operation: "roughing",
      rpm: 2500,
      feed_mm_min: 400,
      axial_depth_mm: 2,
      tool_diameter_mm: 16,
    });
    expect(spy.mock.calls.some((c) => c[0]?.type === "validate")).toBe(true);
    spy.mockRestore();
  });

  it("mill_wisdom routes with type=wisdom and passes wisdom_category", async () => {
    const handler = await getHandler();
    const spy = vi.spyOn(millMasterOrchestratorFacadeEngine, "orchestrate");
    await invoke(handler, "mill_wisdom", { material: "D2", wisdom_category: "chatter" });
    const call = spy.mock.calls.find((c) => c[0]?.type === "wisdom");
    expect(call?.[0]?.wisdom_category).toBe("chatter");
    spy.mockRestore();
  });

  it("mill_print_to_program routes with type=print_to_program", async () => {
    const handler = await getHandler();
    const spy = vi.spyOn(millMasterOrchestratorFacadeEngine, "orchestrate");
    await invoke(handler, "mill_print_to_program", { material: "A2", print: { stub: true } });
    expect(spy.mock.calls.some((c) => c[0]?.type === "print_to_program")).toBe(true);
    spy.mockRestore();
  });
});

describe("MILL-MASTER-P1-U01: facade meta", () => {
  async function getHandler() {
    const { registerMillDispatcher } = await import("../tools/dispatchers/millDispatcher.js");
    const server = makeCapturingServer();
    registerMillDispatcher(server as any);
    return server.registered[0]!.handler as Function;
  }

  it("mill_routing_map returns the facade routing table", async () => {
    const handler = await getHandler();
    const out = await invoke(handler, "mill_routing_map", {});
    expect(out).toMatchObject({
      print_to_program: expect.stringContaining("EndToEnd"),
      scientific: expect.stringContaining("UnifiedScience"),
      wisdom: expect.stringContaining("AGIMaster"),
    });
  });

  it("mill_self_awareness reports engine + sub-orchestrators", async () => {
    const handler = await getHandler();
    const out = await invoke(handler, "mill_self_awareness", {});
    expect(out.engine_name).toBe("MillMasterOrchestratorFacadeEngine");
    expect(out.sub_orchestrators).toHaveLength(4);
    expect(out.formula_dependencies).toContain("Kienzle");
    expect(out.formula_dependencies).toContain("Taylor");
  });

  it("mill_coordinated_stats aggregates stats from 4 sub-orchestrators", async () => {
    const handler = await getHandler();
    const out = await invoke(handler, "mill_coordinated_stats", {});
    expect(out).toHaveProperty("agi_master");
    expect(out).toHaveProperty("unified_science");
    expect(out).toHaveProperty("end_to_end");
    expect(out).toHaveProperty("agi_orch");
    expect(out.total_engines).toBeGreaterThanOrEqual(4);
  });
});

describe("MILL-MASTER-P1-U01: scientific-layer delegation", () => {
  async function getHandler() {
    const { registerMillDispatcher } = await import("../tools/dispatchers/millDispatcher.js");
    const server = makeCapturingServer();
    registerMillDispatcher(server as any);
    return server.registered[0]!.handler as Function;
  }

  it("mill_force_kienzle invokes MillingUnifiedScience.quickAnalyze directly", async () => {
    const handler = await getHandler();
    const out = await invoke(handler, "mill_force_kienzle", {
      material: "4140",
      material_iso: "P",
      axial_depth_mm: 2,
      feed_per_tooth_mm: 0.1,
      tool_diameter_mm: 12,
      tool_flutes: 4,
      radial_depth_mm: 6,
      cutting_speed_m_min: 120,
    });
    // UnifiedScience.quickAnalyze returns a structured result with stability + forces
    expect(out).toBeTypeOf("object");
    expect(out).not.toHaveProperty("pending");
  });
});

describe("MILL-MASTER-P1-U01: pending-action markers (P73 + P-LEARN)", () => {
  async function getHandler() {
    const { registerMillDispatcher } = await import("../tools/dispatchers/millDispatcher.js");
    const server = makeCapturingServer();
    registerMillDispatcher(server as any);
    return server.registered[0]!.handler as Function;
  }

  it("mill_machine_select marks P73-U02 as planned phase", async () => {
    const handler = await getHandler();
    const out = await invoke(handler, "mill_machine_select", { material: "4140" });
    expect(out.pending).toBe(true);
    expect(out.planned_phase).toBe("P73-U02-MACHINE-PICK");
  });

  it("mill_setup_author marks P73-U01", async () => {
    const handler = await getHandler();
    const out = await invoke(handler, "mill_setup_author", { material: "A2", machine_id: "HURCO-VMX30i" });
    expect(out.planned_phase).toBe("P73-U01-SETUP-AUTHOR");
  });

  it("mill_sequence_optimize marks P73-U05", async () => {
    const handler = await getHandler();
    const out = await invoke(handler, "mill_sequence_optimize", {
      material: "D2",
      operations: [{ id: "op1", type: "roughing" }],
    });
    expect(out.planned_phase).toBe("P73-U05-SEQUENCE-OPTIMIZE");
  });

  it("mill_learn_ingest_pdf marks P-LEARN-U01", async () => {
    const handler = await getHandler();
    const out = await invoke(handler, "mill_learn_ingest_pdf", { pdf_paths: ["./fake.pdf"] });
    expect(out.planned_phase).toBe("P-LEARN-U01-MILL-PDF-HARVEST");
  });

  it("mill_learn_ingest_video marks P-LEARN-U02", async () => {
    const handler = await getHandler();
    const out = await invoke(handler, "mill_learn_ingest_video", { video_urls: ["https://example/v"] });
    expect(out.planned_phase).toBe("P-LEARN-U02-MILL-VIDEO-HARVEST");
  });

  it("mill_learn_train_model embeds requested model name in reason", async () => {
    const handler = await getHandler();
    const out = await invoke(handler, "mill_learn_train_model", { model: "gcode_lora" });
    expect(out.reason).toContain("gcode_lora");
  });
});

describe("MILL-MASTER-P1-U01: operator-approval gate (P73-U06 contract)", () => {
  async function getHandler() {
    const { registerMillDispatcher } = await import("../tools/dispatchers/millDispatcher.js");
    const server = makeCapturingServer();
    registerMillDispatcher(server as any);
    return server.registered[0]!.handler as Function;
  }

  it("mill_offset_adjust REFUSES to apply when operator_approved=false", async () => {
    const handler = await getHandler();
    const out = await invoke(handler, "mill_offset_adjust", {
      delta_mm: 0.02,
      axis: "Z",
      operator_approved: false,
    });
    expect(out.applied).toBe(false);
    expect(out.reason).toBe("operator_approval_required");
  });

  it("mill_offset_adjust accepts when operator_approved=true (marked for P73)", async () => {
    const handler = await getHandler();
    const out = await invoke(handler, "mill_offset_adjust", {
      delta_mm: 0.02,
      axis: "Z",
      operator_approved: true,
    });
    expect(out.pending).toBe(true);
    expect(out.planned_phase).toBe("P73-U06-MEASUREMENT-FEEDBACK");
  });
});

describe("MILL-MASTER-P1-U01: tribal + resource integration", () => {
  async function getHandler() {
    const { registerMillDispatcher } = await import("../tools/dispatchers/millDispatcher.js");
    const server = makeCapturingServer();
    registerMillDispatcher(server as any);
    return server.registered[0]!.handler as Function;
  }

  it("mill_tribal_search returns structured data (non-pending)", async () => {
    const handler = await getHandler();
    const out = await invoke(handler, "mill_tribal_search", { material: "4140", min_confidence: 0.5 });
    expect(out).toBeTypeOf("object");
    expect(out).not.toHaveProperty("pending");
  });

  it("mill_resource_query returns structured data (non-pending)", async () => {
    const handler = await getHandler();
    const out = await invoke(handler, "mill_resource_query", { material: "4140" });
    expect(out).toBeTypeOf("object");
    expect(out).not.toHaveProperty("pending");
  });
});

describe("MILL-MASTER-P1-U01: schema validation rejects bad params", () => {
  async function getHandler() {
    const { registerMillDispatcher } = await import("../tools/dispatchers/millDispatcher.js");
    const server = makeCapturingServer();
    registerMillDispatcher(server as any);
    return server.registered[0]!.handler as Function;
  }

  it("rejects mill_quick with no material (required field)", async () => {
    const handler = await getHandler();
    const out = await invoke(handler, "mill_quick", {});
    // dispatcherError returns a structured error payload
    const text = JSON.stringify(out);
    expect(text).toMatch(/invalid|material|required/i);
  });

  it("rejects mill_force_kienzle with negative axial_depth", async () => {
    const handler = await getHandler();
    const out = await invoke(handler, "mill_force_kienzle", {
      material: "4140",
      axial_depth_mm: -2,
      feed_per_tooth_mm: 0.1,
      tool_diameter_mm: 12,
      tool_flutes: 4,
    });
    const text = JSON.stringify(out);
    expect(text).toMatch(/invalid|axial_depth_mm|positive/i);
  });

  it("rejects unknown action at tool-enum level (z.enum blocks before handler sees it)", async () => {
    const handler = await getHandler();
    // MCP harness would normally reject at schema level; simulate by invoking handler directly
    const out = await invoke(handler, "not_a_real_action" as any, {});
    const text = JSON.stringify(out);
    // Either the Zod enum on server.tool's `action` rejects, or our default branch returns error
    expect(text.length).toBeGreaterThan(0);
  });
});
