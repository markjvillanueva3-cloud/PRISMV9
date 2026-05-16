/**
 * dispatcher.latheMultiOpPlanner.test.ts — round-trip integration coverage
 * for WIRE-UNWIRED-MS0/U-WIRE-MOP dispatcher wiring (2 actions).
 *
 * Drives both surfaces through the real `prism_turning` dispatcher:
 *   - lathe_multiop_plan    → LatheMultiOpPlannerEngine.plan
 *   - lathe_softjaw_boring  → LatheMultiOpPlannerEngine.generateSoftJawBoring
 *
 * Engine-direct suite (`LatheMultiOpPlannerEngine.test.ts`, GREEN-verified
 * before wiring) proves the flip-detection + soft-jaw geometry math. This
 * file pins three contracts only a dispatcher round-trip can verify:
 *   1. Both actions register on the prism_turning Zod enum.
 *   2. The dispatcher wraps every result as { success, data }.
 *   3. Feature-position → Op1/Op2 access classification + the
 *      tolerance-gated concentricity-method switch (<10µm → indicator
 *      alignment, else soft-jaw-bore-to-OD) survive the JSON wire, and
 *      the controller dialect actually changes the emitted G-code.
 *
 * Reference values pinned from the engine's published constants:
 *   OP2_FACE_STOCK_MM=0.5, SOFT_JAW_BORE_CLEARANCE_MM=0.05.
 */

import { describe, it, expect, beforeAll } from "vitest";

import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";
import { TURNING_ACTION_SCHEMAS } from "../schemas/turningActionSchemas.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer(): {
  tools: CapturedTool[];
  tool: (name: string, desc: string, schema: unknown, h: CapturedTool["handler"]) => void;
} {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name, _desc, _schema, handler) { tools.push({ name, handler }); },
  };
}

