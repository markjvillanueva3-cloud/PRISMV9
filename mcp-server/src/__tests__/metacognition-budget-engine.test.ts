/**
 * Tests for MetacognitionBudgetEngine (Phase 0.16 U-OP15)
 */

import { describe, it, expect } from "vitest";
import {
  MetacognitionBudgetEngine,
  DEFAULT_CONFIG,
  metacognitionBudgetEngine,
} from "../engines/MetacognitionBudgetEngine.js";

describe("MetacognitionBudgetEngine", () => {
  describe("construction", () => {
    it("uses DEFAULT_CONFIG when none supplied", () => {
      const e = new MetacognitionBudgetEngine();
      expect(e.snapshot().config).toEqual(DEFAULT_CONFIG);
    });

    it("rejects invalid config", () => {
      expect(() => new MetacognitionBudgetEngine({ maxPerTurn: 0, postToolSpacing: 15, stackDepthCap: 1 })).toThrow(/maxPerTurn/);
      expect(() => new MetacognitionBudgetEngine({ maxPerTurn: 3, postToolSpacing: 0, stackDepthCap: 1 })).toThrow(/postToolSpacing/);
      expect(() => new MetacognitionBudgetEngine({ maxPerTurn: 3, postToolSpacing: 15, stackDepthCap: -1 })).toThrow(/stackDepthCap/);
      expect(() => new MetacognitionBudgetEngine({ maxPerTurn: 1.5, postToolSpacing: 15, stackDepthCap: 1 })).toThrow();
    });
  });

  describe("startTurn()", () => {
    it("requires a non-empty turnId", () => {
      const e = new MetacognitionBudgetEngine();
      expect(() => e.startTurn("")).toThrow(/non-empty/);
    });

    it("resets counters on each turn", () => {
      const e = new MetacognitionBudgetEngine();
      e.startTurn("t1");
      e.tryInvoke();
      e.startTurn("t2");
      const snap = e.snapshot();
      expect(snap.invocationsThisTurn).toBe(0);
      expect(snap.stackDepth).toBe(0);
      expect(snap.turnId).toBe("t2");
    });
  });

  describe("tryInvoke() — before turn starts", () => {
    it("denies invocation when no turn is active", () => {
      const e = new MetacognitionBudgetEngine();
      const r = e.tryInvoke();
      expect(r.allowed).toBe(false);
      expect(r.reason).toMatch(/no turn/);
    });
  });

  describe("tryInvoke() — spacing", () => {
    const e = new MetacognitionBudgetEngine({ maxPerTurn: 10, postToolSpacing: 3, stackDepthCap: 1 });
    e.startTurn("t1");

    it("allows the first call immediately after startTurn", () => {
      expect(e.tryInvoke().allowed).toBe(true);
    });

    it("denies the next call until the spacing is met", () => {
      expect(e.tryInvoke().allowed).toBe(false);
      e.observePostTool();
      expect(e.tryInvoke().allowed).toBe(false);
      e.observePostTool();
      expect(e.tryInvoke().allowed).toBe(false);
      e.observePostTool();
      expect(e.tryInvoke().allowed).toBe(true);
    });
  });

  describe("tryInvoke() — per-turn cap", () => {
    it("caps invocations at maxPerTurn regardless of spacing", () => {
      const e = new MetacognitionBudgetEngine({ maxPerTurn: 2, postToolSpacing: 1, stackDepthCap: 1 });
      e.startTurn("t1");
      expect(e.tryInvoke().allowed).toBe(true);
      e.observePostTool();
      expect(e.tryInvoke().allowed).toBe(true);
      e.observePostTool();
      const r = e.tryInvoke();
      expect(r.allowed).toBe(false);
      expect(r.reason).toMatch(/per-turn cap/);
      expect(r.remainingThisTurn).toBe(0);
    });

    it("reports remainingThisTurn accurately on allowed calls", () => {
      const e = new MetacognitionBudgetEngine({ maxPerTurn: 3, postToolSpacing: 1, stackDepthCap: 1 });
      e.startTurn("t1");
      expect(e.tryInvoke().remainingThisTurn).toBe(2);
      e.observePostTool();
      expect(e.tryInvoke().remainingThisTurn).toBe(1);
      e.observePostTool();
      expect(e.tryInvoke().remainingThisTurn).toBe(0);
    });
  });

  describe("tryInvoke() — stack depth cap", () => {
    it("blocks self-triggered calls once the depth cap is reached", () => {
      const e = new MetacognitionBudgetEngine({ maxPerTurn: 10, postToolSpacing: 1, stackDepthCap: 1 });
      e.startTurn("t1");
      e.tryInvoke(true); // depth 1
      e.observePostTool();
      const r = e.tryInvoke(true); // would be depth 2 → blocked
      expect(r.allowed).toBe(false);
      expect(r.reason).toMatch(/stack depth/);
    });

    it("completeInvoke decrements stack depth so next self call is allowed", () => {
      const e = new MetacognitionBudgetEngine({ maxPerTurn: 10, postToolSpacing: 1, stackDepthCap: 1 });
      e.startTurn("t1");
      e.tryInvoke(true);
      e.completeInvoke(true);
      e.observePostTool();
      expect(e.tryInvoke(true).allowed).toBe(true);
    });

    it("non-self calls are not subject to the depth cap", () => {
      const e = new MetacognitionBudgetEngine({ maxPerTurn: 10, postToolSpacing: 1, stackDepthCap: 1 });
      e.startTurn("t1");
      e.tryInvoke(true); // depth 1
      e.observePostTool();
      expect(e.tryInvoke(false).allowed).toBe(true);
    });

    it("stackDepthCap=0 blocks all self calls", () => {
      const e = new MetacognitionBudgetEngine({ maxPerTurn: 10, postToolSpacing: 1, stackDepthCap: 0 });
      e.startTurn("t1");
      const r = e.tryInvoke(true);
      expect(r.allowed).toBe(false);
      expect(r.reason).toMatch(/stack depth/);
    });
  });

  describe("completeInvoke()", () => {
    it("does not drop below zero", () => {
      const e = new MetacognitionBudgetEngine();
      e.startTurn("t1");
      e.completeInvoke(true);
      e.completeInvoke(true);
      expect(e.snapshot().stackDepth).toBe(0);
    });
  });

  describe("snapshot()", () => {
    it("returns the current counters and config", () => {
      const e = new MetacognitionBudgetEngine({ maxPerTurn: 5, postToolSpacing: 2, stackDepthCap: 1 });
      e.startTurn("t1");
      e.tryInvoke();
      const s = e.snapshot();
      expect(s.turnId).toBe("t1");
      expect(s.invocationsThisTurn).toBe(1);
      expect(s.config.maxPerTurn).toBe(5);
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      expect(metacognitionBudgetEngine).toBeInstanceOf(MetacognitionBudgetEngine);
    });
  });
});
