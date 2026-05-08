/**
 * InboxCaptureSharpenHook.test.ts
 *
 * OBSIDIAN-AUTOMATE-MS3/U-INBOX-CAPTURE-SHARPEN
 *
 * Drives the PostToolUse hook's `processInboxFile` export against synthetic
 * inbox notes — asserts assessment block is appended, exempt files are
 * skipped, missing files are skipped, and re-firing replaces (not duplicates)
 * the metadata block.
 *
 * 12 it() cases.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { processInboxFile, MARKER_BEGIN, MARKER_END, stripBoilerplate, spliceBlock } from "../../../.claude/hooks/inbox-capture-sharpen.mjs";
import { captureSharpenEngine } from "../engines/CaptureSharpenEngine.js";

let tmpRoot: string;
let inbox: string;

const SHARP_NOTE = "Bookmarks-per-impression beats raw impressions because it measures intent to return, not reach.";

beforeEach(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), "inbox-hook-"));
  inbox = join(tmpRoot, "knowledge", "memories", "inbox");
  mkdirSync(inbox, { recursive: true });
});

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

describe("inbox-capture-sharpen hook (PostToolUse)", () => {
  // -------------------- HAPPY PATHS --------------------

  it("appends a managed block for a sharp note in inbox/", async () => {
    const f = join(inbox, "note-a.md");
    writeFileSync(f, SHARP_NOTE, "utf8");
    const r = await processInboxFile(f, { engine: captureSharpenEngine });
    expect(r.decision).toBe("applied");
    const body = readFileSync(f, "utf8");
    expect(body).toContain(MARKER_BEGIN);
    expect(body).toContain(MARKER_END);
    expect(body).toMatch(/score: \d\.\d{2}/);
    expect(body).toMatch(/classification: (observations|reactions|patterns|questions|numbers)/);
  });

  it("preserves the user's authored prose unchanged above the block", async () => {
    const f = join(inbox, "note-b.md");
    writeFileSync(f, SHARP_NOTE, "utf8");
    await processInboxFile(f, { engine: captureSharpenEngine });
    const body = readFileSync(f, "utf8");
    expect(body.startsWith(SHARP_NOTE)).toBe(true);
  });

  it("re-running on the same file replaces the block — does not stack", async () => {
    const f = join(inbox, "note-c.md");
    writeFileSync(f, SHARP_NOTE, "utf8");
    await processInboxFile(f, { engine: captureSharpenEngine });
    await processInboxFile(f, { engine: captureSharpenEngine });
    const body = readFileSync(f, "utf8");
    const matches = body.match(new RegExp(MARKER_BEGIN, "g")) ?? [];
    expect(matches.length).toBe(1);
  });

  it("dry-run does not write to disk", async () => {
    const f = join(inbox, "note-d.md");
    writeFileSync(f, SHARP_NOTE, "utf8");
    const before = readFileSync(f, "utf8");
    const r = await processInboxFile(f, { engine: captureSharpenEngine, dryRun: true });
    expect(r.decision).toBe("dry-run");
    expect(r.next).toContain(MARKER_BEGIN);
    expect(readFileSync(f, "utf8")).toBe(before);
  });

  it("preserves frontmatter when present", async () => {
    const f = join(inbox, "note-e.md");
    const fm = "---\ntype: observation\nsource: voice-memo\n---\n\n" + SHARP_NOTE;
    writeFileSync(f, fm, "utf8");
    await processInboxFile(f, { engine: captureSharpenEngine });
    const body = readFileSync(f, "utf8");
    expect(body.startsWith("---\ntype: observation")).toBe(true);
    expect(body).toContain(MARKER_BEGIN);
  });

  // -------------------- EDGE CASES --------------------

  it("skips files outside knowledge/memories/inbox/", async () => {
    const elsewhere = join(tmpRoot, "elsewhere.md");
    writeFileSync(elsewhere, SHARP_NOTE, "utf8");
    const r = await processInboxFile(elsewhere, { engine: captureSharpenEngine });
    expect(r.decision).toBe("skip-not-inbox");
  });

  it("skips brief-* files (machine-generated)", async () => {
    const f = join(inbox, "brief-2026-05-08.md");
    writeFileSync(f, SHARP_NOTE, "utf8");
    const r = await processInboxFile(f, { engine: captureSharpenEngine });
    expect(r.decision).toBe("skip-exempt");
  });

  it("skips perf-report-* files", async () => {
    const f = join(inbox, "perf-report-2026-04.md");
    writeFileSync(f, SHARP_NOTE, "utf8");
    const r = await processInboxFile(f, { engine: captureSharpenEngine });
    expect(r.decision).toBe("skip-exempt");
  });

  it("skips resources-* files", async () => {
    const f = join(inbox, "resources-haas-manual-abc123-2026-05-08.md");
    writeFileSync(f, SHARP_NOTE, "utf8");
    const r = await processInboxFile(f, { engine: captureSharpenEngine });
    expect(r.decision).toBe("skip-exempt");
  });

  it("skips missing files (race-safe)", async () => {
    const f = join(inbox, "ghost.md");
    const r = await processInboxFile(f, { engine: captureSharpenEngine });
    expect(r.decision).toBe("skip-missing");
  });

  it("skips files too short to assess", async () => {
    const f = join(inbox, "stub.md");
    writeFileSync(f, "x", "utf8");
    const r = await processInboxFile(f, { engine: captureSharpenEngine });
    expect(r.decision).toBe("skip-too-short");
  });

  it("stripBoilerplate removes both frontmatter and existing capture-sharpen block", () => {
    const body = "---\nfoo: bar\n---\n\nThe sharp claim.\n\n" + MARKER_BEGIN + "\n<!-- old -->\n" + MARKER_END;
    const stripped = stripBoilerplate(body);
    expect(stripped).toBe("The sharp claim.");
  });

  it("spliceBlock appends to a body without an existing block", () => {
    const body = "Hello world.\n";
    const block = MARKER_BEGIN + "\n<!-- meta -->\n" + MARKER_END;
    const next = spliceBlock(body, block);
    expect(next).toContain("Hello world.");
    expect(next).toContain(MARKER_BEGIN);
    expect((next.match(new RegExp(MARKER_BEGIN, "g")) ?? []).length).toBe(1);
  });
});
