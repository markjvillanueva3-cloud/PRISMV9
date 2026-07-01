/**
 * FileAccessPatternEngine — Tracks file access patterns
 *
 * Records Read/Edit/Grep operations per file to identify:
 * - Hot files (frequently accessed)
 * - Read-then-edit patterns (predictable workflows)
 * - Unused reads (files read but never used)
 *
 * Token savings: Enables pre-fetching hints and identifies
 * wasteful reads (~200-1000 tokens per avoided read).
 *
 * @version 1.0.0
 */

export type AccessType = "read" | "edit" | "grep" | "write" | "glob";

export interface FileAccess {
  file: string;
  type: AccessType;
  timestamp: number;
  tokens?: number;
}

export interface FileProfile {
  file: string;
  readCount: number;
  editCount: number;
  grepCount: number;
  writeCount: number;
  totalAccess: number;
  firstAccess: number;
  lastAccess: number;
  isHot: boolean;
  wasEdited: boolean;
  readWithoutEdit: boolean; // read but never edited — potential waste
}

export interface PatternInsight {
  type: "hot-file" | "read-waste" | "re-read" | "edit-heavy" | "grep-before-read";
  file: string;
  message: string;
  savingsEstimate: number;
}

export class FileAccessPatternEngine {
  private accesses: FileAccess[] = [];

  /**
   * Record a file access.
   */
  record(file: string, type: AccessType, tokens?: number): void {
    this.accesses.push({
      file: this.normalize(file),
      type,
      timestamp: Date.now(),
      tokens,
    });
  }

  /**
   * Get profile for a specific file.
   */
  profile(file: string): FileProfile {
    const norm = this.normalize(file);
    const fileAccesses = this.accesses.filter(a => a.file === norm);

    const readCount = fileAccesses.filter(a => a.type === "read").length;
    const editCount = fileAccesses.filter(a => a.type === "edit").length;
    const grepCount = fileAccesses.filter(a => a.type === "grep").length;
    const writeCount = fileAccesses.filter(a => a.type === "write").length;

    return {
      file: norm,
      readCount,
      editCount,
      grepCount,
      writeCount,
      totalAccess: fileAccesses.length,
      firstAccess: fileAccesses[0]?.timestamp ?? 0,
      lastAccess: fileAccesses[fileAccesses.length - 1]?.timestamp ?? 0,
      isHot: fileAccesses.length >= 5,
      wasEdited: editCount > 0 || writeCount > 0,
      readWithoutEdit: readCount > 0 && editCount === 0 && writeCount === 0,
    };
  }

  /**
   * Get all hot files (accessed 5+ times).
   */
  hotFiles(minAccess = 5): FileProfile[] {
    const files = new Set(this.accesses.map(a => a.file));
    return [...files]
      .map(f => this.profile(f))
      .filter(p => p.totalAccess >= minAccess)
      .sort((a, b) => b.totalAccess - a.totalAccess);
  }

  /**
   * Identify wasteful patterns.
   */
  insights(): PatternInsight[] {
    const results: PatternInsight[] = [];
    const files = new Set(this.accesses.map(a => a.file));

    for (const file of files) {
      const p = this.profile(file);

      // Files read 3+ times without editing
      if (p.readCount >= 3 && !p.wasEdited) {
        results.push({
          type: "read-waste",
          file,
          message: `Read ${p.readCount}x but never edited — consider using Grep instead`,
          savingsEstimate: (p.readCount - 1) * 500,
        });
      }

      // Hot files with many re-reads
      if (p.readCount >= 4) {
        results.push({
          type: "re-read",
          file,
          message: `Read ${p.readCount}x — cache content or use offset/limit for specific sections`,
          savingsEstimate: (p.readCount - 2) * 400,
        });
      }

      // Edit-heavy files (>3 edits)
      if (p.editCount >= 3) {
        results.push({
          type: "edit-heavy",
          file,
          message: `Edited ${p.editCount}x — batch edits to reduce round trips`,
          savingsEstimate: (p.editCount - 1) * 200,
        });
      }
    }

    return results.sort((a, b) => b.savingsEstimate - a.savingsEstimate);
  }

  /**
   * Predict next likely file access based on patterns.
   */
  predictNext(): string[] {
    if (this.accesses.length < 3) return [];

    // Look at the last accessed file's co-occurrences
    const recent = this.accesses.slice(-3);
    const recentFiles = new Set(recent.map(a => a.file));

    // Find files commonly accessed alongside recent files
    const coOccurrences = new Map<string, number>();
    for (const access of this.accesses) {
      if (recentFiles.has(access.file)) continue;
      // Check if this file was accessed near any recent file
      const nearbyAccesses = this.accesses.filter(
        a => recentFiles.has(a.file) &&
        Math.abs(a.timestamp - access.timestamp) < 300000 // 5 min
      );
      if (nearbyAccesses.length > 0) {
        coOccurrences.set(access.file, (coOccurrences.get(access.file) || 0) + nearbyAccesses.length);
      }
    }

    return [...coOccurrences.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([file]) => file);
  }

  /**
   * Get total estimated token waste from suboptimal patterns.
   */
  totalWaste(): number {
    return this.insights().reduce((sum, i) => sum + i.savingsEstimate, 0);
  }

  /**
   * Summary one-liner.
   */
  oneLiner(): string {
    const files = new Set(this.accesses.map(a => a.file)).size;
    const waste = this.totalWaste();
    const hot = this.hotFiles().length;
    return `${this.accesses.length} accesses across ${files} files. ${hot} hot files. ~${waste} tokens wasteable.`;
  }

  /**
   * Reset tracking.
   */
  reset(): void {
    this.accesses = [];
  }

  private normalize(file: string): string {
    return file.replace(/\\/g, "/").replace(/\/+/g, "/");
  }
}

export const fileAccessPatternEngine = new FileAccessPatternEngine();
