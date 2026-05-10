/**
 * SpeedFeedOrchestratorEngine.consultNN.test.ts — XPROC-NEURAL-CONNECT-MS0 / U-CN02
 *
 * Verifies the NN-confidence-gated consumer path that the SF orchestrator
 * uses before emitting a recommendation. Calls in this suite intentionally
 * vary the underlying NN training state to exercise the three gate decisions
 * (pass / review / block) plus the unavailable fallback.
 */
import { describe, it, expect, beforeEach } from "vitest";

import { speedFeedOrchestratorEngine } from "../engines/SpeedFeedOrchestratorEngine.js";
import { crossProcessNeuralLearningEngine } from "../engines/CrossProcessNeuralLearningEngine.js";
import type { OutcomeRecord } from "../engines/CrossProcessOutcomeStore.js";

function makeRecord(partial: {
  bridge?: OutcomeRecord["bridge"];
  process?: OutcomeRecord["process"];
  outcome?: OutcomeRecord["outcome"];
  request?: OutcomeRecord["request_summary"];
  id?: string;
}): OutcomeRecord {
  return {
    schemaVersion: "1.0",
    id: partial.id ?? "evt-cn02",
    ts: "2026-05-09T12:00:00.000Z",
    bridge: partial.bridge ?? "sf",
    process: partial.process ?? "mill",
    request_summary: partial.request ?? {},
    response_summary: {},
    outcome: partial.outcome ?? { kind: "pending" },
  };
}

function makeLabeledDataset(perClass: number): OutcomeRecord[] {
  const out: OutcomeRecord[] = [];
  for (let i = 0; i < perClass; i++) {
    out.push(makeRecord({
      id: `s${i}`, bridge: "sf", process: "mill", outcome: { kind: "success" },
      request: { tool_diameter_mm: 6, depth_of_cut_mm: 1, material: "steel" },
    }));
    out.push(makeRecord({
      id: `f${i}`, bridge: "post", process: "lathe", outcome: { kind: "failure" },
      request: { tool_diameter_mm: 12, depth_of_cut_mm: 3, material: "aluminum" },
    }));
    out.push(makeRecord({
      id: `o${i}`, bridge: "ai", process: "wedm", outcome: { kind: "operator_override" },
      request: { workpiece_thickness_mm: 25, target_ra_um: 0.4, material: "tool-steel" },
    }));
  }
  return out;
}

