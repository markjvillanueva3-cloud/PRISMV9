/**
 * UniversalCADIndexEngine — U-CADC01 (CAD-COMPLETE-MS0)
 *
 * Universal CAD file indexer covering every format present across H:/prism.
 * Per R13-RE-06 archaeology, this engine is a thin facade over the existing
 * CADFileIndexerEngine — it does NOT reimplement scanning, hashing, or diffing.
 * Instead it:
 *   1. Expands the default root-path set beyond JM Die folders to cover the
 *      full H:/prism CAD corpus.
 *   2. Produces a per-format coverage report asserting every target extension
 *      (IPT, IAM, SLDPRT, SLDASM, STEP, STP, IGES, IGS, DWG, DXF, STL, F3D,
 *      3DM, X_T, SAT) is represented in the scan.
 *   3. Returns an AtomicValue-style result for programmatic consumption.
 *
 * Design:
 *   - Composition, not inheritance — delegates to cadFileIndexerEngine.
 *   - Injectable FS passes through to the underlying indexer (test-safe).
 *   - Coverage report exposed as IndexCoverage structure with per-format
 *     counts + missing-format list. Closes R13-TE-02 per-extension gap.
 *
 * @module engines/UniversalCADIndexEngine
 */

import * as nodePath from "path";
import { CADFileIndexerEngine, type IndexerFS } from "./CADFileIndexerEngine.js";
import {
  CAD_FORMATS,
  type CADFormat,
  type CADFileEntry,
  type MasterIndex,
  type IndexOptions,
} from "../schemas/cadFileIndexSchema.js";

/**
 * Target CAD formats that U-CADC01 must cover. Subset of CAD_FORMATS that
 * represent the minimum universal coverage surface (15 formats listed in the
 * milestone envelope deliverable, expanded by R13-TE-02 to the full set).
 */
export const TARGET_CAD_FORMATS: readonly CADFormat[] = [
  ".ipt",
  ".iam",
  ".sldprt",
  ".sldasm",
  ".step",
  ".stp",
  ".iges",
  ".igs",
  ".dwg",
  ".dxf",
  ".stl",
  ".f3d",
  ".3dm",
  ".x_t",
  ".sat",
] as const;

/** Default universal root paths — superset of CADFileIndexerEngine defaults. */
export const UNIVERSAL_ROOT_PATHS: readonly string[] = [
  "H:\\PRISM\\JM DIE\\CNC LATHE",
  "H:\\PRISM\\JM DIE\\CNC MILL HAAS",
  "H:\\PRISM\\JM DIE\\CNC MILL",
  "H:\\PRISM\\JM DIE\\WIRE EDM",
  "H:\\PRISM\\JM DIE\\SINKER EDM",
  "H:\\PRISM\\JM DIE\\HURCO",
  "H:\\PRISM\\JM DIE\\HYPERMILL",
  "H:\\prism\\corpus",
  "H:\\prism\\data\\cad-samples",
];

/**
 * Per-format coverage summary. Addresses R13-TE-02: "Regen ladder has no
 * per-file-extension pass gate." Consumers can assert every target format
 * has at least one representative in the index.
 */
export interface IndexCoverage {
  targetFormats: readonly CADFormat[];
  formatCounts: Record<string, number>;
  coveredFormats: CADFormat[];
  missingFormats: CADFormat[];
  coveragePct: number;
}

/**
 * AtomicValue-style result structure for the universal scan.
 */
export interface UniversalIndexResult {
  index: MasterIndex;
  coverage: IndexCoverage;
  source: "UniversalCADIndexEngine";
}

/**
 * UniversalCADIndexEngine — facade over CADFileIndexerEngine.
 *
 * All scanning/hashing/diffing delegates to the underlying indexer. This
 * class contributes universal path defaults and coverage reporting only.
 */
export class UniversalCADIndexEngine {
  private readonly indexer: CADFileIndexerEngine;

  constructor(indexer: CADFileIndexerEngine = new CADFileIndexerEngine()) {
    this.indexer = indexer;
  }

  /** Expose the underlying indexer for event wiring. */
  get events() {
    return this.indexer.events;
  }

  /**
   * Run the universal index. Delegates to CADFileIndexerEngine.index() with
   * expanded root paths, then computes per-format coverage.
   *
   * @param opts - Standard IndexOptions; rootPaths defaults to UNIVERSAL_ROOT_PATHS
   * @param fsImpl - Injectable FS (defaults to real fs via indexer)
   * @returns UniversalIndexResult with index + coverage report
   */
  async index(
    opts: IndexOptions = {},
    fsImpl?: IndexerFS,
  ): Promise<UniversalIndexResult> {
    const rootPaths = opts.rootPaths ?? [...UNIVERSAL_ROOT_PATHS];
    const universalOpts: IndexOptions = { ...opts, rootPaths };

    const index = await this.indexer.index(universalOpts, fsImpl);
    const coverage = this.computeCoverage(index);

    return {
      index,
      coverage,
      source: "UniversalCADIndexEngine",
    };
  }

