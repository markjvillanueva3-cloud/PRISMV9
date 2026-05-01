import { describe, it, expect, beforeEach } from "vitest";
import { ConversationBudgetEngine } from "../engines/ConversationBudgetEngine.js";

describe("ConversationBudgetEngine", () => {
  let engine: ConversationBudgetEngine;

  beforeEach(() => {
    engine = new ConversationBudgetEngine(100_000);
  });

  describe("recordToolCall and getStatus", () => {
    it("tracks cumulative usage", () => {
      engine.recordToolCall("Read", 500, 1000);
      engine.recordToolCall("Grep", 200, 300);
      const status = engine.getStatus();
      expect(status.toolCalls).toBe(2);
      expect(status.inputTokens).toBe(700);
      expect(status.outputTokens).toBe(1300);
      expect(status.totalTokens).toBe(2000);
    });

    it("calculates budget percent", () => {
      engine.recordToolCall("Read", 25000, 25000);
      const status = engine.getStatus();
      expect(status.budgetPercent).toBe(50);
      expect(status.remaining).toBe(50000);
    });

    it("tracks largest call", () => {
      engine.recordToolCall("Read", 100, 100);
      engine.recordToolCall("Bash", 500, 2000);
      engine.recordToolCall("Grep", 50, 50);
      expect(engine.getStatus().largestCall.tool).toBe("Bash");
    });
  });

  describe("checkBudget", () => {
    it("returns null under 50%", () => {
      engine.recordToolCall("Read", 10000, 10000);
      expect(engine.checkBudget()).toBeNull();
    });

    it("returns info at 50%", () => {
      engine.recordToolCall("Read", 25000, 25000);
      const alert = engine.checkBudget();
      expect(alert).not.toBeNull();
      expect(alert!.level).toBe("info");
    });

    it("returns warn at 70%", () => {
      engine.recordToolCall("Read", 35000, 35000);
      const alert = engine.checkBudget();
      expect(alert!.level).toBe("warn");
    });

    it("returns critical at 90%", () => {
      engine.recordToolCall("Read", 45000, 45000);
      const alert = engine.checkBudget();
      expect(alert!.level).toBe("critical");
    });
  });

  describe("getTopConsumers", () => {
    it("returns tools sorted by usage", () => {
      engine.recordToolCall("Read", 500, 500);
      engine.recordToolCall("Bash", 2000, 2000);
      engine.recordToolCall("Read", 500, 500);
      const top = engine.getTopConsumers();
      expect(top[0].tool).toBe("Bash");
      expect(top[1].tool).toBe("Read");
    });
  });

  describe("getStatusLine", () => {
    it("returns compact one-liner", () => {
      engine.recordToolCall("Read", 500, 500);
      const line = engine.getStatusLine();
      expect(line).toContain("Tokens:");
      expect(line).toContain("Calls:");
    });
  });

  describe("estimateRemaining", () => {
    it("estimates remaining operations", () => {
      const est = engine.estimateRemaining();
      expect(est.reads).toBeGreaterThan(0);
      expect(est.greps).toBeGreaterThan(0);
      expect(est.edits).toBeGreaterThan(0);
    });
  });

  describe("reset", () => {
    it("clears all tracking", () => {
      engine.recordToolCall("Read", 5000, 5000);
      engine.reset();
      const status = engine.getStatus();
      expect(status.toolCalls).toBe(0);
      expect(status.totalTokens).toBe(0);
    });
  });
});
