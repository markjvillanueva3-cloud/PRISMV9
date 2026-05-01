/**
 * Tests for Workholding & Fixture Engine Batch 13:
 * FixtureDesign, SoftJawProfile, MagneticChuck, TombstoneLayout,
 * Workholding, ThreeDPrintedFixture, WeldPrep, DigitalTwin
 */
import { describe, it, expect } from "vitest";
import { fixtureDesignEngine } from "../engines/FixtureDesignEngine.js";
import { softJawProfileEngine } from "../engines/SoftJawProfileEngine.js";
import { magneticChuckEngine } from "../engines/MagneticChuckEngine.js";
import { tombstoneLayoutEngine } from "../engines/TombstoneLayoutEngine.js";
import { workholdingEngine } from "../engines/WorkholdingEngine.js";
import { threeDPrintedFixtureEngine } from "../engines/ThreeDPrintedFixtureEngine.js";
import { weldPrepEngine } from "../engines/WeldPrepEngine.js";
import { digitalTwinEngine } from "../engines/DigitalTwinEngine.js";

// ── Fixture Design ──────────────────────────────────────────────
describe("FixtureDesignEngine", () => {
  const part = { shape: "prismatic" as const, length_mm: 200, width_mm: 100, height_mm: 50, weight_kg: 8, material_iso_group: "P" };
  const loads = { max_force_N: 2000, force_direction: "tangential" as const };

  it("recommends fixtures", () => {
    const r = fixtureDesignEngine.recommend(part, loads);
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].safety_factor).toBeGreaterThan(0);
  });

  it("validates fixture setup", () => {
    const r = fixtureDesignEngine.validate(part, loads, "vise", 0.05);
    expect(r.valid).toBeDefined();
    expect(r.safety_factor).toBeGreaterThan(0);
  });

  it("calculates clamp force", () => {
    const r = fixtureDesignEngine.clampForce(2000, "P", "vise", true, 2);
    expect(r.required_force_N).toBeGreaterThan(0);
    expect(r.safety_factor).toBeGreaterThanOrEqual(2.5);
    expect(r.safe).toBeDefined();
  });

  it("calculates deflection", () => {
    const r = fixtureDesignEngine.deflection(part, loads, "vise", 0.05);
    expect(r.max_deflection_mm).toBeGreaterThanOrEqual(0);
    expect(r.acceptable).toBeDefined();
  });
});

// ── Soft Jaw Profile ────────────────────────────────────────────
describe("SoftJawProfileEngine", () => {
  it("designs soft jaw profile", () => {
    const r = softJawProfileEngine.design({
      workpiece_shape: "round",
      workpiece_dimension_mm: 50,
      workpiece_height_mm: 30,
      workpiece_material: "steel",
      jaw_material: "6061_aluminum",
      num_jaws: 3,
      chuck_or_vise: "chuck",
      clamping_force_N: 8000,
      grip_depth_mm: 10,
      surface_finish_critical: false,
    });
    expect(r.profile).toBeDefined();
    expect(r.bore_diameter_mm).toBeGreaterThan(0);
    expect(r.contact_area_mm2).toBeGreaterThan(0);
    expect(r.marring_risk).toBeDefined();
  });

  it("critical finish selects contour profile", () => {
    const r = softJawProfileEngine.design({
      workpiece_shape: "round",
      workpiece_dimension_mm: 50,
      workpiece_height_mm: 30,
      workpiece_material: "aluminum",
      jaw_material: "6061_aluminum",
      num_jaws: 3,
      chuck_or_vise: "chuck",
      clamping_force_N: 5000,
      grip_depth_mm: 10,
      surface_finish_critical: true,
    });
    expect(r.profile).toBe("contour");
  });
});

