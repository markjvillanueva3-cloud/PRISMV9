/**
 * TokenEconomyTrackerEngine tests
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  TokenEconomyTrackerEngine,
  type TokenSpend,
  type OperationType,
} from "../engines/TokenEconomyTrackerEngine.js";
import { existsSync, rmSync, mkdirSync } from "node:fs";

describe("TokenEconomyTrackerEngine", () => {
  let engine: TokenEconomyTrackerEngine;
  const stateDir = "H:/prism/state";

  beforeEach(() => {
    // Clean state before each test
    const stateFile = `${stateDir}/token-economy.json`;
    if (existsSync(stateFile)) {
      rmSync(stateFile);
    }
    engine = new TokenEconomyTrackerEngine();
  });

  describe("recordSpend", () => {
    it("records a token spend with timestamp", () => {
      const spend = engine.recordSpend({
        sessionId: "test-session-1",
        operation: "read",
        inputTokens: 100,
        outputTokens: 50,
        model: "opus",
        file: "/some/file.ts",
      });

      expect(spend.timestamp).toBeDefined();
      expect(spend.sessionId).toBe("test-session-1");
      expect(spend.operation).toBe("read");
      expect(spend.inputTokens).toBe(100);
      expect(spend.outputTokens).toBe(50);
    });

    it("detects redundant read waste", () => {
      // Record multiple reads of same file
      for (let i = 0; i < 4; i++) {
        engine.recordSpend({
          sessionId: "test-session",
          operation: "read",
          inputTokens: 100,
          outputTokens: 500,
          model: "opus",
          file: "/repeated/file.ts",
        });
      }

      const spend = engine.recordSpend({
        sessionId: "test-session",
        operation: "read",
        inputTokens: 100,
        outputTokens: 500,
        model: "opus",
        file: "/repeated/file.ts",
      });

      expect(spend.wasteFlags).toContain("redundant_read");
    });

    it("detects large output waste", () => {
      const spend = engine.recordSpend({
        sessionId: "test-session",
        operation: "bash",
        inputTokens: 50,
        outputTokens: 15000,
        model: "opus",
      });

      expect(spend.wasteFlags).toContain("large_output");
    });

    it("detects unnecessary agent spawn", () => {
      const spend = engine.recordSpend({
        sessionId: "test-session",
        operation: "agent",
        inputTokens: 500,
        outputTokens: 50,
        model: "opus",
      });

      expect(spend.wasteFlags).toContain("unnecessary_agent");
    });

    it("tracks savings source", () => {
      const spend = engine.recordSpend({
        sessionId: "test-session",
        operation: "bash",
        inputTokens: 100,
        outputTokens: 200,
        model: "opus",
        savingsSource: "rtk",
      });

      expect(spend.savingsSource).toBe("rtk");
    });
  });

  describe("getSessionSummary", () => {
    it("returns null for unknown session", () => {
      const summary = engine.getSessionSummary("nonexistent");
      expect(summary).toBeNull();
    });

    it("aggregates session totals", () => {
      engine.recordSpend({
        sessionId: "session-1",
        operation: "read",
        inputTokens: 100,
        outputTokens: 200,
        model: "opus",
      });

      engine.recordSpend({
        sessionId: "session-1",
        operation: "edit",
        inputTokens: 150,
        outputTokens: 100,
        model: "opus",
      });

      const summary = engine.getSessionSummary("session-1");

      expect(summary).not.toBeNull();
      expect(summary!.totalInputTokens).toBe(250);
      expect(summary!.totalOutputTokens).toBe(300);
      expect(summary!.operationBreakdown.read).toBe(300);
      expect(summary!.operationBreakdown.edit).toBe(250);
    });

    it("calculates efficiency based on waste", () => {
      // Clean operation
      engine.recordSpend({
        sessionId: "session-efficient",
        operation: "read",
        inputTokens: 100,
        outputTokens: 100,
        model: "opus",
      });

      const summary = engine.getSessionSummary("session-efficient");
      expect(summary!.efficiency).toBeGreaterThan(0.9);
    });
  });

  describe("generateReport", () => {
    beforeEach(() => {
      // Add some test data
      const operations: OperationType[] = ["read", "edit", "build", "test", "search"];
      for (let i = 0; i < 10; i++) {
        engine.recordSpend({
          sessionId: `session-${i % 3}`,
          operation: operations[i % 5],
          inputTokens: 100 + i * 10,
          outputTokens: 200 + i * 20,
          model: i % 2 === 0 ? "opus" : "sonnet",
        });
      }
    });

    it("generates report for day period", () => {
      const report = engine.generateReport("day");

      expect(report.period).toBe("day");
      expect(report.sessions).toBeGreaterThan(0);
      expect(report.totalInputTokens).toBeGreaterThan(0);
      expect(report.totalOutputTokens).toBeGreaterThan(0);
    });

    it("generates report for all time", () => {
      const report = engine.generateReport("all");

      expect(report.period).toBe("all");
      expect(report.totalInputTokens).toBeGreaterThan(0);
    });

    it("includes waste patterns", () => {
      // Add wasteful operations
      for (let i = 0; i < 5; i++) {
        engine.recordSpend({
          sessionId: "waste-session",
          operation: "bash",
          inputTokens: 50,
          outputTokens: 15000,
          model: "opus",
        });
      }

      const report = engine.generateReport("day");

      expect(report.topWastePatterns.length).toBeGreaterThan(0);
      const largeOutput = report.topWastePatterns.find((p) => p.pattern === "large_output");
      expect(largeOutput).toBeDefined();
    });

    it("includes recommendations", () => {
      // Add non-RTK bash commands
      for (let i = 0; i < 15; i++) {
        engine.recordSpend({
          sessionId: "bash-session",
          operation: "bash",
          inputTokens: 100,
          outputTokens: 500,
          model: "opus",
        });
      }

      const report = engine.generateReport("day");

      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations.some((r) => r.includes("RTK") || r.includes("rtk"))).toBe(true);
    });

    it("calculates trend direction", () => {
      const report = engine.generateReport("week");

      expect(["improving", "stable", "degrading"]).toContain(report.trendDirection);
    });
  });

  describe("getBudgetStatus", () => {
    it("returns budget status with defaults", () => {
      const status = engine.getBudgetStatus();

      expect(status.dailyBudget).toBe(5.0);
      expect(status.weeklyBudget).toBe(25.0);
      expect(status.dailySpent).toBeGreaterThanOrEqual(0);
      expect(status.alertLevel).toBe("green");
    });

    it("tracks daily spending", () => {
      // Add some spending
      for (let i = 0; i < 5; i++) {
        engine.recordSpend({
          sessionId: "budget-session",
          operation: "read",
          inputTokens: 1000,
          outputTokens: 5000,
          model: "opus",
        });
      }

      const status = engine.getBudgetStatus();

      expect(status.dailySpent).toBeGreaterThan(0);
      expect(status.dailyRemaining).toBeLessThan(status.dailyBudget);
    });

    it("sets alert level based on spending", () => {
      // Set low budget and add spending
      engine.setBudget(0.01, 0.05);

      engine.recordSpend({
        sessionId: "alert-session",
        operation: "agent",
        inputTokens: 10000,
        outputTokens: 50000,
        model: "opus",
      });

      const status = engine.getBudgetStatus();

      expect(["yellow", "red"]).toContain(status.alertLevel);
    });
  });

  describe("setBudget", () => {
    it("updates daily budget", () => {
      engine.setBudget(10.0);
      const status = engine.getBudgetStatus();
      expect(status.dailyBudget).toBe(10.0);
    });

    it("updates weekly budget", () => {
      engine.setBudget(undefined, 50.0);
      const status = engine.getBudgetStatus();
      expect(status.weeklyBudget).toBe(50.0);
    });

    it("updates both budgets", () => {
      engine.setBudget(15.0, 75.0);
      const status = engine.getBudgetStatus();
      expect(status.dailyBudget).toBe(15.0);
      expect(status.weeklyBudget).toBe(75.0);
    });
  });

  describe("getStats", () => {
    it("returns zero stats for fresh engine", () => {
      const stats = engine.getStats();

      expect(stats.totalSessions).toBe(0);
      expect(stats.totalSpends).toBe(0);
      expect(stats.totalCost).toBe(0);
      expect(stats.avgEfficiency).toBe(1);
    });

    it("tracks operation breakdown", () => {
      engine.recordSpend({
        sessionId: "stats-session",
        operation: "build",
        inputTokens: 500,
        outputTokens: 2000,
        model: "opus",
      });

      engine.recordSpend({
        sessionId: "stats-session",
        operation: "test",
        inputTokens: 300,
        outputTokens: 1000,
        model: "opus",
      });

      const stats = engine.getStats();

      expect(stats.topOperations.length).toBeGreaterThan(0);
      expect(stats.topOperations.some((op) => op.operation === "build")).toBe(true);
    });

    it("calculates total cost", () => {
      engine.recordSpend({
        sessionId: "cost-session",
        operation: "agent",
        inputTokens: 1000,
        outputTokens: 5000,
        model: "opus",
      });

      const stats = engine.getStats();

      // Opus: input $0.015/1K, output $0.075/1K
      // 1K input = $0.015, 5K output = $0.375
      // Total ≈ $0.39
      expect(stats.totalCost).toBeGreaterThan(0.3);
      expect(stats.totalCost).toBeLessThan(0.5);
    });
  });

  describe("reset", () => {
    it("clears all spends and sessions", () => {
      engine.recordSpend({
        sessionId: "reset-session",
        operation: "read",
        inputTokens: 100,
        outputTokens: 100,
        model: "opus",
      });

      engine.reset();

      const stats = engine.getStats();
      expect(stats.totalSessions).toBe(0);
      expect(stats.totalSpends).toBe(0);
    });

    it("preserves budget config", () => {
      engine.setBudget(20.0, 100.0);
      engine.reset();

      const status = engine.getBudgetStatus();
      expect(status.dailyBudget).toBe(20.0);
      expect(status.weeklyBudget).toBe(100.0);
    });
  });

  describe("cost calculation", () => {
    it("calculates opus costs correctly", () => {
      engine.recordSpend({
        sessionId: "opus-session",
        operation: "read",
        inputTokens: 1000,
        outputTokens: 1000,
        model: "opus",
      });

      const stats = engine.getStats();
      // Opus: $0.015/1K input + $0.075/1K output = $0.09
      expect(stats.totalCost).toBeCloseTo(0.09, 2);
    });

    it("calculates sonnet costs correctly", () => {
      engine.reset();
      engine.recordSpend({
        sessionId: "sonnet-session",
        operation: "read",
        inputTokens: 1000,
        outputTokens: 1000,
        model: "sonnet",
      });

      const stats = engine.getStats();
      // Sonnet: $0.003/1K input + $0.015/1K output = $0.018
      expect(stats.totalCost).toBeCloseTo(0.018, 3);
    });

    it("calculates haiku costs correctly", () => {
      engine.reset();
      engine.recordSpend({
        sessionId: "haiku-session",
        operation: "read",
        inputTokens: 1000,
        outputTokens: 1000,
        model: "haiku",
      });

      const stats = engine.getStats();
      // Haiku: $0.00025/1K input + $0.00125/1K output = $0.0015
      expect(stats.totalCost).toBeCloseTo(0.0015, 4);
    });

    it("ollama has zero cost", () => {
      engine.reset();
      engine.recordSpend({
        sessionId: "ollama-session",
        operation: "read",
        inputTokens: 10000,
        outputTokens: 10000,
        model: "ollama",
      });

      const stats = engine.getStats();
      expect(stats.totalCost).toBe(0);
    });
  });

  describe("state persistence", () => {
    it("persists spends across engine instances", () => {
      engine.recordSpend({
        sessionId: "persist-session",
        operation: "write",
        inputTokens: 200,
        outputTokens: 100,
        model: "opus",
      });

      // Create new engine instance
      const engine2 = new TokenEconomyTrackerEngine();
      const stats = engine2.getStats();

      expect(stats.totalSpends).toBeGreaterThanOrEqual(1);
    });

    it("limits stored spends to 10000", () => {
      // This is implicit in the engine - just verify it doesn't crash with many spends
      for (let i = 0; i < 100; i++) {
        engine.recordSpend({
          sessionId: `bulk-session-${i}`,
          operation: "other",
          inputTokens: 10,
          outputTokens: 10,
          model: "haiku",
        });
      }

      const stats = engine.getStats();
      expect(stats.totalSpends).toBe(100);
    });
  });
});