async function invokeHandler(
  handler: CapturedTool["handler"],
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (Array.isArray((res as { content?: unknown[] }).content)) {
    const text = ((res as { content: Array<{ text?: string }> }).content[0]?.text) ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res;
}

interface OpPlan {
  op_number: 1 | 2;
  features: string[];
  operations: string[];
  workholding: string;
}
interface MultiOpResult {
  needs_flip: boolean;
  reasoning: string[];
  op1: OpPlan;
  op2: OpPlan | null;
  soft_jaw_boring: { bore_diameter_mm: number; gcode: string } | null;
  z_transfer: { op2_face_stock_mm: number } | null;
  concentricity: { method: string; target_tir_mm: number } | null;
  total_operations: number;
  estimated_setup_changes: number;
}
interface SoftJawProgram {
  bore_diameter_mm: number;
  bore_depth_mm: number;
  bore_tolerance_mm: number;
  gcode: string;
  notes: string[];
}

let turningHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerTurningDispatcher(srv as unknown as Parameters<typeof registerTurningDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_turning");
  if (!t) throw new Error("prism_turning not registered");
  turningHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MOP — schema registration + rejection", () => {
  it("lathe_multiop_plan is a usable Zod object", () => {
    expect(typeof TURNING_ACTION_SCHEMAS.lathe_multiop_plan.safeParse).toBe("function");
  });

  it("lathe_softjaw_boring is a usable Zod object", () => {
    expect(typeof TURNING_ACTION_SCHEMAS.lathe_softjaw_boring.safeParse).toBe("function");
  });

  it("multiop_plan rejects empty features array", () => {
    expect(TURNING_ACTION_SCHEMAS.lathe_multiop_plan.safeParse({
      part_length_mm: 50, max_od_mm: 30, features: [],
    }).success).toBe(false);
  });

  it("multiop_plan rejects an unknown feature position", () => {
    expect(TURNING_ACTION_SCHEMAS.lathe_multiop_plan.safeParse({
      part_length_mm: 50, max_od_mm: 30,
      features: [{ id: "f1", type: "od", position: "left_end" }],
    }).success).toBe(false);
  });

  it("multiop_plan rejects negative part_length_mm", () => {
    expect(TURNING_ACTION_SCHEMAS.lathe_multiop_plan.safeParse({
      part_length_mm: -1, max_od_mm: 30,
      features: [{ id: "f1", type: "od", position: "chuck_end" }],
    }).success).toBe(false);
  });

  it("softjaw_boring rejects missing bore_depth_mm", () => {
    expect(TURNING_ACTION_SCHEMAS.lathe_softjaw_boring.safeParse({
      bore_diameter_mm: 50,
    }).success).toBe(false);
  });

  it("softjaw_boring rejects an unknown controller", () => {
    expect(TURNING_ACTION_SCHEMAS.lathe_softjaw_boring.safeParse({
      bore_diameter_mm: 50, bore_depth_mm: 15, controller: "okuma_osp",
    }).success).toBe(false);
  });

  it("softjaw_boring accepts a minimal valid payload", () => {
    expect(TURNING_ACTION_SCHEMAS.lathe_softjaw_boring.safeParse({
      bore_diameter_mm: 50, bore_depth_mm: 15,
    }).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MOP — prism_turning :: lathe_multiop_plan", () => {
  it("all chuck-end features → no flip, op2 absent, 0 setup changes", async () => {
    const r = await invokeHandler(turningHandler, "lathe_multiop_plan", {
      part_length_mm: 40,
      max_od_mm: 25,
      features: [
        { id: "od1", type: "od_turn", position: "chuck_end", diameter_mm: 25 },
        { id: "ch1", type: "chamfer", position: "chuck_end" },
      ],
    });
    expect(r.success).toBe(true);
    const d = r.data as MultiOpResult;
    expect(d.needs_flip).toBe(false);
    // slimResponse strips null op2 from the wire → undefined; assert the
    // semantic "no Op2" via both the null/undefined collapse AND the
    // load-bearing carriers (setup changes + part_off in Op1).
    expect(d.op2 === null || d.op2 === undefined).toBe(true);
    expect(d.estimated_setup_changes).toBe(0);
    expect(d.op1.operations).toContain("part_off");
  });

  it("a tailstock-end feature forces a flip with a soft-jaw bore plan", async () => {
    const r = await invokeHandler(turningHandler, "lathe_multiop_plan", {
      part_length_mm: 80,
      max_od_mm: 40,
      features: [
        { id: "od1", type: "od_turn", position: "chuck_end", diameter_mm: 38 },
        { id: "back_bore", type: "bore", position: "tailstock_end", diameter_mm: 20, is_bore: true },
      ],
    });
    expect(r.success).toBe(true);
    const d = r.data as MultiOpResult;
    expect(d.needs_flip).toBe(true);
    expect(d.op2).not.toBeNull();
    expect(d.estimated_setup_changes).toBe(1);
    expect(d.op2!.features).toContain("back_bore");
    // Soft-jaw bore = grip OD (38) + SOFT_JAW_BORE_CLEARANCE_MM (0.05)
    expect(d.soft_jaw_boring!.bore_diameter_mm).toBeCloseTo(38.05, 2);
    // Z-transfer face stock = OP2_FACE_STOCK_MM = 0.5
    expect(d.z_transfer!.op2_face_stock_mm).toBe(0.5);
  });

  it("tight concentricity (<10µm) selects the indicator_alignment strategy", async () => {
    const r = await invokeHandler(turningHandler, "lathe_multiop_plan", {
      part_length_mm: 60,
      max_od_mm: 30,
      concentricity_mm: 0.005, // 5µm — below the 0.010 switch point
      features: [
        { id: "od1", type: "od_turn", position: "chuck_end", diameter_mm: 28 },
        { id: "tail_face", type: "face", position: "tailstock_end", requires_facing: true },
      ],
    });
    expect(r.success).toBe(true);
    const d = r.data as MultiOpResult;
    expect(d.needs_flip).toBe(true);
    expect(d.concentricity!.method).toBe("indicator_alignment");
    expect(d.concentricity!.target_tir_mm).toBe(0.005);
  });

  it("loose concentricity selects soft_jaw_bore_to_od (default 0.025)", async () => {
    const r = await invokeHandler(turningHandler, "lathe_multiop_plan", {
      part_length_mm: 60,
      max_od_mm: 30,
      features: [
        { id: "od1", type: "od_turn", position: "chuck_end", diameter_mm: 28 },
        { id: "tail_thread", type: "thread", position: "tailstock_end", has_threads: true },
      ],
    });
    expect(r.success).toBe(true);
    const d = r.data as MultiOpResult;
    expect(d.concentricity!.method).toBe("soft_jaw_bore_to_od");
    expect(d.concentricity!.target_tir_mm).toBe(0.025);
    // Threaded Op2 feature must inject a thread_od op into the Op2 plan.
    expect(d.op2!.operations).toContain("thread_od");
  });

  it("through feature is classified 'either' and stays on Op1 (no flip)", async () => {
    const r = await invokeHandler(turningHandler, "lathe_multiop_plan", {
      part_length_mm: 50,
      max_od_mm: 20,
      features: [
        { id: "thru", type: "thru_bore", position: "through", is_through: true, is_bore: true },
      ],
    });
    expect(r.success).toBe(true);
    const d = r.data as MultiOpResult;
    expect(d.needs_flip).toBe(false);
    expect(d.op1.features).toContain("thru");
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MOP — prism_turning :: lathe_softjaw_boring", () => {
  it("Fanuc dialect emits a G71/G70 rough-finish bore cycle", async () => {
    const r = await invokeHandler(turningHandler, "lathe_softjaw_boring", {
      bore_diameter_mm: 50, bore_depth_mm: 15, controller: "fanuc",
    });
    expect(r.success).toBe(true);
    const d = r.data as SoftJawProgram;
    expect(d.bore_diameter_mm).toBe(50);
    expect(d.bore_depth_mm).toBe(15);
    expect(d.bore_tolerance_mm).toBe(0.025);
    expect(d.gcode).toContain("G71");
    expect(d.gcode).toContain("G70");
  });

  it("Okuma dialect emits GROV/GFIN instead of G71/G70", async () => {
    const r = await invokeHandler(turningHandler, "lathe_softjaw_boring", {
      bore_diameter_mm: 42, bore_depth_mm: 12, controller: "okuma",
    });
    expect(r.success).toBe(true);
    const d = r.data as SoftJawProgram;
    expect(d.gcode).toContain("GROV");
    expect(d.gcode).toContain("GFIN");
    expect(d.gcode).not.toContain("G71");
  });

  it("Siemens dialect emits CYCLE95", async () => {
    const r = await invokeHandler(turningHandler, "lathe_softjaw_boring", {
      bore_diameter_mm: 60, bore_depth_mm: 20, controller: "siemens",
    });
    expect(r.success).toBe(true);
    const d = r.data as SoftJawProgram;
    expect(d.gcode).toContain("CYCLE95");
  });

  it("defaults to the Fanuc dialect when controller is omitted", async () => {
    const r = await invokeHandler(turningHandler, "lathe_softjaw_boring", {
      bore_diameter_mm: 35, bore_depth_mm: 10,
    });
    expect(r.success).toBe(true);
    const d = r.data as SoftJawProgram;
    expect(d.gcode).toContain("G71");
    expect(d.notes.length).toBeGreaterThan(0);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MOP — dispatcher-boundary rejection", () => {
  it("rejects a multiop_plan with no features (success !== true)", async () => {
    const r = await invokeHandler(turningHandler, "lathe_multiop_plan", {
      part_length_mm: 50, max_od_mm: 30, features: [],
    });
    expect(r.success).not.toBe(true);
  });

  it("rejects a softjaw_boring with negative bore_diameter (success !== true)", async () => {
    const r = await invokeHandler(turningHandler, "lathe_softjaw_boring", {
      bore_diameter_mm: -5, bore_depth_mm: 15,
    });
    expect(r.success).not.toBe(true);
  });
});
