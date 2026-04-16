import { describe, it, expect } from "vitest";
import { AdaptiveControllerModel } from "../algorithms/AdaptiveControllerModel.js";
import { AnomalyDetector } from "../algorithms/AnomalyDetector.js";
import { AntColonyTSP } from "../algorithms/AntColonyTSP.js";
import { BayesianOptimizer } from "../algorithms/BayesianOptimizer.js";
import { BayesianWearModel } from "../algorithms/BayesianWearModel.js";
import { ChipBreakingModel } from "../algorithms/ChipBreakingModel.js";
import { ChipEvacuationModel } from "../algorithms/ChipEvacuationModel.js";
import { ChipVolumeRatePredictor } from "../algorithms/ChipVolumeRate.js";
import { CoolantFlowModel } from "../algorithms/CoolantFlowModel.js";
import { CSPSetupPlan } from "../algorithms/CSPSetupPlan.js";
import { CWEZBuffer } from "../algorithms/CWEZBuffer.js";
import { DecisionTreeClassifier } from "../algorithms/DecisionTreeClassifier.js";

// ─── AdaptiveControllerModel ─────────────────────────────────────────

describe("AdaptiveControllerModel", () => {
  const model = new AdaptiveControllerModel();

  describe("validate", () => {
    it("rejects invalid mode", () => {
      const r = model.validate({ mode: "bogus" as unknown as "chipload" });
      expect(r.valid).toBe(false);
    });

    it("rejects chipload mode missing required fields", () => {
      const r = model.validate({ mode: "chipload" });
      expect(r.valid).toBe(false);
      expect(r.issues.length).toBeGreaterThanOrEqual(3);
    });

    it("accepts valid chipload input", () => {
      const r = model.validate({
        mode: "chipload", target_chipload: 0.1,
        feed_rate: 1000, spindle_rpm: 5000, flutes: 4,
      });
      expect(r.valid).toBe(true);
    });

    it("rejects chatter mode without vibration_mm_s", () => {
      const r = model.validate({ mode: "chatter", spindle_rpm: 5000 });
      expect(r.valid).toBe(false);
    });
  });

  describe("calculate — chipload mode", () => {
    it("returns feed override for typical milling", () => {
      const out = model.calculate({
        mode: "chipload", target_chipload: 0.1,
        feed_rate: 1000, spindle_rpm: 5000, flutes: 4,
        engagement_angle: 180,
      });
      expect(out.mode).toBe("chipload");
      expect(out.feed_override_pct).toBeGreaterThanOrEqual(40);
      expect(out.feed_override_pct).toBeLessThanOrEqual(150);
      expect(out.spindle_override_pct).toBe(100);
      expect(out.compensation_um).toEqual({ x: 0, y: 0, z: 0 });
    });

    it("limits feed override when spindle load > 80%", () => {
      const out = model.calculate({
        mode: "chipload", target_chipload: 0.2,
        feed_rate: 500, spindle_rpm: 5000, flutes: 4,
        spindle_load_pct: 90,
      });
      expect(out.feed_override_pct).toBeLessThanOrEqual(90);
      expect(out.alerts.length).toBeGreaterThan(0);
    });
  });

  describe("calculate — chatter mode", () => {
    it("no override when vibration below threshold", () => {
      const out = model.calculate({
        mode: "chatter", vibration_mm_s: 1.0,
        spindle_rpm: 5000, flutes: 4,
        dominant_frequency_hz: 800,
      });
      expect(out.apply_override).toBe(false);
      expect(out.urgency).toBe("none");
    });

    it("applies spindle override when chatter detected", () => {
      const out = model.calculate({
        mode: "chatter", vibration_mm_s: 5.0,
        spindle_rpm: 5000, flutes: 4,
        dominant_frequency_hz: 800,
      });
      expect(out.apply_override).toBe(true);
      expect(out.urgency).not.toBe("none");
      expect(out.alerts.length).toBeGreaterThan(0);
    });

    it("does not apply override when chatter frequency is unavailable", () => {
      const out = model.calculate({
        mode: "chatter", vibration_mm_s: 5.0,
        spindle_rpm: 5000, flutes: 4,
      });
      expect(out.apply_override).toBe(false);
      expect(out.spindle_override_pct).toBe(100);
      expect(out.warnings.length).toBeGreaterThan(0);
    });

    it("emergency urgency for very high vibration", () => {
      const out = model.calculate({
        mode: "chatter", vibration_mm_s: 10.0,
        spindle_rpm: 5000, flutes: 4,
        dominant_frequency_hz: 800,
        vibration_threshold: 2.5,
      });
      expect(out.urgency).toBe("emergency");
    });
  });

  describe("calculate — wear mode", () => {
    it("no override at low wear", () => {
      const out = model.calculate({
        mode: "wear", cutting_time_min: 10,
        expected_life_min: 60,
      });
      expect(out.estimated_wear_pct).toBeCloseTo(100 * 10 / 60, 0);
      expect(out.apply_override).toBe(false);
    });

    it("emergency at > 90% wear", () => {
      const out = model.calculate({
        mode: "wear", cutting_time_min: 55,
        expected_life_min: 60,
      });
      expect(out.urgency).toBe("emergency");
      expect(out.alerts.length).toBeGreaterThan(0);
    });

    it("VB-based wear dominates when flank wear high", () => {
      const out = model.calculate({
        mode: "wear", cutting_time_min: 5,
        expected_life_min: 60, flank_wear_mm: 0.25,
      });
      // vb = 0.25/0.3 * 100 = 83.3%
      expect(out.estimated_wear_pct).toBeGreaterThan(80);
    });
  });

  describe("calculate — thermal mode", () => {
    it("no compensation for small deltaT", () => {
      const out = model.calculate({
        mode: "thermal", spindle_temp_c: 22,
        ambient_temp_c: 20,
      });
      expect(out.apply_override).toBe(false);
      expect(out.compensation_um).toEqual({ x: 0, y: 0, z: 0 });
    });

    it("applies compensation for large deltaT", () => {
      const out = model.calculate({
        mode: "thermal", spindle_temp_c: 40,
        ambient_temp_c: 20, machine_type: "VMC",
      });
      expect(out.apply_override).toBe(true);
      expect(out.compensation_um.z).not.toBe(0);
    });
  });

  describe("getMetadata", () => {
    it("returns valid metadata", () => {
      const m = model.getMetadata();
      expect(m.id).toBe("adaptive-controller");
      expect(m.safety_class).toBe("critical");
    });
  });

  describe("invalid runtime input", () => {
    it("throws for unsupported mode instead of fabricating a chipload override", () => {
      expect(() => model.calculate({ mode: "bogus" as unknown as "chipload" })).toThrow(/Unsupported adaptive mode/);
    });
  });
});

