/**
 * KiloCamCoverageHarnessEngine Tests — KILO-CAM-MASTERY-MS0 campaign iter 4
 *
 * Verifies the Phase-5 every-toolpath planner:
 *   - matches toolpaths to features by geometry_hint (exact) then category (fallback)
 *   - surfaces unsatisfiable toolpaths (refuse-list)
 *   - enforces PMI gate (refuse to plan if features missing tolerance)
 *   - honors toolpath_allowlist for partial-coverage planning
 *
 * @milestone KILO-CAM-MASTERY-MS0
 */

import { describe, it, expect } from "vitest";
import {
  kiloCamCoverageHarnessEngine,
  CoveragePlanSchema,
  type PartGeometry,
  type ToolpathRef,
} from "../engines/KiloCamCoverageHarnessEngine.js";

const PART_RICH: PartGeometry = {
  part_id: "PART-COV",
  features: [
    { id: "F1", type: "face",   geometry_hint: "planar_face",         tolerance_total_mm: 0.05 },
    { id: "F2", type: "pocket", geometry_hint: "3d_roughing_volume",  tolerance_total_mm: 0.05 },
    { id: "F3", type: "hole",   geometry_hint: "simple_hole",         tolerance_total_mm: 0.01 },
    { id: "F4", type: "thread", geometry_hint: "tapped_hole",         tolerance_total_mm: 0.025 },
    { id: "F5", type: "surface",geometry_hint: "ruled_swarf_surface", tolerance_total_mm: 0.03 },
  ],
  material_iso_group: "P",
};

const PART_PMI_GAP: PartGeometry = {
  part_id: "PART-GAP",
  features: [
    { id: "F1", type: "face", geometry_hint: "planar_face", tolerance_total_mm: 0.05 },
    { id: "F2", type: "pocket", geometry_hint: "3d_roughing_volume" }, // no tolerance
  ],
  material_iso_group: "P",
};

const TPS: ToolpathRef[] = [
  { id: "hm.2d.face_milling", category: "face",   geometry_hint: "planar_face" },
  { id: "hm.3dr.optirough",   category: "pocket", geometry_hint: "3d_roughing_volume" },
  { id: "hm.5x.swarf",        category: "5axis",  geometry_hint: "ruled_swarf_surface" },
  { id: "hm.drill.g81",       category: "hole",   geometry_hint: "simple_hole" },
  { id: "hm.drill.g84_tap",   category: "thread", geometry_hint: "tapped_hole" },
];

const TPS_WITH_UNSATISFIABLE: ToolpathRef[] = [
  ...TPS,
  { id: "hm.5x.impeller_blisk", category: "5axis", geometry_hint: "impeller_or_blisk" },
];

