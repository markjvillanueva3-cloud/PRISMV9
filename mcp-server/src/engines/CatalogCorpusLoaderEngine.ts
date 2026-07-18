/**
 * CatalogCorpusLoaderEngine — the keystone that feeds the full vendor catalog
 * corpus into the runtime tool catalog.
 *
 * THE PROBLEM IT SOLVES (verified 2026-06-08, slot:romeo):
 *   - `mcp-server/data/CATALOG_INDEX.json` aggregates 67,178 tool entries across
 *     48 per-vendor files (~23 manufacturers). That index is read ONLY by
 *     VendorCatalogManifestEngine, which is a gap-analysis/manifest engine — it
 *     never produces tool records.
 *   - Every app exporter (Fusion / Mastercam / hyperMILL / Inventor HSM) and the
 *     SFC resolve tools through `toolCatalogEngine.search()`, which filters
 *     `ToolCatalogEngine`'s in-memory `Map`. That Map is seeded ONLY by the engine's
 *     ~30 hardcoded `_loadStandardTools()` getters. The ~20 `*-extracted.json`
 *     vendor files on disk (accupro, camfix, flash, korloy, ma-ford, rapidkut,
 *     yg1, …) are NEVER loaded — present but dormant.
 *   - `ToolCatalogEngine.addTools(CatalogTool[])` is an open, unused ingestion door.
 *
 * THE FIX:
 *   This engine iterates `CATALOG_INDEX.catalogs` (the canonical 48-file manifest),
 *   reads each vendor file via the same lazy `catalogLoader` the rest of the engine
 *   uses, normalizes every flat extracted record into the canonical `CatalogTool`
 *   shape, and feeds the result through `toolCatalogEngine.addTools()`. ONE call
 *   lights up Fusion + Mastercam + hyperMILL + Inventor HSM + SFC simultaneously —
 *   they all already consume `.search()`, so no adapter changes are needed.
 *
 * DESIGN:
 *   - Pure, deterministic normalizer (no network, no model). Per R5: deterministic
 *     transform belongs in code, not a model.
 *   - Fail-loud per file (R12): a vendor file that cannot be read/parsed is recorded
 *     as a hard `error` in the result — never silently dropped. Individual records
 *     with missing OPTIONAL geometry are tolerated (defaulted), but a record with no
 *     usable identity (no designation AND no diameter) is counted as `skipped` and
 *     surfaced, not hidden.
 *   - Idempotent: dedup-by-id is handled downstream by `addTools()`; re-running
 *     `load()` re-reads from the (cached) loader and re-feeds — duplicates report.
 *
 * Wiring: `prism_calc:tool_catalog_load_corpus` + `tool_catalog_corpus_stats`
 *         (lives alongside the existing `tool_catalog_*` family in calcDispatcher).
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  toolCatalogEngine,
  type CatalogTool,
  type ToolPhysicalDimensions,
} from "./ToolCatalogEngine.js";

// Module dir from import.meta.url (ESM-native, matches 62 sibling engines). The build
// target is ESM (esbuild format:"esm"); production relies on an esbuild banner to shim
// bare `__dirname`, but that banner is absent under tsx/ts-node, which left this engine's
// path resolution crashing there (ReferenceError). Deriving `__dir` here makes resolution
// module-system-agnostic. Named `__dir` (NOT `__dirname`) to avoid redeclaring the banner.
const __dir = dirname(fileURLToPath(import.meta.url));

// ── The canonical manifest shape (mcp-server/data/CATALOG_INDEX.json) ──────────
interface CatalogIndexEntry {
  file: string;
  manufacturer: string;
  type: string; // "tools" | "holders" | "inserts" | …
  entries: number;
}
interface CatalogIndex {
  generated: string;
  totalFiles: number;
  totalEntries: number;
  byManufacturer: Record<string, { files: number; entries: number }>;
  catalogs: CatalogIndexEntry[];
}

// ── The flat extracted-record shape found across the *-extracted.json files ────
// (fields verified by reading accupro / korloy / iscar / ma-ford extracted JSON)
interface RawCatalogRecord {
  designation?: string;
  name?: string;
  manufacturer?: string;
  type?: string;
  subtype?: string;
  material?: string;
  coating?: string;
  cutting_diameter_mm?: number;
  diameter_mm?: number;
  shank_diameter_mm?: number;
  flute_length_mm?: number;
  overall_length_mm?: number;
  projection_length_mm?: number;
  neck_length_mm?: number;
  corner_radius_mm?: number;
  nose_radius_mm?: number;
  point_angle_deg?: number;
  flute_count?: number;
  flutes?: number;
  helix_angle_deg?: number;
  iso_groups?: string[];
  insert_designation?: string;
  order_no?: string;
  series?: string;
  price?: number;
  price_usd?: number;
}

export interface CatalogLoadFileResult {
  file: string;
  manufacturer: string;
  declaredEntries: number;
  read: number;
  normalized: number;
  skipped: number;
  error?: string;
}

export interface CatalogLoadResult {
  ok: boolean;
  filesProcessed: number;
  filesFailed: number;
  toolsNormalized: number;
  added: number;
  duplicates: number;
  skipped: number;
  declaredTotal: number;
  /** `*-extracted.json` files intentionally NOT loaded because a richer `.ts`-getter cache
   *  already holds identical data (REDUNDANT_EXTRACTED). Surfaced so consumers/tests see WHY
   *  totalRead < declaredTotal: totalRead + excludedRedundantDeclared === declaredTotal. */
  excludedRedundant: string[];
  excludedRedundantDeclared: number;
  perFile: CatalogLoadFileResult[];
  /** Per-manufacturer reconciliation vs CATALOG_INDEX.byManufacturer */
  reconciliation: Array<{ manufacturer: string; declared: number; normalized: number; delta: number }>;
  errors: string[];
}

