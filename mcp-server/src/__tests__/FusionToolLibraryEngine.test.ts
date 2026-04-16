/**
 * FusionToolLibraryEngine — Tests
 * RES-MS8 U-F360-02: Validates Fusion 360 CSV tool library parsing
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  FusionToolLibraryEngine,
  type FusionToolLibraryResult,
  type FusionTool,
} from "../engines/FusionToolLibraryEngine.js";

let result: FusionToolLibraryResult;

beforeAll(async () => {
  result = await FusionToolLibraryEngine.harvest();
}, 30_000);

describe("FusionToolLibraryEngine", () => {
  describe("getSources()", () => {
    it("returns correct root path", () => {
      const src = FusionToolLibraryEngine.getSources();
      expect(src.rootPath).toContain("FUSION TOOL LIBRARY");
    });

    it("expects 7 CSV files", () => {
      expect(FusionToolLibraryEngine.getSources().expectedFiles).toBe(7);
    });

    it("expects ~218 tools", () => {
      expect(FusionToolLibraryEngine.getSources().expectedTools).toBe(218);
    });
  });

  describe("harvest() — completeness", () => {
    it("finds at least 100 tools", () => {
      expect(result.totalTools).toBeGreaterThanOrEqual(100);
    });

    it("finds close to 218 tools", () => {
      expect(result.totalTools).toBeGreaterThanOrEqual(180);
      expect(result.totalTools).toBeLessThanOrEqual(300);
    });

    it("parses all 7 CSV files", () => {
      expect(Object.keys(result.byFile).length).toBe(7);
    });

    it("all files have at least 1 tool", () => {
      for (const [file, count] of Object.entries(result.byFile)) {
        expect(count).toBeGreaterThan(0);
      }
    });

    it("has valid ISO timestamp", () => {
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe("harvest() — categories", () => {
    it("has turning tools", () => {
      expect(result.byCategory["turning"]).toBeGreaterThan(0);
    });

    it("has boring bars (roughing)", () => {
      expect(result.byCategory["boring_rough"]).toBeGreaterThan(0);
    });

    it("has boring bars (finishing)", () => {
      expect(result.byCategory["boring_finish"]).toBeGreaterThan(0);
    });

    it("has insert drills", () => {
      expect(result.byCategory["insert_drill"]).toBeGreaterThan(0);
    });

    it("has twist drills", () => {
      expect(result.byCategory["twist_drill"]).toBeGreaterThan(0);
    });

    it("has end mills", () => {
      expect(result.byCategory["end_mill"]).toBeGreaterThan(0);
    });
  });

  describe("harvest() — specific tools", () => {
    it("CNMT turning tool has ISCAR vendor", () => {
      const cnmt = result.tools.find((t) => t.description.includes("CNMT"));
      expect(cnmt).toBeDefined();
      expect(cnmt!.vendor).toBe("ISCAR");
      expect(cnmt!.toolMaterial).toBe("carbide");
    });

    it("boring bars have diameter > 0", () => {
      const boring = result.tools.filter((t) => t.category === "boring_rough" || t.category === "boring_finish");
      expect(boring.length).toBeGreaterThan(0);
      for (const t of boring) {
        expect(t.diameterInch).toBeGreaterThan(0);
      }
    });

    it("twist drills have tip angle", () => {
      const drills = result.tools.filter((t) => t.category === "twist_drill");
      const withTip = drills.filter((t) => t.tipAngle !== null && t.tipAngle > 0);
      expect(withTip.length).toBeGreaterThan(10);
    });

    it("end mills have flute count", () => {
      const mills = result.tools.filter((t) => t.category === "end_mill");
      expect(mills.length).toBeGreaterThan(0);
      const withFlutes = mills.filter((t) => t.fluteCount !== null && t.fluteCount > 0);
      expect(withFlutes.length).toBeGreaterThan(0);
    });

    it("tools are in inches unit", () => {
      const inchTools = result.tools.filter((t) => t.unit === "inches");
      expect(inchTools.length).toBe(result.totalTools);
    });

    it("most tools have a spindle speed or surface speed", () => {
      const withSpeed = result.tools.filter(
        (t) =>
          (t.spindleSpeed !== null && t.spindleSpeed > 0) ||
          (t.surfaceSpeed !== null && t.surfaceSpeed > 0)
      );
      expect(withSpeed.length).toBeGreaterThan(result.totalTools * 0.5);
    });
  });

  describe("harvest() — tool types", () => {
    it("has turning general type", () => {
      expect(result.byToolType["turning general"]).toBeGreaterThan(0);
    });

    it("has drill type", () => {
      expect(result.byToolType["drill"]).toBeGreaterThan(0);
    });

    it("has multiple distinct tool types", () => {
      expect(Object.keys(result.byToolType).length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("harvest() — materials and vendors", () => {
    it("has carbide tools", () => {
      expect(result.byMaterial["carbide"]).toBeGreaterThan(0);
    });

    it("has HSS tools", () => {
      expect(result.byMaterial["hss"]).toBeGreaterThan(0);
    });

    it("has ISCAR vendor", () => {
      expect(result.byVendor["ISCAR"]).toBeGreaterThan(0);
    });
  });

  describe("findByDescription()", () => {
    it("finds tools by partial name", () => {
      const boring = FusionToolLibraryEngine.findByDescription(result.tools, "boring");
      expect(boring.length).toBeGreaterThan(0);
      for (const t of boring) {
        expect(t.description.toLowerCase()).toContain("boring");
      }
    });

    it("case-insensitive search", () => {
      const drills = FusionToolLibraryEngine.findByDescription(result.tools, "DRILL");
      expect(drills.length).toBeGreaterThan(0);
    });
  });

  describe("filterByCategory()", () => {
    it("filters turning tools", () => {
      const turning = FusionToolLibraryEngine.filterByCategory(result.tools, "turning");
      expect(turning.length).toBeGreaterThan(0);
      for (const t of turning) {
        expect(t.category).toBe("turning");
      }
    });
  });

  describe("audit()", () => {
    it("returns valid summary", async () => {
      const audit = await FusionToolLibraryEngine.audit();
      expect(audit.totalTools).toBeGreaterThan(100);
      expect(audit.fileCount).toBe(7);
      expect(audit.vendorCount).toBeGreaterThanOrEqual(1);
    });
  });
});
