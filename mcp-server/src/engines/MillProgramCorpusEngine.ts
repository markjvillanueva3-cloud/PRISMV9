/**
 * MillProgramCorpusEngine — the REAL fuel for print-to-program replication.
 *
 * {@link MillProgramReplicationEngine} ("generate a CNC program just by reading a
 * print") retrieves the most-similar existing program from a
 * `corpus: FeatureSequenceRecord[]` and adapts it. But nothing ever materialized
 * that corpus from the real shop history — so the capability was DARK for lack of
 * fuel: every `replicate_from_print` call required the caller to pass the records
 * inline, and in practice the corpus was always empty (engine returned
 * "empty corpus — no existing programs to replicate from").
 *
 * This engine is the missing PRODUCER. It:
 *   1. DISCOVERS real JM mill CAM projects via juliett's `jm-die-database` files
 *      index (search-first — never walks the 38K-file JM DIE tree with Glob,
 *      which times out per the noise-path catalog).
 *   2. PARSES each into a {@link FeatureSequenceRecord} with the existing, proven
 *      {@link hmcProjectParserEngine} — which extracts real operations (the
 *      toolpath sequence to adapt), inferred features, and axis evidence. STEP /
 *      pure-CAD sources are deliberately NOT used here: they yield geometry-only
 *      records with no operations, so there is no program to replicate.
 *   3. PERSISTS the corpus (JSONL + manifest) so it is built once and loaded
 *      cheaply on every replication call.
 *   4. SERVES the cached corpus via {@link getCorpus}; the multi-axis dispatcher
 *      injects it into replicate_from_print / replicate_similarity_search when no
 *      inline corpus is supplied.
 *
 * Pure-core + injected-readers: every filesystem touch is injectable
 * (`indexReader` / `fileReader` / `parser`) so the orchestration is unit-tested
 * with fixtures AND proven against a real JM `.hmc` in the companion test — the
 * "ship a real-data E2E for injected-reader engines" rule (RGS-TOOL-AUTOINVOKE
 * MS1 lesson).
 *
 * No new physics, no new parsing — pure composition of HMCProjectParserEngine +
 * the jm-die-database index + the canonical {@link deriveAxisCount} classifier.
 *
 * @milestone PRINT-TO-PROGRAM-REPLICATION / U-FOXTROT-PTP-CORPUS-MS0
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { hmcProjectParserEngine, type FeatureSequenceRecord } from "./hypermill/HMCProjectParserEngine.js";
import { deriveAxisCount, type AxisCount } from "./MillProgramReplicationEngine.js";

// ══════════════════════════════════════════════════════════════════════════════
// PATH RESOLUTION (robust across tsx-dev, esbuild bundle, and cwd variations)
// ══════════════════════════════════════════════════════════════════════════════

const HERE = path.dirname(fileURLToPath(import.meta.url));

/**
 * Find the `mcp-server/data` directory regardless of how the module was loaded
 * (src/engines under tsx, dist/ when bundled, or cwd = repo-root vs mcp-server).
 * Returns the first existing candidate; falls back to the dev-layout path.
 */
function findDataDir(): string {
  const candidates = [
    path.resolve(HERE, "../../data"),         // src/engines -> mcp-server/data (tsx/dev)
    path.resolve(HERE, "../../../data"),      // dist/**/engines -> mcp-server/data (bundled)
    path.resolve(process.cwd(), "data"),      // cwd = mcp-server
    path.resolve(process.cwd(), "mcp-server/data"), // cwd = repo root
  ];
  for (const c of candidates) {
    try { if (fs.existsSync(c)) return c; } catch { /* keep scanning */ }
  }
  return candidates[0];
}

const DATA_DIR = findDataDir();
const DEFAULT_INDEX_PATH = path.join(DATA_DIR, "jm-die-database", "tables", "files.jsonl");
const DEFAULT_OUT_DIR = path.join(DATA_DIR, "mill-corpus");
const DEFAULT_CORPUS_FILE = "jm-mill-corpus.jsonl";
const DEFAULT_MANIFEST_FILE = "manifest.json";

const CORPUS_SCHEMA_VERSION = "1.0.0";

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** One row of the jm-die-database files index, reduced to what discovery needs. */
export interface CorpusFileEntry {
  path: string;
  ext?: string;
  customer?: string;
  machine?: string;
  kind?: string;
  size?: number;
  stem?: string;
}