// ─── AnomalyDetector ─────────────────────────────────────────────────

describe("AnomalyDetector", () => {
  const detector = new AnomalyDetector();

  describe("validate", () => {
    it("rejects fewer than 5 data points", () => {
      const r = detector.validate({ data: [1, 2, 3] });
      expect(r.valid).toBe(false);
    });

    it("accepts 5+ data points", () => {
      const r = detector.validate({ data: [10, 10.1, 9.9, 10.2, 9.8] });
      expect(r.valid).toBe(true);
    });
  });

  describe("calculate", () => {
    it("detects no anomalies in stable data", () => {
      const data = [10, 10.1, 9.9, 10.05, 9.95, 10.02, 9.98, 10.01, 9.99, 10.0];
      const out = detector.calculate({ data });
      expect(out.in_control).toBe(true);
      expect(out.process_mean).toBeCloseTo(10, 0);
      expect(out.process_sigma).toBeGreaterThan(0);
      expect(out.ucl).toBeGreaterThan(out.process_mean);
      expect(out.lcl).toBeLessThan(out.process_mean);
      expect(out.z_scores.length).toBe(data.length);
    });

    it("detects alarm for point beyond 3-sigma", () => {
      // Use known mean/sigma so the outlier clearly exceeds 3-sigma
      const data = [10, 10.1, 9.9, 10.05, 9.95, 10, 10, 10, 10, 50];
      const out = detector.calculate({
        data, process_mean: 10, process_sigma: 0.1,
      });
      expect(out.anomalies.some(a => a.severity === "alarm")).toBe(true);
      expect(out.in_control).toBe(false);
    });

    it("uses provided process_mean and process_sigma", () => {
      const data = [10, 10.1, 9.9, 10.05, 9.95];
      const out = detector.calculate({ data, process_mean: 10, process_sigma: 0.1 });
      expect(out.process_mean).toBe(10);
      expect(out.process_sigma).toBe(0.1);
    });

    it("applies Nelson rules when enabled", () => {
      // 6 monotonically increasing points
      const data = [1, 2, 3, 4, 5, 6, 3, 3, 3, 3];
      const out = detector.calculate({ data, nelson_rules: true, western_electric: false });
      expect(out.anomalies.some(a => a.rule_violated.includes("Nelson"))).toBe(true);
    });

    it("WE Rule 4: 8 consecutive same side", () => {
      // 8 points slightly above mean — none beyond 3-sigma so Rule 4 triggers
      const data = [10.1, 10.2, 10.1, 10.3, 10.2, 10.1, 10.2, 10.3, 10.1, 10.2];
      const out = detector.calculate({
        data, process_mean: 10, process_sigma: 1,
      });
      expect(out.anomalies.some(a => a.rule_violated.includes("Rule 4"))).toBe(true);
    });

    it("computes Cpk correctly", () => {
      const data = [10, 10.1, 9.9, 10.05, 9.95];
      const out = detector.calculate({ data, sigma_multiplier: 3 });
      // With 3-sigma limits, Cpk = min((ucl-mean)/(3*sigma), (mean-lcl)/(3*sigma)) = 1
      expect(out.cpk).toBeCloseTo(1, 1);
    });
  });

  describe("getMetadata", () => {
    it("returns valid metadata", () => {
      const m = detector.getMetadata();
      expect(m.id).toBe("anomaly-detector");
    });
  });
});

// ─── AntColonyTSP ────────────────────────────────────────────────────

