/**
 * dispatcher.turningWearPrediction.test.ts — round-trip integration coverage
 * for WIRE-UNWIRED-MS0/U-WIRE-TWP dispatcher wiring (3 actions).
 *
 * Drives all 3 public surfaces through the real `prism_turning` dispatcher:
 *   - turning_wear_per_op      → accumulatePerOperation (U-LPR14)
 *   - turning_wear_chip_form   → predictChipForm        (U-LPR15)
 *   - turning_wear_batch_life  → predictBatchLife       (U-LPR16)
 *
 * The engine-direct suite (`turning-wear-prediction.test.ts`) already proves
 * the Usui/Kienzle/Loewen-Shaw numerics. This file pins five additional
 * contracts that ONLY a dispatcher round-trip can verify:
 *   1. All 3 actions register on the prism_turning Zod enum.
 *   2. The dispatcher wraps every engine result as { success, data }.
 *   3. The numeric-keyed `station_wear` Record survives JSON round-trip
 *      (numbers become string keys through JSON.stringify but the inner
 *      shape stays intact — wire test pins the look-up by station id).
 *   4. The predictChipForm signature is positional (iso, Vc, f, ap) but
 *      the dispatcher reads them from a struct — the schema/dispatcher
 *      reshaping must not silently drop a field.
 *   5. The Vc-adjustment optimization branch only fires when
 *      target_parts_per_edge is supplied AND differs from the current PPE.
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

interface PerOpResult {
  operations: Array<{
    operation_id: string;
    insert_station: number;
    cutting_time_min: number;
    wear_um: number;
    Fc_N: number;
    temperature_C: number;
    chip_form: { chip_type: string; primary_wear_mode: string; chipbreaker_class: string };
  }>;
  station_wear: Record<string, { total_wear_um: number; total_time_min: number; ops: string[] }>;
  stations_at_risk: number[];
  source: string;
}

interface ChipFormResult {
  chip_type: string;
  primary_wear_mode: string;
  secondary_wear_mode: string;
  chip_control_difficulty: number;
  chipbreaker_class: string;
  rationale: string;
}

interface BatchLifeResult {
  parts_per_edge: number;
  insert_changes_per_batch: number;
  change_schedule: Array<{ station: number; parts_per_edge: number; changes_needed: number }>;
  cost: { total_insert_cost: number; cost_per_part_tooling: number; edges_consumed: number };
  optimization?: {
    current_parts_per_edge: number;
    target_parts_per_edge: number;
    suggested_vc_adjustment_pct: number;
    suggested_vc_m_min: number;
  };
}

const ROUGH_OD_BASELINE = {
  id: "op_rough_od_1",
  type: "od_rough" as const,
  insert_station: 1,
  diameter_mm: 50,
  cut_length_mm: 100,
  ap_mm: 2.0,
  f_mm_rev: 0.25,
  Vc_m_min: 220,
  passes: 2,
};

const FINISH_OD_BASELINE = {
  id: "op_finish_od_1",
  type: "od_finish" as const,
  insert_station: 2,
  diameter_mm: 50,
  cut_length_mm: 100,
  ap_mm: 0.4,
  f_mm_rev: 0.12,
  Vc_m_min: 260,
  passes: 1,
};

let turningHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerTurningDispatcher(srv as unknown as Parameters<typeof registerTurningDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_turning");
  if (!t) throw new Error("prism_turning not registered");
  turningHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-TWP — all 3 schemas registered", () => {
  const ACTIONS = [
    "turning_wear_per_op",
    "turning_wear_chip_form",
    "turning_wear_batch_life",
  ] as const;

  for (const a of ACTIONS) {
    it(`${a} schema is a usable Zod object`, () => {
      expect(typeof TURNING_ACTION_SCHEMAS[a].safeParse).toBe("function");
    });
  }
});

describe("WIRE-UNWIRED-MS0/U-WIRE-TWP — schema rejection paths", () => {
  it("per_op rejects unknown iso_group", () => {
    expect(TURNING_ACTION_SCHEMAS.turning_wear_per_op.safeParse({
      iso_group: "Z", operations: [ROUGH_OD_BASELINE],
    }).success).toBe(false);
  });

  it("per_op rejects empty operations array", () => {
    expect(TURNING_ACTION_SCHEMAS.turning_wear_per_op.safeParse({
      iso_group: "P", operations: [],
    }).success).toBe(false);
  });

  it("per_op rejects operation with negative ap_mm", () => {
    expect(TURNING_ACTION_SCHEMAS.turning_wear_per_op.safeParse({
      iso_group: "P",
      operations: [{ ...ROUGH_OD_BASELINE, ap_mm: -1 }],
    }).success).toBe(false);
  });

  it("per_op rejects operation with zero passes", () => {
    expect(TURNING_ACTION_SCHEMAS.turning_wear_per_op.safeParse({
      iso_group: "P",
      operations: [{ ...ROUGH_OD_BASELINE, passes: 0 }],
    }).success).toBe(false);
  });

  it("chip_form rejects missing vc_m_min", () => {
    expect(TURNING_ACTION_SCHEMAS.turning_wear_chip_form.safeParse({
      iso_group: "P", f_mm_rev: 0.2, ap_mm: 1.0,
    }).success).toBe(false);
  });

  it("chip_form rejects zero f_mm_rev (must be strictly positive)", () => {
    expect(TURNING_ACTION_SCHEMAS.turning_wear_chip_form.safeParse({
      iso_group: "P", vc_m_min: 200, f_mm_rev: 0, ap_mm: 1.0,
    }).success).toBe(false);
  });

  it("batch_life rejects missing batch_quantity", () => {
    expect(TURNING_ACTION_SCHEMAS.turning_wear_batch_life.safeParse({
      iso_group: "P", operations: [ROUGH_OD_BASELINE],
    }).success).toBe(false);
  });

  it("batch_life rejects non-integer batch_quantity", () => {
    expect(TURNING_ACTION_SCHEMAS.turning_wear_batch_life.safeParse({
      iso_group: "P", operations: [ROUGH_OD_BASELINE], batch_quantity: 1.5,
    }).success).toBe(false);
  });

  it("batch_life accepts a minimal valid payload", () => {
    expect(TURNING_ACTION_SCHEMAS.turning_wear_batch_life.safeParse({
      iso_group: "P", operations: [ROUGH_OD_BASELINE], batch_quantity: 100,
    }).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-TWP — prism_turning :: turning_wear_per_op", () => {
  it("returns success:true with per-op + per-station wear", async () => {
    const r = await invokeHandler(turningHandler, "turning_wear_per_op", {
      iso_group: "P",
      operations: [ROUGH_OD_BASELINE, FINISH_OD_BASELINE],
    });
    expect(r.success).toBe(true);
    const data = r.data as PerOpResult;
    expect(data.operations.length).toBe(2);
    expect(data.operations[0]!.operation_id).toBe("op_rough_od_1");
    expect(data.operations[1]!.operation_id).toBe("op_finish_od_1");
    expect(data.source).toContain("TurningWearPredictionEngine");
  });

  it("each operation reports finite cutting_time, wear, force, temperature", async () => {
    const r = await invokeHandler(turningHandler, "turning_wear_per_op", {
      iso_group: "M",  // stainless — higher wear
      operations: [ROUGH_OD_BASELINE],
    });
    expect(r.success).toBe(true);
    const data = r.data as PerOpResult;
    const op = data.operations[0]!;
    expect(Number.isFinite(op.cutting_time_min)).toBe(true);
    expect(Number.isFinite(op.wear_um)).toBe(true);
    expect(Number.isFinite(op.Fc_N)).toBe(true);
    expect(Number.isFinite(op.temperature_C)).toBe(true);
    expect(op.Fc_N).toBeGreaterThan(0);    // cutting force must be positive
    expect(op.wear_um).toBeGreaterThan(0); // some wear must accumulate
    expect(op.cutting_time_min).toBeGreaterThan(0);
  });

  it("numeric station_wear keys survive JSON round-trip as string keys", async () => {
    const r = await invokeHandler(turningHandler, "turning_wear_per_op", {
      iso_group: "P",
      operations: [
        { ...ROUGH_OD_BASELINE, insert_station: 1 },
        { ...FINISH_OD_BASELINE, insert_station: 2 },
      ],
    });
    expect(r.success).toBe(true);
    const data = r.data as PerOpResult;
    // JSON.stringify coerces numeric Record keys → strings on the wire.
    // Assert by sub-field content, not by toBeDefined() weak assertion.
    expect(data.station_wear["1"]!.ops).toEqual(["op_rough_od_1"]);
    expect(data.station_wear["2"]!.ops).toEqual(["op_finish_od_1"]);
    expect(data.station_wear["1"]!.total_wear_um).toBeGreaterThan(0);
    expect(data.station_wear["2"]!.total_wear_um).toBeGreaterThan(0);
  });

  it("Fc scales with depth-of-cut per Kienzle Fc = kc1.1·ap·f^(1-mc)", async () => {
    const r1 = await invokeHandler(turningHandler, "turning_wear_per_op", {
      iso_group: "P",
      operations: [{ ...ROUGH_OD_BASELINE, ap_mm: 1.0 }],
    });
    const r2 = await invokeHandler(turningHandler, "turning_wear_per_op", {
      iso_group: "P",
      operations: [{ ...ROUGH_OD_BASELINE, ap_mm: 2.0 }],
    });
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    const fc1 = (r1.data as PerOpResult).operations[0]!.Fc_N;
    const fc2 = (r2.data as PerOpResult).operations[0]!.Fc_N;
    // Kienzle is linear in ap → doubling ap must approximately double Fc.
    expect(fc2 / fc1).toBeGreaterThan(1.8);
    expect(fc2 / fc1).toBeLessThan(2.2);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-TWP — prism_turning :: turning_wear_chip_form", () => {
  it("returns chip_form classification for ISO-P at nominal Vc", async () => {
    const r = await invokeHandler(turningHandler, "turning_wear_chip_form", {
      iso_group: "P", vc_m_min: 200, f_mm_rev: 0.25, ap_mm: 2.0,
    });
    expect(r.success).toBe(true);
    const data = r.data as ChipFormResult;
    expect(data.chip_type).toBe("continuous");
    expect(["F", "M", "R"]).toContain(data.chipbreaker_class);
    expect(data.chip_control_difficulty).toBeGreaterThanOrEqual(0);
    expect(data.chip_control_difficulty).toBeLessThanOrEqual(1);
    expect(data.rationale.length).toBeGreaterThan(10);
  });

  it("low Vc (vcRatio<0.4) on P/M/N flips to built_up_edge", async () => {
    // ISO-P vc_base_roughing is in CANONICAL_MATERIAL_DB ~200; 0.3*200 = 60
    const r = await invokeHandler(turningHandler, "turning_wear_chip_form", {
      iso_group: "P", vc_m_min: 60, f_mm_rev: 0.2, ap_mm: 1.5,
    });
    expect(r.success).toBe(true);
    const data = r.data as ChipFormResult;
    expect(data.chip_type).toBe("built_up_edge");
  });

  it("aerospace superalloy ISO-S returns segmented chip + thermal-cracking wear", async () => {
    const r = await invokeHandler(turningHandler, "turning_wear_chip_form", {
      iso_group: "S", vc_m_min: 80, f_mm_rev: 0.15, ap_mm: 1.0,
    });
    expect(r.success).toBe(true);
    const data = r.data as ChipFormResult;
    expect(data.chip_type).toBe("segmented");
    expect(data.secondary_wear_mode).toContain("thermal_cracking");
  });

  it("light-cut (low f, low ap) prefers Fine chipbreaker (F)", async () => {
    const r = await invokeHandler(turningHandler, "turning_wear_chip_form", {
      iso_group: "P", vc_m_min: 250, f_mm_rev: 0.08, ap_mm: 0.3,
    });
    expect(r.success).toBe(true);
    const data = r.data as ChipFormResult;
    expect(data.chipbreaker_class).toBe("F");
  });

  it("heavy-cut (high f or high ap) prefers Roughing chipbreaker (R)", async () => {
    const r = await invokeHandler(turningHandler, "turning_wear_chip_form", {
      iso_group: "P", vc_m_min: 180, f_mm_rev: 0.5, ap_mm: 5.0,
    });
    expect(r.success).toBe(true);
    const data = r.data as ChipFormResult;
    expect(data.chipbreaker_class).toBe("R");
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-TWP — prism_turning :: turning_wear_batch_life", () => {
  it("returns parts_per_edge + cost breakdown for a baseline batch", async () => {
    const r = await invokeHandler(turningHandler, "turning_wear_batch_life", {
      iso_group: "P",
      operations: [ROUGH_OD_BASELINE, FINISH_OD_BASELINE],
      batch_quantity: 500,
    });
    expect(r.success).toBe(true);
    const data = r.data as BatchLifeResult;
    expect(data.parts_per_edge).toBeGreaterThan(0);
    expect(data.cost.edges_consumed).toBeGreaterThanOrEqual(1);
    expect(data.cost.total_insert_cost).toBeGreaterThan(0);
    expect(data.cost.cost_per_part_tooling).toBeGreaterThanOrEqual(0);
    expect(data.change_schedule.length).toBeGreaterThan(0);
  });

  it("custom insert_cost_per_edge propagates to total_insert_cost", async () => {
    const r = await invokeHandler(turningHandler, "turning_wear_batch_life", {
      iso_group: "P",
      operations: [ROUGH_OD_BASELINE],
      batch_quantity: 200,
      insert_cost_per_edge: 25.0,  // premium ceramic insert
    });
    expect(r.success).toBe(true);
    const data = r.data as BatchLifeResult;
    expect(data.cost.total_insert_cost).toBeCloseTo(
      data.cost.edges_consumed * 25.0, 2,
    );
  });

  it("Vc optimization branch fires + suggests LOWER Vc for higher target PPE", async () => {
    const r = await invokeHandler(turningHandler, "turning_wear_batch_life", {
      iso_group: "P",
      operations: [ROUGH_OD_BASELINE],
      batch_quantity: 500,
      target_parts_per_edge: 999_999,  // unreachable target forces a suggestion
    });
    expect(r.success).toBe(true);
    const data = r.data as BatchLifeResult;
    // Assert by concrete value, not toBeDefined:
    expect(data.optimization!.target_parts_per_edge).toBe(999_999);
    // Wanting more parts/edge → engine must suggest LOWER Vc (slower cut).
    expect(data.optimization!.suggested_vc_adjustment_pct).toBeLessThan(0);
    expect(data.optimization!.suggested_vc_m_min).toBeGreaterThan(0);
    expect(data.optimization!.suggested_vc_m_min).toBeLessThan(ROUGH_OD_BASELINE.Vc_m_min);
  });

  it("Vc optimization branch stays absent when target_parts_per_edge omitted", async () => {
    const r = await invokeHandler(turningHandler, "turning_wear_batch_life", {
      iso_group: "P",
      operations: [ROUGH_OD_BASELINE],
      batch_quantity: 500,
    });
    expect(r.success).toBe(true);
    const data = r.data as BatchLifeResult;
    // slimResponse strips undefined/null fields — concrete absence check:
    expect(data.optimization === undefined || data.optimization === null).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-TWP — dispatcher-boundary rejection", () => {
  it("rejects an invalid per_op payload at the dispatcher boundary (success !== true)", async () => {
    const r = await invokeHandler(turningHandler, "turning_wear_per_op", {
      iso_group: "Z",  // unknown ISO group
      operations: [ROUGH_OD_BASELINE],
    });
    expect(r.success).not.toBe(true);
  });

  it("rejects an invalid chip_form payload at the dispatcher boundary", async () => {
    const r = await invokeHandler(turningHandler, "turning_wear_chip_form", {
      iso_group: "P", vc_m_min: -1, f_mm_rev: 0.2, ap_mm: 1.0,
    });
    expect(r.success).not.toBe(true);
  });
});
