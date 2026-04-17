/**
 * MemorySyncEngine — Phase 0.19 U-LLM8 + CPP-MS3-U-CPP22 (CRDT merge)
 *
 * Export Qdrant-backed memory to a JSON bundle on the H: drive so the
 * home (RTX 4080) and work (RTX 3080) PCs share tribal tips, program
 * embeddings, outcome vectors, and formula memories. Pair with
 * `claude_sync.py`'s drive-swap workflow: before eject at site A, dump
 * a bundle; after `setup-new-pc.py` at site B, import it.
 *
 * Bundle layout (v1):
 *   {
 *     "schemaVersion": 1,
 *     "createdAt": "ISO",
 *     "source": { "host": "...", "machine": "..." },
 *     "collections": [
 *       { "name": "prism_memory_tip", "vectorSize": 768, "distance": "Cosine",
 *         "points": [ { "id", "vector", "payload" }, ... ] }
 *     ]
 *   }
 *
 * Design rules:
 *   1. Bundles are plain JSON. Forkable, diffable, friendly to git.
 *   2. Exports never block on a wedged daemon — if a collection fails to
 *      scroll we record the error per-collection and continue.
 *   3. Import is upsert-semantic: same id replaces the row, so the newer
 *      bundle wins. Not a true 3-way merge — that lives in a later
 *      milestone if we ever need it.
 *
 * CPP-MS3-U-CPP22 (CRDT merge for multi-agent bundles):
 *   Adds `MemoryCRDTEntry` and `mergeEntries()` for merging overlapping
 *   bundles from N concurrent agents. Merge semantics are set-union on
 *   entryId with Last-Write-Wins conflict resolution (max timestamp, then
 *   lexicographic source as deterministic tiebreak). This is a pure
 *   function — no Qdrant I/O required, so it works for any per-instance
 *   memory sync scenario.
 *
 * @module engines/MemorySyncEngine
 * @milestone PP-0.19-U-LLM8, CPP-MS3-U-CPP22
 */

import { mkdir, readFile, writeFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  QdrantVectorStoreEngine,
  type Distance,
} from "./QdrantVectorStoreEngine.js";

const SCHEMA_VERSION = 1 as const;

export interface MemoryBundlePoint {
  id: string | number;
  vector: number[];
  payload?: Record<string, unknown>;
}

export interface MemoryBundleCollection {
  name: string;
  vectorSize: number;
  distance: Distance;
  points: MemoryBundlePoint[];
  error?: string;
}

export interface MemoryBundle {
  schemaVersion: typeof SCHEMA_VERSION;
  createdAt: string;
  source: {
    host: string | null;
    machine: string;
  };
  collections: MemoryBundleCollection[];
}

export interface ExportOptions {
  /** Qdrant collection names to export. Required — prevents accidental full-DB dumps. */
  collections: string[];
  /** Where the bundle file lands. Directory is created if missing. */
  destPath: string;
  /** Vector size for each collection (Qdrant doesn't return it directly). */
  vectorSize?: number;
  /** Distance metric label to record in the bundle. */
  distance?: Distance;
  /** Scroll page size — kept small for wide-vector collections. */
  pageSize?: number;
}

export interface ExportReport {
  ok: boolean;
  destPath: string;
  totalPoints: number;
  perCollection: Array<{ name: string; points: number; error?: string }>;
  error?: string;
}

export interface ImportOptions {
  srcPath: string;
  /** When true, drop+recreate the collection before upserting. */
  replaceCollections?: boolean;
  /** When true, only import collections matching this filter. */
  onlyCollections?: string[];
}

export interface ImportReport {
  ok: boolean;
  srcPath: string;
  createdAt: string | null;
  totalUpserted: number;
  perCollection: Array<{ name: string; upserted: number; error?: string }>;
  error?: string;
}

export interface BundleSummary {
  path: string;
  createdAt: string;
  collections: number;
  totalPoints: number;
  sizeBytes: number;
}

export interface MemorySyncDeps {
  store?: QdrantVectorStoreEngine;
  /** Used in bundle metadata for provenance. Defaults to os.hostname(). */
  machineName?: string;
}

// ── CPP-MS3-U-CPP22: CRDT entry format ─────────────────────────────────

/**
 * MemoryCRDTEntry — per-entry record for CRDT set-union-LWW merge.
 *
 * Enables N concurrent agents to produce overlapping memory bundles that
 * merge deterministically without coordination. Each entry carries its
 * own timestamp + source so the merge rule can pick a winner without
 * needing a central clock.
 *
 * Conflict resolution:
 *   1. set-union on entryId (no entry is dropped just because another
 *      agent saw it)
 *   2. On same entryId, keep the record with max(timestamp)
 *   3. On equal timestamps, lexicographically smaller source wins
 *      (so merge is commutative, associative, and idempotent)
 */