describe("AntColonyTSP", () => {
  const aco = new AntColonyTSP();

  describe("validate", () => {
    it("rejects fewer than 2 tools", () => {
      const r = aco.validate({ n_tools: 1, change_times: [] });
      expect(r.valid).toBe(false);
    });

    it("accepts 2+ tools", () => {
      const r = aco.validate({ n_tools: 3, change_times: [] });
      expect(r.valid).toBe(true);
    });
  });

  describe("calculate", () => {
    it("finds a valid sequence for 4 tools", () => {
      const out = aco.calculate({
        n_tools: 4,
        change_times: [
          { from: 0, to: 1, time: 2 },
          { from: 1, to: 2, time: 3 },
          { from: 2, to: 3, time: 1 },
          { from: 0, to: 3, time: 10 },
          { from: 3, to: 0, time: 10 },
        ],
        seed: 42,
        n_iterations: 50,
      });
      expect(out.best_sequence.length).toBe(4);
      expect(out.best_time).toBeGreaterThan(0);
      expect(out.best_time).toBeLessThanOrEqual(out.worst_time);
      expect(out.convergence.length).toBe(50);
      expect(out.solutions_explored).toBeGreaterThan(0);
      // All tools visited
      expect(new Set(out.best_sequence).size).toBe(4);
    });

    it("deterministic with same seed", () => {
      const input = { n_tools: 5, change_times: [], seed: 123, n_iterations: 20 };
      const a = aco.calculate(input);
      const b = aco.calculate(input);
      expect(a.best_sequence).toEqual(b.best_sequence);
      expect(a.best_time).toBe(b.best_time);
    });

    it("handles 2 tools (minimum)", () => {
      const out = aco.calculate({
        n_tools: 2,
        change_times: [{ from: 0, to: 1, time: 3 }],
        seed: 1,
        n_iterations: 10,
      });
      expect(out.best_sequence.length).toBe(2);
    });
  });

  describe("getMetadata", () => {
    it("returns valid metadata", () => {
      const m = aco.getMetadata();
      expect(m.id).toBe("ant-colony-tsp");
    });
  });
});

// ─── BayesianOptimizer ───────────────────────────────────────────────

describe("BayesianOptimizer", () => {
  const bo = new BayesianOptimizer();

  describe("validate", () => {
    it("rejects empty observations", () => {
      const r = bo.validate({
        X_observed: [], y_observed: [],
        dimensions: 1, lower_bounds: [0], upper_bounds: [1],
      });
      expect(r.valid).toBe(false);
    });

    it("rejects mismatched X/y lengths", () => {
      const r = bo.validate({
        X_observed: [[1], [2]], y_observed: [1],
        dimensions: 1, lower_bounds: [0], upper_bounds: [1],
      });
      expect(r.valid).toBe(false);
    });
  });

  describe("calculate", () => {
    it("suggests next point in 1D optimization", () => {
      const out = bo.calculate({
        X_observed: [[0.1], [0.5], [0.9]],
        y_observed: [5, 2, 6],
        dimensions: 1,
        lower_bounds: [0], upper_bounds: [1],
        seed: 42,
        n_candidates: 200,
      });
      expect(out.next_point.length).toBe(1);
      expect(out.next_point[0]).toBeGreaterThanOrEqual(0);
      expect(out.next_point[0]).toBeLessThanOrEqual(1);
      expect(out.best_observed).toBe(2);
      expect(out.best_observed_point).toEqual([0.5]);
      expect(out.expected_improvement).toBeGreaterThanOrEqual(0);
    });

    it("suggests next point in 2D optimization", () => {
      const out = bo.calculate({
        X_observed: [[0, 0], [1, 1], [0.5, 0.5]],
        y_observed: [10, 8, 3],
        dimensions: 2,
        lower_bounds: [0, 0], upper_bounds: [1, 1],
        seed: 99,
        n_candidates: 100,
      });
      expect(out.next_point.length).toBe(2);
      expect(out.best_observed).toBe(3);
    });

    it("returns model quality metric", () => {
      const out = bo.calculate({
        X_observed: [[0], [0.25], [0.5], [0.75], [1]],
        y_observed: [1, 0.5, 0.2, 0.5, 1],
        dimensions: 1,
        lower_bounds: [0], upper_bounds: [1],
        seed: 7, n_candidates: 50,
      });
      expect(out.model_quality).toBeGreaterThanOrEqual(0);
      expect(out.model_quality).toBeLessThanOrEqual(1);
    });
  });

  describe("getMetadata", () => {
    it("returns valid metadata", () => {
      expect(bo.getMetadata().id).toBe("bayesian-optimizer");
    });
  });
});

// ─── BayesianWearModel ───────────────────────────────────────────────