// ── CatalogTool.type union (kept in sync with ToolCatalogEngine) ───────────────
const VALID_TYPES = new Set<CatalogTool["type"]>([
  "end_mill", "ball_mill", "bull_mill", "face_mill", "drill", "tap", "reamer",
  "boring_bar", "insert", "turning_tool", "threading_tool", "grooving_tool",
  "chamfer_mill", "slot_drill",
]);

const VALID_MATERIALS = new Set<CatalogTool["material"]>([
  "carbide", "hss", "hss_cobalt", "cermet", "ceramic", "cbn", "pcd", "indexable",
]);

export class CatalogCorpusLoaderEngine {
  private readonly INDEX_FILE = "CATALOG_INDEX.json";

  /**
   * `*-extracted.json` vendor files that are 100%-REDUNDANT with a `.ts`-getter cache already
   * loaded into ToolCatalogEngine via `_loadStandardTools()`. Loading them through the corpus
   * DOUBLE-COUNTS the same physical tools. Total skipped: 42,187 duplicate rows.
   *
   * Detection + verification (`scripts/analyze-corpus-redundancy.mjs`, slot:romeo 2026-06-12):
   * each file's part-number keys are 100% present in the union of the 13 loaded cache files AND
   * the matched twins share the same cutting diameter (geometry cross-check rejects part-number
   * string COLLISIONS across vendors -- e.g. a partial file like tungaloy-turning-extracted is
   * correctly NOT excluded). A field-richness sample confirmed the cache copy is EQUAL-OR-RICHER
   * (it adds shank/manufacturer + the getters compute per-ISO `cutting_data`), so the getter wins
   * and the extracted twin is skipped here -- no data loss. Partial-overlap files (unique tools
   * not in any cache) are intentionally KEPT.
   *
   * Group 1 (17,389): osg/guhring/sandvik dedicated caches. Group 2 (24,798): additional-tools /
   * indexable-tools / kennametal-turning / ampc caches re-extracted as standalone corpus files.
   */
  private static readonly REDUNDANT_EXTRACTED = new Set<string>([
    // Group 1 -- dedicated *-tools.json caches (17,389)
    "osg-tools-extracted.json",
    "guhring-tools-extracted.json",
    "sandvik-tools-extracted.json",
    // Group 2 -- twins of additional-tools / indexable / kennametal-turning / ampc caches (24,798)
    "yg1-tools-extracted.json",
    "iscar-tools-extracted.json",
    "accupro-tools-extracted.json",
    "flash-tools-extracted.json",
    "kennametal-turning-extracted.json",
    "korloy-rotating-extracted.json",
    "kennametal-holemaking-extracted.json",
    "camfix-tools-extracted.json",
    "iscar-turning-extracted.json",
    "ampc-tools-extracted.json",
    "rapidkut-tools-extracted.json",
    "korloy-turning-extracted.json",
    "ma-ford-tools-extracted.json",
    "korloy-tools-extracted.json",
    "kennametal-milling-extracted.json",
    "kennametal-threading-extracted.json",
    "unknown_solid-tools-extracted.json",
  ]);

