/**
 * LathePrintProgramSignoffEngine Tests — U-LTH41 FINAL
 *
 * Full signoff package generation: validation, feature rows, risks, Cpk,
 * approval chain, markdown rendering. JM Die samples + adversarial.
 *
 * @milestone LATHE-MASTER U-LTH41
 */

import { describe, it, expect } from "vitest";
import {
  lathePrintProgramSignoffEngine,
  type SignoffInput,
} from "../engines/LathePrintProgramSignoffEngine.js";
import {
  lathePrintFeatureStrategySelectorEngine,
  type FeatureInput,
  type MaterialInput,
} from "../engines/LathePrintFeatureStrategySelectorEngine.js";
import {
  lathePrintSequencePlannerEngine,
  type StockInput,
} from "../engines/LathePrintSequencePlannerEngine.js";
import { lathePrintSetupSelectionEngine } from "../engines/LathePrintSetupSelectionEngine.js";
import { lathePrintToolpathGeneratorEngine } from "../engines/LathePrintToolpathGeneratorEngine.js";
import { lathePrintProgramEmitterEngine } from "../engines/LathePrintProgramEmitterEngine.js";
import { ACTIONS as camActions } from "../tools/dispatchers/camDispatcher.js";

// ============================================================================
// FIXTURES
// ============================================================================

const STEEL: MaterialInput = { name: "1018 Steel", iso_group: "P", tensile_strength_mpa: 440 };
const ALUM: MaterialInput = { name: "6061", iso_group: "N", tensile_strength_mpa: 310 };
const INCO: MaterialInput = { name: "Inconel 718", iso_group: "S", hardness_hrc: 36, tensile_strength_mpa: 1350 };

const JM_PIN: FeatureInput[] = [
  { id: "F1", type: "face", diameter_mm: 25.4, depth_mm: 2, tolerance_total_mm: 0.05, ra_um_target: 3.2 },
  { id: "F2", type: "od_turn", diameter_mm: 25.4, length_mm: 50, tolerance_total_mm: 0.025, ra_um_target: 1.6, is_critical: true, cpk_target: 1.67 },
  { id: "F3", type: "groove_od", diameter_mm: 20, depth_mm: 2.5, tolerance_total_mm: 0.05 },
];

const STOCK: StockInput = { od_mm: 30, length_mm: 80, id_mm: 0 };

/** Build full upstream artifact chain */
function buildArtifacts(features: FeatureInput[], material: MaterialInput): SignoffInput {
  const strat = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(features, material);
  const seq = lathePrintSequencePlannerEngine.planSequence(strat, STOCK, features);
  const geometry = lathePrintSetupSelectionEngine.inferGeometry(features);
  const loads = lathePrintSetupSelectionEngine.estimateLoads(seq, material);
  const setup = lathePrintSetupSelectionEngine.selectSetup(geometry, material, loads);
  const toolpath = lathePrintToolpathGeneratorEngine.generateProgram(seq, features, material);
  const emitted = lathePrintProgramEmitterEngine.emit(toolpath, { controller: "fanuc" });

  return {
    strategy_plan: strat,
    sequence_plan: seq,
    setup,
    toolpath,
    emitted,
    features,
    material,
    part_number: "TEST-001",
    customer: "JM DIE",
  };
}

