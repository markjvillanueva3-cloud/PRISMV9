/**
 * ConsensusQuorumEngine — U-OCN05 test suite (OCTOPUS-NEURAL-MS0).
 *
 * Covers the 6 cases the atomized spec calls out plus the two adversarial
 * scenarios (mislabeled safety-critical, oversized 1000-file diff).
 *
 *   1. minor: 1 small config file → 2-of-3
 *   2. major: src/engines/Foo.ts + dispatcher edit → 3-of-3
 *   3. safety-critical: physics/constants.ts touched → 5-of-5
 *   4. test-only: __tests__/Foo.test.ts only → 1-of-1
 *   5. docs-only: README.md + wiki entry only → 1-of-1
 *   6. mixed: engine + test + doc in one diff → 3-of-3 (mixed/major)
 *   + 7. adversarial: physics constants hidden inside an otherwise-minor diff (1 file, path matches) → 5-of-5
 *   + 8. adversarial: 1000-file oversized diff → mixed/major escalation
 *   + 9. content-pattern safety: file with raw `kc1.1 =` in patch → 5-of-5
 *  + 10. commit-subject hint: "SAFETY-CRITICAL" in subject → escalates
 *  + 11. unknown class → escalates to major (3-of-3) safety-net
 *  + 12. validate inputs
 *  + 13. dispatcher round-trip prism_safety:quorum_required
 *
 * @module __tests__/ConsensusQuorumEngine.test
 * @milestone OCTOPUS-NEURAL-MS0/U-OCN05
 */

import { describe, it, expect } from "vitest";
import { ConsensusQuorumEngine, type DiffFile } from "../engines/ConsensusQuorumEngine.js";

function f(path: string, patch?: string): DiffFile {
  return { path, addedLines: 5, removedLines: 1, patch };
}

