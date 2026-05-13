/**
 * FeatureStoreEngine — U-LEARN-02
 * ================================
 *
 * Central feature store for every ML model PRISM trains. Writes are
 * append-only JSONL shards keyed on (domain, feature_group, version).
 * Reads use AS-OF semantics so training at t=T0 never sees data observable
 * only at t>T0 — the Evaluation-Scientist scrutiny called out temporal
 * leakage as the hidden optimism-bias source that inflates model quality
 * numbers.
 *
 * Design invariants (from Data-Pipeline 0.28 and Evaluation 0.42 scrutiny):
 *   1. POINT-IN-TIME CORRECT.  Every read by `getHistoricalFeatures` uses
 *      AS-OF: for each entity, return the row with max(event_ts) such that
 *      event_ts ≤ as_of_ts.  Training does not see future.
 *   2. APPEND-ONLY.  Rows never mutate. An updated feature emits a new row
 *      with a later event_ts; readers pick via AS-OF.
 *   3. PER-GROUP SHARD.  File path is `state/features/<domain>/<group>/
 *      <version>.jsonl`.  Scans stay O(rows in this group) not O(all).
 *   4. ATOMIC WRITE.  Same tmp+fsync+rename pattern as OutcomeCaptureBus.
 *   5. VERSIONED GROUP.  `feature_group_version` lets schema evolve without
 *      corrupting historical rows.  New version = new shard file.
 *   6. STREAM→STORE.  Helper `ingestOutcomeEvent` converts a recent
 *      OutcomeCaptureBus event to a feature row — the offline/online
 *      parity path (MLOps scrutiny fix).
 *   7. CRASH-TOLERANT READ.  Torn tail lines (mid-write crash) skipped
 *      not thrown.
 *
 * Coexistence:
 *   - CAMFeatureExtractorEngine stays the CAM-side feature extractor
 *   - This engine is the canonical STORE other extractors write into
 *
 * @module engines/FeatureStoreEngine
 * @milestone PSAU P2.5-LEARN U-LEARN-02
 */

import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  FeatureRowSchema,
  FeatureQuerySchema,
  PutFeatureInputSchema,
  type FeatureRow,
  type FeatureQuery,
  type FeatureQueryResult,
  type PutFeatureInput,
} from "../schemas/featureStoreSchema.js";
import type { OutcomeDomainT, OutcomeEvent } from "../schemas/outcomeEventSchema.js";

const FEATURES_DIR = path.resolve(process.cwd(), "state/features");
const SCHEMA_VERSION = "1.0.0" as const;
const MAX_ROW_BYTES = 128 * 1024;    // 128 KB per feature row

export interface PutResult {
  ok: boolean;
  row_id: string;
  path: string;
  warning?: string;
}

export interface StatsResult {
  root_dir: string;
  groups: Array<{
    domain: string;
    feature_group: string;
    feature_group_version: string;
    row_count: number;
    bytes: number;
  }>;
}

/**
 * FeatureStoreEngine — singleton, static ops, one in-process instance.
 * Class exposed for testability (independent root dirs).
 */
export class FeatureStoreEngine {
  private readonly rootDir: string;

  constructor(rootDir: string = FEATURES_DIR) {
    this.rootDir = rootDir;
  }