// ── Magnetic Chuck ──────────────────────────────────────────────
describe("MagneticChuckEngine", () => {
  it("calculates magnetic chuck holding force", () => {
    const r = magneticChuckEngine.calculate({
      chuck_type: "permanent",
      chuck_pull_force_N_per_cm2: 120,
      workpiece_length_mm: 200,
      workpiece_width_mm: 100,
      workpiece_thickness_mm: 20,
      workpiece_material: "steel",
      workpiece_weight_N: 30,
      contact_area_pct: 100,
      cutting_force_tangential_N: 200,
      cutting_force_normal_N: 100,
      operation: "surface_grinding",
      surface_roughness_Ra_um: 0.8,
    });
    expect(r.holding_force_N).toBeGreaterThan(0);
    expect(r.safety_factor).toBeGreaterThan(0);
    expect(r.is_safe).toBeDefined();
  });

  it("low contact area reduces safety factor", () => {
    const full = magneticChuckEngine.calculate({
      chuck_type: "permanent", chuck_pull_force_N_per_cm2: 120,
      workpiece_length_mm: 200, workpiece_width_mm: 100, workpiece_thickness_mm: 20,
      workpiece_material: "steel", workpiece_weight_N: 30, contact_area_pct: 100,
      cutting_force_tangential_N: 200, cutting_force_normal_N: 100,
      operation: "surface_grinding", surface_roughness_Ra_um: 0.8,
    });
    const partial = magneticChuckEngine.calculate({
      chuck_type: "permanent", chuck_pull_force_N_per_cm2: 120,
      workpiece_length_mm: 200, workpiece_width_mm: 100, workpiece_thickness_mm: 20,
      workpiece_material: "steel", workpiece_weight_N: 30, contact_area_pct: 30,
      cutting_force_tangential_N: 200, cutting_force_normal_N: 100,
      operation: "surface_grinding", surface_roughness_Ra_um: 0.8,
    });
    expect(full.safety_factor).toBeGreaterThan(partial.safety_factor);
  });
});

// ── Tombstone Layout ────────────────────────────────────────────
describe("TombstoneLayoutEngine", () => {
  it("calculates tombstone layout", () => {
    const r = tombstoneLayoutEngine.layout({
      tombstone_faces: 4, face_width_mm: 400, face_height_mm: 400,
      part_width_mm: 80, part_height_mm: 60, part_depth_mm: 40, part_weight_kg: 1.5,
      machining_time_per_part_min: 5, tool_change_time_sec: 8, index_time_sec: 5,
      load_unload_time_per_part_sec: 30, pallet_change_time_sec: 15,
      clearance_mm: 20, max_table_load_kg: 500, spindle_reach_mm: 500,
    });
    expect(r.total_parts).toBeGreaterThan(0);
    expect(r.parts_per_face).toBeGreaterThan(0);
    expect(r.parts_per_hour).toBeGreaterThan(0);
    expect(r.throughput_improvement_pct).toBeGreaterThan(0);
  });
});

// ── Workholding (Physics) ───────────────────────────────────────
describe("WorkholdingEngine", () => {
  const forces = { Fc: 500, Ff: 200, Fp: 150 };
  const device = { type: "VICE_SERRATED" as const };
  const op = { operationType: "MILLING" as const, cuttingForces: forces, forceApplicationPoint: { x: 50, y: 25, z: 0 } };

  it("calculates clamp force required", () => {
    const r = workholdingEngine.calculateClampForceRequired(forces, device, op);
    expect(r).toBeDefined();
  });

  it("calculates pullout resistance", () => {
    const config = {
      device, clampLocations: [{ id: "c1", x: 0, y: 0, z: 0, forceDirection: "DOWN" as const, clampForce: 5000 }],
      partOrientation: "HORIZONTAL" as const,
    };
    const r = workholdingEngine.calculatePulloutResistance(500, config, device);
    expect(r).toBeDefined();
  });

  it("analyzes liftoff moment", () => {
    const config = {
      device, clampLocations: [{ id: "c1", x: 0, y: 0, z: 0, forceDirection: "DOWN" as const, clampForce: 5000 }],
      partOrientation: "HORIZONTAL" as const,
    };
    const workpiece = { material: "steel", elasticModulus: 200, length: 100, width: 50, height: 30 };
    const r = workholdingEngine.analyzeLiftoffMoment(forces, op, config, workpiece);
    expect(r).toBeDefined();
  });
});

