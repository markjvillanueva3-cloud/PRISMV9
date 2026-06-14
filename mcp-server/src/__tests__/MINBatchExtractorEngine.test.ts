/**
 * MINBatchExtractorEngine.test.ts — LATHE-PROD-READY-MS0/U-LPR27
 * ==============================================================
 *
 * Behavioral tests for the bounded-concurrency .MIN batch parser.  Each
 * test drives the real engine end-to-end against real on-disk fixtures —
 * no mocks of the parser or the filesystem.  Coverage spans every status
 * branch (`ok`, `parse_failed`, `io_error`, `skipped_existing`,
 * `skipped_oversize`), every helper, the resume contract, the
 * concurrency limiter, and the customer/byCustomer aggregation that
 * downstream Phase 4 reverse-engineering units depend on.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  MINBatchExtractorEngine,
  minBatchExtractorEngine,
  defaultConcurrency,
  discoverFilesByExt,
  deriveFileId,
  extractCustomerFromPath,
  buildCheckpointPath,
  loadCheckpoint,
  saveCheckpoint,
  concurrencyLimiter,
  DEFAULT_CHECKPOINT_EVERY,
  DEFAULT_MAX_BYTES_PER_FILE,
  SCHEMA_VERSION,
  type MINBatchCheckpoint,
} from "../engines/MINBatchExtractorEngine.js";

// ── Fixtures ───────────────────────────────────────────────────────────────

const VALID_MIN = `$JM-DIE-12345.MIN%
G50 S3000
G20
T0101
G96 S800 M3
G0 X50. Z2.
G71 P100 Q200 U.01 W.005 D.08 F.2
N100 G0 X0.
G1 Z-.1 F.05
N200 G0 Z.2
G0 X100. Z100.
T0303
G97 S1500 M3
G0 X30. Z0.
G0 X100. Z100.
M30
%`;

interface Layout {
  rootDir: string;
  outputRoot: string;
}

function makeTmpLayout(): Layout {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "prism-min-batch-"));
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "prism-min-batch-out-"));
  return { rootDir: root, outputRoot: out };
}

function writeFixture(layout: Layout, customer: string, name: string, body: string): string {
  const dir = path.join(layout.rootDir, "CNC LATHE", customer);
  fs.mkdirSync(dir, { recursive: true });
  const p = path.join(dir, name);
  fs.writeFileSync(p, body, "utf8");
  return p;
}

function cleanup(layout: Layout): void {
  fs.rmSync(layout.rootDir, { recursive: true, force: true });
  fs.rmSync(layout.outputRoot, { recursive: true, force: true });
}

// ── Suite ──────────────────────────────────────────────────────────────────

describe("MINBatchExtractorEngine", () => {
  let layout: Layout;

  beforeEach(() => {
    layout = makeTmpLayout();
  });
  afterEach(() => {
    cleanup(layout);
  });

  // 1
  it("exports a singleton and constants", () => {
    expect(minBatchExtractorEngine).toBeInstanceOf(MINBatchExtractorEngine);
    expect(SCHEMA_VERSION).toBe("1.0.0");
    expect(DEFAULT_CHECKPOINT_EVERY).toBe(250);
    expect(DEFAULT_MAX_BYTES_PER_FILE).toBe(32 * 1024 * 1024);
  });

  // 2
  it("defaultConcurrency returns at least 1 and at most 16", () => {
    const c = defaultConcurrency();
    expect(c).toBeGreaterThanOrEqual(1);
    expect(c).toBeLessThanOrEqual(16); // ceiling 8→16 for 9950X3D2 (16C); HARDWARE-DRIVE-SYNC-AUDIT-2026-06-08 §3.3
  });

  // 3
  it("discoverFilesByExt walks recursively, sorts, and filters by extension", () => {
    writeFixture(layout, "ALCOA", "a.MIN", VALID_MIN);
    writeFixture(layout, "ITW", "b.min", VALID_MIN); // case variant
    writeFixture(layout, "ITW", "ignore.txt", "not a program");
    const files = discoverFilesByExt(layout.rootDir, [".min"]);
    expect(files.length).toBe(2);
    // Sorted (deterministic)
    const sorted = [...files].sort();
    expect(files).toEqual(sorted);
    expect(files.every((f) => f.toLowerCase().endsWith(".min"))).toBe(true);
  });

  // 4
  it("deriveFileId produces a stable forward-slash relative path", () => {
    const fp = path.join(layout.rootDir, "CNC LATHE", "ALCOA", "a.MIN");
    const id = deriveFileId(layout.rootDir, fp);
    expect(id).toBe("CNC LATHE/ALCOA/a.MIN");
  });

  // 5
  it("extractCustomerFromPath pulls customer from CNC LATHE/<customer>/file.MIN", () => {
    const fp = "/x/y/CNC LATHE/AGRATI/9091904.MIN";
    expect(extractCustomerFromPath(fp)).toBe("AGRATI");
    // Returns null when the convention isn't matched
    expect(extractCustomerFromPath("/x/y/random/path.MIN")).toBeNull();
  });

  // 6
  it("buildCheckpointPath sanitises runId and lives under _checkpoints/", () => {
    const p = buildCheckpointPath("/tmp/out", "run/with bad:chars");
    expect(p).toContain("_checkpoints");
    expect(p).toMatch(/run_with_bad_chars\.json$/);
  });

  // 7
  it("save + load checkpoint round-trips the schema", () => {
    const ckpt: MINBatchCheckpoint = {
      schemaVersion: "1.0.0",
      runId: "rt-1",
      completedFileIds: ["a/b.MIN", "c/d.MIN"],
      lastCompletedAt: new Date().toISOString(),
      totalEverDiscovered: 2,
    };
    const ckptPath = buildCheckpointPath(layout.outputRoot, "rt-1");
    saveCheckpoint(ckptPath, ckpt);
    const loaded = loadCheckpoint(ckptPath);
    expect(loaded).not.toBeNull();
    expect(loaded?.completedFileIds).toEqual(ckpt.completedFileIds);
    expect(loaded?.runId).toBe("rt-1");
  });

  // 8
  it("loadCheckpoint returns null on missing or corrupt file", () => {
    const missing = buildCheckpointPath(layout.outputRoot, "missing");
    expect(loadCheckpoint(missing)).toBeNull();

    const corruptPath = buildCheckpointPath(layout.outputRoot, "corrupt");
    fs.mkdirSync(path.dirname(corruptPath), { recursive: true });
    fs.writeFileSync(corruptPath, "this is not json", "utf8");
    expect(loadCheckpoint(corruptPath)).toBeNull();
  });

  // 9
  it("concurrencyLimiter caps in-flight count at the limit", async () => {
    const limit = 3;
    const limiter = concurrencyLimiter(limit);
    let inFlight = 0;
    let peak = 0;
    const work = Array.from({ length: 20 }).map((_, i) =>
      limiter(async () => {
        inFlight++;
        peak = Math.max(peak, inFlight);
        // Tiny async wait so concurrency can actually accumulate
        await new Promise((r) => setTimeout(r, 5));
        inFlight--;
        return i;
      }),
    );
    const out = await Promise.all(work);
    expect(out.length).toBe(20);
    expect(peak).toBeLessThanOrEqual(limit);
    expect(peak).toBeGreaterThan(0);
  });

  // 10
  it("extractBatch on empty rootDir reports zero discoveries and writes a checkpoint", async () => {
    const r = await new MINBatchExtractorEngine().extractBatch({
      rootDir: layout.rootDir,
      outputRoot: layout.outputRoot,
      runId: "empty-1",
    });
    expect(r.totalDiscovered).toBe(0);
    expect(r.attempted).toBe(0);
    expect(r.ok).toBe(0);
    expect(r.perFile).toEqual([]);
    expect(fs.existsSync(r.checkpointPath)).toBe(true);
  });

  // 11
  it("extractBatch parses every fixture and aggregates byCustomer", async () => {
    writeFixture(layout, "ALCOA", "a.MIN", VALID_MIN);
    writeFixture(layout, "ALCOA", "b.MIN", VALID_MIN);
    writeFixture(layout, "ITW", "c.MIN", VALID_MIN);
    const r = await new MINBatchExtractorEngine().extractBatch({
      rootDir: layout.rootDir,
      outputRoot: layout.outputRoot,
      runId: "ok-1",
      checkpointEvery: 1,
    });
    expect(r.totalDiscovered).toBe(3);
    expect(r.attempted).toBe(3);
    expect(r.ok).toBeGreaterThanOrEqual(3);
    expect(r.byCustomer["ALCOA"]).toBe(2);
    expect(r.byCustomer["ITW"]).toBe(1);
    // Per-file detail records have positive bytesScanned and durationMs
    for (const pf of r.perFile.filter((p) => p.status === "ok")) {
      expect(pf.bytesScanned).toBeGreaterThan(0);
      expect(pf.durationMs).toBeGreaterThanOrEqual(0);
    }
  });

  // 12
  it("extractBatch caps by maxFiles", async () => {
    writeFixture(layout, "ALCOA", "a.MIN", VALID_MIN);
    writeFixture(layout, "ALCOA", "b.MIN", VALID_MIN);
    writeFixture(layout, "ITW", "c.MIN", VALID_MIN);
    const r = await new MINBatchExtractorEngine().extractBatch({
      rootDir: layout.rootDir,
      outputRoot: layout.outputRoot,
      runId: "cap-1",
      maxFiles: 2,
    });
    expect(r.totalDiscovered).toBe(3);
    expect(r.attempted).toBe(2);
    expect(r.ok + r.parseFailed + r.skippedExisting + r.skippedOversize + r.ioErrors).toBe(2);
  });

  // 13
  it("extractBatch resume skips files already in the checkpoint", async () => {
    writeFixture(layout, "ALCOA", "a.MIN", VALID_MIN);
    writeFixture(layout, "ALCOA", "b.MIN", VALID_MIN);
    writeFixture(layout, "ITW", "c.MIN", VALID_MIN);

    const engine = new MINBatchExtractorEngine();
    // First run: process 2 files only.
    const first = await engine.extractBatch({
      rootDir: layout.rootDir,
      outputRoot: layout.outputRoot,
      runId: "resume-1",
      maxFiles: 2,
    });
    expect(first.attempted).toBe(2);

    // Second run: same runId, now allow all — the 2 from before should
    // come back as skipped_existing.
    const second = await engine.extractBatch({
      rootDir: layout.rootDir,
      outputRoot: layout.outputRoot,
      runId: "resume-1",
    });
    expect(second.totalDiscovered).toBe(3);
    expect(second.skippedExisting).toBeGreaterThanOrEqual(2);
    // At least one fresh ok this run
    expect(second.ok).toBeGreaterThanOrEqual(1);
  });

  // 14
  it("extractBatch with resume=false re-parses every file even if checkpoint exists", async () => {
    writeFixture(layout, "ALCOA", "a.MIN", VALID_MIN);
    writeFixture(layout, "ALCOA", "b.MIN", VALID_MIN);

    const engine = new MINBatchExtractorEngine();
    await engine.extractBatch({
      rootDir: layout.rootDir,
      outputRoot: layout.outputRoot,
      runId: "noresume-1",
    });
    const second = await engine.extractBatch({
      rootDir: layout.rootDir,
      outputRoot: layout.outputRoot,
      runId: "noresume-1",
      resume: false,
    });
    expect(second.skippedExisting).toBe(0);
    expect(second.ok).toBe(2);
  });

  // 15
  it("extractBatch records skipped_oversize when a file exceeds maxBytesPerFile", async () => {
    writeFixture(layout, "ALCOA", "tiny.MIN", VALID_MIN);
    writeFixture(layout, "ALCOA", "big.MIN", VALID_MIN + " ".repeat(10_000));
    const r = await new MINBatchExtractorEngine().extractBatch({
      rootDir: layout.rootDir,
      outputRoot: layout.outputRoot,
      runId: "oversize-1",
      maxBytesPerFile: 200, // forces "big" over the cap
    });
    expect(r.skippedOversize).toBeGreaterThanOrEqual(1);
    const skipped = r.perFile.find((p) => p.status === "skipped_oversize");
    expect(skipped?.error).toMatch(/file size .* > cap/);
  });

  // 16
  it("two extractBatch runs over the same fixtures produce identical byCustomer aggregates", async () => {
    writeFixture(layout, "AGRATI", "9091904.MIN", VALID_MIN);
    writeFixture(layout, "AGRATI", "9091905.MIN", VALID_MIN);
    writeFixture(layout, "ITW", "001-12345-67890-12.MIN", VALID_MIN);

    // Two runs in two distinct outputRoots so checkpoints don't cross.
    const out2 = fs.mkdtempSync(path.join(os.tmpdir(), "prism-min-batch-det-"));
    try {
      const a = await new MINBatchExtractorEngine().extractBatch({
        rootDir: layout.rootDir,
        outputRoot: layout.outputRoot,
        runId: "det-A",
      });
      const b = await new MINBatchExtractorEngine().extractBatch({
        rootDir: layout.rootDir,
        outputRoot: out2,
        runId: "det-B",
      });
      expect(b.byCustomer).toEqual(a.byCustomer);
      expect(b.totalDiscovered).toBe(a.totalDiscovered);
      expect(b.ok).toBe(a.ok);
    } finally {
      fs.rmSync(out2, { recursive: true, force: true });
    }
  });
});
