/**
 * PostProcessorMasterPostArchitectureEngine Tests
 * ===============================================
 */

import { describe, it, expect } from "vitest";
import {
  postProcessorMasterPostArchitectureEngine,
  MACHINE_TYPES,
  FUSION_BASIC_POST_INVENTORY,
  MASTER_POST_TEMPLATES,
  HURCO_V11_FINE_TUNING
} from "../engines/PostProcessorMasterPostArchitectureEngine.js";

describe("PostProcessorMasterPostArchitectureEngine", () => {
  describe("Statistics", () => {
    it("should return engine statistics", () => {
      const stats = postProcessorMasterPostArchitectureEngine.getStatistics();

      expect(stats.version).toBe("1.0.0");
      expect(stats.machineTypes).toBeGreaterThanOrEqual(26);
      expect(stats.fusionPostsTotal).toBeGreaterThanOrEqual(180);
      expect(stats.masterPostTemplates).toBeGreaterThanOrEqual(4);
      expect(stats.hurcoV11Issues).toBeGreaterThan(15);
    });
  });

  describe("Machine Types", () => {
    it("should have 26+ machine types", () => {
      expect(MACHINE_TYPES.length).toBeGreaterThanOrEqual(26);
    });

    it("should have VMC 3-axis", () => {
      const vmc3 = postProcessorMasterPostArchitectureEngine.getMachineType("vmc-3axis");
      expect(vmc3).toBeDefined();
      expect(vmc3?.axes).toBe(3);
    });

    it("should have 5-axis trunnion", () => {
      const trunnion = postProcessorMasterPostArchitectureEngine.getMachineType("vmc-5axis-trunnion");
      expect(trunnion?.axes).toBe(5);
    });

    it("should have Swiss-type", () => {
      const swiss = postProcessorMasterPostArchitectureEngine.getMachineType("swiss-type");
      expect(swiss?.category).toBe("swiss");
    });

    it("should have mill-turn", () => {
      const mt = postProcessorMasterPostArchitectureEngine.getMachineType("mill-turn-b-axis");
      expect(mt).toBeDefined();
      expect(mt?.masterPostStatus).toBe("partial-okuma-multus");
    });

    it("should have wire EDM", () => {
      const wedm = postProcessorMasterPostArchitectureEngine.getMachineType("wire-edm");
      expect(wedm?.category).toBe("edm");
    });

    it("should filter by category", () => {
      const mills = postProcessorMasterPostArchitectureEngine.getMachineTypesByCategory("mill");
      expect(mills.length).toBeGreaterThan(3);

      const lathes = postProcessorMasterPostArchitectureEngine.getMachineTypesByCategory("lathe");
      expect(lathes.length).toBeGreaterThan(2);
    });

    it("should filter by status", () => {
      const planned = postProcessorMasterPostArchitectureEngine.getMachineTypesByStatus("planned");
      expect(planned.length).toBeGreaterThan(10);
    });

    it("should identify high priority planned work", () => {
      const high = postProcessorMasterPostArchitectureEngine.getHighPriorityPlanned();
      expect(high.length).toBeGreaterThan(0);
    });
  });

  describe("Fusion Post Inventory", () => {
    it("should have 180+ Fusion basic posts", () => {
      const total = postProcessorMasterPostArchitectureEngine.getTotalFusionPosts();
      expect(total).toBeGreaterThanOrEqual(180);
    });

    it("should have Haas family (57+ posts)", () => {
      const haas = postProcessorMasterPostArchitectureEngine.getFusionPostsForBrand("Haas");
      expect(haas).toBeDefined();
      expect(haas?.count).toBeGreaterThanOrEqual(50);
    });

    it("should have Mazak family (47+ posts)", () => {
      const mazak = postProcessorMasterPostArchitectureEngine.getFusionPostsForBrand("Mazak");
      expect(mazak?.count).toBeGreaterThanOrEqual(40);
    });

    it("should have Siemens family", () => {
      const siemens = postProcessorMasterPostArchitectureEngine.getFusionPostsForBrand("Siemens");
      expect(siemens?.count).toBeGreaterThanOrEqual(10);
    });

    it("should have Heidenhain family", () => {
      const hdh = postProcessorMasterPostArchitectureEngine.getFusionPostsForBrand("Heidenhain");
      expect(hdh?.count).toBeGreaterThanOrEqual(7);
    });

    it("should have 25+ brands", () => {
      expect(FUSION_BASIC_POST_INVENTORY.length).toBeGreaterThanOrEqual(25);
    });

    it("should find Fusion posts for machine type", () => {
      const vmcPosts = postProcessorMasterPostArchitectureEngine.findFusionPostsForMachineType("vmc-3axis");
      expect(vmcPosts.length).toBeGreaterThan(0);
    });
  });

  describe("Master Post Templates", () => {
    it("should have template for VMC 3-axis", () => {
      const tmpl = postProcessorMasterPostArchitectureEngine.getMasterPostTemplate("vmc-3axis");
      expect(tmpl).toBeDefined();
      expect(tmpl?.requiredSections.length).toBeGreaterThan(5);
    });

    it("should have template for 5-axis trunnion", () => {
      const tmpl = postProcessorMasterPostArchitectureEngine.getMasterPostTemplate("vmc-5axis-trunnion");
      expect(tmpl).toBeDefined();
      expect(tmpl?.conversionRules.length).toBeGreaterThan(3);
    });

    it("should have template for 2-axis lathe", () => {
      const tmpl = postProcessorMasterPostArchitectureEngine.getMasterPostTemplate("lathe-2axis");
      expect(tmpl).toBeDefined();
      expect(tmpl?.requiredSections.some(s => s.includes("Thread"))).toBe(true);
    });

    it("should have template for mill-turn with Okuma reference", () => {
      const tmpl = postProcessorMasterPostArchitectureEngine.getMasterPostTemplate("mill-turn-b-axis");
      expect(tmpl).toBeDefined();
      expect(tmpl?.baselinePost.toUpperCase()).toContain("OKUMA");
      expect(tmpl?.fineTuningTracker.length).toBeGreaterThan(0);
    });

    it("should get conversion rules per type", () => {
      const rules = postProcessorMasterPostArchitectureEngine.getConversionRules("vmc-3axis");
      expect(rules.length).toBeGreaterThan(5);
    });

    it("should get variants per type", () => {
      const variants = postProcessorMasterPostArchitectureEngine.getVariants("vmc-5axis-trunnion");
      expect(variants.length).toBeGreaterThan(2);
      expect(variants.some(v => v.variant.includes("Haas"))).toBe(true);
    });
  });

  describe("Hurco V11 Fine-Tuning Tracker", () => {
    it("should have known-working items", () => {
      const working = postProcessorMasterPostArchitectureEngine.getHurcoV11ByCategory("known-working");
      expect(working.length).toBeGreaterThan(2);
    });

    it("should have needs-fine-tuning items", () => {
      const tuning = postProcessorMasterPostArchitectureEngine.getHurcoV11ByCategory("needs-fine-tuning");
      expect(tuning.length).toBeGreaterThan(3);
    });

    it("should have missing features", () => {
      const missing = postProcessorMasterPostArchitectureEngine.getHurcoV11ByCategory("missing-feature");
      expect(missing.length).toBeGreaterThan(3);
    });

    it("should have bug fixes tracked", () => {
      const bugs = postProcessorMasterPostArchitectureEngine.getHurcoV11ByCategory("bug-fix");
      expect(bugs.length).toBeGreaterThan(1);
    });

    it("should filter by priority", () => {
      const high = postProcessorMasterPostArchitectureEngine.getHurcoV11ByPriority("high");
      expect(high.length).toBeGreaterThan(2);
    });

    it("should identify open high-priority issues", () => {
      const open = postProcessorMasterPostArchitectureEngine.getHurcoV11OpenIssues();
      expect(open.length).toBeGreaterThan(2);
      expect(open.every(i => i.status !== "production")).toBe(true);
    });

    it("should include G05.3 HSM tuning", () => {
      const hasG053 = HURCO_V11_FINE_TUNING.some(i => i.item.includes("G05.3"));
      expect(hasG053).toBe(true);
    });

    it("should include chip thinning compensation gap", () => {
      const hasChipThin = HURCO_V11_FINE_TUNING.some(i => i.item.includes("Chip thinning"));
      expect(hasChipThin).toBe(true);
    });

    it("should include deflection compensation gap", () => {
      const hasDeflection = HURCO_V11_FINE_TUNING.some(i => i.item.toLowerCase().includes("deflection"));
      expect(hasDeflection).toBe(true);
    });
  });

  describe("Roadmap Generation", () => {
    it("should generate phased roadmap", () => {
      const roadmap = postProcessorMasterPostArchitectureEngine.generateMasterPostRoadmap();

      expect(roadmap.phase2_highPriority.length).toBeGreaterThan(2);
      expect(roadmap.estimatedOrder.length).toBe(MACHINE_TYPES.length);
    });

    it("should prioritize high-value machine types", () => {
      const roadmap = postProcessorMasterPostArchitectureEngine.generateMasterPostRoadmap();

      expect(roadmap.phase2_highPriority.some(m => m.id === "vmc-3axis")).toBe(true);
      expect(roadmap.phase2_highPriority.some(m => m.id === "lathe-2axis")).toBe(true);
      expect(roadmap.phase2_highPriority.some(m => m.id === "mill-turn-b-axis")).toBe(true);
    });
  });

  describe("Coverage Stats", () => {
    it("should calculate coverage", () => {
      const cov = postProcessorMasterPostArchitectureEngine.getCoverageStats();

      expect(cov.totalMachineTypes).toBeGreaterThanOrEqual(26);
      expect(cov.coveragePct).toBeGreaterThan(0);
      expect(cov.coveragePct).toBeLessThan(100);
    });

    it("should include partial count (mill-turn)", () => {
      const cov = postProcessorMasterPostArchitectureEngine.getCoverageStats();
      expect(cov.partial).toBeGreaterThan(0);
    });
  });

  describe("Recommended Starting Point", () => {
    it("should recommend for VMC 3-axis", () => {
      const rec = postProcessorMasterPostArchitectureEngine.getRecommendedStartingPoint("vmc-3axis");

      expect(rec.machineType).toBeDefined();
      expect(rec.template).toBeDefined();
      expect(rec.suggestedApproach).toContain("template");
    });

    it("should recommend for planned type without template", () => {
      const rec = postProcessorMasterPostArchitectureEngine.getRecommendedStartingPoint("laser");

      expect(rec.machineType).toBeDefined();
      expect(rec.fusionBaselines.length).toBeGreaterThan(0);
    });

    it("should handle unknown machine type", () => {
      const rec = postProcessorMasterPostArchitectureEngine.getRecommendedStartingPoint("unknown-xyz");

      expect(rec.machineType).toBeUndefined();
    });
  });

  describe("AI Context", () => {
    it("should generate AI context", () => {
      const context = postProcessorMasterPostArchitectureEngine.getContextForAI();

      expect(context).toContain("MASTER POST ARCHITECTURE");
      expect(context).toContain("MACHINE TYPE COVERAGE");
      expect(context).toContain("FUSION POST INVENTORY");
      expect(context).toContain("HURCO V11");
      expect(context).toContain("ROADMAP");
    });
  });

  describe("Edge Cases", () => {
    it("should handle unknown machine type in getMasterPostTemplate", () => {
      expect(postProcessorMasterPostArchitectureEngine.getMasterPostTemplate("nonexistent")).toBeUndefined();
    });

    it("should handle unknown brand in getFusionPostsForBrand", () => {
      expect(postProcessorMasterPostArchitectureEngine.getFusionPostsForBrand("FakeBrand")).toBeUndefined();
    });

    it("should return empty array for unknown conversion rules", () => {
      const rules = postProcessorMasterPostArchitectureEngine.getConversionRules("nonexistent");
      expect(rules).toEqual([]);
    });
  });
});
