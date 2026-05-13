/**
 * inventoryFreshness.test.ts — verifies U-CLEANUP-G6
 *
 * Tests the pure exports of `scripts/inventory-freshness.mjs`:
 *   - newestMtimeInDir(dir, suffix) — recursive walk, returns {path, mtimeMs}
 *   - classifyFreshness({inventoryMtimeMs, newestEngineMtimeMs, newestCommitIso})
 *     — pure decision: stale iff any signal post-dates inventory.
 *
 * (`newestCommitTouchingDir` is a thin wrapper over `git log` — exercised
 *  by the end-to-end script run rather than unit-tested in isolation.)
 *
 * Coverage floor (per comprehensive-build-enforce):
 *   Happy: newestMtimeInDir picks the file with the latest mtime across
 *          a 4-file tree, nested 2 levels deep.
 *   Happy: classifyFreshness — fresh when inventory > engine mtime AND no commit.
 *   Failure 1: classifyFreshness — stale because engine file is newer.
 *   Failure 2: classifyFreshness — stale because git commit is newer.
 *   Failure 3: newestMtimeInDir returns null for empty dir / wrong suffix.
 *   Adversarial 1: classifyFreshness with malformed commit ISO -> treated as no-commit.
 *   Adversarial 2: classifyFreshness with newestEngineMtimeMs=null -> commits decide alone.
 *   Variability: 3 timing profiles (cold/just-shipped/many-stale-commits).
 */

import { describe, it, expect, beforeAll, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// @ts-expect-error: .mjs ESM import from .ts test file
import { newestMtimeInDir, classifyFreshness } from "../../../scripts/inventory-freshness.mjs";

const SCRIPT = "H:/prism/scripts/inventory-freshness.mjs";
const tmpDirs: string[] = [];

beforeAll(() => {
  expect(fs.existsSync(SCRIPT)).toBe(true);
});

afterEach(() => {
  while (tmpDirs.length > 0) {
    const d = tmpDirs.pop();
    if (!d) continue;
    try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* ignore */ }
  }
});

/** Build a synthetic engines tree under tmp with explicit per-file mtimes (ms). */
function makeEngineTree(files: Array<{ rel: string; mtimeMs: number }>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "g6-inv-fresh-"));
  tmpDirs.push(dir);
  for (const f of files) {
    const full = path.join(dir, f.rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, `// synthetic test engine ${f.rel}\n`);
    fs.utimesSync(full, new Date(f.mtimeMs), new Date(f.mtimeMs));
  }
  return dir;
}

// ─── newestMtimeInDir ───────────────────────────────────────────────────
describe("U-CLEANUP-G6 newestMtimeInDir", () => {
  it("picks the file with the latest mtime across nested 2-level tree (happy)", () => {
    const base = 1_700_000_000_000;
    const dir = makeEngineTree([
      { rel: "AlphaEngine.ts", mtimeMs: base + 1_000 },
      { rel: "sub/BravoEngine.ts", mtimeMs: base + 5_000 }, // newest
      { rel: "sub/CharlieEngine.ts", mtimeMs: base + 3_000 },
      { rel: "sub/deeper/DeltaEngine.ts", mtimeMs: base + 4_000 },
    ]);
    const got = newestMtimeInDir(dir, ".ts");
    expect(got).not.toBeNull();
    expect(path.basename(got.path)).toBe("BravoEngine.ts");
    // Within 1s of expected (filesystem mtime precision varies on Windows).
    expect(Math.abs(got.mtimeMs - (base + 5_000))).toBeLessThan(1_000);
  });

  it("returns null for empty dir (failure 3)", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "g6-empty-"));
    tmpDirs.push(dir);
    expect(newestMtimeInDir(dir, ".ts")).toBeNull();
  });

  it("returns null when no file matches the suffix (failure 3 variant)", () => {
    const dir = makeEngineTree([
      { rel: "EngineDocs.md", mtimeMs: 1_700_000_000_000 },
      { rel: "OldEngine.js",  mtimeMs: 1_700_000_000_000 },
    ]);
    expect(newestMtimeInDir(dir, ".ts")).toBeNull();
  });

  it("returns null for missing dir (defensive)", () => {
    expect(newestMtimeInDir("H:/no/such/dir/exists", ".ts")).toBeNull();
  });

  it("respects suffix filter — ignores non-.ts files in same tree", () => {
    const base = 1_700_000_000_000;
    const dir = makeEngineTree([
      { rel: "AEngine.ts", mtimeMs: base + 1_000 },
      { rel: "BEngine.js", mtimeMs: base + 9_000 }, // newer but wrong suffix — must be ignored
    ]);
    const got = newestMtimeInDir(dir, ".ts");
    expect(got).not.toBeNull();
    expect(path.basename(got.path)).toBe("AEngine.ts");
  });
});

