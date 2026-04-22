/**
 * FileReadDeduplicationEngine
 *
 * Tracks file reads within a session and detects redundant re-reads of the
 * same content (already present in conversation context). Re-reads waste
 * tokens proportional to file size.
 *
 * Strategy:
 *   - Record every Read call with path + byte range (offset/limit)
 *   - On re-read of same path + overlapping range → flag as redundant
 *   - Recommend offset/limit when partial view would satisfy need
 *   - Track content hash so file modification invalidates dedup
 *
 * Token savings: avg file read = 2-10KB = 500-2500 tokens.
 * Eliminating 1 redundant re-read per 10 reads = 5-25% savings.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { atomicWriteJson, safeReadJson, resolveSessionId, snapshotLastGood } from "../utils/atomicSessionWrite.js";

export interface ReadRecord {
  id: string;
  path: string;
  timestamp: string;
  offset: number;
  limit: number;  // 0 = full file
  fileMtimeMs: number;
  contentHash: string;
  tokenCost: number;
}

export interface RedundancyFlag {
  newReadId: string;
  priorReadId: string;
  path: string;
  reason: "exact_duplicate" | "overlapping_range" | "full_then_partial";
  estimatedTokenWaste: number;
  recommendation: string;
}

export interface DedupReport {
  totalReads: number;
  uniqueFilesRead: number;
  redundantReads: number;
  totalTokensSpent: number;
  estimatedTokensWasted: number;
  redundancyRate: number;
  topRedundantFiles: Array<{ path: string; count: number; tokenWaste: number }>;
  flags: RedundancyFlag[];
  recommendations: string[];
}

interface State {
  sessionId: string;
  reads: ReadRecord[];
  flags: RedundancyFlag[];
}

const STATE_DIR = "H:/prism/state/file-read-dedup";
const getStateFile = (sessionId?: string): string => {
  const id = sessionId || resolveSessionId();
  return `${STATE_DIR}/dedup-${id}.json`;
};

const MAX_READS = 2000;
const CHARS_PER_TOKEN = 4;

export class FileReadDeduplicationEngine {
  private state: State;

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): State {
    const sessionId = resolveSessionId();
    const file = getStateFile(sessionId);
    const fresh: State = { sessionId, reads: [], flags: [] };
    const loaded = safeReadJson<State>(file, fresh);
    if (loaded !== fresh) snapshotLastGood(file, loaded);
    return loaded;
  }

  private saveState(): void {
    if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
    if (this.state.reads.length > MAX_READS) {
      this.state.reads = this.state.reads.slice(-MAX_READS);
    }
    atomicWriteJson(getStateFile(this.state.sessionId), this.state);
  }

  private generateId(): string {
    return `rd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }

  private estimateTokens(byteSize: number): number {
    return Math.ceil(byteSize / CHARS_PER_TOKEN);
  }

  private hashContent(content: string): string {
    return createHash("sha256").update(content).digest("hex").slice(0, 16);
  }

  /**
   * Check if range B is contained within range A.
   * Range = [offset, offset + limit) where limit=0 means full file.
   */
  private rangeContains(a: ReadRecord, b: ReadRecord): boolean {
    if (a.limit === 0) return true; // a is full file
    if (b.limit === 0) return false; // b is full, a is partial
    const aEnd = a.offset + a.limit;
    const bEnd = b.offset + b.limit;
    return a.offset <= b.offset && bEnd <= aEnd;
  }

  /**
   * Find prior read that makes this new read redundant.
   * Returns the prior read if redundant, null otherwise.
   */
  private findPriorRedundant(newRead: ReadRecord): ReadRecord | null {
    for (let i = this.state.reads.length - 1; i >= 0; i--) {
      const prior = this.state.reads[i];
      if (prior.id === newRead.id) continue;
      if (prior.path !== newRead.path) continue;
      // File modified since prior read → not redundant
      if (prior.fileMtimeMs !== newRead.fileMtimeMs) continue;
      // Prior range contains new range → redundant
      if (this.rangeContains(prior, newRead)) return prior;
    }
    return null;
  }

  /**
   * Record a file read and detect redundancy.
   *
   * @param path absolute file path
   * @param content the content that was read (for hashing and token estimation)
   * @param options offset, limit for partial reads
   * @returns ReadRecord plus redundancy flag if duplicate detected
   */
  recordRead(
    path: string,
    content: string,
    options: { offset?: number; limit?: number; mtimeMs?: number } = {}
  ): { record: ReadRecord; redundant: RedundancyFlag | null } {
    let mtimeMs = options.mtimeMs ?? 0;
    if (!mtimeMs && existsSync(path)) {
      try {
        mtimeMs = statSync(path).mtimeMs;
      } catch {
        mtimeMs = 0;
      }
    }

    const record: ReadRecord = {
      id: this.generateId(),
      path,
      timestamp: new Date().toISOString(),
      offset: options.offset ?? 0,
      limit: options.limit ?? 0,
      fileMtimeMs: mtimeMs,
      contentHash: this.hashContent(content),
      tokenCost: this.estimateTokens(content.length),
    };

    const prior = this.findPriorRedundant(record);
    let flag: RedundancyFlag | null = null;
    if (prior) {
      const reason: RedundancyFlag["reason"] =
        prior.contentHash === record.contentHash
          ? "exact_duplicate"
          : prior.limit === 0 && record.limit > 0
            ? "full_then_partial"
            : "overlapping_range";

      flag = {
        newReadId: record.id,
        priorReadId: prior.id,
        path,
        reason,
        estimatedTokenWaste: record.tokenCost,
        recommendation: this.buildRecommendation(reason, record, prior),
      };
      this.state.flags.push(flag);
    }

    this.state.reads.push(record);
    this.saveState();
    return { record, redundant: flag };
  }

  private buildRecommendation(
    reason: RedundancyFlag["reason"],
    record: ReadRecord,
    prior: ReadRecord
  ): string {
    switch (reason) {
      case "exact_duplicate":
        return `Content unchanged since prior read (${prior.id}). Trust previous context.`;
      case "full_then_partial":
        return `Full file already in context. Use existing content instead of re-reading.`;
      case "overlapping_range":
        return `Range [${record.offset}-${record.offset + record.limit}] covered by prior read. Reuse existing content.`;
    }
  }

  /**
   * Check if a file has been read already and its content should be reusable.
   * Useful BEFORE issuing a Read call.
   */
  shouldSkip(
    path: string,
    options: { offset?: number; limit?: number; currentMtimeMs?: number } = {}
  ): { skip: boolean; priorReadId: string | null; reason: string } {
    const offset = options.offset ?? 0;
    const limit = options.limit ?? 0;
    const currentMtimeMs = options.currentMtimeMs ?? 0;

    for (let i = this.state.reads.length - 1; i >= 0; i--) {
      const prior = this.state.reads[i];
      if (prior.path !== path) continue;
      if (currentMtimeMs && prior.fileMtimeMs !== currentMtimeMs) {
        return { skip: false, priorReadId: null, reason: "file_modified" };
      }
      const proposed: ReadRecord = {
        ...prior,
        offset,
        limit,
      };
      if (this.rangeContains(prior, proposed)) {
        return {
          skip: true,
          priorReadId: prior.id,
          reason: "range_already_covered",
        };
      }
    }
    return { skip: false, priorReadId: null, reason: "no_prior_read" };
  }

  /**
   * Generate dedup report.
   */
  report(): DedupReport {
    const totalReads = this.state.reads.length;
    const uniquePaths = new Set(this.state.reads.map((r) => r.path));
    const redundantReads = this.state.flags.length;
    const totalTokensSpent = this.state.reads.reduce((s, r) => s + r.tokenCost, 0);
    const estimatedTokensWasted = this.state.flags.reduce(
      (s, f) => s + f.estimatedTokenWaste,
      0
    );

    // Aggregate by path
    const byPath = new Map<string, { count: number; waste: number }>();
    for (const flag of this.state.flags) {
      const e = byPath.get(flag.path) ?? { count: 0, waste: 0 };
      e.count += 1;
      e.waste += flag.estimatedTokenWaste;
      byPath.set(flag.path, e);
    }
    const topRedundantFiles = [...byPath.entries()]
      .map(([path, stats]) => ({ path, count: stats.count, tokenWaste: stats.waste }))
      .sort((a, b) => b.tokenWaste - a.tokenWaste)
      .slice(0, 10);

    const redundancyRate = totalReads > 0 ? redundantReads / totalReads : 0;

    const recommendations: string[] = [];
    if (redundancyRate > 0.15 && totalReads >= 10) {
      recommendations.push(
        `${(redundancyRate * 100).toFixed(0)}% of reads were redundant. Check shouldSkip() before reading.`
      );
    }
    if (estimatedTokensWasted >= 1000) {
      recommendations.push(
        `${estimatedTokensWasted} tokens wasted on redundant reads. Use offset/limit for partial views.`
      );
    }
    if (topRedundantFiles.length > 0 && topRedundantFiles[0].count >= 3) {
      recommendations.push(
        `${topRedundantFiles[0].path} read ${topRedundantFiles[0].count + 1} times — cache its content.`
      );
    }

    return {
      totalReads,
      uniqueFilesRead: uniquePaths.size,
      redundantReads,
      totalTokensSpent,
      estimatedTokensWasted,
      redundancyRate,
      topRedundantFiles,
      flags: [...this.state.flags],
      recommendations,
    };
  }

  /** Clear all state */
  reset(): void {
    this.state = {
      sessionId: resolveSessionId(),
      reads: [],
      flags: [],
    };
    this.saveState();
  }

  /** Get raw reads */
  getReads(): ReadRecord[] {
    return [...this.state.reads];
  }
}

export const fileReadDeduplicationEngine = new FileReadDeduplicationEngine();
