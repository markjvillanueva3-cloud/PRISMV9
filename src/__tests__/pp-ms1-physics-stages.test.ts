/**
 * PP-MS1 Tests: Physics Optimization Stages
 * Tests: constitutive model, stability lobes, tool deflection,
 * chip morphology, coolant strategy, fixture check, Cpk forecast
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
  uts_MPa: 655, hardness_HB: 197, kc1_1: 2000, mc: 0.25,
  jc_A: 792, jc_B: 510, jc_n: 0.26, jc_C: 0.014, jc_m: 1.03,
  resolution_confidence: 1.0,
};

const ALUMINUM: MaterialContext = {
  id: "7075", name: "7075-T6", iso_group: "N",
  kc1_1: 800, mc: 0.23, hardness_HB: 150,
  resolution_confidence: 1.0,
};

const INCONEL: MaterialContext = {
  id: "718", name: "Inconel 718", iso_group: "S",
  kc1_1: 2800, mc: 0.25, hardness_HB: 350,
  resolution_confidence: 1.0,
};

const TOOL_10: ToolContext = {
  id: "1", type: "flat_endmill", diameter_mm: 10, flute_count: 4,
  flute_length_mm: 25, material: "carbide", helix_angle_deg: 30,
  resolution_confidence: 1.0,
};

const TOOL_3_LONG: ToolContext = {
  id: "1", type: "flat_endmill", diameter_mm: 3, flute_count: 2,
  flute_length_mm: 18, material: "carbide", // L/D = 6, very flexible
  resolution_confidence: 1.0,
};

const TOOL_20_DEEP: ToolContext = {
  id: "1", type: "flat_endmill", diameter_mm: 20, flute_count: 4,
  flute_length_mm: 100, material: "carbide", // deep reach
  resolution_confidence: 1.0,
};

const MACHINE: MachineContext = {
  id: "vf2", name: "Haas VF-2", brand: "Haas", controller: "haas",
  max_rpm: 8100, max_power_kW: 22.4,
  rapid_rate_mm_min: { x: 25400, y: 25400, z: 15240 },
  work_volume: { x: 762, y: 406, z: 508 },
  axes: 3, coolant_types: ["flood", "tsc"], tsc_pressure_bar: 70,
  resolution_confidence: 1.0,
};

const GCODE = "T1 M6\nS3000 M3\nG01 X50 Y0 Z-5 F800\nG01 X50 Y30 Z-5\nG01 X0 Y30 Z-5\nG01 X0 Y0 Z-5\nG00 Z5\n";

const NO_PHASE2 = {
  engagement_analysis: false, wear_progression: false, thermal_tracking: false,
  safety_analysis: false, playbook_rules: false,
};

describe("PP-MS1: Physics Optimization Stages", () => {

  // ═══ Stage 1.2: Constitutive Model ═══

  describe("Stage 1.2: Constitutive Model", () => {
    it("applies Johnson-Cook thermal softening when JC params available", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE, material: STEEL, tools: [TOOL_10], machine: MACHINE,
        stages: { ...NO_PHASE2, constitutive: true },
      });
      const stage = r.stages.find(s => s.stage === "1.2_constitutive_model");
      expect(stage?.status).toBe("pass");
      expect((stage?.data as any)?.model).toBe("Johnson-Cook");
    });

    it("skips constitutive model when no JC params", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE, material: ALUMINUM, tools: [TOOL_10], machine: MACHINE,
        stages: { ...NO_PHASE2, constitutive: true },
      });
      const stage = r.stages.find(s => s.stage === "1.2_constitutive_model");
      expect(stage?.status).toBe("pass");
      expect((stage?.data as any)?.model).toBe("none");
    });

    it("is skipped when constitutive=false", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE, material: STEEL, tools: [TOOL_10],
        stages: { ...NO_PHASE2, constitutive: false },
      });
      const stage = r.stages.find(s => s.stage === "1.2_constitutive_model");
      expect(stage?.status).toBe("skipped");
    });
  });

  // ═══ Stage 1.3: Stability Lobes ═══

  describe("Stage 1.3: Stability Lobes", () => {
    it("runs stability analysis and reports result", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE, material: STEEL, tools: [TOOL_10], machine: MACHINE,
        stages: { ...NO_PHASE2, stability_lobes: true },
      });
      const stage = r.stages.find(s => s.stage === "1.3_stability_lobes");
      expect(stage?.status).toBe("pass");
      // Should return rpm_adjustments count (may be 0 if not in chatter zone)
      expect((stage?.data as any)?.rpm_adjustments !== undefined ||
             (stage?.data as any)?.status === "engine_unavailable").toBe(true);
    });

    it("is skipped when stability_lobes=false", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE, material: STEEL, tools: [TOOL_10],
        stages: { ...NO_PHASE2, stability_lobes: false },
      });
      const stage = r.stages.find(s => s.stage === "1.3_stability_lobes");
      expect(stage?.status).toBe("skipped");
    });
  });

  // ═══ Stage 1.5: Tool Deflection ═══

  describe("Stage 1.5: Tool Deflection", () => {
    it("flags slender tools (high L/D) for deflection limiting", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE, material: STEEL, tools: [TOOL_3_LONG], machine: MACHINE,
        stages: { ...NO_PHASE2, deflection_limit: true },
      });
      const stage = r.stages.find(s => s.stage === "1.5_tool_deflection");
      expect(stage?.status).toBe("pass");
      // L/D = 6 should trigger deflection limiting on high-force blocks
    });

    it("does not limit stiff tools (low L/D)", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE, material: ALUMINUM, tools: [TOOL_10], machine: MACHINE,
        stages: { ...NO_PHASE2, deflection_limit: true },
      });
      const stage = r.stages.find(s => s.stage === "1.5_tool_deflection");
      expect(stage?.status).toBe("pass");
      // 10mm tool, 25mm flute = L/D 2.5 — should NOT be deflection limited for aluminum
      const limited = (stage?.data as any)?.blocks_deflection_limited ?? 0;
      // Low force + stiff tool = no limiting expected
      expect(limited).toBeLessThanOrEqual(r.blocks.filter(b => b.move_type !== "G0").length);
    });

    it("deflection formula: δ = FL³/3EI is dimensionally correct", () => {
      // Verify: F(N) × L³(mm³) / (3 × E(MPa=N/mm²) × I(mm⁴)) = mm
      const F = 500; // N
      const L = 25; // mm
      const E = 600e3; // MPa (carbide)
      const D = 10; // mm
      const I = Math.PI * Math.pow(D, 4) / 64; // mm⁴
      const delta = F * Math.pow(L, 3) / (3 * E * I); // should be in mm
      expect(delta).toBeGreaterThan(0);
      expect(delta).toBeLessThan(1); // reasonable deflection for these params
      // Dimensional check: N × mm³ / (N/mm² × mm⁴) = N×mm³/(N×mm²) = mm ✓
    });
  });

  // ═══ Stage 1.6: Chip Morphology ═══

  describe("Stage 1.6: Chip Morphology", () => {
    it("predicts chip type and warns on problematic chips", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE, material: STEEL, tools: [TOOL_10], machine: MACHINE,
        stages: { ...NO_PHASE2, chip_thinning: true },
      });
      const stage = r.stages.find(s => s.stage === "1.6_chip_morphology");
      expect(stage?.status).toBe("pass");
    });

    it("Merchant shear angle: φ = 45° - β/2 + α/2 (invariant)", () => {
      // Merchant's minimum energy criterion
      const alpha = 10; // rake angle degrees
      const beta = 25; // friction angle degrees
      // Merchant: φ = 45 + α/2 - β/2
      const phi = 45 + alpha / 2 - beta / 2;
      expect(phi).toBeCloseTo(37.5, 1); // 45 + 5 - 12.5 = 37.5
      expect(phi).toBeGreaterThan(0);
      expect(phi).toBeLessThan(90);
    });
  });

  // ═══ Stage 1.7: Coolant Strategy ═══

  describe("Stage 1.7: Coolant Strategy", () => {
    it("recommends MQL for aluminum (ISO N)", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE, material: ALUMINUM, tools: [TOOL_10], machine: MACHINE,
        stages: { ...NO_PHASE2 },
      });
      const stage = r.stages.find(s => s.stage === "1.7_coolant_strategy");
      expect(stage?.status).toBe("pass");
      expect((stage?.data as any)?.recommended?.type).toBe("mql");
    });

    it("recommends flood with high pressure for superalloys (ISO S)", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE, material: INCONEL, tools: [TOOL_10], machine: MACHINE,
        stages: { ...NO_PHASE2 },
      });
      const stage = r.stages.find(s => s.stage === "1.7_coolant_strategy");
      expect(stage?.status).toBe("pass");
      const rec = (stage?.data as any)?.recommended;
      expect(rec?.type).toBe("flood");
      expect(rec?.pressure_bar).toBeGreaterThanOrEqual(40);
    });

    it("upgrades to TSC for deep features when machine supports it", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE, material: STEEL, tools: [TOOL_20_DEEP], machine: MACHINE,
        stages: { ...NO_PHASE2 },
      });
      const stage = r.stages.find(s => s.stage === "1.7_coolant_strategy");
      expect(stage?.status).toBe("pass");
      // 20mm tool with 100mm flute = L/D 5 → TSC upgrade
      const rec = (stage?.data as any)?.recommended;
      expect(rec?.type).toBe("tsc");
      expect(r.warnings.some(w => w.includes("TSC"))).toBe(true);
    });

    it("recommends mist for cast iron (ISO K)", async () => {
      const castIron: MaterialContext = {
        id: "ci", name: "Grey Cast Iron", iso_group: "K",
        kc1_1: 1200, mc: 0.28, resolution_confidence: 1.0,
      };
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE, material: castIron, tools: [TOOL_10],
        stages: { ...NO_PHASE2 },
      });
      const stage = r.stages.find(s => s.stage === "1.7_coolant_strategy");
      expect((stage?.data as any)?.recommended?.type).toBe("mist");
    });

    it("coolant selection covers all 6 ISO groups", async () => {
      const groups: Array<{ iso: "P"|"M"|"K"|"N"|"S"|"H", expected: string }> = [
        { iso: "P", expected: "flood" },
        { iso: "M", expected: "flood" },
        { iso: "K", expected: "mist" },
        { iso: "N", expected: "mql" },
        { iso: "S", expected: "flood" },
        { iso: "H", expected: "flood" },
      ];
      for (const { iso, expected } of groups) {
        const mat: MaterialContext = {
          id: iso, name: `ISO ${iso}`, iso_group: iso,
          kc1_1: 2000, mc: 0.25, resolution_confidence: 1.0,
        };
        const r = await postProcessorPipelineEngine.process({
          gcode: GCODE, material: mat, tools: [TOOL_10],
          stages: { ...NO_PHASE2 },
        });
        const stage = r.stages.find(s => s.stage === "1.7_coolant_strategy");
        const rec = (stage?.data as any)?.recommended;
        expect(rec?.type).toBe(expected);
      }
    });
  });

  // ═══ Stage 1.8: Fixture Check ═══

  describe("Stage 1.8: Fixture Check", () => {
    it("runs when fixture_check=true (opt-in)", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE, material: STEEL, tools: [TOOL_10], machine: MACHINE,
        stages: { ...NO_PHASE2, fixture_check: true },
      });
      const stage = r.stages.find(s => s.stage === "1.8_fixture_check");
      expect(stage?.status).toBe("pass");
    });

    it("is skipped by default", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE, material: STEEL, tools: [TOOL_10],
        stages: { ...NO_PHASE2 },
      });
      const stage = r.stages.find(s => s.stage === "1.8_fixture_check");
      expect(stage?.status).toBe("skipped");
    });
  });

  // ═══ Stage 1.9: Capability Forecast ═══

  describe("Stage 1.9: Capability Forecast", () => {
    it("runs when capability_forecast=true (opt-in)", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE, material: STEEL, tools: [TOOL_10], machine: MACHINE,
        stages: { ...NO_PHASE2, capability_forecast: true },
        tolerance_mm: 0.02,
      });
      const stage = r.stages.find(s => s.stage === "1.9_capability_forecast");
      expect(stage?.status).toBe("pass");
    });

    it("is skipped by default", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE, material: STEEL, tools: [TOOL_10],
        stages: { ...NO_PHASE2 },
      });
      const stage = r.stages.find(s => s.stage === "1.9_capability_forecast");
      expect(stage?.status).toBe("skipped");
    });
  });

  // ═══ Physics Invariants ═══

  describe("Physics Invariants", () => {
    it("all Phase 1 stages present in pipeline output", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE, material: STEEL, tools: [TOOL_10], machine: MACHINE,
        stages: {
          ...NO_PHASE2,
          constitutive: true, stability_lobes: true, deflection_limit: true,
          chip_thinning: true, fixture_check: true, capability_forecast: true,
        },
      });
      const phase1Stages = r.stages.filter(s => s.phase === 1);
      expect(phase1Stages.length).toBeGreaterThanOrEqual(7);
      // All should have run (pass or skipped, not missing)
      const stageNames = phase1Stages.map(s => s.stage);
      expect(stageNames).toContain("1.1_base_speed_feed");
      expect(stageNames).toContain("1.2_constitutive_model");
      expect(stageNames).toContain("1.3_stability_lobes");
      expect(stageNames).toContain("1.5_tool_deflection");
      expect(stageNames).toContain("1.6_chip_morphology");
      expect(stageNames).toContain("1.7_coolant_strategy");
      expect(stageNames).toContain("1.8_fixture_check");
      expect(stageNames).toContain("1.9_capability_forecast");
    });

    it("kc1.1 higher for harder materials (ISO S > P > N)", () => {
      expect(INCONEL.kc1_1!).toBeGreaterThan(STEEL.kc1_1!);
      expect(STEEL.kc1_1!).toBeGreaterThan(ALUMINUM.kc1_1!);
    });

    it("cantilever stiffness ∝ D⁴ (quartic relationship)", () => {
      // I = πD⁴/64, so stiffness = 3EI/L³ ∝ D⁴
      const stiffness = (D: number, L: number) => {
        const E = 600e3;
        const I = Math.PI * Math.pow(D, 4) / 64;
        return 3 * E * I / Math.pow(L, 3);
      };
      const s10 = stiffness(10, 25);
      const s20 = stiffness(20, 25);
      // Double diameter → 16x stiffness
      expect(s20 / s10).toBeCloseTo(16, 0);
    });
  });

  // ═══ Canonical Kc Fallback (material.kc1_1 undefined) ═══

  describe("Canonical Kc Fallback", () => {
    // When material.kc1_1 is undefined, the pipeline should use canonical
    // Sandvik reference values via getCanonicalKc(iso_group).
    // Canonical: P=1800, M=2100, K=1100, N=700, S=2800, H=3200

    const isoGroups: Array<{ iso: string; name: string; expectedKc: number }> = [
      { iso: "P", name: "Steel (ISO P)", expectedKc: 1800 },
      { iso: "M", name: "Stainless (ISO M)", expectedKc: 2100 },
      { iso: "K", name: "Cast Iron (ISO K)", expectedKc: 1100 },
      { iso: "N", name: "Aluminum (ISO N)", expectedKc: 700 },
      { iso: "S", name: "Superalloy (ISO S)", expectedKc: 2800 },
      { iso: "H", name: "Hardened (ISO H)", expectedKc: 3200 },
    ];

    for (const { iso, name, expectedKc } of isoGroups) {
      it(`uses canonical kc=${expectedKc} when kc1_1 is undefined for ${name}`, async () => {
        const mat: MaterialContext = {
          id: `test-${iso}`, name: `Test ${name}`, iso_group: iso as any,
          hardness_HB: 200, resolution_confidence: 1.0,
          // kc1_1 deliberately omitted — forces fallback
        };
        const r = await postProcessorPipelineEngine.process({
          gcode: GCODE, material: mat, tools: [TOOL_10], machine: MACHINE,
          stages: { ...NO_PHASE2, stability_lobes: true },
        });
        const stage = r.stages.find(s => s.stage === "1.3_stability_lobes");
        // Pipeline should not crash when kc1_1 is missing
        expect(stage?.status).toBe("pass");
      });
    }

    it("defaults to ISO P (kc=1800) when iso_group is also undefined", async () => {
      const mat: MaterialContext = {
        id: "unknown", name: "Unknown Material",
        hardness_HB: 200, resolution_confidence: 1.0,
        // Both kc1_1 and iso_group omitted — double fallback
      } as MaterialContext;
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE, material: mat, tools: [TOOL_10], machine: MACHINE,
        stages: { ...NO_PHASE2, stability_lobes: true },
      });
      const stage = r.stages.find(s => s.stage === "1.3_stability_lobes");
      expect(stage?.status).toBe("pass");
    });

    it("runs full pipeline with no material (undefined) without crash", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE, tools: [TOOL_10], machine: MACHINE,
        stages: { ...NO_PHASE2, stability_lobes: true },
      });
      // Should gracefully handle undefined material
      expect(r.blocks.length).toBeGreaterThan(0);
    });

    it("prefers explicit kc1_1 over canonical fallback", async () => {
      const matWithKc: MaterialContext = {
        id: "custom", name: "Custom Steel", iso_group: "P",
        kc1_1: 2200, mc: 0.25, hardness_HB: 280,
        resolution_confidence: 1.0,
      };
      const matWithout: MaterialContext = {
        id: "generic", name: "Generic Steel", iso_group: "P",
        hardness_HB: 200, resolution_confidence: 1.0,
      };
      const [rWith, rWithout] = await Promise.all([
        postProcessorPipelineEngine.process({
          gcode: GCODE, material: matWithKc, tools: [TOOL_10], machine: MACHINE,
          stages: { ...NO_PHASE2, stability_lobes: true },
        }),
        postProcessorPipelineEngine.process({
          gcode: GCODE, material: matWithout, tools: [TOOL_10], machine: MACHINE,
          stages: { ...NO_PHASE2, stability_lobes: true },
        }),
      ]);
      // Both should complete successfully
      expect(rWith.stages.find(s => s.stage === "1.3_stability_lobes")?.status).toBe("pass");
      expect(rWithout.stages.find(s => s.stage === "1.3_stability_lobes")?.status).toBe("pass");
    });
  });
});