export interface MemoryCRDTEntry {
  entryId: string;
  timestamp: string; // ISO 8601
  source: string; // agent instance that produced this record
  content: unknown;
}

export interface MergeReport {
  merged: MemoryCRDTEntry[];
  inputCount: number;
  distinctEntryIds: number;
  conflictsResolved: number;
}

export class MemorySyncEngine {
  private store: QdrantVectorStoreEngine;
  private machineName: string;

  constructor(deps: MemorySyncDeps = {}) {
    this.store = deps.store ?? new QdrantVectorStoreEngine();
    this.machineName = deps.machineName ?? os.hostname();
  }

  /** Dump one-or-more collections to a JSON bundle on disk. */
  async exportBundle(options: ExportOptions): Promise<ExportReport> {
    const perCollection: ExportReport["perCollection"] = [];
    if (!options.collections.length) {
      return {
        ok: false,
        destPath: options.destPath,
        totalPoints: 0,
        perCollection,
        error: "collections required",
      };
    }
    if (!this.store.isConnected()) {
      return {
        ok: false,
        destPath: options.destPath,
        totalPoints: 0,
        perCollection,
        error: "qdrant not connected",
      };
    }

    const vectorSize = options.vectorSize ?? 768;
    const distance: Distance = options.distance ?? "Cosine";
    const pageSize = options.pageSize ?? 256;

    const bundleCollections: MemoryBundleCollection[] = [];
    let total = 0;

    for (const name of options.collections) {
      const dump = await this.store.scrollAll(name, pageSize);
      if (!dump.ok) {
        perCollection.push({ name, points: 0, error: dump.error });
        bundleCollections.push({
          name,
          vectorSize,
          distance,
          points: [],
          error: dump.error,
        });
        continue;
      }
      bundleCollections.push({
        name,
        vectorSize,
        distance,
        points: dump.value,
      });
      perCollection.push({ name, points: dump.value.length });
      total += dump.value.length;
    }

    const bundle: MemoryBundle = {
      schemaVersion: SCHEMA_VERSION,
      createdAt: new Date().toISOString(),
      source: { host: this.safeHost(), machine: this.machineName },
      collections: bundleCollections,
    };

    try {
      await mkdir(path.dirname(path.resolve(options.destPath)), {
        recursive: true,
      });
      await writeFile(
        options.destPath,
        JSON.stringify(bundle, null, 2),
        "utf-8",
      );
    } catch (e) {
      return {
        ok: false,
        destPath: options.destPath,
        totalPoints: total,
        perCollection,
        error: (e as Error)?.message ?? String(e),
      };
    }

    return {
      ok: perCollection.every((c) => !c.error),
      destPath: options.destPath,
      totalPoints: total,
      perCollection,
    };
  }

  /** Restore a bundle into Qdrant (upsert semantics, same id wins). */
  async importBundle(options: ImportOptions): Promise<ImportReport> {
    const perCollection: ImportReport["perCollection"] = [];
    if (!this.store.isConnected()) {
      return {
        ok: false,
        srcPath: options.srcPath,
        createdAt: null,
        totalUpserted: 0,
        perCollection,
        error: "qdrant not connected",
      };
    }

    let bundle: MemoryBundle;
    try {
      const raw = await readFile(options.srcPath, "utf-8");
      bundle = JSON.parse(raw) as MemoryBundle;
    } catch (e) {
      return {
        ok: false,
        srcPath: options.srcPath,
        createdAt: null,
        totalUpserted: 0,
        perCollection,
        error: (e as Error)?.message ?? String(e),
      };
    }

    if (bundle.schemaVersion !== SCHEMA_VERSION) {
      return {
        ok: false,
        srcPath: options.srcPath,
        createdAt: bundle.createdAt ?? null,
        totalUpserted: 0,
        perCollection,
        error: `unsupported schemaVersion ${bundle.schemaVersion}`,
      };
    }

    let total = 0;
    const wantedSet = options.onlyCollections?.length
      ? new Set(options.onlyCollections)
      : null;

    for (const col of bundle.collections) {
      if (wantedSet && !wantedSet.has(col.name)) continue;
      try {
        if (options.replaceCollections) {
          await this.store.deleteCollection(col.name);
        }
        const ensured = await this.store.ensureCollection({
          name: col.name,
          vectorSize: col.vectorSize,
          distance: col.distance,
        });
        if (!ensured.ok) {
          perCollection.push({
            name: col.name,
            upserted: 0,
            error: ensured.error,
          });
          continue;
        }
        if (col.points.length === 0) {
          perCollection.push({ name: col.name, upserted: 0 });
          continue;
        }
        const r = await this.store.upsert(col.name, col.points);
        if (!r.ok) {
          perCollection.push({
            name: col.name,
            upserted: 0,
            error: r.error,
          });
          continue;
        }
        total += r.value;
        perCollection.push({ name: col.name, upserted: r.value });
      } catch (e) {
        perCollection.push({
          name: col.name,
          upserted: 0,
          error: (e as Error)?.message ?? String(e),
        });
      }
    }

    return {
      ok: perCollection.every((c) => !c.error),
      srcPath: options.srcPath,
      createdAt: bundle.createdAt,
      totalUpserted: total,
      perCollection,
    };
  }

