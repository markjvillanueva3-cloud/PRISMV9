/**
 * Tests for CrossTerminalCoordinationEngine — U-AWR25
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CrossTerminalCoordinationEngine,
  WorkItem,
  TerminalSession,
} from "../engines/CrossTerminalCoordinationEngine.js";

describe("CrossTerminalCoordinationEngine", () => {
  beforeEach(() => {
    CrossTerminalCoordinationEngine.reset();
  });

  describe("registerSession", () => {
    it("creates a new session", () => {
      const session = CrossTerminalCoordinationEngine.registerSession("terminal-1");
      expect(session.sessionId).toBeDefined();
      expect(session.terminalName).toBe("terminal-1");
      expect(session.completedCount).toBe(0);
    });

    it("accepts specializations", () => {
      const session = CrossTerminalCoordinationEngine.registerSession("ocr-specialist", [
        "pdf_ocr",
        "image_analysis",
      ]);
      expect(session.specializations).toContain("pdf_ocr");
      expect(session.specializations).toContain("image_analysis");
    });

    it("sets initial heartbeat", () => {
      const session = CrossTerminalCoordinationEngine.registerSession("terminal-1");
      expect(session.lastHeartbeat).toBeDefined();
      expect(new Date(session.lastHeartbeat).getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe("heartbeat", () => {
    it("updates session heartbeat", () => {
      const session = CrossTerminalCoordinationEngine.registerSession("terminal-1");
      const originalHeartbeat = session.lastHeartbeat;

      // Small delay to ensure different timestamp
      const result = CrossTerminalCoordinationEngine.heartbeat(session.sessionId);

      expect(result).toBe(true);
      const updated = CrossTerminalCoordinationEngine.getSession(session.sessionId);
      expect(updated?.lastHeartbeat).toBeDefined();
    });

    it("returns false for unknown session", () => {
      const result = CrossTerminalCoordinationEngine.heartbeat("nonexistent");
      expect(result).toBe(false);
    });
  });

  describe("addWorkItem", () => {
    it("creates a work item with defaults", () => {
      const item = CrossTerminalCoordinationEngine.addWorkItem(
        "archive_extraction",
        "/path/to/archive.zip"
      );
      expect(item.id).toBeDefined();
      expect(item.type).toBe("archive_extraction");
      expect(item.target).toBe("/path/to/archive.zip");
      expect(item.priority).toBe("medium");
      expect(item.status).toBe("pending");
    });

    it("accepts custom priority", () => {
      const item = CrossTerminalCoordinationEngine.addWorkItem(
        "pdf_ocr",
        "/docs/scan.pdf",
        { priority: "critical" }
      );
      expect(item.priority).toBe("critical");
    });

    it("accepts estimated minutes", () => {
      const item = CrossTerminalCoordinationEngine.addWorkItem(
        "gcode_mining",
        "/programs/part.min",
        { estimatedMinutes: 45 }
      );
      expect(item.estimatedMinutes).toBe(45);
    });

    it("accepts dependencies", () => {
      const item1 = CrossTerminalCoordinationEngine.addWorkItem("step_1", "/a");
      const item2 = CrossTerminalCoordinationEngine.addWorkItem("step_2", "/b", {
        dependencies: [item1.id],
      });
      expect(item2.dependencies).toContain(item1.id);
    });
  });

  describe("addWorkItems", () => {
    it("adds multiple items in batch", () => {
      const items = CrossTerminalCoordinationEngine.addWorkItems([
        { type: "pdf_ocr", target: "/a.pdf" },
        { type: "pdf_ocr", target: "/b.pdf" },
        { type: "image_analysis", target: "/c.png" },
      ]);
      expect(items.length).toBe(3);
      expect(items[2].type).toBe("image_analysis");
    });
  });

  describe("claimWork", () => {
    it("claims available work", () => {
      const session = CrossTerminalCoordinationEngine.registerSession("terminal-1");
      CrossTerminalCoordinationEngine.addWorkItem("pdf_ocr", "/doc.pdf");

      const result = CrossTerminalCoordinationEngine.claimWork(session.sessionId);

      expect(result.success).toBe(true);
      expect(result.workItem).not.toBeNull();
      expect(result.workItem?.status).toBe("claimed");
      expect(result.workItem?.claimedBy).toBe(session.sessionId);
    });

    it("fails for unknown session", () => {
      CrossTerminalCoordinationEngine.addWorkItem("pdf_ocr", "/doc.pdf");
      const result = CrossTerminalCoordinationEngine.claimWork("nonexistent");

      expect(result.success).toBe(false);
      expect(result.reason).toBe("Session not found");
    });

    it("fails when session already has work", () => {
      const session = CrossTerminalCoordinationEngine.registerSession("terminal-1");
      CrossTerminalCoordinationEngine.addWorkItem("pdf_ocr", "/a.pdf");
      CrossTerminalCoordinationEngine.addWorkItem("pdf_ocr", "/b.pdf");

      CrossTerminalCoordinationEngine.claimWork(session.sessionId);
      const result = CrossTerminalCoordinationEngine.claimWork(session.sessionId);

      expect(result.success).toBe(false);
      expect(result.reason).toBe("Session already has active work item");
    });

    it("fails when no work available", () => {
      const session = CrossTerminalCoordinationEngine.registerSession("terminal-1");
      const result = CrossTerminalCoordinationEngine.claimWork(session.sessionId);

      expect(result.success).toBe(false);
      expect(result.reason).toBe("No work available");
    });

    it("respects dependencies", () => {
      const session = CrossTerminalCoordinationEngine.registerSession("terminal-1");
      const item1 = CrossTerminalCoordinationEngine.addWorkItem("step_1", "/a");
      CrossTerminalCoordinationEngine.addWorkItem("step_2", "/b", {
        dependencies: [item1.id],
      });

      const result = CrossTerminalCoordinationEngine.claimWork(session.sessionId);

      expect(result.workItem?.type).toBe("step_1"); // Must complete step_1 first
    });
  });

  describe("startWork", () => {
    it("marks work as in progress", () => {
      const session = CrossTerminalCoordinationEngine.registerSession("terminal-1");
      CrossTerminalCoordinationEngine.addWorkItem("pdf_ocr", "/doc.pdf");
      const claim = CrossTerminalCoordinationEngine.claimWork(session.sessionId);

      const result = CrossTerminalCoordinationEngine.startWork(
        session.sessionId,
        claim.workItem!.id
      );

      expect(result).toBe(true);
      const item = CrossTerminalCoordinationEngine.getWorkItem(claim.workItem!.id);
      expect(item?.status).toBe("in_progress");
      expect(item?.startedAt).toBeDefined();
    });

    it("fails for wrong session", () => {
      const session1 = CrossTerminalCoordinationEngine.registerSession("terminal-1");
      const session2 = CrossTerminalCoordinationEngine.registerSession("terminal-2");
      CrossTerminalCoordinationEngine.addWorkItem("pdf_ocr", "/doc.pdf");
      const claim = CrossTerminalCoordinationEngine.claimWork(session1.sessionId);

      const result = CrossTerminalCoordinationEngine.startWork(
        session2.sessionId,
        claim.workItem!.id
      );

      expect(result).toBe(false);
    });
  });

  describe("completeWork", () => {
    it("marks work as completed", () => {
      const session = CrossTerminalCoordinationEngine.registerSession("terminal-1");
      CrossTerminalCoordinationEngine.addWorkItem("pdf_ocr", "/doc.pdf");
      const claim = CrossTerminalCoordinationEngine.claimWork(session.sessionId);

      const result = CrossTerminalCoordinationEngine.completeWork(
        session.sessionId,
        claim.workItem!.id,
        { pageCount: 10 }
      );

      expect(result).toBe(true);
      const item = CrossTerminalCoordinationEngine.getWorkItem(claim.workItem!.id);
      expect(item?.status).toBe("completed");
      expect(item?.completedAt).toBeDefined();
      expect(item?.metadata.result).toEqual({ pageCount: 10 });
    });

    it("increments session completed count", () => {
      const session = CrossTerminalCoordinationEngine.registerSession("terminal-1");
      CrossTerminalCoordinationEngine.addWorkItem("pdf_ocr", "/doc.pdf");
      const claim = CrossTerminalCoordinationEngine.claimWork(session.sessionId);
      CrossTerminalCoordinationEngine.completeWork(session.sessionId, claim.workItem!.id);

      const updated = CrossTerminalCoordinationEngine.getSession(session.sessionId);
      expect(updated?.completedCount).toBe(1);
      expect(updated?.currentWorkItem).toBeNull();
    });

    it("unlocks dependencies", () => {
      const session = CrossTerminalCoordinationEngine.registerSession("terminal-1");
      const item1 = CrossTerminalCoordinationEngine.addWorkItem("step_1", "/a");
      CrossTerminalCoordinationEngine.addWorkItem("step_2", "/b", {
        dependencies: [item1.id],
      });

      const claim1 = CrossTerminalCoordinationEngine.claimWork(session.sessionId);
      CrossTerminalCoordinationEngine.completeWork(session.sessionId, claim1.workItem!.id);

      const claim2 = CrossTerminalCoordinationEngine.claimWork(session.sessionId);
      expect(claim2.workItem?.type).toBe("step_2");
    });
  });

  describe("failWork", () => {
    it("marks work as failed", () => {
      const session = CrossTerminalCoordinationEngine.registerSession("terminal-1");
      CrossTerminalCoordinationEngine.addWorkItem("pdf_ocr", "/doc.pdf");
      const claim = CrossTerminalCoordinationEngine.claimWork(session.sessionId);

      const result = CrossTerminalCoordinationEngine.failWork(
        session.sessionId,
        claim.workItem!.id,
        "OCR engine crashed"
      );

      expect(result).toBe(true);
      const item = CrossTerminalCoordinationEngine.getWorkItem(claim.workItem!.id);
      expect(item?.status).toBe("failed");
      expect(item?.metadata.error).toBe("OCR engine crashed");
    });

    it("increments session failed count", () => {
      const session = CrossTerminalCoordinationEngine.registerSession("terminal-1");
      CrossTerminalCoordinationEngine.addWorkItem("pdf_ocr", "/doc.pdf");
      const claim = CrossTerminalCoordinationEngine.claimWork(session.sessionId);
      CrossTerminalCoordinationEngine.failWork(session.sessionId, claim.workItem!.id);

      const updated = CrossTerminalCoordinationEngine.getSession(session.sessionId);
      expect(updated?.failedCount).toBe(1);
    });
  });

  describe("abandonWork", () => {
    it("releases work back to queue", () => {
      const session = CrossTerminalCoordinationEngine.registerSession("terminal-1");
      CrossTerminalCoordinationEngine.addWorkItem("pdf_ocr", "/doc.pdf");
      const claim = CrossTerminalCoordinationEngine.claimWork(session.sessionId);

      const result = CrossTerminalCoordinationEngine.abandonWork(
        session.sessionId,
        claim.workItem!.id
      );

      expect(result).toBe(true);
      const item = CrossTerminalCoordinationEngine.getWorkItem(claim.workItem!.id);
      expect(item?.status).toBe("pending");
      expect(item?.claimedBy).toBeNull();
    });
  });

  describe("setStrategy", () => {
    it("changes distribution strategy", () => {
      const result = CrossTerminalCoordinationEngine.setStrategy("priority_first");
      expect(result).toBe(true);
      expect(CrossTerminalCoordinationEngine.getCurrentStrategy().name).toBe("Priority First");
    });

    it("returns false for unknown strategy", () => {
      const result = CrossTerminalCoordinationEngine.setStrategy("nonexistent");
      expect(result).toBe(false);
    });
  });

  describe("getStrategies", () => {
    it("returns available strategies", () => {
      const strategies = CrossTerminalCoordinationEngine.getStrategies();
      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies.some((s) => s.name === "Balanced")).toBe(true);
    });
  });

  describe("priority ordering", () => {
    it("claims critical items first", () => {
      const session = CrossTerminalCoordinationEngine.registerSession("terminal-1");
      CrossTerminalCoordinationEngine.addWorkItem("low_priority", "/a", { priority: "low" });
      CrossTerminalCoordinationEngine.addWorkItem("critical_item", "/b", {
        priority: "critical",
      });

      const result = CrossTerminalCoordinationEngine.claimWork(session.sessionId);

      expect(result.workItem?.type).toBe("critical_item");
    });

    it("claims high before medium", () => {
      const session = CrossTerminalCoordinationEngine.registerSession("terminal-1");
      CrossTerminalCoordinationEngine.addWorkItem("medium_item", "/a", { priority: "medium" });
      CrossTerminalCoordinationEngine.addWorkItem("high_item", "/b", { priority: "high" });

      const result = CrossTerminalCoordinationEngine.claimWork(session.sessionId);

      expect(result.workItem?.type).toBe("high_item");
    });
  });

  describe("specialization scoring", () => {
    it("prefers specialized sessions for matching work", () => {
      CrossTerminalCoordinationEngine.setStrategy("specialized");

      const specialist = CrossTerminalCoordinationEngine.registerSession("ocr-specialist", [
        "pdf_ocr",
      ]);
      const generalist = CrossTerminalCoordinationEngine.registerSession("general");

      CrossTerminalCoordinationEngine.addWorkItem("pdf_ocr", "/doc.pdf", { priority: "medium" });
      CrossTerminalCoordinationEngine.addWorkItem("other_work", "/other", { priority: "medium" });

      const specialistClaim = CrossTerminalCoordinationEngine.claimWork(specialist.sessionId);
      expect(specialistClaim.workItem?.type).toBe("pdf_ocr");
    });
  });

  describe("getQueueStats", () => {
    it("returns accurate statistics", () => {
      const session = CrossTerminalCoordinationEngine.registerSession("terminal-1");
      CrossTerminalCoordinationEngine.addWorkItem("pdf_ocr", "/a.pdf", { priority: "high" });
      CrossTerminalCoordinationEngine.addWorkItem("pdf_ocr", "/b.pdf", { priority: "medium" });
      CrossTerminalCoordinationEngine.addWorkItem("image_analysis", "/c.png", {
        priority: "low",
      });

      const claim = CrossTerminalCoordinationEngine.claimWork(session.sessionId);
      CrossTerminalCoordinationEngine.completeWork(session.sessionId, claim.workItem!.id);

      const stats = CrossTerminalCoordinationEngine.getQueueStats();

      expect(stats.total).toBe(3);
      expect(stats.pending).toBe(2);
      expect(stats.completed).toBe(1);
      expect(stats.byType["pdf_ocr"]).toBe(2);
      expect(stats.byType["image_analysis"]).toBe(1);
      expect(stats.byPriority.high).toBe(1);
    });
  });

  describe("getSessionStats", () => {
    it("returns accurate session statistics", () => {
      const session1 = CrossTerminalCoordinationEngine.registerSession("terminal-1");
      const session2 = CrossTerminalCoordinationEngine.registerSession("terminal-2");

      CrossTerminalCoordinationEngine.addWorkItem("pdf_ocr", "/a.pdf");
      CrossTerminalCoordinationEngine.addWorkItem("pdf_ocr", "/b.pdf");

      const claim = CrossTerminalCoordinationEngine.claimWork(session1.sessionId);
      CrossTerminalCoordinationEngine.completeWork(session1.sessionId, claim.workItem!.id);

      const stats = CrossTerminalCoordinationEngine.getSessionStats();

      expect(stats.total).toBe(2);
      expect(stats.active).toBe(2);
      expect(stats.idle).toBe(2); // Both idle after completion
      expect(stats.totalCompleted).toBe(1);
    });
  });

  describe("getState", () => {
    it("returns full coordination state", () => {
      const session = CrossTerminalCoordinationEngine.registerSession("terminal-1");
      CrossTerminalCoordinationEngine.addWorkItem("pdf_ocr", "/doc.pdf");

      const state = CrossTerminalCoordinationEngine.getState();

      expect(state.workQueue.length).toBe(1);
      expect(state.activeSessions.length).toBe(1);
      expect(state.lastUpdated).toBeDefined();
    });
  });

  describe("getPendingWork", () => {
    it("returns only pending items", () => {
      const session = CrossTerminalCoordinationEngine.registerSession("terminal-1");
      CrossTerminalCoordinationEngine.addWorkItem("pdf_ocr", "/a.pdf");
      CrossTerminalCoordinationEngine.addWorkItem("pdf_ocr", "/b.pdf");
      CrossTerminalCoordinationEngine.claimWork(session.sessionId);

      const pending = CrossTerminalCoordinationEngine.getPendingWork();

      expect(pending.length).toBe(1);
      expect(pending[0].target).toBe("/b.pdf");
    });
  });

  describe("getWorkTypes", () => {
    it("returns supported work types", () => {
      const types = CrossTerminalCoordinationEngine.getWorkTypes();
      expect(types).toContain("archive_extraction");
      expect(types).toContain("pdf_ocr");
      expect(types).toContain("gcode_mining");
    });
  });

  describe("getActiveSessions", () => {
    it("returns only active sessions", () => {
      CrossTerminalCoordinationEngine.registerSession("terminal-1");
      CrossTerminalCoordinationEngine.registerSession("terminal-2");

      const active = CrossTerminalCoordinationEngine.getActiveSessions();

      expect(active.length).toBe(2);
    });
  });

  describe("reset", () => {
    it("clears all state", () => {
      CrossTerminalCoordinationEngine.registerSession("terminal-1");
      CrossTerminalCoordinationEngine.addWorkItem("pdf_ocr", "/doc.pdf");

      CrossTerminalCoordinationEngine.reset();

      expect(CrossTerminalCoordinationEngine.getActiveSessions().length).toBe(0);
      expect(CrossTerminalCoordinationEngine.getPendingWork().length).toBe(0);
    });
  });
});