// ─── classifyFreshness ─────────────────────────────────────────────────
describe("U-CLEANUP-G6 classifyFreshness", () => {
  const INV_MS = Date.parse("2026-05-13T18:00:00.000Z");

  it("fresh when inventory > engine mtime AND no commit (happy)", () => {
    const out = classifyFreshness({
      inventoryMtimeMs: INV_MS,
      newestEngineMtimeMs: INV_MS - 60_000, // 1 min older
      newestCommitIso: null,
    });
    expect(out.isStale).toBe(false);
    expect(out.reason).toBe("fresh");
    expect(out.maxLagMs).toBe(0);
  });

  it("stale — engine file newer than inventory (failure 1)", () => {
    const out = classifyFreshness({
      inventoryMtimeMs: INV_MS,
      newestEngineMtimeMs: INV_MS + 30_000, // 30 s newer
      newestCommitIso: null,
    });
    expect(out.isStale).toBe(true);
    expect(out.reason).toBe("engine_file_newer_than_inventory");
    expect(out.lagFromEngineMs).toBe(30_000);
    expect(out.maxLagMs).toBe(30_000);
  });

  it("stale — commit newer than inventory (failure 2, no engine lag)", () => {
    const out = classifyFreshness({
      inventoryMtimeMs: INV_MS,
      newestEngineMtimeMs: INV_MS - 5_000,
      newestCommitIso: new Date(INV_MS + 120_000).toISOString(), // 2 min newer
    });
    expect(out.isStale).toBe(true);
    expect(out.reason).toBe("commit_newer_than_inventory");
    expect(out.lagFromCommitMs).toBe(120_000);
    expect(out.lagFromEngineMs).toBe(0);
    expect(out.maxLagMs).toBe(120_000);
  });

  it("engine-newer-AND-commit-newer reports engine reason first (priority)", () => {
    const out = classifyFreshness({
      inventoryMtimeMs: INV_MS,
      newestEngineMtimeMs: INV_MS + 10_000,
      newestCommitIso: new Date(INV_MS + 200_000).toISOString(),
    });
    expect(out.isStale).toBe(true);
    // Engine reason wins (file-mtime is the more local, faster-to-act-on signal).
    expect(out.reason).toBe("engine_file_newer_than_inventory");
    expect(out.maxLagMs).toBe(200_000);
  });

  it("adversarial 1 — malformed commit ISO treated as no-commit", () => {
    const out = classifyFreshness({
      inventoryMtimeMs: INV_MS,
      newestEngineMtimeMs: INV_MS - 60_000,
      newestCommitIso: "not-an-iso-timestamp",
    });
    expect(out.isStale).toBe(false);
    expect(out.reason).toBe("fresh");
    expect(out.lagFromCommitMs).toBe(0);
  });

  it("adversarial 2 — newestEngineMtimeMs=null: commits alone decide", () => {
    const stale = classifyFreshness({
      inventoryMtimeMs: INV_MS,
      newestEngineMtimeMs: null,
      newestCommitIso: new Date(INV_MS + 60_000).toISOString(),
    });
    expect(stale.isStale).toBe(true);
    expect(stale.reason).toBe("commit_newer_than_inventory");

    const fresh = classifyFreshness({
      inventoryMtimeMs: INV_MS,
      newestEngineMtimeMs: null,
      newestCommitIso: null,
    });
    expect(fresh.isStale).toBe(false);
  });

  it("variability — 3 spanning timing profiles", () => {
    // Cold (engine and commit both old, inventory just regenerated):
    expect(classifyFreshness({
      inventoryMtimeMs: INV_MS,
      newestEngineMtimeMs: INV_MS - 86_400_000, // 1 day old engine
      newestCommitIso: new Date(INV_MS - 3600_000).toISOString(),
    }).isStale).toBe(false);

    // Just-shipped (engine touched 1 ms before inventory regen — fresh):
    expect(classifyFreshness({
      inventoryMtimeMs: INV_MS,
      newestEngineMtimeMs: INV_MS - 1,
      newestCommitIso: null,
    }).isStale).toBe(false);

    // Many-stale-commits (engine fresh, commits 5 min old):
    expect(classifyFreshness({
      inventoryMtimeMs: INV_MS,
      newestEngineMtimeMs: INV_MS - 1000,
      newestCommitIso: new Date(INV_MS + 5 * 60_000).toISOString(),
    }).isStale).toBe(true);
  });
});