  /**
   * Resolve CATALOG_INDEX.json. Unlike the 48 vendor files (which live in src/data →
   * dist/data and are read via catalogLoader), the manifest lives ONLY in the project
   * data dir `mcp-server/data/`. Compiled engine is at dist/engines/, so `../../data`
   * resolves to mcp-server/data/. Drive-letter-independent (no hardcoded H:/ — the
   * 2026-06-08 drive swap proved absolute paths rot). Mirrors the pattern in
   * EDMQualityOrchestratorEngine / Fusion360CADFunctionIndexEngine.
   */
  private resolveIndexPath(): string {
    const candidates = [
      resolve(__dir, "..", "..", "data", this.INDEX_FILE), // dist/engines → mcp-server/data
      resolve(__dir, "..", "data", this.INDEX_FILE),       // alt layout fallback
      resolve(process.cwd(), "mcp-server", "data", this.INDEX_FILE),
      resolve(process.cwd(), "data", this.INDEX_FILE),
    ];
    for (const c of candidates) if (existsSync(c)) return c;
    return candidates[0]; // fail-loud in readIndex() with the canonical path in the message
  }

  /**
   * Resolve a vendor catalog file (the 48 *-extracted.json). These ship ONLY in the
   * source tree `mcp-server/src/data/` — esbuild/tsc do NOT copy raw JSON to dist
   * (verified 2026-06-08: only TS-derived catalogs reach dist/data via
   * build-catalog-json.mjs). So read from src/data directly, with dist/data + project
   * data fallbacks. Returns null when the file is found nowhere (caller fails loud).
   */
  private resolveVendorFile(file: string): string | null {
    const candidates = [
      resolve(__dir, "..", "..", "src", "data", file), // dist/engines → mcp-server/src/data
      resolve(__dir, "..", "data", file),               // ts-run: src/engines → src/data
      resolve(__dir, "data", file),                     // dist bundle co-located
      resolve(__dir, "..", "..", "data", file),         // project data dir
      resolve(process.cwd(), "mcp-server", "src", "data", file),
      resolve(process.cwd(), "mcp-server", "data", file),
    ];
    for (const c of candidates) if (existsSync(c)) return c;
    return null;
  }

  private readonly fileCache = new Map<string, RawCatalogRecord[]>();