/** Minimal shape of the parser this engine composes (injectable for tests). */
export type CorpusParser = (
  content: string,
  options?: { projectName?: string },
) => { record: FeatureSequenceRecord; confidence?: number };

export interface BuildCorpusOptions {
  /** Path to juliett's jm-die-database files index (JSONL). */
  indexPath?: string;
  /** Inject a file-index reader (default: read + filter `indexPath`). */
  indexReader?: () => CorpusFileEntry[];
  /** Inject a per-file content reader (default: fs.readFileSync utf8). */
  fileReader?: (filePath: string) => string;
  /** Inject the parser (default: hmcProjectParserEngine.parse). */
  parser?: CorpusParser;
  /** Cap files parsed (0 / undefined = no cap). */
  maxFiles?: number;
  /** Minimum parser confidence (0-1) to keep a record (default 0). */
  minConfidence?: number;
  /** File extensions to accept (lowercase, with dot). Default `[".hmc"]`. */
  extensions?: string[];
  /** Restrict to these machine classes (e.g. ["mill_haas","mill_mixed"]). Default: any. */
  machines?: string[];
  /**
   * Drop records whose `operations` are empty. A program with no operations has
   * nothing for the replicator to adapt, so such records only pollute retrieval.
   * Default `true`.
   */
  requireOperations?: boolean;
}

export interface CorpusStats {
  total: number;
  byAxis: Record<"3" | "4" | "5", number>;
  bySource: Record<string, number>;
  byPartType: Record<string, number>;
  withOperations: number;
  totalOperations: number;
}

export interface BuildCorpusResult {
  ok: boolean;
  records: FeatureSequenceRecord[];
  stats: CorpusStats & {
    filesDiscovered: number;
    filesParsed: number;
    filesFailed: number;
    filesSkippedLowConfidence: number;
    filesSkippedNoOperations: number;
  };
  failures: Array<{ path: string; reason: string }>;
  warnings: string[];
  reason?: string;
}

export interface PersistResult {
  ok: boolean;
  corpusPath: string;
  manifestPath: string;
  count: number;
  reason?: string;
}

export interface BuildAndPersistResult {
  ok: boolean;
  corpusPath: string | null;
  manifestPath: string | null;
  count: number;
  stats: BuildCorpusResult["stats"];
  failures: Array<{ path: string; reason: string }>;
  warnings: string[];
  reason?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// ENGINE
// ══════════════════════════════════════════════════════════════════════════════

class MillProgramCorpusEngine {
  /** path -> { mtimeMs, records } load cache (avoids re-reading the JSONL per call). */
  private _loadCache = new Map<string, { mtimeMs: number; records: FeatureSequenceRecord[] }>();