  /**
   * Compute per-format coverage against TARGET_CAD_FORMATS.
   *
   * @param index - A MasterIndex (from index() or load())
   * @returns IndexCoverage with counts, covered set, missing set
   */
  computeCoverage(index: MasterIndex): IndexCoverage {
    const formatCounts: Record<string, number> = {};
    for (const fmt of TARGET_CAD_FORMATS) {
      formatCounts[fmt] = index.byFormat[fmt] ?? 0;
    }

    const coveredFormats: CADFormat[] = [];
    const missingFormats: CADFormat[] = [];
    for (const fmt of TARGET_CAD_FORMATS) {
      if ((index.byFormat[fmt] ?? 0) > 0) {
        coveredFormats.push(fmt);
      } else {
        missingFormats.push(fmt);
      }
    }

    const coveragePct =
      TARGET_CAD_FORMATS.length === 0
        ? 1
        : coveredFormats.length / TARGET_CAD_FORMATS.length;

    return {
      targetFormats: TARGET_CAD_FORMATS,
      formatCounts,
      coveredFormats,
      missingFormats,
      coveragePct,
    };
  }

  /**
   * Load an existing master index without re-scanning.
   *
   * @param outputPath - Path to master-index.json
   * @param fsImpl - Injectable FS
   * @returns MasterIndex or null if not present / invalid
   */
  load(outputPath?: string, fsImpl?: IndexerFS): MasterIndex | null {
    return this.indexer.load(outputPath, fsImpl);
  }

  /**
   * Validate coverage meets the universal threshold.
   *
   * @param index - A MasterIndex
   * @param minCoveragePct - Minimum fraction of TARGET_CAD_FORMATS required (default 1.0)
   * @returns true if coverage >= threshold
   */
  hasUniversalCoverage(index: MasterIndex, minCoveragePct: number = 1.0): boolean {
    const cov = this.computeCoverage(index);
    return cov.coveragePct >= minCoveragePct;
  }

  // ── Registry query surface (prism_cad cad_registry_* actions) ────────────────
  // The dispatcher's cad_registry_scan/search/get/stats actions called these
  // methods, but they were never implemented (dark capability). scan is a thin
  // alias over index(); get/search/stats query the PERSISTED MasterIndex via
  // load() so they work without a re-scan. All fail soft when no index exists.

  /**
   * Scan + persist the universal index. Positional alias over index() for the
   * cad_registry_scan action: scan(rootPaths, options).
   * @param rootPaths - optional root paths (defaults to UNIVERSAL_ROOT_PATHS)
   * @param options - remaining IndexOptions
   * @param fsImpl - injectable FS
   */
  async scan(
    rootPaths?: string[],
    options: Omit<IndexOptions, "rootPaths"> = {},
    fsImpl?: IndexerFS,
  ): Promise<UniversalIndexResult> {
    const opts: IndexOptions = { ...options };
    if (rootPaths && rootPaths.length) opts.rootPaths = rootPaths;
    return this.index(opts, fsImpl);
  }

  /**
   * Look up a single indexed file by its absolute path. Loads the persisted
   * master index; returns null if no index exists or the path is not indexed.
   * Matching is EXACT against the stored `absolutePath` key (case- and
   * separator-sensitive) -- callers must pass the path in its indexed form.
   * @param absolutePath - the file's absolute path (the entry key)
   * @param fsImpl - injectable FS
   */
  get(absolutePath: string, fsImpl?: IndexerFS): CADFileEntry | null {
    if (!absolutePath) return null;
    const index = this.load(undefined, fsImpl);
    if (!index) return null;
    return index.files.find((f) => f.absolutePath === absolutePath) ?? null;
  }

  /**
   * Search the persisted index by free-text path query + optional format and
   * customer filters. `total` is the full match count; `results` is capped at
   * `limit` (default 50). Fail-soft to an empty result when no index exists.
   * @param criteria - { query?, format?, customer?, limit? }
   * @param fsImpl - injectable FS
   */
  search(
    criteria: { query?: string; format?: string; customer?: string; limit?: number } = {},
    fsImpl?: IndexerFS,
  ): { results: CADFileEntry[]; total: number } {
    const index = this.load(undefined, fsImpl);
    if (!index) return { results: [], total: 0 };
    const q = (criteria.query ?? "").toLowerCase();
    const fmt = criteria.format;
    const cust = criteria.customer?.toLowerCase();
    const limit = typeof criteria.limit === "number" ? criteria.limit : 50;
    const matched = index.files.filter(
      (f) =>
        (!q || f.absolutePath.toLowerCase().includes(q)) &&
        (!fmt || f.format === fmt) &&
        (!cust || f.customer.toLowerCase() === cust),
    );
    return { results: matched.slice(0, Math.max(0, limit)), total: matched.length };
  }

  /**
   * Summary stats for the persisted index (counts + format coverage). Fail-soft
   * to zeros when no index exists.
   * @param fsImpl - injectable FS
   */
  stats(fsImpl?: IndexerFS): {
    totalFiles: number;
    byFormat: Record<string, number>;
    byCustomer: Record<string, number>;
    byMachineCategory: Record<string, number>;
    coveragePct: number;
  } {
    const index = this.load(undefined, fsImpl);
    if (!index) {
      return { totalFiles: 0, byFormat: {}, byCustomer: {}, byMachineCategory: {}, coveragePct: 0 };
    }
    return {
      totalFiles: index.totalFiles,
      byFormat: index.byFormat,
      byCustomer: index.byCustomer,
      byMachineCategory: index.byMachineCategory,
      coveragePct: this.computeCoverage(index).coveragePct,
    };
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

export const universalCADIndexEngine = new UniversalCADIndexEngine();