describe("BayesianWearModel", () => {
  const wear = new BayesianWearModel();

  describe("validate", () => {
    it("rejects missing prior_std", () => {
      const r = wear.validate({ prior_mean: 60, prior_std: 0, observations: [55] });
      expect(r.valid).toBe(false);
    });

    it("rejects empty observations", () => {
      const r = wear.validate({ prior_mean: 60, prior_std: 10, observations: [] });
      expect(r.valid).toBe(false);
    });

    it("accepts valid input", () => {
      const r = wear.validate({ prior_mean: 60, prior_std: 10, observations: [55, 58, 62] });
      expect(r.valid).toBe(true);
    });
  });

  describe("calculate", () => {
    it("posterior moves toward data mean", () => {
      const out = wear.calculate({
        prior_mean: 60, prior_std: 10,
        observations: [40, 42, 38, 41, 39],
      });
      // Data mean ~40, prior 60, posterior should be between
      expect(out.posterior_mean).toBeLessThan(60);
      expect(out.posterior_mean).toBeGreaterThan(40);
      expect(out.posterior_std).toBeLessThan(10);
      expect(out.data_mean).toBeCloseTo(40, 0);
      expect(out.num_observations).toBe(5);
    });

    it("uncertainty reduces with more observations", () => {
      const out1 = wear.calculate({
        prior_mean: 60, prior_std: 10, observations: [55],
      });
      const out5 = wear.calculate({
        prior_mean: 60, prior_std: 10, observations: [55, 56, 54, 55, 56],
      });
      expect(out5.posterior_std).toBeLessThan(out1.posterior_std);
      expect(out5.uncertainty_reduction).toBeLessThan(out1.uncertainty_reduction);
    });

    it("returns 95% credible interval", () => {
      const out = wear.calculate({
        prior_mean: 0.15, prior_std: 0.05,
        observations: [0.12, 0.14, 0.13],
        vb_threshold: 0.3,
      });
      expect(out.credible_interval_95[0]).toBeLessThan(out.posterior_mean);
      expect(out.credible_interval_95[1]).toBeGreaterThan(out.posterior_mean);
    });

    it("computes probability of exceeding threshold", () => {
      const out = wear.calculate({
        prior_mean: 0.25, prior_std: 0.05,
        observations: [0.28, 0.29, 0.27],
        vb_threshold: 0.3,
      });
      expect(out.probability_exceed_threshold).not.toBeNull();
      expect(out.probability_exceed_threshold!).toBeGreaterThan(0);
      expect(out.probability_exceed_threshold!).toBeLessThanOrEqual(1);
    });

    it("recommends REPLACE for high exceedance probability", () => {
      const out = wear.calculate({
        prior_mean: 0.35, prior_std: 0.02,
        observations: [0.34, 0.36, 0.35],
        vb_threshold: 0.3,
      });
      expect(out.recommendation).toContain("REPLACE");
    });

    it("warns about few observations", () => {
      const out = wear.calculate({
        prior_mean: 60, prior_std: 10, observations: [55],
      });
      expect(out.warnings.some(w => w.includes("FEW_OBSERVATIONS"))).toBe(true);
    });
  });

  describe("getMetadata", () => {
    it("returns valid metadata", () => {
      expect(wear.getMetadata().id).toBe("bayesian-wear");
    });
  });
});

// ─── ChipBreakingModel ───────────────────────────────────────────────

describe("ChipBreakingModel", () => {
  const chip = new ChipBreakingModel();

  describe("validate", () => {
    it("rejects zero feed", () => {
      const r = chip.validate({
        feed_per_tooth: 0, axial_depth: 2, cutting_speed: 200,
        tool_diameter: 10, iso_group: "P",
      });
      expect(r.valid).toBe(false);
    });

    it("rejects invalid ISO group", () => {
      const r = chip.validate({
        feed_per_tooth: 0.1, axial_depth: 2, cutting_speed: 200,
        tool_diameter: 10, iso_group: "X",
      });
      expect(r.valid).toBe(false);
    });

    it("accepts valid input", () => {
      const r = chip.validate({
        feed_per_tooth: 0.1, axial_depth: 2, cutting_speed: 200,
        tool_diameter: 10, iso_group: "P",
      });
      expect(r.valid).toBe(true);
    });
  });

  describe("calculate", () => {
    it("computes chip thickness for steel with 45deg lead angle", () => {
      const out = chip.calculate({
        feed_per_tooth: 0.1, axial_depth: 2, cutting_speed: 200,
        tool_diameter: 10, iso_group: "P", lead_angle: 45,
      });
      // h = 0.1 * sin(45deg) = 0.0707
      expect(out.chip_thickness).toBeCloseTo(0.0707, 3);
      expect(out.chip_width).toBeCloseTo(2 / Math.sin(Math.PI / 4), 2);
    });

    it("classifies cast iron as segmented", () => {
      const out = chip.calculate({
        feed_per_tooth: 0.15, axial_depth: 3, cutting_speed: 150,
        tool_diameter: 12, iso_group: "K",
      });
      expect(out.chip_type).toBe("segmented");
      expect(out.breaking_feasibility).toBe("good");
    });

    it("classifies aluminum without chipbreaker as stringy", () => {
      const out = chip.calculate({
        feed_per_tooth: 0.1, axial_depth: 2, cutting_speed: 300,
        tool_diameter: 10, iso_group: "N", has_chipbreaker: false,
      });
      expect(out.chip_type).toBe("stringy");
      expect(out.breaking_feasibility).toBe("poor");
    });

    it("broken chips with chipbreaker in ideal range", () => {
      const out = chip.calculate({
        feed_per_tooth: 0.15, axial_depth: 3, cutting_speed: 200,
        tool_diameter: 10, iso_group: "P", lead_angle: 90, has_chipbreaker: true,
      });
      // h = 0.15 * sin(90) = 0.15, in ideal range [0.05, 0.3]
      expect(out.chip_type).toBe("broken");
      expect(out.breaking_feasibility).toBe("good");
    });

    it("detects BUE risk in speed range", () => {
      const out = chip.calculate({
        feed_per_tooth: 0.1, axial_depth: 2, cutting_speed: 80,
        tool_diameter: 10, iso_group: "P",
      });
      // P group BUE range 30-120 m/min, 80 is in range
      expect(out.bue_risk).toBe("high");
    });

    it("warns about rubbing at very low chip thickness", () => {
      const out = chip.calculate({
        feed_per_tooth: 0.01, axial_depth: 1, cutting_speed: 200,
        tool_diameter: 10, iso_group: "P", lead_angle: 45,
      });
      // h = 0.01 * sin(45) = 0.007 < 0.02
      expect(out.warnings.some(w => w.includes("RUBBING"))).toBe(true);
    });
  });

  describe("getMetadata", () => {
    it("returns valid metadata", () => {
      expect(chip.getMetadata().id).toBe("chip-breaking");
    });
  });
});

