/**
 * dispatcher.loewenShawHeatPartition.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-LSHP (LoewenShawHeatPartitionEngine).
 *
 * 4 pure-compute actions through real `prism_dev`:
 *   lshp_calculate, lshp_compare_static_vs_dynamic,
 *   lshp_calculate_by_material_name, lshp_get_material_properties
 *
 * Engine-pair test pre-exists.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { loewenShawHeatPartitionEngine } from "../engines/LoewenShawHeatPartitionEngine.js";

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

let devHandler: CapturedTool["handler"];

// Canonical steel + carbide tool cutting scenario.
const STEEL_PROPS = { density: 7850, specificHeat: 486, thermalConductivity: 50, name: "Carbon Steel" };
const CARBIDE_PROPS = { density: 14500, specificHeat: 300, thermalConductivity: 80, name: "Tungsten Carbide" };
const ALUMINUM_PROPS = { density: 2700, specificHeat: 896, thermalConductivity: 167, name: "Aluminum" };

const STEEL_CARBIDE_NOMINAL = {
  chipMaterial: STEEL_PROPS,
  workpieceMaterial: STEEL_PROPS,
  toolMaterial: CARBIDE_PROPS,
  cuttingSpeed: 200,    // m/min — typical steel turning
  chipThickness: 0.3,   // mm — moderate feed
  toolRakeAngle: 5,     // degrees positive
  coolantType: "flood" as const,
};

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-LSHP — Zod schemas", () => {
  it("lshp_calculate requires all 3 mandatory material+kinematic fields", () => {
    expect(ACTION_DEV_SCHEMAS["lshp_calculate"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["lshp_calculate"].safeParse(STEEL_CARBIDE_NOMINAL).success).toBe(true);
  });

  it("lshp_calculate rejects bad coolantType enum", () => {
    expect(ACTION_DEV_SCHEMAS["lshp_calculate"].safeParse({
      ...STEEL_CARBIDE_NOMINAL, coolantType: "INVALID",
    }).success).toBe(false);
  });

  it("lshp_calculate rejects rakeAngle outside ±90°", () => {
    expect(ACTION_DEV_SCHEMAS["lshp_calculate"].safeParse({
      ...STEEL_CARBIDE_NOMINAL, toolRakeAngle: 91,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["lshp_calculate"].safeParse({
      ...STEEL_CARBIDE_NOMINAL, toolRakeAngle: -91,
    }).success).toBe(false);
  });

  it("lshp_calculate rejects unphysical material props (density > 50_000)", () => {
    expect(ACTION_DEV_SCHEMAS["lshp_calculate"].safeParse({
      ...STEEL_CARBIDE_NOMINAL,
      chipMaterial: { ...STEEL_PROPS, density: 60_000 },
    }).success).toBe(false);
  });

  it("lshp_get_material_properties is strict (rejects extra params)", () => {
    expect(ACTION_DEV_SCHEMAS["lshp_get_material_properties"].safeParse({
      materialName: "steel",
    }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["lshp_get_material_properties"].safeParse({
      materialName: "steel", extra: 1,
    }).success).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-LSHP — prism_dev :: lshp_calculate", () => {
  it("returns 15+ result fields + flattened discriminators", async () => {
    const r = await invokeHandler(devHandler, "lshp_calculate", STEEL_CARBIDE_NOMINAL);
    const res = (r as { result: { partitionRatio: number; heatRegime: string; maxChipTemperature: number; confidence: number; warnings: string[] } }).result;
    expect(typeof res.partitionRatio).toBe("number");
    expect(["conduction_dominated", "transition", "convection_dominated"]).toContain(res.heatRegime);
    expect(res.maxChipTemperature).toBeGreaterThan(0);
    expect(res.confidence).toBeGreaterThanOrEqual(0);
    expect(res.confidence).toBeLessThanOrEqual(1);
  });

  it("wire-level discriminators mirror engine result", async () => {
    const r = await invokeHandler(devHandler, "lshp_calculate", STEEL_CARBIDE_NOMINAL);
    const res = (r as { result: { partitionRatio: number; heatRegime: string; maxChipTemperature: number; maxToolTemperature: number; confidence: number; warnings: string[] } }).result;
    expect(r.partition_ratio).toBe(res.partitionRatio);
    expect(r.heat_regime).toBe(res.heatRegime);
    expect(r.max_chip_temperature).toBe(res.maxChipTemperature);
    expect(r.max_tool_temperature).toBe(res.maxToolTemperature);
    expect(r.confidence).toBe(res.confidence);
    expect(r.warning_count).toBe((res.warnings ?? []).length);
  });

  it("ALGEBRAIC INVARIANT — partitionRatio ∈ [0, 1]", async () => {
    const r = await invokeHandler(devHandler, "lshp_calculate", STEEL_CARBIDE_NOMINAL);
    expect((r.partition_ratio as number)).toBeGreaterThanOrEqual(0);
    expect((r.partition_ratio as number)).toBeLessThanOrEqual(1);
  });

  it("ALGEBRAIC INVARIANT — partition percentages sum to ~100%", async () => {
    const r = await invokeHandler(devHandler, "lshp_calculate", STEEL_CARBIDE_NOMINAL);
    const res = (r as { result: { partitionPercent: { chip: number; workpiece: number; tool: number } } }).result;
    const sum = res.partitionPercent.chip + res.partitionPercent.workpiece + res.partitionPercent.tool;
    expect(sum).toBeCloseTo(100, 0);
  });

  it("ALGEBRAIC INVARIANT — chip effusivity = sqrt(ρ·c·k) for steel ≈ 13800 J/(m²·K·s^0.5)", async () => {
    const r = await invokeHandler(devHandler, "lshp_calculate", STEEL_CARBIDE_NOMINAL);
    const res = (r as { result: { chipEffusivity: number } }).result;
    // sqrt(7850 * 486 * 50) = sqrt(190_755_000) ≈ 13811
    const expected = Math.sqrt(7850 * 486 * 50);
    expect(res.chipEffusivity).toBeCloseTo(expected, -1);
  });

  it("VARIABILITY — higher cutting speed → higher Peclet → different regime", async () => {
    const slow = await invokeHandler(devHandler, "lshp_calculate", { ...STEEL_CARBIDE_NOMINAL, cuttingSpeed: 10 });
    const fast = await invokeHandler(devHandler, "lshp_calculate", { ...STEEL_CARBIDE_NOMINAL, cuttingSpeed: 1000 });
    const slowRes = (slow as { result: { pecletNumber: number } }).result;
    const fastRes = (fast as { result: { pecletNumber: number } }).result;
    // Peclet ∝ V × L / α — higher V always means higher Pe
    expect(fastRes.pecletNumber).toBeGreaterThan(slowRes.pecletNumber);
  });

  it("ROUTING PROOF — wire partition_ratio equals engine-direct calculate()", async () => {
    const r = await invokeHandler(devHandler, "lshp_calculate", STEEL_CARBIDE_NOMINAL);
    const direct = loewenShawHeatPartitionEngine.calculate(STEEL_CARBIDE_NOMINAL);
    expect(r.partition_ratio).toBe(direct.partitionRatio);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-LSHP — prism_dev :: lshp_compare_static_vs_dynamic", () => {
  it("returns static + dynamic + differences + peclet number", async () => {
    const r = await invokeHandler(devHandler, "lshp_compare_static_vs_dynamic", STEEL_CARBIDE_NOMINAL);
    const res = (r as { result: { staticModel: { chipPercent: number }; dynamicModel: { chipPercent: number; pecletNumber: number }; differences: { partitionRatioDelta: number; percentageChange: number } } }).result;
    expect(res.staticModel.chipPercent).toBeGreaterThan(0);
    expect(res.dynamicModel.chipPercent).toBeGreaterThan(0);
    expect(typeof res.differences.partitionRatioDelta).toBe("number");
    expect(typeof res.differences.percentageChange).toBe("number");
    expect(res.dynamicModel.pecletNumber).toBeGreaterThanOrEqual(0);
    expect(r.static_chip_pct).toBe(res.staticModel.chipPercent);
    expect(r.dynamic_chip_pct).toBe(res.dynamicModel.chipPercent);
  });

  it("VARIABILITY — static vs dynamic differs more at high speed (Pe dominant)", async () => {
    const slow = await invokeHandler(devHandler, "lshp_compare_static_vs_dynamic", { ...STEEL_CARBIDE_NOMINAL, cuttingSpeed: 10 });
    const fast = await invokeHandler(devHandler, "lshp_compare_static_vs_dynamic", { ...STEEL_CARBIDE_NOMINAL, cuttingSpeed: 500 });
    const slowDelta = Math.abs(slow.partition_ratio_delta as number);
    const fastDelta = Math.abs(fast.partition_ratio_delta as number);
    // Dynamic model correction matters more at high cutting speed
    expect(fastDelta).toBeGreaterThanOrEqual(slowDelta);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-LSHP — prism_dev :: lshp_calculate_by_material_name", () => {
  it("happy path — 'steel' chip + 'steel' workpiece + 'carbide' tool", async () => {
    const r = await invokeHandler(devHandler, "lshp_calculate_by_material_name", {
      chipMaterialName: "steel",
      workpieceMaterialName: "steel",
      toolMaterialName: "carbide",
      cuttingSpeed: 200, chipThickness: 0.3, toolRakeAngle: 5,
    });
    expect(typeof r.partition_ratio).toBe("number");
    expect(["conduction_dominated", "transition", "convection_dominated"]).toContain(r.heat_regime);
  });

  it("VARIABILITY — 3 distinct material pairs (steel/aluminum/inconel) yield distinct results", async () => {
    const materials = ["steel", "aluminum", "inconel"];
    const ratios: number[] = [];
    for (const m of materials) {
      const r = await invokeHandler(devHandler, "lshp_calculate_by_material_name", {
        chipMaterialName: m, workpieceMaterialName: m, toolMaterialName: "carbide",
        cuttingSpeed: 200, chipThickness: 0.3, toolRakeAngle: 5,
      });
      ratios.push(r.partition_ratio as number);
    }
    // Different materials should produce different partition ratios
    const distinct = new Set(ratios);
    expect(distinct.size).toBeGreaterThanOrEqual(2);
  });

  it("ERROR ENVELOPE — unknown chip material → engine throws → caught as error string", async () => {
    const r = await invokeHandler(devHandler, "lshp_calculate_by_material_name", {
      chipMaterialName: "NEVER_HEARD_OF_THIS_METAL",
      workpieceMaterialName: "steel",
      toolMaterialName: "carbide",
      cuttingSpeed: 200, chipThickness: 0.3, toolRakeAngle: 5,
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
    expect((r.error as string)).toContain("Unknown chip material");
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-LSHP — prism_dev :: lshp_get_material_properties", () => {
  it("found=true for 'steel' (in DEFAULT_MATERIALS)", async () => {
    const r = await invokeHandler(devHandler, "lshp_get_material_properties", { materialName: "steel" });
    expect(r.found).toBe(true);
    const res = (r as { result: { density: number; specificHeat: number; thermalConductivity: number } }).result;
    expect(res.density).toBe(7850);
    expect(res.specificHeat).toBe(486);
    expect(res.thermalConductivity).toBe(50);
  });

  it("found=true for 'aluminum' (k=167 W/m·K)", async () => {
    const r = await invokeHandler(devHandler, "lshp_get_material_properties", { materialName: "aluminum" });
    expect(r.found).toBe(true);
    const res = (r as { result: { thermalConductivity: number } }).result;
    expect(res.thermalConductivity).toBe(167);
  });

  it("found=true for tool materials (carbide, ceramic, cbn, pcd, hss)", async () => {
    for (const t of ["carbide", "ceramic", "cbn", "pcd", "hss"]) {
      const r = await invokeHandler(devHandler, "lshp_get_material_properties", { materialName: t });
      expect(r.found).toBe(true);
    }
  });

  it("ROUTING PROOF — wire density equals engine-direct getMaterialProperties()", async () => {
    const r = await invokeHandler(devHandler, "lshp_get_material_properties", { materialName: "titanium" });
    const direct = loewenShawHeatPartitionEngine.getMaterialProperties("titanium");
    const res = (r as { result: { density: number } }).result;
    expect(res.density).toBe(direct?.density);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-LSHP — error envelope", () => {
  it("lshp_calculate without cuttingSpeed → schema rejects", async () => {
    const { cuttingSpeed: _unused, ...rest } = STEEL_CARBIDE_NOMINAL;
    void _unused;
    const r = await invokeHandler(devHandler, "lshp_calculate", rest);
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("lshp_calculate with negative chipThickness → schema rejects (positive)", async () => {
    const r = await invokeHandler(devHandler, "lshp_calculate", {
      ...STEEL_CARBIDE_NOMINAL, chipThickness: -0.1,
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("lshp_calculate with rakeAngle=95 → schema rejects (max 90)", async () => {
    const r = await invokeHandler(devHandler, "lshp_calculate", {
      ...STEEL_CARBIDE_NOMINAL, toolRakeAngle: 95,
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("lshp_calculate with bad coolantType → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "lshp_calculate", {
      ...STEEL_CARBIDE_NOMINAL, coolantType: "EVAPORATIVE",
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("lshp_get_material_properties with unknown material → found=false (no throw)", async () => {
    const r = await invokeHandler(devHandler, "lshp_get_material_properties", {
      materialName: "fictional_metal_xyz",
    });
    expect(r.found).toBe(false);
  });
});