  /** Enumerate bundle files in a directory, newest first. */
  async listBundles(dir: string): Promise<BundleSummary[]> {
    try {
      const entries = await readdir(dir);
      const summaries: BundleSummary[] = [];
      for (const name of entries) {
        if (!name.endsWith(".json")) continue;
        const full = path.join(dir, name);
        try {
          const s = await stat(full);
          const raw = await readFile(full, "utf-8");
          const b = JSON.parse(raw) as MemoryBundle;
          if (b.schemaVersion !== SCHEMA_VERSION) continue;
          const totalPoints = b.collections.reduce(
            (n, c) => n + (c.points?.length ?? 0),
            0,
          );
          summaries.push({
            path: full,
            createdAt: b.createdAt,
            collections: b.collections.length,
            totalPoints,
            sizeBytes: s.size,
          });
        } catch {
          // Skip unreadable / non-bundle JSON files.
        }
      }
      summaries.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      return summaries;
    } catch {
      return [];
    }
  }

  /** Inspect a single bundle without importing. */
  async bundleMetadata(srcPath: string): Promise<BundleSummary | null> {
    try {
      const raw = await readFile(srcPath, "utf-8");
      const b = JSON.parse(raw) as MemoryBundle;
      if (b.schemaVersion !== SCHEMA_VERSION) return null;
      const s = await stat(srcPath);
      const totalPoints = b.collections.reduce(
        (n, c) => n + (c.points?.length ?? 0),
        0,
      );
      return {
        path: srcPath,
        createdAt: b.createdAt,
        collections: b.collections.length,
        totalPoints,
        sizeBytes: s.size,
      };
    } catch {
      return null;
    }
  }

  // ── CPP-MS3-U-CPP22: CRDT entry merge ────────────────────────────────

  /**
   * Merge N bundles of CRDT entries using set-union + last-write-wins.
   *
   * This is the correctness-critical primitive for per-agent MemorySync:
   * each of N terminals writes its own bundle, and any agent (or a
   * scheduled aggregator) can call this to produce a consensus view
   * without coordination.
   *
   * Properties (verified by the 7-writer test):
   *   - commutative: merge([a, b]) = merge([b, a])
   *   - associative: merge([merge([a, b]), c]) = merge([a, merge([b, c])])
   *   - idempotent:  merge([a, a]) = a
   *   - preserves distinct entryIds (no lossy union)
   *   - deterministic conflict resolution when timestamps collide
   *
   * Returns merged + stats so callers can telemeter conflict rates.
   */
  mergeEntries(bundles: MemoryCRDTEntry[][]): MergeReport {
    let inputCount = 0;
    let conflictsResolved = 0;
    const byId = new Map<string, MemoryCRDTEntry>();

    for (const bundle of bundles) {
      if (!Array.isArray(bundle)) continue;
      for (const entry of bundle) {
        inputCount++;
        if (!entry || typeof entry.entryId !== "string" || entry.entryId.length === 0) {
          continue;
        }
        const existing = byId.get(entry.entryId);
        if (!existing) {
          byId.set(entry.entryId, entry);
          continue;
        }
        conflictsResolved++;
        if (this.winsOver(entry, existing)) {
          byId.set(entry.entryId, entry);
        }
      }
    }

    // Deterministic output ordering by entryId for stable diffs.
    const merged = Array.from(byId.values()).sort((a, b) =>
      a.entryId < b.entryId ? -1 : a.entryId > b.entryId ? 1 : 0,
    );

    return {
      merged,
      inputCount,
      distinctEntryIds: byId.size,
      conflictsResolved,
    };
  }

  /**
   * LWW comparator: does `candidate` win over `existing`?
   *
   * Rule: higher timestamp wins. On equal timestamps, lexicographically
   * smaller source wins — this guarantees commutativity (A-vs-B and
   * B-vs-A always pick the same winner) without requiring a shared clock.
   */
  private winsOver(candidate: MemoryCRDTEntry, existing: MemoryCRDTEntry): boolean {
    if (candidate.timestamp > existing.timestamp) return true;
    if (candidate.timestamp < existing.timestamp) return false;
    // Timestamps equal — break ties by source lexicographic order.
    if ((candidate.source ?? "") < (existing.source ?? "")) return true;
    return false;
  }

  // ── internals ────────────────────────────────────────────────────────

  private safeHost(): string | null {
    try {
      return this.store.getConnectionOptions()?.url ?? null;
    } catch {
      return null;
    }
  }
}

export const memorySyncEngine = new MemorySyncEngine();
