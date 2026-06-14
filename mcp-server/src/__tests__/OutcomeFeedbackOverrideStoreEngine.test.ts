/**
 * OutcomeFeedbackOverrideStoreEngine tests — outcome → override learning loop
 * ============================================================================
 *
 * Verifies the same-session outcome → override accumulation contract for the
 * U-BRIDGE-LEARN-CAM + U-BRIDGE-LEARN-SFC dormant audit items.
 *
 * @milestone PSN-DORMANCY-AUDIT-MS0/U-BRIDGE-LEARN-CAM + U-BRIDGE-LEARN-SFC
 */

import { describe, it, expect, beforeEach } from "vitest";

import {
  OutcomeFeedbackOverrideStoreEngine,
  outcomeFeedbackOverrideStoreEngine,
  type OutcomeOverrideEvent,
} from "../engines/OutcomeFeedbackOverrideStoreEngine.js";

describe("OutcomeFeedbackOverrideStoreEngine", () => {
  beforeEach(() => {
    OutcomeFeedbackOverrideStoreEngine.reset();
  });

  describe("ingest() — happy path", () => {
    it("stores a high-confidence successful outcome's overrides into the cam domain", () => {
      const event: OutcomeOverrideEvent = {
        domain: "cam",
        success: true,
        confidence: 0.95,
        overrides: { stepover_pct: 35, plunge_rate_mm_min: 250 },
      };
      const mutated = OutcomeFeedbackOverrideStoreEngine.ingest(event);

      expect(mutated).toBe(true);
      expect(OutcomeFeedbackOverrideStoreEngine.get("cam", "stepover_pct")?.value).toBe(35);
      expect(OutcomeFeedbackOverrideStoreEngine.get("cam", "plunge_rate_mm_min")?.value).toBe(250);
      expect(OutcomeFeedbackOverrideStoreEngine.keys("cam").sort()).toEqual(["plunge_rate_mm_min", "stepover_pct"]);
    });

    it("stores sfc overrides separately from cam overrides — no cross-pollination", () => {
      OutcomeFeedbackOverrideStoreEngine.ingest({
        domain: "cam",
        success: true,
        confidence: 0.9,
        overrides: { strategy: "trochoidal" },
      });
      OutcomeFeedbackOverrideStoreEngine.ingest({
        domain: "sfc",
        success: true,
        confidence: 0.9,
        overrides: { sfm_multiplier: 0.85 },
      });

      expect(OutcomeFeedbackOverrideStoreEngine.get("cam", "strategy")?.value).toBe("trochoidal");
      expect(OutcomeFeedbackOverrideStoreEngine.get("sfc", "sfm_multiplier")?.value).toBe(0.85);
      expect(OutcomeFeedbackOverrideStoreEngine.keys("cam")).toEqual(["strategy"]);
      expect(OutcomeFeedbackOverrideStoreEngine.keys("sfc")).toEqual(["sfm_multiplier"]);
    });

    it("newer-wins on repeated key — sequence increments and value updates to newer", () => {
      OutcomeFeedbackOverrideStoreEngine.ingest({
        domain: "cam",
        success: true,
        confidence: 0.85,
        overrides: { stepover_pct: 30 },
      });
      const firstRecord = OutcomeFeedbackOverrideStoreEngine.get("cam", "stepover_pct");
      expect(firstRecord?.value).toBe(30);
      expect(firstRecord?.confidence).toBe(0.85);
      const firstSeq = firstRecord?.sequence ?? 0;
      expect(firstSeq).toBeGreaterThan(0);

      OutcomeFeedbackOverrideStoreEngine.ingest({
        domain: "cam",
        success: true,
        confidence: 0.95,
        overrides: { stepover_pct: 40 },
      });

      const updated = OutcomeFeedbackOverrideStoreEngine.get("cam", "stepover_pct");
      expect(updated?.value).toBe(40);
      expect(updated?.confidence).toBe(0.95);
      expect(updated?.sequence).toBeGreaterThan(firstSeq);
    });
  });

  describe("ingest() — filter conditions", () => {
    it("rejects unknown domains and increments lastFilteredCount", () => {
      const before = OutcomeFeedbackOverrideStoreEngine.lastFilteredCount;
      const mutated = OutcomeFeedbackOverrideStoreEngine.ingest({
        domain: "ceramics",
        success: true,
        confidence: 0.9,
        overrides: { x: 1 },
      } as OutcomeOverrideEvent);

      expect(mutated).toBe(false);
      expect(OutcomeFeedbackOverrideStoreEngine.lastFilteredCount).toBe(before + 1);
      expect(OutcomeFeedbackOverrideStoreEngine.keys("cam")).toEqual([]);
    });

    it("rejects success !== true — store stays empty", () => {
      const mutated = OutcomeFeedbackOverrideStoreEngine.ingest({
        domain: "cam",
        success: false,
        confidence: 0.95,
        overrides: { x: 1 },
      });
      expect(mutated).toBe(false);
      expect(OutcomeFeedbackOverrideStoreEngine.keys("cam")).toEqual([]);
      expect(OutcomeFeedbackOverrideStoreEngine.lastFilteredCount).toBe(1);
    });

    it("rejects confidence below 0.7 floor", () => {
      const mutated = OutcomeFeedbackOverrideStoreEngine.ingest({
        domain: "cam",
        success: true,
        confidence: 0.5,
        overrides: { x: 1 },
      });
      expect(mutated).toBe(false);
      expect(OutcomeFeedbackOverrideStoreEngine.keys("cam")).toEqual([]);
      expect(OutcomeFeedbackOverrideStoreEngine.lastFilteredCount).toBe(1);
    });

    it("rejects empty/missing overrides — store stays empty", () => {
      const noOverrides = OutcomeFeedbackOverrideStoreEngine.ingest({
        domain: "cam",
        success: true,
        confidence: 0.9,
      });
      expect(noOverrides).toBe(false);
      expect(OutcomeFeedbackOverrideStoreEngine.keys("cam")).toEqual([]);

      const nullOverrides = OutcomeFeedbackOverrideStoreEngine.ingest({
        domain: "cam",
        success: true,
        confidence: 0.9,
        overrides: null as unknown as Record<string, unknown>,
      });
      expect(nullOverrides).toBe(false);
      expect(OutcomeFeedbackOverrideStoreEngine.keys("cam")).toEqual([]);
      expect(OutcomeFeedbackOverrideStoreEngine.lastFilteredCount).toBe(2);
    });

    it("rejects non-object events without throwing", () => {
      expect(OutcomeFeedbackOverrideStoreEngine.ingest(null as unknown as OutcomeOverrideEvent)).toBe(false);
      expect(OutcomeFeedbackOverrideStoreEngine.ingest(undefined as unknown as OutcomeOverrideEvent)).toBe(false);
      expect(OutcomeFeedbackOverrideStoreEngine.lastFilteredCount).toBe(2);
    });
  });

  describe("query API", () => {
    it("keys() returns all override keys for a domain in deterministic order via sort()", () => {
      OutcomeFeedbackOverrideStoreEngine.ingest({
        domain: "sfc",
        success: true,
        confidence: 0.9,
        overrides: { a: 1, b: 2, c: 3 },
      });

      const keys = OutcomeFeedbackOverrideStoreEngine.keys("sfc").sort();
      expect(keys).toEqual(["a", "b", "c"]);
      expect(keys).toHaveLength(3);
    });

    it("all() returns a snapshot Map — mutating snapshot does NOT affect store", () => {
      OutcomeFeedbackOverrideStoreEngine.ingest({
        domain: "cam",
        success: true,
        confidence: 0.9,
        overrides: { x: 1, y: 2 },
      });

      const snap = OutcomeFeedbackOverrideStoreEngine.all("cam") as Map<string, unknown>;
      expect(snap.size).toBe(2);

      snap.delete("x");
      snap.clear();
      expect(snap.size).toBe(0);

      // Original store unchanged
      expect(OutcomeFeedbackOverrideStoreEngine.get("cam", "x")?.value).toBe(1);
      expect(OutcomeFeedbackOverrideStoreEngine.get("cam", "y")?.value).toBe(2);
      expect(OutcomeFeedbackOverrideStoreEngine.keys("cam").sort()).toEqual(["x", "y"]);
    });

    it("reset() clears the store + counters back to zero", () => {
      OutcomeFeedbackOverrideStoreEngine.ingest({
        domain: "cam",
        success: true,
        confidence: 0.9,
        overrides: { x: 1 },
      });
      expect(OutcomeFeedbackOverrideStoreEngine.totalIngested).toBe(1);
      expect(OutcomeFeedbackOverrideStoreEngine.get("cam", "x")?.value).toBe(1);

      OutcomeFeedbackOverrideStoreEngine.reset();

      expect(OutcomeFeedbackOverrideStoreEngine.keys("cam")).toEqual([]);
      expect(OutcomeFeedbackOverrideStoreEngine.totalIngested).toBe(0);
      expect(OutcomeFeedbackOverrideStoreEngine.lastFilteredCount).toBe(0);
    });
  });

  describe("singleton handle", () => {
    it("ingestion via singleton alias mutates the same store the class reads from", () => {
      const event: OutcomeOverrideEvent = {
        domain: "quality",
        success: true,
        confidence: 0.91,
        overrides: { tolerance_um: 12.5 },
      };
      const mutated = outcomeFeedbackOverrideStoreEngine.ingest(event);
      expect(mutated).toBe(true);
      const rec = OutcomeFeedbackOverrideStoreEngine.get("quality", "tolerance_um");
      expect(rec?.value).toBe(12.5);
      expect(rec?.confidence).toBe(0.91);
      expect(rec?.sequence).toBeGreaterThan(0);
    });
  });
});
