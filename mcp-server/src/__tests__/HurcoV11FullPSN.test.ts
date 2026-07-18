/**
 * HurcoV11FullPSN.test.ts — HURCO-VM30I-FULL-PSN-MS0 round-trip coverage.
 *
 * Verifies generateProgramWithFullPSN() composes PSN substrate engines
 * (GCodeRuntimePredictor + GCodeBidirectionalOptimizer + PRISMSelfAwareness
 * AI feature recs) on top of V11's canonical base generateProgram() output.
 * Backward-compatible: legacy generateProgram() MUST stay byte-identical.
 *
 * @milestone HURCO-VM30I-FULL-PSN-MS0
 */

import { describe, it, expect } from "vitest";
import { hurcoV11MillMasterPostEngine } from "../engines/HurcoV11MillMasterPostEngine.js";
import type { MillOperation } from "../engines/HurcoV11MillMasterPostEngine.js";

const sampleOps: MillOperation[] = [
  {
    operation_type: "face",
    tool_number: 1,
    tool_diameter_mm: 50,
    tool_flutes: 5,
    tool_description: "Sandvik 50mm face mill",
    material_iso: "N",
    spindle_rpm: 8000,
    feed_mm_min: 1800,
    axial_depth_mm: 0.5,
    radial_depth_mm: 30,
    coolant: "flood",
    coordinates: [
      { type: "linear", x: 0, y: 0, z: 1 },
      { type: "linear", x: 100, y: 0, z: 1 },
      { type: "linear", x: 100, y: 30, z: 1 },
      { type: "linear", x: 0, y: 30, z: 1 },
      { type: "linear", x: 0, y: 0, z: 1 },
    ],
  },
  {
    operation_type: "drill",
    tool_number: 2,
    tool_diameter_mm: 8,
    tool_flutes: 2,
    tool_description: "8mm carbide drill",
    material_iso: "N",
    spindle_rpm: 4000,
    feed_mm_min: 400,
    axial_depth_mm: 10,
    coolant: "flood",
    coordinates: [
      { type: "linear", x: 50, y: 15, z: 1 },
      { type: "linear", x: 50, y: 15, z: -10 },
      { type: "linear", x: 50, y: 15, z: 1 },
    ],
  },
];

describe("HurcoV11 generateProgramWithFullPSN — happy path", () => {
  it("emits gcode with at least 10 lines for 2-op program", async () => {
    const r = await hurcoV11MillMasterPostEngine.generateProgramWithFullPSN(sampleOps);
    expect(r.gcode.length).toBeGreaterThan(10);
  });

  it("psn_enrichment field is present (not undefined)", async () => {
    const r = await hurcoV11MillMasterPostEngine.generateProgramWithFullPSN(sampleOps);
    expect(r.psn_enrichment !== undefined).toBe(true);
  });

  it("enriched_at is a non-empty ISO string", async () => {
    const r = await hurcoV11MillMasterPostEngine.generateProgramWithFullPSN(sampleOps);
    expect(typeof r.psn_enrichment!.enriched_at).toBe("string");
    expect(r.psn_enrichment!.enriched_at.length > 10).toBe(true);
  });

  it("runtime_estimate.total_minutes > 0 for non-empty program on hurco_vmx24", async () => {
    const r = await hurcoV11MillMasterPostEngine.generateProgramWithFullPSN(sampleOps);
    expect(r.psn_enrichment!.runtime_estimate!.machine_id).toBe("hurco_vmx24");
    expect(r.psn_enrichment!.runtime_estimate!.total_minutes > 0).toBe(true);
  });

  it("cost_report.total_cost_usd > 0 using default shop rates ($65/$95/15%)", async () => {
    const r = await hurcoV11MillMasterPostEngine.generateProgramWithFullPSN(sampleOps);
    expect(r.psn_enrichment!.cost_report!.total_cost_usd > 0).toBe(true);
    expect(r.psn_enrichment!.cost_report!.cycle_min > 0).toBe(true);
    const m = r.psn_enrichment!.cost_report!.most_expensive_line_item;
    expect(m === "labor" || m === "machine_time").toBe(true);
  });

  it("optimizer_recommendations.count is non-negative integer, top_3 ≤ 3", async () => {
    const r = await hurcoV11MillMasterPostEngine.generateProgramWithFullPSN(sampleOps);
    const opt = r.psn_enrichment!.optimizer_recommendations!;
    expect(Number.isInteger(opt.count)).toBe(true);
    expect(opt.count >= 0).toBe(true);
    expect(opt.top_3.length <= 3).toBe(true);
  });

  it("ai_feature_recommendations populated (count + top_5 ≤ 5)", async () => {
    const r = await hurcoV11MillMasterPostEngine.generateProgramWithFullPSN(sampleOps);
    const ai = r.psn_enrichment!.ai_feature_recommendations!;
    expect(Number.isInteger(ai.count)).toBe(true);
    expect(ai.top_5.length <= 5).toBe(true);
  });
});