  /**
   * Append a feature row. Writer MUST supply event_ts (the observation time);
   * write_ts is stamped by the store. Never throws — bad input returns
   * ok:false with a warning.
   */
  put(input: PutFeatureInput): PutResult {
    const parsed = PutFeatureInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        row_id: "",
        path: "",
        warning: `schema validation failed: ${parsed.error.message}`,
      };
    }
    const row: FeatureRow = {
      schemaVersion: SCHEMA_VERSION,
      domain: parsed.data.domain,
      feature_group: parsed.data.feature_group,
      feature_group_version: parsed.data.feature_group_version,
      entity_id: parsed.data.entity_id,
      event_ts: parsed.data.event_ts,
      write_ts: new Date().toISOString(),
      lineage_id: parsed.data.lineage_id,
      feature_values: parsed.data.feature_values,
      source_event_id: parsed.data.source_event_id,
    };
    const rowCheck = FeatureRowSchema.safeParse(row);
    if (!rowCheck.success) {
      return {
        ok: false,
        row_id: "",
        path: "",
        warning: `row check failed: ${rowCheck.error.message}`,
      };
    }

    let line: string;
    try {
      line = JSON.stringify(row) + "\n";
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        row_id: "",
        path: "",
        warning: `serialization failed (non-JSON-safe payload): ${message}`,
      };
    }
    if (Buffer.byteLength(line, "utf8") > MAX_ROW_BYTES) {
      return {
        ok: false,
        row_id: "",
        path: "",
        warning: `row exceeds ${MAX_ROW_BYTES} bytes`,
      };
    }

    const filePath = this.pathFor(
      row.domain,
      row.feature_group,
      row.feature_group_version,
    );
    const res = this.atomicAppend(filePath, line);
    if (!res.ok) {
      return { ok: false, row_id: "", path: filePath, warning: res.warning };
    }
    return { ok: true, row_id: randomUUID(), path: filePath };
  }

  /**
   * Point-in-time feature retrieval. For each entity in entity_ids, returns
   * the feature row with max(event_ts) such that event_ts ≤ as_of_ts.
   * If as_of_ts is omitted, uses NOW().  entity_ids with no matching row
   * appear in `misses[]`.
   */
  getHistoricalFeatures(query: FeatureQuery): FeatureQueryResult {
    const parsed = FeatureQuerySchema.safeParse(query);
    if (!parsed.success) {
      return {
        domain: query.domain ?? ("other" as OutcomeDomainT),
        feature_group: query.feature_group ?? "",
        feature_group_version: "v1",
        as_of_ts: undefined,
        rows: [],
        misses: (query.entity_ids ?? []) as string[],
      };
    }
    const q = parsed.data;
    const asOfMs = q.as_of_ts ? Date.parse(q.as_of_ts) : Date.now();
    const version = q.feature_group_version ?? "v1";

    const filePath = this.pathFor(q.domain, q.feature_group, version);
    const result: FeatureQueryResult = {
      domain: q.domain,
      feature_group: q.feature_group,
      feature_group_version: version,
      as_of_ts: q.as_of_ts,
      rows: [],
      misses: [],
    };

    const raw = this.safeRead(filePath);
    if (!raw) {
      result.misses = [...q.entity_ids];
      return result;
    }

    // Per-entity best-so-far { ts, row }
    const best = new Map<string, { ts: number; row: FeatureRow }>();
    const wantedEntities = new Set(q.entity_ids);

    for (const rawLine of raw.split(/\r?\n/)) {
      if (!rawLine.trim()) continue;
      try {
        const candidate = JSON.parse(rawLine);
        const rp = FeatureRowSchema.safeParse(candidate);
        if (!rp.success) continue;
        const row = rp.data;
        if (!wantedEntities.has(row.entity_id)) continue;
        const ts = Date.parse(row.event_ts);
        if (Number.isNaN(ts) || ts > asOfMs) continue;
        const prev = best.get(row.entity_id);
        if (!prev || ts > prev.ts) {
          best.set(row.entity_id, { ts, row });
        }
      } catch {
        // Torn tail line → skip silently.
      }
    }

    for (const entityId of q.entity_ids) {
      const hit = best.get(entityId);
      if (!hit) {
        result.misses.push(entityId);
        continue;
      }
      const values = q.feature_keys
        ? Object.fromEntries(
            q.feature_keys
              .filter((k) => k in hit.row.feature_values)
              .map((k) => [k, hit.row.feature_values[k]]),
          )
        : hit.row.feature_values;
      result.rows.push({
        entity_id: hit.row.entity_id,
        event_ts: hit.row.event_ts,
        feature_values: values,
        lineage_id: hit.row.lineage_id,
        source_event_id: hit.row.source_event_id,
      });
    }

    // newest-first within the rows we kept
    result.rows.sort((a, b) => b.event_ts.localeCompare(a.event_ts));
    return result;
  }

  /**
   * Helper: ingest an OutcomeCaptureBus event into a feature row. Useful when
   * a measurement event (cycle_time_measurement, tool_break, etc.) should
   * become a feature signal. Caller controls feature_group naming.
   *
   * NOTE (v1.1.0 — INFRA-NEURAL-LEDGER-MS1/P0-U01): the OutcomeEvent v1.1.0
   * additions (`numeric_features`, `context.{job_id,pipeline_run_id,pipeline_stage,
   * consensus_audit_id}`) are NOT automatically forwarded into the feature row.
   * Only `kind`, `source`, `severity`, `actual`, `recommended`, `delta` propagate.
   * If you want any v1.1.0 field as a feature, include it explicitly via
   * `opts.feature_values` (e.g. `{ pipeline_stage: event.context.pipeline_stage }`).
   * This is intentional — the feature store controls its own controlled vocabulary
   * rather than passively absorbing whatever shape the bus event carries.
   */
  ingestOutcomeEvent(
    event: OutcomeEvent,
    opts: {
      feature_group: string;
      feature_group_version?: string;
      entity_id: string;
      feature_values?: Record<string, unknown>;
    },
  ): PutResult {
    const merged: Record<string, unknown> = {
      ...(opts.feature_values ?? {}),
      kind: event.kind,
      source: event.source,
      severity: event.severity,
    };
    if (event.actual !== undefined) merged.actual = event.actual;
    if (event.recommended !== undefined) merged.recommended = event.recommended;
    if (event.delta !== undefined) merged.delta = event.delta;
    if (event.confidence !== undefined) merged.confidence = event.confidence;
    return this.put({
      domain: event.domain,
      feature_group: opts.feature_group,
      feature_group_version: opts.feature_group_version ?? "v1",
      entity_id: opts.entity_id,
      event_ts: event.timestamp,
      lineage_id: event.lineage_id,
      feature_values: merged,
      source_event_id: event.event_id,
    });
  }

  /**
   * Enumerate available feature groups on disk. Useful for /feature-store
   * discovery and integration tests.
   */
  listFeatureGroups(): Array<{
    domain: string;
    feature_group: string;
    feature_group_version: string;
    path: string;
  }> {
    const groups: Array<{
      domain: string;
      feature_group: string;
      feature_group_version: string;
      path: string;
    }> = [];
    if (!fs.existsSync(this.rootDir)) return groups;
    for (const domain of fs.readdirSync(this.rootDir)) {
      const domainPath = path.join(this.rootDir, domain);
      if (!fs.statSync(domainPath).isDirectory()) continue;
      for (const group of fs.readdirSync(domainPath)) {
        const groupPath = path.join(domainPath, group);
        if (!fs.statSync(groupPath).isDirectory()) continue;
        for (const versionFile of fs.readdirSync(groupPath)) {
          if (!versionFile.endsWith(".jsonl")) continue;
          const version = versionFile.replace(/\.jsonl$/, "");
          groups.push({
            domain,
            feature_group: group,
            feature_group_version: version,
            path: path.join(groupPath, versionFile),
          });
        }
      }
    }
    return groups;
  }

  stats(): StatsResult {
    const groups = this.listFeatureGroups().map((g) => {
      const raw = this.safeRead(g.path);
      const rows = raw ? raw.split(/\r?\n/).filter((l) => l.trim()).length : 0;
      const bytes = raw ? Buffer.byteLength(raw, "utf8") : 0;
      return {
        domain: g.domain,
        feature_group: g.feature_group,
        feature_group_version: g.feature_group_version,
        row_count: rows,
        bytes,
      };
    });
    return { root_dir: this.rootDir, groups };
  }

  // ------------------------------------------------------------------
  // Internals
  // ------------------------------------------------------------------

  private pathFor(
    domain: string,
    featureGroup: string,
    version: string,
  ): string {
    return path.join(this.rootDir, domain, featureGroup, `${version}.jsonl`);
  }

  private safeRead(filePath: string): string | null {
    try {
      if (!fs.existsSync(filePath)) return null;
      return fs.readFileSync(filePath, "utf8");
    } catch {
      return null;
    }
  }

  private atomicAppend(
    filePath: string,
    line: string,
  ): { ok: boolean; warning?: string } {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      let existing = "";
      if (fs.existsSync(filePath)) existing = fs.readFileSync(filePath, "utf8");
      const tmp = path.join(
        dir,
        `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`,
      );
      const fd = fs.openSync(tmp, "w");
      try {
        fs.writeSync(fd, existing);
        fs.writeSync(fd, line);
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
      fs.renameSync(tmp, filePath);
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(
        `[FeatureStore] atomic-append failed for ${filePath}: ${message}\n`,
      );
      return { ok: false, warning: message };
    }
  }

  static getSelfAwareness() {
    return {
      name: "FeatureStoreEngine",
      version: "1.0.0",
      milestone: "PSAU P2.5-LEARN U-LEARN-02",
      capabilities: [
        "put",
        "getHistoricalFeatures",
        "ingestOutcomeEvent",
        "listFeatureGroups",
        "stats",
      ],
      dependencies: ["featureStoreSchema", "outcomeEventSchema"],
      dataSourcesUsed: ["state/features/<domain>/<group>/<version>.jsonl"],
    };
  }
}

export const featureStoreEngine = new FeatureStoreEngine();
