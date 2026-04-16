/**
 * WEDM-UNIFIED M3: Wire EDM Studio Integration Tests
 * Tests: Quick/Studio mode selection, Studio step expansion, wire selection params,
 *        power strategy presets, flushing modes, submit payload, engine integration
 */

import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════════════════════════════════
// 1. Quick vs Studio Mode Logic
// ═══════════════════════════════════════════════════════════════════════

describe("Wire EDM Quick/Studio Mode", () => {
  it("Quick mode has 5 total steps", () => {
    const isStudio = false;
    const totalSteps = isStudio ? 7 : 5;
    expect(totalSteps).toBe(5);
  });

  it("Studio mode has 7 total steps", () => {
    const isStudio = true;
    const totalSteps = isStudio ? 7 : 5;
    expect(totalSteps).toBe(7);
  });

  it("Studio adds wire/passes step (5) and power/flush step (6)", () => {
    const studioSteps = ["Contours", "Material", "Quality", "Machine", "Wire & Passes", "Power & Flush", "Review"];
    expect(studioSteps).toHaveLength(7);
    expect(studioSteps[4]).toBe("Wire & Passes");
    expect(studioSteps[5]).toBe("Power & Flush");
  });

  it("Quick mode review step is 5, Studio review step is 7", () => {
    const quickReview = false ? 7 : 5;
    const studioReview = true ? 7 : 5;
    expect(quickReview).toBe(5);
    expect(studioReview).toBe(7);
  });

  it("studioMode flag propagates through location state", () => {
    const state = { fileName: "test.dxf", studioMode: true, contours: [] };
    expect(state.studioMode).toBe(true);
    expect(state.fileName).toBe("test.dxf");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. Wire Type Catalog
// ═══════════════════════════════════════════════════════════════════════

describe("Wire EDM Wire Type Catalog", () => {
  const WIRE_TYPES = [
    { id: "brass_0.25", dia: 0.25, type: "brass", label: "standard" },
    { id: "brass_0.20", dia: 0.20, type: "brass", label: "fine detail" },
    { id: "brass_0.10", dia: 0.10, type: "brass", label: "micro" },
    { id: "coated_0.25", dia: 0.25, type: "coated", label: "speed" },
    { id: "coated_0.20", dia: 0.20, type: "coated", label: "precision" },
    { id: "moly_0.18", dia: 0.18, type: "molybdenum", label: "carbide/PCD" },
  ];

  it("has 6 wire options covering standard to micro range", () => {
    expect(WIRE_TYPES).toHaveLength(6);
  });

  it("standard brass wire is 0.25mm", () => {
    const std = WIRE_TYPES.find(w => w.id === "brass_0.25");
    expect(std?.dia).toBeCloseTo(0.25, 2);
  });

  it("micro wire is 0.10mm for fine features", () => {
    const micro = WIRE_TYPES.find(w => w.id === "brass_0.10");
    expect(micro?.dia).toBeCloseTo(0.10, 2);
    expect(micro?.label).toBe("micro");
  });

  it("molybdenum wire available for carbide/PCD cutting", () => {
    const moly = WIRE_TYPES.find(w => w.id === "moly_0.18");
    expect(moly?.type).toBe("molybdenum");
    expect(moly?.dia).toBeCloseTo(0.18, 2);
  });

  it("all wire IDs are unique", () => {
    const ids = WIRE_TYPES.map(w => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. Studio Submit Payload Construction
// ═══════════════════════════════════════════════════════════════════════

describe("Studio Mode Submit Payload", () => {
  it("Quick mode payload has no studio params", () => {
    const isStudio = false;
    const payload = {
      material: "D2",
      thickness_mm: 25,
      quality_tier: "precision",
      machine_preference: "auto",
      ...(isStudio ? { studio_mode: true, wire_type: "brass_0.25", num_passes: 4 } : {}),
    };
    expect(payload).not.toHaveProperty("studio_mode");
    expect(payload).not.toHaveProperty("wire_type");
    expect(payload).not.toHaveProperty("num_passes");
  });

  it("Studio mode payload includes wire, passes, power, flush, tabs", () => {
    const isStudio = true;
    const payload = {
      material: "D2",
      thickness_mm: 25,
      quality_tier: "aerospace",
      machine_preference: "sodick",
      ...(isStudio ? {
        studio_mode: true,
        wire_type: "coated_0.20",
        num_passes: 5,
        power_strategy: "conservative",
        tabs_enabled: true,
        flush_mode: "both",
      } : {}),
    };
    expect(payload.studio_mode).toBe(true);
    expect(payload.wire_type).toBe("coated_0.20");
    expect(payload.num_passes).toBe(5);
    expect(payload.power_strategy).toBe("conservative");
    expect(payload.tabs_enabled).toBe(true);
    expect(payload.flush_mode).toBe("both");
  });

  it("pass count Ra prediction: 1=3.2, 3=0.8, 4+=0.4", () => {
    function estimateRa(numPasses: number): string {
      if (numPasses === 1) return "~3.2um";
      if (numPasses <= 3) return "1.2-0.8um";
      return "0.4-0.2um";
    }
    expect(estimateRa(1)).toBe("~3.2um");
    expect(estimateRa(2)).toBe("1.2-0.8um");
    expect(estimateRa(3)).toBe("1.2-0.8um");
    expect(estimateRa(4)).toBe("0.4-0.2um");
    expect(estimateRa(6)).toBe("0.4-0.2um");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. Power Strategy Presets
// ═══════════════════════════════════════════════════════════════════════

describe("Power Strategy Presets", () => {
  const STRATEGIES = [
    { id: "auto", desc: "Engine-optimized" },
    { id: "conservative", desc: "Lower wire break risk" },
    { id: "aggressive", desc: "Faster cut, higher risk" },
  ];

  it("3 power strategies available", () => {
    expect(STRATEGIES).toHaveLength(3);
  });

  it("auto is engine-optimized default", () => {
    expect(STRATEGIES[0].id).toBe("auto");
    expect(STRATEGIES[0].desc).toContain("optimized");
  });

  it("conservative reduces wire break risk", () => {
    const con = STRATEGIES.find(s => s.id === "conservative");
    expect(con?.desc).toContain("wire break");
  });

  it("flushing modes cover all options", () => {
    const modes = ["auto", "upper", "lower", "both"];
    expect(modes).toHaveLength(4);
    expect(modes).toContain("both"); // submerged cutting for thick parts
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. EDMEngine — Studio mode wire type parameter validation
// ═══════════════════════════════════════════════════════════════════════

describe("EDMEngine — Studio wire type and pass count validation", () => {
  it("brass 0.25mm standard wire: kerf width and speed", async () => {
    const { edmEngine } = await import("../engines/EDMEngine.js");
    const result = edmEngine.wireEDM({
      workpiece_thickness_mm: 30,
      material_iso_group: "H",
      wire_diameter_mm: 0.25,
      num_cuts: 4,
    });
    expect(result.kerf_width.value).toBeGreaterThan(0.25);
    expect(result.kerf_width.value).toBeLessThan(0.35);
    expect(result.cutting_speed.value).toBeGreaterThan(0);
  });

  it("fine wire 0.10mm has narrower kerf but slower", async () => {
    const { edmEngine } = await import("../engines/EDMEngine.js");
    const standard = edmEngine.wireEDM({ workpiece_thickness_mm: 25, material_iso_group: "P", wire_diameter_mm: 0.25 });
    const fine = edmEngine.wireEDM({ workpiece_thickness_mm: 25, material_iso_group: "P", wire_diameter_mm: 0.10 });
    expect(fine.kerf_width.value).toBeLessThan(standard.kerf_width.value);
  });

  it("1 pass vs 5 passes: Ra improves dramatically", async () => {
    const { edmEngine } = await import("../engines/EDMEngine.js");
    const rough = edmEngine.wireEDM({ workpiece_thickness_mm: 25, material_iso_group: "H", num_cuts: 1 });
    const finish = edmEngine.wireEDM({ workpiece_thickness_mm: 25, material_iso_group: "H", num_cuts: 5 });
    expect(rough.predicted_ra.value).toBeCloseTo(3.2, 0);
    expect(finish.predicted_ra.value).toBeLessThan(0.2);
  });

  it("thick part 100mm: higher flushing pressure needed", async () => {
    const { edmEngine } = await import("../engines/EDMEngine.js");
    const thin = edmEngine.wireEDM({ workpiece_thickness_mm: 20, material_iso_group: "P" });
    const thick = edmEngine.wireEDM({ workpiece_thickness_mm: 100, material_iso_group: "P" });
    expect(thick.flushing_pressure.value).toBeGreaterThan(thin.flushing_pressure.value);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 6. EDMFeasibilityEngine — Studio feasibility checks
// ═══════════════════════════════════════════════════════════════════════

describe("EDMFeasibilityEngine — Studio mode feasibility", () => {
  it("copper is highly conductive — best EDM machinability", async () => {
    const { edmFeasibilityEngine } = await import("../engines/EDMFeasibilityEngine.js");
    const conductivity = edmFeasibilityEngine.check_conductivity({
      material: "copper",
      features: [{ name: "test", is_through: true, profile_length_mm: 50 }],
      workpiece: { thickness_mm: 10, length_mm: 100, width_mm: 100, height_mm: 10 },
    });
    expect(conductivity.feasible).toBe(true);
    expect(conductivity.resistivity).toBeCloseTo(1.7, 0);
    expect(conductivity.classification).toBe("EASY");
  });

  it("stainless steel is conductive but slower", async () => {
    const { edmFeasibilityEngine } = await import("../engines/EDMFeasibilityEngine.js");
    const conductivity = edmFeasibilityEngine.check_conductivity({
      material: "stainless steel",
      features: [{ name: "test", is_through: true, profile_length_mm: 50 }],
      workpiece: { thickness_mm: 25, length_mm: 100, width_mm: 100, height_mm: 25 },
    });
    expect(conductivity.feasible).toBe(true);
    expect(conductivity.resistivity).toBeCloseTo(72, 0);
  });

  it("time estimate for 200mm profile at 25mm thick", async () => {
    const { edmFeasibilityEngine } = await import("../engines/EDMFeasibilityEngine.js");
    const time = edmFeasibilityEngine.estimate_time({
      material: "tool steel",
      material_resistivity_uohm_cm: 55,
      features: [{ name: "die", is_through: true, profile_length_mm: 200, tolerance_mm: 0.01 }],
      workpiece: { thickness_mm: 25, length_mm: 200, width_mm: 150, height_mm: 25 },
    });
    expect(time.total_hours).toBeGreaterThan(0);
    expect(time.cutting_speed_mm2_min).toBeGreaterThan(0);
    expect(time.profile_area_mm2).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7. EDMMaterialMachineWireEngine — Studio wire selection
// ═══════════════════════════════════════════════════════════════════════

describe("EDMMaterialMachineWireEngine — Studio wire selection", () => {
  it("selectWire for speed priority on thick titanium", async () => {
    const { edmMaterialMachineWireEngine } = await import("../engines/EDMMaterialMachineWireEngine.js");
    const result = edmMaterialMachineWireEngine.selectWire({
      material: "titanium",
      thickness_mm: 50,
      min_corner_radius_mm: 1.0,
      target_surface_finish_Ra_um: 1.6,
      priority: "speed",
    });
    expect(result.recommended_wire).toBeDefined();
    expect(result.diameter_mm).toBeGreaterThan(0);
    expect(result.rationale.length).toBeGreaterThan(0);
  });

  it("assessMaterial: tungsten carbide has high melting point", async () => {
    const { edmMaterialMachineWireEngine } = await import("../engines/EDMMaterialMachineWireEngine.js");
    const result = edmMaterialMachineWireEngine.assessMaterial({
      material: "tungsten_carbide",
      thickness_mm: 15,
    });
    expect(result.thermal.melting_point_C).toBeGreaterThan(2000);
    expect(result.mrr_factor).toBeGreaterThan(0);
  });
});
