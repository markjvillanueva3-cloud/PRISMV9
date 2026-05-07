/**
 * U-P2PFS07: Tribal Knowledge Integration Tests for WireEDMAIPrintToProgramEngine
 * Verifies tribal_tips surface in AI print-to-program pipeline
 */
import { describe, it, expect } from "vitest";
import { wireEDMAIPrintToProgramEngine } from "../engines/WireEDMAIPrintToProgramEngine.js";

describe("WireEDMAIPrintToProgramEngine Tribal Knowledge (U-P2PFS07)", () => {
  describe("Tribal Tips Surfacing", () => {
    it("surfaces tribal_tips for D2 tool steel", async () => {
      const result = await wireEDMAIPrintToProgramEngine.generate({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
        contours: [
          { points: [{ x: 0, y: 0 }, { x: 25, y: 0 }, { x: 25, y: 25 }, { x: 0, y: 25 }], closed: true },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.tribal_tips).toBeDefined();
      if (result.tribal_tips) {
        expect(Array.isArray(result.tribal_tips)).toBe(true);
        for (const tip of result.tribal_tips) {
          expect(tip).toHaveProperty("id");
          expect(tip).toHaveProperty("title");
          expect(tip).toHaveProperty("body");
          expect(tip).toHaveProperty("confidence");
          expect(typeof tip.confidence).toBe("number");
        }
      }
    });

    it("surfaces tribal_tips for carbide material", async () => {
      const result = await wireEDMAIPrintToProgramEngine.generate({
        material: "tungsten carbide",
        thickness_mm: 15,
        target_ra_um: 0.4,
        contours: [
          { points: [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 20 }, { x: 0, y: 20 }], closed: true },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.tribal_tips).toBeDefined();
    });

    it("surfaces tribal_tips for stainless steel", async () => {
      const result = await wireEDMAIPrintToProgramEngine.generate({
        material: "304 stainless",
        thickness_mm: 20,
        target_ra_um: 0.8,
        contours: [
          { points: [{ x: 0, y: 0 }, { x: 15, y: 0 }, { x: 15, y: 15 }, { x: 0, y: 15 }], closed: true },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.tribal_tips).toBeDefined();
    });

    it("surfaces tribal_tips for thick section cuts", async () => {
      const result = await wireEDMAIPrintToProgramEngine.generate({
        material: "D2",
        thickness_mm: 100,
        target_ra_um: 1.0,
        contours: [
          { points: [{ x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 30 }, { x: 0, y: 30 }], closed: true },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.tribal_tips).toBeDefined();
    });
  });

  describe("Tribal Tips Format", () => {
    it("tribal tips have required fields", async () => {
      const result = await wireEDMAIPrintToProgramEngine.generate({
        material: "D2",
        thickness_mm: 25,
        contours: [
          { points: [{ x: 0, y: 0 }, { x: 25, y: 0 }, { x: 25, y: 25 }, { x: 0, y: 25 }], closed: true },
        ],
      });

      expect(result.success).toBe(true);
      if (result.tribal_tips && result.tribal_tips.length > 0) {
        const tip = result.tribal_tips[0];
        expect(typeof tip.id).toBe("string");
        expect(typeof tip.title).toBe("string");
        expect(typeof tip.body).toBe("string");
        expect(typeof tip.confidence).toBe("number");
        expect(tip.confidence).toBeGreaterThanOrEqual(0);
        expect(tip.confidence).toBeLessThanOrEqual(100);
      }
    });

    it("limits tribal tips to 5", async () => {
      const result = await wireEDMAIPrintToProgramEngine.generate({
        material: "D2",
        thickness_mm: 25,
        contours: [
          { points: [{ x: 0, y: 0 }, { x: 25, y: 0 }, { x: 25, y: 25 }, { x: 0, y: 25 }], closed: true },
        ],
      });

      expect(result.success).toBe(true);
      if (result.tribal_tips) {
        expect(result.tribal_tips.length).toBeLessThanOrEqual(5);
      }
    });
  });

  describe("Knowledge Sources Integration", () => {
    it("adds tribal knowledge to knowledge_sources when tips found", async () => {
      const result = await wireEDMAIPrintToProgramEngine.generate({
        material: "D2",
        thickness_mm: 25,
        contours: [
          { points: [{ x: 0, y: 0 }, { x: 25, y: 0 }, { x: 25, y: 25 }, { x: 0, y: 25 }], closed: true },
        ],
      });

      expect(result.success).toBe(true);
      const tribalSource = result.knowledge_sources.find(ks => ks.source === "Tribal Knowledge Database");
      if (result.tribal_tips && result.tribal_tips.length > 0) {
        expect(tribalSource).toBeDefined();
        expect(tribalSource?.type).toBe("shop_experience");
      }
    });

    it("knowledge_sources reflects multiple model types", async () => {
      const result = await wireEDMAIPrintToProgramEngine.generate({
        material: "D2",
        thickness_mm: 25,
        contours: [
          { points: [{ x: 0, y: 0 }, { x: 25, y: 0 }, { x: 25, y: 25 }, { x: 0, y: 25 }], closed: true },
        ],
      });

      expect(result.success).toBe(true);
      const neuralSources = result.knowledge_sources.filter(ks => ks.type === "neural_network");
      expect(neuralSources.length).toBeGreaterThan(0);
    });
  });
});
