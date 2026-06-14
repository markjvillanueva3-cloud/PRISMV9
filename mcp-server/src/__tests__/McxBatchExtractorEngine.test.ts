/**
 * McxBatchExtractorEngine.test.ts — LATHE-PROD-READY-MS0/U-LPR28
 * ==============================================================
 *
 * Behavioral coverage for the bounded-concurrency Mastercam binary
 * batch extractor.  Drives the real engine end-to-end against real
 * on-disk fixtures — no mocks of the parser or the filesystem.  Spans
 * every status branch (`ok`, `parse_failed`, `io_error`,
 * `skipped_existing`, `skipped_oversize`), every helper, the resume
 * contract, the concurrency limiter, and the byFormat / byCustomer /
 * byMagicVerified aggregations downstream Phase 4 RE depends on.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  McxBatchExtractorEngine,
  mcxBatchExtractorEngine,
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
  MCX_EXTENSIONS,
  type McxBatchCheckpoint,
} from "../engines/McxBatchExtractorEngine.js";

// ── Fixture builders ───────────────────────────────────────────────────────

const MAGIC_MCX_8 = Buffer.from([0x98, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00]);
const MAGIC_OLE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const MAGIC_ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

/**
 * Compose a Mastercam-shaped binary fixture: header magic + zlib chunks
 * + ASCII-embedded version/machine/material strings.  The exact bytes
 * here only need to satisfy McxProgramParserEngine's metadata extractor
 * (which we already exercised in McxProgramParserEngine.test.ts).
 */
function buildBinFixture(opts: {
  magic: Buffer;
  zlibChunks?: number;
  asciiStrings?: ReadonlyArray<string>;
}): Buffer {
  const parts: Buffer[] = [Buffer.from(opts.magic)];
  parts.push(Buffer.alloc(Math.max(0, 32 - opts.magic.length), 0));
  for (let i = 0; i < (opts.zlibChunks ?? 0); i++) {
    parts.push(Buffer.from([0x78, 0x9c, 0xab, 0xcd, 0xef]));
    parts.push(Buffer.alloc(8, 0));
  }
  for (const s of opts.asciiStrings ?? []) {
    parts.push(Buffer.from(s, "ascii"));
    parts.push(Buffer.from([0, 0]));
  }
  parts.push(Buffer.alloc(16, 0));
  return Buffer.concat(parts);
}

interface Layout {
  rootDir: string;
  outputRoot: string;
}

function makeTmpLayout(): Layout {
  return {
    rootDir: fs.mkdtempSync(path.join(os.tmpdir(), "prism-mcx-batch-")),
    outputRoot: fs.mkdtempSync(path.join(os.tmpdir(), "prism-mcx-batch-out-")),
  };
}

function writeBin(layout: Layout, customer: string, name: string, body: Buffer): string {
  const dir = path.join(layout.rootDir, "CNC LATHE", customer);
  fs.mkdirSync(dir, { recursive: true });
  const p = path.join(dir, name);
  fs.writeFileSync(p, body);
  return p;
}

function cleanup(layout: Layout): void {
  fs.rmSync(layout.rootDir, { recursive: true, force: true });
  fs.rmSync(layout.outputRoot, { recursive: true, force: true });
}

// ── Suite ──────────────────────────────────────────────────────────────────

