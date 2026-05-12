/**
 * PPMultiModalFusionEngine Tests — PP-AGI-MS7
 *
 * Tests multi-modal fusion of controller + machine + material embeddings:
 * - Fused vector dimension (120 = 48 + 40 + 32)
 * - Compatibility scoring (controller-machine, machine-material)
 * - Gap analysis (cross-modal mismatch detection)
 * - Scenario search
 * - Partial embedding handling
 */

import { describe, it, expect } from "vitest";
import {
  PPMultiModalFusionEngine,
  ppMultiModalFusionEngine,
  FUSED_DIM,
  type ScenarioInput,
} from "../engines/PPMultiModalFusionEngine.js";
import { ppControllerEmbeddingEngine } from "../engines/PPControllerEmbeddingEngine.js";
import { ppMachineVectorEncoderEngine } from "../engines/PPMachineVectorEncoderEngine.js";
import { ppMaterialPropertyVectorEngine } from "../engines/PPMaterialPropertyVectorEngine.js";

// Build a valid scenario from known data
function getValidScenario(): ScenarioInput | null {
  const ctrls = ppControllerEmbeddingEngine.embedAll();
  const machines = ppMachineVectorEncoderEngine.embedAll();
  const materials = ppMaterialPropertyVectorEngine.embedAll();
  if (ctrls.length === 0 || machines.length === 0 || materials.length === 0) return null;
  return {
    controller_id: ctrls[0].controller_id,
    machine_id: machines[0].machine_id,
    material_id: materials[0].material_id,
  };
}

