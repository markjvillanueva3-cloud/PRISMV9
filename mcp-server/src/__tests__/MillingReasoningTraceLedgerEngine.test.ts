import { describe, it, expect, beforeEach } from "vitest";
import {
  MillingReasoningTraceLedgerEngine,
  type MillingTraceEntry,
  type MillingReasoningStep,
} from "../engines/MillingReasoningTraceLedgerEngine.js";

describe("MillingReasoningTraceLedgerEngine", () => {
  let engine: MillingReasoningTraceLedgerEngine;

  beforeEach(() => {
    engine = new MillingReasoningTraceLedgerEngine();
    engine.resetForTests();
  });

  describe("recordTraceSync", () => {
    it("should record a basic trace and return success", () => {
      const result = engine.recordTraceSync({
        dispatcher: "calcDispatcher",
        action: "cutting_force",
        keywords: ["milling", "force", "d2"],
        awareness_used: true,
      });

      expect(result.ok).toBe(true);
      expect(result.entry).toBeDefined();
      expect(result.entry?.id).toMatch(/^mrt-/);
      expect(result.entry?.schemaVersion).toBe(1);
      expect(result.entry?.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("should record trace with reasoning steps", () => {
      const steps: MillingReasoningStep[] = [
        {
          step_number: 1,
          question: "What is the material?",
          reasoning: "D2 tool steel, hardened",
          evidence_sources: ["tribal-001", "physics-kienzle"],
          conclusion: "Use reduced feeds",
          confidence: 0.9,
        },
        {
          step_number: 2,
          question: "What cutting parameters?",
          reasoning: "Apply Kienzle model with D2 coefficients",
          evidence_sources: ["physics-kienzle"],
          conclusion: "Fc = 1250N",
          confidence: 0.85,
        },
      ];

      const result = engine.recordTraceSync({
        dispatcher: "calcDispatcher",
        action: "cutting_force",
        keywords: ["milling", "force"],
        awareness_used: true,
        reasoning_steps: steps,
        confidence: 0.87,
        physics_validated: true,
      });

      expect(result.ok).toBe(true);
      expect(result.entry?.reasoning_steps?.length).toBe(2);
      expect(result.entry?.confidence).toBe(0.87);
    });

    it("should reject invalid entries", () => {
      const result = engine.recordTraceSync({
        dispatcher: "",
        action: "cutting_force",
        keywords: ["test"],
        awareness_used: true,
      });

      expect(result.ok).toBe(false);
      expect(result.errors).toContain("dispatcher required");
    });

    it("should reject confidence out of range", () => {
      const result = engine.recordTraceSync({
        dispatcher: "calcDispatcher",
        action: "cutting_force",
        keywords: ["test"],
        awareness_used: true,
        confidence: 1.5,
      });

      expect(result.ok).toBe(false);
      expect(result.errors).toContain("confidence must be in [0,1]");
    });
  });

  describe("queryByAction", () => {
    it("should return traces for specific action", () => {
      engine.recordTraceSync({
        dispatcher: "calcDispatcher",
        action: "cutting_force",
        keywords: ["milling"],
        awareness_used: true,
      });
      engine.recordTraceSync({
        dispatcher: "calcDispatcher",
        action: "tool_life",
        keywords: ["milling"],
        awareness_used: true,
      });
      engine.recordTraceSync({
        dispatcher: "calcDispatcher",
        action: "cutting_force",
        keywords: ["milling"],
        awareness_used: false,
      });

      const results = engine.queryByAction("cutting_force");
      expect(results.length).toBe(2);
      expect(results.every((r) => r.action === "cutting_force")).toBe(true);
    });
  });

  describe("queryWithReasoning", () => {
    it("should return only traces with reasoning steps", () => {
      engine.recordTraceSync({
        dispatcher: "calcDispatcher",
        action: "cutting_force",
        keywords: ["milling"],
        awareness_used: true,
      });
      engine.recordTraceSync({
        dispatcher: "calcDispatcher",
        action: "tool_life",
        keywords: ["milling"],
        awareness_used: true,
        reasoning_steps: [
          {
            step_number: 1,
            question: "test",
            reasoning: "test",
            evidence_sources: [],
            conclusion: "test",
            confidence: 0.8,
          },
        ],
      });

      const results = engine.queryWithReasoning();
      expect(results.length).toBe(1);
      expect(results[0].action).toBe("tool_life");
    });
  });

  describe("getStats", () => {
    it("should calculate stats including reasoning coverage", () => {
      engine.recordTraceSync({
        dispatcher: "calcDispatcher",
        action: "cutting_force",
        keywords: ["milling"],
        awareness_used: true,
        reasoning_steps: [
          {
            step_number: 1,
            question: "test",
            reasoning: "test",
            evidence_sources: [],
            conclusion: "test",
            confidence: 0.8,
          },
        ],
      });
      engine.recordTraceSync({
        dispatcher: "calcDispatcher",
        action: "tool_life",
        keywords: ["milling"],
        awareness_used: false,
      });

      const stats = engine.getStats();
      expect(stats.totalTraces).toBe(2);
      expect(stats.awarenessAdoption).toBe(50);
      expect(stats.reasoningCoverage).toBe(50);
    });

    it("should track top actions", () => {
      for (let i = 0; i < 5; i++) {
        engine.recordTraceSync({
          dispatcher: "calcDispatcher",
          action: "cutting_force",
          keywords: ["milling"],
          awareness_used: true,
        });
      }
      for (let i = 0; i < 3; i++) {
        engine.recordTraceSync({
          dispatcher: "calcDispatcher",
          action: "tool_life",
          keywords: ["milling"],
          awareness_used: true,
        });
      }

      const stats = engine.getStats();
      expect(stats.topActions[0].action).toBe("cutting_force");
      expect(stats.topActions[0].count).toBe(5);
      expect(stats.topActions[1].action).toBe("tool_life");
      expect(stats.topActions[1].count).toBe(3);
    });
  });

  describe("ring buffer", () => {
    it("should limit size to TRACE_RING_SIZE", () => {
      for (let i = 0; i < 1100; i++) {
        engine.recordTraceSync({
          dispatcher: "calcDispatcher",
          action: "cutting_force",
          keywords: ["test"],
          awareness_used: true,
        });
      }

      const recent = engine.getRecent(2000);
      expect(recent.length).toBe(1000);
    });
  });
});