  /**
   * Discover JM mill CAM projects from the files index and parse each into a
   * FeatureSequenceRecord. Does NOT persist — see {@link persist} /
   * {@link buildAndPersist}.
   *
   * Fail-soft per file: a file that cannot be read or parsed is recorded in
   * `failures` and counted, never aborting the whole build.
   *
   * @param opts - discovery filters + injectable readers/parser.
   * @returns the parsed records, build stats, and per-file failures.
   */
  buildCorpus(opts: BuildCorpusOptions = {}): BuildCorpusResult {
    const warnings: string[] = [];
    const failures: Array<{ path: string; reason: string }> = [];
    const indexPath = opts.indexPath ?? DEFAULT_INDEX_PATH;
    const extensions = (opts.extensions ?? [".hmc"]).map((e) => e.toLowerCase());
    const machines = opts.machines?.map((m) => m.toLowerCase());
    const minConfidence = Number.isFinite(opts.minConfidence) ? (opts.minConfidence as number) : 0;
    const requireOperations = opts.requireOperations !== false;
    const parser: CorpusParser = opts.parser ?? ((content, o) => hmcProjectParserEngine.parse(content, o));
    const readFile = opts.fileReader ?? ((p: string) => fs.readFileSync(p, "utf8"));

    // 1. DISCOVER — search-first via the index (or injected reader).
    let entries: CorpusFileEntry[];
    try {
      entries = opts.indexReader
        ? opts.indexReader()
        : this.readIndex(indexPath, extensions, machines);
    } catch (err) {
      return this.emptyBuild(`failed to read files index '${indexPath}': ${errMsg(err)}`);
    }
    if (!Array.isArray(entries) || entries.length === 0) {
      const result = this.emptyBuild(
        `no source files matched (extensions=${extensions.join(",")}` +
          (machines ? `, machines=${machines.join(",")}` : "") + `) in '${indexPath}'`,
      );
      result.ok = true; // an empty-but-valid corpus is not an error — surface as a warning.
      result.warnings.push(result.reason ?? "no source files discovered");
      result.reason = undefined;
      return result;
    }

    const cap = Number.isFinite(opts.maxFiles) && (opts.maxFiles as number) > 0
      ? Math.floor(opts.maxFiles as number)
      : entries.length;
    const filesDiscovered = entries.length;
    if (cap < filesDiscovered) {
      warnings.push(`capped at ${cap}/${filesDiscovered} discovered files (maxFiles)`);
    }

    // 2. PARSE — each file into a FeatureSequenceRecord (fail-soft).
    const records: FeatureSequenceRecord[] = [];
    let filesParsed = 0;
    let filesSkippedLowConfidence = 0;
    let filesSkippedNoOperations = 0;
    for (const entry of entries.slice(0, cap)) {
      let content: string;
      try {
        content = readFile(entry.path);
      } catch (err) {
        failures.push({ path: entry.path, reason: `read failed: ${errMsg(err)}` });
        continue;
      }
      if (typeof content !== "string" || content.trim() === "") {
        failures.push({ path: entry.path, reason: "empty file content" });
        continue;
      }
      let parsed: { record: FeatureSequenceRecord; confidence?: number };
      try {
        parsed = parser(content, { projectName: entry.stem ?? path.basename(entry.path) });
      } catch (err) {
        failures.push({ path: entry.path, reason: `parse failed: ${errMsg(err)}` });
        continue;
      }
      if (!parsed?.record) {
        failures.push({ path: entry.path, reason: "parser returned no record" });
        continue;
      }
      const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 1;
      if (confidence < minConfidence) {
        filesSkippedLowConfidence++;
        continue;
      }
      // A record with no operations is not a program — the replicator adapts the
      // SOURCE's operations to the new part, so an empty-op record is dead fuel.
      if (requireOperations && (!Array.isArray(parsed.record.operations) || parsed.record.operations.length === 0)) {
        filesSkippedNoOperations++;
        continue;
      }
      const record = this.tagProvenance(parsed.record, entry);
      records.push(record);
      filesParsed++;
    }

    if (records.length === 0) {
      warnings.push(
        `discovered ${filesDiscovered} file(s) but produced 0 records ` +
          `(${failures.length} failed, ${filesSkippedLowConfidence} below confidence ${minConfidence}, ` +
          `${filesSkippedNoOperations} with no operations)`,
      );
    }

    const stats = this.computeStats(records);
    return {
      ok: true,
      records,
      stats: {
        ...stats,
        filesDiscovered, filesParsed, filesFailed: failures.length,
        filesSkippedLowConfidence, filesSkippedNoOperations,
      },
      failures,
      warnings,
    };
  }

