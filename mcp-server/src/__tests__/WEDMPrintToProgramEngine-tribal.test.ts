/**
 * U-P2PFS06: Tribal Knowledge Integration Tests for WEDMPrintToProgramEngine
 * Verifies tribal_tips surface for M2/D2/carbide material inputs
 */
import { describe, it, expect } from "vitest";
import { wedmPrintToProgramEngine } from "../engines/WEDMPrintToProgramEngine.js";

describe("WEDMPrintToProgramEngine Tribal Knowledge (U-P2PFS06)", () => {
  const basicDxf = `0
SECTION
2
ENTITIES
0
LWPOLYLINE
8
0
90
4
70
1
10
0.0
20
0.0
10
25.0
20
0.0
10
25.0
20
25.0
10
0.0
20
25.0
0
ENDSEC
0
EOF`;

  describe("Tribal Tips Surfacing", () => {
    it("surfaces tribal_tips for D2 tool steel", async () => {
      const result = await wedmPrintToProgramEngine.generate({
        dxf_content: basicDxf,
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      });

      expect(result.success).toBe(true);
      expect(result.stages_completed).toContain("tribal_knowledge_injected");
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

    it("surfaces tribal_tips for M2 tool steel", async () => {
      const result = await wedmPrintToProgramEngine.generate({
        dxf_content: basicDxf,
        material: "M2",
        thickness_mm: 20,
        target_ra_um: 1.0,
      });

      expect(result.success).toBe(true);
      expect(result.stages_completed).toContain("tribal_knowledge_injected");
      expect(result.tribal_tips).toBeDefined();
    });

    it("surfaces tribal_tips for carbide material", async () => {
      const result = await wedmPrintToProgramEngine.generate({
        dxf_content: basicDxf,
        material: "tungsten carbide",
        thickness_mm: 15,
        target_ra_um: 0.4,
      });

      expect(result.success).toBe(true);
      expect(result.stages_completed).toContain("tribal_knowledge_injected");
      expect(result.tribal_tips).toBeDefined();
    });

    it("surfaces tribal_tips for A2 tool steel", async () => {
      const result = await wedmPrintToProgramEngine.generate({
        dxf_content: basicDxf,
        material: "A2",
        thickness_mm: 30,
        target_ra_um: 0.6,
      });

      expect(result.success).toBe(true);
      expect(result.stages_completed).toContain("tribal_knowledge_injected");
    });

    it("surfaces tribal_tips for S7 tool steel", async () => {
      const result = await wedmPrintToProgramEngine.generate({
        dxf_content: basicDxf,
        material: "S7",
        thickness_mm: 35,
        target_ra_um: 0.8,
      });

      expect(result.success).toBe(true);
      expect(result.stages_completed).toContain("tribal_knowledge_injected");
    });

    it("surfaces tribal_tips for stainless steel (ISO M)", async () => {
      const result = await wedmPrintToProgramEngine.generate({
        dxf_content: basicDxf,
        material: "304 stainless",
        thickness_mm: 20,
        target_ra_um: 0.8,
      });

      expect(result.success).toBe(true);
      expect(result.stages_completed).toContain("tribal_knowledge_injected");
    });

    it("surfaces tribal_tips for aluminum (ISO N)", async () => {
      const result = await wedmPrintToProgramEngine.generate({
        dxf_content: basicDxf,
        material: "7075",
        thickness_mm: 12,
        target_ra_um: 1.6,
      });

      expect(result.success).toBe(true);
      expect(result.stages_completed).toContain("tribal_knowledge_injected");
    });

    it("surfaces tribal_tips for superalloy (ISO S)", async () => {
      const result = await wedmPrintToProgramEngine.generate({
        dxf_content: basicDxf,
        material: "Inconel 718",
        thickness_mm: 10,
        target_ra_um: 0.8,
      });

      expect(result.success).toBe(true);
      expect(result.stages_completed).toContain("tribal_knowledge_injected");
    });
  });

  describe("Tribal Tips Format", () => {
    it("tribal tips have required fields", async () => {
      const result = await wedmPrintToProgramEngine.generate({
        dxf_content: basicDxf,
        material: "D2",
        thickness_mm: 25,
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
      const result = await wedmPrintToProgramEngine.generate({
        dxf_content: basicDxf,
        material: "D2",
        thickness_mm: 25,
      });

      expect(result.success).toBe(true);
      if (result.tribal_tips) {
        expect(result.tribal_tips.length).toBeLessThanOrEqual(5);
      }
    });
  });

  describe("Stage Tracking", () => {
    it("adds tribal_knowledge_injected to stages when tips found", async () => {
      const result = await wedmPrintToProgramEngine.generate({
        dxf_content: basicDxf,
        material: "D2",
        thickness_mm: 25,
      });

      expect(result.success).toBe(true);
      expect(result.stages_completed).toContain("tribal_knowledge_injected");
    });

    it("tribal knowledge stage comes before settings_calculated", async () => {
      const result = await wedmPrintToProgramEngine.generate({
        dxf_content: basicDxf,
        material: "D2",
        thickness_mm: 25,
      });

      expect(result.success).toBe(true);
      const tribalIdx = result.stages_completed.indexOf("tribal_knowledge_injected");
      const settingsIdx = result.stages_completed.indexOf("settings_calculated");
      expect(tribalIdx).toBeLessThan(settingsIdx);
    });
  });
});
