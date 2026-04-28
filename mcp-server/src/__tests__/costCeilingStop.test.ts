/**
 * cost-ceiling-stop — synthetic-input tests for U-AF04.
 *
 * Pure decision logic — tests cover all 4 cap dimensions
 * (cost, tokens, wall-time, units) without spawning the hook.
 *
 * @milestone AUTONOMOUS-FOOLPROOF-MS0
 * @unit U-AF04
 */

import { describe, it, expect } from "vitest";
// @ts-expect-error - importing pure logic from .mjs lib (no shebang, vitest-safe)
import { decideCostCeiling } from "../../../.claude/hooks/lib/autonomous-foolproof-logic.mjs";

const NOW = new Date("2026-04-29T08:00:00Z").getTime();
const FOUR_HOURS_AGO = new Date(NOW - 4 * 60 * 60 * 1000).toISOString();
const SIX_HOURS_AGO = new Date(NOW - 6 * 60 * 60 * 1000).toISOString();

describe("U-AF04 cost-ceiling-stop", () => {
  describe("non-autonomous mode", () => {
    it("passes through regardless of cost", () => {
      const r = decideCostCeiling({
        isAutonomous: false,
        overrideEnabled: false,
        state: { cost_used_usd: 999, tokens_used: 999_999_999 },
        nowMs: NOW,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("non-autonomous");
    });
  });

  describe("explicit override", () => {
    it("respects PRISM_COST_OVERRIDE=1 even at 100x cap", () => {
      const r = decideCostCeiling({
        isAutonomous: true,
        overrideEnabled: true,
        state: { cost_used_usd: 5000, tokens_used: 500_000_000 },
        nowMs: NOW,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("override-active");
    });
  });

  describe("happy paths (within all caps)", () => {
    it("passes through when no state", () => {
      const r = decideCostCeiling({
        isAutonomous: true,
        overrideEnabled: false,
        state: null,
        nowMs: NOW,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("no-state");
    });

    it("passes when 30% into all default caps", () => {
      const r = decideCostCeiling({
        isAutonomous: true,
        overrideEnabled: false,
        state: {
          started_at: new Date(NOW - 90 * 60 * 1000).toISOString(), // 1.5h
          cost_used_usd: 15.0,        // 30% of $50
          tokens_used: 1_500_000,     // 30% of 5M
          commits_made: 7,            // 28% of 25
        },
        nowMs: NOW,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("within-caps");
    });

    it("does NOT block exactly under each cap (< vs >=)", () => {
      const r = decideCostCeiling({
        isAutonomous: true,
        overrideEnabled: false,
        state: {
          started_at: FOUR_HOURS_AGO,
          cost_used_usd: 49.99,
          tokens_used: 4_999_999,
          commits_made: 24,
        },
        nowMs: NOW,
      });
      expect(r.continue).toBe(true);
    });
  });

  describe("block paths — single cap breach", () => {
    it("BLOCKS on cost cap breach (>= $50 default)", () => {
      const r = decideCostCeiling({
        isAutonomous: true,
        overrideEnabled: false,
        state: { cost_used_usd: 50.0, tokens_used: 0, commits_made: 0 },
        nowMs: NOW,
      });
      expect(r.continue).toBe(false);
      expect(r.decision).toBe("block");
      expect(r.breaches).toHaveLength(1);
      expect(r.breaches[0].cap).toBe("cost_usd");
      expect(r.breaches[0].value).toBe(50.0);
    });

    it("BLOCKS on token cap breach (>= 5M default)", () => {
      const r = decideCostCeiling({
        isAutonomous: true,
        overrideEnabled: false,
        state: { cost_used_usd: 0, tokens_used: 5_000_000, commits_made: 0 },
        nowMs: NOW,
      });
      expect(r.continue).toBe(false);
      expect(r.breaches[0].cap).toBe("tokens");
    });

    it("BLOCKS on wall-time cap breach (>= 5h default)", () => {
      const r = decideCostCeiling({
        isAutonomous: true,
        overrideEnabled: false,
        state: { started_at: SIX_HOURS_AGO, cost_used_usd: 0, tokens_used: 0 },
        nowMs: NOW,
      });
      expect(r.continue).toBe(false);
      expect(r.breaches[0].cap).toBe("wall_time_ms");
      expect(r.breaches[0].value).toBeGreaterThanOrEqual(6 * 60 * 60 * 1000);
    });

    it("BLOCKS on unit cap breach (>= 25 default)", () => {
      const r = decideCostCeiling({
        isAutonomous: true,
        overrideEnabled: false,
        state: { cost_used_usd: 0, tokens_used: 0, commits_made: 25 },
        nowMs: NOW,
      });
      expect(r.continue).toBe(false);
      expect(r.breaches[0].cap).toBe("unit_max");
      expect(r.breaches[0].value).toBe(25);
    });
  });

  describe("block paths — multi-cap breach", () => {
    it("reports ALL breached caps when more than one is over", () => {
      const r = decideCostCeiling({
        isAutonomous: true,
        overrideEnabled: false,
        state: {
          started_at: SIX_HOURS_AGO,
          cost_used_usd: 60.0,
          tokens_used: 6_000_000,
          commits_made: 30,
        },
        nowMs: NOW,
      });
      expect(r.continue).toBe(false);
      expect(r.breaches.length).toBe(4);
      const caps = r.breaches.map((b: any) => b.cap).sort();
      expect(caps).toEqual(["cost_usd", "tokens", "unit_max", "wall_time_ms"]);
    });
  });

  describe("custom caps via state.caps", () => {
    it("respects state.caps.cost_usd override", () => {
      const r = decideCostCeiling({
        isAutonomous: true,
        overrideEnabled: false,
        state: {
          cost_used_usd: 11,
          caps: { cost_usd: 10 },
        },
        nowMs: NOW,
      });
      expect(r.continue).toBe(false);
      expect(r.breaches[0].limit).toBe(10);
    });

    it("respects state.caps.unit_max override (smaller than default)", () => {
      const r = decideCostCeiling({
        isAutonomous: true,
        overrideEnabled: false,
        state: {
          commits_made: 6,
          caps: { unit_max: 6 },
        },
        nowMs: NOW,
      });
      expect(r.continue).toBe(false);
      expect(r.breaches[0].cap).toBe("unit_max");
      expect(r.breaches[0].limit).toBe(6);
    });

    it("respects state.caps.wall_time_ms override (1 minute)", () => {
      const r = decideCostCeiling({
        isAutonomous: true,
        overrideEnabled: false,
        state: {
          started_at: new Date(NOW - 2 * 60 * 1000).toISOString(),
          caps: { wall_time_ms: 60_000 },
        },
        nowMs: NOW,
      });
      expect(r.continue).toBe(false);
      expect(r.breaches[0].cap).toBe("wall_time_ms");
    });
  });

  describe("adversarial inputs", () => {
    it("treats NaN cost_used_usd as 0", () => {
      const r = decideCostCeiling({
        isAutonomous: true,
        overrideEnabled: false,
        state: { cost_used_usd: Number.NaN },
        nowMs: NOW,
      });
      expect(r.continue).toBe(true);
    });

    it("treats negative tokens_used as 0 (cannot breach)", () => {
      const r = decideCostCeiling({
        isAutonomous: true,
        overrideEnabled: false,
        state: { tokens_used: -100 },
        nowMs: NOW,
      });
      expect(r.continue).toBe(true);
    });

    it("ignores malformed started_at (no wall-time check fires)", () => {
      const r = decideCostCeiling({
        isAutonomous: true,
        overrideEnabled: false,
        state: { started_at: "not-a-date", cost_used_usd: 0 },
        nowMs: NOW,
      });
      expect(r.continue).toBe(true);
    });

    it("treats NaN cap as default (does not allow infinite cap)", () => {
      const r = decideCostCeiling({
        isAutonomous: true,
        overrideEnabled: false,
        state: { cost_used_usd: 60, caps: { cost_usd: Number.NaN } },
        nowMs: NOW,
      });
      // NaN cap → default $50 → blocks
      expect(r.continue).toBe(false);
      expect(r.breaches[0].limit).toBe(50);
    });

    it("treats non-object state.caps as empty (uses defaults)", () => {
      const r = decideCostCeiling({
        isAutonomous: true,
        overrideEnabled: false,
        state: { cost_used_usd: 60, caps: "garbage" },
        nowMs: NOW,
      });
      expect(r.continue).toBe(false);
      expect(r.breaches[0].limit).toBe(50);
    });
  });

  describe("contract guarantees", () => {
    it("never blocks when isAutonomous=false", () => {
      const adversarial = [
        { cost_used_usd: 1000, tokens_used: 100_000_000, commits_made: 100 },
        { started_at: SIX_HOURS_AGO, cost_used_usd: 100 },
      ];
      for (const state of adversarial) {
        const r = decideCostCeiling({
          isAutonomous: false,
          overrideEnabled: false,
          state,
          nowMs: NOW,
        });
        expect(r.continue).toBe(true);
      }
    });

    it("block decision always includes breaches array with cap/value/limit", () => {
      const r = decideCostCeiling({
        isAutonomous: true,
        overrideEnabled: false,
        state: { cost_used_usd: 100 },
        nowMs: NOW,
      });
      expect(r.continue).toBe(false);
      expect(Array.isArray(r.breaches)).toBe(true);
      expect(r.breaches[0]).toHaveProperty("cap");
      expect(r.breaches[0]).toHaveProperty("value");
      expect(r.breaches[0]).toHaveProperty("limit");
      expect(typeof r.breaches[0].cap).toBe("string");
      expect(typeof r.breaches[0].value).toBe("number");
      expect(typeof r.breaches[0].limit).toBe("number");
    });
  });
});
