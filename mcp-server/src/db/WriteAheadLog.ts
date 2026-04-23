/**
 * WriteAheadLog — Crash-Safe Durability for PersistenceBridge (INTEG-MS2)
 * ========================================================================
 *
 * Implements a Write-Ahead Log (WAL) to ensure no queued writes are lost on crash.
 * All writes are appended to the WAL before being sent to PostgreSQL, and
 * checkpointed after successful persistence.
 *
 * Pattern:
 *   1. persist() → WAL append (sync) → return sequence number
 *   2. flushAll() → PostgreSQL write → WAL checkpoint
 *   3. loadAll() → replay uncommitted WAL entries
 *
 * WAL File Format (JSON Lines):
 *   {"seq":1,"ts":"...","op":"upsert","entity":"...","key":"...","hash":"...","data":{...}}
 *   {"seq":2,"ts":"...","op":"delete","entity":"...","key":"..."}
 *   {"seq":1,"ts":"...","op":"checkpoint"}  // marks seq 1 as committed
 *
 * @version 1.0.0 — INTEG-MS2
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { PATHS } from "../constants.js";

// ============================================================================
// TYPES
// ============================================================================

export type WALOperationType = "upsert" | "delete" | "checkpoint";

export interface WALEntry {
  seq: number;
  ts: string;
  op: WALOperationType;
  entity: string;
  key: string;
  hash?: string;        // SHA-256 of serialized data (for upsert)
  data?: unknown;       // Payload (for upsert)
  checkpoint_seq?: number; // For checkpoint entries, the seq being checkpointed
}

export interface WALConfig {
  /** WAL file path */
  walPath: string;
  /** Max uncommitted entries before forcing a sync flush */
  maxUncommitted: number;
  /** Max WAL file size in bytes before compaction (default 10MB) */
  maxFileSizeBytes: number;
  /** Retention period for compacted entries (default 24h) */
  retentionMs: number;
  /** Enable fsync after each write (slower but safer) */
  fsyncEnabled: boolean;
}

export interface WALHealth {
  enabled: boolean;
  walPath: string;
  currentSeq: number;
  uncommittedCount: number;
  fileSizeBytes: number;
  lastCompaction: string | null;
  recoveredEntries: number;
}

// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULT_CONFIG: WALConfig = {
  walPath: path.join(PATHS.STATE_DIR, "persistence_wal.jsonl"),
  maxUncommitted: 100,
  maxFileSizeBytes: 10 * 1024 * 1024, // 10MB
  retentionMs: 24 * 60 * 60 * 1000,   // 24 hours
  fsyncEnabled: true,
};

// ============================================================================
// WAL ENGINE
// ============================================================================

