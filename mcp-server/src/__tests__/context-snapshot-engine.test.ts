import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ContextSnapshotEngine, Snapshot } from "../engines/ContextSnapshotEngine.js";
import * as fs from "fs";
import * as path from "path";

describe("ContextSnapshotEngine", () => {
  const testDir = "C:/tmp/test-snapshots-" + Date.now();
  let engine: ContextSnapshotEngine;

  beforeEach(() => {
    engine = new ContextSnapshotEngine(testDir);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe("create", () => {
    it("creates snapshot with defaults", () => {
      const snap = engine.create({});
      expect(snap.timestamp).toBeGreaterThan(0);
      expect(snap.workingFiles).toEqual([]);
      expect(snap.activeTask).toBe("");
    });

    it("creates snapshot with data", () => {
      const snap = engine.create({
        activeTask: "Build hooks",
        workingFiles: ["/src/a.ts", "/src/b.ts"],
        recentCommits: ["abc123 feat: add engine"],
      });
      expect(snap.activeTask).toBe("Build hooks");
      expect(snap.workingFiles.length).toBe(2);
      expect(snap.recentCommits.length).toBe(1);
    });
  });

  describe("save and loadLatest", () => {
    it("round-trips snapshot", () => {
      const snap = engine.create({ activeTask: "test save" });
      engine.save(snap);
      const loaded = engine.loadLatest();
      expect(loaded).not.toBeNull();
      expect(loaded!.activeTask).toBe("test save");
    });

    it("returns null when no snapshots", () => {
      expect(engine.loadLatest()).toBeNull();
    });

    it("loads most recent snapshot", () => {
      const snap1 = engine.create({ activeTask: "first" });
      engine.save(snap1);
      // Small delay to ensure different timestamps
      const snap2 = engine.create({ activeTask: "second" });
      snap2.timestamp = snap1.timestamp + 1000;
      engine.save(snap2);
      const loaded = engine.loadLatest();
      expect(loaded!.activeTask).toBe("second");
    });
  });

  describe("format", () => {
    it("produces compact text", () => {
      const snap = engine.create({
        activeTask: "forge-triple hooks",
        workingFiles: ["/src/engines/HookEngine.ts"],
        recentCommits: ["abc123 feat: add hooks"],
        keyDecisions: ["Use bash builtins over grep forks"],
        nextSteps: ["Create more hookify rules"],
        engineCount: 390,
        testCount: 6200,
      });
      const text = engine.format(snap);
      expect(text).toContain("SNAPSHOT");
      expect(text).toContain("forge-triple hooks");
      expect(text).toContain("HookEngine.ts");
      expect(text).toContain("390 engines");
    });

    it("omits empty sections", () => {
      const snap = engine.create({ activeTask: "minimal" });
      const text = engine.format(snap);
      expect(text).not.toContain("Files:");
      expect(text).not.toContain("Commits:");
    });
  });

  describe("oneLiner", () => {
    it("returns compact summary", () => {
      const snap = engine.create({
        activeTask: "build stuff",
        workingFiles: ["/a.ts", "/b.ts"],
        recentCommits: ["x", "y"],
      });
      const line = engine.oneLiner(snap);
      expect(line).toContain("build stuff");
      expect(line).toContain("2 files");
      expect(line).toContain("2 commits");
    });
  });

  describe("cleanup", () => {
    it("removes old snapshots", () => {
      for (let i = 0; i < 5; i++) {
        const snap = engine.create({ activeTask: `task ${i}` });
        snap.timestamp = Date.now() + i * 1000;
        engine.save(snap);
      }
      const removed = engine.cleanup(2);
      expect(removed).toBe(3);
      const dir = path.join(testDir, "snapshots");
      const remaining = fs.readdirSync(dir).filter(f => f.endsWith(".json"));
      expect(remaining.length).toBe(2);
    });
  });
});
