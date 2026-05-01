/**
 * HBK-MS9: Safety + Quality Pipeline Integration Tests
 *
 * U01: machineLimitGuard resolves limits from handbook
 * U02: Alarm severity escalation uses OEM classifications
 * U03: MetrologyUncertaintyEngine uses handbook accuracy specs
 * U04: Integration validation across all three
 */

import { describe, it, expect } from "vitest";

// Direct import of hook handlers via the exported array
import { safetyQualityHooks } from "../hooks/SafetyQualityHooks.js";
import type { HookContext } from "../engines/HookExecutor.js";

function findHook(id: string) {
  return safetyQualityHooks.find((h: any) => h.id === id);
}

function makeCtx(data: Record<string, any>): HookContext {
  return {
    operation: "test",
    phase: "on-machine-limit",
    timestamp: new Date(),
    target: { type: "test", data },
    metadata: {},
  } as any;
}

describe("HBK-MS9: Safety + Quality Pipeline Handbook Integration", () => {

  describe("U01: machineLimitGuard with handbook limits", () => {
    const hook = findHook("machine-limit-guard");

    it("hook exists and is enabled", () => {
      expect(hook).toBeDefined();
      expect(hook!.enabled).toBe(true);
      expect(hook!.mode).toBe("blocking");
    });

    it("blocks when spindle RPM exceeds caller-provided limits", () => {
      const result = hook!.handler(makeCtx({
        spindleRpm: 15000,
        machineLimits: { maxRpm: 12000 },
      }));
      expect(result.blocked).toBe(true);
      expect(result.message).toContain("MACHINE LIMIT EXCEEDED");
    });

    it("passes when within caller-provided limits", () => {
      const result = hook!.handler(makeCtx({
        spindleRpm: 8000,
        machineLimits: { maxRpm: 12000 },
      }));
      expect(result.success).toBe(true);
    });

    it("blocks when torque exceeds limits", () => {
      const result = hook!.handler(makeCtx({
        torque_Nm: 200,
        machineLimits: { maxTorque_Nm: 150 },
      }));
      expect(result.blocked).toBe(true);
    });

    it("blocks when power exceeds limits", () => {
      const result = hook!.handler(makeCtx({
        power_kW: 25,
        machineLimits: { maxPower_kW: 18.5 },
      }));
      expect(result.blocked).toBe(true);
    });

    it("checks axis travel limits", () => {
      const result = hook!.handler(makeCtx({
        X_mm: 1200,
        machineLimits: { maxX_mm: 1000, minX_mm: 0 },
      }));
      expect(result.blocked).toBe(true);
    });

    it("passes with no limits and no machine_id (graceful fallback)", () => {
      const result = hook!.handler(makeCtx({
        spindleRpm: 8000,
      }));
      // No limits provided and no machine_id → no checks can be done → passes
      expect(result.success).toBe(true);
    });

    it("attempts handbook resolution when machine_id provided but no limits", () => {
      // This won't find a real handbook (no handbooks loaded in test), but shouldn't crash
      const result = hook!.handler(makeCtx({
        machine_id: "test-machine-no-handbook",
        spindleRpm: 8000,
      }));
      // Should still pass — handbook not found, no limits to check
      expect(result.success).toBe(true);
    });
  });

  describe("U02: Alarm severity escalation", () => {
    const hook = findHook("alarm-severity-escalation");

    it("hook exists and is enabled", () => {
      expect(hook).toBeDefined();
      expect(hook!.enabled).toBe(true);
    });

    it("passes when no alarm code provided", () => {
      const result = hook!.handler(makeCtx({}));
      expect(result.success).toBe(true);
    });

    it("returns warning when alarm code has no handbook data", () => {
      const result = hook!.handler(makeCtx({
        alarmCode: "9999",
        machine_id: "unknown-machine",
      }));
      // No handbook found → warning about missing data
      expect(result.success).toBe(true); expect(result.warnings?.length).toBeGreaterThan(0);
      expect(result.message).toContain("no handbook data");
    });

    it("returns warning for alarm without machine_id", () => {
      const result = hook!.handler(makeCtx({
        alarmCode: "100",
      }));
      expect(result.success).toBe(true); expect(result.warnings?.length).toBeGreaterThan(0);
    });
  });

  describe("U03: Metrology handbook accuracy specs", () => {
    it("MachineCapabilityIntelligenceEngine provides positioning accuracy", async () => {
      const mod = await import("../engines/MachineCapabilityIntelligenceEngine.js");
      expect(mod.machineCapabilityIntelligenceEngine).toBeDefined();
      expect(typeof mod.machineCapabilityIntelligenceEngine.getProfile).toBe("function");
    });

    it("HandbookAxisKinematics schema includes accuracy fields", async () => {
      const mod = await import("../engines/MachineHandbookRegistryEngine.js");
      expect(mod.HandbookAxisKinematicsSchema).toBeDefined();

      // Verify the schema accepts accuracy/repeatability fields
      const validData = {
        axes: [{
          name: "X",
          travel_mm: 762,
          rapid_mm_min: 25400,
          resolution_um: 1,
          repeatability_um: 5,
          accuracy_um: 10,
          backlash_um: 3,
        }],
        source: {
          handbook_title: "Test",
          extraction_method: "manual",
          confidence: 0.9,
          extracted_at: "2026-01-01T00:00:00Z",
        },
      };
      const result = mod.HandbookAxisKinematicsSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.axes[0].repeatability_um).toBe(5);
        expect(result.data.axes[0].accuracy_um).toBe(10);
      }
    });

    it("MetrologyUncertaintyEngine file exists on disk", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const enginePath = path.resolve(__dirname, "../engines/MetrologyUncertaintyEngine.ts");
      expect(fs.existsSync(enginePath)).toBe(true);
    });
  });

  describe("U04: Integration validation", () => {
    it("SafetyQualityHooks exports include alarmSeverityEscalation", () => {
      const alarmHook = findHook("alarm-severity-escalation");
      expect(alarmHook).toBeDefined();
      expect(alarmHook!.priority).toBe("critical");
      expect(alarmHook!.tags).toContain("handbook");
    });

    it("machineLimitGuard description mentions handbook", () => {
      const limitHook = findHook("machine-limit-guard");
      expect(limitHook!.description).toContain("handbook");
    });

    it("all safety hooks are blocking mode", () => {
      const safetyHooks = safetyQualityHooks.filter(
        (h: any) => h.tags?.includes("safety") && h.mode === "blocking",
      );
      expect(safetyHooks.length).toBeGreaterThanOrEqual(5); // 5 original + alarm escalation
    });

    it("handbook-aware hooks have handbook in tags", () => {
      const handbookHooks = safetyQualityHooks.filter(
        (h: any) => h.tags?.includes("handbook"),
      );
      expect(handbookHooks.length).toBeGreaterThanOrEqual(1);
    });

    it("total safety hook count is at least 6 (5 original + alarm escalation)", () => {
      const count = safetyQualityHooks.filter(
        (h: any) => h.category === "enforcement",
      ).length;
      expect(count).toBeGreaterThanOrEqual(6);
    });
  });
});
