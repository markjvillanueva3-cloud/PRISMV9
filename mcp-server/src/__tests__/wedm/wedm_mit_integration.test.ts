/**
 * WEDM MIT OCW Integration Tests - Phase 0.17
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const STATE_DIR = path.resolve(process.cwd(), "data/state");

describe("WEDM MIT OCW Integration", () => {
  const integrationPath = path.join(STATE_DIR, "WEDM_MIT_OCW_INTEGRATION.json");
  const tipsPath = path.join(STATE_DIR, "WEDM_MIT_TIPS.json");

  describe("integration file", () => {
    it("exists", () => {
      expect(fs.existsSync(integrationPath)).toBe(true);
    });

    if (fs.existsSync(integrationPath)) {
      const data = JSON.parse(fs.readFileSync(integrationPath, "utf-8"));

      it("has 5 courses", () => {
        expect(Object.keys(data.courses).length).toBe(5);
      });

      const expected = ["2.008", "2.830", "2.813", "18.06", "6.S191"];
      for (const courseId of expected) {
        it("includes " + courseId, () => {
          expect(data.courses[courseId]).toBeDefined();
          expect(data.courses[courseId].ingested).toBe(true);
        });
      }
    }
  });

  describe("tips file", () => {
    it("exists", () => {
      expect(fs.existsSync(tipsPath)).toBe(true);
    });

    if (fs.existsSync(tipsPath)) {
      const data = JSON.parse(fs.readFileSync(tipsPath, "utf-8"));

      it("has at least 25 tips", () => {
        expect(data.tips.length).toBeGreaterThanOrEqual(25);
      });

      it("tips cover all 5 MIT courses", () => {
        const sources = new Set(data.tips.map((t: any) => t.source));
        expect(sources.size).toBeGreaterThanOrEqual(5);
      });

      it("each tip has required fields", () => {
        for (const tip of data.tips) {
          expect(tip.id).toBeDefined();
          expect(tip.source).toBeDefined();
          expect(tip.content).toBeDefined();
          expect(tip.citation).toBeDefined();
        }
      });
    }
  });
});