describe("KiloCamCoverageHarnessEngine", () => {
  describe("planCoverage — exact geometry_hint matching", () => {
    it("matches face_milling to planar_face feature", () => {
      const plan = kiloCamCoverageHarnessEngine.planCoverage(PART_RICH, "hypermill", TPS);
      const step = plan.plan_steps.find(s => s.toolpath_id === "hm.2d.face_milling")!;
      expect(step.target_feature_id).toBe("F1");
      expect(step.match_kind).toBe("geometry_exact");
    });

    it("matches optirough to 3d_roughing_volume feature", () => {
      const plan = kiloCamCoverageHarnessEngine.planCoverage(PART_RICH, "hypermill", TPS);
      const step = plan.plan_steps.find(s => s.toolpath_id === "hm.3dr.optirough")!;
      expect(step.target_feature_id).toBe("F2");
    });

    it("matches drill_g81 to simple_hole feature", () => {
      const plan = kiloCamCoverageHarnessEngine.planCoverage(PART_RICH, "hypermill", TPS);
      const step = plan.plan_steps.find(s => s.toolpath_id === "hm.drill.g81")!;
      expect(step.target_feature_id).toBe("F3");
    });

    it("matches swarf to ruled_swarf_surface feature", () => {
      const plan = kiloCamCoverageHarnessEngine.planCoverage(PART_RICH, "hypermill", TPS);
      const step = plan.plan_steps.find(s => s.toolpath_id === "hm.5x.swarf")!;
      expect(step.target_feature_id).toBe("F5");
    });
  });

  describe("planCoverage — coverage metrics", () => {
    it("rich part fully covers the 5-toolpath set", () => {
      const plan = kiloCamCoverageHarnessEngine.planCoverage(PART_RICH, "hypermill", TPS);
      expect(plan.covered_toolpath_ids.length).toBe(5);
      expect(plan.coverage_pct).toBe(100);
      expect(plan.unsatisfiable_toolpaths.length).toBe(0);
    });

    it("plan_steps ordered by op_index 0..N-1", () => {
      const plan = kiloCamCoverageHarnessEngine.planCoverage(PART_RICH, "hypermill", TPS);
      for (let i = 0; i < plan.plan_steps.length; i++) {
        expect(plan.plan_steps[i].op_index).toBe(i);
      }
    });

    it("tolerance flows from feature to plan_step verbatim (refuse-list)", () => {
      const plan = kiloCamCoverageHarnessEngine.planCoverage(PART_RICH, "hypermill", TPS);
      const face = plan.plan_steps.find(s => s.toolpath_id === "hm.2d.face_milling")!;
      expect(face.tolerance_total_mm).toBe(0.05);
      const thread = plan.plan_steps.find(s => s.toolpath_id === "hm.drill.g84_tap")!;
      expect(thread.tolerance_total_mm).toBe(0.025);
    });
  });

  describe("refuse: unsatisfiable toolpaths surfaced (not silenced)", () => {
    it("impeller_blisk toolpath surfaces in unsatisfiable list (no part feature matches)", () => {
      const plan = kiloCamCoverageHarnessEngine.planCoverage(PART_RICH, "hypermill", TPS_WITH_UNSATISFIABLE);
      expect(plan.unsatisfiable_toolpaths.length).toBe(1);
      expect(plan.unsatisfiable_toolpaths[0].toolpath_id).toBe("hm.5x.impeller_blisk");
    });

    it("unsatisfiable count reduces coverage_pct accordingly", () => {
      const plan = kiloCamCoverageHarnessEngine.planCoverage(PART_RICH, "hypermill", TPS_WITH_UNSATISFIABLE);
      // 5 covered of 6 considered = 83.33%
      expect(plan.coverage_pct).toBeCloseTo(83.33, 1);
    });

    it("unsatisfiable_toolpaths includes reason (operator-actionable)", () => {
      const plan = kiloCamCoverageHarnessEngine.planCoverage(PART_RICH, "hypermill", TPS_WITH_UNSATISFIABLE);
      const unsat = plan.unsatisfiable_toolpaths[0];
      expect(unsat.reason.length).toBeGreaterThan(0);
      expect(unsat.reason).toMatch(/impeller_or_blisk/);
    });
  });

  describe("refuse: PMI gate (emitting-program-without-pmi-validation)", () => {
    it("part with missing tolerance fails the PMI gate (pmiSurfacePass=true default)", () => {
      const plan = kiloCamCoverageHarnessEngine.planCoverage(PART_PMI_GAP, "hypermill", TPS);
      expect(plan.pmi_gate.passed).toBe(false);
      expect(plan.pmi_gate.features_missing_tolerance).toContain("F2");
    });

    it("PMI failure returns empty plan_steps (refuse to emit)", () => {
      const plan = kiloCamCoverageHarnessEngine.planCoverage(PART_PMI_GAP, "hypermill", TPS);
      expect(plan.plan_steps.length).toBe(0);
      expect(plan.coverage_pct).toBe(0);
    });

    it("pmiSurfacePass=false bypasses the gate (fixture-test escape hatch)", () => {
      const plan = kiloCamCoverageHarnessEngine.planCoverage(PART_PMI_GAP, "hypermill", TPS, {
        pmiSurfacePass: false,
      });
      expect(plan.pmi_gate.passed).toBe(false); // still surfaces the truth
      expect(plan.plan_steps.length).toBeGreaterThan(0); // but plan emitted
    });

    it("rich part with full tolerance passes the PMI gate", () => {
      const plan = kiloCamCoverageHarnessEngine.planCoverage(PART_RICH, "hypermill", TPS);
      expect(plan.pmi_gate.passed).toBe(true);
      expect(plan.pmi_gate.features_missing_tolerance.length).toBe(0);
    });
  });

  describe("planCoverage — toolpath_allowlist", () => {
    it("allowlist restricts considered toolpaths", () => {
      const plan = kiloCamCoverageHarnessEngine.planCoverage(PART_RICH, "hypermill", TPS, {
        toolpath_allowlist: ["hm.2d.face_milling", "hm.3dr.optirough"],
      });
      expect(plan.plan_steps.length).toBe(2);
      expect(plan.covered_toolpath_ids).toEqual(["hm.2d.face_milling", "hm.3dr.optirough"]);
    });

    it("empty allowlist (intersected with no toolpath) yields 0 coverage", () => {
      const plan = kiloCamCoverageHarnessEngine.planCoverage(PART_RICH, "hypermill", TPS, {
        toolpath_allowlist: ["does.not.exist"],
      });
      expect(plan.plan_steps.length).toBe(0);
      expect(plan.coverage_pct).toBe(0);
    });
  });

  describe("R12 schema gates", () => {
    it("output passes own zod schema round-trip", () => {
      const plan = kiloCamCoverageHarnessEngine.planCoverage(PART_RICH, "hypermill", TPS);
      const parsed = CoveragePlanSchema.parse(plan);
      expect(parsed.plan_steps.length).toBe(5);
    });

    it("empty features array rejected", () => {
      expect(() =>
        kiloCamCoverageHarnessEngine.planCoverage({
          part_id: "EMPTY", features: [], material_iso_group: "P",
        }, "hypermill", TPS),
      ).toThrow();
    });

    it("invalid material iso_group rejected", () => {
      const bad = { ...PART_RICH, material_iso_group: "Z" as never };
      expect(() =>
        kiloCamCoverageHarnessEngine.planCoverage(bad as PartGeometry, "hypermill", TPS),
      ).toThrow();
    });

    it("output fingerprints source for auditability", () => {
      const plan = kiloCamCoverageHarnessEngine.planCoverage(PART_RICH, "hypermill", TPS);
      expect(plan.source).toBe("kilo_cam_coverage_harness");
    });

    it("system + part_id + material flow through unchanged", () => {
      const plan = kiloCamCoverageHarnessEngine.planCoverage(PART_RICH, "hypermill", TPS);
      expect(plan.system).toBe("hypermill");
      expect(plan.part_id).toBe("PART-COV");
      expect(plan.material_iso_group).toBe("P");
    });
  });
});