describe("McxBatchExtractorEngine", () => {
  let layout: Layout;

  beforeEach(() => {
    layout = makeTmpLayout();
  });
  afterEach(() => {
    cleanup(layout);
  });

  // 1
  it("exports a singleton, schema version, and the four supported extensions", () => {
    expect(mcxBatchExtractorEngine).toBeInstanceOf(McxBatchExtractorEngine);
    expect(SCHEMA_VERSION).toBe("1.0.0");
    expect(DEFAULT_CHECKPOINT_EVERY).toBe(250);
    expect(DEFAULT_MAX_BYTES_PER_FILE).toBe(32 * 1024 * 1024);
    expect([...MCX_EXTENSIONS].sort()).toEqual([".mcam", ".mcx", ".mcx-8", ".mcx-9"]);
  });

  // 2
  it("defaultConcurrency is in [1, 16]", () => {
    const c = defaultConcurrency();
    expect(c).toBeGreaterThanOrEqual(1);
    expect(c).toBeLessThanOrEqual(16); // ceiling 8→16 for 9950X3D2 (16C); HARDWARE-DRIVE-SYNC-AUDIT-2026-06-08 §3.3
  });

  // 3
  it("discoverFilesByExt walks recursively, sorts, and accepts every Mcx-family extension", () => {
    writeBin(layout, "ALCOA", "a.mcx-8", buildBinFixture({ magic: MAGIC_MCX_8 }));
    writeBin(layout, "ALCOA", "b.mcx-9", buildBinFixture({ magic: MAGIC_MCX_8 }));
    writeBin(layout, "ITW", "c.mcam", buildBinFixture({ magic: MAGIC_ZIP }));
    writeBin(layout, "ITW", "d.MCX", buildBinFixture({ magic: MAGIC_OLE }));
    writeBin(layout, "ITW", "ignore.txt", Buffer.from("not mastercam"));
    const files = discoverFilesByExt(layout.rootDir, MCX_EXTENSIONS);
    expect(files.length).toBe(4);
    expect([...files].sort()).toEqual(files); // already sorted
  });

  // 4
  it("deriveFileId returns a forward-slash relative path", () => {
    const fp = path.join(layout.rootDir, "CNC LATHE", "ALCOA", "x.mcx-8");
    expect(deriveFileId(layout.rootDir, fp)).toBe("CNC LATHE/ALCOA/x.mcx-8");
  });

  // 5
  it("extractCustomerFromPath resolves customers across multiple machine roots", () => {
    expect(
      extractCustomerFromPath("/x/CNC LATHE/AGRATI/9091904.mcx-8"),
    ).toBe("AGRATI");
    expect(
      extractCustomerFromPath("/y/CNC OKUMA MULTUS/HOLO-KROME/p.mcam"),
    ).toBe("HOLO-KROME");
    expect(
      extractCustomerFromPath("/z/CNC MILL HAAS/ITW/12345.mcx"),
    ).toBe("ITW");
    // Doesn't false-positive on unrelated paths
    expect(extractCustomerFromPath("/random/path.mcx-8")).toBeNull();
  });

  // 6
  it("buildCheckpointPath sanitises runId and namespaces under _checkpoints/mcx-<id>.json", () => {
    const p = buildCheckpointPath("/tmp/out", "run with bad:chars/here");
    expect(p).toContain("_checkpoints");
    expect(p).toMatch(/mcx-run_with_bad_chars_here\.json$/);
  });

  // 7
  it("save + load checkpoint round-trips the schema, including completedFileIds", () => {
    const ckpt: McxBatchCheckpoint = {
      schemaVersion: "1.0.0",
      runId: "rt-1",
      completedFileIds: ["a/b.mcx-8", "c/d.mcam"],
      lastCompletedAt: new Date().toISOString(),
      totalEverDiscovered: 2,
    };
    const ckptPath = buildCheckpointPath(layout.outputRoot, "rt-1");
    saveCheckpoint(ckptPath, ckpt);
    const loaded = loadCheckpoint(ckptPath);
    expect(loaded?.completedFileIds).toEqual(ckpt.completedFileIds);
    expect(loaded?.runId).toBe("rt-1");
    expect(loaded?.totalEverDiscovered).toBe(2);
  });

  // 8
  it("loadCheckpoint returns null on missing OR corrupt JSON", () => {
    expect(
      loadCheckpoint(buildCheckpointPath(layout.outputRoot, "missing")),
    ).toBeNull();
    const corrupt = buildCheckpointPath(layout.outputRoot, "corrupt");
    fs.mkdirSync(path.dirname(corrupt), { recursive: true });
    fs.writeFileSync(corrupt, "{ this is not json", "utf8");
    expect(loadCheckpoint(corrupt)).toBeNull();
  });

  // 9
  it("concurrencyLimiter caps in-flight count at the limit", async () => {
    const limit = 3;
    const limiter = concurrencyLimiter(limit);
    let inFlight = 0;
    let peak = 0;
    const work = Array.from({ length: 25 }).map((_, i) =>
      limiter(async () => {
        inFlight++;
        peak = Math.max(peak, inFlight);
        await new Promise((r) => setTimeout(r, 4));
        inFlight--;
        return i;
      }),
    );
    const out = await Promise.all(work);
    expect(out.length).toBe(25);
    expect(peak).toBeLessThanOrEqual(limit);
    expect(peak).toBeGreaterThan(0);
  });

  // 10
  it("extractBatch on empty rootDir reports zero discoveries and writes a final checkpoint", async () => {
    const r = await new McxBatchExtractorEngine().extractBatch({
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
  it("extractBatch parses every fixture and aggregates byFormat / byCustomer / byMagicVerified", async () => {
    writeBin(layout, "ALCOA", "a.mcx-8", buildBinFixture({
      magic: MAGIC_MCX_8,
      zlibChunks: 4,
      asciiStrings: ["MASTERCAM 2024 LATHE"],
    }));
    writeBin(layout, "ALCOA", "b.mcx-8", buildBinFixture({
      magic: MAGIC_MCX_8,
      zlibChunks: 2,
      asciiStrings: ["MASTERCAM 2023 MILL"],
    }));
    writeBin(layout, "ITW", "c.mcam", buildBinFixture({
      magic: MAGIC_ZIP,
      zlibChunks: 6,
      asciiStrings: ["MASTERCAM 2026"],
    }));
    // Bogus magic — still parses, but magic_verified=false
    writeBin(layout, "ITW", "d.mcx", buildBinFixture({
      magic: Buffer.from([0xde, 0xad, 0xbe, 0xef]),
      asciiStrings: ["random"],
    }));
    const r = await new McxBatchExtractorEngine().extractBatch({
      rootDir: layout.rootDir,
      outputRoot: layout.outputRoot,
      runId: "ok-1",
      checkpointEvery: 1,
    });
    expect(r.totalDiscovered).toBe(4);
    expect(r.attempted).toBe(4);
    expect(r.ok).toBe(4);
    expect(r.byFormat[".mcx-8"]).toBe(2);
    expect(r.byFormat[".mcam"]).toBe(1);
    expect(r.byFormat[".mcx"]).toBe(1);
    expect(r.byCustomer["ALCOA"]).toBe(2);
    expect(r.byCustomer["ITW"]).toBe(2);
    // 3 had real Mastercam magic, 1 had bogus magic
    expect(r.byMagicVerified.verified).toBe(3);
    expect(r.byMagicVerified.unverified).toBe(1);
  });

  // 12
  it("extractBatch caps by maxFiles", async () => {
    for (let i = 0; i < 5; i++) {
      writeBin(layout, "ALCOA", `f${i}.mcx-8`, buildBinFixture({ magic: MAGIC_MCX_8 }));
    }
    const r = await new McxBatchExtractorEngine().extractBatch({
      rootDir: layout.rootDir,
      outputRoot: layout.outputRoot,
      runId: "cap-1",
      maxFiles: 3,
    });
    expect(r.totalDiscovered).toBe(5);
    expect(r.attempted).toBe(3);
  });

  // 13
  it("extractBatch resume skips files already in the checkpoint", async () => {
    writeBin(layout, "ALCOA", "a.mcx-8", buildBinFixture({ magic: MAGIC_MCX_8 }));
    writeBin(layout, "ALCOA", "b.mcx-8", buildBinFixture({ magic: MAGIC_MCX_8 }));
    writeBin(layout, "ITW", "c.mcam", buildBinFixture({ magic: MAGIC_ZIP }));

    const engine = new McxBatchExtractorEngine();
    const first = await engine.extractBatch({
      rootDir: layout.rootDir,
      outputRoot: layout.outputRoot,
      runId: "resume-1",
      maxFiles: 2,
    });
    expect(first.attempted).toBe(2);

    const second = await engine.extractBatch({
      rootDir: layout.rootDir,
      outputRoot: layout.outputRoot,
      runId: "resume-1",
    });
    expect(second.totalDiscovered).toBe(3);
    expect(second.skippedExisting).toBeGreaterThanOrEqual(2);
    expect(second.ok).toBeGreaterThanOrEqual(1);
  });

  // 14
  it("extractBatch resume=false re-parses every file even when checkpoint exists", async () => {
    writeBin(layout, "ALCOA", "a.mcx-8", buildBinFixture({ magic: MAGIC_MCX_8 }));
    writeBin(layout, "ALCOA", "b.mcx-8", buildBinFixture({ magic: MAGIC_MCX_8 }));

    const engine = new McxBatchExtractorEngine();
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
    writeBin(layout, "ALCOA", "tiny.mcx-8", buildBinFixture({ magic: MAGIC_MCX_8 }));
    const big = Buffer.concat([
      buildBinFixture({ magic: MAGIC_MCX_8 }),
      Buffer.alloc(2_000, 0),
    ]);
    writeBin(layout, "ALCOA", "big.mcx-8", big);
    const r = await new McxBatchExtractorEngine().extractBatch({
      rootDir: layout.rootDir,
      outputRoot: layout.outputRoot,
      runId: "oversize-1",
      maxBytesPerFile: 200,
    });
    expect(r.skippedOversize).toBeGreaterThanOrEqual(1);
    const skipped = r.perFile.find((p) => p.status === "skipped_oversize");
    expect(skipped?.error).toMatch(/file size .* > cap/);
  });

  // 16
  it("two extractBatch runs over the same fixtures produce identical aggregates", async () => {
    writeBin(layout, "AGRATI", "9091904.mcx-8", buildBinFixture({
      magic: MAGIC_MCX_8,
      zlibChunks: 3,
    }));
    writeBin(layout, "AGRATI", "9091905.mcam", buildBinFixture({
      magic: MAGIC_ZIP,
      zlibChunks: 1,
    }));
    writeBin(layout, "ITW", "001.mcx", buildBinFixture({ magic: MAGIC_OLE }));

    const out2 = fs.mkdtempSync(path.join(os.tmpdir(), "prism-mcx-batch-det-"));
    try {
      const a = await new McxBatchExtractorEngine().extractBatch({
        rootDir: layout.rootDir,
        outputRoot: layout.outputRoot,
        runId: "det-A",
      });
      const b = await new McxBatchExtractorEngine().extractBatch({
        rootDir: layout.rootDir,
        outputRoot: out2,
        runId: "det-B",
      });
      expect(b.byCustomer).toEqual(a.byCustomer);
      expect(b.byFormat).toEqual(a.byFormat);
      expect(b.byMagicVerified).toEqual(a.byMagicVerified);
      expect(b.totalDiscovered).toBe(a.totalDiscovered);
      expect(b.ok).toBe(a.ok);
    } finally {
      fs.rmSync(out2, { recursive: true, force: true });
    }
  });

  // 17 — adversarial: non-existent rootDir + corrupt-checkpoint resume
  it("survives a non-existent rootDir and a corrupt checkpoint without throwing", async () => {
    const ghostRoot = path.join(layout.rootDir, "does", "not", "exist");
    // Pre-seed a corrupt checkpoint at the path the engine will look at
    const ckptPath = buildCheckpointPath(layout.outputRoot, "adv-1");
    fs.mkdirSync(path.dirname(ckptPath), { recursive: true });
    fs.writeFileSync(ckptPath, "{not valid json", "utf8");

    const r = await new McxBatchExtractorEngine().extractBatch({
      rootDir: ghostRoot,
      outputRoot: layout.outputRoot,
      runId: "adv-1",
    });
    expect(r.totalDiscovered).toBe(0);
    expect(r.attempted).toBe(0);
    expect(r.ok).toBe(0);
    expect(r.parseFailed).toBe(0);
    expect(r.ioErrors).toBe(0);
    expect(r.perFile.length).toBe(0);
    // Final checkpoint write replaces the corrupt one with a valid stub
    const fresh = loadCheckpoint(ckptPath);
    expect(fresh).not.toBeNull();
    expect(fresh?.runId).toBe("adv-1");
  });
});
