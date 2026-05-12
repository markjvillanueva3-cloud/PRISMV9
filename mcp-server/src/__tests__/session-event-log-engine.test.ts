import { describe, it, expect } from "vitest";
import { SessionEventLogEngine } from "../engines/SessionEventLogEngine.js";

describe("SessionEventLogEngine", () => {

  describe("record and getState", () => {
    it("tracks events", () => {
      const engine = new SessionEventLogEngine();
      engine.record("user-request", "Fix bug in router");
      engine.record("file-edit", "router.ts", { file: "src/router.ts" });
      const state = engine.getState();
      expect(state.events.length).toBe(2);
      expect(state.userRequests).toContain("Fix bug in router");
      expect(state.filesModified).toContain("src/router.ts");
    });

    it("deduplicates files", () => {
      const engine = new SessionEventLogEngine();
      engine.record("file-edit", "edit 1", { file: "a.ts" });
      engine.record("file-edit", "edit 2", { file: "a.ts" });
      expect(engine.getState().filesModified.length).toBe(1);
    });

    it("separates event types", () => {
      const engine = new SessionEventLogEngine();
      engine.record("commit", "feat: add engine");
      engine.record("error", "test failed");
      engine.record("decision", "use vitest");
      const state = engine.getState();
      expect(state.commits.length).toBe(1);
      expect(state.errors.length).toBe(1);
      expect(state.decisions.length).toBe(1);
    });
  });

  describe("replay", () => {
    it("generates compact summary", () => {
      const engine = new SessionEventLogEngine();
      engine.record("user-request", "Build token engine");
      engine.record("file-create", "new file", { file: "TokenEngine.ts" });
      engine.record("test-pass", "12 tests passing");
      engine.record("commit", "feat: add TokenEngine");
      const replay = engine.replay();
      expect(replay).toContain("Session:");
      expect(replay).toContain("Tasks:");
      expect(replay).toContain("Commits:");
    });

    it("limits timeline events", () => {
      const engine = new SessionEventLogEngine();
      for (let i = 0; i < 30; i++) engine.record("file-edit", `edit ${i}`);
      const replay = engine.replay(5);
      const timelineLines = replay.split("\n").filter(l => l.startsWith("  "));
      expect(timelineLines.length).toBe(5);
    });
  });

  describe("oneLiner", () => {
    it("produces compact status", () => {
      const engine = new SessionEventLogEngine();
      engine.record("file-edit", "e", { file: "a.ts" });
      engine.record("commit", "c1");
      engine.record("error", "err");
      const line = engine.oneLiner();
      expect(line).toContain("1 files");
      expect(line).toContain("1 commits");
      expect(line).toContain("1 errors");
    });
  });

  describe("since", () => {
    it("filters events by timestamp", () => {
      const engine = new SessionEventLogEngine();
      engine.record("file-edit", "old");
      // Use a future timestamp to guarantee "new" is after it
      const mark = Date.now() + 100;
      // Manually push an event with timestamp after mark
      (engine as unknown as { events: Array<{ type: string; summary: string; timestamp: number }> }).events.push({ type: "file-edit", summary: "new", timestamp: mark + 1 });
      expect(engine.since(mark).length).toBe(1);
    });
  });

  describe("counts", () => {
    it("counts by type", () => {
      const engine = new SessionEventLogEngine();
      engine.record("file-edit", "e1");
      engine.record("file-edit", "e2");
      engine.record("commit", "c1");
      const c = engine.counts();
      expect(c["file-edit"]).toBe(2);
      expect(c["commit"]).toBe(1);
    });
  });

  describe("reset", () => {
    it("clears all events", () => {
      const engine = new SessionEventLogEngine();
      engine.record("file-edit", "e1");
      engine.reset();
      expect(engine.getState().events.length).toBe(0);
    });
  });
});
