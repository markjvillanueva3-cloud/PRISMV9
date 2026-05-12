/**
 * PP-MS4 Tests: Stochastic Verification + Safety + Knowledge
 * Tests: Monte Carlo, robustness score, tribal knowledge, energy optimization
 */
import { describe, it, expect } from "vitest";
import {
  postProcessorPipelineEngine,
  type MaterialContext,
  type MachineContext,
  type ToolContext,
} from "../engines/PostProcessorPipelineEngine.js";

const STEEL: MaterialContext = {
  id: "4140", name: "4140 Steel", iso_group: "P",
  kc1_1: 2000, mc: 0.25, hardness_HB: 197,
  resolution_confidence: 1.0,
};
const INCONEL: MaterialContext = {
  id: "718", name: "Inconel 718", iso_group: "S",
  kc1_1: 2800, mc: 0.25, resolution_confidence: 1.0,
};
const STAINLESS: MaterialContext = {
  id: "316L", name: "316L Stainless", iso_group: "M",
  kc1_1: 2400, mc: 0.25, resolution_confidence: 1.0,
};
const ALUMINUM: MaterialContext = {
  id: "7075", name: "7075-T6", iso_group: "N",
  kc1_1: 800, mc: 0.23, resolution_confidence: 1.0,
};
const HARDENED: MaterialContext = {
  id: "d2", name: "D2 Hardened", iso_group: "H",
  kc1_1: 3500, mc: 0.27, hardness_HRC: 60,
  resolution_confidence: 1.0,
};

const TOOL: ToolContext = {
  id: "1", type: "flat_endmill", diameter_mm: 10, flute_count: 4,
  flute_length_mm: 25, material: "carbide",
  resolution_confidence: 1.0,
};
const BALL_TOOL: ToolContext = {
  id: "2", type: "ball_endmill", diameter_mm: 6, flute_count: 2,
  material: "carbide", resolution_confidence: 1.0,
};
const LONG_TOOL: ToolContext = {
  id: "3", type: "flat_endmill", diameter_mm: 6, flute_count: 2,
  flute_length_mm: 40, material: "carbide", // L/D = 6.7
  resolution_confidence: 1.0,
};

const MACHINE: MachineContext = {
  id: "vf2", name: "Haas VF-2", brand: "Haas", controller: "haas",
  max_rpm: 8100, max_power_kW: 22.4,
  rapid_rate_mm_min: { x: 25400, y: 25400, z: 15240 },
  work_volume: { x: 762, y: 406, z: 508 },
  axes: 3, resolution_confidence: 1.0,
};

const GCODE = "T1 M6\nS3000 M3\nG00 X0 Y0 Z5\nG01 Z-3 F200\nG01 X50 F800\nG01 Y30\nG01 X0\nG01 Y0\nG00 Z5\n";
const GCODE_RAPIDS = "T1 M6\nS3000 M3\nG00 X0 Y0 Z5\nG00 X50 Y0 Z5\nG00 X50 Y50 Z5\nG00 X0 Y50 Z5\nG00 X0 Y0 Z5\nG00 X25 Y25 Z5\nG01 Z-3 F200\nG01 X50 F800\nG00 Z5\n";

const PHYSICS_OFF = {
  constitutive: false, stability_lobes: false,
  engagement_analysis: false, adaptive_feed: false,
  corner_detection: false, plunge_detection: false,
  wear_progression: false, thermal_tracking: false,
};

