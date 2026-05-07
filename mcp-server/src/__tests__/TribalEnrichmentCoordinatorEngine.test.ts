/**
 * U-P2PFS10: TribalEnrichmentCoordinatorEngine Tests
 * Verifies unified tribal+playbook+controller knowledge enrichment
 */
import { describe, it, expect } from "vitest";
import {
  tribalEnrichmentCoordinatorEngine,
  type EnrichmentInput,
} from "../engines/TribalEnrichmentCoordinatorEngine.js";

describe("TribalEnrichmentCoordinatorEngine (U-P2PFS10)", () => {
  describe("enrich()", () => {
    it("returns enrichment result for wire_edm process", async () => {
      const input: EnrichmentInput = {
        process_type: "wire_edm",
        material: "D2",
        controller: "mitsubishi",
      };

      const result = await tribalEnrichmentCoordinatorEngine.enrich(input);

      expect(result).toHaveProperty("tribal_tips");
      expect(result).toHaveProperty("playbook_rules");
      expect(result).toHaveProperty("controller_tips");
      expect(result).toHaveProperty("merged_advisory");
      expect(result).toHaveProperty("knowledge_sources");

      expect(Array.isArray(result.tribal_tips)).toBe(true);
      expect(Array.isArray(result.playbook_rules)).toBe(true);
      expect(Array.isArray(result.controller_tips)).toBe(true);
      expect(typeof result.merged_advisory).toBe("string");
    });

    it("returns tribal tips with required fields", async () => {
      const input: EnrichmentInput = {
        process_type: "wire_edm",
        material: "D2",
      };

      const result = await tribalEnrichmentCoordinatorEngine.enrich(input);

      if (result.tribal_tips.length > 0) {
        const tip = result.tribal_tips[0];
        expect(tip).toHaveProperty("id");
        expect(tip).toHaveProperty("title");
        expect(tip).toHaveProperty("body");
        expect(tip).toHaveProperty("confidence");
        expect(typeof tip.id).toBe("string");
        expect(typeof tip.title).toBe("string");
        expect(typeof tip.body).toBe("string");
        expect(typeof tip.confidence).toBe("number");
      }
    });

    it("returns playbook rules with required fields", async () => {
      const input: EnrichmentInput = {
        process_type: "milling",
        material: "aluminum",
      };

      const result = await tribalEnrichmentCoordinatorEngine.enrich(input);

      if (result.playbook_rules.length > 0) {
        const rule = result.playbook_rules[0];
        expect(rule).toHaveProperty("id");
        expect(rule).toHaveProperty("title");
        expect(rule).toHaveProperty("severity");
        expect(rule).toHaveProperty("rule");
      }
    });

    it("returns controller tips for specified controller", async () => {
      const input: EnrichmentInput = {
        process_type: "wire_edm",
        controller: "fanuc",
      };

      const result = await tribalEnrichmentCoordinatorEngine.enrich(input);

      expect(result.controller_tips.length).toBeGreaterThan(0);
      const tip = result.controller_tips[0];
      expect(tip).toHaveProperty("id");
      expect(tip).toHaveProperty("title");
      expect(tip).toHaveProperty("body");
    });

    it("returns empty controller tips when no controller specified", async () => {
      const input: EnrichmentInput = {
        process_type: "wire_edm",
        material: "D2",
      };

      const result = await tribalEnrichmentCoordinatorEngine.enrich(input);

      expect(result.controller_tips).toEqual([]);
    });

    it("builds merged advisory with process info", async () => {
      const input: EnrichmentInput = {
        process_type: "turning",
        material: "4140",
        controller: "okuma",
      };

      const result = await tribalEnrichmentCoordinatorEngine.enrich(input);

      expect(result.merged_advisory).toContain("TURNING");
      expect(result.merged_advisory).toContain("4140");
      expect(result.merged_advisory).toContain("okuma");
    });

    it("tracks knowledge sources in result", async () => {
      const input: EnrichmentInput = {
        process_type: "wire_edm",
        material: "D2",
        controller: "sodick",
      };

      const result = await tribalEnrichmentCoordinatorEngine.enrich(input);

      expect(Array.isArray(result.knowledge_sources)).toBe(true);
      for (const source of result.knowledge_sources) {
        expect(source).toHaveProperty("source");
        expect(source).toHaveProperty("type");
        expect(source).toHaveProperty("count");
      }
    });

    it("limits tips to 5 per category", async () => {
      const input: EnrichmentInput = {
        process_type: "wire_edm",
        material: "D2",
        controller: "fanuc",
      };

      const result = await tribalEnrichmentCoordinatorEngine.enrich(input);

      expect(result.tribal_tips.length).toBeLessThanOrEqual(5);
      expect(result.playbook_rules.length).toBeLessThanOrEqual(5);
      expect(result.controller_tips.length).toBeLessThanOrEqual(5);
    });
  });

  describe("hasKnowledge()", () => {
    it("returns true when knowledge exists", async () => {
      const input: EnrichmentInput = {
        process_type: "wire_edm",
        controller: "fanuc",
      };

      const has = await tribalEnrichmentCoordinatorEngine.hasKnowledge(input);
      expect(has).toBe(true);
    });

    it("handles configurations with no matches gracefully", async () => {
      const input: EnrichmentInput = {
        process_type: "grinding",
      };

      const has = await tribalEnrichmentCoordinatorEngine.hasKnowledge(input);
      expect(typeof has).toBe("boolean");
    });
  });

  describe("getTribalOnly()", () => {
    it("returns only tribal tips", async () => {
      const input: EnrichmentInput = {
        process_type: "wire_edm",
        material: "D2",
      };

      const tips = await tribalEnrichmentCoordinatorEngine.getTribalOnly(input);

      expect(Array.isArray(tips)).toBe(true);
      if (tips.length > 0) {
        expect(tips[0]).toHaveProperty("id");
        expect(tips[0]).toHaveProperty("title");
      }
    });
  });

  describe("getPlaybookOnly()", () => {
    it("returns only playbook rules", async () => {
      const input: EnrichmentInput = {
        process_type: "milling",
      };

      const rules = await tribalEnrichmentCoordinatorEngine.getPlaybookOnly(input);

      expect(Array.isArray(rules)).toBe(true);
      if (rules.length > 0) {
        expect(rules[0]).toHaveProperty("id");
        expect(rules[0]).toHaveProperty("rule");
      }
    });
  });

  describe("getControllerOnly()", () => {
    it("returns controller tips for specified controller", async () => {
      const tips = await tribalEnrichmentCoordinatorEngine.getControllerOnly("mitsubishi");

      expect(Array.isArray(tips)).toBe(true);
      expect(tips.length).toBeGreaterThan(0);
      expect(tips[0]).toHaveProperty("title");
    });

    it("returns tips for various controller types", async () => {
      const controllers = ["fanuc", "sodick", "makino", "okuma", "haas"] as const;

      for (const controller of controllers) {
        const tips = await tribalEnrichmentCoordinatorEngine.getControllerOnly(controller);
        expect(Array.isArray(tips)).toBe(true);
      }
    });
  });
});