// ─── ChipEvacuationModel ────────────────────────────────────────────

describe("ChipEvacuationModel", () => {
  const evac = new ChipEvacuationModel();

  describe("validate", () => {
    it("rejects zero diameter", () => {
      const r = evac.validate({
        tool_diameter: 0, hole_depth: 30, material_type: "steel",
        system_pressure: 20, system_flow: 5,
      });
      expect(r.valid).toBe(false);
    });

    it("rejects invalid material", () => {
      const r = evac.validate({
        tool_diameter: 10, hole_depth: 30, material_type: "unobtainium" as unknown as "steel",
        system_pressure: 20, system_flow: 5,
      });
      expect(r.valid).toBe(false);
    });

    it("accepts valid input", () => {
      const r = evac.validate({
        tool_diameter: 10, hole_depth: 30, material_type: "steel",
        system_pressure: 20, system_flow: 5,
      });
      expect(r.valid).toBe(true);
    });
  });

  describe("calculate", () => {
    it("standard strategy for shallow hole (L/D < 3)", () => {
      const out = evac.calculate({
        tool_diameter: 10, hole_depth: 20, material_type: "steel",
        system_pressure: 50, system_flow: 20,
      });
      expect(out.ld_ratio).toBe(2);
      expect(out.strategy).toBe("standard");
      expect(out.peck_depth).toBeNull();
    });

    it("peck cycle for moderate depth (L/D 5-8)", () => {
      const out = evac.calculate({
        tool_diameter: 10, hole_depth: 70, material_type: "steel",
        system_pressure: 100, system_flow: 30,
      });
      expect(out.ld_ratio).toBe(7);
      expect(out.strategy).toBe("peck_cycle");
      expect(out.peck_depth).toBeGreaterThan(0);
      expect(out.dwell_time).toBeGreaterThan(0);
    });

    it("gundrilling for extreme L/D", () => {
      const out = evac.calculate({
        tool_diameter: 5, hole_depth: 200, material_type: "steel",
        system_pressure: 200, system_flow: 50,
      });
      expect(out.ld_ratio).toBe(40);
      expect(out.strategy).toBe("gundrilling");
    });

    it("warns about insufficient pressure", () => {
      const out = evac.calculate({
        tool_diameter: 10, hole_depth: 100, material_type: "titanium",
        system_pressure: 10, system_flow: 5,
      });
      expect(out.pressure_adequate).toBe(false);
      expect(out.warnings.some(w => w.includes("INSUFFICIENT_PRESSURE"))).toBe(true);
    });

    it("material factor increases required pressure for titanium", () => {
      const steelOut = evac.calculate({
        tool_diameter: 10, hole_depth: 30, material_type: "steel",
        system_pressure: 100, system_flow: 50,
      });
      const tiOut = evac.calculate({
        tool_diameter: 10, hole_depth: 30, material_type: "titanium",
        system_pressure: 100, system_flow: 50,
      });
      expect(tiOut.required_pressure).toBeGreaterThan(steelOut.required_pressure);
    });

    it("computes chip volume per peck for peck strategy", () => {
      const out = evac.calculate({
        tool_diameter: 10, hole_depth: 70, material_type: "steel",
        system_pressure: 100, system_flow: 30,
      });
      if (out.peck_depth !== null) {
        expect(out.chip_volume_per_peck).toBeGreaterThan(0);
      }
    });
  });

  describe("getMetadata", () => {
    it("returns valid metadata", () => {
      expect(evac.getMetadata().id).toBe("chip-evacuation");
    });
  });
});

// ─── ChipVolumeRatePredictor ─────────────────────────────────────────

