/**
 * Non-Traditional Machining Engines — 45+ tests
 *
 * Tests for:
 * - UltrasonicMachiningPhysicsEngine (Shaw model, abrasive selection, feasibility)
 * - ElectrochemicalMachiningEngine (Faraday's law, electrode design, surface quality)
 * - AbrasiveJetMachiningEngine (Finnie erosion, parameter optimization, nozzle wear)
 */

import { describe, it, expect } from "vitest";
import { UltrasonicMachiningPhysicsEngine } from "../engines/UltrasonicMachiningPhysicsEngine.js";
import { ElectrochemicalMachiningEngine } from "../engines/ElectrochemicalMachiningEngine.js";
import { AbrasiveJetMachiningEngine } from "../engines/AbrasiveJetMachiningEngine.js";

// ═══════════════════════════════════════════════════════════════════════
// USM — Ultrasonic Machining Physics
// ═══════════════════════════════════════════════════════════════════════

describe("UltrasonicMachiningPhysicsEngine", () => {
  const usm = new UltrasonicMachiningPhysicsEngine();

  // ── predictMRR (Shaw model) ──────────────────────────────────────

  describe("predictMRR", () => {
    it("should compute positive MRR for glass with boron carbide", () => {
      const r = usm.predictMRR({
        material: "glass",
        frequency_kHz: 20,
        amplitude_um: 25,
        abrasive: "boron_carbide",
        grain_size_um: 100,
        static_load_N: 10,
        tool_area_mm2: 50,
      });
      expect(r.mrr_mm3_per_min).toBeGreaterThan(0);
      expect(r.surface_roughness_Ra_um).toBeGreaterThan(0);
      expect(r.tool_wear_ratio).toBeGreaterThan(0);
      expect(r.penetration_rate_mm_per_min).toBeGreaterThan(0);
      expect(r.formula).toContain("MRR");
    });

    it("should scale MRR with amplitude^(3/2)", () => {
      const base = { material: "glass", frequency_kHz: 20, abrasive: "boron_carbide" as const, grain_size_um: 80, static_load_N: 10, tool_area_mm2: 50 };
      const r1 = usm.predictMRR({ ...base, amplitude_um: 20 });
      const r2 = usm.predictMRR({ ...base, amplitude_um: 40 });
      // MRR ∝ A^(3/2), so doubling A → 2^1.5 = 2.83× MRR
      const ratio = r2.mrr_mm3_per_min / r1.mrr_mm3_per_min;
      expect(ratio).toBeCloseTo(Math.pow(2, 1.5), 1);
    });

    it("should scale MRR linearly with frequency", () => {
      const base = { material: "glass", amplitude_um: 25, abrasive: "boron_carbide" as const, grain_size_um: 80, static_load_N: 10, tool_area_mm2: 50 };
      const r1 = usm.predictMRR({ ...base, frequency_kHz: 20 });
      const r2 = usm.predictMRR({ ...base, frequency_kHz: 40 });
      const ratio = r2.mrr_mm3_per_min / r1.mrr_mm3_per_min;
      expect(ratio).toBeCloseTo(2.0, 1);
    });

    it("should scale MRR linearly with grain size", () => {
      const base = { material: "glass", frequency_kHz: 20, amplitude_um: 25, abrasive: "boron_carbide" as const, static_load_N: 10, tool_area_mm2: 50 };
      const r1 = usm.predictMRR({ ...base, grain_size_um: 50 });
      const r2 = usm.predictMRR({ ...base, grain_size_um: 100 });
      const ratio = r2.mrr_mm3_per_min / r1.mrr_mm3_per_min;
      expect(ratio).toBeCloseTo(2.0, 1);
    });

    it("should give higher MRR for brittle materials vs ductile", () => {
      const base = { frequency_kHz: 20, amplitude_um: 25, abrasive: "boron_carbide" as const, grain_size_um: 80, static_load_N: 10, tool_area_mm2: 50 };
      const glass = usm.predictMRR({ ...base, material: "glass" });
      const steel = usm.predictMRR({ ...base, material: "steel" });
      expect(glass.mrr_mm3_per_min).toBeGreaterThan(steel.mrr_mm3_per_min);
    });

    it("should warn for out-of-range frequency", () => {
      const r = usm.predictMRR({
        material: "glass", frequency_kHz: 60, amplitude_um: 25,
        abrasive: "boron_carbide", grain_size_um: 80, static_load_N: 10, tool_area_mm2: 50,
      });
      expect(r.warnings.some(w => w.includes("frequency") || w.includes("Ultrasonic"))).toBe(true);
    });

    it("should warn for ductile material", () => {
      const r = usm.predictMRR({
        material: "steel", frequency_kHz: 20, amplitude_um: 25,
        abrasive: "boron_carbide", grain_size_um: 80, static_load_N: 10, tool_area_mm2: 50,
      });
      expect(r.warnings.some(w => w.includes("ductile"))).toBe(true);
    });

    it("should give diamond abrasive higher MRR than alumina", () => {
      const base = { material: "ceramic_alumina", frequency_kHz: 20, amplitude_um: 25, grain_size_um: 80, static_load_N: 10, tool_area_mm2: 50 };
      const diamond = usm.predictMRR({ ...base, abrasive: "diamond" });
      const alumina = usm.predictMRR({ ...base, abrasive: "alumina" });
      expect(diamond.mrr_mm3_per_min).toBeGreaterThan(alumina.mrr_mm3_per_min);
    });

    it("should compute penetration rate as MRR / tool_area", () => {
      const r = usm.predictMRR({
        material: "glass", frequency_kHz: 20, amplitude_um: 25,
        abrasive: "boron_carbide", grain_size_um: 80, static_load_N: 10, tool_area_mm2: 50,
      });
      expect(r.penetration_rate_mm_per_min).toBeCloseTo(r.mrr_mm3_per_min / 50, 5);
    });

    it("should handle unknown material gracefully (defaults to glass)", () => {
      const r = usm.predictMRR({
        material: "unobtanium", frequency_kHz: 20, amplitude_um: 25,
        abrasive: "boron_carbide", grain_size_um: 80, static_load_N: 10, tool_area_mm2: 50,
      });
      expect(r.mrr_mm3_per_min).toBeGreaterThan(0);
    });
  });

  // ── selectAbrasive ───────────────────────────────────────────────

  describe("selectAbrasive", () => {
    it("should recommend diamond for very hard materials", () => {
      const r = usm.selectAbrasive({
        workpiece_material: "sapphire",
        feature_type: "hole",
        target_Ra_um: 1.0,
        depth_mm: 3,
      });
      expect(r.recommended_abrasive).toBe("diamond");
    });

    it("should recommend boron carbide for hard ceramics", () => {
      const r = usm.selectAbrasive({
        workpiece_material: "ceramic_alumina",
        feature_type: "hole",
        target_Ra_um: 2.0,
        depth_mm: 5,
      });
      expect(r.recommended_abrasive).toBe("boron_carbide");
    });

    it("should recommend silicon carbide for medium hardness", () => {
      const r = usm.selectAbrasive({
        workpiece_material: "glass",
        feature_type: "hole",
        target_Ra_um: 2.0,
        depth_mm: 3,
      });
      expect(r.recommended_abrasive).toBe("silicon_carbide");
    });

    it("should use finer grain for lower target Ra", () => {
      const fine = usm.selectAbrasive({ workpiece_material: "glass", feature_type: "hole", target_Ra_um: 0.3, depth_mm: 3 });
      const rough = usm.selectAbrasive({ workpiece_material: "glass", feature_type: "hole", target_Ra_um: 5.0, depth_mm: 3 });
      expect(fine.grain_size_um).toBeLessThan(rough.grain_size_um);
    });

    it("should reduce grain size for contour features", () => {
      const hole = usm.selectAbrasive({ workpiece_material: "glass", feature_type: "hole", target_Ra_um: 2.0, depth_mm: 3 });
      const contour = usm.selectAbrasive({ workpiece_material: "glass", feature_type: "contour", target_Ra_um: 2.0, depth_mm: 3 });
      expect(contour.grain_size_um).toBeLessThan(hole.grain_size_um);
    });

    it("should return valid concentration and flow rate", () => {
      const r = usm.selectAbrasive({ workpiece_material: "glass", feature_type: "hole", target_Ra_um: 2.0, depth_mm: 3 });
      expect(r.concentration_pct).toBeGreaterThanOrEqual(25);
      expect(r.concentration_pct).toBeLessThanOrEqual(50);
      expect(r.slurry_flow_rate).toBeGreaterThan(0);
    });
  });

  // ── assessFeasibility ────────────────────────────────────────────

  describe("assessFeasibility", () => {
    it("should mark glass as feasible", () => {
      const r = usm.assessFeasibility({
        material: "glass", hardness_HV: 550, feature_size_mm: 5,
        aspect_ratio: 1, tolerance_mm: 0.05,
      });
      expect(r.feasible).toBe(true);
      expect(r.expected_accuracy_mm).toBeGreaterThan(0);
      expect(r.cycle_time_estimate_min).toBeGreaterThan(0);
    });

    it("should mark ductile steel as infeasible", () => {
      const r = usm.assessFeasibility({
        material: "steel", hardness_HV: 250, feature_size_mm: 5,
        aspect_ratio: 1, tolerance_mm: 0.05,
      });
      expect(r.feasible).toBe(false);
      expect(r.alternative_processes.length).toBeGreaterThan(0);
    });

    it("should flag high aspect ratio as infeasible beyond 10:1", () => {
      const r = usm.assessFeasibility({
        material: "glass", hardness_HV: 550, feature_size_mm: 2,
        aspect_ratio: 15, tolerance_mm: 0.05,
      });
      expect(r.feasible).toBe(false);
      expect(r.limitations.some(l => l.includes("Aspect ratio"))).toBe(true);
    });

    it("should flag very small features", () => {
      const r = usm.assessFeasibility({
        material: "glass", hardness_HV: 550, feature_size_mm: 0.05,
        aspect_ratio: 1, tolerance_mm: 0.01,
      });
      expect(r.feasible).toBe(false);
      expect(r.limitations.some(l => l.includes("Feature size"))).toBe(true);
    });

    it("should flag tight tolerances", () => {
      const r = usm.assessFeasibility({
        material: "glass", hardness_HV: 550, feature_size_mm: 5,
        aspect_ratio: 1, tolerance_mm: 0.002,
      });
      expect(r.feasible).toBe(false);
    });

    it("should estimate longer cycle time for harder materials", () => {
      const glass = usm.assessFeasibility({ material: "glass", hardness_HV: 550, feature_size_mm: 5, aspect_ratio: 1, tolerance_mm: 0.05 });
      const wc = usm.assessFeasibility({ material: "tungsten_carbide", hardness_HV: 1700, feature_size_mm: 5, aspect_ratio: 1, tolerance_mm: 0.05 });
      // WC has lower brittleness → slower est MRR → longer cycle
      expect(wc.cycle_time_estimate_min).toBeGreaterThan(glass.cycle_time_estimate_min);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// ECM — Electrochemical Machining
// ═══════════════════════════════════════════════════════════════════════

describe("ElectrochemicalMachiningEngine", () => {
  const ecm = new ElectrochemicalMachiningEngine();

  // ── predictMRR (Faraday) ─────────────────────────────────────────

  describe("predictMRR", () => {
    it("should compute positive MRR for steel with NaCl", () => {
      const r = ecm.predictMRR({
        material: "steel", current_A: 100, voltage_V: 12,
        gap_mm: 0.2, electrolyte: "NaCl",
      });
      expect(r.mrr_mm3_per_min).toBeGreaterThan(0);
      expect(r.current_density_A_per_cm2).toBeGreaterThan(0);
      expect(r.surface_roughness_Ra_um).toBeGreaterThan(0);
      expect(r.electrolyte_flow_requirement_lpm).toBeGreaterThanOrEqual(0.5);
      expect(r.formula).toContain("Faraday");
    });

    it("should follow Faraday's law: MRR proportional to current", () => {
      const base = { material: "steel", voltage_V: 12, gap_mm: 0.2, electrolyte: "NaCl" as const };
      const r1 = ecm.predictMRR({ ...base, current_A: 50 });
      const r2 = ecm.predictMRR({ ...base, current_A: 100 });
      const ratio = r2.mrr_mm3_per_min / r1.mrr_mm3_per_min;
      expect(ratio).toBeCloseTo(2.0, 1);
    });

    it("should compute correct Faraday MRR for known values", () => {
      // Steel: M=55.85, z=2, rho=7.85 g/cm³
      // MRR = (55.85 * 100) / (2 * 96485 * 7.85) cm³/s
      // = 5585 / 1514813.5 = 0.003687 cm³/s = 0.2212 cm³/min = 221.2 mm³/min
      const r = ecm.predictMRR({
        material: "steel", current_A: 100, voltage_V: 12,
        gap_mm: 0.2, electrolyte: "NaCl",
      });
      expect(r.mrr_mm3_per_min).toBeCloseTo(221.2, 0);
    });

    it("should give lower MRR for higher-valence materials", () => {
      // Titanium z=4 vs steel z=2: at same current, Ti MRR should be lower
      const base = { current_A: 100, voltage_V: 12, gap_mm: 0.2, electrolyte: "NaCl" as const };
      const steel = ecm.predictMRR({ ...base, material: "steel" });
      const ti = ecm.predictMRR({ ...base, material: "titanium" });
      expect(steel.mrr_mm3_per_min).toBeGreaterThan(ti.mrr_mm3_per_min);
    });

    it("should warn for small gap", () => {
      const r = ecm.predictMRR({
        material: "steel", current_A: 100, voltage_V: 12,
        gap_mm: 0.03, electrolyte: "NaCl",
      });
      expect(r.warnings.some(w => w.includes("short circuit"))).toBe(true);
    });

    it("should warn for passivation-prone material with poor electrolyte", () => {
      const r = ecm.predictMRR({
        material: "titanium", current_A: 100, voltage_V: 12,
        gap_mm: 0.2, electrolyte: "NaNO3",
      });
      expect(r.warnings.some(w => w.includes("passivation"))).toBe(true);
    });

    it("should warn for high voltage", () => {
      const r = ecm.predictMRR({
        material: "steel", current_A: 100, voltage_V: 35,
        gap_mm: 0.2, electrolyte: "NaCl",
      });
      expect(r.warnings.some(w => w.includes("hydrogen"))).toBe(true);
    });
  });

  // ── designToolElectrode ──────────────────────────────────────────

  describe("designToolElectrode", () => {
    it("should recommend copper for general applications", () => {
      const r = ecm.designToolElectrode({
        target_shape: "round pocket", depth_mm: 5, width_mm: 10, tolerance_mm: 0.1,
      });
      expect(r.electrode_material.toLowerCase()).toContain("copper");
      expect(r.gap_recommendation_mm).toBeGreaterThan(0);
      expect(r.feed_rate_mm_per_min).toBeGreaterThan(0);
    });

    it("should recommend titanium for tight tolerance", () => {
      const r = ecm.designToolElectrode({
        target_shape: "precision slot", depth_mm: 3, width_mm: 5, tolerance_mm: 0.01,
      });
      expect(r.electrode_material.toLowerCase()).toContain("titanium");
    });

    it("should use smaller gap for tighter tolerance", () => {
      const loose = ecm.designToolElectrode({ target_shape: "slot", depth_mm: 5, width_mm: 5, tolerance_mm: 0.5 });
      const tight = ecm.designToolElectrode({ target_shape: "slot", depth_mm: 5, width_mm: 5, tolerance_mm: 0.02 });
      expect(tight.gap_recommendation_mm).toBeLessThan(loose.gap_recommendation_mm);
    });

    it("should add flushing notes for deep cavities", () => {
      const r = ecm.designToolElectrode({
        target_shape: "deep cavity", depth_mm: 15, width_mm: 10, tolerance_mm: 0.1,
      });
      expect(r.electrode_shape_notes.toLowerCase()).toContain("flushing");
    });

    it("should note complexity for turbine blade shapes", () => {
      const r = ecm.designToolElectrode({
        target_shape: "turbine blade root", depth_mm: 10, width_mm: 20, tolerance_mm: 0.05,
      });
      expect(r.electrode_shape_notes.toLowerCase()).toContain("3d");
    });
  });

  // ── predictSurfaceQuality ────────────────────────────────────────

  describe("predictSurfaceQuality", () => {
    it("should predict positive Ra", () => {
      const r = ecm.predictSurfaceQuality({
        current_density: 50, gap_mm: 0.2, electrolyte_type: "NaCl",
      });
      expect(r.predicted_Ra_um).toBeGreaterThan(0);
      expect(r.stray_machining_mm).toBeGreaterThan(0);
    });

    it("should give smoother finish with NaNO3 vs NaCl", () => {
      const base = { current_density: 50, gap_mm: 0.2 };
      const nacl = ecm.predictSurfaceQuality({ ...base, electrolyte_type: "NaCl" });
      const nano3 = ecm.predictSurfaceQuality({ ...base, electrolyte_type: "NaNO3" });
      expect(nano3.predicted_Ra_um).toBeLessThan(nacl.predicted_Ra_um);
    });

    it("should improve finish with pulse ECM", () => {
      const dc = ecm.predictSurfaceQuality({
        current_density: 50, gap_mm: 0.2, electrolyte_type: "NaCl",
      });
      const pulse = ecm.predictSurfaceQuality({
        current_density: 50, gap_mm: 0.2, electrolyte_type: "NaCl",
        pulse_on_us: 100, pulse_off_us: 200,
      });
      expect(pulse.predicted_Ra_um).toBeLessThan(dc.predicted_Ra_um);
    });

    it("should reduce stray machining with pulse ECM", () => {
      const dc = ecm.predictSurfaceQuality({
        current_density: 50, gap_mm: 0.2, electrolyte_type: "NaCl",
      });
      const pulse = ecm.predictSurfaceQuality({
        current_density: 50, gap_mm: 0.2, electrolyte_type: "NaCl",
        pulse_on_us: 100, pulse_off_us: 200,
      });
      expect(pulse.stray_machining_mm).toBeLessThan(dc.stray_machining_mm);
    });

    it("should flag high hydrogen risk at high current density", () => {
      const r = ecm.predictSurfaceQuality({
        current_density: 200, gap_mm: 0.2, electrolyte_type: "NaCl",
      });
      expect(r.hydrogen_evolution_risk).toContain("high");
    });

    it("should flag passivation risk with NaNO3 at low current", () => {
      const r = ecm.predictSurfaceQuality({
        current_density: 10, gap_mm: 0.2, electrolyte_type: "NaNO3",
      });
      expect(r.passivation_risk).toContain("high");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// AJM — Abrasive Jet Machining
// ═══════════════════════════════════════════════════════════════════════

describe("AbrasiveJetMachiningEngine", () => {
  const ajm = new AbrasiveJetMachiningEngine();

  // ── predictCutting (Finnie) ──────────────────────────────────────

  describe("predictCutting", () => {
    it("should compute kerf, MRR, and Ra for mild steel", () => {
      const r = ajm.predictCutting({
        material: "mild_steel", abrasive: "garnet", pressure_MPa: 300,
        nozzle_diameter_mm: 0.75, standoff_distance_mm: 2,
        traverse_speed_mm_per_min: 200, material_thickness_mm: 10,
      });
      expect(r.kerf_width_mm).toBeGreaterThan(0);
      expect(r.taper_angle_deg).toBeGreaterThan(0);
      expect(r.mrr_mm3_per_min).toBeGreaterThan(0);
      expect(r.surface_Ra_um).toBeGreaterThan(0);
      expect(r.predicted_depth_mm).toBeGreaterThan(0);
      expect(r.formula).toContain("Finnie");
    });

    it("should predict larger kerf with wider standoff", () => {
      const base = { material: "mild_steel", abrasive: "garnet" as const, pressure_MPa: 300, nozzle_diameter_mm: 0.75, traverse_speed_mm_per_min: 200, material_thickness_mm: 10 };
      const close = ajm.predictCutting({ ...base, standoff_distance_mm: 1 });
      const far = ajm.predictCutting({ ...base, standoff_distance_mm: 8 });
      expect(far.kerf_width_mm).toBeGreaterThan(close.kerf_width_mm);
    });

    it("should cut deeper at higher pressure", () => {
      const base = { material: "mild_steel", abrasive: "garnet" as const, nozzle_diameter_mm: 0.75, standoff_distance_mm: 2, traverse_speed_mm_per_min: 200, material_thickness_mm: 50 };
      const low = ajm.predictCutting({ ...base, pressure_MPa: 200 });
      const high = ajm.predictCutting({ ...base, pressure_MPa: 400 });
      expect(high.predicted_depth_mm).toBeGreaterThan(low.predicted_depth_mm);
    });

    it("should cut glass easier than steel (lower erosion resistance)", () => {
      const base = { abrasive: "garnet" as const, pressure_MPa: 300, nozzle_diameter_mm: 0.75, standoff_distance_mm: 2, traverse_speed_mm_per_min: 200, material_thickness_mm: 10 };
      const glass = ajm.predictCutting({ ...base, material: "glass" });
      const steel = ajm.predictCutting({ ...base, material: "mild_steel" });
      expect(glass.predicted_depth_mm).toBeGreaterThan(steel.predicted_depth_mm);
    });

    it("should give silicon carbide higher MRR than garnet", () => {
      const base = { material: "mild_steel", pressure_MPa: 300, nozzle_diameter_mm: 0.75, standoff_distance_mm: 2, traverse_speed_mm_per_min: 200, material_thickness_mm: 10 };
      const garnet = ajm.predictCutting({ ...base, abrasive: "garnet" });
      const sic = ajm.predictCutting({ ...base, abrasive: "silicon_carbide" });
      expect(sic.predicted_depth_mm).toBeGreaterThan(garnet.predicted_depth_mm);
    });

    it("should warn for low pressure", () => {
      const r = ajm.predictCutting({
        material: "mild_steel", abrasive: "garnet", pressure_MPa: 80,
        nozzle_diameter_mm: 0.75, standoff_distance_mm: 2,
        traverse_speed_mm_per_min: 200, material_thickness_mm: 10,
      });
      expect(r.warnings.some(w => w.includes("100 MPa"))).toBe(true);
    });

    it("should warn if predicted depth < material thickness", () => {
      const r = ajm.predictCutting({
        material: "inconel", abrasive: "garnet", pressure_MPa: 150,
        nozzle_diameter_mm: 0.75, standoff_distance_mm: 2,
        traverse_speed_mm_per_min: 1000, material_thickness_mm: 50,
      });
      expect(r.warnings.some(w => w.includes("may not cut through"))).toBe(true);
    });

    it("should produce kerf width > nozzle diameter", () => {
      const r = ajm.predictCutting({
        material: "mild_steel", abrasive: "garnet", pressure_MPa: 300,
        nozzle_diameter_mm: 0.75, standoff_distance_mm: 2,
        traverse_speed_mm_per_min: 200, material_thickness_mm: 10,
      });
      expect(r.kerf_width_mm).toBeGreaterThan(0.75);
    });
  });

  // ── optimizeParameters ───────────────────────────────────────────

  describe("optimizeParameters", () => {
    it("should return valid parameters for medium quality", () => {
      const r = ajm.optimizeParameters({
        material: "mild_steel", thickness_mm: 25,
        target_quality: "medium", geometry: "straight",
      });
      expect(r.pressure_MPa).toBeGreaterThanOrEqual(150);
      expect(r.traverse_speed).toBeGreaterThan(0);
      expect(r.standoff_mm).toBeGreaterThan(0);
      expect(r.abrasive_flow_rate_g_per_min).toBeGreaterThan(0);
      expect(r.expected_Ra).toBeGreaterThan(0);
    });

    it("should use slower traverse for fine quality", () => {
      const base = { material: "mild_steel", thickness_mm: 25, geometry: "straight" as const };
      const fine = ajm.optimizeParameters({ ...base, target_quality: "fine" });
      const rough = ajm.optimizeParameters({ ...base, target_quality: "rough" });
      expect(fine.traverse_speed).toBeLessThan(rough.traverse_speed);
    });

    it("should give lower Ra for fine quality", () => {
      const base = { material: "mild_steel", thickness_mm: 25, geometry: "straight" as const };
      const fine = ajm.optimizeParameters({ ...base, target_quality: "fine" });
      const rough = ajm.optimizeParameters({ ...base, target_quality: "rough" });
      expect(fine.expected_Ra).toBeLessThan(rough.expected_Ra);
    });

    it("should apply corner speed reduction for corner geometry", () => {
      const straight = ajm.optimizeParameters({
        material: "mild_steel", thickness_mm: 25, target_quality: "medium", geometry: "straight",
      });
      const corner = ajm.optimizeParameters({
        material: "mild_steel", thickness_mm: 25, target_quality: "medium", geometry: "corner",
      });
      expect(straight.corner_speed_reduction_pct).toBe(0);
      expect(corner.corner_speed_reduction_pct).toBeGreaterThan(0);
    });

    it("should use higher pressure for thicker material", () => {
      const base = { material: "mild_steel", target_quality: "medium" as const, geometry: "straight" as const };
      const thin = ajm.optimizeParameters({ ...base, thickness_mm: 5 });
      const thick = ajm.optimizeParameters({ ...base, thickness_mm: 50 });
      expect(thick.pressure_MPa).toBeGreaterThanOrEqual(thin.pressure_MPa);
    });

    it("should apply partial reduction for curves", () => {
      const r = ajm.optimizeParameters({
        material: "mild_steel", thickness_mm: 25, target_quality: "medium", geometry: "curve",
      });
      expect(r.corner_speed_reduction_pct).toBeGreaterThan(0);
      // But less than corners
      const corner = ajm.optimizeParameters({
        material: "mild_steel", thickness_mm: 25, target_quality: "medium", geometry: "corner",
      });
      expect(r.corner_speed_reduction_pct).toBeLessThan(corner.corner_speed_reduction_pct);
    });
  });

  // ── predictNozzleWear ────────────────────────────────────────────

  describe("predictNozzleWear", () => {
    it("should compute wear for tungsten carbide nozzle", () => {
      const r = ajm.predictNozzleWear({
        nozzle_material: "tungsten_carbide", abrasive: "garnet",
        pressure_MPa: 300, operating_hours: 10,
      });
      expect(r.wear_rate_mm_per_hour).toBeGreaterThan(0);
      expect(r.remaining_life_hours).toBeGreaterThan(0);
      expect(r.replacement_cost_estimate).toBe(25);
      expect(r.bore_growth_pct).toBeGreaterThan(0);
    });

    it("should give longer life for diamond composite vs tungsten carbide", () => {
      const base = { abrasive: "garnet" as const, pressure_MPa: 300, operating_hours: 0 };
      const wc = ajm.predictNozzleWear({ ...base, nozzle_material: "tungsten_carbide" });
      const diamond = ajm.predictNozzleWear({ ...base, nozzle_material: "diamond_composite" });
      expect(diamond.remaining_life_hours).toBeGreaterThan(wc.remaining_life_hours);
    });

    it("should show higher wear rate with silicon carbide vs garnet", () => {
      const base = { nozzle_material: "tungsten_carbide" as const, pressure_MPa: 300, operating_hours: 10 };
      const garnet = ajm.predictNozzleWear({ ...base, abrasive: "garnet" });
      const sic = ajm.predictNozzleWear({ ...base, abrasive: "silicon_carbide" });
      expect(sic.wear_rate_mm_per_hour).toBeGreaterThan(garnet.wear_rate_mm_per_hour);
    });

    it("should increase bore growth with operating hours", () => {
      const base = { nozzle_material: "tungsten_carbide" as const, abrasive: "garnet" as const, pressure_MPa: 300 };
      const fresh = ajm.predictNozzleWear({ ...base, operating_hours: 0 });
      const used = ajm.predictNozzleWear({ ...base, operating_hours: 100 });
      expect(used.bore_growth_pct).toBeGreaterThan(fresh.bore_growth_pct);
    });

    it("should decrease remaining life with usage", () => {
      const base = { nozzle_material: "tungsten_carbide" as const, abrasive: "garnet" as const, pressure_MPa: 300 };
      const fresh = ajm.predictNozzleWear({ ...base, operating_hours: 0 });
      const used = ajm.predictNozzleWear({ ...base, operating_hours: 100 });
      expect(used.remaining_life_hours).toBeLessThan(fresh.remaining_life_hours);
    });

    it("should scale wear with pressure", () => {
      const base = { nozzle_material: "tungsten_carbide" as const, abrasive: "garnet" as const, operating_hours: 50 };
      const low = ajm.predictNozzleWear({ ...base, pressure_MPa: 200 });
      const high = ajm.predictNozzleWear({ ...base, pressure_MPa: 400 });
      expect(high.wear_rate_mm_per_hour).toBeGreaterThan(low.wear_rate_mm_per_hour);
    });

    it("should return zero remaining life when fully worn", () => {
      const r = ajm.predictNozzleWear({
        nozzle_material: "tungsten_carbide", abrasive: "silicon_carbide",
        pressure_MPa: 400, operating_hours: 50000,
      });
      expect(r.remaining_life_hours).toBe(0);
    });
  });
});
