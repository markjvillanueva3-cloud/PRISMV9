/**
 * MTConnectToOutcomeBridgeEngine tests — shop-floor telemetry → outcome bus
 * ==========================================================================
 *
 * @milestone PSN-DORMANCY-AUDIT-MS0/U-BRIDGE-SHOPFLOOR-LEARN
 */

import { describe, it, expect, beforeEach } from "vitest";

import {
  MTConnectToOutcomeBridgeEngine,
  mtconnectToOutcomeBridgeEngine,
  SHOPFLOOR_OUTCOME_TOPIC,
  SHOPFLOOR_OUTCOME_KIND,
  type MTConnectShopFloorEvent,
} from "../engines/MTConnectToOutcomeBridgeEngine.js";

describe("MTConnectToOutcomeBridgeEngine", () => {
  beforeEach(() => {
    MTConnectToOutcomeBridgeEngine.reset();
  });

  describe("translate() — success path", () => {
    it("ACTIVE execution with no alarms translates to success=true at baseline confidence", () => {
      const e: MTConnectShopFloorEvent = {
        device_id: "HAAS-VF2-001",
        execution: "ACTIVE",
        controller_mode: "AUTOMATIC",
        alarms: [],
        spindle_load_pct: 60,
        tool_temp_c: 220,
        domain: "mill",
      };
      const out = MTConnectToOutcomeBridgeEngine.translate(e);

      expect(out).not.toBeNull();
      expect(out?.success).toBe(true);
      expect(out?.confidence).toBe(0.85);
      expect(out?.domain).toBe("mill");
      expect(out?.topic).toBe(SHOPFLOOR_OUTCOME_TOPIC);
      expect(out?.kind).toBe(SHOPFLOOR_OUTCOME_KIND);
      expect(MTConnectToOutcomeBridgeEngine.successCount).toBe(1);
    });

    it("INTERRUPTED execution with no alarms still success=true (operator paused, not faulted)", () => {
      const out = MTConnectToOutcomeBridgeEngine.translate({
        execution: "INTERRUPTED",
        domain: "lathe",
      });
      expect(out?.success).toBe(true);
    });

    it("passes operator_overrides through to outcome event for downstream learning", () => {
      const out = MTConnectToOutcomeBridgeEngine.translate({
        execution: "ACTIVE",
        operator_overrides: { feed_pct: 110, spindle_pct: 95 },
      });
      expect(out?.overrides).toEqual({ feed_pct: 110, spindle_pct: 95 });
    });
  });

  describe("translate() — failure path", () => {
    it("ACTIVE execution with alarms translates to success=false confidence 0", () => {
      const out = MTConnectToOutcomeBridgeEngine.translate({
        execution: "ACTIVE",
        alarms: ["SPINDLE_OVERLOAD"],
      });
      expect(out?.success).toBe(false);
      expect(out?.confidence).toBe(0);
      expect(MTConnectToOutcomeBridgeEngine.failureCount).toBe(1);
    });

    it("STOPPED execution + no alarms is still success=false (not running)", () => {
      const out = MTConnectToOutcomeBridgeEngine.translate({ execution: "STOPPED" });
      expect(out?.success).toBe(false);
    });

    it("READY execution is success=false (idle, not running)", () => {
      const out = MTConnectToOutcomeBridgeEngine.translate({ execution: "READY" });
      expect(out?.success).toBe(false);
    });
  });

  describe("translate() — confidence rollup", () => {
    it("high spindle load drops confidence to marginal floor 0.55", () => {
      const out = MTConnectToOutcomeBridgeEngine.translate({
        execution: "ACTIVE",
        spindle_load_pct: 92,
      });
      expect(out?.success).toBe(true);
      expect(out?.confidence).toBe(0.55);
    });

    it("high tool temp drops confidence to marginal floor 0.55", () => {
      const out = MTConnectToOutcomeBridgeEngine.translate({
        execution: "ACTIVE",
        tool_temp_c: 410,
      });
      expect(out?.confidence).toBe(0.55);
    });

    it("both signals firing — confidence stays at marginal floor (not double-discounted)", () => {
      const out = MTConnectToOutcomeBridgeEngine.translate({
        execution: "ACTIVE",
        spindle_load_pct: 90,
        tool_temp_c: 400,
      });
      expect(out?.confidence).toBe(0.55);
    });
  });

  describe("translate() — malformed input", () => {
    it("null event returns null + bumps malformedCount", () => {
      const out = MTConnectToOutcomeBridgeEngine.translate(null as unknown as MTConnectShopFloorEvent);
      expect(out).toBeNull();
      expect(MTConnectToOutcomeBridgeEngine.malformedCount).toBe(1);
    });

    it("event missing execution returns null", () => {
      const out = MTConnectToOutcomeBridgeEngine.translate({ device_id: "X" });
      expect(out).toBeNull();
      expect(MTConnectToOutcomeBridgeEngine.malformedCount).toBe(1);
    });

    it("non-object event returns null without throwing", () => {
      const out = MTConnectToOutcomeBridgeEngine.translate("not-an-object" as unknown as MTConnectShopFloorEvent);
      expect(out).toBeNull();
      expect(MTConnectToOutcomeBridgeEngine.malformedCount).toBe(1);
    });
  });

  describe("singleton handle", () => {
    it("singleton alias is the live class — counters shared across handles", () => {
      mtconnectToOutcomeBridgeEngine.translate({ execution: "ACTIVE" });
      mtconnectToOutcomeBridgeEngine.translate({ execution: "ACTIVE" });
      expect(MTConnectToOutcomeBridgeEngine.successCount).toBe(2);
    });
  });

  describe("context fields", () => {
    it("preserves device_id, controller_mode, and execution in context", () => {
      const out = MTConnectToOutcomeBridgeEngine.translate({
        execution: "ACTIVE",
        device_id: "OKUMA-2SP-002",
        controller_mode: "AUTOMATIC",
      });
      expect(out?.context.device_id).toBe("OKUMA-2SP-002");
      expect(out?.context.controller_mode).toBe("AUTOMATIC");
      expect(out?.context.execution).toBe("ACTIVE");
    });

    it("alarms array defaults to [] when not provided", () => {
      const out = MTConnectToOutcomeBridgeEngine.translate({ execution: "ACTIVE" });
      expect(out?.context.alarms).toEqual([]);
    });
  });
});
