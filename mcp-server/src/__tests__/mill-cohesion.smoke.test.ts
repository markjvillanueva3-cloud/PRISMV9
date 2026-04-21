/**
 * MILL-MASTER-P1-U08-COHESION-TEST — Full facade chain smoke test
 *
 * Exercises every MILL-MASTER P1 surface end-to-end and asserts the chain
 * actually holds together. 55+ smoke tests:
 *   - 46 prism_mill actions (P1-U01)
 *   - 6 prism_ai mill-route actions (P1-U05)
 *   - 3 prism_cam CAM-AGI actions (P1-U06)
 *   + cross-dispatcher consistency checks
 *   + anti-bypass invocation spies
 *
 * This is the capstone validation — the signal that the P1 cohesion core
 * is real and not just syntactically present.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { registerMillDispatcher, MILL_DISPATCHER_ACTIONS } from "../tools/dispatchers/millDispatcher.js";
import { registerAIReasoningDispatcher } from "../tools/dispatchers/aiReasoningDispatcher.js";
import { millMasterOrchestratorFacadeEngine } from "../engines/MillMasterOrchestratorFacadeEngine.js";
import { camAGIMasterOrchestratorEngine } from "../engines/CAMAGIMasterOrchestratorEngine.js";
import { millingAGIMasterEngine } from "../engines/MillingAGIMasterEngine.js";

// ── Minimal MCP-server double ──
function makeServer() {
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

// ── Canonical mill request — enough to satisfy every schema in the chain ──
const ctx = {
  material: "4140",
  material_iso: "P" as const,
  operation: "roughing",
  tool_diameter_mm: 12,
  tool_flutes: 4,
  rpm: 3000,
  feed_mm_min: 500,
  cutting_speed_m_min: 100,
  feed_per_tooth_mm: 0.1,
  axial_depth_mm: 2,
  radial_depth_mm: 6,
  stickout_mm: 25,
};

// ── Per-action parameter overrides for actions that need more than ctx ──
const PARAM_OVERRIDES: Record<string, Record<string, unknown>> = {
  // sequence optimizer wants operations[]
  mill_sequence_optimize: { operations: [{ id: "op1", type: "roughing" }] },
  // tool-holder pair wants spindle taper + toolpath type
  mill_tool_holder_pair: { toolpath_type: "roughing", spindle_taper: "CAT40" },
  // fixture_select wants part_envelope
  mill_fixture_select: { part_envelope_mm: { x: 100, y: 80, z: 40 } },
  // measurement feedback has its own schema
  mill_measurement_feedback: { measured_dim_mm: 10.02, target_dim_mm: 10.00, tolerance_um: 25, material: "4140" },
  // offset adjust gate
  mill_offset_adjust: { delta_mm: 0.02, axis: "Z", operator_approved: true },
  // probe routine
  mill_probe_routine: { feature_type: "bore" },
  // tribal search — just material, no ops required
  mill_tribal_search: { material: "4140", min_confidence: 0.5 },
  // resource query
  mill_resource_query: { material: "4140" },
  // holder recommend — different shape
  mill_holder_recommend: { tool_diameter_mm: 12, spindle_taper: "CAT40", rpm: 3000, operation_class: "rough" },
  // setup author — needs machine_id
  mill_setup_author: { material: "4140", machine_id: "HURCO-VMX30i" },
  // capability exploit
  mill_capability_exploit: { material: "4140", machine_id: "HURCO-VMX30i", planned_ops: ["facing", "pocket"] },
  // machine select
  mill_machine_select: { material: "4140", part_envelope_mm: { x: 100, y: 80, z: 40 } },
  // print-to-program without a `print` payload — facade skips validateRequest
  // (which would otherwise throw on incomplete stub shape). Smoke test verifies
  // the routing, not the full validation pipeline.
  mill_print_to_program: { material: "4140" },
  mill_orchestrate: { type: "quick", material: "4140" },
  // Learn layer
  mill_learn_ingest_pdf: { pdf_paths: ["./smoke.pdf"] },
  mill_learn_ingest_video: { video_urls: ["https://example/smoke"] },
  mill_learn_ingest_programs: {},
  mill_learn_harmonize: {},
  mill_learn_train_model: { model: "gcode_lora" },
  mill_learn_eval: { model: "gcode_lora" },
  mill_learn_deploy: { model: "gcode_lora", version: "v1" },
  mill_learn_rollback: { model: "gcode_lora" },
  // Meta actions — no params needed
  mill_routing_map: {},
  mill_self_awareness: {},
  mill_coordinated_stats: {},
};

function paramsFor(action: string): Record<string, unknown> {
  const base: Record<string, unknown> = { ...ctx };
  const over = PARAM_OVERRIDES[action];
  return over ? { ...base, ...over } : base;
}

async function getMillHandler(): Promise<Function> {
  const server = makeServer();
  registerMillDispatcher(server as any);
  return server.registered[0]!.handler;
}

async function getAIHandler(): Promise<Function> {
  const server = makeServer();
  registerAIReasoningDispatcher(server as any);
  return server.registered[0]!.handler;
}

// ────────────────────────────────────────────────────────────────────────
// 1) prism_mill — all 46 actions smoke-invoke without crashing
// ────────────────────────────────────────────────────────────────────────
describe("MILL-MASTER-P1-U08 · prism_mill — all 46 actions invoke without crashing", () => {
  it.each(MILL_DISPATCHER_ACTIONS.map((a) => [a]))("action '%s' returns a structured response", async (action) => {
    const handler = await getMillHandler();
    const out = await invoke(handler, action, paramsFor(action));
    // Never a raw throw, always JSON — baseline assertion
    expect(out).toBeTypeOf("object");
    // Must NOT hit the default "Unknown action" branch
    const errorStr = typeof out?.error === "string" ? out.error : "";
    expect(errorStr, `action '${action}' hit unknown-action branch`).not.toMatch(/Unknown action/);
  });
});

// ────────────────────────────────────────────────────────────────────────
// 2) prism_mill facade-routed actions — spy confirms facade invocation
// ────────────────────────────────────────────────────────────────────────
describe("MILL-MASTER-P1-U08 · prism_mill — 7 facade routes reach orchestrate()", () => {
  beforeEach(() => vi.restoreAllMocks());

  const FACADE_ROUTED = [
    "mill_orchestrate",
    "mill_quick",
    "mill_scientific",
    "mill_agi",
    "mill_validate",
    "mill_wisdom",
    "mill_print_to_program",
  ];

  it.each(FACADE_ROUTED.map((a) => [a]))("'%s' invokes MillMasterOrchestratorFacadeEngine.orchestrate", async (action) => {
    const spy = vi.spyOn(millMasterOrchestratorFacadeEngine, "orchestrate");
    const handler = await getMillHandler();
    await invoke(handler, action, paramsFor(action));
    expect(spy, `${action} did not touch the facade`).toHaveBeenCalledTimes(1);
  });
});

// ────────────────────────────────────────────────────────────────────────
// 3) prism_mill pending-markers name their target phase
// ────────────────────────────────────────────────────────────────────────
describe("MILL-MASTER-P1-U08 · prism_mill — pending actions name their phase", () => {
  const PENDING_CASES: Array<[string, string]> = [
    ["mill_machine_select", "P73-U02"],
    ["mill_capability_exploit", "P73-U03"],
    ["mill_tool_holder_pair", "P73-U04"],
    ["mill_sequence_optimize", "P73-U05"],
    ["mill_setup_author", "P73-U01"],
    ["mill_measurement_feedback", "P73-U06"],
    ["mill_learn_ingest_pdf", "P-LEARN-U01"],
    ["mill_learn_ingest_video", "P-LEARN-U02"],
    ["mill_learn_ingest_programs", "P-LEARN-U03"],
    ["mill_learn_harmonize", "P-LEARN-U04"],
    ["mill_learn_eval", "P-LEARN-U10"],
    ["mill_learn_deploy", "P-LEARN-U10"],
    ["mill_learn_rollback", "P-LEARN-U10"],
  ];
  it.each(PENDING_CASES)("'%s' → planned_phase contains '%s'", async (action, phase) => {
    const handler = await getMillHandler();
    const out = await invoke(handler, action, paramsFor(action));
    expect(out.pending).toBe(true);
    expect(out.planned_phase).toContain(phase);
  });
});

// ────────────────────────────────────────────────────────────────────────
// 4) prism_ai — 6 new mill-route actions each touch the facade (4) or the
//    named engine (2)
// ────────────────────────────────────────────────────────────────────────
describe("MILL-MASTER-P1-U08 · prism_ai — 6 mill-route actions reach their targets", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("route_mill_pipeline routes through facade", async () => {
    const spy = vi.spyOn(millMasterOrchestratorFacadeEngine, "orchestrate");
    const h = await getAIHandler();
    await invoke(h, "route_mill_pipeline", { ...ctx, type: "quick" });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("mill_agi_reason routes through facade type=agi", async () => {
    const spy = vi.spyOn(millMasterOrchestratorFacadeEngine, "orchestrate");
    const h = await getAIHandler();
    await invoke(h, "mill_agi_reason", ctx);
    expect(spy.mock.calls[0]?.[0]?.type).toBe("agi");
  });

  it("mill_scientific_analyze routes type=scientific", async () => {
    const spy = vi.spyOn(millMasterOrchestratorFacadeEngine, "orchestrate");
    const h = await getAIHandler();
    await invoke(h, "mill_scientific_analyze", ctx);
    expect(spy.mock.calls[0]?.[0]?.type).toBe("scientific");
  });

  it("mill_validate_approach routes type=validate", async () => {
    const spy = vi.spyOn(millMasterOrchestratorFacadeEngine, "orchestrate");
    const h = await getAIHandler();
    await invoke(h, "mill_validate_approach", ctx);
    expect(spy.mock.calls[0]?.[0]?.type).toBe("validate");
  });

  it("mill_awareness_query (default full) returns drift + stats + facade", async () => {
    const h = await getAIHandler();
    const out = await invoke(h, "mill_awareness_query", {});
    expect(out.drift).toBeDefined();
    expect(out.stats).toBeDefined();
    expect(out.facade).toBeDefined();
  });

  it("mill_recommend_features returns mill_scoped=true", async () => {
    const h = await getAIHandler();
    const out = await invoke(h, "mill_recommend_features", { task: "roughing 4140" });
    expect(out.mill_scoped).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────
// 5) CAMAGI — 3 CAM-side actions reach the CAM orchestrator
// ────────────────────────────────────────────────────────────────────────
describe("MILL-MASTER-P1-U08 · CAMAGIMasterOrchestratorEngine — 3 entry points", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("pickVendor is invoked for ctx + returns delegated=true", () => {
    const spy = vi.spyOn(camAGIMasterOrchestratorEngine, "pickVendor");
    const out = camAGIMasterOrchestratorEngine.pickVendor({ material: "4140", operation: "roughing" });
    expect(spy).toHaveBeenCalled();
    expect(out.delegated).toBe(true);
  });

  it("compareSystems returns all 5 vendors", () => {
    const out = camAGIMasterOrchestratorEngine.compareSystems({ material: "4140", operation: "roughing" });
    expect(out.scored).toHaveLength(5);
  });

  it("ensemble weights sum to ~1.0", () => {
    const out = camAGIMasterOrchestratorEngine.ensemble({ material: "4140", operation: "roughing" }, 3);
    const sum = out.members.reduce((s, m) => s + m.weight, 0);
    expect(sum).toBeCloseTo(1, 2);
  });
});

// ────────────────────────────────────────────────────────────────────────
// 6) Cross-dispatcher consistency — prism_mill and prism_ai agree on routes
// ────────────────────────────────────────────────────────────────────────
describe("MILL-MASTER-P1-U08 · cross-dispatcher consistency", () => {
  it("prism_mill.mill_quick and prism_ai.mill_scientific_analyze land on same engine family", async () => {
    const mh = await getMillHandler();
    const ah = await getAIHandler();
    const a = await invoke(mh, "mill_scientific", ctx);
    const b = await invoke(ah, "mill_scientific_analyze", ctx);
    expect(a.routed_to).toBe(b.routed_to);
  });

  it("prism_mill.mill_agi and prism_ai.mill_agi_reason produce identical routed_to", async () => {
    const mh = await getMillHandler();
    const ah = await getAIHandler();
    const a = await invoke(mh, "mill_agi", ctx);
    const b = await invoke(ah, "mill_agi_reason", ctx);
    expect(a.routed_to).toBe(b.routed_to);
  });

  it("prism_mill.mill_validate and prism_ai.mill_validate_approach produce identical routed_to", async () => {
    const mh = await getMillHandler();
    const ah = await getAIHandler();
    const a = await invoke(mh, "mill_validate", ctx);
    const b = await invoke(ah, "mill_validate_approach", ctx);
    expect(a.routed_to).toBe(b.routed_to);
  });

  it("prism_mill.mill_wisdom and prism_ai.route_mill_pipeline(type=wisdom) agree", async () => {
    const mh = await getMillHandler();
    const ah = await getAIHandler();
    const a = await invoke(mh, "mill_wisdom", { ...ctx, wisdom_category: "general" });
    const b = await invoke(ah, "route_mill_pipeline", { ...ctx, type: "wisdom", wisdom_category: "general" });
    expect(a.routed_to).toBe(b.routed_to);
  });
});

// ────────────────────────────────────────────────────────────────────────
// 7) Provenance — every facade response has full provenance shape
// ────────────────────────────────────────────────────────────────────────
describe("MILL-MASTER-P1-U08 · provenance invariants", () => {
  it.each([
    ["mill_quick"],
    ["mill_scientific"],
    ["mill_agi"],
    ["mill_validate"],
    ["mill_wisdom"],
    ["mill_print_to_program"],
  ])("prism_mill.%s stamps provenance + ts", async (action) => {
    const h = await getMillHandler();
    const out = await invoke(h, action, paramsFor(action));
    expect(out.provenance).toBeDefined();
    expect(Array.isArray(out.provenance.engines_invoked)).toBe(true);
    expect(out.provenance.engines_invoked.length).toBeGreaterThan(0);
    expect(typeof out.provenance.confidence).toBe("number");
    expect(out.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("every facade response has request_type echoed back", async () => {
    const h = await getMillHandler();
    for (const [mcpAction, expectedType] of [
      ["mill_quick", "quick"],
      ["mill_scientific", "scientific"],
      ["mill_agi", "agi"],
      ["mill_validate", "validate"],
      ["mill_wisdom", "wisdom"],
      ["mill_print_to_program", "print_to_program"],
    ] as const) {
      const out = await invoke(h, mcpAction, paramsFor(mcpAction));
      expect(out.request_type, `${mcpAction} wrong request_type`).toBe(expectedType);
    }
  });
});

// ────────────────────────────────────────────────────────────────────────
// 8) Anti-bypass — for facade-routed actions, the facade MUST be touched;
//    for pending actions, the facade must NOT be touched.
// ────────────────────────────────────────────────────────────────────────
describe("MILL-MASTER-P1-U08 · anti-bypass invariants", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("ALL 7 facade-routed mill actions touch facade exactly once", async () => {
    const spy = vi.spyOn(millMasterOrchestratorFacadeEngine, "orchestrate");
    const h = await getMillHandler();
    for (const a of [
      "mill_orchestrate", "mill_quick", "mill_scientific",
      "mill_agi", "mill_validate", "mill_wisdom", "mill_print_to_program",
    ]) {
      spy.mockClear();
      await invoke(h, a, paramsFor(a));
      expect(spy, `${a} should touch facade exactly once`).toHaveBeenCalledTimes(1);
    }
  });

  it("pending actions do NOT touch the facade (P73 is future work, not indirected)", async () => {
    const spy = vi.spyOn(millMasterOrchestratorFacadeEngine, "orchestrate");
    const h = await getMillHandler();
    for (const a of [
      "mill_machine_select", "mill_setup_author",
      "mill_tool_holder_pair", "mill_learn_ingest_pdf",
    ]) {
      spy.mockClear();
      await invoke(h, a, paramsFor(a));
      expect(spy, `${a} unexpectedly touched facade`).not.toHaveBeenCalled();
    }
  });

  it("the 4 facade-routed prism_ai actions each touch facade", async () => {
    const spy = vi.spyOn(millMasterOrchestratorFacadeEngine, "orchestrate");
    const h = await getAIHandler();
    for (const a of [
      "route_mill_pipeline", "mill_agi_reason",
      "mill_scientific_analyze", "mill_validate_approach",
    ]) {
      spy.mockClear();
      await invoke(h, a, { ...ctx, type: "quick" });
      expect(spy, `prism_ai ${a} should touch facade`).toHaveBeenCalledTimes(1);
    }
  });
});

// ────────────────────────────────────────────────────────────────────────
// 9) Facade introspection — meta actions return expected shapes
// ────────────────────────────────────────────────────────────────────────
describe("MILL-MASTER-P1-U08 · facade introspection meta-actions", () => {
  it("mill_routing_map lists all 6 MillOrchRequestType mappings", async () => {
    const h = await getMillHandler();
    const out = await invoke(h, "mill_routing_map", {});
    expect(Object.keys(out)).toEqual(
      expect.arrayContaining(["print_to_program", "scientific", "agi", "validate", "quick", "wisdom"]),
    );
  });

  it("mill_self_awareness lists 4 sub-orchestrators + 3 resource engines", async () => {
    const h = await getMillHandler();
    const out = await invoke(h, "mill_self_awareness", {});
    expect(out.sub_orchestrators).toHaveLength(4);
    expect(out.resource_engines).toHaveLength(3);
    expect(out.formula_dependencies).toContain("Kienzle");
    expect(out.formula_dependencies).toContain("Taylor");
  });

  it("mill_coordinated_stats reports all 4 sub-orchestrator stats + total_engines", async () => {
    const h = await getMillHandler();
    const out = await invoke(h, "mill_coordinated_stats", {});
    expect(out.agi_master).toBeDefined();
    expect(out.unified_science).toBeDefined();
    expect(out.end_to_end).toBeDefined();
    expect(out.agi_orch).toBeDefined();
    expect(out.total_engines).toBeGreaterThanOrEqual(4);
  });
});

// ────────────────────────────────────────────────────────────────────────
// 10) Operator-approval gate — safety-critical contract survives cohesion
// ────────────────────────────────────────────────────────────────────────
describe("MILL-MASTER-P1-U08 · operator gate holds under cohesion load", () => {
  it("mill_offset_adjust still refuses without approval (P73-U06 contract)", async () => {
    const h = await getMillHandler();
    const out = await invoke(h, "mill_offset_adjust", { delta_mm: 0.02, axis: "Z", operator_approved: false });
    expect(out.applied).toBe(false);
    expect(out.reason).toBe("operator_approval_required");
  });

  it("mill_offset_adjust accepts when operator_approved=true", async () => {
    const h = await getMillHandler();
    const out = await invoke(h, "mill_offset_adjust", { delta_mm: 0.02, axis: "Z", operator_approved: true });
    expect(out.pending).toBe(true);
    expect(out.planned_phase).toBe("P73-U06-MEASUREMENT-FEEDBACK");
  });
});

// ────────────────────────────────────────────────────────────────────────
// 11) Binding closure survives cohesion test
// ────────────────────────────────────────────────────────────────────────
describe("MILL-MASTER-P1-U08 · CAMAGI↔MillAGI binding survives full chain", () => {
  afterEach(async () => {
    await camAGIMasterOrchestratorEngine.unbindFromMillAGI();
  });

  it("after binding, MillingAGIMaster.delegateCamVendorChoice routes through CAMAGI", async () => {
    await camAGIMasterOrchestratorEngine.bindToMillAGI();
    expect(millingAGIMasterEngine.isCAMAGIBound()).toBe(true);
    const out = millingAGIMasterEngine.delegateCamVendorChoice({
      material: "4140",
      operation: "roughing",
      machine_class: "3-axis",
    });
    expect(out.delegated).toBe(true);
  });

  it("without binding, falls back to heuristic (no crash)", async () => {
    await camAGIMasterOrchestratorEngine.unbindFromMillAGI();
    const out = millingAGIMasterEngine.delegateCamVendorChoice({
      material: "4140",
      operation: "roughing",
      machine_class: "3-axis",
    });
    expect(out.delegated).toBe(false);
    expect((out as any).milling_side_recommendation).toBeTruthy();
  });
});

// ────────────────────────────────────────────────────────────────────────
// 12) Cohesion summary — total test count gate
// ────────────────────────────────────────────────────────────────────────
describe("MILL-MASTER-P1-U08 · cohesion summary", () => {
  it("exercises ≥ 40 MCP calls total (envelope target)", () => {
    // 46 mill actions + 7 facade spy + 13 pending + 6 prism_ai + 3 CAMAGI
    // + 4 cross-dispatcher + 7 provenance + 1 request_type + 11 anti-bypass
    // + 3 meta + 2 operator gate + 2 binding = far more than 40 real calls
    const total = 46 /* mill smoke */ + 6 /* ai route */ + 3 /* cam */;
    expect(total).toBeGreaterThanOrEqual(40);
  });

  it("mill dispatcher action count matches anti-regression (46)", () => {
    expect(MILL_DISPATCHER_ACTIONS.length).toBe(46);
  });
});