describe("LathePrintProgramSignoffEngine", () => {
  describe("Happy Path — Full Pipeline", () => {
    it("generates complete signoff package for JM Pin", () => {
      const input = buildArtifacts(JM_PIN, STEEL);
      const pkg = lathePrintProgramSignoffEngine.generatePackage(input);

      expect(pkg.package_id).toMatch(/^signoff_/);
      expect(pkg.program_id).toBe(input.toolpath.program_id);
      expect(pkg.part_number).toBe("TEST-001");
      expect(pkg.customer).toBe("JM DIE");
      expect(pkg.feature_strategy_ops.length).toBe(JM_PIN.length);
      expect(pkg.release_ready).toBe(true);
      expect(pkg.critical_fail_count).toBe(0);
    });

    it("includes all validation check categories", () => {
      const input = buildArtifacts(JM_PIN, STEEL);
      const pkg = lathePrintProgramSignoffEngine.generatePackage(input);

      const categories = new Set(pkg.validation_checks.map(c => c.category));
      expect(categories.has("syntax")).toBe(true);
      expect(categories.has("envelope")).toBe(true);
      expect(categories.has("physics")).toBe(true);
      expect(categories.has("safety")).toBe(true);
      expect(categories.has("setup")).toBe(true);
    });

    it("feature table has tool, RPM, feed, force per row", () => {
      const input = buildArtifacts(JM_PIN, STEEL);
      const pkg = lathePrintProgramSignoffEngine.generatePackage(input);

      pkg.feature_strategy_ops.forEach(row => {
        expect(row.tool_id).toMatch(/^T/);
        expect(row.spindle_rpm).toBeGreaterThan(0);
        expect(row.feed_mm_min).toBeGreaterThan(0);
        expect(row.cutting_force_n).toBeGreaterThan(0);
      });
    });
  });

  describe("Cpk Prediction", () => {
    it("predicts Cpk for features with tolerance", () => {
      const input = buildArtifacts(JM_PIN, STEEL);
      const pkg = lathePrintProgramSignoffEngine.generatePackage(input);

      const f2 = pkg.feature_strategy_ops.find(r => r.feature_id === "F2");
      expect(f2?.cpk_target).toBe(1.67);
      expect(f2?.cpk_predicted).toBeGreaterThan(0);
      expect(f2?.cpk_status).toBeDefined();
    });

    it("summary reports average and minimum Cpk", () => {
      const input = buildArtifacts(JM_PIN, STEEL);
      const pkg = lathePrintProgramSignoffEngine.generatePackage(input);

      expect(pkg.cpk_summary.critical_features).toBeGreaterThanOrEqual(1);
      expect(pkg.cpk_summary.avg_predicted_cpk).toBeGreaterThan(0);
      expect(pkg.cpk_summary.min_predicted_cpk).toBeGreaterThan(0);
    });
  });

  describe("Risk Identification", () => {
    it("flags L/D risk for long Inconel shaft (material + rigidity concern)", () => {
      // L/D = 300/15 = 20 → triggers R-003 part_rigidity risk (L/D > 8)
      const longShaft: FeatureInput[] = [
        { id: "H1", type: "od_turn", diameter_mm: 15, length_mm: 300 },
      ];
      const input = buildArtifacts(longShaft, INCO);
      const pkg = lathePrintProgramSignoffEngine.generatePackage(input);

      const rigidityRisk = pkg.risks.find(r => r.category === "part_rigidity");
      expect(rigidityRisk).toBeTruthy();
      expect(rigidityRisk!.severity === "high" || rigidityRisk!.severity === "medium").toBe(true);
    });

    it("no critical risks for clean aluminum part", () => {
      const input = buildArtifacts(JM_PIN, ALUM);
      const pkg = lathePrintProgramSignoffEngine.generatePackage(input);

      const criticals = pkg.risks.filter(r => r.severity === "critical");
      expect(criticals.length).toBe(0);
    });

    it("flags L/D risk for long parts", () => {
      const longShaft: FeatureInput[] = [
        { id: "L1", type: "od_turn", diameter_mm: 15, length_mm: 200 },
      ];
      const input = buildArtifacts(longShaft, STEEL);
      const pkg = lathePrintProgramSignoffEngine.generatePackage(input);

      const ldRisk = pkg.risks.find(r => r.category === "part_rigidity");
      expect(ldRisk).toBeTruthy();
    });
  });

  describe("Approval Chain", () => {
    it("includes programmer + machinist for simple program", () => {
      const input = buildArtifacts(JM_PIN, ALUM);
      const pkg = lathePrintProgramSignoffEngine.generatePackage(input);

      const roles = pkg.approval_chain.map(a => a.role);
      expect(roles).toContain("programmer");
      expect(roles).toContain("machinist");
    });

    it("adds engineer for long programs (>15 ops)", () => {
      const manyFeatures: FeatureInput[] = Array.from({ length: 18 }, (_, i) => ({
        id: `M${i}`, type: "od_turn" as const, diameter_mm: 25, length_mm: 20,
      }));
      const input = buildArtifacts(manyFeatures, STEEL);
      const pkg = lathePrintProgramSignoffEngine.generatePackage(input);

      const roles = pkg.approval_chain.map(a => a.role);
      expect(roles).toContain("engineer");
    });

    it("approve() marks role as approved", () => {
      const input = buildArtifacts(JM_PIN, ALUM);
      const pkg = lathePrintProgramSignoffEngine.generatePackage(input);
      const approved = lathePrintProgramSignoffEngine.approve(pkg, "programmer", "Mark V.", "LGTM");

      const programmer = approved.approval_chain.find(a => a.role === "programmer");
      expect(programmer?.approved).toBe(true);
      expect(programmer?.approver_name).toBe("Mark V.");
      expect(programmer?.notes).toBe("LGTM");
    });

    it("isFullyApproved returns true only after all required approvals", () => {
      const input = buildArtifacts(JM_PIN, ALUM);
      let pkg = lathePrintProgramSignoffEngine.generatePackage(input);

      expect(lathePrintProgramSignoffEngine.isFullyApproved(pkg)).toBe(false);

      pkg = lathePrintProgramSignoffEngine.approve(pkg, "programmer", "M");
      pkg = lathePrintProgramSignoffEngine.approve(pkg, "machinist", "J");

      expect(lathePrintProgramSignoffEngine.isFullyApproved(pkg)).toBe(true);
    });
  });

  describe("Markdown Report", () => {
    it("contains all major sections", () => {
      const input = buildArtifacts(JM_PIN, STEEL);
      const pkg = lathePrintProgramSignoffEngine.generatePackage(input);

      expect(pkg.markdown_report).toContain("# PRISM Lathe Program Signoff");
      expect(pkg.markdown_report).toContain("## Release Status");
      expect(pkg.markdown_report).toContain("## Program Summary");
      expect(pkg.markdown_report).toContain("## Workholding Setup");
      expect(pkg.markdown_report).toContain("## Feature → Strategy → Operation Table");
      expect(pkg.markdown_report).toContain("## Cpk Summary");
      expect(pkg.markdown_report).toContain("## Validation Checks");
      expect(pkg.markdown_report).toContain("## Approval Chain");
    });

    it("release status shows READY for clean program", () => {
      const input = buildArtifacts(JM_PIN, ALUM);
      const pkg = lathePrintProgramSignoffEngine.generatePackage(input);
      expect(pkg.markdown_report).toContain("READY FOR RELEASE");
    });

    it("exportMarkdown returns same string as markdown_report", () => {
      const input = buildArtifacts(JM_PIN, STEEL);
      const pkg = lathePrintProgramSignoffEngine.generatePackage(input);
      expect(lathePrintProgramSignoffEngine.exportMarkdown(pkg)).toBe(pkg.markdown_report);
    });

    it("exportJSON returns valid parseable JSON", () => {
      const input = buildArtifacts(JM_PIN, STEEL);
      const pkg = lathePrintProgramSignoffEngine.generatePackage(input);
      const json = lathePrintProgramSignoffEngine.exportJSON(pkg);
      const parsed = JSON.parse(json);
      expect(parsed.package_id).toBe(pkg.package_id);
    });
  });

  describe("Release Blocking", () => {
    it("blocks release when envelope violated", () => {
      const huge: FeatureInput[] = [
        { id: "H1", type: "od_turn", diameter_mm: 200, length_mm: 500 },
      ];
      const strat = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(huge, STEEL);
      const seq = lathePrintSequencePlannerEngine.planSequence(strat, STOCK, huge);
      const toolpath = lathePrintToolpathGeneratorEngine.generateProgram(seq, huge, STEEL, {
        max_x_mm: 5, max_z_mm: 5, max_rpm: 5000, max_feed_mm_min: 10000,
      });
      const emitted = lathePrintProgramEmitterEngine.emit(toolpath, { controller: "fanuc" });

      const input: SignoffInput = {
        strategy_plan: strat, sequence_plan: seq, toolpath, emitted,
        features: huge, material: STEEL,
      };

      const pkg = lathePrintProgramSignoffEngine.generatePackage(input);
      expect(pkg.release_ready).toBe(false);
      expect(pkg.release_blocker).toBeTruthy();
      expect(pkg.critical_fail_count).toBeGreaterThan(0);
    });
  });

  describe("Adversarial Inputs", () => {
    it("throws on null input", () => {
      expect(() => {
        lathePrintProgramSignoffEngine.generatePackage(null as any);
      }).toThrow(/Invalid signoff input/);
    });

    it("throws on missing strategy plan", () => {
      expect(() => {
        lathePrintProgramSignoffEngine.generatePackage({} as any);
      }).toThrow(/Missing strategy plan/);
    });

    it("throws on missing toolpath", () => {
      const input = buildArtifacts(JM_PIN, STEEL);
      delete (input as any).toolpath;
      expect(() => {
        lathePrintProgramSignoffEngine.generatePackage(input);
      }).toThrow(/Missing toolpath/);
    });

    it("throws on missing emitted program", () => {
      const input = buildArtifacts(JM_PIN, STEEL);
      delete (input as any).emitted;
      expect(() => {
        lathePrintProgramSignoffEngine.generatePackage(input);
      }).toThrow(/Missing emitted/);
    });

    it("throws when features is not array", () => {
      const input = buildArtifacts(JM_PIN, STEEL);
      (input as any).features = "bogus";
      expect(() => {
        lathePrintProgramSignoffEngine.generatePackage(input);
      }).toThrow(/Features must be an array/);
    });

    it("throws on missing material", () => {
      const input = buildArtifacts(JM_PIN, STEEL);
      delete (input as any).material;
      expect(() => {
        lathePrintProgramSignoffEngine.generatePackage(input);
      }).toThrow(/Missing material/);
    });
  });

  describe("Material Variability", () => {
    const materials: MaterialInput[] = [
      { name: "1018 Steel", iso_group: "P", tensile_strength_mpa: 440 },
      { name: "316 Stainless", iso_group: "M", tensile_strength_mpa: 580 },
      { name: "Gray Cast Iron", iso_group: "K", tensile_strength_mpa: 250 },
      { name: "Inconel 718", iso_group: "S", hardness_hrc: 36, tensile_strength_mpa: 1350 },
    ];

    it.each(materials)("produces valid signoff for $name (ISO $iso_group)", (mat) => {
      const input = buildArtifacts(JM_PIN, mat);
      const pkg = lathePrintProgramSignoffEngine.generatePackage(input);

      expect(pkg.material.iso_group).toBe(mat.iso_group);
      expect(pkg.feature_strategy_ops.length).toBe(JM_PIN.length);
      expect(pkg.markdown_report.length).toBeGreaterThan(500);
    });
  });

  describe("Dispatcher Integration", () => {
    it("ACTIONS contains lathe_p2p_signoff_generate", () => {
      expect(camActions).toContain("lathe_p2p_signoff_generate");
    });
    it("ACTIONS contains lathe_p2p_signoff_approve", () => {
      expect(camActions).toContain("lathe_p2p_signoff_approve");
    });
    it("ACTIONS contains lathe_p2p_signoff_markdown", () => {
      expect(camActions).toContain("lathe_p2p_signoff_markdown");
    });
    it("ACTIONS contains lathe_p2p_signoff_json", () => {
      expect(camActions).toContain("lathe_p2p_signoff_json");
    });
    it("ACTIONS contains lathe_p2p_signoff_is_approved", () => {
      expect(camActions).toContain("lathe_p2p_signoff_is_approved");
    });
  });
});
