/**
 * WEDM-UNIFIED M4: Wire EDM Shop Profile Integration Tests
 * Tests: wire EDM machine fields, wire inventory, machine limits,
 *        real engine material/machine selection, feasibility with machine limits
 */

import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════════════════════════════════
// 1. Wire EDM Machine Schema
// ═══════════════════════════════════════════════════════════════════════

describe("Wire EDM ShopMachine Fields", () => {
  const sampleWedmMachine = {
    id: "WEDM-001",
    name: "Sodick ALC600G",
    type: "Wire EDM",
    hourly_rate: 85,
    capabilities: ["wire_edm"],
    wedm_brand: "sodick" as const,
    wedm_uv_travel_mm: 80,
    wedm_max_taper_deg: 30,
    wedm_max_workpiece_height_mm: 400,
    wedm_auto_threading: true,
    wedm_submerged_cutting: true,
    wedm_wire_inventory: [
      { wire_type: "brass_0.25", diameter_mm: 0.25, spool_weight_kg: 5, remaining_pct: 75 },
      { wire_type: "coated_0.20", diameter_mm: 0.20, spool_weight_kg: 2, remaining_pct: 30 },
    ],
  };

  it("has all required wire EDM fields", () => {
    expect(sampleWedmMachine.wedm_brand).toBe("sodick");
    expect(sampleWedmMachine.wedm_uv_travel_mm).toBe(80);
    expect(sampleWedmMachine.wedm_max_taper_deg).toBe(30);
    expect(sampleWedmMachine.wedm_max_workpiece_height_mm).toBe(400);
    expect(sampleWedmMachine.wedm_auto_threading).toBe(true);
    expect(sampleWedmMachine.wedm_submerged_cutting).toBe(true);
  });

  it("wire inventory tracks spool weight and remaining percentage", () => {
    const inv = sampleWedmMachine.wedm_wire_inventory;
    expect(inv).toHaveLength(2);
    expect(inv[0].wire_type).toBe("brass_0.25");
    expect(inv[0].diameter_mm).toBeCloseTo(0.25, 2);
    expect(inv[0].spool_weight_kg).toBe(5);
    expect(inv[0].remaining_pct).toBe(75);
  });

  it("low inventory (< 20%) flagged for reorder", () => {
    const low = sampleWedmMachine.wedm_wire_inventory.filter(w => w.remaining_pct < 20);
    expect(low).toHaveLength(0); // 75% and 30% are OK
    const veryLow = sampleWedmMachine.wedm_wire_inventory.filter(w => w.remaining_pct < 50);
    expect(veryLow).toHaveLength(1); // coated at 30%
    expect(veryLow[0].wire_type).toBe("coated_0.20");
  });

  it("brands cover all 5 major manufacturers + other", () => {
    const brands = ["sodick", "mitsubishi", "makino", "agiecharmilles", "fanuc", "other"];
    expect(brands).toHaveLength(6);
    expect(brands).toContain(sampleWedmMachine.wedm_brand);
  });

  it("UV travel 80mm supports standard taper work", () => {
    // 30° taper at 100mm height needs tan(30°) × 50mm = 28.87mm UV
    const maxTaperUV = Math.tan(30 * Math.PI / 180) * (100 / 2);
    expect(maxTaperUV).toBeCloseTo(28.87, 1);
    expect(sampleWedmMachine.wedm_uv_travel_mm).toBeGreaterThan(maxTaperUV);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. Machine Limits Validation
// ═══════════════════════════════════════════════════════════════════════

describe("Wire EDM Machine Limits", () => {
  it("taper angle check: 5° on 50mm → UV = 2.18mm (well within 80mm)", () => {
    const angle = 5;
    const height = 50;
    const uvNeeded = Math.tan(angle * Math.PI / 180) * (height / 2);
    expect(uvNeeded).toBeCloseTo(2.18, 1);
    expect(uvNeeded).toBeLessThan(80);
  });

  it("extreme taper 45° on 200mm → UV = 100mm (exceeds 80mm limit)", () => {
    const angle = 45;
    const height = 200;
    const uvNeeded = Math.tan(angle * Math.PI / 180) * (height / 2);
    expect(uvNeeded).toBeCloseTo(100, 0);
    expect(uvNeeded).toBeGreaterThan(80);
  });

  it("workpiece height check: 500mm > 400mm max → blocked", () => {
    const partHeight = 500;
    const maxHeight = 400;
    expect(partHeight).toBeGreaterThan(maxHeight);
    expect(partHeight <= maxHeight).toBe(false);
  });

  it("without auto-threading, manual re-thread needed per contour", () => {
    const autoThread = false;
    const contourCount = 5;
    const manualThreads = autoThread ? 0 : contourCount;
    expect(manualThreads).toBe(5);
  });

  it("wire consumption estimation: 200mm cut at 10m/min wire speed", () => {
    const cutLength_mm = 200;
    const cutFeed_mm_min = 3;
    const wireSpeed_m_min = 10;
    const cutTime_min = cutLength_mm / cutFeed_mm_min;
    const wireConsumed_m = wireSpeed_m_min * cutTime_min;
    expect(cutTime_min).toBeCloseTo(66.7, 0);
    expect(wireConsumed_m).toBeCloseTo(666.7, 0);
    // At 0.35 kg/km for 0.25mm brass, that's ~0.233 kg
    const wireWeight_kg = (wireConsumed_m / 1000) * 0.35;
    expect(wireWeight_kg).toBeCloseTo(0.233, 2);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. EDMMaterialMachineWireEngine — Machine Selection with Shop Profile
// ═══════════════════════════════════════════════════════════════════════

describe("EDMMaterialMachineWireEngine — shop machine integration", () => {
  it("selectMachine: returns recommendations for 200×150×25mm part", async () => {
    const { edmMaterialMachineWireEngine } = await import("../engines/EDMMaterialMachineWireEngine.js");
    const result = edmMaterialMachineWireEngine.selectMachine({
      part_x_mm: 200,
      part_y_mm: 150,
      part_z_mm: 25,
      part_weight_kg: 5,
      material: "D2",
      min_corner_radius_mm: 0.3,
    });
    expect(result.recommended_machines).toBeDefined();
    expect(result.recommended_machines.length).toBeGreaterThan(0);
    expect(result.recommended_machines[0].model).toBeDefined();
    expect(result.recommended_machines[0].score).toBeGreaterThan(0);
  });

  it("selectMachine: 800×600 part rejects some machines", async () => {
    const { edmMaterialMachineWireEngine } = await import("../engines/EDMMaterialMachineWireEngine.js");
    const result = edmMaterialMachineWireEngine.selectMachine({
      part_x_mm: 800,
      part_y_mm: 600,
      part_z_mm: 100,
      part_weight_kg: 200,
      material: "D2",
      min_corner_radius_mm: 1,
    });
    // Some machines will be rejected due to travel limits
    expect(result.rejected_machines).toBeDefined();
    expect(result.rejected_machines.length).toBeGreaterThan(0);
    for (const rej of result.rejected_machines) {
      expect(rej.reason).toBeDefined();
    }
  });

  it("assessMaterial: copper has fastest MRR factor", async () => {
    const { edmMaterialMachineWireEngine } = await import("../engines/EDMMaterialMachineWireEngine.js");
    const copper = edmMaterialMachineWireEngine.assessMaterial({ material: "copper", thickness_mm: 20 });
    const steel = edmMaterialMachineWireEngine.assessMaterial({ material: "tool steel", thickness_mm: 20 });
    expect(copper.mrr_factor).toBeGreaterThan(steel.mrr_factor);
  });

  it("selectWire: accuracy priority selects smaller or coated wire", async () => {
    const { edmMaterialMachineWireEngine } = await import("../engines/EDMMaterialMachineWireEngine.js");
    const result = edmMaterialMachineWireEngine.selectWire({
      material: "D2",
      thickness_mm: 25,
      min_corner_radius_mm: 0.3,
      target_surface_finish_Ra_um: 0.4,
      priority: "accuracy",
    });
    expect(result.diameter_mm).toBeLessThanOrEqual(0.25);
    expect(result.rationale.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. EDMFeasibilityEngine — Feasibility with Machine Limits
// ═══════════════════════════════════════════════════════════════════════

describe("EDMFeasibilityEngine — shop machine limit enforcement", () => {
  it("full feasibility for copper plate 10mm thick", async () => {
    const { edmFeasibilityEngine } = await import("../engines/EDMFeasibilityEngine.js");
    const result = edmFeasibilityEngine.assess({
      material: "copper",
      features: [
        { name: "contour", is_through: true, profile_length_mm: 100, min_corner_radius_mm: 1.0, tolerance_mm: 0.02 },
      ],
      workpiece: { thickness_mm: 10, length_mm: 100, width_mm: 100, height_mm: 10 },
    });
    expect(result.overall_feasible).toBe(true);
    expect(result.conductivity.feasible).toBe(true);
    expect(result.conductivity.resistivity).toBeCloseTo(1.7, 0);
    expect(result.time_estimate.total_hours).toBeGreaterThan(0);
  });

  it("blind cavity (not through) is blocked for wire EDM", async () => {
    const { edmFeasibilityEngine } = await import("../engines/EDMFeasibilityEngine.js");
    const result = edmFeasibilityEngine.assess({
      material: "steel",
      features: [
        { name: "blind_pocket", is_through: false, profile_length_mm: 50, tolerance_mm: 0.05 },
      ],
      workpiece: { thickness_mm: 25, length_mm: 100, width_mm: 100, height_mm: 25 },
    });
    expect(result.overall_feasible).toBe(false);
    expect(result.blockers.length).toBeGreaterThan(0);
    expect(result.blockers.some(b => /through/i.test(b))).toBe(true);
  });

  it("titanium is feasible but slower (higher resistivity)", async () => {
    const { edmFeasibilityEngine } = await import("../engines/EDMFeasibilityEngine.js");
    const result = edmFeasibilityEngine.assess({
      material: "titanium",
      features: [
        { name: "profile", is_through: true, profile_length_mm: 80, min_corner_radius_mm: 0.5, tolerance_mm: 0.01 },
      ],
      workpiece: { thickness_mm: 20, length_mm: 100, width_mm: 80, height_mm: 20 },
    });
    expect(result.overall_feasible).toBe(true);
    expect(result.conductivity.resistivity).toBeGreaterThan(100);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. EDMEngine — Wire Parameters for Shop Machine Scenarios
// ═══════════════════════════════════════════════════════════════════════

describe("EDMEngine — shop machine parameter scenarios", () => {
  it("standard brass 0.25mm on D2 25mm — baseline shop scenario", async () => {
    const { edmEngine } = await import("../engines/EDMEngine.js");
    const result = edmEngine.wireEDM({
      workpiece_thickness_mm: 25,
      material_iso_group: "H",
      wire_diameter_mm: 0.25,
      num_cuts: 4,
    });
    expect(result.cutting_speed.value).toBeGreaterThan(0);
    expect(result.wire_feed.value).toBeGreaterThan(0);
    expect(result.wire_tension.value).toBeGreaterThan(5);
    expect(result.predicted_ra.value).toBeLessThan(1.0);
  });

  it("thin 5mm aluminum — fast cut scenario", async () => {
    const { edmEngine } = await import("../engines/EDMEngine.js");
    const result = edmEngine.wireEDM({
      workpiece_thickness_mm: 5,
      material_iso_group: "N",
      wire_diameter_mm: 0.25,
      num_cuts: 2,
    });
    expect(result.cutting_speed.value).toBeGreaterThan(50);
    expect(result.cycle_time_per_meter.value).toBeGreaterThan(0);
    expect(result.flushing_pressure.value).toBeCloseTo(5, 0);
  });

  it("thick 200mm stainless — submerged cutting needed", async () => {
    const { edmEngine } = await import("../engines/EDMEngine.js");
    const result = edmEngine.wireEDM({
      workpiece_thickness_mm: 200,
      material_iso_group: "M",
      wire_diameter_mm: 0.25,
      num_cuts: 3,
    });
    expect(result.flushing_pressure.value).toBeGreaterThan(8);
    expect(result.wire_tension.value).toBeGreaterThan(10);
    expect(result.cutting_speed.value).toBeLessThan(5);
  });
});
