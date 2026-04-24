/**
 * TrainingDatasetSnapshotEngine — U-LEARN-02
 * ============================================
 *
 * Materialises an immutable snapshot of a training dataset pulled from
 * FeatureStoreEngine via AS-OF query. Every model training run writes
 * its snapshot once; later runs reproduce the same training split by
 * quoting the snapshot_id + content_hash — no "my Jan-02 model saw row
 * X, my Jan-03 rerun didn't" drift.
 *
 * Storage:
 *   state/training_snapshots/<snapshot_id>/rows.jsonl      (actual rows)
 *   state/training_snapshots/<snapshot_id>/manifest.json   (query + hash)
 *   state/training_snapshots/index.jsonl                   (append-only log)
 *
 * Invariants:
 *   1. IMMUTABLE — once a snapshot is created it's never rewritten.
 *      Attempting to create a snapshot with the same snapshot_id returns
 *      { ok: false, warning: "already exists" }.
 *   2. DETERMINISTIC — same query + same FeatureStore contents yield the
 *      same content_hash. Hash is SHA-256 over the sorted rows JSON.
 *   3. AS-OF CORRECT — snapshot uses the caller's as_of_ts verbatim; no
 *      future leakage possible because FeatureStore enforces AS-OF itself.
 *   4. LINEAGE-CARRYING — every row retains its lineage_id so MLLineage
 *      can trace training_example → raw_observation.
 *   5. NEVER-THROW — bad input returns { ok: false, warning }.
 *
 * @module engines/TrainingDatasetSnapshotEngine
 * @milestone PSAU P2.5-LEARN U-LEARN-02
 */

import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import {
  featureStoreEngine,
  FeatureStoreEngine,
} from "./FeatureStoreEngine.js";
import type {
  FeatureQuery,
  FeatureQueryResultRow,
} from "../schemas/featureStoreSchema.js";

const SNAPSHOT_ROOT = path.resolve(process.cwd(), "state/training_snapshots");

export interface SnapshotManifest {
  snapshot_id: string;
  query: FeatureQuery;
  row_count: number;
  miss_count: number;
  content_hash: string;
  created_at: string;
  label?: string;
  notes?: string;
}

export interface CreateSnapshotInput {
  query: FeatureQuery;
  snapshot_id?: string;
  label?: string;
  notes?: string;
}

export interface CreateSnapshotResult {
  ok: boolean;
  snapshot_id?: string;
  manifest?: SnapshotManifest;
  warning?: string;
}

export interface LoadSnapshotResult {
  ok: boolean;
  manifest?: SnapshotManifest;
  rows?: FeatureQueryResultRow[];
  warning?: string;
}

/**
 * TrainingDatasetSnapshotEngine — stateless; instance only for test isolation.
 */
export class TrainingDatasetSnapshotEngine {
  private readonly rootDir: string;
  private readonly store: FeatureStoreEngine;

  constructor(
    rootDir: string = SNAPSHOT_ROOT,
    store: FeatureStoreEngine = featureStoreEngine,
  ) {
    this.rootDir = rootDir;
    this.store = store;
  }

  /**
   * Build a snapshot from a FeatureQuery. Query executes against FeatureStore
   * now; result rows are frozen to disk with a content_hash. If the caller
   * supplies snapshot_id and it already exists, fail fast (immutability).
   */
  create(input: CreateSnapshotInput): CreateSnapshotResult {
    const snapshot_id = input.snapshot_id ?? randomUUID();
    const snapshotDir = path.join(this.rootDir, snapshot_id);

    if (fs.existsSync(snapshotDir)) {
      return {
        ok: false,
        warning: `snapshot ${snapshot_id} already exists (immutable)`,
      };
    }

    let queryResult;
    try {
      queryResult = this.store.getHistoricalFeatures(input.query);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, warning: `FeatureStore query failed: ${message}` };
    }

    if (!queryResult || !Array.isArray(queryResult.rows)) {
      return { ok: false, warning: "FeatureStore returned no rows object" };
    }

    // Deterministic content hash — sort rows by entity_id+event_ts so
    // insertion order doesn't affect the hash.
    const sortedRows = [...queryResult.rows].sort((a, b) => {
      const idCmp = a.entity_id.localeCompare(b.entity_id);
      return idCmp !== 0 ? idCmp : a.event_ts.localeCompare(b.event_ts);
    });
    const serialized = JSON.stringify(sortedRows);
    const content_hash = createHash("sha256").update(serialized).digest("hex");

    const manifest: SnapshotManifest = {
      snapshot_id,
      query: input.query,
      row_count: sortedRows.length,
      miss_count: queryResult.misses.length,
      content_hash,
      created_at: new Date().toISOString(),
      label: input.label,
      notes: input.notes,
    };

