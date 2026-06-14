/**
 * DiffEngine — companion test
 * ============================
 * WIRE-UNWIRED-MS0/U-WIRE-DIFF-ENGINE
 *
 * Verifies the prism_infra observability + admin surface:
 *   - diff_stats           → diffEngine.getStats()
 *   - diff_persist_stats   → diffEngine.persistStats()  (round-trip JSON file)
 *   - diff_would_change    → diffEngine.wouldChange(filePath, content)
 *   - diff_invalidate      → diffEngine.invalidateChecksum(filePath)
 *
 * Also exercises writeIfChanged() so the shadow-write + checksum-cache
 * invariants are protected by real reference assertions, not toBeDefined()
 * stubs (PRISM R9). The wiring intentionally does NOT expose writeIfChanged
 * to MCP clients (would let any client write to any path).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { diffEngine, type DiffStats } from "../engines/DiffEngine.js";

function resetDiffEngineSingleton(): void {
  // getStats() returns a shallow copy — but writes to the engine's internal
  // `stats` field are needed to reset cumulative counters between tests.
  const eng = diffEngine as unknown as { stats: DiffStats };
  eng.stats = {
    total_writes: 0,
    actual_writes: 0,
    skipped_writes: 0,
    bytes_saved: 0,
    shadow_write_errors: 0,
  };
}

describe("DiffEngine", () => {
  let tmpDir: string;
  let tmpFile: string;
  /** Every test path passed to writeIfChanged/wouldChange is added here so
   *  afterEach can drop ALL of them from the module-level `fileChecksums`
   *  Map (DiffEngine.ts:52). Without this the deep-nested-dir test and any
   *  ad-hoc paths would leak into subsequent tests. */
  let trackedPaths: string[];

  /** Convenience: register every path we touch so afterEach can clear it.
   *  Public to the suite — tests should use this instead of bare engine calls. */
  function track(p: string): string {
    if (!trackedPaths.includes(p)) trackedPaths.push(p);
    return p;
  }

  beforeEach(() => {
    resetDiffEngineSingleton();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "diff-engine-test-"));
    tmpFile = path.join(tmpDir, "probe.txt");
    trackedPaths = [tmpFile];
  });

  afterEach(() => {
    // 1. Drop checksum cache for EVERY path we touched (defeat module-level leak).
    for (const p of trackedPaths) {
      diffEngine.invalidateChecksum(p);
    }
    // 2. Remove tmpDir. On Windows, rmSync may briefly EBUSY on locked handles;
    //    surface that as a warning rather than silently swallow (R12 — fail loud).
    if (fs.existsSync(tmpDir)) {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch (err) {
        console.warn(`[DiffEngine.test] tmpDir cleanup failed for ${tmpDir}:`, err);
      }
    }
  });

  describe("getStats (read-only observability)", () => {
    it("returns the DiffStats shape with zeroed counters after reset", () => {
      const stats = diffEngine.getStats();
      expect(stats).toMatchObject({
        total_writes: 0,
        actual_writes: 0,
        skipped_writes: 0,
        bytes_saved: 0,
        shadow_write_errors: 0,
      });
    });

    it("getStats() returns an independent shallow copy — no mutation leak", () => {
      const snap = diffEngine.getStats();
      snap.total_writes = 999;
      expect(diffEngine.getStats().total_writes).toBe(0);
    });
  });

  describe("writeIfChanged — creation path", () => {
    it("creates a new file when target does not exist; action='created'", () => {
      const result = diffEngine.writeIfChanged(tmpFile, "hello world");
      expect(result.changed).toBe(true);
      expect(result.action).toBe("created");
      expect(result.path).toBe(tmpFile);
      expect(result.new_checksum).toBeTypeOf("string");
      expect(result.new_checksum!.length).toBeGreaterThan(0);
      expect(fs.readFileSync(tmpFile, "utf-8")).toBe("hello world");
      expect(diffEngine.getStats().actual_writes).toBe(1);
    });
  });

  describe("writeIfChanged — skip path (idempotent)", () => {
    it("returns action='skipped' when content matches the cached checksum", () => {
      diffEngine.writeIfChanged(tmpFile, "same"); // populates cache
      const r2 = diffEngine.writeIfChanged(tmpFile, "same");
      expect(r2.changed).toBe(false);
      expect(r2.action).toBe("skipped");
      expect(r2.old_checksum).toBe(r2.new_checksum);
      expect(r2.bytes_saved).toBe(Buffer.byteLength("same", "utf-8"));
      const stats = diffEngine.getStats();
      expect(stats.skipped_writes).toBe(1);
      expect(stats.bytes_saved).toBe(Buffer.byteLength("same", "utf-8"));
    });

    it("re-reads from disk and skips when cache is empty but content matches", () => {
      fs.writeFileSync(tmpFile, "on-disk", "utf-8");
      // Cache is empty for this path — wouldChange/writeIfChanged should
      // re-read and detect the match.
      const r = diffEngine.writeIfChanged(tmpFile, "on-disk");
      expect(r.changed).toBe(false);
      expect(r.action).toBe("skipped");
      expect(r.old_checksum).toBe(r.new_checksum);
    });
  });

  describe("writeIfChanged — update path (shadow-write)", () => {
    it("performs an atomic update when content differs and leaves no .d4tmp behind", () => {
      diffEngine.writeIfChanged(tmpFile, "v1");
      const r2 = diffEngine.writeIfChanged(tmpFile, "v2");
      expect(r2.changed).toBe(true);
      expect(r2.action).toBe("written");
      expect(fs.readFileSync(tmpFile, "utf-8")).toBe("v2");
      // No leftover temp from shadow-write
      expect(fs.existsSync(tmpFile + ".d4tmp")).toBe(false);
      const stats = diffEngine.getStats();
      expect(stats.actual_writes).toBe(2);
      expect(stats.skipped_writes).toBe(0);
    });
  });

  describe("wouldChange (read-only predicate)", () => {
    it("returns true when the file does not exist (no path yet)", () => {
      expect(diffEngine.wouldChange(tmpFile, "anything")).toBe(true);
    });

    it("returns false when content exactly matches the on-disk content", () => {
      fs.writeFileSync(tmpFile, "stable", "utf-8");
      // First call seeds the cache + returns false (no change).
      expect(diffEngine.wouldChange(tmpFile, "stable")).toBe(false);
      // Second call hits the cache fast-path with the same answer.
      expect(diffEngine.wouldChange(tmpFile, "stable")).toBe(false);
    });

    it("returns true when content differs from the on-disk content", () => {
      fs.writeFileSync(tmpFile, "before", "utf-8");
      expect(diffEngine.wouldChange(tmpFile, "after")).toBe(true);
    });

    it("does NOT touch the stats counters (pure predicate)", () => {
      fs.writeFileSync(tmpFile, "x", "utf-8");
      diffEngine.wouldChange(tmpFile, "x");
      diffEngine.wouldChange(tmpFile, "y");
      const stats = diffEngine.getStats();
      expect(stats.total_writes).toBe(0);
      expect(stats.actual_writes).toBe(0);
      expect(stats.skipped_writes).toBe(0);
    });
  });

  describe("invalidateChecksum (admin)", () => {
    it("drops the cached checksum so the next op re-reads from disk", () => {
      diffEngine.writeIfChanged(tmpFile, "cached");
      // Manually overwrite the file outside the engine to invalidate the cache.
      fs.writeFileSync(tmpFile, "external-edit", "utf-8");
      diffEngine.invalidateChecksum(tmpFile);
      // Now wouldChange must re-read from disk and see the external content,
      // so writing 'cached' would be a CHANGE (we already wrote a different
      // value out-of-band).
      expect(diffEngine.wouldChange(tmpFile, "cached")).toBe(true);
    });
  });

  describe("persistStats", () => {
    it("writes a parseable JSON snapshot to data/state/d4_diff_stats.json", async () => {
      const { PATHS } = await import("../constants.js");
      const target = path.join(PATHS.STATE_DIR, "d4_diff_stats.json");

      diffEngine.writeIfChanged(tmpFile, "persist-probe");
      const expected = diffEngine.getStats();
      diffEngine.persistStats();

      expect(fs.existsSync(target)).toBe(true);
      const round = JSON.parse(fs.readFileSync(target, "utf8")) as DiffStats;
      expect(round.total_writes).toBe(expected.total_writes);
      expect(round.actual_writes).toBe(expected.actual_writes);
      expect(round.bytes_saved).toBe(expected.bytes_saved);
    });
  });

  describe("adversarial inputs", () => {
    it("handles empty content (creates an empty file)", () => {
      const r = diffEngine.writeIfChanged(tmpFile, "");
      expect(r.action).toBe("created");
      expect(fs.readFileSync(tmpFile, "utf-8")).toBe("");
    });

    it("creates the parent directory if it does not exist", () => {
      const nested = track(path.join(tmpDir, "a", "b", "c", "deep.txt"));
      const r = diffEngine.writeIfChanged(nested, "in-the-deep");
      expect(r.action).toBe("created");
      expect(fs.existsSync(nested)).toBe(true);
    });

    it("handles unicode + 4-byte UTF-8 sequences correctly", () => {
      const content = "héllo 🔧 ⚙️ ∇²"; // includes 4-byte and 2-byte chars
      diffEngine.writeIfChanged(tmpFile, content);
      const r2 = diffEngine.writeIfChanged(tmpFile, content);
      expect(r2.action).toBe("skipped");
      expect(r2.bytes_saved).toBe(Buffer.byteLength(content, "utf-8"));
    });
  });
});