// ── 3D-Printed Fixture ──────────────────────────────────────────
describe("ThreeDPrintedFixtureEngine", () => {
  it("evaluates 3D-printed fixture feasibility", () => {
    const r = threeDPrintedFixtureEngine.evaluate({
      process: "FDM", material: "PETG",
      fixture_volume_cm3: 200, max_cutting_force_N: 300,
      max_temperature_C: 40, coolant_exposure: true,
      required_accuracy_mm: 0.1, batch_size: 10,
      conventional_cost_USD: 500, conventional_lead_days: 10,
    });
    expect(r.feasible).toBeDefined();
    expect(r.recommended_infill_pct).toBeGreaterThan(0);
    expect(r.total_cost_USD).toBeGreaterThan(0);
    expect(r.cost_savings_pct).toBeDefined();
  });

  it("metal DMLS has higher cost but better strength", () => {
    const fdm = threeDPrintedFixtureEngine.evaluate({
      process: "FDM", material: "PETG",
      fixture_volume_cm3: 100, max_cutting_force_N: 200,
      max_temperature_C: 40, coolant_exposure: false,
      required_accuracy_mm: 0.2, batch_size: 1,
      conventional_cost_USD: 300, conventional_lead_days: 7,
    });
    const metal = threeDPrintedFixtureEngine.evaluate({
      process: "DMLS", material: "AlSi10Mg",
      fixture_volume_cm3: 100, max_cutting_force_N: 200,
      max_temperature_C: 40, coolant_exposure: false,
      required_accuracy_mm: 0.05, batch_size: 1,
      conventional_cost_USD: 300, conventional_lead_days: 7,
    });
    expect(metal.material_cost_USD).toBeGreaterThan(fdm.material_cost_USD);
  });
});

// ── Weld Prep ───────────────────────────────────────────────────
describe("WeldPrepEngine", () => {
  it("calculates V-groove weld prep", () => {
    const r = weldPrepEngine.calculate({
      joint_type: "butt", groove_type: "V",
      plate_thickness_mm: 12, material: "mild_steel",
      weld_process: "GMAW",
    });
    expect(r.bevel_angle_deg).toBeGreaterThan(0);
    expect(r.cross_section_area_mm2).toBeGreaterThan(0);
    expect(r.filler_metal_kg_per_m).toBeGreaterThan(0);
    expect(r.standard_reference).toBeDefined();
  });

  it("thicker plate = larger cross section", () => {
    const thin = weldPrepEngine.calculate({
      joint_type: "butt", groove_type: "V",
      plate_thickness_mm: 6, material: "mild_steel", weld_process: "GMAW",
    });
    const thick = weldPrepEngine.calculate({
      joint_type: "butt", groove_type: "V",
      plate_thickness_mm: 25, material: "mild_steel", weld_process: "GMAW",
    });
    expect(thick.cross_section_area_mm2).toBeGreaterThan(thin.cross_section_area_mm2);
  });
});

// ── Digital Twin ────────────────────────────────────────────────
describe("DigitalTwinEngine", () => {
  it("creates a machine twin", () => {
    const r = digitalTwinEngine.create("TEST-001", "Test Mill", "VMC-500");
    expect(r.machine_id).toBe("TEST-001");
    expect(r.state).toBeDefined();
    expect(r.health).toBeDefined();
    expect(r.performance).toBeDefined();
  });

  it("predicts maintenance needs", () => {
    digitalTwinEngine.create("TEST-002", "Test Mill 2", "VMC-500");
    const r = digitalTwinEngine.predict("TEST-002");
    expect(Array.isArray(r)).toBe(true);
    // Freshly created twin may have no predictions yet (no wear data)
  });

  it("simulates parameter changes", () => {
    digitalTwinEngine.create("TEST-003", "Test Mill 3", "VMC-500");
    const r = digitalTwinEngine.simulate("TEST-003", "spindle_speed", 20);
    expect(r.scenario).toBe("spindle_speed");
    expect(r.change_pct).toBeDefined();
    expect(r.recommendation).toBeDefined();
  });
});
