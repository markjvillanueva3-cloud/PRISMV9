/**
 * WikiRecallCounter.write-events.test.ts — OBSIDIAN-INTELLIGENCE-MS3 / U-REREAD-SIGNAL-FINISH (A2)
 *
 * Verifies that the wiki-recall-on-write.mjs PostToolUse hook records Write|Edit|MultiEdit
 * events on vault files into the same `wiki-recall-counts.json` sidecar that the existing
 * Read-side `recall-counter-track.mjs` writes to. Without this, a memo or wiki entry that
 * is only WRITTEN (never read back in the same session) shows count=0 forever — defeating
 * the compounding-signal premise.
 *
 * Tests are deliberately at the hook helper-function layer (not subprocess spawning) so
 * the assertions are deterministic and don't depend on Node's hook-runner being available
 * in the vitest environment.
 *
 * @milestone OBSIDIAN-INTELLIGENCE-MS3/A2
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
// @ts-expect-error — hook is a sibling .mjs in /.claude/hooks; vitest resolves dynamic url.
import * as writeHook from "../../../.claude/hooks/wiki-recall-on-write.mjs";

const SCHEMA_VERSION = "1.0.0";

type RecallEntry = { kind: string; key: string; count: number; firstSeenIso: string; lastSeenIso: string };
type RecallState = { schemaVersion: string; totalRecalls: number; entryCount: number; updatedAtIso: string; entries: Record<string, RecallEntry> };

function freshTmp(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wiki-recall-write-"));
  return path.join(dir, "wiki-recall-counts.json");
}

function readState(file: string): RecallState {
  return JSON.parse(fs.readFileSync(file, "utf8")) as RecallState;
}

describe("wiki-recall-on-write — A2 write-side counter", () => {
  let stateFile: string;

  beforeEach(() => {
    stateFile = freshTmp();
  });

  afterEach(() => {
    try { fs.rmSync(path.dirname(stateFile), { recursive: true, force: true }); } catch { /* tolerate */ }
  });

  describe("isWriteTool", () => {
    it("matches Write|Edit|MultiEdit and rejects everything else", () => {
      expect(writeHook.isWriteTool("Write")).toBe(true);
      expect(writeHook.isWriteTool("Edit")).toBe(true);
      expect(writeHook.isWriteTool("MultiEdit")).toBe(true);
      expect(writeHook.isWriteTool("Read")).toBe(false);
      expect(writeHook.isWriteTool("Bash")).toBe(false);
      expect(writeHook.isWriteTool("")).toBe(false);
      expect(writeHook.isWriteTool(null)).toBe(false);
      expect(writeHook.isWriteTool(undefined)).toBe(false);
    });
  });

  describe("isVaultPath", () => {
    it("matches memory + wiki + auto-memory-source paths; rejects engines and tests", () => {
      expect(writeHook.isVaultPath("H:/prism/knowledge/memories/feedback/feedback_x.md")).toBe(true);
      expect(writeHook.isVaultPath("H:/prism/knowledge/wiki/architecture/foo.md")).toBe(true);
      expect(writeHook.isVaultPath("C:\\Users\\me\\.claude\\projects\\H--PRISM\\memory\\bar.md")).toBe(true);
      expect(writeHook.isVaultPath("H:/prism/mcp-server/src/engines/Foo.ts")).toBe(false);
      expect(writeHook.isVaultPath("H:/prism/mcp-server/src/__tests__/foo.test.ts")).toBe(false);
      expect(writeHook.isVaultPath("")).toBe(false);
      expect(writeHook.isVaultPath(null)).toBe(false);
    });
  });

  describe("deriveKey", () => {
    it("derives stable kind/key for memory/wiki/auto-memory-source paths", () => {
      expect(writeHook.deriveKey("H:/prism/knowledge/memories/feedback/feedback_x.md"))
        .toEqual({ kind: "memory", key: "memory/feedback/feedback_x" });
      expect(writeHook.deriveKey("H:/prism/knowledge/wiki/architecture/component-foo.md"))
        .toEqual({ kind: "wiki", key: "wiki/architecture/component-foo" });
      expect(writeHook.deriveKey("C:\\Users\\me\\.claude\\projects\\H--PRISM\\memory\\reference_bar.md"))
        .toEqual({ kind: "memory", key: "memory/source/reference_bar" });
      expect(writeHook.deriveKey("H:/prism/mcp-server/src/engines/Foo.ts")).toBeNull();
      expect(writeHook.deriveKey("")).toBeNull();
    });
  });

  describe("recordWriteEvent — increment math (the core A2 invariant)", () => {
    it("Write tool increments count by exactly 1 from zero — schema matches read-side counter", () => {
      const r = writeHook.recordWriteEvent(
        "H:/prism/knowledge/memories/feedback/feedback_write_test.md",
        "Write",
        { stateFile },
      );
      expect(r.ok).toBe(true);
      expect(r.count).toBe(1);
      expect(r.key).toBe("memory/feedback/feedback_write_test");

      const state = readState(stateFile);
      expect(state.schemaVersion).toBe(SCHEMA_VERSION);
      expect(state.totalRecalls).toBe(1);
      expect(state.entryCount).toBe(1);
      const entry = state.entries["memory/feedback/feedback_write_test"];
      expect(entry.count).toBe(1);
      expect(entry.kind).toBe("memory");
      expect(entry.key).toBe("memory/feedback/feedback_write_test");
      // first write: lastSeen MUST equal firstSeen (single timestamp at creation)
      expect(entry.lastSeenIso).toBe(entry.firstSeenIso);
    });

    it("Edit tool increments count by exactly 1 with wiki kind", () => {
      const r = writeHook.recordWriteEvent(
        "H:/prism/knowledge/wiki/architecture/foo.md",
        "Edit",
        { stateFile },
      );
      expect(r.ok).toBe(true);
      expect(r.count).toBe(1);
      expect(r.key).toBe("wiki/architecture/foo");
      const state = readState(stateFile);
      expect(state.entries["wiki/architecture/foo"].count).toBe(1);
      expect(state.entries["wiki/architecture/foo"].kind).toBe("wiki");
      expect(state.totalRecalls).toBe(1);
    });

    it("MultiEdit counts as one write event per call (not per edit in batch)", () => {
      const r = writeHook.recordWriteEvent(
        "H:/prism/knowledge/memories/reference/reference_y.md",
        "MultiEdit",
        { stateFile },
      );
      expect(r.ok).toBe(true);
      expect(r.count).toBe(1);
      const state = readState(stateFile);
      expect(state.totalRecalls).toBe(1);
      expect(state.entryCount).toBe(1);
      expect(state.entries["memory/reference/reference_y"].count).toBe(1);
    });

    it("three consecutive write events to same path → count=3, single entry, lastSeen advances", async () => {
      const p = "H:/prism/knowledge/memories/feedback/feedback_seq.md";
      const r1 = writeHook.recordWriteEvent(p, "Write", { stateFile });
      // 2ms pause so lastSeenIso advances (ISO timestamps are ms-resolution)
      await new Promise((res) => setTimeout(res, 5));
      const r2 = writeHook.recordWriteEvent(p, "Edit", { stateFile });
      await new Promise((res) => setTimeout(res, 5));
      const r3 = writeHook.recordWriteEvent(p, "MultiEdit", { stateFile });

      expect(r1.count).toBe(1);
      expect(r2.count).toBe(2);
      expect(r3.count).toBe(3);

      const state = readState(stateFile);
      expect(state.entries["memory/feedback/feedback_seq"].count).toBe(3);
      expect(state.entryCount).toBe(1);
      expect(state.totalRecalls).toBe(3);
      const e = state.entries["memory/feedback/feedback_seq"];
      expect(e.lastSeenIso > e.firstSeenIso).toBe(true);
    });

    it("two different paths produce two separate entries with correct kinds", () => {
      writeHook.recordWriteEvent(
        "H:/prism/knowledge/memories/feedback/a.md",
        "Write",
        { stateFile },
      );
      writeHook.recordWriteEvent(
        "H:/prism/knowledge/wiki/architecture/b.md",
        "Edit",
        { stateFile },
      );
      const state = readState(stateFile);
      expect(state.entryCount).toBe(2);
      expect(state.totalRecalls).toBe(2);
      expect(state.entries["memory/feedback/a"].kind).toBe("memory");
      expect(state.entries["memory/feedback/a"].count).toBe(1);
      expect(state.entries["wiki/architecture/b"].kind).toBe("wiki");
      expect(state.entries["wiki/architecture/b"].count).toBe(1);
    });
  });

  describe("recordWriteEvent — rejection paths (state file untouched)", () => {
    it("rejects Read tool name with reason='not-a-write-tool' (read-side counter handles that)", () => {
      const r = writeHook.recordWriteEvent(
        "H:/prism/knowledge/memories/feedback/x.md",
        "Read",
        { stateFile },
      );
      expect(r.ok).toBe(false);
      expect(r.reason).toBe("not-a-write-tool");
      expect(fs.existsSync(stateFile)).toBe(false);
    });

    it("rejects non-md file extensions with reason='not-a-md-file'", () => {
      const r = writeHook.recordWriteEvent(
        "H:/prism/knowledge/memories/feedback/x.json",
        "Write",
        { stateFile },
      );
      expect(r.ok).toBe(false);
      expect(r.reason).toBe("not-a-md-file");
      expect(fs.existsSync(stateFile)).toBe(false);
    });

    it("rejects paths outside the memory/wiki/auto-memory roots with reason='not-a-vault-path'", () => {
      const r = writeHook.recordWriteEvent(
        "H:/prism/mcp-server/src/engines/Foo.md",
        "Write",
        { stateFile },
      );
      expect(r.ok).toBe(false);
      expect(r.reason).toBe("not-a-vault-path");
      expect(fs.existsSync(stateFile)).toBe(false);
    });

    it("rejects empty filePath with reason='not-a-md-file'", () => {
      const r = writeHook.recordWriteEvent("", "Write", { stateFile });
      expect(r.ok).toBe(false);
      expect(r.reason).toBe("not-a-md-file");
      expect(fs.existsSync(stateFile)).toBe(false);
    });
  });

  describe("schema integrity vs WikiRecallCounterEngine", () => {
    it("produces schemaVersion 1.0.0 matching the Read-side counter", () => {
      writeHook.recordWriteEvent(
        "H:/prism/knowledge/memories/feedback/schema_test.md",
        "Write",
        { stateFile },
      );
      const state = readState(stateFile);
      expect(state.schemaVersion).toBe(SCHEMA_VERSION);
      expect(state.totalRecalls).toBe(1);
      expect(state.entryCount).toBe(1);
      const e = state.entries["memory/feedback/schema_test"];
      expect(e.kind).toBe("memory");
      expect(e.key).toBe("memory/feedback/schema_test");
      expect(e.count).toBe(1);
      // ISO-8601 format check via parseable Date round-trip
      expect(new Date(e.firstSeenIso).toISOString()).toBe(e.firstSeenIso);
      expect(new Date(e.lastSeenIso).toISOString()).toBe(e.lastSeenIso);
    });

    it("invariant: totalRecalls equals sum of per-entry counts across mixed kinds", () => {
      writeHook.recordWriteEvent("H:/prism/knowledge/memories/feedback/a.md", "Write", { stateFile });
      writeHook.recordWriteEvent("H:/prism/knowledge/memories/feedback/a.md", "Edit", { stateFile });
      writeHook.recordWriteEvent("H:/prism/knowledge/wiki/architecture/b.md", "Write", { stateFile });
      writeHook.recordWriteEvent("H:/prism/knowledge/wiki/architecture/b.md", "MultiEdit", { stateFile });
      writeHook.recordWriteEvent("H:/prism/knowledge/wiki/architecture/b.md", "Edit", { stateFile });

      const state = readState(stateFile);
      const sum = Object.values(state.entries).reduce<number>((acc, e) => acc + e.count, 0);
      expect(sum).toBe(state.totalRecalls);
      expect(state.totalRecalls).toBe(5);
      expect(state.entryCount).toBe(2);
      expect(state.entries["memory/feedback/a"].count).toBe(2);
      expect(state.entries["wiki/architecture/b"].count).toBe(3);
    });
  });
});