  /** Read + parse one vendor file into a flat record array. Throws (fail-loud) on
   *  not-found or parse error — the caller records it as a per-file hard error. */
  private readVendorFile(file: string): RawCatalogRecord[] {
    const cached = this.fileCache.get(file);
    if (cached) return cached;
    const path = this.resolveVendorFile(file);
    if (!path) {
      throw new Error(`vendor file not found in any data dir (src/data, dist/data, data): ${file}`);
    }
    const data = JSON.parse(readFileSync(path, "utf8")) as unknown;
    let rows: RawCatalogRecord[];
    if (Array.isArray(data)) {
      rows = data as RawCatalogRecord[];
    } else if (data && typeof data === "object") {
      // Multi-export bundle { EXPORT: [...] }. MERGE every array prop whose elements are catalog
      // RECORDS (carry a `designation` or `part_number`) -- a multi-section catalog (e.g.
      // turning_inserts + threading_inserts + grooving_inserts, or a holders section) previously
      // loaded ONLY its FIRST array, silently dropping the rest. The record test EXCLUDES non-record
      // arrays (speed_feed_data, cutting_conditions, summary rows) so they never pollute the corpus.
      // Back-compat: if NO array qualifies as records, fall back to the legacy first-non-empty-array
      // behavior so any single-array file whose records lack those keys is unchanged.
      const arrays = Object.values(data as Record<string, unknown>).filter(
        (v): v is unknown[] => Array.isArray(v),
      );
      const recordArrays = arrays.filter(
        (a) => a.length > 0 && a.every(
          (r) => r != null && typeof r === "object" &&
            ("designation" in (r as object) || "part_number" in (r as object)),
        ),
      );
      rows = (recordArrays.length > 0
        ? recordArrays.flat()
        : (arrays.find((a) => a.length > 0) ?? [])) as RawCatalogRecord[];
    } else {
      rows = [];
    }
    this.fileCache.set(file, rows);
    return rows;
  }

  /** Read the canonical manifest. Throws (fail-loud) if it is missing/corrupt — the
   *  whole corpus is unreachable without it, so this is a hard error, not a skip. */
  private readIndex(): CatalogIndex {
    const indexPath = this.resolveIndexPath();
    let idx: CatalogIndex;
    try {
      idx = JSON.parse(readFileSync(indexPath, "utf8")) as CatalogIndex;
    } catch (e) {
      throw new Error(
        `CatalogCorpusLoaderEngine: cannot read ${indexPath} — ${(e as Error).message}. ` +
        `The corpus cannot be loaded without the manifest.`,
      );
    }
    if (!idx || !Array.isArray(idx.catalogs) || idx.catalogs.length === 0) {
      throw new Error(
        `CatalogCorpusLoaderEngine: ${indexPath} has no 'catalogs' array — manifest is malformed.`,
      );
    }
    return idx;
  }

  /** Map a vendor 'type' string onto the CatalogTool type union (best-effort, deterministic). */
  private normalizeType(raw: string | undefined, hasInsertDesignation: boolean): CatalogTool["type"] {
    const t = (raw ?? "").toLowerCase().trim().replace(/[\s-]+/g, "_");
    if (VALID_TYPES.has(t as CatalogTool["type"])) return t as CatalogTool["type"];
    // common synonyms
    if (t.includes("ball")) return "ball_mill";
    if (t.includes("bull") || t.includes("torus")) return "bull_mill";
    if (t.includes("face")) return "face_mill";
    if (t.includes("chamfer")) return "chamfer_mill";
    if (t.includes("slot")) return "slot_drill";
    if (t.includes("endmill") || t === "mill" || t.includes("end_mill")) return "end_mill";
    if (t.includes("drill")) return "drill";
    if (t.includes("tap")) return "tap";
    if (t.includes("ream")) return "reamer";
    if (t.includes("bor")) return "boring_bar";
    if (t.includes("groov")) return "grooving_tool";
    if (t.includes("thread")) return "threading_tool";
    if (t.includes("turn")) return "turning_tool";
    if (t.includes("insert") || hasInsertDesignation) return "insert";
    // honest default: most extracted milling/drilling records are solid end mills.
    return "end_mill";
  }

