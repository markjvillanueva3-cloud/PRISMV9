/**
 * CSMMemoryDBAuditEngine — pure functions for auditing per-worktree
 * `memory.db` files across H: drive. Designed for the CSM (Cross-Session
 * Memory) inventory pipeline: classify each DB, group by schema variant,
 * and summarize for downstream merge-planning (P15-U02).
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / P15-U01.
 *
 * Why this exists
 * ---------------
 * Each worktree under H: gets its own `.claude/memory.db` (Claude Code
 * episodic memory) and sometimes a `.swarm/memory.db` (claude-flow swarm
 * state). They sit on disk and never cross-query, so episodic insights
 * captured in one chat are invisible to peers. P15-U01 is the inventory
 * step: enumerate every DB, classify its kind, group by schema-fingerprint
 * so P15-U02's merge-bridge knows which variants need migration vs are
 * already compatible.
 *
 * Pure functions; no fs / sqlite I/O. The driver script
 * (scripts/csm-inventory.mjs) does the disk reads + sqlite queries and
 * feeds inspection results into the engine.
 *
 * @module engines/CSMMemoryDBAuditEngine
 */

const PATH_NORMALIZE_RE = /\\/g;
const MAX_REPORT_LINES = 500;

/** Heuristic class derived from path location. */
export type DBClass =
  | "claude-memory"     // Path ends with `.claude/memory.db`
  | "swarm-memory"      // Path ends with `.swarm/memory.db`
  | "unknown";          // Anything else

export interface DBReport {
  /** Absolute path to the DB file. */
  path: string;
  /** Whether the file exists + is readable. */
  exists: boolean;
  /** File size in bytes (0 if missing). */
  sizeBytes: number;
  /** ISO timestamp of last modification (empty if missing). */
  lastModifiedISO: string;
  /** Number of rows across ALL tables — null if inspection failed. */
  rowCount: number | null;
  /**
   * Stable schema fingerprint: sorted "tableName:colCount,…" string.
   * Two DBs with identical schemas produce the same string. null if
   * inspection failed.
   */
  schemaFingerprint: string | null;
  /** Names of tables found (sorted). Empty if inspection failed. */
  tableNames: string[];
  /** Error message if inspection failed; empty string otherwise. */
  error: string;
}

export interface AuditSummary {
  totalDBs: number;
  readableDBs: number;
  totalSizeBytes: number;
  totalRows: number;
  byClass: Record<DBClass, { count: number; sizeBytes: number; rows: number }>;
  /** count of distinct schema fingerprints (null fingerprints not counted). */
  schemaVariantCount: number;
  /** ISO of oldest mtime; empty if no DBs. */
  oldestModifiedISO: string;
  /** ISO of newest mtime; empty if no DBs. */
  newestModifiedISO: string;
}

export class CSMMemoryDBAuditEngine {
  /**
   * Classify a DB path by directory layout. Path separator tolerant —
   * accepts both forward and backslash forms.
   */
  classifyDBPath(p: string): DBClass {
    if (typeof p !== "string" || p.length === 0) return "unknown";
    const norm = p.replace(PATH_NORMALIZE_RE, "/").toLowerCase();
    if (/(?:^|\/)\.claude\/memory\.db$/.test(norm)) return "claude-memory";
    if (/(?:^|\/)\.swarm\/memory\.db$/.test(norm)) return "swarm-memory";
    return "unknown";
  }

  /**
   * Build a per-fingerprint index. Reports without a fingerprint
   * (inspection failed) land under the empty-string key so callers can
   * handle them explicitly.
   */
  detectSchemaVariants(reports: readonly DBReport[]): Map<string, DBReport[]> {
    const out = new Map<string, DBReport[]>();
    if (!Array.isArray(reports)) return out;
    for (const r of reports) {
      if (!r || typeof r !== "object") continue;
      const key = typeof r.schemaFingerprint === "string" ? r.schemaFingerprint : "";
      const bucket = out.get(key);
      if (bucket) bucket.push(r);
      else out.set(key, [r]);
    }
    return out;
  }