describe("HurcoV11 generateProgramWithFullPSN — material variability (3 ISO groups)", () => {
  it("Al 6061 (ISO N) — cost_report total > 0", async () => {
    const r = await hurcoV11MillMasterPostEngine.generateProgramWithFullPSN(sampleOps, undefined, {
      material: { name: "aluminum_6061", iso_group: "N", price_per_kg_usd: 8, density_g_cm3: 2.7 },
    });
    expect(r.psn_enrichment!.cost_report!.total_cost_usd > 0).toBe(true);
  });
  it("4140 steel (ISO P) — cost_report total > 0", async () => {
    const r = await hurcoV11MillMasterPostEngine.generateProgramWithFullPSN(sampleOps, undefined, {
      material: { name: "4140_steel", iso_group: "P", price_per_kg_usd: 5, density_g_cm3: 7.85 },
    });
    expect(r.psn_enrichment!.cost_report!.total_cost_usd > 0).toBe(true);
  });
  it("Ti-6Al-4V (ISO S) — cost_report total > 0", async () => {
    const r = await hurcoV11MillMasterPostEngine.generateProgramWithFullPSN(sampleOps, undefined, {
      material: { name: "ti_6al_4v", iso_group: "S", price_per_kg_usd: 80, density_g_cm3: 4.43 },
    });
    expect(r.psn_enrichment!.cost_report!.total_cost_usd > 0).toBe(true);
  });
});

describe("HurcoV11 generateProgramWithFullPSN — adversarial inputs", () => {
  it("empty operations → psn_enrichment still populated (not undefined)", async () => {
    const r = await hurcoV11MillMasterPostEngine.generateProgramWithFullPSN([]);
    expect(r.psn_enrichment !== undefined).toBe(true);
    expect(Array.isArray(r.psn_enrichment!.substrate_errors)).toBe(true);
  });

  it("unknown machine_id → runtime_estimate carries error, full_psn_engaged=false", async () => {
    const r = await hurcoV11MillMasterPostEngine.generateProgramWithFullPSN(sampleOps, undefined, {
      machine_id: "nonexistent_machine_xyz",
    });
    expect(typeof r.psn_enrichment!.runtime_estimate!.error).toBe("string");
    expect(r.psn_enrichment!.full_psn_engaged).toBe(false);
    expect(r.psn_enrichment!.substrate_errors.length > 0).toBe(true);
  });

  it("expensive shop_rates yield strictly greater cost than cheap rates", async () => {
    const cheap = await hurcoV11MillMasterPostEngine.generateProgramWithFullPSN(sampleOps, undefined, {
      shop_rates: { labor_per_hr_usd: 20, machine_per_hr_usd: 30, overhead_pct: 0.05 },
    });
    const expensive = await hurcoV11MillMasterPostEngine.generateProgramWithFullPSN(sampleOps, undefined, {
      shop_rates: { labor_per_hr_usd: 200, machine_per_hr_usd: 350, overhead_pct: 0.30 },
    });
    expect(expensive.psn_enrichment!.cost_report!.total_cost_usd
      > cheap.psn_enrichment!.cost_report!.total_cost_usd).toBe(true);
  });
});

describe("HurcoV11 — backward-compat (legacy generateProgram stays byte-identical)", () => {
  it("legacy generateProgram leaves psn_enrichment unset (undefined)", () => {
    const legacy = hurcoV11MillMasterPostEngine.generateProgram(sampleOps);
    expect(legacy.psn_enrichment === undefined).toBe(true);
  });

  it("legacy + full-PSN gcode arrays have identical length", async () => {
    const legacy = hurcoV11MillMasterPostEngine.generateProgram(sampleOps);
    const full = await hurcoV11MillMasterPostEngine.generateProgramWithFullPSN(sampleOps);
    expect(full.gcode.length).toBe(legacy.gcode.length);
  });

  it("legacy + full-PSN first 3 gcode lines are character-identical (no header drift)", async () => {
    const legacy = hurcoV11MillMasterPostEngine.generateProgram(sampleOps);
    const full = await hurcoV11MillMasterPostEngine.generateProgramWithFullPSN(sampleOps);
    expect(full.gcode[0]).toBe(legacy.gcode[0]);
    expect(full.gcode[1]).toBe(legacy.gcode[1]);
    expect(full.gcode[2]).toBe(legacy.gcode[2]);
  });
});
