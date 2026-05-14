/**
 * vizOutputSize.test.ts — CLEANUP-MS0 / U-CLEANUP-G10
 *
 * Tests scripts/viz-output-size.mjs — the size watchdog that prevents a
 * repeat of the 2026-05-12 git-history-strip incident by alerting on
 * state/shared/system-viz/ growing past --threshold-gb (default 2 GB) and
 * optionally archiving non-current snapshots out of the live tree.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync,
} from "node:fs";
import { join, resolve, dirname, basename } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";

import {
  parseArgs,
  isNonCurrentSnapshot,
  formatBytes,
  scan,
  summarize,
  archiveSnapshots,
  run,
  NON_CURRENT_PATTERNS,
  SCHEMA_VERSION,
  DEFAULT_THRESHOLD_GB,
  DEFAULT_TOP_N,
  BYTES_PER_GB,
  // @ts-expect-error — .mjs script, no type declarations
} from "../../../scripts/viz-output-size.mjs";

const SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../scripts/viz-output-size.mjs");
const NOW_MS = Date.parse("2026-05-14T18:00:00.000Z");
const SMALL_FILE_BYTES = 100;
const MID_FILE_BYTES = 1000;
const LARGE_FILE_BYTES = 10_000;

// ─── parseArgs ────────────────────────────────────────────────────────────
describe("parseArgs", () => {
  it("returns documented defaults for empty argv", () => {
    const o = parseArgs([]);
    expect(o.thresholdGb).toBe(DEFAULT_THRESHOLD_GB);
    expect(o.topN).toBe(DEFAULT_TOP_N);
    expect(o.archive).toBe(false);
    expect(o.dryRun).toBe(false);
    expect(o.json).toBe(false);
    expect(o.vizDir.endsWith("system-viz")).toBe(true);
  });

  it("parses every flag", () => {
    const o = parseArgs(["--json", "--archive", "--dry-run",
      "--threshold-gb", "1.5", "--top-n", "20",
      "--viz-dir", "/tmp/v", "--backup-root", "/tmp/b"]);
    expect(o.json).toBe(true);
    expect(o.archive).toBe(true);
    expect(o.dryRun).toBe(true);
    expect(o.thresholdGb).toBe(1.5);
    expect(o.topN).toBe(20);
    expect(o.vizDir).toBe("/tmp/v");
    expect(o.backupRoot).toBe("/tmp/b");
  });

  it("rejects unknown flags", () => {
    expect(parseArgs(["--bogus"])._error).toBe("unknown arg: --bogus");
  });

  it("rejects --threshold-gb that is zero / negative / NaN", () => {
    const expected = "--threshold-gb needs a positive number";
    expect(parseArgs(["--threshold-gb", "0"])._error).toBe(expected);
    expect(parseArgs(["--threshold-gb", "-5"])._error).toBe(expected);
    expect(parseArgs(["--threshold-gb", "abc"])._error).toBe(expected);
    expect(parseArgs(["--threshold-gb", "NaN"])._error).toBe(expected);
  });

  it("rejects --top-n that is zero / negative / non-integer", () => {
    const expected = "--top-n needs a positive integer";
    expect(parseArgs(["--top-n", "0"])._error).toBe(expected);
    expect(parseArgs(["--top-n", "-3"])._error).toBe(expected);
    expect(parseArgs(["--top-n", "abc"])._error).toBe(expected);
  });

  it("rejects flags missing their value", () => {
    expect(parseArgs(["--viz-dir"])._error).toBe("--viz-dir needs a value");
    expect(parseArgs(["--threshold-gb"])._error).toBe("--threshold-gb needs a positive number");
  });

  it("--help short-circuits", () => {
    expect(parseArgs(["--help"])._help).toBe(true);
    expect(parseArgs(["-h"])._help).toBe(true);
  });
});

// ─── isNonCurrentSnapshot ─────────────────────────────────────────────────
describe("isNonCurrentSnapshot", () => {
  it("matches every documented non-current pattern", () => {
    expect(isNonCurrentSnapshot("system-graph.previous.json")).toBe(true);
    expect(isNonCurrentSnapshot("some-file.bak")).toBe(true);
    expect(isNonCurrentSnapshot("graph.snapshot-2026-05-12.json")).toBe(true);
    expect(isNonCurrentSnapshot("graph-snapshot-2026-05-12.cypher")).toBe(true);
    expect(isNonCurrentSnapshot("inventory.archive.7.json")).toBe(true);
  });

  it("does NOT match current live files", () => {
    expect(isNonCurrentSnapshot("system-graph.json")).toBe(false);
    expect(isNonCurrentSnapshot("graph.cypher")).toBe(false);
    expect(isNonCurrentSnapshot("h-drive-files.jsonl")).toBe(false);
    expect(isNonCurrentSnapshot("awareness-augmentation.json")).toBe(false);
    expect(isNonCurrentSnapshot("README.md")).toBe(false);
  });

  it("tolerates empty / nullish input", () => {
    expect(isNonCurrentSnapshot("")).toBe(false);
    expect(isNonCurrentSnapshot(null as any)).toBe(false);
    expect(isNonCurrentSnapshot(undefined as any)).toBe(false);
  });

  it("NON_CURRENT_PATTERNS is a non-empty array of working RegExps", () => {
    expect(Array.isArray(NON_CURRENT_PATTERNS)).toBe(true);
    expect(NON_CURRENT_PATTERNS.length).toBeGreaterThanOrEqual(3);
    // each pattern matches at least one canonical example
    const probes = [
      "x.previous.json", "x.bak", "x.snapshot-2026-05-12.json",
      "x-snapshot-2026-05-12.json", "x.archive.1.json",
    ];
    for (const p of NON_CURRENT_PATTERNS) {
      expect(probes.some((s) => p.test(s))).toBe(true);
    }
  });
});

// ─── formatBytes ──────────────────────────────────────────────────────────
describe("formatBytes", () => {
  it("returns bytes for values < 1 KB", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1023)).toBe("1023 B");
  });

  it("crosses the 1 KB boundary at 1024 (reference value)", () => {
    expect(formatBytes(1024)).toBe("1.00 KB");
    expect(formatBytes(2048)).toBe("2.00 KB");
  });

  it("crosses the 1 MB boundary at 1024^2 (reference value)", () => {
    expect(formatBytes(1024 ** 2)).toBe("1.00 MB");
  });

  it("crosses the 1 GB boundary at 1024^3 (reference value)", () => {
    expect(formatBytes(BYTES_PER_GB)).toBe("1.00 GB");
    expect(formatBytes(BYTES_PER_GB * 2)).toBe("2.00 GB");
  });

  it("returns '?' for invalid input (adversarial)", () => {
    expect(formatBytes(-1)).toBe("?");
    expect(formatBytes(NaN)).toBe("?");
    expect(formatBytes(Infinity)).toBe("?");
  });
});

// ─── scan (real temp filesystem) ──────────────────────────────────────────
describe("scan", () => {
  let root: string;
  beforeEach(() => { root = mkdtempSync(join(tmpdir(), "g10-scan-")); });
  afterEach(() => { rmSync(root, { recursive: true, force: true }); });

  it("returns empty + zero errors for a missing dir", () => {
    const r = scan(join(root, "no-such-dir"));
    expect(r.files).toEqual([]);
    expect(r.errors).toEqual([]);
  });

  it("walks recursively + reports each file's real size", () => {
    writeFileSync(join(root, "top.json"), "x".repeat(SMALL_FILE_BYTES));
    mkdirSync(join(root, "sub"), { recursive: true });
    writeFileSync(join(root, "sub", "nested.json"), "y".repeat(MID_FILE_BYTES));
    mkdirSync(join(root, "sub", "deeper"), { recursive: true });
    writeFileSync(join(root, "sub", "deeper", "leaf.json"), "z".repeat(LARGE_FILE_BYTES));

    const r = scan(root);
    expect(r.errors).toEqual([]);
    expect(r.files).toHaveLength(3);
    const sizes = r.files.map((f) => f.sizeBytes).sort((a, b) => a - b);
    expect(sizes).toEqual([SMALL_FILE_BYTES, MID_FILE_BYTES, LARGE_FILE_BYTES]);
    for (const f of r.files) expect(existsSync(f.path)).toBe(true);
  });

  it("collects errors from an unreadable subdir but continues scanning siblings", () => {
    writeFileSync(join(root, "ok.json"), "x".repeat(SMALL_FILE_BYTES));
    mkdirSync(join(root, "blocked"), { recursive: true });
    writeFileSync(join(root, "blocked", "inside.json"), "y");
    const r = scan(root, {
      readdirSyncFn: (p: string, opts: any) => {
        if (p.endsWith("blocked")) { const e: any = new Error("perm"); e.code = "EACCES"; throw e; }
        return require("node:fs").readdirSync(p, opts);
      },
    });
    // value-concrete: file list compared by name
    const fileNames = r.files.map((f: any) => basename(f.path));
    expect(fileNames).toEqual(["ok.json"]);
    const okFile = r.files[0];
    expect(okFile.sizeBytes).toBe(SMALL_FILE_BYTES);
    expect(r.errors.filter((e: string) => e.includes("EACCES")).length).toBe(1);
  });

  it("records stat failures in errors[] without throwing", () => {
    writeFileSync(join(root, "a.json"), "x");
    const r = scan(root, {
      statSyncFn: (p: string) => { const e: any = new Error("io"); e.code = "EIO"; throw e; },
    });
    expect(r.files).toEqual([]);
    expect(r.errors.length).toBe(1);
    expect(r.errors[0]).toContain("EIO");
  });
});

// ─── summarize ────────────────────────────────────────────────────────────
describe("summarize", () => {
  it("sums total bytes, picks top-N largest, lists snapshot candidates", () => {
    const root = "/v";
    const files = [
      { path: join(root, "a.json"), sizeBytes: 100 },
      { path: join(root, "b.json"), sizeBytes: 200 },
      { path: join(root, "c.json"), sizeBytes: 50 },
      { path: join(root, "system-graph.previous.json"), sizeBytes: 500 },
      { path: join(root, "old.bak"), sizeBytes: 75 },
    ];
    const s = summarize({ files, errors: [] }, 3, root);
    expect(s.fileCount).toBe(5);
    expect(s.totalBytes).toBe(100 + 200 + 50 + 500 + 75);
    expect(s.topFiles).toHaveLength(3);
    expect(s.topFiles[0].sizeBytes).toBe(500);
    expect(s.topFiles[1].sizeBytes).toBe(200);
    expect(s.topFiles[2].sizeBytes).toBe(100);
    expect(s.snapshotCandidates).toHaveLength(2);
    const snapRels = s.snapshotCandidates.map((c: any) => c.rel).sort();
    expect(snapRels).toEqual(["old.bak", "system-graph.previous.json"]);
    expect(s.snapshotBytes).toBe(500 + 75);
  });

  it("handles empty file list (no division-by-zero / no crash)", () => {
    const s = summarize({ files: [], errors: [] }, 5, "/v");
    expect(s.fileCount).toBe(0);
    expect(s.totalBytes).toBe(0);
    expect(s.topFiles).toEqual([]);
    expect(s.snapshotCandidates).toEqual([]);
    expect(s.snapshotBytes).toBe(0);
  });

  it("topN larger than fileCount is clamped naturally (slice semantics)", () => {
    const files = [{ path: "/v/a", sizeBytes: 10 }];
    const s = summarize({ files, errors: [] }, 99, "/v");
    expect(s.topFiles).toHaveLength(1);
    expect(s.topFiles[0].sizeBytes).toBe(10);
  });
});

// ─── archiveSnapshots (real temp filesystem) ──────────────────────────────
describe("archiveSnapshots", () => {
  let vizDir: string;
  let backupRoot: string;
  beforeEach(() => {
    vizDir = mkdtempSync(join(tmpdir(), "g10-viz-"));
    backupRoot = mkdtempSync(join(tmpdir(), "g10-backup-"));
  });
  afterEach(() => {
    rmSync(vizDir, { recursive: true, force: true });
    rmSync(backupRoot, { recursive: true, force: true });
  });

  it("moves candidates to <backupRoot>/<ISO>/ preserving relative paths", () => {
    const p1 = join(vizDir, "system-graph.previous.json");
    writeFileSync(p1, "P".repeat(MID_FILE_BYTES));
    mkdirSync(join(vizDir, "sub"), { recursive: true });
    const p2 = join(vizDir, "sub", "old.bak");
    writeFileSync(p2, "B".repeat(SMALL_FILE_BYTES));

    const r = archiveSnapshots(
      [{ path: p1, sizeBytes: MID_FILE_BYTES }, { path: p2, sizeBytes: SMALL_FILE_BYTES }],
      { backupRoot, vizDir, dryRun: false, nowMs: NOW_MS },
    );
    expect(r.errors).toEqual([]);
    expect(r.archived).toHaveLength(2);
    // archiveDir is concretely under backupRoot
    expect((r.archiveDir as string).startsWith(backupRoot)).toBe(true);
    expect(existsSync(p1)).toBe(false);
    expect(existsSync(p2)).toBe(false);
    const dest1 = r.archived.find((a: any) => a.from === p1).to;
    expect(existsSync(dest1)).toBe(true);
    expect(readFileSync(dest1, "utf-8")).toBe("P".repeat(MID_FILE_BYTES));
    const dest2 = r.archived.find((a: any) => a.from === p2).to;
    expect(dest2.includes("sub")).toBe(true);
  });

  it("dry-run plans the moves without touching disk", () => {
    const p = join(vizDir, "x.previous.json");
    writeFileSync(p, "x".repeat(SMALL_FILE_BYTES));
    const r = archiveSnapshots(
      [{ path: p, sizeBytes: SMALL_FILE_BYTES }],
      { backupRoot, vizDir, dryRun: true, nowMs: NOW_MS },
    );
    expect(r.archived).toHaveLength(1);
    expect(r.archived[0].dryRun).toBe(true);
    expect(existsSync(p)).toBe(true);
    // archiveDir computed, but no actual directory created on disk
    expect((r.archiveDir as string).startsWith(backupRoot)).toBe(true);
    expect(existsSync(r.archiveDir as string)).toBe(false);
  });

  it("handles a source-vanished race by skipping that one entry", () => {
    const p = join(vizDir, "vanished.previous.json");
    const r = archiveSnapshots(
      [{ path: p, sizeBytes: SMALL_FILE_BYTES }],
      { backupRoot, vizDir, dryRun: false, nowMs: NOW_MS },
    );
    expect(r.archived).toHaveLength(0);
    expect(r.skipped).toHaveLength(1);
    expect(r.skipped[0].reason).toBe("source-vanished");
  });

  it("records rename failures in errors[] without aborting the batch", () => {
    const p1 = join(vizDir, "a.previous.json");
    const p2 = join(vizDir, "b.previous.json");
    writeFileSync(p1, "a");
    writeFileSync(p2, "b");
    let calls = 0;
    const r = archiveSnapshots(
      [{ path: p1, sizeBytes: 1 }, { path: p2, sizeBytes: 1 }],
      { backupRoot, vizDir, dryRun: false, nowMs: NOW_MS },
      {
        renameSyncFn: (src: string, dst: string) => {
          calls++;
          if (calls === 1) { const e: any = new Error("busy"); e.code = "EBUSY"; throw e; }
          return require("node:fs").renameSync(src, dst);
        },
      },
    );
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toContain("EBUSY");
    expect(r.archived).toHaveLength(1);
  });

  it("no-ops on an empty candidate list", () => {
    const r = archiveSnapshots([], { backupRoot, vizDir, dryRun: false, nowMs: NOW_MS });
    expect(r.archived).toEqual([]);
    expect(r.errors).toEqual([]);
    expect(r.archiveDir).toBeNull();
  });
});

// ─── run (orchestrator) ───────────────────────────────────────────────────
describe("run", () => {
  let vizDir: string;
  let backupRoot: string;
  beforeEach(() => {
    vizDir = mkdtempSync(join(tmpdir(), "g10-run-"));
    backupRoot = mkdtempSync(join(tmpdir(), "g10-run-backup-"));
  });
  afterEach(() => {
    rmSync(vizDir, { recursive: true, force: true });
    rmSync(backupRoot, { recursive: true, force: true });
  });

  it("under threshold + no archive → overThreshold false, ok true, no mutations", () => {
    writeFileSync(join(vizDir, "small.json"), "x".repeat(SMALL_FILE_BYTES));
    writeFileSync(join(vizDir, "stale.previous.json"), "y".repeat(MID_FILE_BYTES));
    const r = run({ vizDir, backupRoot, thresholdGb: DEFAULT_THRESHOLD_GB, topN: 5, archive: false, dryRun: false });
    expect(r.ok).toBe(true);
    expect(r.overThreshold).toBe(false);
    expect(r.totalBytes).toBe(SMALL_FILE_BYTES + MID_FILE_BYTES);
    expect(r.snapshotCandidates).toHaveLength(1);
    expect(r.archive.performed).toBe(false);
    expect(existsSync(join(vizDir, "stale.previous.json"))).toBe(true);
  });

  it("over threshold → overThreshold true, schema + threshold fields populated", () => {
    writeFileSync(join(vizDir, "big.json"), "z".repeat(LARGE_FILE_BYTES));
    const r = run({ vizDir, backupRoot, thresholdGb: 0.000001, topN: 5, archive: false, dryRun: false });
    expect(r.overThreshold).toBe(true);
    expect(r.schemaVersion).toBe(SCHEMA_VERSION);
    expect(r.thresholdGb).toBe(0.000001);
    expect(r.thresholdBytes).toBe(Math.round(0.000001 * BYTES_PER_GB));
  });

  it("--archive moves snapshots and reports archived[]", () => {
    writeFileSync(join(vizDir, "live.json"), "x");
    writeFileSync(join(vizDir, "old.previous.json"), "y".repeat(MID_FILE_BYTES));
    const r = run({ vizDir, backupRoot, thresholdGb: DEFAULT_THRESHOLD_GB, topN: 5, archive: true, dryRun: false });
    expect(r.archive.performed).toBe(true);
    expect(r.archive.archived).toHaveLength(1);
    expect(existsSync(join(vizDir, "live.json"))).toBe(true);
    expect(existsSync(join(vizDir, "old.previous.json"))).toBe(false);
  });

  it("--archive --dry-run reports what WOULD move but writes nothing", () => {
    writeFileSync(join(vizDir, "old.previous.json"), "y".repeat(MID_FILE_BYTES));
    const r = run({ vizDir, backupRoot, thresholdGb: DEFAULT_THRESHOLD_GB, topN: 5, archive: true, dryRun: true });
    expect(r.archive.performed).toBe(true);
    expect(r.archive.archived[0].dryRun).toBe(true);
    expect(existsSync(join(vizDir, "old.previous.json"))).toBe(true);
  });

  it("scan errors flow through to result.errors + ok:false", () => {
    writeFileSync(join(vizDir, "a.json"), "x");
    const r = run(
      { vizDir, backupRoot, thresholdGb: DEFAULT_THRESHOLD_GB, topN: 5, archive: false, dryRun: false },
      { statSyncFn: () => { const e: any = new Error("io"); e.code = "EIO"; throw e; } },
    );
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });
});

// ─── CLI subprocess ───────────────────────────────────────────────────────
describe("CLI subprocess", () => {
  let vizDir: string;
  beforeEach(() => { vizDir = mkdtempSync(join(tmpdir(), "g10-cli-")); });
  afterEach(() => { rmSync(vizDir, { recursive: true, force: true }); });

  it("--help exits 0 with usage text", () => {
    const out = execFileSync(process.execPath, [SCRIPT, "--help"], { encoding: "utf8" });
    expect(out).toContain("viz-output-size.mjs");
    expect(out).toContain("--threshold-gb");
    expect(out).toContain("--archive");
  });

  it("unknown flag exits 1 with stderr message", () => {
    const r = spawnSync(process.execPath, [SCRIPT, "--bogus"], { encoding: "utf8" });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("unknown arg");
  });

  it("--json on a small viz dir exits 0 with parseable JSON, overThreshold:false", () => {
    writeFileSync(join(vizDir, "tiny.json"), "x".repeat(SMALL_FILE_BYTES));
    const r = spawnSync(process.execPath, [SCRIPT, "--json", "--viz-dir", vizDir], { encoding: "utf8" });
    expect(r.status).toBe(0);
    const parsed = JSON.parse(r.stdout);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.overThreshold).toBe(false);
    expect(parsed.totalBytes).toBe(SMALL_FILE_BYTES);
  });

  it("over-threshold viz dir exits 2 (alert signal — distinct from internal error)", () => {
    writeFileSync(join(vizDir, "big.json"), "z".repeat(LARGE_FILE_BYTES));
    const r = spawnSync(process.execPath, [SCRIPT, "--json",
      "--viz-dir", vizDir, "--threshold-gb", "0.000001"], { encoding: "utf8" });
    expect(r.status).toBe(2);
    const parsed = JSON.parse(r.stdout);
    expect(parsed.overThreshold).toBe(true);
  });
});
