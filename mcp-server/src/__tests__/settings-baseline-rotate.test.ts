/**
 * settings-baseline-rotate.test.ts — CLEANUP-MS0 / U-CLEANUP-G4
 *
 * Verifies the rotation script's pure functions + filesystem behaviour
 * against a tmpdir-isolated fixture set. Mirrors the script invocation
 * via direct imports so we don't fork a node subprocess per case.
 *
 * Coverage:
 *   - parseFilename: valid + invalid filename shapes
 *   - countHooks: empty, well-formed, malformed shapes
 *   - parseArgs: defaults + every flag
 *   - rotate (happy path): kept vs archived split honors --keep-days
 *   - rotate (idempotency): re-running on the same dir = zero new work
 *   - rotate (already-archived dedup): byte-identical dest removes source
 *   - rotate (dry-run): no filesystem mutations
 *   - rotate (missing source): error captured, not thrown
 *   - rotate (unparseable filename): logged in `skipped`, never touched
 *   - digest content: per-event hook counts + sha256 stable
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";

import {
  rotate, parseFilename, countHooks, parseArgs,
} from "../../../scripts/settings-baseline-rotate.mjs";

const DAY_MS = 24 * 60 * 60 * 1000;

function writeBaseline(dir: string, isoCompact: string, payload: any): string {
  const name = `settings-baseline-${isoCompact}.json`;
  const full = join(dir, name);
  writeFileSync(full, JSON.stringify(payload, null, 2) + "\n");
  return name;
}

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

function isoCompact(date: Date): string {
  // 2026-05-13T20:04:52.302Z → 2026-05-13T20-04-52-302Z
  return date.toISOString().replace(/[:.]/g, "-").replace(/Z$/, "Z");
}

describe("settings-baseline-rotate / parseFilename", () => {
  it("parses a well-formed filename", () => {
    const parsed = parseFilename("settings-baseline-2026-05-13T20-04-52-302Z.json");
    expect(parsed).not.toBeNull();
    expect(parsed!.iso).toBe("2026-05-13T20:04:52.302Z");
    expect(parsed!.bucket).toBe("2026-05");
    expect(parsed!.t).toBe(Date.parse("2026-05-13T20:04:52.302Z"));
  });

  it("rejects non-baseline names", () => {
    expect(parseFilename("settings-baseline.json")).toBeNull();
    expect(parseFilename("settings-baseline-DIGEST-2026-05.json")).toBeNull();
    expect(parseFilename("foo.json")).toBeNull();
    expect(parseFilename("settings-baseline-not-a-date.json")).toBeNull();
  });

  it("rejects shapes with bad date components", () => {
    // Missing trailing Z
    expect(parseFilename("settings-baseline-2026-05-13T20-04-52-302.json")).toBeNull();
    // Wrong separator
    expect(parseFilename("settings-baseline-2026:05:13T20-04-52-302Z.json")).toBeNull();
  });
});

describe("settings-baseline-rotate / countHooks", () => {
  it("returns empty for missing / wrong-shape inputs", () => {
    expect(countHooks(null)).toEqual({});
    expect(countHooks({})).toEqual({});
    expect(countHooks({ hooks: null })).toEqual({});
    expect(countHooks({ hooks: "not-an-object" })).toEqual({});
    // Non-array event value is skipped entirely (no fake-zero key emitted).
    expect(countHooks({ hooks: { PreToolUse: "not-array" } })).toEqual({});
  });

  it("sums per-event hook counts across matchers", () => {
    const out = countHooks({
      hooks: {
        PreToolUse: [
          { matcher: "Bash", hooks: [{ command: "a" }, { command: "b" }] },
          { matcher: "Edit", hooks: [{ command: "c" }] },
        ],
        Stop: [{ matcher: "*", hooks: [{ command: "x" }] }],
        Unused: [{ matcher: "Y" }], // missing inner hooks
      },
    });
    expect(out).toEqual({ PreToolUse: 3, Stop: 1, Unused: 0 });
  });
});

describe("settings-baseline-rotate / parseArgs", () => {
  it("returns defaults for empty argv", () => {
    const a = parseArgs([]);
    expect(a.source).toBe("H:/prism/mcp-server/data/state");
    // path.join uses platform-native separator; compare via the same primitive.
    expect(a.archive).toBe(join("H:/prism/mcp-server/data/state", ".archive", "settings-baseline"));
    expect(a.keepDays).toBe(7);
    expect(a.dryRun).toBe(false);
    expect(a.json).toBe(true);
  });

  it("parses every flag", () => {
    const a = parseArgs([
      "--source", "/tmp/src",
      "--archive", "/tmp/arch",
      "--keep-days", "14",
      "--dry-run",
      "--no-json",
    ]);
    expect(a.source).toBe("/tmp/src");
    expect(a.archive).toBe("/tmp/arch"); // explicit value — no normalization
    expect(a.keepDays).toBe(14);
    expect(a.dryRun).toBe(true);
    expect(a.json).toBe(false);
  });

  it("falls back to default on invalid keep-days", () => {
    const a = parseArgs(["--keep-days", "not-a-number"]);
    expect(a.keepDays).toBe(7);
  });

  it("derives archive from source when omitted", () => {
    const a = parseArgs(["--source", "/tmp/x"]);
    expect(a.archive).toBe(join("/tmp/x", ".archive", "settings-baseline"));
  });
});

describe("settings-baseline-rotate / rotate", () => {
  let dir: string;
  let archive: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "sbr-test-"));
    archive = join(dir, ".archive", "settings-baseline");
  });

  afterEach(() => {
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* tolerate */ }
  });

  it("keeps recent files, archives older buckets with digest", () => {
    const now = Date.parse("2026-05-13T20:00:00.000Z");
    const recent = new Date(now - 2 * DAY_MS); // 2 days ago (kept)
    const old1 = new Date(now - 40 * DAY_MS);   // ~5 weeks ago (archived → bucket 2026-04)
    const old2 = new Date(now - 50 * DAY_MS);   // ~7 weeks ago (archived → bucket 2026-03)
    const old3 = new Date(now - 51 * DAY_MS);   // ~7 weeks ago (same bucket as old2 if month matches)

    const payloadRecent = { hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ command: "x" }] }] } };
    const payloadOld = { hooks: { Stop: [{ matcher: "*", hooks: [{ command: "a" }, { command: "b" }] }] } };

    writeBaseline(dir, isoCompact(recent), payloadRecent);
    writeBaseline(dir, isoCompact(old1), payloadOld);
    writeBaseline(dir, isoCompact(old2), payloadOld);
    writeBaseline(dir, isoCompact(old3), payloadOld);

    const result = rotate({ source: dir, archive, keepDays: 7, dryRun: false, json: true }, now);

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.scanned).toBe(4);
    expect(result.kept).toBe(1);
    expect(result.archived).toBe(3);
    // Two distinct buckets means two digests
    expect(result.digestsWritten).toBe(2);
    // Digest files exist next to live snapshots
    const digestFiles = readdirSync(dir).filter(f => f.startsWith("settings-baseline-DIGEST-"));
    expect(digestFiles.length).toBe(2);
    // Recent file still in place
    const remaining = readdirSync(dir).filter(f => f.startsWith("settings-baseline-") && !f.startsWith("settings-baseline-DIGEST-"));
    expect(remaining.length).toBe(1);
    // Archived files moved into bucket dirs
    const bucketDirs = readdirSync(archive);
    expect(bucketDirs.sort()).toEqual(["2026-03", "2026-04"]);
  });

  it("is idempotent across re-runs (run 2 is a clean no-op)", () => {
    const now = Date.parse("2026-05-13T20:00:00.000Z");
    const old1 = new Date(now - 30 * DAY_MS);
    writeBaseline(dir, isoCompact(old1), { hooks: {} });

    const first = rotate({ source: dir, archive, keepDays: 7, dryRun: false, json: true }, now);
    const second = rotate({ source: dir, archive, keepDays: 7, dryRun: false, json: true }, now);

    expect(first.archived).toBe(1);
    expect(first.digestsWritten).toBe(1);
    // Second run: source now empty of live baselines (they were moved). No work.
    expect(second.ok).toBe(true);
    expect(second.scanned).toBe(0);
    expect(second.archived).toBe(0);
    expect(second.digestsWritten).toBe(0);
    expect(second.digestsReused).toBe(0);
    expect(second.errors).toEqual([]);
  });

  it("reuses an existing digest when a new old snapshot lands in the same bucket", () => {
    // Simulates: hook drops a fresh snapshot whose date falls into an
    // already-rotated bucket (e.g. operator runs with a frozen clock for
    // bisecting; OR a delayed write from a long-running session). The bucket
    // digest already covers the prior content; re-using it is idempotent.
    const now = Date.parse("2026-05-13T20:00:00.000Z");
    const old1 = new Date(now - 30 * DAY_MS);
    const payload = { hooks: { Stop: [{ matcher: "*", hooks: [{ command: "x" }] }] } };

    // Pass 1: archive the seed file, writing a digest based on its bytes.
    writeBaseline(dir, isoCompact(old1), payload);
    const first = rotate({ source: dir, archive, keepDays: 7, dryRun: false, json: true }, now);
    expect(first.digestsWritten).toBe(1);

    // Re-introduce a NEW snapshot in the same bucket with the SAME payload
    // (so its sha256 will match the existing digest's representativeSha256).
    const old2 = new Date(now - 31 * DAY_MS); // slightly older, same YYYY-MM bucket
    writeBaseline(dir, isoCompact(old2), payload);
    const second = rotate({ source: dir, archive, keepDays: 7, dryRun: false, json: true }, now);

    expect(second.archived).toBe(1);
    // The bucket digest's existing representativeSha256 matches → reuse.
    expect(second.digestsReused).toBe(1);
    expect(second.digestsWritten).toBe(0);
  });

  it("dedups when archive destination already has byte-identical content", () => {
    const now = Date.parse("2026-05-13T20:00:00.000Z");
    const old1 = new Date(now - 30 * DAY_MS);
    const payload = { hooks: {} };
    const name = writeBaseline(dir, isoCompact(old1), payload);

    // Pre-populate archive with the same file content (simulates "already moved
    // by an earlier run but the source got re-created by the hook").
    const bucket = "2026-04";
    mkdirSync(join(archive, bucket), { recursive: true });
    writeFileSync(join(archive, bucket, name), JSON.stringify(payload, null, 2) + "\n");

    const result = rotate({ source: dir, archive, keepDays: 7, dryRun: false, json: true }, now);
    expect(result.errors).toEqual([]);
    expect(result.archived).toBe(0);
    // The duplicate source should have been removed.
    expect(existsSync(join(dir, name))).toBe(false);
    // Skipped log mentions identical removal
    expect(result.skipped.some((s: any) => s.reason === "already-archived-identical-removed")).toBe(true);
  });

  it("dry-run touches nothing", () => {
    const now = Date.parse("2026-05-13T20:00:00.000Z");
    const old1 = new Date(now - 30 * DAY_MS);
    writeBaseline(dir, isoCompact(old1), { hooks: { Stop: [{ matcher: "*", hooks: [{ command: "x" }] }] } });

    const before = readdirSync(dir);
    const result = rotate({ source: dir, archive, keepDays: 7, dryRun: true, json: true }, now);
    const after = readdirSync(dir);
    expect(after.sort()).toEqual(before.sort());
    expect(existsSync(archive)).toBe(false);
    // Reports the plan but with archived=1 (it would archive 1 file if not dry-run)
    expect(result.archived).toBe(1);
    expect(result.dryRun).toBe(true);
  });

  it("captures error when source missing instead of throwing", () => {
    const ghost = join(dir, "does-not-exist");
    const result = rotate({ source: ghost, archive, keepDays: 7, dryRun: false, json: true }, Date.now());
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => /source not found/.test(e))).toBe(true);
  });

  it("flags unparseable filenames in skipped, never moves them", () => {
    const now = Date.parse("2026-05-13T20:00:00.000Z");
    // Looks like ours but has an invalid month
    writeFileSync(join(dir, "settings-baseline-foo.json"), "{}");
    const result = rotate({ source: dir, archive, keepDays: 7, dryRun: false, json: true }, now);
    expect(result.skipped.some((s: any) => s.name === "settings-baseline-foo.json" && s.reason === "unparseable-filename")).toBe(true);
    // Original still in place
    expect(existsSync(join(dir, "settings-baseline-foo.json"))).toBe(true);
  });

  it("digest content covers hookCounts + sha + bucket metadata", () => {
    const now = Date.parse("2026-05-13T20:00:00.000Z");
    const old1 = new Date(now - 30 * DAY_MS);
    const payload = {
      hooks: {
        PreToolUse: [{ matcher: "Bash", hooks: [{ command: "a" }, { command: "b" }] }],
        Stop: [{ matcher: "*", hooks: [{ command: "x" }] }],
      },
      permissions: {},
    };
    writeBaseline(dir, isoCompact(old1), payload);

    rotate({ source: dir, archive, keepDays: 7, dryRun: false, json: true }, now);

    const digestPath = join(dir, "settings-baseline-DIGEST-2026-04.json");
    expect(existsSync(digestPath)).toBe(true);
    const digest = JSON.parse(readFileSync(digestPath, "utf-8"));
    expect(digest.bucket).toBe("2026-04");
    expect(digest.snapshotCount).toBe(1);
    expect(digest.hookCounts).toEqual({ PreToolUse: 2, Stop: 1 });
    expect(digest.topLevelKeys).toEqual(["hooks", "permissions"]);
    // sha256 verifiable
    const buf = readFileSync(join(archive, "2026-04", `settings-baseline-${isoCompact(old1)}.json`));
    expect(digest.representativeSha256).toBe(sha256(buf));
  });

  it("empty source dir is a no-op", () => {
    const result = rotate({ source: dir, archive, keepDays: 7, dryRun: false, json: true }, Date.now());
    expect(result.ok).toBe(true);
    expect(result.scanned).toBe(0);
    expect(result.archived).toBe(0);
  });
});
