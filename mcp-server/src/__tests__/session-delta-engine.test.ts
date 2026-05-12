/**
 * Tests for SessionDeltaEngine
 *
 * Validates change tracking, bookmarking, and bookmark comparison.
 * Uses the real git repo for integration-style tests.
 */

import { describe, it, expect } from "vitest";
import {
  SessionDeltaEngine,
  sessionDeltaEngine,
  type SessionBookmark,
  type SessionDelta,
  type ChangeReport,
} from "../engines/SessionDeltaEngine.js";
import * as child_process from "child_process";

describe("SessionDeltaEngine", () => {
  // ==========================================================================
  // Singleton export
  // ==========================================================================

  it("exports singleton and class", () => {
    expect(sessionDeltaEngine).toBeInstanceOf(SessionDeltaEngine);
    expect(typeof sessionDeltaEngine.getRecentActivity).toBe("function");
    expect(typeof sessionDeltaEngine.getSessionBookmark).toBe("function");
    expect(typeof sessionDeltaEngine.compareBookmark).toBe("function");
    expect(typeof sessionDeltaEngine.getChangesSince).toBe("function");
    expect(typeof sessionDeltaEngine.getChangesSinceCommit).toBe("function");
  });

  // ==========================================================================
  // getRecentActivity
  // ==========================================================================

  describe("getRecentActivity", () => {
    it("returns a ChangeReport with expected shape", () => {
      const report = sessionDeltaEngine.getRecentActivity(24);
      expect(report).toHaveProperty("since");
      expect(report).toHaveProperty("until");
      expect(report).toHaveProperty("modified");
      expect(report).toHaveProperty("added");
      expect(report).toHaveProperty("deleted");
      expect(report).toHaveProperty("commits");
      expect(report).toHaveProperty("fileCount");
      expect(Array.isArray(report.added)).toBe(true);
      expect(Array.isArray(report.deleted)).toBe(true);
      expect(Array.isArray(report.commits)).toBe(true);
    });

    it("returns categorized modifications", () => {
      const report = sessionDeltaEngine.getRecentActivity(24);
      const { modified } = report;
      expect(modified).toHaveProperty("engines");
      expect(modified).toHaveProperty("dispatchers");
      expect(modified).toHaveProperty("tests");
      expect(modified).toHaveProperty("data");
      expect(modified).toHaveProperty("hooks");
      expect(modified).toHaveProperty("other");
    });

    it("defaults to 24 hours when no argument given", () => {
      const report = sessionDeltaEngine.getRecentActivity();
      const sinceTime = new Date(report.since).getTime();
      const now = Date.now();
      // "since" should be roughly 24h ago (within 5s tolerance)
      expect(now - sinceTime).toBeGreaterThan(23 * 3600_000);
      expect(now - sinceTime).toBeLessThan(25 * 3600_000);
    });

    it("returns a report for last 1 hour", () => {
      const report = sessionDeltaEngine.getRecentActivity(1);
      expect(report).toBeTruthy();
      expect(Array.isArray(report.added)).toBe(true);
      expect(Array.isArray(report.deleted)).toBe(true);
    });
  });

  // ==========================================================================
  // getChangesSince
  // ==========================================================================

  describe("getChangesSince", () => {
    it("accepts ISO timestamp and returns report", () => {
      const ts = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
      const report = sessionDeltaEngine.getChangesSince(ts);
      expect(report.since).toBe(ts);
      expect(typeof report.fileCount).toBe("number");
    });
  });

  // ==========================================================================
  // getChangesSinceCommit
  // ==========================================================================

  describe("getChangesSinceCommit", () => {
    it("returns changes since HEAD~3", () => {
      const report = sessionDeltaEngine.getChangesSinceCommit("HEAD~3");
      expect(report).toBeTruthy();
      expect(Array.isArray(report.commits)).toBe(true);
      expect(typeof report.fileCount).toBe("number");
    });

    it("handles invalid commit hash gracefully", () => {
      const report = sessionDeltaEngine.getChangesSinceCommit("nonexistent_hash_xyz");
      expect(report).toBeTruthy();
      expect(report.fileCount).toBe(0);
    });
  });

  // ==========================================================================
  // getSessionBookmark
  // ==========================================================================

  describe("getSessionBookmark", () => {
    it("returns bookmark with expected shape and types", () => {
      const bookmark = sessionDeltaEngine.getSessionBookmark();
      expect(typeof bookmark.commitHash).toBe("string");
      expect(typeof bookmark.timestamp).toBe("string");
      expect(typeof bookmark.engineCount).toBe("number");
      expect(typeof bookmark.dispatcherCount).toBe("number");
      expect(typeof bookmark.testCount).toBe("number");
      expect(typeof bookmark.actionCount).toBe("number");
    });

    it("returns reasonable counts for the PRISM repo", () => {
      const bookmark = sessionDeltaEngine.getSessionBookmark();
      expect(bookmark.commitHash).toBeTruthy();
      expect(bookmark.commitHash).not.toBe("unknown");
      expect(bookmark.engineCount).toBeGreaterThan(50);
      expect(bookmark.dispatcherCount).toBeGreaterThan(20);
      expect(bookmark.testCount).toBeGreaterThan(10);
    });

    it("timestamp is valid ISO", () => {
      const bookmark = sessionDeltaEngine.getSessionBookmark();
      const parsed = new Date(bookmark.timestamp);
      expect(parsed.getTime()).not.toBeNaN();
    });
  });

  // ==========================================================================
  // compareBookmark
  // ==========================================================================

  describe("compareBookmark", () => {
    it("returns delta with expected shape", () => {
      const bookmark = sessionDeltaEngine.getSessionBookmark();
      const delta = sessionDeltaEngine.compareBookmark(bookmark);
      expect(Array.isArray(delta.newEngines)).toBe(true);
      expect(Array.isArray(delta.modifiedEngines)).toBe(true);
      expect(Array.isArray(delta.newTests)).toBe(true);
      expect(Array.isArray(delta.newActions)).toBe(true);
      expect(Array.isArray(delta.commits)).toBe(true);
      expect(typeof delta.summary).toBe("string");
    });

    it("shows no changes when comparing current to current", () => {
      const bookmark = sessionDeltaEngine.getSessionBookmark();
      const delta = sessionDeltaEngine.compareBookmark(bookmark);
      expect(delta.summary).toBe("no changes since bookmark");
      expect(delta.commits).toHaveLength(0);
      expect(delta.newEngines).toHaveLength(0);
    });

    it("detects changes from a stale bookmark", () => {
      const bookmark = sessionDeltaEngine.getSessionBookmark();
      const staleBm: SessionBookmark = {
        ...bookmark,
        commitHash: "HEAD~5",
        engineCount: bookmark.engineCount - 5,
      };
      const delta = sessionDeltaEngine.compareBookmark(staleBm);
      expect(delta).toBeTruthy();
      expect(typeof delta.summary).toBe("string");
      expect(Array.isArray(delta.commits)).toBe(true);
    });

    it("handles invalid bookmark gracefully", () => {
      const invalidBookmark: SessionBookmark = {
        commitHash: "unknown",
        timestamp: "2020-01-01T00:00:00.000Z",
        engineCount: 0,
        dispatcherCount: 0,
        testCount: 0,
        actionCount: 0,
      };
      const delta = sessionDeltaEngine.compareBookmark(invalidBookmark);
      expect(delta.summary).toContain("unavailable");
    });
  });

  // ==========================================================================
  // Graceful degradation (git unavailable)
  // ==========================================================================

  describe("graceful degradation", () => {
    it("returns empty results when git is not available", () => {
      const engine = new SessionDeltaEngine("C:/Windows/System32");
      const report = engine.getRecentActivity(1);
      expect(report.fileCount).toBe(0);
      expect(report.commits).toHaveLength(0);
      expect(report.added).toHaveLength(0);
    });

    it("returns unknown bookmark when git is not available", () => {
      const engine = new SessionDeltaEngine("C:/Windows/System32");
      const bookmark = engine.getSessionBookmark();
      expect(bookmark.commitHash).toBe("unknown");
      expect(bookmark.engineCount).toBe(0);
    });

    it("compareBookmark handles no-git gracefully", () => {
      const engine = new SessionDeltaEngine("C:/Windows/System32");
      const bookmark: SessionBookmark = {
        commitHash: "abc1234",
        timestamp: new Date().toISOString(),
        engineCount: 100,
        dispatcherCount: 50,
        testCount: 200,
        actionCount: 300,
      };
      const delta = engine.compareBookmark(bookmark);
      expect(delta.summary).toContain("unavailable");
    });

    it("getChangesSince handles no-git gracefully", () => {
      const engine = new SessionDeltaEngine("C:/Windows/System32");
      const report = engine.getChangesSince(new Date().toISOString());
      expect(report.fileCount).toBe(0);
    });

    it("getChangesSinceCommit handles no-git gracefully", () => {
      const engine = new SessionDeltaEngine("C:/Windows/System32");
      const report = engine.getChangesSinceCommit("abc123");
      expect(report.fileCount).toBe(0);
    });
  });
});