  /** Deterministic material inference. */
  private normalizeMaterial(raw: string | undefined, subtype: string | undefined): CatalogTool["material"] {
    const m = (raw ?? "").toLowerCase().trim();
    if (VALID_MATERIALS.has(m as CatalogTool["material"])) return m as CatalogTool["material"];
    if (m.includes("hss") && m.includes("cob")) return "hss_cobalt";
    if (m.includes("hss") || m.includes("high speed")) return "hss";
    if (m.includes("cermet")) return "cermet";
    if (m.includes("ceram")) return "ceramic";
    if (m.includes("cbn")) return "cbn";
    if (m.includes("pcd") || m.includes("diamond")) return "pcd";
    if ((subtype ?? "").toLowerCase().includes("indexable")) return "indexable";
    // default: carbide (dominant for modern extracted catalogs).
    return "carbide";
  }

  /** Default operations by type so downstream `recommend()`/search-by-operation works. */
  private defaultOperations(type: CatalogTool["type"]): string[] {
    switch (type) {
      case "drill": return ["drill", "spot_drill"];
      case "tap": return ["tap", "thread"];
      case "reamer": return ["ream"];
      case "boring_bar": return ["bore"];
      case "face_mill": return ["face"];
      case "ball_mill": return ["3d_contour", "finish"];
      case "bull_mill": return ["pocket", "finish"];
      case "chamfer_mill": return ["chamfer", "deburr"];
      case "slot_drill": return ["slot", "pocket"];
      case "insert":
      case "turning_tool": return ["turn", "face_turn"];
      case "threading_tool": return ["thread_turn"];
      case "grooving_tool": return ["groove", "part_off"];
      default: return ["pocket", "profile", "slot"];
    }
  }

  /**
   * Normalize ONE raw extracted record into a CatalogTool.
   * Returns null when the record has no usable identity (caller counts it as skipped).
   */
  private normalizeRecord(
    raw: RawCatalogRecord,
    mfr: string,
    sourceFile: string,
    seq: number,
  ): CatalogTool | null {
    const designation = (raw.designation ?? raw.name ?? raw.order_no ?? "").toString().trim();
    const dia = raw.cutting_diameter_mm ?? raw.diameter_mm;
    // No identity AND no geometry → unusable; surface as skip, do not fabricate.
    if (!designation && (dia == null || !Number.isFinite(dia))) return null;

    const manufacturer = (raw.manufacturer ?? mfr ?? "Unknown").toString();
    const hasInsertDes = !!raw.insert_designation;
    const type = this.normalizeType(raw.type, hasInsertDes);
    const material = this.normalizeMaterial(raw.material, raw.subtype);

    const cuttingDia = Number.isFinite(dia as number) ? (dia as number) : 0;
    const shankDia = Number.isFinite(raw.shank_diameter_mm as number)
      ? (raw.shank_diameter_mm as number)
      : cuttingDia;
    const oal = Number.isFinite(raw.overall_length_mm as number)
      ? (raw.overall_length_mm as number)
      : 0;
    const loc = Number.isFinite(raw.flute_length_mm as number)
      ? (raw.flute_length_mm as number)
      : 0;

    const physical: ToolPhysicalDimensions = {
      cutting_diameter_mm: cuttingDia,
      shank_diameter_mm: shankDia,
      overall_length_mm: oal,
      flute_length_mm: loc,
      ...(Number.isFinite(raw.neck_length_mm as number) ? { neck_length_mm: raw.neck_length_mm } : {}),
      ...(Number.isFinite(raw.corner_radius_mm as number) ? { corner_radius_mm: raw.corner_radius_mm } : {}),
      ...(Number.isFinite(raw.nose_radius_mm as number) ? { nose_radius_mm: raw.nose_radius_mm } : {}),
      ...(Number.isFinite(raw.point_angle_deg as number) ? { point_angle_deg: raw.point_angle_deg } : {}),
    };

    // Stable, collision-resistant id: mfr + designation, or mfr + file + seq when no designation.
    const idBase = designation || `${sourceFile}#${seq}`;
    const id = `corpus:${manufacturer}:${idBase}`.replace(/\s+/g, "_");

    const flutes = raw.flute_count ?? raw.flutes;

    const tool: CatalogTool = {
      id,
      manufacturer,
      series: (raw.series ?? designation.split(/[\s-]/)[0] ?? manufacturer).toString(),
      designation: designation || idBase,
      type,
      ...(raw.subtype ? { subtype: raw.subtype } : {}),
      material,
      ...(raw.coating ? { coating: raw.coating } : {}),
      physical,
      ...(Number.isFinite(flutes as number) ? { flute_count: flutes as number } : {}),
      ...(Number.isFinite(raw.helix_angle_deg as number) ? { helix_angle_deg: raw.helix_angle_deg } : {}),
      iso_groups: Array.isArray(raw.iso_groups) && raw.iso_groups.length
        ? raw.iso_groups
        : ["P", "M", "K", "N", "S", "H"], // unknown suitability → catalog-wide (search can still narrow by geometry)
      operations: this.defaultOperations(type),
      source: `corpus:${sourceFile}`,
      ...(Number.isFinite(raw.price_usd ?? raw.price as number)
        ? { price_usd: (raw.price_usd ?? raw.price) as number }
        : {}),
    };
    return tool;
  }