describe("ChipVolumeRatePredictor", () => {
  const cvr = new ChipVolumeRatePredictor();

  describe("validate", () => {
    it("rejects zero diameter", () => {
      const r = cvr.validate({
        operation: "milling_side", tool_diameter: 0,
        depth_of_cut: 2, width_of_cut: 5, feed_rate: 1000, cutting_speed: 200,
      });
      expect(r.valid).toBe(false);
    });

    it("accepts valid milling input", () => {
      const r = cvr.validate({
        operation: "milling_side", tool_diameter: 10,
        depth_of_cut: 2, width_of_cut: 5, feed_rate: 1000, cutting_speed: 200,
      });
      expect(r.valid).toBe(true);
    });
  });

  describe("calculate — milling", () => {
    it("computes MRR for side milling", () => {
      const out = cvr.calculate({
        operation: "milling_side", tool_diameter: 10,
        depth_of_cut: 2, width_of_cut: 5, feed_rate: 1000,
        cutting_speed: 200, n_flutes: 4,
      });
      // MRR = ae * ap * Vf = 5 * 2 * 1000 = 10000 mm3/min
      expect(out.mrr_mm3_per_min).toBeCloseTo(10000, 0);
      expect(out.mrr_cm3_per_min).toBeCloseTo(10, 0);
      expect(out.spindle_speed).toBeGreaterThan(0);
      expect(out.feed_per_tooth).toBeGreaterThan(0);
      expect(out.cutting_power_kw).toBeGreaterThan(0);
    });

    it("slot milling chip thickness", () => {
      const out = cvr.calculate({
        operation: "milling_slot", tool_diameter: 10,
        depth_of_cut: 5, width_of_cut: 10, feed_rate: 500,
        cutting_speed: 150, n_flutes: 2,
      });
      // fz = Vf / (n * z), avg chip = fz * 2/pi
      expect(out.avg_chip_thickness).toBeGreaterThan(0);
      expect(out.max_chip_thickness).toBeGreaterThanOrEqual(out.avg_chip_thickness);
    });
  });

  describe("calculate — turning", () => {
    it("computes MRR for turning", () => {
      const out = cvr.calculate({
        operation: "turning", tool_diameter: 50,
        depth_of_cut: 2, width_of_cut: 0.3, feed_rate: 0.3,
        cutting_speed: 200,
      });
      // MRR = ap * f * Vc * 1000 = 2 * 0.3 * 200 * 1000 = 120000
      expect(out.mrr_mm3_per_min).toBeCloseTo(120000, -2);
      expect(out.cutting_power_kw).toBeGreaterThan(0);
    });
  });

  describe("calculate — drilling", () => {
    it("computes MRR for drilling", () => {
      const out = cvr.calculate({
        operation: "drilling", tool_diameter: 10,
        depth_of_cut: 1, width_of_cut: 1, feed_rate: 0.2,
        cutting_speed: 80,
      });
      expect(out.mrr_mm3_per_min).toBeGreaterThan(0);
      expect(out.spindle_speed).toBeGreaterThan(0);
    });
  });

  describe("calculate — power check", () => {
    it("warns when power insufficient", () => {
      const out = cvr.calculate({
        operation: "milling_side", tool_diameter: 50,
        depth_of_cut: 10, width_of_cut: 25, feed_rate: 2000,
        cutting_speed: 300, spindle_power: 1,
      });
      expect(out.power_sufficient).toBe(false);
      expect(out.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("getMetadata", () => {
    it("returns valid metadata", () => {
      expect(cvr.getMetadata().id).toBe("chip-volume-rate");
    });
  });
});

// ─── CoolantFlowModel ───────────────────────────────────────────────

describe("CoolantFlowModel", () => {
  const coolant = new CoolantFlowModel();

  describe("validate", () => {
    it("rejects invalid operation", () => {
      const r = coolant.validate({
        operation: "laser" as unknown as "milling", tool_diameter: 10, cutting_speed: 200,
        material_class: "steel", system_flow_rate: 10, system_pressure: 20,
      });
      expect(r.valid).toBe(false);
    });

    it("accepts valid input", () => {
      const r = coolant.validate({
        operation: "milling", tool_diameter: 10, cutting_speed: 200,
        material_class: "steel", system_flow_rate: 10, system_pressure: 20,
      });
      expect(r.valid).toBe(true);
    });
  });

  describe("calculate", () => {
    it("computes flow and pressure for milling steel", () => {
      const out = coolant.calculate({
        operation: "milling", tool_diameter: 10, cutting_speed: 200,
        material_class: "steel", system_flow_rate: 20, system_pressure: 30,
      });
      // required_flow = 0.5 * 10 * 1.0 = 5 L/min
      expect(out.required_flow).toBeCloseTo(5, 0);
      expect(out.required_pressure).toBeCloseTo(10, 0);
      expect(out.flow_adequate).toBe(true);
      expect(out.pressure_adequate).toBe(true);
    });

    it("material factor increases for titanium", () => {
      const out = coolant.calculate({
        operation: "drilling", tool_diameter: 10, cutting_speed: 50,
        material_class: "titanium", system_flow_rate: 50, system_pressure: 100,
      });
      // Base flow 0.8 * 10 * 1.5 = 12
      expect(out.required_flow).toBeGreaterThan(10);
      expect(out.required_pressure).toBeGreaterThan(20);
    });

    it("through-spindle reduces required flow", () => {
      const withoutTSC = coolant.calculate({
        operation: "milling", tool_diameter: 10, cutting_speed: 200,
        material_class: "steel", system_flow_rate: 20, system_pressure: 30,
        coolant_through: false,
      });
      const withTSC = coolant.calculate({
        operation: "milling", tool_diameter: 10, cutting_speed: 200,
        material_class: "steel", system_flow_rate: 20, system_pressure: 30,
        coolant_through: true,
      });
      expect(withTSC.required_flow).toBeLessThan(withoutTSC.required_flow);
    });

    it("computes L/D strategy for drilling with hole_depth", () => {
      const out = coolant.calculate({
        operation: "drilling", tool_diameter: 10, cutting_speed: 100,
        material_class: "steel", system_flow_rate: 50, system_pressure: 100,
        hole_depth: 80,
      });
      expect(out.ld_ratio).toBe(8);
      expect(out.evacuation_strategy).not.toBeNull();
    });

    it("warns about insufficient flow", () => {
      const out = coolant.calculate({
        operation: "drilling", tool_diameter: 20, cutting_speed: 100,
        material_class: "superalloy", system_flow_rate: 1, system_pressure: 100,
      });
      expect(out.flow_adequate).toBe(false);
      expect(out.warnings.some(w => w.includes("INSUFFICIENT_FLOW"))).toBe(true);
    });

    it("increases flow for high speed cutting", () => {
      const low = coolant.calculate({
        operation: "milling", tool_diameter: 10, cutting_speed: 100,
        material_class: "steel", system_flow_rate: 50, system_pressure: 50,
      });
      const high = coolant.calculate({
        operation: "milling", tool_diameter: 10, cutting_speed: 400,
        material_class: "steel", system_flow_rate: 50, system_pressure: 50,
      });
      expect(high.required_flow).toBeGreaterThan(low.required_flow);
    });
  });

  describe("getMetadata", () => {
    it("returns valid metadata", () => {
      expect(coolant.getMetadata().id).toBe("coolant-flow");
    });
  });
});

// ─── CSPSetupPlan ────────────────────────────────────────────────────

describe("CSPSetupPlan", () => {
  const csp = new CSPSetupPlan();

  describe("validate", () => {
    it("rejects empty features", () => {
      const r = csp.validate({ features: [] });
      expect(r.valid).toBe(false);
    });

    it("rejects feature without access directions", () => {
      const r = csp.validate({
        features: [{ id: "f1", access_directions: [], machining_time: 5 }],
      });
      expect(r.valid).toBe(false);
    });

    it("accepts valid features", () => {
      const r = csp.validate({
        features: [
          { id: "f1", access_directions: ["+Z"], machining_time: 5 },
          { id: "f2", access_directions: ["+Z", "-X"], machining_time: 3 },
        ],
      });
      expect(r.valid).toBe(true);
    });
  });

  describe("calculate", () => {
    it("groups features by orientation", () => {
      const out = csp.calculate({
        features: [
          { id: "f1", access_directions: ["+Z"], machining_time: 5 },
          { id: "f2", access_directions: ["+Z"], machining_time: 3 },
          { id: "f3", access_directions: ["-X"], machining_time: 4 },
        ],
      });
      expect(out.n_setups).toBe(2);
      expect(out.unassigned.length).toBe(0);
      expect(out.total_machining_time).toBe(12);
      expect(out.all_constraints_met).toBe(true);
    });

    it("respects tolerance groups", () => {
      const out = csp.calculate({
        features: [
          { id: "f1", access_directions: ["+Z", "+X"], machining_time: 5, tolerance_group: "tg1" },
          { id: "f2", access_directions: ["+Z", "+X"], machining_time: 3, tolerance_group: "tg1" },
          { id: "f3", access_directions: ["-Z"], machining_time: 4 },
        ],
      });
      // f1 and f2 in same tolerance group should be same setup
      const f1Setup = out.setups.find(s => s.features.includes("f1"));
      const f2Setup = out.setups.find(s => s.features.includes("f2"));
      expect(f1Setup?.setup_number).toBe(f2Setup?.setup_number);
      expect(out.tolerance_splits).toBe(0);
    });

    it("computes total time with setup changes", () => {
      const out = csp.calculate({
        features: [
          { id: "f1", access_directions: ["+Z"], machining_time: 10 },
          { id: "f2", access_directions: ["-Z"], machining_time: 10 },
        ],
        setup_change_time: 20,
      });
      expect(out.n_setups).toBe(2);
      expect(out.total_setup_time).toBe(20);
      expect(out.total_time).toBe(40);
    });

    it("handles single feature", () => {
      const out = csp.calculate({
        features: [{ id: "f1", access_directions: ["+Z"], machining_time: 5 }],
      });
      expect(out.n_setups).toBe(1);
      expect(out.total_setup_time).toBe(0);
    });

    it("limits features per setup", () => {
      const out = csp.calculate({
        features: [
          { id: "f1", access_directions: ["+Z"], machining_time: 5 },
          { id: "f2", access_directions: ["+Z"], machining_time: 3 },
          { id: "f3", access_directions: ["+Z"], machining_time: 4 },
        ],
        max_features_per_setup: 2,
      });
      expect(out.n_setups).toBeGreaterThanOrEqual(2);
    });
  });

  describe("getMetadata", () => {
    it("returns valid metadata", () => {
      expect(csp.getMetadata().id).toBe("csp-setup-plan");
    });
  });
});

// ─── CWEZBuffer ──────────────────────────────────────────────────────

describe("CWEZBuffer", () => {
  const cwe = new CWEZBuffer();

  describe("validate", () => {
    it("rejects zero diameter", () => {
      const r = cwe.validate({
        tool_diameter: 0, depth_of_cut: 2, width_of_cut: 5,
        current_position: { x: 0, y: 0, z: 0 }, previous_positions: [],
      });
      expect(r.valid).toBe(false);
    });

    it("rejects width_of_cut > tool_diameter", () => {
      const r = cwe.validate({
        tool_diameter: 10, depth_of_cut: 2, width_of_cut: 15,
        current_position: { x: 0, y: 0, z: 0 }, previous_positions: [],
      });
      expect(r.valid).toBe(false);
    });

    it("accepts valid input", () => {
      const r = cwe.validate({
        tool_diameter: 10, depth_of_cut: 5, width_of_cut: 5,
        current_position: { x: 0, y: 0, z: 0 }, previous_positions: [],
      });
      expect(r.valid).toBe(true);
    });
  });

  describe("calculate", () => {
    it("computes engagement for side milling", () => {
      const out = cwe.calculate({
        tool_diameter: 10, depth_of_cut: 5, width_of_cut: 5,
        current_position: { x: 50, y: 0, z: 0 },
        previous_positions: [{ x: 40, y: 0, z: 0 }],
        n_axial_slices: 5,
      });
      expect(out.engagement_slices.length).toBe(5);
      expect(out.avg_engagement_angle).toBeGreaterThan(0);
      expect(out.max_engagement_angle).toBeGreaterThanOrEqual(out.avg_engagement_angle);
      expect(out.engaged_area).toBeGreaterThan(0);
      expect(out.n_active_slices).toBe(5);
      expect(out.is_slotting).toBe(false);
    });

    it("detects slotting when ae = D", () => {
      const out = cwe.calculate({
        tool_diameter: 10, depth_of_cut: 5, width_of_cut: 10,
        current_position: { x: 50, y: 0, z: 0 },
        previous_positions: [],
      });
      expect(out.is_slotting).toBe(true);
      expect(out.avg_engagement_angle).toBe(180);
      expect(out.warnings.some(w => w.includes("slotting"))).toBe(true);
    });

    it("engagement ratio is < 1 for side milling", () => {
      const out = cwe.calculate({
        tool_diameter: 20, depth_of_cut: 3, width_of_cut: 5,
        current_position: { x: 0, y: 0, z: 0 },
        previous_positions: [],
      });
      expect(out.engagement_ratio).toBeLessThan(1);
      expect(out.engagement_ratio).toBeGreaterThan(0);
    });

    it("effective_radial_depth equals ae", () => {
      const out = cwe.calculate({
        tool_diameter: 10, depth_of_cut: 5, width_of_cut: 3,
        current_position: { x: 0, y: 0, z: 0 },
        previous_positions: [],
      });
      expect(out.effective_radial_depth).toBe(3);
    });
  });

  describe("getMetadata", () => {
    it("returns valid metadata", () => {
      expect(cwe.getMetadata().id).toBe("cwe-z-buffer");
    });
  });
});

// ─── DecisionTreeClassifier ──────────────────────────────────────────

describe("DecisionTreeClassifier", () => {
  const dt = new DecisionTreeClassifier();

  describe("validate", () => {
    it("rejects empty training data", () => {
      const r = dt.validate({ X_train: [], y_train: [], X_test: [[1]] });
      expect(r.valid).toBe(false);
    });

    it("rejects mismatched X/y lengths", () => {
      const r = dt.validate({ X_train: [[1], [2]], y_train: [0], X_test: [[1]] });
      expect(r.valid).toBe(false);
    });

    it("accepts valid input", () => {
      const r = dt.validate({
        X_train: [[1], [2], [3]], y_train: [0, 0, 1], X_test: [[1.5]],
      });
      expect(r.valid).toBe(true);
    });
  });

  describe("calculate", () => {
    it("classifies linearly separable 1D data", () => {
      const out = dt.calculate({
        X_train: [[1], [2], [3], [4], [5], [6], [7], [8], [9], [10]],
        y_train: [0, 0, 0, 0, 0, 1, 1, 1, 1, 1],
        X_test: [[2], [9]],
      });
      expect(out.predictions).toEqual([0, 1]);
      expect(out.training_accuracy).toBe(1);
      expect(out.tree_depth).toBeGreaterThanOrEqual(1);
      expect(out.n_leaves).toBeGreaterThanOrEqual(2);
    });

    it("computes feature importance for 2D data", () => {
      // Feature 0 is informative, feature 1 is noise
      const out = dt.calculate({
        X_train: [
          [1, 5], [2, 3], [3, 7], [4, 2], [5, 8],
          [6, 1], [7, 6], [8, 4], [9, 9], [10, 3],
        ],
        y_train: [0, 0, 0, 0, 0, 1, 1, 1, 1, 1],
        X_test: [[3, 5], [8, 5]],
        feature_names: ["cutting_speed", "noise"],
      });
      expect(out.feature_importance["cutting_speed"]).toBeGreaterThan(0);
      expect(out.predictions.length).toBe(2);
    });

    it("respects max_depth", () => {
      const out = dt.calculate({
        X_train: [[1], [2], [3], [4], [5], [6], [7], [8]],
        y_train: [0, 1, 0, 1, 0, 1, 0, 1],
        X_test: [[1.5]],
        max_depth: 1,
      });
      expect(out.tree_depth).toBeLessThanOrEqual(1);
    });

    it("handles multi-class classification", () => {
      const out = dt.calculate({
        X_train: [
          [1], [2], [3], [4], [5], [6], [7], [8], [9],
        ],
        y_train: [0, 0, 0, 1, 1, 1, 2, 2, 2],
        X_test: [[1.5], [5], [8.5]],
      });
      expect(out.predictions[0]).toBe(0);
      expect(out.predictions[1]).toBe(1);
      expect(out.predictions[2]).toBe(2);
      expect(out.probabilities[0].length).toBe(3);
    });

    it("uses entropy criterion", () => {
      const out = dt.calculate({
        X_train: [[1], [2], [3], [4], [5], [6]],
        y_train: [0, 0, 0, 1, 1, 1],
        X_test: [[2], [5]],
        criterion: "entropy",
      });
      expect(out.predictions).toEqual([0, 1]);
      expect(out.calculation_method).toContain("entropy");
    });

    it("produces probabilities summing to 1", () => {
      const out = dt.calculate({
        X_train: [[1], [2], [3], [4]],
        y_train: [0, 0, 1, 1],
        X_test: [[2.5]],
      });
      const probSum = out.probabilities[0].reduce((s, p) => s + p, 0);
      expect(probSum).toBeCloseTo(1, 5);
    });
  });

  describe("getMetadata", () => {
    it("returns valid metadata", () => {
      expect(dt.getMetadata().id).toBe("decision-tree-classifier");
    });
  });
});