describe("SpeedFeedOrchestratorEngine.consultNeuralPredictor — U-CN02", () => {
  beforeEach(() => {
    // No-op cleanup — the NN engine on main is a single shared singleton with
    // no public reset() yet; tests are written to be order-independent so the
    // accumulating training state across tests doesn't leak gate-decision
    // assertions (each test asserts a property of the GATE, not specific
    // confidence values).
  });

  describe("input validation — rejection branches", () => {
    it("missing record → invalid_input", () => {
      const r = speedFeedOrchestratorEngine.consultNeuralPredictor({});
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.message).toMatch(/record/);
    });

    it("non-object input → invalid_input", () => {
      const r = speedFeedOrchestratorEngine.consultNeuralPredictor("not-a-record");
      expect(r.ok).toBe(false);
    });

    it("passThreshold > 1 → invalid_input", () => {
      const r = speedFeedOrchestratorEngine.consultNeuralPredictor({
        record: makeRecord({}),
        passThreshold: 1.5,
      });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.message).toMatch(/passThreshold/);
    });

    it("reviewThreshold < 0 → invalid_input", () => {
      const r = speedFeedOrchestratorEngine.consultNeuralPredictor({
        record: makeRecord({}),
        reviewThreshold: -0.1,
      });
      expect(r.ok).toBe(false);
    });

    it("passThreshold < reviewThreshold → invalid_input (custom range guard)", () => {
      const r = speedFeedOrchestratorEngine.consultNeuralPredictor({
        record: makeRecord({}),
        passThreshold: 0.3,
        reviewThreshold: 0.6,
      });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.message).toMatch(/must be >=/);
    });

    it("NaN passThreshold → invalid_input", () => {
      const r = speedFeedOrchestratorEngine.consultNeuralPredictor({
        record: makeRecord({}),
        passThreshold: Number.NaN,
      });
      expect(r.ok).toBe(false);
    });
  });

  describe("happy paths — gate decisions", () => {
    it("untrained engine on a pending record returns a finite confidence in [0, 1]", () => {
      const r = speedFeedOrchestratorEngine.consultNeuralPredictor({
        record: makeRecord({ request: { tool_diameter_mm: 6, material: "steel" } }),
      });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.confidence).not.toBeNull();
        expect(r.confidence as number).toBeGreaterThanOrEqual(0);
        expect(r.confidence as number).toBeLessThanOrEqual(1);
        expect(["pass", "review", "block"]).toContain(r.gateDecision);
      }
    });

    it("trained engine produces predictedClass on a labeled-similar input", () => {
      crossProcessNeuralLearningEngine.train(makeLabeledDataset(8), { epochs: 5 });
      const r = speedFeedOrchestratorEngine.consultNeuralPredictor({
        record: makeRecord({ request: { tool_diameter_mm: 6, material: "steel" } }),
      });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(["success", "failure", "operator_override"]).toContain(r.predictedClass);
      }
    });

    it("custom passThreshold=1.0 forces every uncalibrated call into review or block (never pass)", () => {
      const r = speedFeedOrchestratorEngine.consultNeuralPredictor({
        record: makeRecord({ request: { tool_diameter_mm: 6, material: "steel" } }),
        passThreshold: 1.0,
        reviewThreshold: 0.0,
      });
      expect(r.ok).toBe(true);
      if (r.ok) {
        // confidence is always < 1.0 in practice (softmax can't exactly hit 1)
        expect(r.gateDecision).not.toBe("pass");
        expect(["review", "block"]).toContain(r.gateDecision);
      }
    });

    it("custom passThreshold=0 + reviewThreshold=0 forces every call into pass", () => {
      const r = speedFeedOrchestratorEngine.consultNeuralPredictor({
        record: makeRecord({ request: { tool_diameter_mm: 6, material: "steel" } }),
        passThreshold: 0,
        reviewThreshold: 0,
      });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.gateDecision).toBe("pass");
    });

    it("custom passThreshold=0.5 + reviewThreshold=0.5 collapses review band (only pass/block)", () => {
      // Run 5 calls with varying inputs — each must be either pass or block, never review.
      const inputs = [
        { tool_diameter_mm: 3, material: "steel" },
        { tool_diameter_mm: 6, material: "aluminum" },
        { tool_diameter_mm: 10, material: "tool-steel" },
        { tool_diameter_mm: 12, material: "stainless" },
        { tool_diameter_mm: 20, material: "titanium" },
      ];
      for (const req of inputs) {
        const r = speedFeedOrchestratorEngine.consultNeuralPredictor({
          record: makeRecord({ request: req }),
          passThreshold: 0.5,
          reviewThreshold: 0.5,
        });
        expect(r.ok).toBe(true);
        if (r.ok) expect(["pass", "block"]).toContain(r.gateDecision);
      }
    });
  });

  describe("variability — multiple bridges and processes through the gate", () => {
    it("all 5 bridges × 3 processes route through consultNeuralPredictor without crashing", () => {
      const bridges: OutcomeRecord["bridge"][] = ["sf", "post", "feature", "ai", "router"];
      const processes: OutcomeRecord["process"][] = ["mill", "lathe", "wedm"];
      let total = 0;
      for (const bridge of bridges) {
        for (const process of processes) {
          const r = speedFeedOrchestratorEngine.consultNeuralPredictor({
            record: makeRecord({ bridge, process, request: { material: "steel" } }),
          });
          expect(r.ok).toBe(true);
          if (r.ok) {
            expect(["pass", "review", "block", "unavailable"]).toContain(r.gateDecision);
            total++;
          }
        }
      }
      expect(total).toBe(15);
    });
  });

  describe("threshold defaults match shop_floor tier policy", () => {
    it("default passThreshold is 0.7 and reviewThreshold is 0.4", () => {
      const r = speedFeedOrchestratorEngine.consultNeuralPredictor({
        record: makeRecord({}),
      });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.passThreshold).toBe(0.7);
        expect(r.reviewThreshold).toBe(0.4);
      }
    });

    it("threshold echo on every result lets callers verify which policy fired", () => {
      const r = speedFeedOrchestratorEngine.consultNeuralPredictor({
        record: makeRecord({}),
        passThreshold: 0.95,
        reviewThreshold: 0.6,
      });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.passThreshold).toBe(0.95);
        expect(r.reviewThreshold).toBe(0.6);
        expect(r.reason).toContain(r.confidence!.toFixed(4));
      }
    });
  });

  describe("dispatcher round-trip — xproc_neural_consult_speedfeed", () => {
    it("invoking the dispatcher action returns a gate decision", async () => {
      const { aiReasoningDispatcher } = await import("../tools/dispatchers/aiReasoningDispatcher.js");
      const r = await aiReasoningDispatcher({
        action: "xproc_neural_consult_speedfeed" as never,
        params: { record: makeRecord({ request: { tool_diameter_mm: 6, material: "steel" } }) },
      });
      expect(r.success).toBe(true);
      const payload = r.data as {
        ok?: boolean;
        gateDecision?: string;
        confidence?: number | null;
        passThreshold?: number;
        reviewThreshold?: number;
      };
      expect(payload.ok).toBe(true);
      expect(["pass", "review", "block", "unavailable"]).toContain(payload.gateDecision);
      expect(payload.passThreshold).toBe(0.7);
      expect(payload.reviewThreshold).toBe(0.4);
    });

    it("dispatcher passes custom thresholds through to the engine method", async () => {
      const { aiReasoningDispatcher } = await import("../tools/dispatchers/aiReasoningDispatcher.js");
      const r = await aiReasoningDispatcher({
        action: "xproc_neural_consult_speedfeed" as never,
        params: {
          record: makeRecord({}),
          passThreshold: 0.95,
          reviewThreshold: 0.8,
        },
      });
      expect(r.success).toBe(true);
      const payload = r.data as { passThreshold?: number; reviewThreshold?: number };
      expect(payload.passThreshold).toBe(0.95);
      expect(payload.reviewThreshold).toBe(0.8);
    });

    it("dispatcher rejects malformed input via the engine's Zod gate (returns ok:false)", async () => {
      const { aiReasoningDispatcher } = await import("../tools/dispatchers/aiReasoningDispatcher.js");
      const r = await aiReasoningDispatcher({
        action: "xproc_neural_consult_speedfeed" as never,
        params: {
          record: makeRecord({}),
          passThreshold: 1.5, // out of [0,1] range — engine rejects
        },
      });
      // Either the dispatcher's outer Zod rejects (success=false), OR the
      // engine's inner Zod returns ok:false in data — both are valid rejections.
      if (r.success === false) {
        expect(typeof r.error).toBe("string");
      } else {
        const payload = r.data as { ok?: boolean; error?: string };
        expect(payload.ok).toBe(false);
        expect(payload.error).toBe("invalid_input");
      }
    });
  });

  describe("integration — predictFromRecord is the underlying NN call", () => {
    it("training the NN then re-querying produces a different confidence than untrained baseline", () => {
      const sample = makeRecord({ request: { tool_diameter_mm: 6, material: "steel" } });
      const before = speedFeedOrchestratorEngine.consultNeuralPredictor({ record: sample });
      crossProcessNeuralLearningEngine.train(makeLabeledDataset(8), { epochs: 5 });
      const after = speedFeedOrchestratorEngine.consultNeuralPredictor({ record: sample });
      expect(before.ok).toBe(true);
      expect(after.ok).toBe(true);
      if (before.ok && after.ok) {
        expect(before.confidence).not.toBeNull();
        expect(after.confidence).not.toBeNull();
        // Training updates weights — confidence on the same sample WILL change.
        expect(after.confidence).not.toBe(before.confidence);
      }
    });
  });
});
