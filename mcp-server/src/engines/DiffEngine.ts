/**
 * PRISM D4 — Diff Engine
 * ========================
 * 
 * CRC32 checksum-based diff detection for file writes.
 * Shadow-write pattern: write to .tmp → validate → atomic swap.
 * Only writes when content actually changes, eliminating redundant I/O.
 * 
 * IMPORTED BY: cadenceExecutor.ts, documentDispatcher.ts, devDispatcher.ts
 * ZERO TOKEN COST — pure server-side execution
 * 
 * @version 1.0.0
 * @date 2026-02-09
 * @dimension D4 — Performance & Caching
 */

import * as fs from "fs";
import * as path from "path";
import { PATHS } from "../constants.js";

// ============================================================================
// TYPES
// ============================================================================

export interface DiffResult {
  changed: boolean;
  action: "written" | "skipped" | "created" | "error";
  path: string;
  old_checksum?: number;
  new_checksum?: number;
  bytes_saved?: number;
}

export interface DiffStats {
  total_writes: number;
  actual_writes: number;
  skipped_writes: number;
  bytes_saved: number;
  shadow_write_errors: number;
}

// ============================================================================
// CRC32 (shared with ComputationCache)
// ============================================================================

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
})();

function crc32(str: string): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < str.length; i++) {
    crc = CRC32_TABLE[(crc ^ str.charCodeAt(i)) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

const STATE_DIR = PATHS.STATE_DIR;
const DIFF_STATS_FILE = path.join(STATE_DIR, "d4_diff_stats.json");

// Track checksums of files we've seen
const fileChecksums = new Map<string, number>();

// ============================================================================
// DIFF ENGINE CLASS
// ============================================================================

class DiffEngine {
  private stats: DiffStats = {
    total_writes: 0, actual_writes: 0,
    skipped_writes: 0, bytes_saved: 0,
    shadow_write_errors: 0,
  };

  /**
   * Write file only if content has changed.
   * Uses shadow-write pattern for atomic updates.
   */
  writeIfChanged(filePath: string, content: string): DiffResult {
    this.stats.total_writes++;
    const newChecksum = crc32(content);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      // New file — write directly
      try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, content, "utf-8");
        fileChecksums.set(filePath, newChecksum);
        this.stats.actual_writes++;
        return { changed: true, action: "created", path: filePath, new_checksum: newChecksum };
      } catch (err: any) {
        this.stats.shadow_write_errors++;
        return { changed: false, action: "error", path: filePath };
      }
    }

    // File exists — check cached checksum first (fast path)
    const cachedChecksum = fileChecksums.get(filePath);
    if (cachedChecksum !== undefined && cachedChecksum === newChecksum) {
      this.stats.skipped_writes++;
      this.stats.bytes_saved += Buffer.byteLength(content, "utf-8");
      return {
        changed: false, action: "skipped", path: filePath,
        old_checksum: cachedChecksum, new_checksum: newChecksum,
        bytes_saved: Buffer.byteLength(content, "utf-8"),
      };
    }

    // No cached checksum — read from disk
    try {
      const existing = fs.readFileSync(filePath, "utf-8");
      const oldChecksum = crc32(existing);
      fileChecksums.set(filePath, oldChecksum);

      if (oldChecksum === newChecksum) {
        this.stats.skipped_writes++;
        this.stats.bytes_saved += Buffer.byteLength(content, "utf-8");
        return {
          changed: false, action: "skipped", path: filePath,
          old_checksum: oldChecksum, new_checksum: newChecksum,
          bytes_saved: Buffer.byteLength(content, "utf-8"),
        };
      }
    } catch { /* file read failed, proceed with write */ }

    // Content changed — use shadow-write pattern
    const tmpPath = filePath + ".d4tmp";
    try {
      // 1. Write to temp file
      fs.writeFileSync(tmpPath, content, "utf-8");

      // 2. Validate temp file is readable and correct
      const verify = fs.readFileSync(tmpPath, "utf-8");
      if (crc32(verify) !== newChecksum) {
        fs.unlinkSync(tmpPath);
        this.stats.shadow_write_errors++;
        return { changed: false, action: "error", path: filePath };
      }

      // 3. Atomic rename (swap)
      fs.renameSync(tmpPath, filePath);
      fileChecksums.set(filePath, newChecksum);
      this.stats.actual_writes++;
      return { changed: true, action: "written", path: filePath, new_checksum: newChecksum };
    } catch (err: any) {
      // Cleanup temp file on failure
      try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch { /* ignore */ }
      this.stats.shadow_write_errors++;
      return { changed: false, action: "error", path: filePath };
    }
  }

  /**
   * Check if file would change without writing
   */
  wouldChange(filePath: string, content: string): boolean {
    const newChecksum = crc32(content);
    const cached = fileChecksums.get(filePath);
    if (cached !== undefined) return cached !== newChecksum;
    try {
      const existing = fs.readFileSync(filePath, "utf-8");
      const oldChecksum = crc32(existing);
      fileChecksums.set(filePath, oldChecksum);
      return oldChecksum !== newChecksum;
    } catch {
      return true; // file doesn't exist, so it would change
    }
  }

  getStats(): DiffStats { return { ...this.stats }; }

  persistStats(): void {
    try {
      fs.writeFileSync(DIFF_STATS_FILE, JSON.stringify(this.getStats(), null, 2));
    } catch { /* non-fatal */ }
  }

  /**
   * Invalidate cached checksum for a path (when external writes happen)
   */
  invalidateChecksum(filePath: string): void {
    fileChecksums.delete(filePath);
  }
}

// Singleton export
export const diffEngine = new DiffEngine();
