/**
 * WikiRecallCounterEngine — U-RECALL-COUNTER (OBSIDIAN-VIZ-MS0)
 * =============================================================
 *
 * Tracks per-entry recall counts for memory + wiki vault entries. Closes
 * the cyrilXBT "compounding" gap: a vault that doesn't measure which
 * entries get re-read can't surface them. The recall counter is the
 * signal that drives:
 *
 *   1. Node sizing in /system-viz L10 (hot entries render larger).
 *   2. Promotion candidates for wiki/log.md (entries with high recall
 *      that aren't yet wiki-canonicalized).
 *   3. Pruning candidates (zero-recall entries older than N days).
 *
 * Storage: schemaVersion-stamped JSON sidecar at
 * `mcp-server/data/state/wiki-recall-counts.json`. All writes are atomic
 * (temp + rename) to survive concurrent multi-chat increments.
 *
 * NOT placed in iooms0 worktree — that worktree is claimed by a peer
 * (claude-a09ce89e) per the OBSIDIAN-COMPOUND-MS0 audit. This engine lives
 * in the main repo and feeds the iooms0 RAG engine via the sidecar file
 * when the work is upstreamed.
 *
 * @module engines/WikiRecallCounterEngine
 * @milestone OBSIDIAN-VIZ-MS0/U-RECALL-COUNTER
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";

// ── Constants ────────────────────────────────────────────────────────────────

export const WIKI_RECALL_SCHEMA_VERSION = "1.0.0";

const DEFAULT_STATE_FILE = "H:/prism/mcp-server/data/state/wiki-recall-counts.json";
const TEMP_SUFFIX = ".tmp";

// ── Schemas ──────────────────────────────────────────────────────────────────

export const RecallEntryKindSchema = z.enum(["memory", "wiki"]);
export type RecallEntryKind = z.infer<typeof RecallEntryKindSchema>;

export const RecallEntrySchema = z.object({
  kind: RecallEntryKindSchema,
  // Stable key: kind/category/stem (e.g. "memory/feedback/feedback_xyz")
  key: z.string().min(1),
  count: z.number().int().nonnegative(),
  firstSeenIso: z.string().min(1),
  lastSeenIso: z.string().min(1),
});
export type RecallEntry = z.infer<typeof RecallEntrySchema>;

export const WikiRecallStateSchema = z.object({
  schemaVersion: z.literal(WIKI_RECALL_SCHEMA_VERSION),
  totalRecalls: z.number().int().nonnegative(),
  entryCount: z.number().int().nonnegative(),
  updatedAtIso: z.string().min(1),
  entries: z.record(z.string(), RecallEntrySchema),
});
export type WikiRecallState = z.infer<typeof WikiRecallStateSchema>;

// ── Engine ───────────────────────────────────────────────────────────────────

export class WikiRecallCounterEngine {
  private stateFile: string;

  constructor(stateFile: string = DEFAULT_STATE_FILE) {
    this.stateFile = stateFile;
  }

  /**
   * Increment the recall count for a vault entry. Creates the entry if
   * it doesn't exist yet. Atomic write (temp + rename).
   *
   * @param kind - "memory" or "wiki"
   * @param key  - Stable key, format `${kind}/${category}/${stem}` (no .md ext)
   * @returns The updated entry (after increment).
   * @throws If kind/key are invalid (per Zod schema).
   */
  recordRecall(kind: RecallEntryKind, key: string): RecallEntry {
    if (!RecallEntryKindSchema.safeParse(kind).success) {
      throw new Error(`WikiRecallCounterEngine: invalid kind ${kind}`);
    }
    if (typeof key !== "string" || key.length === 0) {
      throw new Error(`WikiRecallCounterEngine: invalid key ${JSON.stringify(key)}`);
    }
    const state = this.loadState();
    const nowIso = new Date().toISOString();
    const existing = state.entries[key];
    const updated: RecallEntry = existing
      ? { ...existing, count: existing.count + 1, lastSeenIso: nowIso }
      : { kind, key, count: 1, firstSeenIso: nowIso, lastSeenIso: nowIso };
    state.entries[key] = updated;
    state.totalRecalls += 1;
    state.entryCount = Object.keys(state.entries).length;
    state.updatedAtIso = nowIso;
    this.writeStateAtomic(state);
    return updated;
  }

  /**
   * Get the recall count for a single key. Returns 0 if the entry is
   * not yet tracked. Pure read — does not increment.
   */
  getRecallCount(key: string): number {
    if (typeof key !== "string" || key.length === 0) return 0;
    const state = this.loadState();
    return state.entries[key]?.count ?? 0;
  }

  /**
   * Get the full recall entry for a key, or null if not tracked.
   */
  getEntry(key: string): RecallEntry | null {
    const state = this.loadState();
    return state.entries[key] ?? null;
  }

  /**
   * Get the top N most-recalled entries, optionally filtered by kind.
   */
  getTopRecalled(limit: number = 20, kind?: RecallEntryKind): RecallEntry[] {
    if (!Number.isFinite(limit) || limit < 0) limit = 20;
    const state = this.loadState();
    const all = Object.values(state.entries).filter(
      (e) => kind === undefined || e.kind === kind,
    );
    all.sort((a, b) => b.count - a.count || b.lastSeenIso.localeCompare(a.lastSeenIso));
    return all.slice(0, limit);
  }

  /**
   * Export all counts as a plain map for consumers like the system-viz
   * generator. Returns a snapshot — does not hold locks.
   */
  getAllCounts(): Record<string, number> {
    const state = this.loadState();
    const out: Record<string, number> = {};
    for (const [k, e] of Object.entries(state.entries)) out[k] = e.count;
    return out;
  }

  /** Whole-state read for diagnostics / dispatcher response. */
  getStateSnapshot(): WikiRecallState {
    return this.loadState();
  }

  /**
   * Reset all counts (idempotent). Returns the state that existed before reset.
   * Public so a dispatcher action can expose it for /reset commands.
   */
  reset(): WikiRecallState {
    const before = this.loadState();
    const fresh = this.freshState();
    this.writeStateAtomic(fresh);
    return before;
  }

  // ── private ──

  private freshState(): WikiRecallState {
    return {
      schemaVersion: WIKI_RECALL_SCHEMA_VERSION,
      totalRecalls: 0,
      entryCount: 0,
      updatedAtIso: new Date().toISOString(),
      entries: {},
    };
  }

  private loadState(): WikiRecallState {
    if (!fs.existsSync(this.stateFile)) return this.freshState();
    let raw: string;
    try {
      raw = fs.readFileSync(this.stateFile, "utf8");
    } catch {
      return this.freshState();
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Corrupt file — start fresh rather than throw. Anti-fragile: never
      // break the caller because of a bad sidecar; the data is recreatable.
      return this.freshState();
    }
    const result = WikiRecallStateSchema.safeParse(parsed);
    if (!result.success) return this.freshState();
    return result.data;
  }

  private writeStateAtomic(state: WikiRecallState): void {
    const dir = path.dirname(this.stateFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = this.stateFile + TEMP_SUFFIX;
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2), "utf8");
    fs.renameSync(tmp, this.stateFile);
  }
}

export const wikiRecallCounterEngine = new WikiRecallCounterEngine();