  /**
   * Load the full catalog corpus and feed it into ToolCatalogEngine.
   * @param opts.dryRun  normalize + report but do NOT call addTools (for stats/validation)
   * @param opts.onlyManufacturer  restrict to one manufacturer (testing / incremental)
   */
  load(opts: { dryRun?: boolean; onlyManufacturer?: string } = {}): CatalogLoadResult {
    const idx = this.readIndex();
    const perFile: CatalogLoadFileResult[] = [];
    const errors: string[] = [];
    const normalizedByMfr = new Map<string, number>();
    let allTools: CatalogTool[] = [];
    let skippedTotal = 0;

    const candidateCatalogs = opts.onlyManufacturer
      ? idx.catalogs.filter(c => c.manufacturer === opts.onlyManufacturer)
      : idx.catalogs;
    // Drop the proven 100%-redundant extracted twins (see REDUNDANT_EXTRACTED) so the same
    // physical tools are not double-counted against their richer .ts-getter cache copies.
    const isRedundant = (f: string) => CatalogCorpusLoaderEngine.REDUNDANT_EXTRACTED.has(f);
    const excludedCatalogs = candidateCatalogs.filter(c => isRedundant(c.file));
    const catalogs = candidateCatalogs.filter(c => !isRedundant(c.file));

    for (const entry of catalogs) {
      const fr: CatalogLoadFileResult = {
        file: entry.file,
        manufacturer: entry.manufacturer,
        declaredEntries: entry.entries ?? 0,
        read: 0,
        normalized: 0,
        skipped: 0,
      };
      let rows: RawCatalogRecord[];
      try {
        rows = this.readVendorFile(entry.file);
      } catch (e) {
        // FAIL-LOUD: a file that cannot be read is a hard, surfaced error — never silent.
        fr.error = (e as Error).message;
        errors.push(`${entry.file}: ${fr.error}`);
        perFile.push(fr);
        continue;
      }

      fr.read = rows.length;
      for (let i = 0; i < rows.length; i++) {
        const t = this.normalizeRecord(rows[i], entry.manufacturer, entry.file, i);
        if (t) {
          allTools.push(t);
          fr.normalized++;
        } else {
          fr.skipped++;
        }
      }
      skippedTotal += fr.skipped;
      normalizedByMfr.set(entry.manufacturer, (normalizedByMfr.get(entry.manufacturer) ?? 0) + fr.normalized);
      perFile.push(fr);
    }

    // Feed the runtime catalog (unless dry-run).
    let added = 0, duplicates = 0;
    if (!opts.dryRun && allTools.length > 0) {
      const res = toolCatalogEngine.addTools(allTools);
      added = res.added;
      duplicates = res.duplicates;
    }

    // Per-manufacturer reconciliation vs the manifest's declared counts.
    const reconciliation = [...normalizedByMfr.entries()].map(([manufacturer, normalized]) => {
      const declared = idx.byManufacturer?.[manufacturer]?.entries ?? 0;
      return { manufacturer, declared, normalized, delta: normalized - declared };
    }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    const filesFailed = perFile.filter(f => f.error).length;
    return {
      ok: filesFailed === 0,
      filesProcessed: perFile.length - filesFailed,
      filesFailed,
      toolsNormalized: allTools.length,
      added,
      duplicates,
      skipped: skippedTotal,
      declaredTotal: idx.totalEntries ?? 0,
      excludedRedundant: excludedCatalogs.map(c => c.file),
      excludedRedundantDeclared: excludedCatalogs.reduce((a, c) => a + (c.entries ?? 0), 0),
      perFile,
      reconciliation,
      errors,
    };
  }

  /** Lightweight corpus stats from the manifest WITHOUT loading every record. */
  corpusStats(): {
    declaredFiles: number;
    declaredEntries: number;
    manufacturers: number;
    runtimeLoaded: number;
    byManufacturer: Record<string, { files: number; entries: number }>;
  } {
    const idx = this.readIndex();
    // ToolCatalogEngine.stats() returns `total_tools` (NOT `total`) — reading the
    // wrong field silently hard-wired runtimeLoaded to 0 even after a full corpus
    // load (caught by 3-of-3 scrutiny 2026-06-08; was `rt.total ?? 0`).
    const rt = toolCatalogEngine.stats() as { total_tools?: number };
    return {
      declaredFiles: idx.totalFiles ?? idx.catalogs.length,
      declaredEntries: idx.totalEntries ?? 0,
      manufacturers: Object.keys(idx.byManufacturer ?? {}).length,
      runtimeLoaded: rt.total_tools ?? 0,
      byManufacturer: idx.byManufacturer ?? {},
    };
  }

  private _ensured = false;

  /**
   * Idempotent lazy-load: feed the full corpus into ToolCatalogEngine exactly once
   * per process. Cheap to call repeatedly — the `_ensured` flag short-circuits after
   * the first successful feed. This is the integration point every app exporter
   * (Fusion / Mastercam / hyperMILL / Inventor) + SFC calls BEFORE
   * `toolCatalogEngine.search()`, so exports always see the full deduped corpus
   * (~143K unified tools; ~49.8K from this corpus path after the REDUNDANT_EXTRACTED
   * skip) without an operator first invoking `tool_catalog_load_corpus`. Fail-soft: if the corpus
   * cannot be read (missing manifest), the export still proceeds on the ~30 standard
   * vendors rather than throwing — the exporters must not hard-fail on a stats issue.
   * @returns the load result on first call, or a cached no-op summary thereafter.
   */
  ensureLoaded(): { ensured: boolean; alreadyLoaded: boolean; added: number; toolsNormalized: number } {
    if (this._ensured) {
      return { ensured: true, alreadyLoaded: true, added: 0, toolsNormalized: 0 };
    }
    try {
      const res = this.load();
      this._ensured = res.ok || res.filesProcessed > 0; // mark ensured if anything loaded
      return { ensured: this._ensured, alreadyLoaded: false, added: res.added, toolsNormalized: res.toolsNormalized };
    } catch {
      // Fail-soft: a corpus-load failure must not break an export. Leave _ensured false
      // so a later call can retry once the manifest is available again.
      return { ensured: false, alreadyLoaded: false, added: 0, toolsNormalized: 0 };
    }
  }

  /** Reset the ensure-once flag (testing / forced reload after corpus regeneration). */
  resetEnsured(): void {
    this._ensured = false;
  }
}

export const catalogCorpusLoaderEngine = new CatalogCorpusLoaderEngine();
