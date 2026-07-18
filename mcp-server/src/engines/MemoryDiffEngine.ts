/**
 * MemoryDiffEngine — HMEMV08 state diff for replay/audit.
 *
 * Pure-core differ over collections keyed by entry_id.  Reports added,
 * removed, and changed entries between two memory snapshots — used by
 * audit replay (U-HMEMV03) + governance UI to show "what changed since
 * last sync".  Deterministic + order-independent.
 *
 * @module engines/MemoryDiffEngine
 */

import { z } from "zod";

export const DiffableEntrySchema = z.object({
  entry_id: z.string().min(1).max(120),
  hash: z.string().min(1).max(64),
});
export type DiffableEntry = z.infer<typeof DiffableEntrySchema>;

export interface MemoryDiff {
  added: string[];
  removed: string[];
  changed: string[];
  unchanged_count: number;
  total_a: number;
  total_b: number;
}

export class MemoryDiffEngine {
  static validateEntry(e: unknown): DiffableEntry { return DiffableEntrySchema.parse(e); }

  /** Compute diff: A is baseline, B is current.  added = in B not A; removed
   *  = in A not B; changed = same id, different hash. */
  static diff(a: readonly DiffableEntry[], b: readonly DiffableEntry[]): MemoryDiff {
    if (!Array.isArray(a) || !Array.isArray(b)) {
      throw new Error("MemoryDiff.diff: both arguments must be arrays");
    }
    for (const e of a) DiffableEntrySchema.parse(e);
    for (const e of b) DiffableEntrySchema.parse(e);

    const aMap = new Map(a.map((e) => [e.entry_id, e.hash] as const));
    const bMap = new Map(b.map((e) => [e.entry_id, e.hash] as const));
    if (aMap.size !== a.length) throw new Error("MemoryDiff.diff: duplicate entry_id in A");
    if (bMap.size !== b.length) throw new Error("MemoryDiff.diff: duplicate entry_id in B");

    const added: string[] = [];
    const removed: string[] = [];
    const changed: string[] = [];
    let unchanged_count = 0;

    for (const [id, hash] of bMap) {
      if (!aMap.has(id)) added.push(id);
      else if (aMap.get(id) !== hash) changed.push(id);
      else unchanged_count += 1;
    }
    for (const id of aMap.keys()) {
      if (!bMap.has(id)) removed.push(id);
    }
    added.sort();
    removed.sort();
    changed.sort();
    return { added, removed, changed, unchanged_count, total_a: a.length, total_b: b.length };
  }

  /** Render a diff for operator audit. */
  static renderDiff(d: MemoryDiff): string {
    return [
      `[DIFF] +${d.added.length} -${d.removed.length} ~${d.changed.length} (=${d.unchanged_count}) | a=${d.total_a} b=${d.total_b}`,
      d.added.length ? `  added: ${d.added.join(", ")}` : "",
      d.removed.length ? `  removed: ${d.removed.join(", ")}` : "",
      d.changed.length ? `  changed: ${d.changed.join(", ")}` : "",
    ].filter(Boolean).join("\n");
  }
}

export const memoryDiffEngine = MemoryDiffEngine;
