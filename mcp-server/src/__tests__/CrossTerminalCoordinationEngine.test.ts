/**
 * CrossTerminalCoordinationEngine Tests — U-AWR25
 */

import { describe, it, expect, beforeEach } from "vitest";
import { CrossTerminalCoordinationEngine } from "../engines/CrossTerminalCoordinationEngine.js";

describe("CrossTerminalCoordinationEngine", () => {
  beforeEach(() => {
    CrossTerminalCoordinationEngine.reset();
  });

  describe("registerSession", () => {
    it("creates a new terminal session", () => {
      const session = CrossTerminalCoordinationEngine.registerSession("Terminal-1");
      expect(session.sessionId).toMatch(/^session-/);
      expect(session.terminalName).toBe("Terminal-1");
      expect(session.completedCount).toBe(0);
    });

    it("accepts specializations", () => {
      const session = CrossTerminalCoordinationEngine.registerSession("OCR", ["pdf_ocr"]);
      expect(session.specializations).toContain("pdf_ocr");
    });
  });

  describe("heartbeat", () => {
    it("updates session heartbeat", () => {
      const session = CrossTerminalCoordinationEngine.registerSession("Terminal-1");
      const result = CrossTerminalCoordinationEngine.heartbeat(session.sessionId);
      expect(result).toBe(true);
    });

    it("returns false for unknown session", () => {
      const result = CrossTerminalCoordinationEngine.heartbeat("invalid");
      expect(result).toBe(false);
    });
  });

  describe("addWorkItem", () => {
    it("creates a work item with default values", () => {
      const item = CrossTerminalCoordinationEngine.addWorkItem("archive", "/path.zip");
      expect(item.id).toMatch(/^work-/);
      expect(item.type).toBe("archive");
      expect(item.priority).toBe("medium");
      expect(item.status).toBe("pending");
    });

    it("accepts custom priority", () => {
      const item = CrossTerminalCoordinationEngine.addWorkItem("gcode", "/programs", { priority: "critical" });
      expect(item.priority).toBe("critical");
    });
  });

  describe("addWorkItems", () => {
    it("adds multiple work items in batch", () => {
      const items = CrossTerminalCoordinationEngine.addWorkItems([
        { type: "pdf_ocr", target: "/doc1.pdf" },
        { type: "pdf_ocr", target: "/doc2.pdf" },
      ]);
      expect(items).toHaveLength(2);
    });
  });

  describe("claimWork", () => {
    it("claims highest priority work item", () => {
      CrossTerminalCoordinationEngine.addWorkItem("low", "/low", { priority: "low" });
      CrossTerminalCoordinationEngine.addWorkItem("crit", "/critical", { priority: "critical" });
      const session = CrossTerminalCoordinationEngine.registerSession("T1");
      const result = CrossTerminalCoordinationEngine.claimWork(session.sessionId);
      expect(result.success).toBe(true);
      expect(result.workItem!.target).toBe("/critical");
    });

    it("fails for unknown session", () => {
      CrossTerminalCoordinationEngine.addWorkItem("task", "/target");
      const result = CrossTerminalCoordinationEngine.claimWork("invalid");
      expect(result.success).toBe(false);
    });

    it("fails when no work available", () => {
      const session = CrossTerminalCoordinationEngine.registerSession("T1");
      const result = CrossTerminalCoordinationEngine.claimWork(session.sessionId);
      expect(result.success).toBe(false);
      expect(result.reason).toBe("No work available");
    });

    it("updates work item status to claimed", () => {
      const item = CrossTerminalCoordinationEngine.addWorkItem("task", "/target");
      const session = CrossTerminalCoordinationEngine.registerSession("T1");
      CrossTerminalCoordinationEngine.claimWork(session.sessionId);
      expect(item.status).toBe("claimed");
      expect(item.claimedBy).toBe(session.sessionId);
    });
  });

  describe("startWork", () => {
    it("marks work as in progress", () => {
      const item = CrossTerminalCoordinationEngine.addWorkItem("task", "/target");
      const session = CrossTerminalCoordinationEngine.registerSession("T1");
      CrossTerminalCoordinationEngine.claimWork(session.sessionId);
      const result = CrossTerminalCoordinationEngine.startWork(session.sessionId, item.id);
      expect(result).toBe(true);
      expect(item.status).toBe("in_progress");
    });
  });

  describe("completeWork", () => {
    it("marks work as completed", () => {
      const item = CrossTerminalCoordinationEngine.addWorkItem("task", "/target");
      const session = CrossTerminalCoordinationEngine.registerSession("T1");
      CrossTerminalCoordinationEngine.claimWork(session.sessionId);
      const result = CrossTerminalCoordinationEngine.completeWork(session.sessionId, item.id);
      expect(result).toBe(true);
      expect(item.status).toBe("completed");
    });

    it("increments session completed count", () => {
      const item = CrossTerminalCoordinationEngine.addWorkItem("task", "/target");
      const session = CrossTerminalCoordinationEngine.registerSession("T1");
      CrossTerminalCoordinationEngine.claimWork(session.sessionId);
      CrossTerminalCoordinationEngine.completeWork(session.sessionId, item.id);
      expect(session.completedCount).toBe(1);
    });
  });

  describe("failWork", () => {
    it("marks work as failed", () => {
      const item = CrossTerminalCoordinationEngine.addWorkItem("task", "/target");
      const session = CrossTerminalCoordinationEngine.registerSession("T1");
      CrossTerminalCoordinationEngine.claimWork(session.sessionId);
      const result = CrossTerminalCoordinationEngine.failWork(session.sessionId, item.id, "Error");
      expect(result).toBe(true);
      expect(item.status).toBe("failed");
    });
  });

  describe("abandonWork", () => {
    it("releases work back to queue", () => {
      const item = CrossTerminalCoordinationEngine.addWorkItem("task", "/target");
      const session = CrossTerminalCoordinationEngine.registerSession("T1");
      CrossTerminalCoordinationEngine.claimWork(session.sessionId);
      const result = CrossTerminalCoordinationEngine.abandonWork(session.sessionId, item.id);
      expect(result).toBe(true);
      expect(item.status).toBe("pending");
    });
  });

  describe("Strategy Management", () => {
    it("sets distribution strategy", () => {
      const result = CrossTerminalCoordinationEngine.setStrategy("priority_first");
      expect(result).toBe(true);
    });

    it("returns false for unknown strategy", () => {
      const result = CrossTerminalCoordinationEngine.setStrategy("invalid");
      expect(result).toBe(false);
    });

    it("lists available strategies", () => {
      const strategies = CrossTerminalCoordinationEngine.getStrategies();
      expect(strategies.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("getState", () => {
    it("returns complete coordination state", () => {
      CrossTerminalCoordinationEngine.registerSession("T1");
      CrossTerminalCoordinationEngine.addWorkItem("task", "/target");
      const state = CrossTerminalCoordinationEngine.getState();
      expect(state.activeSessions).toHaveLength(1);
      expect(state.workQueue).toHaveLength(1);
    });
  });

  describe("getQueueStats", () => {
    it("returns queue statistics", () => {
      CrossTerminalCoordinationEngine.addWorkItem("t1", "/a", { priority: "critical" });
      CrossTerminalCoordinationEngine.addWorkItem("t2", "/b", { priority: "low" });
      const stats = CrossTerminalCoordinationEngine.getQueueStats();
      expect(stats.total).toBe(2);
      expect(stats.byPriority.critical).toBe(1);
    });
  });

  describe("reset", () => {
    it("clears all state", () => {
      CrossTerminalCoordinationEngine.registerSession("T1");
      CrossTerminalCoordinationEngine.addWorkItem("task", "/target");
      CrossTerminalCoordinationEngine.reset();
      const state = CrossTerminalCoordinationEngine.getState();
      expect(state.activeSessions).toHaveLength(0);
      expect(state.workQueue).toHaveLength(0);
    });
  });
});