describe("ConsensusQuorumEngine — U-OCN05 dynamic quorum classification", () => {
  // 1. minor: 1 small config file → 2-of-3
  it("minor: 1 small config file (.json) → 2-of-3, no escalation", () => {
    const eng = new ConsensusQuorumEngine();
    const d = eng.classify({ files: [f("mcp-server/data/state/some-config.json")] });
    expect(d.category).toBe("minor");
    expect(d.recommendedN).toBe(2);
    expect(d.recommendedM).toBe(3);
    expect(d.tentacles).toEqual(["codex", "claude-a", "claude-b"]);
    expect(d.escalated).toBe(false);
  });

  // 2. major: src/engines/Foo.ts + dispatcher edit → 3-of-3
  it("major: engine + dispatcher edits → 3-of-3", () => {
    const eng = new ConsensusQuorumEngine();
    const d = eng.classify({
      files: [
        f("mcp-server/src/engines/FooEngine.ts"),
        f("mcp-server/src/tools/dispatchers/fooDispatcher.ts"),
      ],
    });
    expect(d.category).toBe("major");
    expect(d.recommendedN).toBe(3);
    expect(d.recommendedM).toBe(3);
    expect(d.tentacles).toEqual(["codex", "claude-a", "claude-b"]);
    expect(d.signals.some((s) => s.startsWith("major-paths:"))).toBe(true);
  });

  // 3. safety-critical: physics/constants.ts touched → 5-of-5
  it("safety-critical: physics/constants.ts touched → 5-of-5, full tentacle pool", () => {
    const eng = new ConsensusQuorumEngine();
    const d = eng.classify({ files: [f("mcp-server/src/physics/constants.ts")] });
    expect(d.category).toBe("safety-critical");
    expect(d.recommendedN).toBe(5);
    expect(d.recommendedM).toBe(5);
    expect(d.tentacles).toEqual(["codex", "claude-a", "claude-b", "kimi-k2", "gemini"]);
    expect(d.signals.some((s) => s.startsWith("safety:path:"))).toBe(true);
  });

  // 4. test-only: __tests__/Foo.test.ts only → 1-of-1
  it("test-only: all files match __tests__/*.test.ts → 1-of-1 (claude-a)", () => {
    const eng = new ConsensusQuorumEngine();
    const d = eng.classify({
      files: [
        f("mcp-server/src/__tests__/FooEngine.test.ts"),
        f("mcp-server/src/__tests__/BarEngine.test.ts"),
      ],
    });
    expect(d.category).toBe("test-only");
    expect(d.recommendedN).toBe(1);
    expect(d.recommendedM).toBe(1);
    expect(d.tentacles).toEqual(["claude-a"]);
  });

  // 5. docs-only: README.md + wiki entry → 1-of-1
  it("docs-only: all files match docs/wiki/*.md → 1-of-1", () => {
    const eng = new ConsensusQuorumEngine();
    const d = eng.classify({
      files: [
        f("README.md"),
        f("knowledge/wiki/architecture/foo.md"),
      ],
    });
    expect(d.category).toBe("docs-only");
    expect(d.recommendedN).toBe(1);
    expect(d.recommendedM).toBe(1);
  });

  // 6. mixed: engine + test + doc spans domains → 3-of-3 (mixed or major)
  it("mixed: engine + test + doc spans domains → 3-of-3", () => {
    const eng = new ConsensusQuorumEngine();
    const d = eng.classify({
      files: [
        f("mcp-server/src/engines/FooEngine.ts"),
        f("mcp-server/src/__tests__/FooEngine.test.ts"),
        f("knowledge/wiki/architecture/engines/fooengine.md"),
      ],
    });
    // engine signal hits first → category=major (engine-paths beats mixed for precedence).
    expect(["major", "mixed"]).toContain(d.category);
    expect(d.recommendedN).toBe(3);
    expect(d.recommendedM).toBe(3);
  });

  // 7. adversarial: mislabeled — minor diff with physics path → safety-net catches it
  it("adversarial: 1-file diff but path matches physics/ → safety-critical wins, NOT minor", () => {
    const eng = new ConsensusQuorumEngine();
    const d = eng.classify({
      files: [f("mcp-server/src/physics/cuttingForceModel.ts")],
      commitSubject: "[REFACTOR] tiny tweak",  // adversarial: subject doesn't hint at safety
    });
    expect(d.category).toBe("safety-critical");
    expect(d.recommendedN).toBe(5);
    expect(d.signals.some((s) => s.startsWith("safety:path:"))).toBe(true);
  });

  // 8. adversarial: 1000-file oversized diff → escalation
  it("oversized: 1000-file diff with no safety hits → escalates to major (oversized signal)", () => {
    const eng = new ConsensusQuorumEngine();
    const files: DiffFile[] = [];
    for (let i = 0; i < 1000; i++) files.push(f(`docs/auto/page-${i}.md`));
    const d = eng.classify({ files });
    expect(d.oversized).toBe(true);
    expect(d.fileCount).toBe(1000);
    // 1000 .md files would naively be docs-only, but oversized + the safety-net force ≥ major.
    expect(d.escalated).toBe(true);
    expect(d.category).toBe("major");
    expect(d.recommendedN).toBe(3);
    expect(d.recommendedM).toBe(3);
    expect(d.signals.some((s) => s.startsWith("oversized:"))).toBe(true);
  });

  // 9. content-pattern safety: a non-physics path with kc1.1 = ... in patch
  it("content pattern safety: file containing raw `kc1.1 =` in patch → safety-critical", () => {
    const eng = new ConsensusQuorumEngine();
    const d = eng.classify({
      files: [f("mcp-server/src/engines/MyNewEngine.ts", "const kc1_1: number = 1800;")],
    });
    expect(d.category).toBe("safety-critical");
    expect(d.signals.some((s) => s.startsWith("safety:content:"))).toBe(true);
  });

  // 10. commit-subject hint: "SAFETY" in subject escalates non-safety files
  it("commit-subject hint: subject mentioning SAFETY/PHYSICS escalates a docs-only diff to safety-critical", () => {
    const eng = new ConsensusQuorumEngine();
    const d = eng.classify({
      files: [f("README.md")],
      commitSubject: "[SAFETY-CRITICAL] documentation of new physics rule",
    });
    expect(d.escalated).toBe(true);
    expect(d.category).toBe("safety-critical");
    expect(d.rawCategory).toBe("docs-only");
    expect(d.signals.some((s) => s.startsWith("subject-hint:"))).toBe(true);
  });

  // 11. unknown class → escalates to major (safety-net)
  it("unknown class: empty file list → safety-net escalates to major", () => {
    const eng = new ConsensusQuorumEngine();
    const d = eng.classify({ files: [] });
    expect(d.rawCategory).toBe("unknown");
    expect(d.escalated).toBe(true);
    expect(d.category).toBe("major");
    expect(d.recommendedN).toBe(3);
  });

  // 12. validate inputs
  it("validate: rejects non-object DiffInput / non-array files / empty path", () => {
    const eng = new ConsensusQuorumEngine();
    expect(() => eng.classify(null as never)).toThrow(/DiffInput/);
    expect(() => eng.classify({ files: "x" as never })).toThrow(/files must be an array/);
    expect(() => eng.classify({ files: [{ path: "" }] })).toThrow(/path must be a non-empty/);
  });

  // 13. variant: 5 small TS files NOT in major paths → minor (under MINOR_MAX_FILES=5)
  it("minor variant: 5 small utility files not matching major paths → minor 2-of-3", () => {
    const eng = new ConsensusQuorumEngine();
    const d = eng.classify({
      files: [
        f("mcp-server/src/utils/Logger.ts"),
        f("mcp-server/src/utils/atomicWrite.ts"),
        f("mcp-server/src/utils/dispatcherMiddleware.ts"),
        f("mcp-server/src/utils/pipelineCheckpoint.ts"),
        f("mcp-server/src/utils/successPattern.ts"),
      ],
    });
    expect(d.category).toBe("minor");
    expect(d.recommendedN).toBe(2);
    expect(d.recommendedM).toBe(3);
  });

  // 14. major-by-count: 12 utility files (above MAJOR_FILE_COUNT_FLOOR=10) → major
  it("major-by-count: 12 utility files (no engine paths) → major from file-count floor", () => {
    const eng = new ConsensusQuorumEngine();
    const files: DiffFile[] = [];
    for (let i = 0; i < 12; i++) files.push(f(`mcp-server/src/utils/Tool${i}.ts`));
    const d = eng.classify({ files });
    expect(d.category).toBe("major");
    expect(d.recommendedN).toBe(3);
  });

  // 15. rationale + signals are non-empty
  it("rationale: always populated; signals[] documents the classification trail", () => {
    const eng = new ConsensusQuorumEngine();
    const d = eng.classify({ files: [f("mcp-server/src/physics/constants.ts")] });
    expect(d.rationale).toContain("Classification:");
    expect(d.rationale).toContain("safety-critical");
    expect(d.signals.length).toBeGreaterThan(0);
  });
});

