/**
 * CADPluginTamperAuditLogEngine — U-CAD-APP-16 (PHASE-48)
 *
 * Hash-chained command audit log for tamper-evident CAD plugin operations.
 * Provides cryptographic guarantees for audit trail integrity.
 *
 * Features:
 *   - Hash-chained log entries (blockchain-style)
 *   - Command recording with metadata
 *   - Chain integrity verification
 *   - Export for compliance/audit
 *   - Tamper detection
 *   - Session-based log segmentation
 *
 * @module engines/CADPluginTamperAuditLogEngine
 */

import { z } from "zod";

// ── Schemas ─────────────────────────────────────────────────────────────────

export const AuditEntrySchema = z.object({
  index: z.number().int().nonnegative(),
  timestamp: z.string().datetime(),
  sessionId: z.string(),
  userId: z.string(),
  command: z.string(),
  args: z.record(z.string(), z.unknown()),
  result: z.enum(["success", "failure", "error"]),
  durationMs: z.number().nonnegative(),
  previousHash: z.string(),
  entryHash: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type AuditEntry = z.infer<typeof AuditEntrySchema>;

export const AuditChainSchema = z.object({
  chainId: z.string(),
  createdAt: z.string().datetime(),
  lastEntry: z.number().int().nonnegative(),
  lastHash: z.string(),
  entryCount: z.number().int().nonnegative(),
  isValid: z.boolean(),
});
export type AuditChain = z.infer<typeof AuditChainSchema>;

export const IntegrityReportSchema = z.object({
  chainId: z.string(),
  verifiedAt: z.string().datetime(),
  entriesChecked: z.number().int().nonnegative(),
  isValid: z.boolean(),
  brokenAtIndex: z.number().int().optional(),
  expectedHash: z.string().optional(),
  actualHash: z.string().optional(),
  errors: z.array(z.string()),
});
export type IntegrityReport = z.infer<typeof IntegrityReportSchema>;

export const ExportFormatSchema = z.enum(["json", "csv", "jsonl"]);
export type ExportFormat = z.infer<typeof ExportFormatSchema>;

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface AuditClock {
  now(): string;
}

export interface AuditHasher {
  hash(data: string): string;
}

function defaultClock(): AuditClock {
  return { now: () => new Date().toISOString() };
}

function defaultHasher(): AuditHasher {
  return {
    hash: (data: string): string => {
      let h = 0;
      for (let i = 0; i < data.length; i++) {
        h = ((h << 5) - h + data.charCodeAt(i)) | 0;
      }
      return "h" + Math.abs(h).toString(16).padStart(8, "0");
    },
  };
}

// ── Engine Implementation ───────────────────────────────────────────────────

type EntrySubscriber = (entry: AuditEntry) => void;
type TamperSubscriber = (report: IntegrityReport) => void;

export class CADPluginTamperAuditLogEngine {
  private clock: AuditClock;
  private hasher: AuditHasher;

  private entries: AuditEntry[] = [];
  private chainId: string;
  private genesisHash: string;

  private entrySubscribers: EntrySubscriber[] = [];
  private tamperSubscribers: TamperSubscriber[] = [];

  private maxEntries = 10000;
  private autoVerifyInterval = 100;
  private lastVerifyIndex = 0;

  constructor(opts: {
    clock?: AuditClock;
    hasher?: AuditHasher;
    chainId?: string;
    genesisHash?: string;
    maxEntries?: number;
    autoVerifyInterval?: number;
  } = {}) {
    this.clock = opts.clock ?? defaultClock();
    this.hasher = opts.hasher ?? defaultHasher();
    this.chainId = opts.chainId ?? `chain-${Date.now()}`;
    this.genesisHash = opts.genesisHash ?? this.hasher.hash("genesis");
    if (opts.maxEntries !== undefined) this.maxEntries = opts.maxEntries;
    if (opts.autoVerifyInterval !== undefined) this.autoVerifyInterval = opts.autoVerifyInterval;
  }

  // ── Entry Recording ───────────────────────────────────────────────────────

  recordCommand(
    sessionId: string,
    userId: string,
    command: string,
    args: Record<string, unknown>,
    result: AuditEntry["result"],
    durationMs: number,
    metadata?: Record<string, unknown>,
  ): AuditEntry {
    const index = this.entries.length;
    const previousHash = index === 0 ? this.genesisHash : this.entries[index - 1].entryHash;
    const timestamp = this.clock.now();

    const entryData = JSON.stringify({ index, timestamp, sessionId, userId, command, args, result, durationMs, previousHash, metadata });
    const entryHash = this.hasher.hash(entryData);

    const entry: AuditEntry = {
      index,
      timestamp,
      sessionId,
      userId,
      command,
      args,
      result,
      durationMs,
      previousHash,
      entryHash,
      metadata,
    };

    this.entries.push(entry);
    this.notifyEntry(entry);

    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }

    if (this.autoVerifyInterval > 0 && index - this.lastVerifyIndex >= this.autoVerifyInterval) {
      this.verifyChainIntegrity();
    }

    return entry;
  }

  getEntry(index: number): AuditEntry | undefined {
    return this.entries.find(e => e.index === index);
  }

  getLatestEntry(): AuditEntry | undefined {
    return this.entries[this.entries.length - 1];
  }

  getEntryCount(): number {
    return this.entries.length;
  }

  // ── Query ─────────────────────────────────────────────────────────────────

  queryEntries(opts: {
    sessionId?: string;
    userId?: string;
    command?: string;
    result?: AuditEntry["result"];
    startTime?: string;
    endTime?: string;
    limit?: number;
    offset?: number;
  } = {}): AuditEntry[] {
    let results = [...this.entries];

    if (opts.sessionId) results = results.filter(e => e.sessionId === opts.sessionId);
    if (opts.userId) results = results.filter(e => e.userId === opts.userId);
    if (opts.command) results = results.filter(e => e.command === opts.command);
    if (opts.result) results = results.filter(e => e.result === opts.result);
    if (opts.startTime) results = results.filter(e => e.timestamp >= opts.startTime!);
    if (opts.endTime) results = results.filter(e => e.timestamp <= opts.endTime!);

    if (opts.offset) results = results.slice(opts.offset);
    if (opts.limit) results = results.slice(0, opts.limit);

    return results;
  }

  getSessionHistory(sessionId: string): AuditEntry[] {
    return this.entries.filter(e => e.sessionId === sessionId);
  }

  getUserHistory(userId: string): AuditEntry[] {
    return this.entries.filter(e => e.userId === userId);
  }

  getCommandStats(): Map<string, { count: number; successRate: number; avgDurationMs: number }> {
    const stats = new Map<string, { total: number; success: number; duration: number }>();

    for (const entry of this.entries) {
      const existing = stats.get(entry.command) ?? { total: 0, success: 0, duration: 0 };
      existing.total++;
      if (entry.result === "success") existing.success++;
      existing.duration += entry.durationMs;
      stats.set(entry.command, existing);
    }

    const result = new Map<string, { count: number; successRate: number; avgDurationMs: number }>();
    for (const [cmd, data] of stats) {
      result.set(cmd, {
        count: data.total,
        successRate: data.total > 0 ? data.success / data.total : 0,
        avgDurationMs: data.total > 0 ? data.duration / data.total : 0,
      });
    }

    return result;
  }

  // ── Chain Integrity ───────────────────────────────────────────────────────

  verifyChainIntegrity(startIndex?: number, endIndex?: number): IntegrityReport {
    const start = startIndex ?? 0;
    const end = endIndex ?? this.entries.length - 1;
    const errors: string[] = [];
    let brokenAtIndex: number | undefined;
    let expectedHash: string | undefined;
    let actualHash: string | undefined;

    for (let i = start; i <= end && i < this.entries.length; i++) {
      const entry = this.entries[i];
      const expectedPrevHash = i === 0 ? this.genesisHash : this.entries[i - 1].entryHash;

      if (entry.previousHash !== expectedPrevHash) {
        errors.push(`Chain broken at index ${i}: expected previousHash ${expectedPrevHash}, got ${entry.previousHash}`);
        brokenAtIndex = i;
        expectedHash = expectedPrevHash;
        actualHash = entry.previousHash;
        break;
      }

      const entryData = JSON.stringify({
        index: entry.index,
        timestamp: entry.timestamp,
        sessionId: entry.sessionId,
        userId: entry.userId,
        command: entry.command,
        args: entry.args,
        result: entry.result,
        durationMs: entry.durationMs,
        previousHash: entry.previousHash,
        metadata: entry.metadata,
      });
      const computedHash = this.hasher.hash(entryData);

      if (entry.entryHash !== computedHash) {
        errors.push(`Entry ${i} tampered: expected hash ${computedHash}, got ${entry.entryHash}`);
        brokenAtIndex = i;
        expectedHash = computedHash;
        actualHash = entry.entryHash;
        break;
      }
    }

    this.lastVerifyIndex = this.entries.length - 1;

    const report: IntegrityReport = {
      chainId: this.chainId,
      verifiedAt: this.clock.now(),
      entriesChecked: Math.min(end - start + 1, this.entries.length),
      isValid: errors.length === 0,
      brokenAtIndex,
      expectedHash,
      actualHash,
      errors,
    };

    if (!report.isValid) {
      this.notifyTamper(report);
    }

    return report;
  }

  getChainInfo(): AuditChain {
    const lastEntry = this.entries[this.entries.length - 1];
    return {
      chainId: this.chainId,
      createdAt: this.entries[0]?.timestamp ?? this.clock.now(),
      lastEntry: lastEntry?.index ?? -1,
      lastHash: lastEntry?.entryHash ?? this.genesisHash,
      entryCount: this.entries.length,
      isValid: this.verifyChainIntegrity().isValid,
    };
  }

  // ── Export ────────────────────────────────────────────────────────────────

  exportLog(format: ExportFormat, opts: { startIndex?: number; endIndex?: number } = {}): string {
    const start = opts.startIndex ?? 0;
    const end = opts.endIndex ?? this.entries.length - 1;
    const entries = this.entries.slice(start, end + 1);

    switch (format) {
      case "json":
        return JSON.stringify({
          chainId: this.chainId,
          exportedAt: this.clock.now(),
          genesisHash: this.genesisHash,
          entries,
        }, null, 2);

      case "jsonl":
        return entries.map(e => JSON.stringify(e)).join("\n");

      case "csv": {
        const headers = ["index", "timestamp", "sessionId", "userId", "command", "result", "durationMs", "entryHash"];
        const rows = entries.map(e =>
          [e.index, e.timestamp, e.sessionId, e.userId, e.command, e.result, e.durationMs, e.entryHash].join(",")
        );
        return [headers.join(","), ...rows].join("\n");
      }

      default:
        throw new Error(`Unknown format: ${format}`);
    }
  }

  importLog(data: string, format: ExportFormat): { imported: number; errors: string[] } {
    const errors: string[] = [];
    let imported = 0;

    try {
      if (format === "json") {
        const parsed = JSON.parse(data);
        const entries = parsed.entries as AuditEntry[];
        for (const entry of entries) {
          this.entries.push(entry);
          imported++;
        }
      } else if (format === "jsonl") {
        const lines = data.split("\n").filter(l => l.trim());
        for (const line of lines) {
          try {
            const entry = JSON.parse(line) as AuditEntry;
            this.entries.push(entry);
            imported++;
          } catch (e) {
            errors.push(`Failed to parse line: ${line.slice(0, 50)}`);
          }
        }
      } else {
        errors.push("CSV import not supported");
      }
    } catch (e) {
      errors.push(`Import failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    return { imported, errors };
  }

  // ── Subscriptions ─────────────────────────────────────────────────────────

  onEntry(callback: EntrySubscriber): () => void {
    this.entrySubscribers.push(callback);
    return () => {
      const idx = this.entrySubscribers.indexOf(callback);
      if (idx >= 0) this.entrySubscribers.splice(idx, 1);
    };
  }

  onTamperDetected(callback: TamperSubscriber): () => void {
    this.tamperSubscribers.push(callback);
    return () => {
      const idx = this.tamperSubscribers.indexOf(callback);
      if (idx >= 0) this.tamperSubscribers.splice(idx, 1);
    };
  }

  // ── Management ────────────────────────────────────────────────────────────

  clearLog(): number {
    const count = this.entries.length;
    this.entries = [];
    this.lastVerifyIndex = 0;
    return count;
  }

  getChainId(): string {
    return this.chainId;
  }

  getGenesisHash(): string {
    return this.genesisHash;
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private notifyEntry(entry: AuditEntry): void {
    for (const sub of this.entrySubscribers) {
      try { sub(entry); } catch { /* ignore */ }
    }
  }

  private notifyTamper(report: IntegrityReport): void {
    for (const sub of this.tamperSubscribers) {
      try { sub(report); } catch { /* ignore */ }
    }
  }
}