  /**
   * Aggregate an array of DBReport into a single AuditSummary. Stable —
   * does not mutate inputs.
   */
  summarize(reports: readonly DBReport[]): AuditSummary {
    const baseClass = (): { count: number; sizeBytes: number; rows: number } => ({
      count: 0, sizeBytes: 0, rows: 0,
    });
    const summary: AuditSummary = {
      totalDBs: 0,
      readableDBs: 0,
      totalSizeBytes: 0,
      totalRows: 0,
      byClass: {
        "claude-memory": baseClass(),
        "swarm-memory":  baseClass(),
        "unknown":       baseClass(),
      },
      schemaVariantCount: 0,
      oldestModifiedISO: "",
      newestModifiedISO: "",
    };
    if (!Array.isArray(reports) || reports.length === 0) return summary;

    const seenFingerprints = new Set<string>();
    let oldestMs = Number.POSITIVE_INFINITY;
    let newestMs = 0;
    for (const r of reports) {
      if (!r || typeof r !== "object") continue;
      summary.totalDBs++;
      const cls = this.classifyDBPath(r.path);
      const bucket = summary.byClass[cls];
      bucket.count++;
      const size = typeof r.sizeBytes === "number" && Number.isFinite(r.sizeBytes) && r.sizeBytes >= 0 ? r.sizeBytes : 0;
      bucket.sizeBytes += size;
      summary.totalSizeBytes += size;
      const rows = typeof r.rowCount === "number" && Number.isFinite(r.rowCount) && r.rowCount >= 0 ? r.rowCount : 0;
      bucket.rows += rows;
      summary.totalRows += rows;
      if (r.exists === true && (typeof r.error !== "string" || r.error.length === 0)) {
        summary.readableDBs++;
      }
      if (typeof r.schemaFingerprint === "string" && r.schemaFingerprint.length > 0) {
        seenFingerprints.add(r.schemaFingerprint);
      }
      if (typeof r.lastModifiedISO === "string" && r.lastModifiedISO.length > 0) {
        const t = Date.parse(r.lastModifiedISO);
        if (Number.isFinite(t)) {
          if (t < oldestMs) oldestMs = t;
          if (t > newestMs) newestMs = t;
        }
      }
    }
    summary.schemaVariantCount = seenFingerprints.size;
    if (Number.isFinite(oldestMs)) summary.oldestModifiedISO = new Date(oldestMs).toISOString();
    if (newestMs > 0) summary.newestModifiedISO = new Date(newestMs).toISOString();
    return summary;
  }

  /**
   * Build a stable schema fingerprint from a list of (tableName, colCount)
   * pairs. Sorted lexicographically by tableName so two DBs with the same
   * schema produce identical fingerprints regardless of insertion order.
   */
  buildSchemaFingerprint(tables: readonly { name: string; colCount: number }[]): string {
    if (!Array.isArray(tables) || tables.length === 0) return "";
    const valid = tables.filter((t) =>
      t && typeof t.name === "string" && t.name.length > 0
      && typeof t.colCount === "number" && Number.isFinite(t.colCount) && t.colCount >= 0,
    );
    if (valid.length === 0) return "";
    return valid
      .map((t) => `${t.name}:${t.colCount}`)
      .sort()
      .join(",");
  }

  /**
   * Render a markdown audit report from a reports + summary pair. Stable
   * format mirrors the existing PRISM-INVENTORY-LATEST.md style so it can
   * be diffed across runs.
   */
  formatReport(reports: readonly DBReport[], summary: AuditSummary): string {
    const lines: string[] = [
      "# CSM Memory DB Inventory",
      "",
      `**Total DBs:** ${summary.totalDBs} (${summary.readableDBs} readable)`,
      `**Total size:** ${summary.totalSizeBytes.toLocaleString()} bytes`,
      `**Total rows:** ${summary.totalRows.toLocaleString()}`,
      `**Schema variants:** ${summary.schemaVariantCount}`,
      `**Oldest modification:** ${summary.oldestModifiedISO || "(none)"}`,
      `**Newest modification:** ${summary.newestModifiedISO || "(none)"}`,
      "",
      "## By class",
      "",
    ];
    for (const cls of ["claude-memory", "swarm-memory", "unknown"] as const) {
      const b = summary.byClass[cls];
      if (b.count === 0) continue;
      lines.push(`- **${cls}**: ${b.count} DB(s), ${b.sizeBytes.toLocaleString()} bytes, ${b.rows.toLocaleString()} rows`);
    }
    lines.push("");
    lines.push("## Schema variants");
    lines.push("");
    const variants = this.detectSchemaVariants(reports);
    for (const [fingerprint, group] of [...variants.entries()].sort()) {
      const label = fingerprint.length === 0 ? "(unreadable / no fingerprint)" : fingerprint.slice(0, 200);
      lines.push(`### \`${label}\` — ${group.length} DB(s)`);
      lines.push("");
      // Cap per-variant DB list so a degenerate input can't blow up the report.
      let shown = 0;
      for (const r of group) {
        if (shown >= MAX_REPORT_LINES) {
          lines.push(`- … (${group.length - shown} more truncated)`);
          break;
        }
        const cls = this.classifyDBPath(r.path);
        const errSuffix = r.error.length > 0 ? ` — ⚠ ${r.error.slice(0, 80)}` : "";
        lines.push(`- \`${r.path}\` · ${cls} · ${r.sizeBytes.toLocaleString()} bytes · ${r.lastModifiedISO || "(no mtime)"}${errSuffix}`);
        shown++;
      }
      lines.push("");
    }
    return lines.join("\n");
  }
}

export const csmMemoryDBAuditEngine = new CSMMemoryDBAuditEngine();