class WriteAheadLogImpl {
  private config: WALConfig = { ...DEFAULT_CONFIG };
  private enabled: boolean = false;
  private currentSeq: number = 0;
  private uncommitted: Map<number, WALEntry> = new Map();
  private fd: number | null = null;
  private lastCompaction: Date | null = null;
  private recoveredEntries: number = 0;
  private compactionTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Initialize the WAL. Call once at startup.
   * Returns any uncommitted entries that need to be replayed.
   */
  async init(config?: Partial<WALConfig>): Promise<WALEntry[]> {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Ensure directory exists
    const dir = path.dirname(this.config.walPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Open or create WAL file
    try {
      this.fd = fs.openSync(this.config.walPath, "a+");
      this.enabled = true;
    } catch (err) {
      console.error(`[WAL] Failed to open WAL file: ${err}`);
      this.enabled = false;
      return [];
    }

    // Replay and find uncommitted entries
    const uncommitted = await this.replay();
    this.recoveredEntries = uncommitted.length;

    // Start background compaction
    this.startCompactionTimer();

    console.error(`[WAL] Initialized: seq=${this.currentSeq}, uncommitted=${uncommitted.length}`);
    return uncommitted;
  }

  /**
   * Append a write operation to the WAL (U-INTEG10, U-INTEG11).
   * Returns the sequence number assigned.
   */
  append(op: "upsert" | "delete", entity: string, key: string, data?: unknown): number {
    if (!this.enabled || !this.fd) {
      return -1;
    }

    const seq = ++this.currentSeq;
    const ts = new Date().toISOString();
    const hash = data ? this.hashData(data) : undefined;

    const entry: WALEntry = {
      seq,
      ts,
      op,
      entity,
      key,
      hash,
      data: op === "upsert" ? data : undefined,
    };

    // Write to WAL file (append)
    const line = JSON.stringify(entry) + "\n";
    try {
      fs.writeSync(this.fd, line);
      if (this.config.fsyncEnabled) {
        fs.fsyncSync(this.fd);
      }
    } catch (err) {
      console.error(`[WAL] Failed to write entry seq=${seq}: ${err}`);
      return -1;
    }

    // Track uncommitted
    this.uncommitted.set(seq, entry);

    return seq;
  }

  /**
   * Checkpoint a sequence number after successful persistence (U-INTEG11).
   * Marks the entry as committed.
   */
  checkpoint(seq: number): boolean {
    if (!this.enabled || !this.fd || !this.uncommitted.has(seq)) {
      return false;
    }

    const ts = new Date().toISOString();
    const checkpointEntry: WALEntry = {
      seq: this.currentSeq + 1, // Checkpoint gets its own seq
      ts,
      op: "checkpoint",
      entity: "",
      key: "",
      checkpoint_seq: seq,
    };

    // Write checkpoint to WAL
    const line = JSON.stringify(checkpointEntry) + "\n";
    try {
      fs.writeSync(this.fd, line);
      if (this.config.fsyncEnabled) {
        fs.fsyncSync(this.fd);
      }
    } catch (err) {
      console.error(`[WAL] Failed to write checkpoint for seq=${seq}: ${err}`);
      return false;
    }

    // Remove from uncommitted
    this.uncommitted.delete(seq);
    this.currentSeq++;

    return true;
  }

  /**
   * Checkpoint multiple sequence numbers at once.
   */
  checkpointBatch(seqs: number[]): number {
    let checkpointed = 0;
    for (const seq of seqs) {
      if (this.checkpoint(seq)) {
        checkpointed++;
      }
    }
    return checkpointed;
  }

  /**
   * Replay the WAL file and return uncommitted entries (U-INTEG12).
   * Called during init() to recover from crash.
   */
  private async replay(): Promise<WALEntry[]> {
    if (!this.enabled) return [];

    const walPath = this.config.walPath;
    if (!fs.existsSync(walPath)) {
      return [];
    }

    const content = fs.readFileSync(walPath, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);

    const entries = new Map<number, WALEntry>();
    const checkpointed = new Set<number>();
    let maxSeq = 0;

    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as WALEntry;
        maxSeq = Math.max(maxSeq, entry.seq);

        if (entry.op === "checkpoint" && entry.checkpoint_seq !== undefined) {
          checkpointed.add(entry.checkpoint_seq);
          entries.delete(entry.checkpoint_seq);
        } else if (entry.op === "upsert" || entry.op === "delete") {
          entries.set(entry.seq, entry);
        }
      } catch (err) {
        console.error(`[WAL] Failed to parse line: ${line.slice(0, 100)}...`);
      }
    }

    // Remove checkpointed entries
    for (const seq of checkpointed) {
      entries.delete(seq);
    }

    this.currentSeq = maxSeq;
    this.uncommitted = entries;