  /**
   * Persist a corpus to JSONL + a manifest sidecar (atomic tmp-then-rename).
   * @param records - the FeatureSequenceRecords to persist.
   * @param outDir - target directory (default `mcp-server/data/mill-corpus`).
   */
  persist(records: FeatureSequenceRecord[], outDir: string = DEFAULT_OUT_DIR): PersistResult {
    const corpusPath = path.join(outDir, DEFAULT_CORPUS_FILE);
    const manifestPath = path.join(outDir, DEFAULT_MANIFEST_FILE);
    if (!Array.isArray(records)) {
      return { ok: false, corpusPath, manifestPath, count: 0, reason: "records must be an array" };
    }
    try {
      fs.mkdirSync(outDir, { recursive: true });
      const jsonl = records.map((r) => JSON.stringify(r)).join("\n") + (records.length ? "\n" : "");
      writeFileAtomic(corpusPath, jsonl);
      const manifest = {
        schemaVersion: CORPUS_SCHEMA_VERSION,
        kind: "mill-program-replication-corpus",
        generatedAt: new Date().toISOString(),
        builder: "MillProgramCorpusEngine",
        owner_slot: "foxtrot",
        corpusFile: DEFAULT_CORPUS_FILE,
        count: records.length,
        stats: this.computeStats(records),
      };
      writeFileAtomic(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
      // Invalidate any cached load of this corpus.
      this._loadCache.delete(corpusPath);
      return { ok: true, corpusPath, manifestPath, count: records.length };
    } catch (err) {
      return { ok: false, corpusPath, manifestPath, count: 0, reason: errMsg(err) };
    }
  }

  /**
   * Build the corpus from real sources and persist it in one call — the
   * `replicate_corpus_build` dispatcher action.
   * @param opts - build options + optional `outDir`.
   */
  buildAndPersist(opts: BuildCorpusOptions & { outDir?: string } = {}): BuildAndPersistResult {
    const build = this.buildCorpus(opts);
    if (!build.ok) {
      return {
        ok: false,
        corpusPath: null,
        manifestPath: null,
        count: 0,
        stats: build.stats,
        failures: build.failures,
        warnings: build.warnings,
        reason: build.reason,
      };
    }
    const persisted = this.persist(build.records, opts.outDir ?? DEFAULT_OUT_DIR);
    return {
      ok: persisted.ok,
      corpusPath: persisted.ok ? persisted.corpusPath : null,
      manifestPath: persisted.ok ? persisted.manifestPath : null,
      count: persisted.count,
      stats: build.stats,
      failures: build.failures.slice(0, 50), // cap noise on the wire
      warnings: build.warnings,
      reason: persisted.ok ? undefined : persisted.reason,
    };
  }

  /**
   * Load a persisted corpus from JSONL. Cached by path + mtime so repeated
   * replication calls do not re-read the file.
   * @param corpusPath - JSONL path (default persisted corpus location).
   * @returns the records, or `[]` if the file is absent/unreadable.
   */
  load(corpusPath: string = path.join(DEFAULT_OUT_DIR, DEFAULT_CORPUS_FILE)): FeatureSequenceRecord[] {
    let mtimeMs: number;
    try {
      mtimeMs = fs.statSync(corpusPath).mtimeMs;
    } catch {
      return []; // absent corpus → empty (caller surfaces "empty corpus" fail-loud)
    }
    const cached = this._loadCache.get(corpusPath);
    if (cached && cached.mtimeMs === mtimeMs) return cached.records;

    let records: FeatureSequenceRecord[] = [];
    try {
      const raw = fs.readFileSync(corpusPath, "utf8");
      records = raw
        .split("\n")
        .filter((l) => l.trim() !== "")
        .map((l) => {
          try { return JSON.parse(l) as FeatureSequenceRecord; } catch { return null; }
        })
        .filter((r): r is FeatureSequenceRecord => r !== null);
    } catch {
      return [];
    }
    this._loadCache.set(corpusPath, { mtimeMs, records });
    return records;
  }

  /**
   * The default persisted corpus, loaded + cached. Used by the dispatcher to
   * supply `replicate_from_print` when no inline corpus is passed.
   */
  getCorpus(corpusPath?: string): FeatureSequenceRecord[] {
    return this.load(corpusPath);
  }

  /** Compute corpus statistics (axis distribution, sources, operation density). */
  computeStats(records: FeatureSequenceRecord[]): CorpusStats {
    const byAxis: Record<"3" | "4" | "5", number> = { "3": 0, "4": 0, "5": 0 };
    const bySource: Record<string, number> = {};
    const byPartType: Record<string, number> = {};
    let withOperations = 0;
    let totalOperations = 0;
    for (const r of records) {
      const axis: AxisCount = deriveAxisCount(r);
      byAxis[String(axis) as "3" | "4" | "5"]++;
      bySource[r.source] = (bySource[r.source] ?? 0) + 1;
      byPartType[r.partType] = (byPartType[r.partType] ?? 0) + 1;
      const opCount = Array.isArray(r.operations) ? r.operations.length : 0;
      if (opCount > 0) withOperations++;
      totalOperations += opCount;
    }
    return { total: records.length, byAxis, bySource, byPartType, withOperations, totalOperations };
  }

  /**
   * Dispatcher entry point.
   * @param action - `corpus_build` | `corpus_stats`.
   * @param params - loose dispatcher params (snake_case).
   */
  calculate(action: string, params: Record<string, unknown> = {}): unknown {
    switch (action) {
      case "corpus_build":
        return this.buildAndPersist(this.normalizeBuildParams(params));
      case "corpus_stats": {
        const corpusPath = (params.corpus_path as string | undefined)
          ?? path.join(DEFAULT_OUT_DIR, DEFAULT_CORPUS_FILE);
        const records = this.load(corpusPath);
        return {
          ok: true,
          corpusPath,
          exists: records.length > 0,
          ...this.computeStats(records),
        };
      }
      default:
        throw new Error(`MillProgramCorpusEngine: unknown action '${action}'`);
    }
  }

  // ── internals ──────────────────────────────────────────────────────────────

  /** Read + filter the jm-die-database files index JSONL into discovery entries. */
  private readIndex(indexPath: string, extensions: string[], machines?: string[]): CorpusFileEntry[] {
    const raw = fs.readFileSync(indexPath, "utf8");
    const out: CorpusFileEntry[] = [];
    for (const line of raw.split("\n")) {
      if (line.trim() === "") continue;
      let row: any;
      try { row = JSON.parse(line); } catch { continue; }
      const ext = typeof row?.ext === "string" ? row.ext.toLowerCase() : "";
      if (!extensions.includes(ext)) continue;
      if (machines) {
        const machine = typeof row?.machine === "string" ? row.machine.toLowerCase() : "";
        if (!machines.includes(machine)) continue;
      }
      if (typeof row?.path !== "string" || row.path === "") continue;
      out.push({
        path: row.path,
        ext,
        customer: row.customer,
        machine: row.machine,
        kind: row.kind,
        size: row.size,
        stem: row.stem,
      });
    }
    return out;
  }

  /**
   * Attach source-file provenance to a parsed record (non-destructive — keeps
   * every field the parser produced, and round-trips cleanly through JSON).
   * Adds `sourceFile` / `sourceCustomer` / `sourceMachine` so retrieval hits and
   * the persisted corpus carry their origin. The record's `partName` already
   * holds the project/stem name (passed to the parser as `projectName`), so it
   * is left untouched here.
   */
  private tagProvenance(record: FeatureSequenceRecord, entry: CorpusFileEntry): FeatureSequenceRecord {
    const tagged = { ...record } as FeatureSequenceRecord & {
      sourceFile?: string;
      sourceCustomer?: string;
      sourceMachine?: string;
    };
    tagged.sourceFile = entry.path;
    if (entry.customer) tagged.sourceCustomer = entry.customer;
    if (entry.machine) tagged.sourceMachine = entry.machine;
    return tagged;
  }

  /** Map snake_case dispatcher params to typed build options. */
  private normalizeBuildParams(p: Record<string, unknown>): BuildCorpusOptions & { outDir?: string } {
    const extensions = Array.isArray(p.extensions)
      ? (p.extensions as unknown[]).filter((e): e is string => typeof e === "string")
      : undefined;
    const machines = Array.isArray(p.machines)
      ? (p.machines as unknown[]).filter((m): m is string => typeof m === "string")
      : undefined;
    return {
      indexPath: typeof p.index_path === "string" ? p.index_path : undefined,
      maxFiles: typeof p.max_files === "number" ? p.max_files : undefined,
      minConfidence: typeof p.min_confidence === "number" ? p.min_confidence : undefined,
      extensions,
      machines,
      requireOperations: typeof p.require_operations === "boolean" ? p.require_operations : undefined,
      outDir: typeof p.out_dir === "string" ? p.out_dir : undefined,
    };
  }

  /** Construct an empty (failed) build result with a reason. */
  private emptyBuild(reason: string): BuildCorpusResult {
    return {
      ok: false,
      records: [],
      stats: {
        total: 0, byAxis: { "3": 0, "4": 0, "5": 0 }, bySource: {}, byPartType: {},
        withOperations: 0, totalOperations: 0,
        filesDiscovered: 0, filesParsed: 0, filesFailed: 0,
        filesSkippedLowConfidence: 0, filesSkippedNoOperations: 0,
      },
      failures: [],
      warnings: [],
      reason,
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Monotonic counter giving every tmp file a unique name within this process. */
let _tmpSeq = 0;

/**
 * Atomic file write: write to a uniquely-named sibling `.tmp` then rename over
 * the target. The tmp name carries pid + time + a per-process sequence so two
 * concurrent persist() calls in the same process never write the same tmp and
 * tear each other's bytes (rename stays intra-filesystem → atomic).
 */
function writeFileAtomic(filePath: string, content: string): void {
  const tmp = `${filePath}.tmp-${process.pid}.${Date.now().toString(36)}.${(_tmpSeq++).toString(36)}`;
  fs.writeFileSync(tmp, content, "utf8");
  fs.renameSync(tmp, filePath);
}

/** Singleton export (matches surrounding engine convention). */
export const millProgramCorpusEngine = new MillProgramCorpusEngine();
