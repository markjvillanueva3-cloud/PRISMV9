/**
 * Tests for AwarenessQueryEngine impact/rename/delete protocol (Universal Phase 0.8)
 */

import { describe, it, expect, beforeAll } from "vitest";
import { AwarenessQueryEngine } from "../engines/AwarenessQueryEngine.js";

describe("AwarenessQueryEngine Impact Protocol (Phase 0.8)", () => {
  let engine: AwarenessQueryEngine;

  beforeAll(() => {
    engine = new AwarenessQueryEngine();
  });

  describe("impactAnalysis", () => {
    it("returns impact analysis for existing engine", async () => {
      const result = await engine.impactAnalysis("KienzleForceModelEngine");

      expect(result).toBeDefined();
      expect(result.engineId).toBe("KienzleForceModelEngine");
      expect(typeof result.exists).toBe("boolean");
      expect(Array.isArray(result.dispatchers)).toBe(true);
      expect(Array.isArray(result.actions)).toBe(true);
      expect(Array.isArray(result.skills)).toBe(true);
      expect(Array.isArray(result.hooks)).toBe(true);
      expect(Array.isArray(result.tests)).toBe(true);
      expect(Array.isArray(result.aliases)).toBe(true);
      expect(typeof result.totalDependents).toBe("number");
      expect(typeof result.safeToModify).toBe("boolean");
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it("returns exists=false for non-existent engine", async () => {
      const result = await engine.impactAnalysis("NonExistentEngine12345");

      expect(result.engineId).toBe("NonExistentEngine12345");
      expect(result.exists).toBe(false);
      expect(result.dispatchers).toEqual([]);
      expect(result.totalDependents).toBe(0);
    });

    it("calculates totalDependents correctly", async () => {
      const result = await engine.impactAnalysis("KienzleForceModelEngine");

      const expectedTotal =
        result.dispatchers.length +
        result.actions.length +
        result.skills.length +
        result.hooks.length;

      expect(result.totalDependents).toBe(expectedTotal);
    });

    it("identifies safeToModify for isolated engines", async () => {
      const result = await engine.impactAnalysis("NonExistentEngine12345");

      expect(result.safeToModify).toBe(true);
    });

    it("generates warnings for high coupling", async () => {
      const result = await engine.impactAnalysis("KienzleForceModelEngine");

      if (result.dispatchers.length > 3) {
        expect(result.warnings.some((w) => w.includes("High dispatcher coupling"))).toBe(true);
      }
    });
  });

  describe("renamePlan", () => {
    it("returns valid plan structure", async () => {
      const result = await engine.renamePlan("KienzleForceModelEngine", "KienzleForceEngine");

      expect(result).toBeDefined();
      expect(result.oldId).toBe("KienzleForceModelEngine");
      expect(result.newId).toBe("KienzleForceEngine");
      expect(typeof result.valid).toBe("boolean");
      expect(Array.isArray(result.filesToUpdate)).toBe(true);
    });

    it("rejects empty oldId", async () => {
      const result = await engine.renamePlan("", "NewEngine");

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("required");
    });

    it("rejects empty newId", async () => {
      const result = await engine.renamePlan("OldEngine", "");

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("required");
    });

    it("rejects identical oldId and newId", async () => {
      const result = await engine.renamePlan("SameEngine", "SameEngine");

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("identical");
    });

    it("rejects non-existent engine", async () => {
      const result = await engine.renamePlan("NonExistentEngine12345", "NewName");

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("not found");
    });

    it("includes alias to add for valid rename", async () => {
      const result = await engine.renamePlan("KienzleForceModelEngine", "KienzleForceEngine");

      if (result.valid) {
        expect(result.aliasToAdd).toBeDefined();
        expect(result.aliasToAdd?.alias).toBe("KienzleForceModelEngine");
        expect(result.aliasToAdd?.canonical).toBe("KienzleForceEngine");
        expect(result.aliasToAdd?.reason).toBe("renamed");
      }
    });

    it("calculates estimated changes", async () => {
      const result = await engine.renamePlan("KienzleForceModelEngine", "KienzleForceEngine");

      if (result.valid) {
        expect(typeof result.estimatedChanges).toBe("number");
        expect(result.estimatedChanges).toBeGreaterThan(0);
      }
    });
  });

  describe("deletePlan", () => {
    it("returns valid plan structure", async () => {
      const result = await engine.deletePlan("KienzleForceModelEngine");

      expect(result).toBeDefined();
      expect(result.engineId).toBe("KienzleForceModelEngine");
      expect(typeof result.canDelete).toBe("boolean");
      expect(Array.isArray(result.blockingDependents)).toBe(true);
      expect(Array.isArray(result.filesToRemove)).toBe(true);
      expect(Array.isArray(result.registriesToUpdate)).toBe(true);
      expect(Array.isArray(result.archiveActions)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it("returns canDelete=false for non-existent engine", async () => {
      const result = await engine.deletePlan("NonExistentEngine12345");

      expect(result.canDelete).toBe(false);
      expect(result.reason).toContain("not found");
    });

    it("blocks deletion with dependents", async () => {
      const result = await engine.deletePlan("KienzleForceModelEngine");

      if (result.blockingDependents.length > 0) {
        expect(result.canDelete).toBe(false);
        expect(result.reason).toContain("dependents");
      }
    });

    it("lists files to remove when canDelete is true", async () => {
      const result = await engine.deletePlan("SomeOrphanedEngine");

      if (result.canDelete) {
        expect(result.filesToRemove.length).toBeGreaterThan(0);
        expect(result.filesToRemove.some((f) => f.includes("engines/"))).toBe(true);
      }
    });

    it("lists registries to update", async () => {
      const result = await engine.deletePlan("KienzleForceModelEngine");

      if (result.canDelete) {
        expect(result.registriesToUpdate.length).toBeGreaterThan(0);
        expect(result.registriesToUpdate.some((r) => r.includes("cross-session-asset-registry"))).toBe(true);
      }
    });

    it("includes archive actions", async () => {
      const result = await engine.deletePlan("KienzleForceModelEngine");

      if (result.canDelete) {
        expect(result.archiveActions.length).toBeGreaterThan(0);
        expect(result.archiveActions.some((a) => a.includes("Archive"))).toBe(true);
      }
    });
  });

  describe("integration scenarios", () => {
    it("impact -> rename workflow", async () => {
      const impact = await engine.impactAnalysis("TaylorToolLifeEngine");

      if (impact.exists) {
        const rename = await engine.renamePlan("TaylorToolLifeEngine", "TaylorEquationEngine");

        expect(rename.valid).toBe(true);

        const filesUpdatingDispatchers = rename.filesToUpdate.filter(
          (f) => f.type === "dispatcher"
        );
        expect(filesUpdatingDispatchers.length).toBe(impact.dispatchers.length);
      }
    });

    it("impact -> delete workflow", async () => {
      const impact = await engine.impactAnalysis("TaylorToolLifeEngine");
      const deletePlan = await engine.deletePlan("TaylorToolLifeEngine");

      if (impact.dispatchers.length > 0 || impact.skills.length > 0) {
        expect(deletePlan.canDelete).toBe(false);
      }
    });
  });
});