    const write = this.materialize(snapshotDir, manifest, sortedRows);
    if (!write.ok) return { ok: false, warning: write.warning };

    this.appendIndex(manifest);
    return { ok: true, snapshot_id, manifest };
  }

  /**
   * Re-open a snapshot by id. Returns its manifest + rows verbatim.
   * Rehashes the rows on load and compares to manifest.content_hash —
   * any drift returns { ok: false, warning: "content_hash mismatch" }.
   */
  load(snapshot_id: string): LoadSnapshotResult {
    const snapshotDir = path.join(this.rootDir, snapshot_id);
    const manifestPath = path.join(snapshotDir, "manifest.json");
    const rowsPath = path.join(snapshotDir, "rows.jsonl");

    if (!fs.existsSync(manifestPath) || !fs.existsSync(rowsPath)) {
      return { ok: false, warning: `snapshot ${snapshot_id} not found` };
    }

    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as SnapshotManifest;
      const rowsRaw = fs.readFileSync(rowsPath, "utf8");
      const rows: FeatureQueryResultRow[] = rowsRaw
        .split(/\r?\n/)
        .filter((l) => l.trim())
        .map((l) => JSON.parse(l) as FeatureQueryResultRow);

      // Verify hash to detect tampering
      const sortedRows = [...rows].sort((a, b) => {
        const idCmp = a.entity_id.localeCompare(b.entity_id);
        return idCmp !== 0 ? idCmp : a.event_ts.localeCompare(b.event_ts);
      });
      const rehash = createHash("sha256")
        .update(JSON.stringify(sortedRows))
        .digest("hex");
      if (rehash !== manifest.content_hash) {
        return {
          ok: false,
          warning: `content_hash mismatch — expected ${manifest.content_hash}, got ${rehash}`,
        };
      }

      return { ok: true, manifest, rows };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, warning: `load failed: ${message}` };
    }
  }

  /**
   * List all known snapshots (optionally filtered by label). Returns
   * manifests in creation order (from index.jsonl).
   */
  list(filter?: { label?: string }): SnapshotManifest[] {
    const indexPath = path.join(this.rootDir, "index.jsonl");
    if (!fs.existsSync(indexPath)) return [];
    try {
      const raw = fs.readFileSync(indexPath, "utf8");
      const all = raw
        .split(/\r?\n/)
        .filter((l) => l.trim())
        .map((l) => JSON.parse(l) as SnapshotManifest);
      if (filter?.label === undefined) return all;
      return all.filter((m) => m.label === filter.label);
    } catch {
      return [];
    }
  }

  /**
   * Count snapshots + roll-up stats — for dashboards.
   */
  stats(): { count: number; total_rows: number; by_domain: Record<string, number> } {
    const all = this.list();
    let total_rows = 0;
    const by_domain: Record<string, number> = {};
    for (const m of all) {
      total_rows += m.row_count;
      const d = m.query.domain;
      by_domain[d] = (by_domain[d] ?? 0) + 1;
    }
    return { count: all.length, total_rows, by_domain };
  }

  // ------------------------------------------------------------------
  // Internals
  // ------------------------------------------------------------------

  private materialize(
    snapshotDir: string,
    manifest: SnapshotManifest,
    rows: FeatureQueryResultRow[],
  ): { ok: boolean; warning?: string } {
    try {
      fs.mkdirSync(snapshotDir, { recursive: true });
      fs.writeFileSync(
        path.join(snapshotDir, "manifest.json"),
        JSON.stringify(manifest, null, 2),
        "utf8",
      );
      const lines = rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length > 0 ? "\n" : "");
      fs.writeFileSync(path.join(snapshotDir, "rows.jsonl"), lines, "utf8");
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, warning: message };
    }
  }

  private appendIndex(manifest: SnapshotManifest): void {
    try {
      fs.mkdirSync(this.rootDir, { recursive: true });
      fs.appendFileSync(
        path.join(this.rootDir, "index.jsonl"),
        JSON.stringify(manifest) + "\n",
        "utf8",
      );
    } catch {
      /* index write is best-effort; manifest is the source of truth */
    }
  }

  static getSelfAwareness() {
    return {
      name: "TrainingDatasetSnapshotEngine",
      version: "1.0.0",
      milestone: "PSAU P2.5-LEARN U-LEARN-02",
      capabilities: ["create", "load", "list", "stats"],
      dependencies: ["FeatureStoreEngine", "featureStoreSchema"],
      dataSourcesUsed: ["state/training_snapshots/*"],
    };
  }
}

export const trainingDatasetSnapshotEngine = new TrainingDatasetSnapshotEngine();
