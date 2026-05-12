/**
 * LatheSafetyHooks Test Suite
 * ============================
 *
 * MS8 (U-LAT63) — Tests for the 8 lathe safety hooks:
 *   - 3 Blocking: collision guard, spindle speed limit, gripping force
 *   - 3 Warning: surface finish, tool life, tribal override
 *   - 2 Logging: orchestration log, tribal activation log
 *
 * HookResult shape: { success: boolean, blocked: boolean, message, warnings?, ... }
 *   hookSuccess  → success:true,  blocked:false
 *   hookBlock    → success:false, blocked:true (if mode=blocking)
 *   hookWarning  → success:true,  blocked:false, warnings:[...]
 *
 * @milestone LATHE-AWARE-HARDEN MS8
 * @unit U-LAT63
 */

import { describe, it, expect } from "vitest";
import {
  LATHE_SAFETY_HOOKS,
  latheCollisionGuard,
  latheSpindleSpeedLimit,
  latheGrippingForce,
  latheSurfaceFinishWarning,
  latheToolLifeWarning,
  latheTribalOverrideWarning,
  latheOrchestrationLog,
  latheTribalActivationLog,
} from "../hooks/LatheSafetyHooks.js";
import { HookContext } from "../engines/HookExecutor.js";

// Helper to create a mock HookContext
function makeCtx(overrides: {
  action?: string;
  data?: Record<string, any>;
  result?: Record<string, any>;
}): HookContext {
  return {
    target: {
      action: overrides.action ?? "",
      data: overrides.data ?? {},
    },
    metadata: {
      result: overrides.result ?? {},
    },
  } as any;
}

