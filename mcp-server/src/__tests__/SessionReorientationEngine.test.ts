/**
 * SessionReorientationEngine tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SessionReorientationEngine } from "../engines/SessionReorientationEngine.js";
import { existsSync, rmSync } from "node:fs";

describe("SessionReorientationEngine", () => {
  let engine: SessionReorientationEngine;
  const stateDir = "H:/prism/state/session-reorientation";

  process.env.CLAUDE_SESSION_ID = "test-session-reorientation";

  beforeEach(() => {
    const stateFile = `${stateDir}/reorientation-test-session-reorientation.json`;
    if (existsSync(stateFile)) {
      rmSync(stateFile);
    }
    engine = new SessionReorientationEngine();
    engine.reset();
  });

  describe("recordAnchor", () => {
    it("records anchor with auto-generated ID and default importance", () => {
      const anchor = engine.recordAnchor("decision", "Use Kienzle force model for milling tool wear");
      expect(anchor.id).toMatch(/^anc_/);
      expect(anchor.type).toBe("decision");
      expect(anchor.importance).toBe(7); // default for decision
      expect(anchor.active).toBe(true);
      expect(anchor.tags.length).toBeGreaterThan(0);
    });

    it("assigns higher importance to user_directive", () => {
      const a = engine.recordAnchor("user_directive", "User wants Omega = 1.0");
      expect(a.importance).toBe(10);
    });

    it("assigns lowest importance to file_modified", () => {
      const a = engine.recordAnchor("file_modified", "Edited foo.ts");
      expect(a.importance).toBe(3);
    });

    it("clamps importance override to [1, 10]", () => {
      const high = engine.recordAnchor("decision", "test", { importance: 99 });
      const low = engine.recordAnchor("decision", "test", { importance: -5 });
      expect(high.importance).toBe(10);
      expect(low.importance).toBe(1);
    });

    it("extracts file extension and module tags", () => {
      const a = engine.recordAnchor("file_modified", "Edited engine", {
        files: ["src/engines/MyEngine.ts"],
      });
      expect(a.tags).toContain("ext:ts");
      expect(a.tags).toContain("mod:engines");
    });

    it("extracts domain keyword tags from summary", () => {
      const a = engine.recordAnchor("decision", "Use Kienzle force model with Taylor wear");
      expect(a.tags.some((t) => t.includes("kienzle"))).toBe(true);
      expect(a.tags.some((t) => t.includes("taylor"))).toBe(true);
    });

    it("truncates summary to 200 chars", () => {
      const long = "x".repeat(500);
      const a = engine.recordAnchor("decision", long);
      expect(a.summary.length).toBeLessThanOrEqual(200);
    });

    it("stores rationale separately from summary", () => {
      const a = engine.recordAnchor("decision", "Picked option A", {
        rationale: "A is more performant under load",
      });
      expect(a.rationale).toBe("A is more performant under load");
    });
  });

  describe("deactivate", () => {
    it("marks anchor as inactive", () => {
      const a = engine.recordAnchor("milestone", "Build feature X");
      const ok = engine.deactivate(a.id);
      expect(ok).toBe(true);
      const reloaded = engine.getAnchors().find((x) => x.id === a.id);
      expect(reloaded?.active).toBe(false);
    });

    it("returns false for unknown ID", () => {
      const ok = engine.deactivate("nonexistent");
      expect(ok).toBe(false);
    });
  });

  describe("recordPrompt + recordToolCall triggers", () => {
    it("triggers brief generation after promptInterval prompts", () => {
      engine.updateConfig({ promptInterval: 3, toolCallInterval: 999 });
      expect(engine.recordPrompt()).toBe(false); // 1
      expect(engine.recordPrompt()).toBe(false); // 2
      expect(engine.recordPrompt()).toBe(true); // 3 → trigger
    });

    it("triggers brief generation after toolCallInterval calls", () => {
      engine.updateConfig({ promptInterval: 999, toolCallInterval: 4 });
      for (let i = 0; i < 3; i++) {
        expect(engine.recordToolCall()).toBe(false);
      }
      expect(engine.recordToolCall()).toBe(true);
    });

    it("resets counters after generateBrief()", () => {
      engine.updateConfig({ promptInterval: 3 });
      engine.recordPrompt();
      engine.recordPrompt();
      engine.recordPrompt();
      engine.generateBrief("test");
      expect(engine.recordPrompt()).toBe(false); // counter reset
    });
  });

  describe("generateBrief", () => {
    it("includes current objective from latest task_anchor", () => {
      engine.recordAnchor("task_anchor", "Building SessionReorientationEngine");
      const brief = engine.generateBrief();
      expect(brief.currentObjective).toBe("Building SessionReorientationEngine");
      expect(brief.markdown).toContain("Building SessionReorientationEngine");
    });

    it("prefers user_directive as objective if more recent than task_anchor", () => {
      engine.recordAnchor("task_anchor", "Old task");
      engine.recordAnchor("user_directive", "User says: focus on performance now");
      const brief = engine.generateBrief();
      expect(brief.currentObjective).toContain("performance");
    });

    it("lists active files from recent anchors, deduplicated", () => {
      engine.recordAnchor("file_modified", "edit", { files: ["a.ts"] });
      engine.recordAnchor("file_modified", "edit", { files: ["b.ts", "a.ts"] });
      engine.recordAnchor("file_modified", "edit", { files: ["c.ts"] });
      const brief = engine.generateBrief();
      expect(brief.activeFiles.length).toBeLessThanOrEqual(10);
      // each file appears once
      const set = new Set(brief.activeFiles);
      expect(set.size).toBe(brief.activeFiles.length);
      expect(set).toContain("a.ts");
      expect(set).toContain("b.ts");
      expect(set).toContain("c.ts");
    });

    it("includes recent decisions with rationale", () => {
      engine.recordAnchor("decision", "Use Promise.all", { rationale: "Parallel for speed" });
      const brief = engine.generateBrief();
      expect(brief.recentDecisions.length).toBe(1);
      expect(brief.recentDecisions[0].rationale).toBe("Parallel for speed");
      expect(brief.markdown).toContain("Parallel for speed");
    });

    it("lists open todos from milestones", () => {
      engine.recordAnchor("milestone", "Wire dispatcher action");
      engine.recordAnchor("milestone", "Write hook test");
      const brief = engine.generateBrief();
      expect(brief.openTodos.length).toBe(2);
    });

    it("lists resolved errors so they aren't re-attempted", () => {
      engine.recordAnchor("error_resolved", "Fixed EPERM by using session ID");
      const brief = engine.generateBrief();
      expect(brief.resolvedErrors.length).toBe(1);
      expect(brief.markdown).toMatch(/don't re-attempt|Resolved errors/i);
    });

    it("estimates token count for the brief", () => {
      engine.recordAnchor("task_anchor", "Test objective");
      const brief = engine.generateBrief();
      expect(brief.estimatedTokens).toBeGreaterThan(0);
    });

    it("records brief in history", () => {
      engine.generateBrief("manual");
      engine.generateBrief("auto");
      const stats = engine.getStats();
      expect(stats.briefsGenerated).toBe(2);
      expect(stats.lastBriefAt).toBeTruthy();
    });
  });

  describe("drift detection", () => {
    it("does not flag drift with insufficient history", () => {
      engine.recordAnchor("decision", "Working on milling kienzle force");
      engine.recordAnchor("decision", "Adjusting milling feeds");
      const brief = engine.generateBrief();
      expect(brief.driftDetected).toBe(false);
    });

    it("detects drift when topic tags shift dramatically", () => {
      engine.updateConfig({ driftWindowSize: 3, driftThreshold: 0.5 });
      // 3 milling-domain anchors
      for (let i = 0; i < 3; i++) {
        engine.recordAnchor("decision", `milling kienzle force step ${i}`);
      }
      // 3 unrelated WEDM anchors
      for (let i = 0; i < 3; i++) {
        engine.recordAnchor("decision", `wedm wire tension calibration step ${i}`);
      }
      const brief = engine.generateBrief();
      expect(brief.driftDetected).toBe(true);
      expect(brief.driftToTags.length).toBeGreaterThan(0);
    });
  });

  describe("shouldGenerateBrief", () => {
    it("returns false when thresholds not met", () => {
      engine.updateConfig({ promptInterval: 100, toolCallInterval: 100 });
      const result = engine.shouldGenerateBrief();
      expect(result.should).toBe(false);
    });

    it("returns true when prompt interval reached", () => {
      engine.updateConfig({ promptInterval: 2 });
      engine.recordPrompt();
      engine.recordPrompt();
      const result = engine.shouldGenerateBrief();
      expect(result.should).toBe(true);
      expect(result.reason).toMatch(/prompt_interval/);
    });
  });

  describe("getStats", () => {
    it("tracks total and active anchor counts", () => {
      const a1 = engine.recordAnchor("decision", "d1");
      engine.recordAnchor("decision", "d2");
      engine.deactivate(a1.id);
      const stats = engine.getStats();
      expect(stats.totalAnchors).toBe(2);
      expect(stats.activeAnchors).toBe(1);
    });

    it("starts with zero counters", () => {
      const stats = engine.getStats();
      expect(stats.promptsSeen).toBe(0);
      expect(stats.toolCallsSeen).toBe(0);
      expect(stats.briefsGenerated).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("handles empty summary", () => {
      const a = engine.recordAnchor("decision", "");
      expect(a.summary).toBe("");
    });

    it("prunes anchors beyond maxAnchors limit, keeping highest importance", () => {
      engine.updateConfig({ maxAnchors: 5 });
      // Add 3 high-importance
      for (let i = 0; i < 3; i++) {
        engine.recordAnchor("user_directive", `directive ${i}`);
      }
      // Add many low-importance
      for (let i = 0; i < 20; i++) {
        engine.recordAnchor("file_modified", `edit ${i}`);
      }
      const anchors = engine.getAnchors();
      expect(anchors.length).toBeLessThanOrEqual(5);
      // High importance must survive
      expect(anchors.filter((a) => a.type === "user_directive").length).toBe(3);
    });

    it("generates brief even with no anchors", () => {
      const brief = engine.generateBrief();
      expect(brief.markdown).toContain("Reorientation Brief");
      expect(brief.currentObjective).toBeNull();
    });

    it("handles unicode in summary", () => {
      const a = engine.recordAnchor("decision", "Use 你好 for testing 🚀");
      expect(a.id).toMatch(/^anc_/);
    });

    it("handles many file paths in single anchor", () => {
      const files = Array.from({ length: 50 }, (_, i) => `f${i}.ts`);
      const a = engine.recordAnchor("milestone", "Touch many files", { files });
      expect(a.files.length).toBe(50);
    });

    it("persists across engine instances", () => {
      engine.recordAnchor("decision", "Persisted decision");
      const engine2 = new SessionReorientationEngine();
      expect(engine2.getAnchors().length).toBe(1);
    });
  });

  describe("config tuning", () => {
    it("updateConfig merges with existing config", () => {
      const cfg = engine.updateConfig({ promptInterval: 25 });
      expect(cfg.promptInterval).toBe(25);
      expect(cfg.toolCallInterval).toBe(50); // default preserved
    });
  });
});