    return Array.from(entries.values()).sort((a, b) => a.seq - b.seq);
  }

  /**
   * Compact the WAL file, removing checkpointed entries (U-INTEG13).
   * Called periodically or when file exceeds size threshold.
   */
  async compact(): Promise<{ removed: number; remaining: number }> {
    if (!this.enabled) {
      return { removed: 0, remaining: 0 };
    }

    const walPath = this.config.walPath;
    const stats = fs.statSync(walPath);

    // Only compact if file is large enough
    if (stats.size < this.config.maxFileSizeBytes / 2) {
      return { removed: 0, remaining: this.uncommitted.size };
    }

    console.error(`[WAL] Starting compaction: size=${stats.size} bytes`);

    // Close current file descriptor
    if (this.fd !== null) {
      fs.closeSync(this.fd);
      this.fd = null;
    }

    // Read all entries
    const content = fs.readFileSync(walPath, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);

    // Keep only uncommitted entries and recent checkpoints
    const cutoff = Date.now() - this.config.retentionMs;
    const keep: string[] = [];
    let removed = 0;

    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as WALEntry;
        const entryTime = new Date(entry.ts).getTime();

        // Keep if uncommitted or recent
        if (this.uncommitted.has(entry.seq) || entryTime > cutoff) {
          keep.push(line);
        } else {
          removed++;
        }
      } catch {
        removed++;
      }
    }

    // Write compacted file
    const tempPath = walPath + ".compact";
    fs.writeFileSync(tempPath, keep.join("\n") + (keep.length > 0 ? "\n" : ""));
    fs.renameSync(tempPath, walPath);

    // Reopen file descriptor
    this.fd = fs.openSync(walPath, "a+");
    this.lastCompaction = new Date();

    console.error(`[WAL] Compaction complete: removed=${removed}, remaining=${keep.length}`);

    return { removed, remaining: keep.length };
  }

  /**
   * Get WAL health metrics.
   */
  getHealth(): WALHealth {
    let fileSizeBytes = 0;
    try {
      if (fs.existsSync(this.config.walPath)) {
        fileSizeBytes = fs.statSync(this.config.walPath).size;
      }
    } catch { /* ignore */ }

    return {
      enabled: this.enabled,
      walPath: this.config.walPath,
      currentSeq: this.currentSeq,
      uncommittedCount: this.uncommitted.size,
      fileSizeBytes,
      lastCompaction: this.lastCompaction?.toISOString() ?? null,
      recoveredEntries: this.recoveredEntries,
    };
  }

  /**
   * Get uncommitted entries for replay.
   */
  getUncommitted(): WALEntry[] {
    return Array.from(this.uncommitted.values()).sort((a, b) => a.seq - b.seq);
  }

  /**
   * Check if WAL has uncommitted entries.
   */
  hasUncommitted(): boolean {
    return this.uncommitted.size > 0;
  }

  /**
   * Force sync all pending writes to disk.
   */
  sync(): void {
    if (this.fd !== null) {
      try {
        fs.fsyncSync(this.fd);
      } catch (err) {
        console.error(`[WAL] fsync failed: ${err}`);
      }
    }
  }

  /**
   * Close the WAL file.
   */
  close(): void {
    this.stopCompactionTimer();
    if (this.fd !== null) {
      try {
        fs.fsyncSync(this.fd);
        fs.closeSync(this.fd);
      } catch (err) {
        console.error(`[WAL] Failed to close WAL: ${err}`);
      }
      this.fd = null;
    }
    this.enabled = false;
  }

  /**
   * Reset for testing.
   */
  reset(): void {
    this.close();
    this.currentSeq = 0;
    this.uncommitted.clear();
    this.lastCompaction = null;
    this.recoveredEntries = 0;

    // Delete WAL file
    try {
      if (fs.existsSync(this.config.walPath)) {
        fs.unlinkSync(this.config.walPath);
      }
    } catch { /* ignore */ }
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private hashData(data: unknown): string {
    const json = JSON.stringify(data);
    return crypto.createHash("sha256").update(json).digest("hex").slice(0, 16);
  }

  private startCompactionTimer(): void {
    // Check for compaction every 5 minutes
    this.compactionTimer = setInterval(() => {
      this.checkCompaction();
    }, 5 * 60 * 1000);
  }

  private stopCompactionTimer(): void {
    if (this.compactionTimer) {
      clearInterval(this.compactionTimer);
      this.compactionTimer = null;
    }
  }

  private checkCompaction(): void {
    try {
      if (!fs.existsSync(this.config.walPath)) return;

      const stats = fs.statSync(this.config.walPath);
      if (stats.size > this.config.maxFileSizeBytes) {
        this.compact().catch(err => {
          console.error(`[WAL] Background compaction failed: ${err}`);
        });
      }
    } catch { /* ignore */ }
  }
}

export const writeAheadLog = new WriteAheadLogImpl();
export { WriteAheadLogImpl };
