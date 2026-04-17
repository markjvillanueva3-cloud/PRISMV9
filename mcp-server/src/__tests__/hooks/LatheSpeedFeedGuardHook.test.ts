/**
 * LatheSpeedFeedGuardHook Tests
 * =============================
 *
 * Tests for speed-feed-out-of-band-guard safety hook.
 *
 * @module tests/hooks/LatheSpeedFeedGuardHook
 * @milestone LATHE-MASTER U-LTH14
 */

import { describe, it, expect } from "vitest";
import {
  LatheSpeedFeedGuardHook,
  latheSpeedFeedGuardHook,
  HOOK_NAME,
  HOOK_VERSION,
  GUARDED_ACTIONS,
  type GuardInput,
} from "../../hooks/LatheSpeedFeedGuardHook.js";

describe("LatheSpeedFeedGuardHook", () => {
  describe("metadata", () => {
    it("exports correct hook name", () => {
      expect(HOOK_NAME).toBe("speed-feed-out-of-band-guard");
    });

    it("exports correct version", () => {
      expect(HOOK_VERSION).toBe("1.0.0");
      expect(LatheSpeedFeedGuardHook.getVersion()).toBe("1.0.0");
    });

    it("guards expected actions", () => {
      expect(GUARDED_ACTIONS).toContain("lathe_sf_calculate");
      expect(GUARDED_ACTIONS).toContain("lathe_sf_advise");
      expect(GUARDED_ACTIONS).toContain("lathe_sf_full");
      expect(LatheSpeedFeedGuardHook.getGuardedActions()).toEqual(GUARDED_ACTIONS);
    });
  });

  describe("valid recommendations", () => {
    it("passes valid steel roughing parameters", () => {
      const input: GuardInput = {
        recommendation: {
          cutting_speed_m_min: 200,
          rpm: 800,
          feed_mm_rev: 0.25,
          depth_of_cut_mm: 3.0,
        },
        material_iso_group: "P",
      };

      const result = latheSpeedFeedGuardHook.validate(input);
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.safety_score).toBe(1.0);
      expect(result.adjusted_recommendation).toBeUndefined();
    });

    it("passes valid aluminum finishing parameters", () => {
      const input: GuardInput = {
        recommendation: {
          cutting_speed_m_min: 600,
          rpm: 3000,
          feed_mm_rev: 0.08,
          depth_of_cut_mm: 0.5,
        },
        material_iso_group: "N",
      };

      const result = latheSpeedFeedGuardHook.validate(input);
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.safety_score).toBe(1.0);
    });

    it("passes valid superalloy parameters", () => {
      const input: GuardInput = {
        recommendation: {
          cutting_speed_m_min: 45,
          rpm: 200,
          feed_mm_rev: 0.15,
          depth_of_cut_mm: 1.5,
        },
        material_iso_group: "S",
      };

      const result = latheSpeedFeedGuardHook.validate(input);
      expect(result.passed).toBe(true);
    });
  });

  describe("Vc absolute limits", () => {
    it("rejects Vc below absolute minimum (rubbing risk)", () => {
      const input: GuardInput = {
        recommendation: {
          cutting_speed_m_min: 3, // Below 5 m/min limit
          rpm: 50,
          feed_mm_rev: 0.1,
          depth_of_cut_mm: 1.0,
        },
      };

      const result = latheSpeedFeedGuardHook.validate(input);
      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].code).toBe("VC_TOO_LOW");
      expect(result.violations[0].severity).toBe("error");
      expect(result.adjusted_recommendation?.cutting_speed_m_min).toBe(5);
    });

    it("rejects Vc above absolute maximum (critical)", () => {
      const input: GuardInput = {
        recommendation: {
          cutting_speed_m_min: 1500, // Above 1200 m/min limit
          rpm: 10000,
          feed_mm_rev: 0.1,
          depth_of_cut_mm: 0.5,
        },
      };

      const result = latheSpeedFeedGuardHook.validate(input);
      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].code).toBe("VC_TOO_HIGH");
      expect(result.violations[0].severity).toBe("critical");
      expect(result.adjusted_recommendation?.cutting_speed_m_min).toBe(1200);
    });
  });

  describe("ISO group Vc ranges", () => {
    it("warns when Vc significantly below ISO P range", () => {
      const input: GuardInput = {
        recommendation: {
          cutting_speed_m_min: 30, // Below 80*0.5=40
          rpm: 100,
          feed_mm_rev: 0.15,
          depth_of_cut_mm: 2.0,
        },
        material_iso_group: "P",
      };

      const result = latheSpeedFeedGuardHook.validate(input);
      expect(result.passed).toBe(true); // Warnings don't fail
      expect(result.violations.some(v => v.code === "VC_BELOW_ISO_RANGE")).toBe(true);
      expect(result.safety_score).toBeLessThan(1.0);
    });

    it("warns when Vc significantly above ISO H range", () => {
      const input: GuardInput = {
        recommendation: {
          cutting_speed_m_min: 350, // Above 200*1.5=300
          rpm: 2000,
          feed_mm_rev: 0.12,
          depth_of_cut_mm: 1.0,
        },
        material_iso_group: "H",
      };

      const result = latheSpeedFeedGuardHook.validate(input);
      expect(result.passed).toBe(true);
      expect(result.violations.some(v => v.code === "VC_ABOVE_ISO_RANGE")).toBe(true);
      // Should adjust to max*1.3 = 260
      expect(result.adjusted_recommendation?.cutting_speed_m_min).toBeLessThanOrEqual(260);
    });

    it("warns when Vc above ISO S range (superalloys)", () => {
      const input: GuardInput = {
        recommendation: {
          cutting_speed_m_min: 200, // Above 120*1.5=180
          rpm: 1000,
          feed_mm_rev: 0.1,
          depth_of_cut_mm: 1.0,
        },
        material_iso_group: "S",
      };

      const result = latheSpeedFeedGuardHook.validate(input);
      expect(result.violations.some(v => v.code === "VC_ABOVE_ISO_RANGE")).toBe(true);
    });
  });

  describe("feed limits", () => {
    it("warns when feed below minimum", () => {
      const input: GuardInput = {
        recommendation: {
          cutting_speed_m_min: 150,
          rpm: 600,
          feed_mm_rev: 0.01, // Below 0.02
          depth_of_cut_mm: 1.0,
        },
      };

      const result = latheSpeedFeedGuardHook.validate(input);
      expect(result.violations.some(v => v.code === "FEED_TOO_LOW")).toBe(true);
      expect(result.adjusted_recommendation?.feed_mm_rev).toBe(0.02);
    });

    it("rejects feed above maximum", () => {
      const input: GuardInput = {
        recommendation: {
          cutting_speed_m_min: 150,
          rpm: 600,
          feed_mm_rev: 0.8, // Above 0.6
          depth_of_cut_mm: 3.0,
        },
      };

      const result = latheSpeedFeedGuardHook.validate(input);
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.code === "FEED_TOO_HIGH")).toBe(true);
      expect(result.violations.find(v => v.code === "FEED_TOO_HIGH")?.severity).toBe("error");
      expect(result.adjusted_recommendation?.feed_mm_rev).toBe(0.6);
    });
  });

  describe("DOC limits", () => {
    it("warns when DOC below minimum", () => {
      const input: GuardInput = {
        recommendation: {
          cutting_speed_m_min: 150,
          rpm: 600,
          feed_mm_rev: 0.1,
          depth_of_cut_mm: 0.02, // Below 0.05
        },
      };

      const result = latheSpeedFeedGuardHook.validate(input);
      expect(result.violations.some(v => v.code === "DOC_TOO_LOW")).toBe(true);
      expect(result.adjusted_recommendation?.depth_of_cut_mm).toBe(0.05);
    });

    it("rejects DOC above maximum", () => {
      const input: GuardInput = {
        recommendation: {
          cutting_speed_m_min: 150,
          rpm: 600,
          feed_mm_rev: 0.25,
          depth_of_cut_mm: 15.0, // Above 10.0
        },
      };

      const result = latheSpeedFeedGuardHook.validate(input);
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.code === "DOC_TOO_HIGH")).toBe(true);
      expect(result.adjusted_recommendation?.depth_of_cut_mm).toBe(10.0);
    });
  });

  describe("RPM limits", () => {
    it("warns when RPM below minimum", () => {
      const input: GuardInput = {
        recommendation: {
          cutting_speed_m_min: 50,
          rpm: 10, // Below 20
          feed_mm_rev: 0.2,
          depth_of_cut_mm: 2.0,
        },
      };

      const result = latheSpeedFeedGuardHook.validate(input);
      expect(result.violations.some(v => v.code === "RPM_TOO_LOW")).toBe(true);
      expect(result.adjusted_recommendation?.rpm).toBe(20);
    });

    it("warns when RPM above maximum", () => {
      const input: GuardInput = {
        recommendation: {
          cutting_speed_m_min: 800,
          rpm: 15000, // Above 12000
          feed_mm_rev: 0.05,
          depth_of_cut_mm: 0.3,
        },
      };

      const result = latheSpeedFeedGuardHook.validate(input);
      expect(result.violations.some(v => v.code === "RPM_TOO_HIGH")).toBe(true);
      expect(result.adjusted_recommendation?.rpm).toBe(12000);
    });
  });

  describe("power validation", () => {
    it("rejects when power exceeds 90% of machine capacity", () => {
      const input: GuardInput = {
        recommendation: {
          cutting_speed_m_min: 200,
          rpm: 800,
          feed_mm_rev: 0.3,
          depth_of_cut_mm: 4.0,
        },
        machine_power_kw: 15,
        predicted_power_kw: 14.5, // Above 15*0.9=13.5
      };

      const result = latheSpeedFeedGuardHook.validate(input);
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.code === "POWER_EXCEEDED")).toBe(true);
      expect(result.violations.find(v => v.code === "POWER_EXCEEDED")?.severity).toBe("error");
    });

    it("passes when power within capacity", () => {
      const input: GuardInput = {
        recommendation: {
          cutting_speed_m_min: 200,
          rpm: 800,
          feed_mm_rev: 0.2,
          depth_of_cut_mm: 2.0,
        },
        machine_power_kw: 15,
        predicted_power_kw: 10, // Below 15*0.9=13.5
      };

      const result = latheSpeedFeedGuardHook.validate(input);
      expect(result.violations.some(v => v.code === "POWER_EXCEEDED")).toBe(false);
    });
  });

  describe("surface finish validation", () => {
    it("warns when predicted Ra exceeds target for finishing", () => {
      const input: GuardInput = {
        recommendation: {
          cutting_speed_m_min: 200,
          rpm: 1200,
          feed_mm_rev: 0.15,
          depth_of_cut_mm: 0.5,
        },
        operation_type: "finishing",
        target_ra_um: 1.6,
        predicted_ra_um: 2.5, // Above 1.6*1.2=1.92
      };

      const result = latheSpeedFeedGuardHook.validate(input);
      expect(result.passed).toBe(true); // Warning only
      expect(result.violations.some(v => v.code === "RA_TARGET_EXCEEDED")).toBe(true);
    });

    it("does not warn for roughing operations", () => {
      const input: GuardInput = {
        recommendation: {
          cutting_speed_m_min: 180,
          rpm: 600,
          feed_mm_rev: 0.3,
          depth_of_cut_mm: 3.0,
        },
        operation_type: "roughing",
        target_ra_um: 1.6,
        predicted_ra_um: 6.0,
      };

      const result = latheSpeedFeedGuardHook.validate(input);
      expect(result.violations.some(v => v.code === "RA_TARGET_EXCEEDED")).toBe(false);
    });
  });

  describe("safety score calculation", () => {
    it("returns 1.0 for no violations", () => {
      const input: GuardInput = {
        recommendation: {
          cutting_speed_m_min: 200,
          rpm: 800,
          feed_mm_rev: 0.2,
          depth_of_cut_mm: 2.0,
        },
        material_iso_group: "P",
      };

      const result = latheSpeedFeedGuardHook.validate(input);
      expect(result.safety_score).toBe(1.0);
    });

    it("decreases score for warnings", () => {
      const input: GuardInput = {
        recommendation: {
          cutting_speed_m_min: 35, // Below ISO P range (warning)
          rpm: 150,
          feed_mm_rev: 0.2,
          depth_of_cut_mm: 2.0,
        },
        material_iso_group: "P",
      };

      const result = latheSpeedFeedGuardHook.validate(input);
      expect(result.safety_score).toBeLessThan(1.0);
      expect(result.safety_score).toBeGreaterThanOrEqual(0.8);
    });

    it("decreases score more for errors", () => {
      const input: GuardInput = {
        recommendation: {
          cutting_speed_m_min: 200,
          rpm: 800,
          feed_mm_rev: 0.8, // Error: too high
          depth_of_cut_mm: 2.0,
        },
      };

      const result = latheSpeedFeedGuardHook.validate(input);
      expect(result.safety_score).toBe(0.8);
    });

    it("decreases score significantly for critical violations", () => {
      const input: GuardInput = {
        recommendation: {
          cutting_speed_m_min: 1500, // Critical: above max
          rpm: 10000,
          feed_mm_rev: 0.1,
          depth_of_cut_mm: 0.5,
        },
      };

      const result = latheSpeedFeedGuardHook.validate(input);
      expect(result.safety_score).toBe(0.6);
    });

    it("accumulates multiple violation penalties", () => {
      const input: GuardInput = {
        recommendation: {
          cutting_speed_m_min: 3, // Error
          rpm: 10, // Warning
          feed_mm_rev: 0.8, // Error
          depth_of_cut_mm: 15.0, // Error
        },
      };

      const result = latheSpeedFeedGuardHook.validate(input);
      // 3 errors = -0.6, 1 warning = -0.1 = 0.3 (clamped at 0)
      expect(result.safety_score).toBeLessThanOrEqual(0.3);
    });
  });

  describe("input validation", () => {
    it("rejects invalid input structure", () => {
      const result = latheSpeedFeedGuardHook.validate({
        recommendation: {
          // Missing required fields
          cutting_speed_m_min: 200,
        },
      } as GuardInput);

      expect(result.passed).toBe(false);
      expect(result.violations[0].code).toBe("INVALID_INPUT");
      expect(result.safety_score).toBe(0);
    });

    it("rejects invalid ISO group", () => {
      const result = latheSpeedFeedGuardHook.validate({
        recommendation: {
          cutting_speed_m_min: 200,
          rpm: 800,
          feed_mm_rev: 0.2,
          depth_of_cut_mm: 2.0,
        },
        material_iso_group: "X" as any,
      });

      expect(result.passed).toBe(false);
      expect(result.violations[0].code).toBe("INVALID_INPUT");
    });
  });

  describe("adjusted recommendations", () => {
    it("provides adjusted values when violations occur", () => {
      const input: GuardInput = {
        recommendation: {
          cutting_speed_m_min: 3, // Too low
          rpm: 10, // Too low
          feed_mm_rev: 0.8, // Too high
          depth_of_cut_mm: 15.0, // Too high
        },
      };

      const result = latheSpeedFeedGuardHook.validate(input);
      expect(result.adjusted_recommendation).toBeDefined();
      expect(result.adjusted_recommendation?.cutting_speed_m_min).toBe(5);
      expect(result.adjusted_recommendation?.rpm).toBe(20);
      expect(result.adjusted_recommendation?.feed_mm_rev).toBe(0.6);
      expect(result.adjusted_recommendation?.depth_of_cut_mm).toBe(10.0);
    });

    it("does not provide adjusted values when no violations", () => {
      const input: GuardInput = {
        recommendation: {
          cutting_speed_m_min: 200,
          rpm: 800,
          feed_mm_rev: 0.2,
          depth_of_cut_mm: 2.0,
        },
      };

      const result = latheSpeedFeedGuardHook.validate(input);
      expect(result.adjusted_recommendation).toBeUndefined();
    });
  });
});