describe("LatheSafetyHooks", () => {
  // ── Hook Registry ──────────────────────────────────────────────────────

  describe("LATHE_SAFETY_HOOKS array", () => {
    it("should export exactly 8 hooks", () => {
      expect(LATHE_SAFETY_HOOKS).toHaveLength(8);
    });

    it("should include 3 blocking hooks", () => {
      const blocking = LATHE_SAFETY_HOOKS.filter((h) => h.mode === "blocking");
      expect(blocking).toHaveLength(3);
    });

    it("should include 3 warning hooks", () => {
      const warning = LATHE_SAFETY_HOOKS.filter((h) => h.mode === "warning");
      expect(warning).toHaveLength(3);
    });

    it("should include 2 logging hooks", () => {
      const logging = LATHE_SAFETY_HOOKS.filter((h) => h.mode === "logging");
      expect(logging).toHaveLength(2);
    });

    it("should all have unique IDs", () => {
      const ids = LATHE_SAFETY_HOOKS.map((h) => h.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should all be enabled", () => {
      LATHE_SAFETY_HOOKS.forEach((h) => {
        expect(h.enabled).toBe(true);
      });
    });

    it("should all have lathe tag", () => {
      LATHE_SAFETY_HOOKS.forEach((h) => {
        expect(h.tags).toContain("lathe");
      });
    });
  });

  // ── Collision Guard Hook ───────────────────────────────────────────────

  describe("latheCollisionGuard", () => {
    it("should have id = lathe-collision-guard", () => {
      expect(latheCollisionGuard.id).toBe("lathe-collision-guard");
    });

    it("should skip non-collision actions", () => {
      const ctx = makeCtx({ action: "turning_assemble_program" });
      const result = latheCollisionGuard.handler(ctx);
      expect(result.success).toBe(true);
      expect(result.blocked).toBe(false);
    });

    it("should BLOCK when tool clearance < 2.0mm", () => {
      const ctx = makeCtx({
        action: "lathe_collision_check",
        data: { tool_clearance_mm: 1.5 },
      });
      const result = latheCollisionGuard.handler(ctx);
      expect(result.success).toBe(false);
      expect(result.blocked).toBe(true);
    });

    it("should PASS when tool clearance >= 2.0mm", () => {
      const ctx = makeCtx({
        action: "lathe_collision_check",
        data: { tool_clearance_mm: 5.0 },
      });
      const result = latheCollisionGuard.handler(ctx);
      expect(result.success).toBe(true);
      expect(result.blocked).toBe(false);
    });

    it("should BLOCK when part diameter > 95% of swing", () => {
      const ctx = makeCtx({
        action: "lathe_collision_check",
        data: { part_diameter_mm: 480, swing_limit_mm: 500 },
      });
      const result = latheCollisionGuard.handler(ctx);
      expect(result.blocked).toBe(true);
    });

    it("should PASS when part diameter < 95% of swing", () => {
      const ctx = makeCtx({
        action: "lathe_collision_check",
        data: { part_diameter_mm: 200, swing_limit_mm: 500 },
      });
      const result = latheCollisionGuard.handler(ctx);
      expect(result.success).toBe(true);
    });

    it("should BLOCK when jaw OD interferes with turret", () => {
      const ctx = makeCtx({
        action: "lathe_collision_check",
        data: { jaw_od_mm: 250, turret_min_x_mm: 200 },
      });
      const result = latheCollisionGuard.handler(ctx);
      expect(result.blocked).toBe(true);
    });
  });

  // ── Spindle Speed Limit Hook ───────────────────────────────────────────

  describe("latheSpindleSpeedLimit", () => {
    it("should have id = lathe-spindle-speed-limit", () => {
      expect(latheSpindleSpeedLimit.id).toBe("lathe-spindle-speed-limit");
    });

    it("should skip non-lathe actions", () => {
      const ctx = makeCtx({ action: "prism_calc_mrr" });
      const result = latheSpindleSpeedLimit.handler(ctx);
      expect(result.success).toBe(true);
    });

    it("should BLOCK when RPM exceeds LB3000 limit (5000)", () => {
      const ctx = makeCtx({
        action: "lathe_orchestrate_facade",
        data: { rpm: 6000, machine_id: "LB3000" },
      });
      const result = latheSpindleSpeedLimit.handler(ctx);
      expect(result.blocked).toBe(true);
    });

    it("should PASS when RPM within LB3000 limit", () => {
      const ctx = makeCtx({
        action: "lathe_orchestrate_facade",
        data: { rpm: 3500, machine_id: "LB3000" },
      });
      const result = latheSpindleSpeedLimit.handler(ctx);
      expect(result.success).toBe(true);
      expect(result.blocked).toBe(false);
    });

    it("should BLOCK when RPM exceeds LU300 limit (4500)", () => {
      const ctx = makeCtx({
        action: "lathe_orchestrate_facade",
        data: { rpm: 4800, machine_id: "LU300" },
      });
      const result = latheSpindleSpeedLimit.handler(ctx);
      expect(result.blocked).toBe(true);
    });

    it("should default to 5000 RPM limit for unknown machines", () => {
      const ctx = makeCtx({
        action: "lathe_orchestrate_facade",
        data: { rpm: 4500, machine_id: "UNKNOWN-MACHINE" },
      });
      const result = latheSpindleSpeedLimit.handler(ctx);
      expect(result.success).toBe(true);
    });
  });

  // ── Gripping Force Hook ────────────────────────────────────────────────

  describe("latheGrippingForce", () => {
    it("should have id = lathe-gripping-force", () => {
      expect(latheGrippingForce.id).toBe("lathe-gripping-force");
    });

    it("should skip non-chuck actions", () => {
      const ctx = makeCtx({ action: "lathe_cam_template" });
      const result = latheGrippingForce.handler(ctx);
      expect(result.success).toBe(true);
    });

    it("should BLOCK when grip/cut ratio < 2.0", () => {
      const ctx = makeCtx({
        action: "chuck_force",
        data: { gripping_force_n: 1000, cutting_force_n: 800 },
      });
      const result = latheGrippingForce.handler(ctx);
      expect(result.blocked).toBe(true);
    });

    it("should PASS when grip/cut ratio >= 2.0", () => {
      const ctx = makeCtx({
        action: "chuck_force",
        data: { gripping_force_n: 2000, cutting_force_n: 800 },
      });
      const result = latheGrippingForce.handler(ctx);
      expect(result.success).toBe(true);
      expect(result.blocked).toBe(false);
    });

    it("should PASS when no force data provided", () => {
      const ctx = makeCtx({
        action: "chuck_force",
        data: {},
      });
      const result = latheGrippingForce.handler(ctx);
      expect(result.success).toBe(true);
    });
  });

  // ── Surface Finish Warning Hook ────────────────────────────────────────

  describe("latheSurfaceFinishWarning", () => {
    it("should have id = lathe-surface-finish-warning", () => {
      expect(latheSurfaceFinishWarning.id).toBe("lathe-surface-finish-warning");
    });

    it("should WARN when predicted Ra exceeds target", () => {
      const ctx = makeCtx({
        result: { predicted_ra_um: 3.2, target_ra_um: 1.6 },
      });
      const result = latheSurfaceFinishWarning.handler(ctx);
      // hookWarning returns success:true but with warnings populated
      expect(result.success).toBe(true);
      expect(result.message).toContain("exceeds target");
    });

    it("should PASS when predicted Ra within target", () => {
      const ctx = makeCtx({
        result: { predicted_ra_um: 1.2, target_ra_um: 1.6 },
      });
      const result = latheSurfaceFinishWarning.handler(ctx);
      expect(result.success).toBe(true);
      expect(result.message).toContain("within spec");
    });
  });

  // ── Tool Life Warning Hook ─────────────────────────────────────────────

  describe("latheToolLifeWarning", () => {
    it("should have id = lathe-tool-life-warning", () => {
      expect(latheToolLifeWarning.id).toBe("lathe-tool-life-warning");
    });

    it("should WARN when tool life < 15 min", () => {
      const ctx = makeCtx({
        result: { tool_life_min: 8.5 },
      });
      const result = latheToolLifeWarning.handler(ctx);
      expect(result.success).toBe(true);
      expect(result.message).toContain("8.5");
    });

    it("should PASS when tool life >= 15 min", () => {
      const ctx = makeCtx({
        result: { tool_life_min: 45 },
      });
      const result = latheToolLifeWarning.handler(ctx);
      expect(result.success).toBe(true);
      expect(result.message).toContain("acceptable");
    });
  });

  // ── Tribal Override Warning Hook ───────────────────────────────────────

  describe("latheTribalOverrideWarning", () => {
    it("should have id = lathe-tribal-override-warning", () => {
      expect(latheTribalOverrideWarning.id).toBe("lathe-tribal-override-warning");
    });

    it("should WARN when tribal modifier > 1.20 (>20% increase)", () => {
      const ctx = makeCtx({
        result: { tribal_modifier: 1.35 },
      });
      const result = latheTribalOverrideWarning.handler(ctx);
      expect(result.success).toBe(true);
      expect(result.message).toContain("35.0%");
    });

    it("should WARN when tribal modifier < 0.80 (>20% decrease)", () => {
      const ctx = makeCtx({
        result: { tribal_modifier: 0.65 },
      });
      const result = latheTribalOverrideWarning.handler(ctx);
      expect(result.success).toBe(true);
      expect(result.message).toContain("-35.0%");
    });

    it("should PASS when tribal modifier within +/-20%", () => {
      const ctx = makeCtx({
        result: { tribal_modifier: 1.10 },
      });
      const result = latheTribalOverrideWarning.handler(ctx);
      expect(result.success).toBe(true);
      expect(result.message).toContain("No significant");
    });
  });

  // ── Orchestration Log Hook ─────────────────────────────────────────────

  describe("latheOrchestrationLog", () => {
    it("should have id = lathe-orchestration-log", () => {
      expect(latheOrchestrationLog.id).toBe("lathe-orchestration-log");
    });

    it("should always succeed (logging)", () => {
      const ctx = makeCtx({
        action: "lathe_orchestrate_facade",
        data: { type: "quick", material: "4140" },
        result: { routed_to: "QuickLatheAnalysis", provenance: { confidence: 0.7, engines_invoked: ["SpeedFeedOrchestratorEngine"] } },
      });
      const result = latheOrchestrationLog.handler(ctx);
      expect(result.success).toBe(true);
    });
  });

  // ── Tribal Activation Log Hook ─────────────────────────────────────────

  describe("latheTribalActivationLog", () => {
    it("should have id = lathe-tribal-activation-log", () => {
      expect(latheTribalActivationLog.id).toBe("lathe-tribal-activation-log");
    });

    it("should skip non-tribal actions", () => {
      const ctx = makeCtx({ action: "lathe_cam_template" });
      const result = latheTribalActivationLog.handler(ctx);
      expect(result.success).toBe(true);
    });

    it("should log tribal activation actions", () => {
      const ctx = makeCtx({
        action: "lathe_tribal_activate",
        data: { material: "4140", operation: "roughing", decision_type: "turning_roughing" },
      });
      const result = latheTribalActivationLog.handler(ctx);
      expect(result.success).toBe(true);
    });
  });
});