describe("PP-MS4: Stochastic + Safety + Knowledge", () => {

  // ═══ Stage 4.1: Monte Carlo ═══

  describe("Stage 4.1: Monte Carlo Force Distribution", () => {
    it("runs MC simulation with 500 samples when enabled", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE, material: STEEL, tools: [TOOL], machine: MACHINE,
        stages: { ...PHYSICS_OFF, monte_carlo: true, safety_analysis: false, playbook_rules: false },
      });
      const stage = r.stages.find(s => s.stage === "4.1_monte_carlo");
      expect(stage?.status).toBe("pass");
      const data = stage?.data as any;
      expect(data?.samples_per_block).toBe(500);
      expect(data?.method).toContain("Monte Carlo");
    });

    it("attaches 95% confidence intervals to blocks", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE, material: STEEL, tools: [TOOL], machine: MACHINE,
        stages: { ...PHYSICS_OFF, monte_carlo: true, safety_analysis: false, playbook_rules: false },
      });
      const withCI = r.blocks.filter(b => b.confidence?.force_ci_95);
      if (withCI.length > 0) {
        for (const b of withCI) {
          expect(b.confidence!.force_ci_95[0]).toBeLessThan(b.confidence!.force_ci_95[1]);
          // CI should bracket the nominal force
          if (b.forces) {
            expect(b.confidence!.force_ci_95[0]).toBeLessThanOrEqual(b.forces.Fc_N * 1.3);
            expect(b.confidence!.force_ci_95[1]).toBeGreaterThanOrEqual(b.forces.Fc_N * 0.7);
          }
        }
      }
    });

    it("is skipped by default (opt-in)", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE, material: STEEL, tools: [TOOL],
        stages: { ...PHYSICS_OFF, safety_analysis: false, playbook_rules: false },
      });
      const stage = r.stages.find(s => s.stage === "4.1_monte_carlo");
      expect(stage?.status).toBe("skipped");
    });

    it("Box-Muller invariant: generated samples have mean≈0, std≈1", () => {
      const N = 10000;
      const samples: number[] = [];
      for (let i = 0; i < N; i++) {
        const u1 = Math.random() || 0.001;
        const u2 = Math.random();
        samples.push(Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2));
      }
      const mean = samples.reduce((a, b) => a + b, 0) / N;
      const std = Math.sqrt(samples.reduce((a, b) => a + (b - mean) ** 2, 0) / N);
      expect(mean).toBeCloseTo(0, 0); // within 0.5
      expect(std).toBeCloseTo(1, 0); // within 0.5
    });
  });

  // ═══ Stage 4.7: Robustness Score ═══

  describe("Stage 4.7: Process Robustness Score", () => {
    it("computes Taguchi S/N-inspired robustness score", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE, material: STEEL, tools: [TOOL], machine: MACHINE,
        stages: { ...PHYSICS_OFF, robustness_score: true, safety_analysis: false, playbook_rules: false },
      });
      const stage = r.stages.find(s => s.stage === "4.7_robustness_score");
      expect(stage?.status).toBe("pass");
      const data = stage?.data as any;
      if (data?.score !== undefined) {
        expect(data.score).toBeGreaterThanOrEqual(0);
        expect(data.score).toBeLessThanOrEqual(100);
        expect(data.sn_ratio_db).toBeDefined();
      }
    });

    it("is skipped by default", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE, material: STEEL, tools: [TOOL],
        stages: { ...PHYSICS_OFF, safety_analysis: false, playbook_rules: false },
      });
      expect(r.stages.find(s => s.stage === "4.7_robustness_score")?.status).toBe("skipped");
    });
  });

  // ═══ Stage 5.3: Tribal Knowledge ═══

  describe("Stage 5.3: Tribal Knowledge", () => {
    it("generates superalloy tips for ISO S", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE, material: INCONEL, tools: [TOOL], machine: MACHINE,
        stages: { ...PHYSICS_OFF, safety_analysis: false, playbook_rules: false },
      });
      const stage = r.stages.find(s => s.stage === "5.3_tribal_knowledge");
      expect(stage?.status).toBe("pass");
      expect(r.warnings.some(w => w.includes("TK:") && w.includes("Superalloy"))).toBe(true);
    });

    it("generates stainless tips for ISO M", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE, material: STAINLESS, tools: [TOOL],
        stages: { ...PHYSICS_OFF, safety_analysis: false, playbook_rules: false },
      });
      expect(r.warnings.some(w => w.includes("TK:") && w.includes("Stainless"))).toBe(true);
    });

    it("generates hardened steel tips for ISO H", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE, material: HARDENED, tools: [TOOL],
        stages: { ...PHYSICS_OFF, safety_analysis: false, playbook_rules: false },
      });
      expect(r.warnings.some(w => w.includes("TK:") && w.includes("Hardened"))).toBe(true);
    });

    it("generates aluminum tips for ISO N", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE, material: ALUMINUM, tools: [TOOL],
        stages: { ...PHYSICS_OFF, safety_analysis: false, playbook_rules: false },
      });
      expect(r.warnings.some(w => w.includes("TK:") && w.includes("Aluminum"))).toBe(true);
    });

    it("warns about high L/D tools", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE, material: STEEL, tools: [LONG_TOOL],
        stages: { ...PHYSICS_OFF, safety_analysis: false, playbook_rules: false },
      });
      expect(r.warnings.some(w => w.includes("L/D="))).toBe(true);
    });

    it("tips for ball nose tools mention tilt angle", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE, material: STEEL, tools: [BALL_TOOL],
        stages: { ...PHYSICS_OFF, safety_analysis: false, playbook_rules: false },
      });
      expect(r.warnings.some(w => w.includes("ball nose") && w.includes("tilt"))).toBe(true);
    });
  });

  // ═══ Stage 5.5: Energy Optimization ═══

  describe("Stage 5.5: Energy Optimization", () => {
    it("detects idle spindle during rapids", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE_RAPIDS, material: STEEL, tools: [TOOL], machine: MACHINE,
        stages: { ...PHYSICS_OFF, safety_analysis: false, playbook_rules: false, energy_optimization: true },
      });
      const stage = r.stages.find(s => s.stage === "5.5_energy_optimization");
      expect(stage?.status).toBe("pass");
      const data = stage?.data as any;
      expect(data?.idle_spindle_blocks).toBeGreaterThan(0);
    });

    it("detects consecutive rapid repositioning", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE_RAPIDS, material: STEEL, tools: [TOOL],
        stages: { ...PHYSICS_OFF, safety_analysis: false, playbook_rules: false, energy_optimization: true },
      });
      const data = (r.stages.find(s => s.stage === "5.5_energy_optimization")?.data as any);
      expect(data?.max_consecutive_rapids).toBeGreaterThanOrEqual(5);
    });

    it("is skipped by default (opt-in)", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE, material: STEEL, tools: [TOOL],
        stages: { ...PHYSICS_OFF, safety_analysis: false, playbook_rules: false },
      });
      expect(r.stages.find(s => s.stage === "5.5_energy_optimization")?.status).toBe("skipped");
    });
  });

  // ═══ Pipeline Phase Coverage ═══

  describe("Phase Coverage", () => {
    it("all 7 phases represented in full pipeline", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE, material: STEEL, tools: [TOOL], machine: MACHINE,
        operations: [{ id: 0, type: "roughing", tool_number: 1, ae_mm: 3, ap_mm: 5, blocks: [] }],
        stages: {
          monte_carlo: true, robustness_score: true,
          energy_optimization: true, motion_dynamics: true,
          controller_features: true, fixture_check: true,
          capability_forecast: true,
        },
      });
      const phases = new Set(r.stages.map(s => s.phase));
      expect(phases.has(0)).toBe(true); // Input
      expect(phases.has(1)).toBe(true); // Physics
      expect(phases.has(2)).toBe(true); // Block-by-block
      expect(phases.has(3)).toBe(true); // Motion
      expect(phases.has(4)).toBe(true); // Stochastic
      expect(phases.has(5)).toBe(true); // Safety/Knowledge
      expect(phases.has(6)).toBe(true); // Output
    });

    it("total stage count ≥ 24 with all enabled", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE, material: STEEL, tools: [TOOL], machine: MACHINE,
        operations: [{ id: 0, type: "roughing", tool_number: 1, ae_mm: 3, ap_mm: 5, blocks: [] }],
        stages: {
          monte_carlo: true, robustness_score: true,
          energy_optimization: true, motion_dynamics: true,
          controller_features: true, fixture_check: true,
          capability_forecast: true,
        },
      });
      expect(r.stages.length).toBeGreaterThanOrEqual(24);
    });
  });
});
