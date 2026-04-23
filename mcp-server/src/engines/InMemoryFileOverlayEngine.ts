/**
 * InMemoryFileOverlayEngine — U-FORE-05 (PSAU-FORESIGHT)
 * =======================================================
 *
 * A virtual filesystem overlay that records planned file writes/edits/
 * deletes in memory WITHOUT touching disk. Used by the counterfactual
 * build simulator to dry-run a BuildPlan and answer "would this pass?"
 * without committing anything.
 *
 * Reads fall through to the real filesystem when a path is not in the
 * overlay. Writes/deletes shadow the real fs in the overlay map only.
 *
 * A single overlay instance is intended to represent one candidate plan.
 * Reset between simulations or create a new instance.
 */

import * as fs from "node:fs";
import * as path from "node:path";

export type OverlayOp = "create" | "modify" | "delete";

export interface OverlayEntry {
  op: OverlayOp;
  content?: string; // undefined for "delete"
  appliedAt: number;
}

export interface OverlayDiff {
  created: string[];
  modified: string[];
  deleted: string[];
  totalBytesAdded: number;
  totalBytesRemoved: number;
}

export class InMemoryFileOverlayEngine {
  readonly name = "InMemoryFileOverlayEngine";
  private overlay: Map<string, OverlayEntry> = new Map();

  /** Normalize path to a canonical form (forward slashes, no trailing slash). */
  private normalize(p: string): string {
    if (typeof p !== "string" || p.trim() === "") {
      throw new Error("InMemoryFileOverlayEngine: path must be a non-empty string");
    }
    return p.replace(/\\/g, "/").replace(/\/+$/, "");
  }

  /**
   * Plan a file write into the overlay. Does NOT touch disk.
   *
   * @param filePath Absolute or repo-relative path to shadow.
   * @param content  New content for the file.
   */
  write(filePath: string, content: string): void {
    if (typeof content !== "string") {
      throw new Error("InMemoryFileOverlayEngine.write: content must be a string");
    }
    const p = this.normalize(filePath);
    const op: OverlayOp = fs.existsSync(p) ? "modify" : "create";
    this.overlay.set(p, { op, content, appliedAt: Date.now() });
  }

  /**
   * Plan a file deletion into the overlay.
   */
  delete(filePath: string): void {
    const p = this.normalize(filePath);
    this.overlay.set(p, { op: "delete", appliedAt: Date.now() });
  }

  /**
   * Read the CURRENT visible content — overlay first, then real fs.
   * Returns null if the file is overlaid as deleted or doesn't exist anywhere.
   */
  read(filePath: string): string | null {
    const p = this.normalize(filePath);
    const entry = this.overlay.get(p);
    if (entry) {
      if (entry.op === "delete") return null;
      return entry.content ?? null;
    }
    if (!fs.existsSync(p)) return null;
    try {
      return fs.readFileSync(p, "utf-8");
    } catch {
      return null;
    }
  }

  /**
   * True if the overlay has a plan recorded for this path.
   */
  has(filePath: string): boolean {
    return this.overlay.has(this.normalize(filePath));
  }

  /**
   * True if a file would exist after applying the overlay.
   */
  exists(filePath: string): boolean {
    const p = this.normalize(filePath);
    const entry = this.overlay.get(p);
    if (entry) {
      return entry.op !== "delete";
    }
    return fs.existsSync(p);
  }

  /**
   * Full list of overlay entries.
   */
  entries(): Array<[string, OverlayEntry]> {
    return Array.from(this.overlay.entries());
  }

  /**
   * Summary of the overlay's pending effect vs. current disk state.
   */
  diff(): OverlayDiff {
    const created: string[] = [];
    const modified: string[] = [];
    const deleted: string[] = [];
    let bytesAdded = 0;
    let bytesRemoved = 0;
    for (const [p, entry] of this.overlay) {
      if (entry.op === "create") {
        created.push(p);
        bytesAdded += Buffer.byteLength(entry.content ?? "", "utf-8");
      } else if (entry.op === "modify") {
        modified.push(p);
        const newSize = Buffer.byteLength(entry.content ?? "", "utf-8");
        let oldSize = 0;
        try {
          oldSize = fs.statSync(p).size;
        } catch { /* file gone or unreadable */ }
        if (newSize > oldSize) bytesAdded += newSize - oldSize;
        else bytesRemoved += oldSize - newSize;
      } else if (entry.op === "delete") {
        deleted.push(p);
        try {
          bytesRemoved += fs.statSync(p).size;
        } catch { /* already gone */ }
      }
    }
    return {
      created,
      modified,
      deleted,
      totalBytesAdded: bytesAdded,
      totalBytesRemoved: bytesRemoved,
    };
  }

  /**
   * Drop all overlay entries; subsequent reads pass through to disk.
   */
  reset(): void {
    this.overlay.clear();
  }

  /**
   * Create an independent child overlay seeded from this one's current
   * entries. Useful for exploring branches of a plan.
   */
  fork(): InMemoryFileOverlayEngine {
    const child = new InMemoryFileOverlayEngine();
    for (const [p, e] of this.overlay) {
      child.overlay.set(p, { ...e });
    }
    return child;
  }

  /**
   * Convenience for test assertions: count of entries by op.
   */
  countByOp(): Record<OverlayOp, number> {
    const counts: Record<OverlayOp, number> = { create: 0, modify: 0, delete: 0 };
    for (const [, e] of this.overlay) counts[e.op]++;
    return counts;
  }

  /**
   * Derive a list of test files plausibly affected by the overlay's source
   * changes (sibling `*.test.ts` or `__tests__/<name>.test.ts`).
   *
   * This is a heuristic — the real build simulator uses it to focus tsc/vitest.
   */
  impactedTestFiles(): string[] {
    const out = new Set<string>();
    for (const [p, e] of this.overlay) {
      if (e.op === "delete") continue;
      if (/\.test\.ts$/.test(p)) {
        out.add(p);
        continue;
      }
      const base = path.basename(p).replace(/\.ts$/, "");
      const candidates = [
        path.join(path.dirname(p), `${base}.test.ts`),
        path.join(path.dirname(p), "__tests__", `${base}.test.ts`),
      ];
      for (const c of candidates) {
        const norm = c.replace(/\\/g, "/");
        if (fs.existsSync(norm) || this.overlay.has(norm)) {
          out.add(norm);
        }
      }
    }
    return Array.from(out);
  }
}

export const inMemoryFileOverlayEngine = new InMemoryFileOverlayEngine();
