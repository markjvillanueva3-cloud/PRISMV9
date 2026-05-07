/**
 * inbox-lag-advisory.test.ts — vitest coverage for the OBSIDIAN-COMPOUND-MS1 U-INBOX-LAYER
 * Stop hook scanner. Verifies findStaleFiles + buildResponse exports.
 *
 * Coverage:
 *   - Happy path: mixed-age dir reports only stale entries
 *   - Threshold boundary: file at exactly threshold age is NOT stale (strict >)
 *   - Empty dir: returns plain continue:true
 *   - Missing dir: returns empty array (no throw)
 *   - .gitkeep + dotfiles ignored
 *   - Subdirectories ignored (only files counted)
 *   - Adversarial: many stale files - response is capped at MAX_REPORT=5 with overflow note
 *   - Adversarial: zero-byte file with old mtime is still flagged (size-agnostic)
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, utimesSync, existsSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { findStaleFiles, buildResponse } from "../../../.claude/hooks/inbox-lag-advisory.mjs";

const HOUR_MS = 60 * 60 * 1000;
const THRESHOLD_MS = 72 * HOUR_MS;

function makeTmpDir(): string {
  return mkdtempSync(join(tmpdir(), "prism-inbox-test-"));
}

function writeWithMtime(path: string, content: string, mtimeMs: number): void {
  writeFileSync(path, content);
  const t = mtimeMs / 1000;
  utimesSync(path, t, t);
}

describe("inbox-lag-advisory.findStaleFiles", () => {
  let dir: string;
  const NOW = 1_700_000_000_000;

  beforeEach(() => { dir = makeTmpDir(); });
  afterEach(() => { if (existsSync(dir)) rmSync(dir, { recursive: true, force: true }); });

  it("returns only files older than threshold", () => {
    writeWithMtime(join(dir, "fresh.md"), "x", NOW - 10 * HOUR_MS);
    writeWithMtime(join(dir, "stale.md"), "y", NOW - 100 * HOUR_MS);
    const stale = findStaleFiles(dir, THRESHOLD_MS, NOW);
    expect(stale).toHaveLength(1);
    expect(stale[0].name).toBe("stale.md");
    expect(stale[0].ageHours).toBe(100);
  });

  it("treats threshold as strict greater-than (file at exactly threshold is NOT stale)", () => {
    writeWithMtime(join(dir, "boundary.md"), "z", NOW - THRESHOLD_MS);
    const stale = findStaleFiles(dir, THRESHOLD_MS, NOW);
    expect(stale).toEqual([]);
  });

  it("ignores .gitkeep and dotfiles", () => {
    writeWithMtime(join(dir, ".gitkeep"), "", NOW - 1000 * HOUR_MS);
    writeWithMtime(join(dir, ".hidden"), "h", NOW - 1000 * HOUR_MS);
    writeWithMtime(join(dir, "real.md"), "r", NOW - 1000 * HOUR_MS);
    const stale = findStaleFiles(dir, THRESHOLD_MS, NOW);
    expect(stale.map((s) => s.name)).toEqual(["real.md"]);
  });

  it("ignores subdirectories (only files counted)", () => {
    mkdirSync(join(dir, "old-subdir"));
    utimesSync(join(dir, "old-subdir"), (NOW - 1000 * HOUR_MS) / 1000, (NOW - 1000 * HOUR_MS) / 1000);
    writeWithMtime(join(dir, "real.md"), "r", NOW - 100 * HOUR_MS);
    const stale = findStaleFiles(dir, THRESHOLD_MS, NOW);
    expect(stale.map((s) => s.name)).toEqual(["real.md"]);
  });

  it("returns empty array on missing directory (no throw)", () => {
    const missing = join(dir, "does-not-exist");
    expect(findStaleFiles(missing, THRESHOLD_MS, NOW)).toEqual([]);
  });

  it("returns empty array on empty directory", () => {
    expect(findStaleFiles(dir, THRESHOLD_MS, NOW)).toEqual([]);
  });

  it("flags zero-byte file (size-agnostic)", () => {
    writeWithMtime(join(dir, "empty.md"), "", NOW - 100 * HOUR_MS);
    const stale = findStaleFiles(dir, THRESHOLD_MS, NOW);
    expect(stale).toHaveLength(1);
    expect(stale[0].name).toBe("empty.md");
  });
});

describe("inbox-lag-advisory.buildResponse", () => {
  it("returns plain continue:true when no stale files", () => {
    expect(buildResponse([])).toEqual({ continue: true });
  });

  it("returns Stop hook advisory when stale files present", () => {
    const r = buildResponse([{ name: "a.md", ageHours: 100 }]);
    expect(r.continue).toBe(true);
    expect(r.hookSpecificOutput?.hookEventName).toBe("Stop");
    expect(r.hookSpecificOutput?.additionalContext).toContain("inbox-lag: 1 file(s)");
    expect(r.hookSpecificOutput?.additionalContext).toContain("a.md (100h)");
    expect(r.hookSpecificOutput?.additionalContext).toContain("/weekly-synthesis");
    expect(r.hookSpecificOutput?.additionalContext).toContain("cyrilXBT");
  });

  it("caps report at 5 entries with overflow note", () => {
    const stale = Array.from({ length: 8 }, (_, i) => ({ name: `f${i}.md`, ageHours: 100 + i }));
    const r = buildResponse(stale);
    const ctx = r.hookSpecificOutput!.additionalContext as string;
    expect(ctx).toContain("8 file(s)");
    expect(ctx).toContain("f0.md");
    expect(ctx).toContain("f4.md");
    expect(ctx).not.toContain("f5.md");
    expect(ctx).toContain("and 3 more");
  });

  it("uses custom threshold when provided", () => {
    const r = buildResponse([{ name: "x.md", ageHours: 50 }], 24);
    expect(r.hookSpecificOutput?.additionalContext).toContain("older than 24h");
  });
});