// ─── dispatcher round-trip ─────────────────────────────────────────────────
describe("prism_safety:quorum_required — dispatcher round-trip (U-OCN05 wiring)", () => {
  it("dispatches through prism_safety dispatcher → returns quorum decision", async () => {
    // The safety dispatcher uses a router setup we mock with a minimal McpServer stub.
    const captured: { tool?: string; cb?: (args: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> } = {};
    const mockServer = {
      tool: (
        name: string,
        _desc: string,
        _schema: unknown,
        cb: (args: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>,
      ) => { captured.tool = name; captured.cb = cb; },
    };
    const { registerSafetyDispatcher } = await import("../tools/dispatchers/safetyDispatcher.js");
    registerSafetyDispatcher(mockServer);
    expect(captured.tool).toBe("prism_safety");
    if (!captured.cb) throw new Error("dispatcher callback not captured");
    const out = await captured.cb({
      action: "quorum_required",
      params: {
        files: [{ path: "mcp-server/src/physics/constants.ts" }],
        commit_subject: "[OCN05] physics constant tweak",
      },
    });
    const payload = JSON.parse(out.content[0].text) as { category: string; recommendedN: number; recommendedM: number };
    expect(payload.category).toBe("safety-critical");
    expect(payload.recommendedN).toBe(5);
    expect(payload.recommendedM).toBe(5);
  });
});
