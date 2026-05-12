/**
 * directive-freshness — Directive Freshness Gate tests (CPP-MS4-U-CPP33)
 *
 * Validates the pure classification logic exported from compact-restore.mjs:
 * given a directive list + mtimes, files >staleDays old are bucketed as stale,
 * missing files as missing, and the formatter emits null for all-fresh state.
 *
 * Uses a tmp directory + utimes to control mtime precisely; no real
 * state/shared/ dependency so the test is deterministic.
 *
 * @milestone CPP-MS4-U-CPP33
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
// @ts-expect-error — .mjs exports are resolved at runtime by vitest; no .d.ts needed
import { checkDirectiveFreshness, formatFreshnessBlock } from "../../../.claude/helpers/compact-restore.mjs";

const DAY_MS = 24 * 60 * 60 * 1000;
let tmpDir: string;

async function writeWithMtime(name: string, ageDays: number): Promise<void> {
  const fp = path.join(tmpDir, name);
  await fs.writeFile(fp, "x");
  const when = new Date(Date.now() - ageDays * DAY_MS);
  await fs.utimes(fp, when, when);
}

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "directive-freshness-"));
  await writeWithMtime("fresh-1d.md", 1);
  await writeWithMtime("fresh-6d.md", 6);
  await writeWithMtime("stale-8d.md", 8);
  await writeWithMtime("stale-30d.md", 30);
});

afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("checkDirectiveFreshness() (CPP-MS4-U-CPP33)", () => {
  it("classifies files <7d as fresh (not in stale list)", async () => {
    const result = await checkDirectiveFreshness({
      directives: ["fresh-1d.md", "fresh-6d.md"],
      directiveDir: tmpDir,
      staleDays: 7,
      now: Date.now(),
    });
    expect(result.stale).toEqual([]);
    expect(result.missing).toEqual([]);
  });

  it("classifies files >7d as stale with ageDays filled in", async () => {
    const result = await checkDirectiveFreshness({
      directives: ["stale-8d.md", "stale-30d.md"],
      directiveDir: tmpDir,
      staleDays: 7,
      now: Date.now(),
    });
    expect(result.stale).toHaveLength(2);
    expect(result.stale[0].name).toBe("stale-8d.md");
    expect(result.stale[0].ageDays).toBeGreaterThanOrEqual(7);
    expect(result.stale[0].ageDays).toBeLessThanOrEqual(9);
    expect(result.stale[1].name).toBe("stale-30d.md");
    expect(result.stale[1].ageDays).toBeGreaterThanOrEqual(29);
  });

  it("lists non-existent files under missing, not stale", async () => {
    const result = await checkDirectiveFreshness({
      directives: ["does-not-exist.md", "fresh-1d.md"],
      directiveDir: tmpDir,
      staleDays: 7,
      now: Date.now(),
    });
    expect(result.stale).toEqual([]);
    expect(result.missing).toEqual(["does-not-exist.md"]);
  });

  it("respects custom staleDays threshold", async () => {
    const result = await checkDirectiveFreshness({
      directives: ["fresh-6d.md", "stale-8d.md"],
      directiveDir: tmpDir,
      staleDays: 5, // tighter threshold
      now: Date.now(),
    });
    expect(result.stale.map((s: { name: string }) => s.name)).toEqual(["fresh-6d.md", "stale-8d.md"]);
  });

  it("mixes stale + missing in a single call", async () => {
    const result = await checkDirectiveFreshness({
      directives: ["stale-30d.md", "does-not-exist.md", "fresh-1d.md"],
      directiveDir: tmpDir,
      staleDays: 7,
      now: Date.now(),
    });
    expect(result.stale).toHaveLength(1);
    expect(result.missing).toEqual(["does-not-exist.md"]);
  });

  it("returns empty buckets for empty directive list", async () => {
    const result = await checkDirectiveFreshness({
      directives: [],
      directiveDir: tmpDir,
      staleDays: 7,
      now: Date.now(),
    });
    expect(result).toEqual({ stale: [], missing: [] });
  });
});

describe("formatFreshnessBlock() (CPP-MS4-U-CPP33)", () => {
  it("returns null when everything is fresh", () => {
    const block = formatFreshnessBlock({ stale: [], missing: [] }, 10, 7);
    expect(block).toBeNull();
  });

  it("emits stale block with count and ages", () => {
    const block = formatFreshnessBlock(
      { stale: [{ name: "a.md", ageDays: 12 }], missing: [] },
      5, 7,
    );
    expect(block).toContain("Directive Freshness Warning (>7d stale)");
    expect(block).toContain("Stale (1/5): a.md (12d)");
    expect(block).toContain("Refresh before relying on these");
  });

  it("emits missing line separately from stale", () => {
    const block = formatFreshnessBlock(
      { stale: [], missing: ["gone.md"] },
      3, 7,
    );
    expect(block).toContain("Missing (1): gone.md");
    expect(block).not.toContain("Stale (");
  });

  it("emits both lines when mixed", () => {
    const block = formatFreshnessBlock(
      {
        stale: [{ name: "old.md", ageDays: 10 }],
        missing: ["gone.md"],
      },
      4, 7,
    );
    expect(block).toContain("Stale (1/4)");
    expect(block).toContain("Missing (1)");
  });

  it("renders multiple stale entries joined by commas", () => {
    const block = formatFreshnessBlock(
      {
        stale: [
          { name: "a.md", ageDays: 8 },
          { name: "b.md", ageDays: 15 },
        ],
        missing: [],
      },
      10, 7,
    );
    expect(block).toContain("a.md (8d), b.md (15d)");
  });
});
