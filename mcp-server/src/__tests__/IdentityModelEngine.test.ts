/**
 * IdentityModelEngine Tests — U-SAV2-01
 */

import { describe, it, expect, beforeEach } from "vitest";
import { identityModelEngine, IdentityModelEngine } from "../engines/IdentityModelEngine.js";

describe("IdentityModelEngine", () => {
  let engine: IdentityModelEngine;

  beforeEach(() => {
    engine = new IdentityModelEngine();
  });

  describe("register", () => {
    it("registers a new session with defaults", () => {
      const result = engine.register({ sessionId: "sess-001" });

      expect(result.sessionId).toBe("sess-001");
      expect(result.role).toBe("general");
      expect(result.family).toBe("claude-code");
      expect(result.boundaries.length).toBeGreaterThan(0);
      expect(result.invariants.length).toBeGreaterThan(0);
    });

    it("registers with explicit role and family", () => {
      const result = engine.register({
        sessionId: "sess-002",
        role: "builder",
        family: "mcp-client",
      });

      expect(result.role).toBe("builder");
      expect(result.family).toBe("mcp-client");
    });

    it("tracks current milestone and unit", () => {
      const result = engine.register({
        sessionId: "sess-003",
        currentMilestone: "PSAU-MASTER",
        currentUnit: "U-SAV2-01",
      });

      expect(result.currentMilestone).toBe("PSAU-MASTER");
      expect(result.currentUnit).toBe("U-SAV2-01");
    });

    it("merges custom boundaries with defaults", () => {
      const result = engine.register({
        sessionId: "sess-004",
        customBoundaries: [
          { name: "wedm-only", type: "prefer", description: "Focus on WEDM work" },
        ],
      });

      const names = result.boundaries.map(b => b.name);
      expect(names).toContain("no-inline-constants");
      expect(names).toContain("wedm-only");
    });

    it("updates existing session on re-register", () => {
      engine.register({ sessionId: "sess-005", role: "general" });
      const updated = engine.register({ sessionId: "sess-005", role: "builder" });

      expect(updated.role).toBe("builder");
      expect(engine.get("sess-005")?.role).toBe("builder");
    });
  });

  describe("get", () => {
    it("returns null for unregistered session", () => {
      expect(engine.get("nonexistent")).toBeNull();
    });

    it("returns identity for registered session", () => {
      engine.register({ sessionId: "sess-010" });
      const result = engine.get("sess-010");

      expect(result).not.toBeNull();
      expect(result?.sessionId).toBe("sess-010");
    });
  });

  describe("heartbeat", () => {
    it("returns false for unregistered session", () => {
      expect(engine.heartbeat("unknown")).toBe(false);
    });

    it("updates lastActive timestamp", () => {
      engine.register({ sessionId: "sess-020" });
      const before = engine.get("sess-020")?.lastActive;

      // Small delay to ensure timestamp changes
      const result = engine.heartbeat("sess-020");
      const after = engine.get("sess-020")?.lastActive;

      expect(result).toBe(true);
      expect(after).toBeDefined();
      expect(new Date(after!).getTime()).toBeGreaterThanOrEqual(new Date(before!).getTime());
    });
  });

  describe("checkBoundary", () => {
    it("returns applies=false for unregistered session", () => {
      const result = engine.checkBoundary("unknown", "any-boundary");
      expect(result.applies).toBe(false);
      expect(result.reason).toContain("not registered");
    });

    it("returns applies=false for unknown boundary", () => {
      engine.register({ sessionId: "sess-030" });
      const result = engine.checkBoundary("sess-030", "nonexistent-boundary");

      expect(result.applies).toBe(false);
      expect(result.reason).toContain("not found");
    });

    it("returns constraint for known boundary", () => {
      engine.register({ sessionId: "sess-031" });
      const result = engine.checkBoundary("sess-031", "no-inline-constants");

      expect(result.applies).toBe(true);
      expect(result.constraint?.type).toBe("must_not");
      expect(result.constraint?.enforcedBy).toBe("canonical-constants-hook");
    });
  });

  describe("getHardBoundaries", () => {
    it("returns default hard boundaries for unregistered session", () => {
      const result = engine.getHardBoundaries("unknown");

      expect(result.length).toBeGreaterThan(0);
      expect(result.every(b => b.type === "must" || b.type === "must_not")).toBe(true);
    });

    it("filters to only must/must_not constraints", () => {
      engine.register({
        sessionId: "sess-040",
        customBoundaries: [
          { name: "soft-pref", type: "prefer", description: "Soft preference" },
        ],
      });

      const result = engine.getHardBoundaries("sess-040");
      expect(result.every(b => b.type === "must" || b.type === "must_not")).toBe(true);
      expect(result.some(b => b.name === "soft-pref")).toBe(false);
    });
  });

  describe("getCapabilities", () => {
    it("returns general capabilities for unregistered session", () => {
      const result = engine.getCapabilities("unknown");
      expect(result).toContain("read");
      expect(result).toContain("write");
    });

    it("returns role-specific capabilities for builder", () => {
      engine.register({ sessionId: "sess-050", role: "builder" });
      const result = engine.getCapabilities("sess-050");

      expect(result).toContain("create-engine");
      expect(result).toContain("edit-code");
      expect(result).toContain("run-tests");
      expect(result).toContain("commit");
    });

    it("includes specializations in capabilities", () => {
      engine.register({
        sessionId: "sess-051",
        role: "specialist",
        specializations: ["wedm-expert", "lathe-programming"],
      });

      const result = engine.getCapabilities("sess-051");
      expect(result).toContain("wedm-expert");
      expect(result).toContain("lathe-programming");
    });
  });

  describe("listSessions", () => {
    it("returns empty array when no sessions", () => {
      expect(engine.listSessions()).toEqual([]);
    });

    it("lists all registered sessions", () => {
      engine.register({ sessionId: "list-1", role: "builder" });
      engine.register({ sessionId: "list-2", role: "reviewer" });

      const result = engine.listSessions();
      expect(result).toHaveLength(2);
      expect(result.map(s => s.sessionId)).toContain("list-1");
      expect(result.map(s => s.sessionId)).toContain("list-2");
    });

    it("formats currentWork from milestone/unit", () => {
      engine.register({
        sessionId: "list-3",
        currentMilestone: "CAD-COMPLETE-MS0",
        currentUnit: "U-CADC-01",
      });

      const result = engine.listSessions();
      const session = result.find(s => s.sessionId === "list-3");
      expect(session?.currentWork).toBe("CAD-COMPLETE-MS0/U-CADC-01");
    });
  });

  describe("getSiblings", () => {
    it("returns empty array for unregistered session", () => {
      expect(engine.getSiblings("unknown")).toEqual([]);
    });

    it("returns empty for session without milestone", () => {
      engine.register({ sessionId: "sib-1" });
      expect(engine.getSiblings("sib-1")).toEqual([]);
    });

    it("finds other sessions on same milestone", () => {
      engine.register({ sessionId: "sib-a", currentMilestone: "PSAU-MASTER" });
      engine.register({ sessionId: "sib-b", currentMilestone: "PSAU-MASTER" });
      engine.register({ sessionId: "sib-c", currentMilestone: "OTHER-MS" });

      const siblings = engine.getSiblings("sib-a");
      expect(siblings).toHaveLength(1);
      expect(siblings[0].sessionId).toBe("sib-b");
    });
  });

  describe("deregister", () => {
    it("returns false for unregistered session", () => {
      expect(engine.deregister("unknown")).toBe(false);
    });

    it("removes registered session", () => {
      engine.register({ sessionId: "dereg-1" });
      expect(engine.deregister("dereg-1")).toBe(true);
      expect(engine.get("dereg-1")).toBeNull();
    });
  });

  describe("pruneStale", () => {
    it("prunes sessions older than maxAge", () => {
      // Register with backdated lastActive
      const oldRecord = engine.register({ sessionId: "old-1" });
      const identity = engine.get("old-1")!;
      // Manually backdate (in real usage this would be from persistence)
      (identity as any).lastActive = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString();

      engine.register({ sessionId: "fresh-1" });

      const pruned = engine.pruneStale(8);
      expect(pruned).toBe(1);
      expect(engine.get("old-1")).toBeNull();
      expect(engine.get("fresh-1")).not.toBeNull();
    });
  });

  describe("export/import", () => {
    it("exports all identities", () => {
      engine.register({ sessionId: "exp-1", role: "builder" });
      engine.register({ sessionId: "exp-2", role: "reviewer" });

      const exported = engine.export();
      expect(exported).toHaveLength(2);
      expect(exported.map(e => e.sessionId)).toContain("exp-1");
    });

    it("imports valid records", () => {
      const records = [
        {
          sessionId: "imp-1",
          role: "builder" as const,
          family: "claude-code" as const,
          activeSince: new Date().toISOString(),
          lastActive: new Date().toISOString(),
          boundaries: [],
          invariants: [],
          metadata: {},
        },
      ];

      const imported = engine.import(records);
      expect(imported).toBe(1);
      expect(engine.get("imp-1")).not.toBeNull();
    });

    it("skips invalid records during import", () => {
      const records = [
        { sessionId: "valid", role: "builder", family: "claude-code", activeSince: new Date().toISOString(), lastActive: new Date().toISOString(), boundaries: [], invariants: [], metadata: {} },
        { invalid: true }, // Missing required fields
      ] as any;

      const imported = engine.import(records);
      expect(imported).toBe(1);
    });
  });

  describe("getStats", () => {
    it("returns zero stats for empty engine", () => {
      const stats = engine.getStats();
      expect(stats.totalSessions).toBe(0);
      expect(stats.activeLast5Min).toBe(0);
    });

    it("aggregates by role and family", () => {
      engine.register({ sessionId: "stat-1", role: "builder", family: "claude-code" });
      engine.register({ sessionId: "stat-2", role: "builder", family: "mcp-client" });
      engine.register({ sessionId: "stat-3", role: "reviewer", family: "claude-code" });

      const stats = engine.getStats();
      expect(stats.totalSessions).toBe(3);
      expect(stats.byRole["builder"]).toBe(2);
      expect(stats.byRole["reviewer"]).toBe(1);
      expect(stats.byFamily["claude-code"]).toBe(2);
      expect(stats.byFamily["mcp-client"]).toBe(1);
    });

    it("counts recently active sessions", () => {
      engine.register({ sessionId: "active-1" });
      engine.register({ sessionId: "active-2" });

      const stats = engine.getStats();
      expect(stats.activeLast5Min).toBe(2);
    });
  });

  describe("singleton instance", () => {
    it("exports a singleton instance", () => {
      expect(identityModelEngine).toBeInstanceOf(IdentityModelEngine);
    });
  });
});