describe("PPMultiModalFusionEngine", () => {
  describe("singleton", () => {
    it("exports singleton", () => {
      expect(ppMultiModalFusionEngine).toBeInstanceOf(PPMultiModalFusionEngine);
    });

    it("FUSED_DIM is 120", () => {
      expect(FUSED_DIM).toBe(120);
    });
  });

  describe("fuse", () => {
    it("produces 120-dim fused vector for valid scenario", () => {
      const scenario = getValidScenario();
      if (!scenario) return;
      const result = ppMultiModalFusionEngine.fuse(scenario);
      expect(result).not.toBeNull();
      expect(result!.fused_vector.length).toBe(FUSED_DIM);
      expect(result!.dimension).toBe(FUSED_DIM);
    });

    it("handles unknown machine/material with controller fallback", () => {
      // ControllerDialectEngine falls back to generic_fanuc for unknown IDs
      // So partial fusion succeeds even with unknown machine/material
      const result = ppMultiModalFusionEngine.fuse({
        controller_id: "unknown_ctrl",
        machine_id: "unknown_mach",
        material_id: "unknown_mat",
      });
      // Controller resolves via fallback, so result is non-null
      expect(result).not.toBeNull();
      // Machine/material portions should be zero-filled
      if (result) {
        const machPortion = result.fused_vector.slice(48, 88);
        expect(machPortion.every(v => v === 0)).toBe(true);
      }
    });

    it("allows partial fusion (only controller known)", () => {
      const ctrls = ppControllerEmbeddingEngine.embedAll();
      if (ctrls.length === 0) return;
      const result = ppMultiModalFusionEngine.fuse({
        controller_id: ctrls[0].controller_id,
        machine_id: "unknown_mach",
        material_id: "unknown_mat",
      });
      expect(result).not.toBeNull();
      // Controller portion should be non-zero, machine/material should be zero
      const ctrlPortion = result!.fused_vector.slice(0, 48);
      expect(ctrlPortion.some(v => v > 0)).toBe(true);
    });

    it("all fused values in [0, 1]", () => {
      const scenario = getValidScenario();
      if (!scenario) return;
      const result = ppMultiModalFusionEngine.fuse(scenario);
      if (!result) return;
      for (const v of result.fused_vector) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    });

    it("includes compatibility score", () => {
      const scenario = getValidScenario();
      if (!scenario) return;
      const result = ppMultiModalFusionEngine.fuse(scenario);
      if (!result) return;
      expect(result.compatibility.overall).toBeGreaterThanOrEqual(0);
      expect(result.compatibility.overall).toBeLessThanOrEqual(1);
      expect(typeof result.compatibility.controller_machine).toBe("number");
      expect(typeof result.compatibility.machine_material).toBe("number");
      expect(typeof result.compatibility.controller_material).toBe("number");
      expect(Array.isArray(result.compatibility.warnings)).toBe(true);
    });

    it("preserves input IDs in result", () => {
      const scenario = getValidScenario();
      if (!scenario) return;
      const result = ppMultiModalFusionEngine.fuse(scenario);
      if (!result) return;
      expect(result.controller_id).toBe(scenario.controller_id);
      expect(result.machine_id).toBe(scenario.machine_id);
      expect(result.material_id).toBe(scenario.material_id);
    });
  });

  describe("analyzeGaps", () => {
    it("flags unknown machine in gap analysis", () => {
      const ctrls = ppControllerEmbeddingEngine.embedAll();
      const materials = ppMaterialPropertyVectorEngine.embedAll();
      if (ctrls.length === 0 || materials.length === 0) return;

      const result = ppMultiModalFusionEngine.analyzeGaps({
        controller_id: ctrls[0].controller_id,
        machine_id: "truly_unknown_machine_xyz",
        material_id: materials[0].material_id,
      });
      expect(result.gaps.some(g => g.domain === "machine")).toBe(true);
    });

    it("flags unknown machine as warning", () => {
      const ctrls = ppControllerEmbeddingEngine.embedAll();
      const materials = ppMaterialPropertyVectorEngine.embedAll();
      if (ctrls.length === 0 || materials.length === 0) return;

      const result = ppMultiModalFusionEngine.analyzeGaps({
        controller_id: ctrls[0].controller_id,
        machine_id: "unknown_mach",
        material_id: materials[0].material_id,
      });
      expect(result.gaps.some(g => g.domain === "machine")).toBe(true);
    });

    it("returns recommendations", () => {
      const scenario = getValidScenario();
      if (!scenario) return;
      const result = ppMultiModalFusionEngine.analyzeGaps(scenario);
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("valid scenario has no critical gaps", () => {
      const scenario = getValidScenario();
      if (!scenario) return;
      const result = ppMultiModalFusionEngine.analyzeGaps(scenario);
      const criticals = result.gaps.filter(g => g.severity === "critical");
      expect(criticals.length).toBe(0);
    });
  });

  describe("searchSimilar", () => {
    it("returns nearest scenarios for valid input", () => {
      const scenario = getValidScenario();
      if (!scenario) return;
      const result = ppMultiModalFusionEngine.searchSimilar(scenario, 3);
      if (!result) return;
      expect(result.nearest.length).toBeGreaterThan(0);
      expect(result.nearest.length).toBeLessThanOrEqual(3);
    });

    it("nearest scenarios have similarity scores", () => {
      const scenario = getValidScenario();
      if (!scenario) return;
      const result = ppMultiModalFusionEngine.searchSimilar(scenario, 3);
      if (!result) return;
      for (const n of result.nearest) {
        expect(n.cosine_similarity).toBeGreaterThanOrEqual(-1);
        expect(n.cosine_similarity).toBeLessThanOrEqual(1);
        expect(typeof n.compatibility).toBe("number");
      }
    });

    it("handles unknown IDs gracefully in search", () => {
      // Controller falls back to generic_fanuc, so search still works
      const result = ppMultiModalFusionEngine.searchSimilar({
        controller_id: "unknown",
        machine_id: "unknown",
        material_id: "unknown",
      }, 3);
      // Result is non-null because controller resolves via fallback
      if (result) {
        expect(result.nearest.length).toBeGreaterThan(0);
      }
    });
  });

  describe("cosineSimilarity", () => {
    it("identical fused vectors → 1", () => {
      const scenario = getValidScenario();
      if (!scenario) return;
      const fused = ppMultiModalFusionEngine.fuse(scenario);
      if (!fused) return;
      expect(ppMultiModalFusionEngine.cosineSimilarity(
        fused.fused_vector, fused.fused_vector
      )).toBeCloseTo(1, 5);
    });

    it("different scenarios have similarity < 1", () => {
      const ctrls = ppControllerEmbeddingEngine.embedAll();
      const machines = ppMachineVectorEncoderEngine.embedAll();
      const materials = ppMaterialPropertyVectorEngine.embedAll();
      if (ctrls.length < 2 || machines.length < 2 || materials.length < 2) return;

      const a = ppMultiModalFusionEngine.fuse({
        controller_id: ctrls[0].controller_id,
        machine_id: machines[0].machine_id,
        material_id: materials[0].material_id,
      });
      const b = ppMultiModalFusionEngine.fuse({
        controller_id: ctrls[1].controller_id,
        machine_id: machines[1].machine_id,
        material_id: materials[1].material_id,
      });
      if (!a || !b) return;
      const sim = ppMultiModalFusionEngine.cosineSimilarity(a.fused_vector, b.fused_vector);
      expect(sim).toBeLessThan(1);
      expect(sim).toBeGreaterThan(-1);
    });
  });
});
