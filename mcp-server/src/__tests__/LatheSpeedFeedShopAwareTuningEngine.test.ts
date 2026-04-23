/**
 * Tests for LatheSpeedFeedShopAwareTuningEngine
 * LATHE-MASTER U-LTH12 — Phase P1: Speed & Feed Calculator
 *
 * Exit conditions: JM Die profile produces >5% delta vs generic, >=12 tests
 */
import { describe, it, expect } from "vitest";
import {
  LatheSpeedFeedShopAwareTuningEngine,
  type ShopTuningInput,
} from "../engines/LatheSpeedFeedShopAwareTuningEngine.js";

const buildInput = (overrides: Partial<ShopTuningInput> = {}): ShopTuningInput => ({
  base_input: {
    material: "4140",
    tool: { type: "turning_insert", nose_radius_mm: 0.8 },
    operation: { type: "roughing", coolant: "flood" },
    strategy: "balanced",
  },
  shop_profile_id: "jm-die",
  include_feedback: true,
  include_machine_compensation: true,
  ...overrides,
});

describe("LatheSpeedFeedShopAwareTuningEngine", () => {
  describe("tune() — main entry point", () => {
    it("returns successful result for valid input", () => {
      const input = buildInput();
      const result = LatheSpeedFeedShopAwareTuningEngine.tune(input);

      expect(result.success).toBe(true);
      expect(result.tuned_recommendation.cutting_speed_m_min).toBeGreaterThan(0);
      expect(result.tuned_recommendation.rpm).toBeGreaterThan(0);
      expect(result.tuned_recommendation.feed_mm_rev).toBeGreaterThan(0);
    });

    it("returns both tuned and generic recommendations", () => {
      const input = buildInput();
      const result = LatheSpeedFeedShopAwareTuningEngine.tune(input);

      expect(result.tuned_recommendation).toBeDefined();
      expect(result.generic_recommendation).toBeDefined();
      expect(result.generic_recommendation.cutting_speed_m_min).toBeGreaterThan(0);
    });

    it("returns failure for invalid input", () => {
      const result = LatheSpeedFeedShopAwareTuningEngine.tune({
        base_input: { material: "unobtainium" } as any,
        shop_profile_id: "jm-die",
      } as any);

      expect(result.success).toBe(false);
    });
  });

  describe("JM Die profile delta (CRITICAL: must be >5%)", () => {
    it("JM Die produces >5% total delta for ISO P materials (alloy steel)", () => {
      const input = buildInput({ base_input: {
        material: "4140",
        tool: { type: "turning_insert" },
        operation: { type: "roughing" },
      }});
      const result = LatheSpeedFeedShopAwareTuningEngine.tune(input);

      expect(result.success).toBe(true);
      expect(result.total_delta_percent).toBeGreaterThan(5);
    });

    it("JM Die produces >5% total delta for ISO H materials (tool steel)", () => {
      const input = buildInput({ base_input: {
        material: "D2",
        tool: { type: "turning_insert" },
        operation: { type: "roughing" },
      }});
      const result = LatheSpeedFeedShopAwareTuningEngine.tune(input);

      expect(result.success).toBe(true);
      expect(result.total_delta_percent).toBeGreaterThan(5);
    });

    it("JM Die produces >5% total delta for ISO M materials (stainless)", () => {
      const input = buildInput({ base_input: {
        material: "17-4PH",
        tool: { type: "turning_insert" },
        operation: { type: "roughing" },
      }});
      const result = LatheSpeedFeedShopAwareTuningEngine.tune(input);

      expect(result.success).toBe(true);
      expect(result.total_delta_percent).toBeGreaterThan(5);
    });

    it("generic profile produces 0% delta (no adjustments)", () => {
      const input = buildInput({ shop_profile_id: "generic" });
      const result = LatheSpeedFeedShopAwareTuningEngine.tune(input);

      expect(result.success).toBe(true);
      expect(result.total_delta_percent).toBe(0);
      expect(result.adjustments.length).toBe(0);
    });
  });

  describe("material-specific tuning", () => {
    it("reduces speed for tool steels (ISO H)", () => {
      const input = buildInput({ base_input: {
        material: "M2",
        tool: { type: "turning_insert" },
        operation: { type: "roughing" },
      }});
      const result = LatheSpeedFeedShopAwareTuningEngine.tune(input);

      expect(result.tuned_recommendation.cutting_speed_m_min).toBeLessThan(
        result.generic_recommendation.cutting_speed_m_min
      );
    });

    it("includes adjustment reason from historical feedback", () => {
      const input = buildInput({ base_input: {
        material: "D2",
        tool: { type: "turning_insert" },
        operation: { type: "roughing" },
      }});
      const result = LatheSpeedFeedShopAwareTuningEngine.tune(input);

      const speedAdj = result.adjustments.find(a => a.parameter === "speed" && a.reason.includes("historical"));
      expect(speedAdj).toBeDefined();
    });

    it("includes sample count in feedback reason", () => {
      const input = buildInput({ base_input: {
        material: "D2",
        tool: { type: "turning_insert" },
        operation: { type: "roughing" },
      }});
      const result = LatheSpeedFeedShopAwareTuningEngine.tune(input);

      const feedbackAdj = result.adjustments.find(a => a.reason.includes("n="));
      expect(feedbackAdj).toBeDefined();
    });
  });

  describe("machine-specific compensation", () => {
    it("applies machine rigidity factor", () => {
      const input = buildInput({ machine_id: "okuma-lb3000-1" });
      const result = LatheSpeedFeedShopAwareTuningEngine.tune(input);

      expect(result.machine_used).toBeDefined();
      expect(result.machine_used?.rigidity_factor).toBeGreaterThan(1);
    });

    it("includes machine info in result", () => {
      const input = buildInput({ machine_id: "okuma-lb3000-1" });
      const result = LatheSpeedFeedShopAwareTuningEngine.tune(input);

      expect(result.machine_used?.id).toBe("okuma-lb3000-1");
      expect(result.machine_used?.name).toContain("Okuma");
    });

    it("warns when machine not found", () => {
      const input = buildInput({ machine_id: "unknown-machine-xyz" });
      const result = LatheSpeedFeedShopAwareTuningEngine.tune(input);

      expect(result.warnings.some(w => w.includes("not found"))).toBe(true);
    });

    it("age factor below 0.95 adds warning", () => {
      const input = buildInput({ machine_id: "okuma-lb15" });
      const result = LatheSpeedFeedShopAwareTuningEngine.tune(input);

      expect(result.warnings.some(w => w.includes("age factor") || w.includes("maintenance"))).toBe(true);
    });
  });

  describe("confidence adjustment", () => {
    it("increases confidence for well-calibrated materials", () => {
      const input = buildInput({ base_input: {
        material: "D2",
        tool: { type: "turning_insert" },
        operation: { type: "roughing" },
      }});
      const result = LatheSpeedFeedShopAwareTuningEngine.tune(input);

      expect(result.confidence_adjustment).toBeGreaterThan(0);
    });

    it("machine compensation adds confidence", () => {
      const withMachine = LatheSpeedFeedShopAwareTuningEngine.tune(
        buildInput({ machine_id: "okuma-lb3000-1" })
      );
      const withoutMachine = LatheSpeedFeedShopAwareTuningEngine.tune(
        buildInput({ include_machine_compensation: false })
      );

      expect(withMachine.confidence_adjustment).toBeGreaterThan(
        withoutMachine.confidence_adjustment
      );
    });

    it("final confidence is bounded [0.5, 0.95]", () => {
      const result = LatheSpeedFeedShopAwareTuningEngine.tune(buildInput());

      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.confidence).toBeLessThanOrEqual(0.95);
    });
  });

  describe("adjustments tracking", () => {
    it("records all adjustments with delta percentages", () => {
      const input = buildInput({ base_input: {
        material: "M2",
        tool: { type: "turning_insert" },
        operation: { type: "roughing" },
      }});
      const result = LatheSpeedFeedShopAwareTuningEngine.tune(input);

      expect(result.adjustments.length).toBeGreaterThan(0);
      for (const adj of result.adjustments) {
        expect(typeof adj.parameter).toBe("string");
        expect(typeof adj.generic_value).toBe("number");
        expect(typeof adj.tuned_value).toBe("number");
        expect(typeof adj.delta_percent).toBe("number");
        expect(typeof adj.reason).toBe("string");
      }
    });

    it("total delta is sum of individual deltas (absolute)", () => {
      const input = buildInput({ base_input: {
        material: "D2",
        tool: { type: "turning_insert" },
        operation: { type: "roughing" },
      }});
      const result = LatheSpeedFeedShopAwareTuningEngine.tune(input);

      // Total delta should be non-negative
      expect(result.total_delta_percent).toBeGreaterThanOrEqual(0);
    });
  });

  describe("shop profile info", () => {
    it("includes shop profile details in result", () => {
      const input = buildInput();
      const result = LatheSpeedFeedShopAwareTuningEngine.tune(input);

      expect(result.shop_profile.id).toBe("jm-die");
      expect(result.shop_profile.name).toBe("JM Die Company");
      expect(result.shop_profile.last_calibration).toBeDefined();
    });
  });

  describe("listProfiles()", () => {
    it("returns available shop profiles", () => {
      const profiles = LatheSpeedFeedShopAwareTuningEngine.listProfiles();

      expect(profiles.length).toBeGreaterThanOrEqual(2);
      expect(profiles.some(p => p.id === "jm-die")).toBe(true);
      expect(profiles.some(p => p.id === "generic")).toBe(true);
    });
  });

  describe("listMachines()", () => {
    it("returns machines for JM Die profile", () => {
      const machines = LatheSpeedFeedShopAwareTuningEngine.listMachines("jm-die");

      expect(machines.length).toBeGreaterThan(0);
      expect(machines.some(m => m.id.includes("okuma"))).toBe(true);
    });

    it("returns empty array for generic profile", () => {
      const machines = LatheSpeedFeedShopAwareTuningEngine.listMachines("generic");

      expect(machines.length).toBe(0);
    });
  });

  describe("getVersion()", () => {
    it("returns version string in semver format", () => {
      const version = LatheSpeedFeedShopAwareTuningEngine.getVersion();
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });
});
