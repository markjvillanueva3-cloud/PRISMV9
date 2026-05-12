/**
 * PPActiveLearningQueueEngine Tests — PP-DL-MS6
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  PPActiveLearningQueueEngine,
} from "../engines/PPActiveLearningQueueEngine.js";
import { ppControllerEmbeddingEngine } from "../engines/PPControllerEmbeddingEngine.js";
import { ppMachineVectorEncoderEngine } from "../engines/PPMachineVectorEncoderEngine.js";
import { ppMaterialPropertyVectorEngine } from "../engines/PPMaterialPropertyVectorEngine.js";

function validScenario() {
  const c = ppControllerEmbeddingEngine.embedAll();
  const m = ppMachineVectorEncoderEngine.embedAll();
  const mat = ppMaterialPropertyVectorEngine.embedAll();
  if (!c.length || !m.length || !mat.length) return null;
  return { controller_id: c[0].controller_id, machine_id: m[0].machine_id, material_id: mat[0].material_id };
}

const unknownScenario = {
  controller_id: "unknown_ctrl_xyz",
  machine_id: "unknown_machine_xyz",
  material_id: "unknown_material_xyz",
};

describe("PPActiveLearningQueueEngine", () => {
  let engine: PPActiveLearningQueueEngine;

  beforeEach(() => {
    engine = new PPActiveLearningQueueEngine();
  });

  describe("evaluate", () => {
    it("high-uncertainty scenario added to queue", () => {
      const q = engine.evaluate(unknownScenario, { min_uncertainty: 0.2 });
      expect(q).not.toBeNull();
      expect(q!.uncertainty).toBeGreaterThan(0.2);
    });

    it("low-uncertainty scenario filtered out", () => {
      const s = validScenario();
      if (!s) return;
      // Set high threshold so known scenarios are filtered
      const q = engine.evaluate(s, { min_uncertainty: 0.99 });
      expect(q).toBeNull();
    });

    it("assigns priority based on uncertainty", () => {
      const q = engine.evaluate(unknownScenario, { min_uncertainty: 0.1 });
      expect(q).not.toBeNull();
      expect(["critical", "high", "medium", "low"]).toContain(q!.priority);
    });

    it("returns QueuedScenario with required fields", () => {
      const q = engine.evaluate(unknownScenario, { min_uncertainty: 0.1 });
      if (!q) return;
      expect(q.id).toBeDefined();
      expect(q.scenario).toEqual(unknownScenario);
      expect(q.status).toBe("pending");
      expect(q.added_at).toBeGreaterThan(0);
      expect(Array.isArray(q.reasons)).toBe(true);
    });

    it("respects max_queue_size", () => {
      for (let i = 0; i < 5; i++) {
        engine.evaluate({
          controller_id: `u${i}`, machine_id: `u${i}`, material_id: `u${i}`,
        }, { min_uncertainty: 0.1, max_queue_size: 3 });
      }
      expect(engine.getStats().total_queued).toBeLessThanOrEqual(3);
    });
  });

  describe("evaluateBatch", () => {
    it("processes multiple scenarios", () => {
      const batch = [
        { controller_id: "u1", machine_id: "u1", material_id: "u1" },
        { controller_id: "u2", machine_id: "u2", material_id: "u2" },
      ];
      const queued = engine.evaluateBatch(batch, { min_uncertainty: 0.1 });
      expect(queued.length).toBeGreaterThan(0);
    });
  });

  describe("getNext", () => {
    it("returns null on empty queue", () => {
      expect(engine.getNext()).toBeNull();
    });

    it("returns highest-priority pending scenario", () => {
      engine.evaluate(unknownScenario, { min_uncertainty: 0.1 });
      const next = engine.getNext();
      expect(next).not.toBeNull();
      expect(next!.status).toBe("in_review");
    });

    it("marks scenario as in_review", () => {
      engine.evaluate(unknownScenario, { min_uncertainty: 0.1 });
      const next = engine.getNext();
      if (!next) return;
      const fetched = engine.get(next.id);
      expect(fetched?.status).toBe("in_review");
    });
  });

  describe("getPending", () => {
    it("returns sorted list by priority", () => {
      engine.evaluate(unknownScenario, { min_uncertainty: 0.1 });
      engine.evaluate({ controller_id: "u2", machine_id: "u2", material_id: "u2" }, { min_uncertainty: 0.1 });
      const pending = engine.getPending();
      for (let i = 1; i < pending.length; i++) {
        expect(pending[i].priority_score).toBeLessThanOrEqual(pending[i - 1].priority_score);
      }
    });

    it("excludes in_review and labeled", () => {
      const q = engine.evaluate(unknownScenario, { min_uncertainty: 0.1 });
      if (!q) return;
      engine.getNext(); // moves to in_review
      const pending = engine.getPending();
      expect(pending.every(p => p.status === "pending")).toBe(true);
    });
  });

  describe("label", () => {
    it("applies expert label to scenario", () => {
      const q = engine.evaluate(unknownScenario, { min_uncertainty: 0.1 });
      if (!q) return;
      const success = engine.label(q.id, {
        ground_truth: { correct_controller_dialect: "fanuc_31i", safe_to_proceed: true },
        confidence: 0.95,
      });
      expect(success).toBe(true);
      const labeled = engine.get(q.id);
      expect(labeled?.status).toBe("labeled");
      expect(labeled?.label).toBeDefined();
      expect(labeled?.label?.ground_truth.correct_controller_dialect).toBe("fanuc_31i");
    });

    it("returns false for unknown ID", () => {
      expect(engine.label("nonexistent", {
        ground_truth: {}, confidence: 0,
      })).toBe(false);
    });

    it("label has timestamp", () => {
      const q = engine.evaluate(unknownScenario, { min_uncertainty: 0.1 });
      if (!q) return;
      engine.label(q.id, { ground_truth: {}, confidence: 1 });
      const labeled = engine.get(q.id);
      expect(labeled?.label?.labeled_at).toBeGreaterThan(0);
    });
  });

  describe("reject", () => {
    it("marks scenario as rejected", () => {
      const q = engine.evaluate(unknownScenario, { min_uncertainty: 0.1 });
      if (!q) return;
      expect(engine.reject(q.id, "duplicate")).toBe(true);
      expect(engine.get(q.id)?.status).toBe("rejected");
    });

    it("appends reason to reasons array", () => {
      const q = engine.evaluate(unknownScenario, { min_uncertainty: 0.1 });
      if (!q) return;
      engine.reject(q.id, "out of scope");
      const rejected = engine.get(q.id);
      expect(rejected?.reasons.some(r => r.includes("out of scope"))).toBe(true);
    });
  });

  describe("getLabeled", () => {
    it("returns only labeled scenarios", () => {
      const q1 = engine.evaluate(unknownScenario, { min_uncertainty: 0.1 });
      const q2 = engine.evaluate({ controller_id: "u2", machine_id: "u2", material_id: "u2" }, { min_uncertainty: 0.1 });
      if (q1) engine.label(q1.id, { ground_truth: {}, confidence: 1 });
      const labeled = engine.getLabeled();
      expect(labeled.length).toBe(1);
      expect(labeled[0].id).toBe(q1?.id);
    });
  });

  describe("getStats", () => {
    it("tracks queue state", () => {
      engine.evaluate(unknownScenario, { min_uncertainty: 0.1 });
      const stats = engine.getStats();
      expect(stats.total_queued).toBe(1);
      expect(stats.pending).toBe(1);
      expect(stats.avg_uncertainty).toBeGreaterThan(0);
    });

    it("counts by priority", () => {
      engine.evaluate(unknownScenario, { min_uncertainty: 0.1 });
      const stats = engine.getStats();
      const total = Object.values(stats.by_priority).reduce((s, v) => s + v, 0);
      expect(total).toBe(stats.total_queued);
    });
  });

  describe("clear", () => {
    it("empties the queue", () => {
      engine.evaluate(unknownScenario, { min_uncertainty: 0.1 });
      engine.clear();
      expect(engine.getStats().total_queued).toBe(0);
    });
  });
});
