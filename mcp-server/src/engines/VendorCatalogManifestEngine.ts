/**
 * VendorCatalogManifestEngine — Catalog extraction inventory & manifest
 *
 * Scans H:/prism/resources/MANUFACTURER_CATALOGS/uploaded/ to classify each
 * PDF by manufacturer and catalog type, then compares against the current
 * CATALOG_INDEX.json to identify gaps between what's on disk vs. what's been
 * extracted into the tool database.
 *
 * Purpose: primes /pdf-learn and PDFTableExtractionEngine for batch runs,
 * and gives AI agents / dashboards immediate visibility into extraction state.
 *
 * Does NOT perform extraction itself — that's done by the existing
 * PDFTableExtractionEngine / PDFProcessingPipelineEngine. This engine is the
 * planning and bookkeeping layer.
 *
 * Target: raise tool database from 54,080 → 90,000+ by identifying visible
 * unprocessed catalogs (Sandvik GC 2023-2024, Iscar Master Catalog, etc.)
 *
 * @module engines/VendorCatalogManifestEngine
 */

import * as fs from "fs";
import * as path from "path";
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type CatalogType =
  | "milling"
  | "turning"
  | "drilling"
  | "threading"
  | "grooving"
  | "holemaking"
  | "tooling_systems"
  | "rotating"
  | "solid"
  | "indexable"
  | "workholding"
  | "general";

export interface CatalogEntry {
  /** PDF filename */
  filename: string;
  /** Full filesystem path */
  path: string;
  /** Detected manufacturer (may be "unknown") */
  manufacturer: string;
  /** Detected catalog category */
  type: CatalogType;
  /** File size in bytes */
  sizeBytes: number;
  /** File size category (affects extraction priority) */
  sizeCategory: "small" | "medium" | "large" | "huge";
  /** Whether this appears already extracted based on index */
  extracted: boolean;
  /** Target JSON file where extracted tools live */
  targetJson?: string;
  /** Entries currently in the target JSON (if any) */
  currentEntries?: number;
  /** Estimated tool count (heuristic: 50 tools per MB, capped) */
  estimatedTools: number;
}

export interface CatalogManifest {
  generated: string;
  rootPath: string;
  totalPdfs: number;
  totalZipShards: number;
  catalogs: CatalogEntry[];
  byManufacturer: Record<string, { pdfs: number; currentEntries: number; estimatedGap: number }>;
  totalEstimatedTools: number;
  totalCurrentEntries: number;
  gapToTarget: number;
  recommendations: string[];
}

// ============================================================================
// MANUFACTURER CLASSIFICATION
// ============================================================================

/** Filename pattern → manufacturer mapping.
 *  Order matters — first match wins. More specific patterns first. */
const MANUFACTURER_PATTERNS: Array<{ pattern: RegExp; manufacturer: string }> = [
  { pattern: /^GC[_\s]?20\d{2}/i,                       manufacturer: "Sandvik" },
  { pattern: /sandvik/i,                                manufacturer: "Sandvik" },
  { pattern: /coromant/i,                               manufacturer: "Sandvik" },
  { pattern: /master\s+catalog.*vol\.?\s*[12]/i,        manufacturer: "Iscar" },
  { pattern: /iscar/i,                                  manufacturer: "Iscar" },
  { pattern: /(milling|turning|threading)\s+20\d{2}\.\d/i, manufacturer: "Iscar" },
  { pattern: /tooling\s+systems\s+news/i,               manufacturer: "Iscar" },
  { pattern: /kennametal|widia/i,                       manufacturer: "Kennametal" },
  { pattern: /seco/i,                                   manufacturer: "Seco" },
  { pattern: /metalmorphosis/i,                         manufacturer: "Seco" },
  { pattern: /solid\s+end\s+mills/i,                    manufacturer: "Seco" },
  { pattern: /walter/i,                                 manufacturer: "Walter" },
  { pattern: /mitsubishi/i,                             manufacturer: "Mitsubishi" },
  { pattern: /kyocera/i,                                manufacturer: "Kyocera" },
  { pattern: /tungaloy/i,                               manufacturer: "Tungaloy" },
  { pattern: /^OSG/i,                                   manufacturer: "OSG" },
  { pattern: /guhring/i,                                manufacturer: "Guhring" },
  { pattern: /korloy/i,                                 manufacturer: "Korloy" },
  { pattern: /haimer/i,                                 manufacturer: "Haimer" },
  { pattern: /emuge/i,                                  manufacturer: "Emuge" },
  { pattern: /sgs/i,                                    manufacturer: "SGS" },
  { pattern: /ingersoll/i,                              manufacturer: "Ingersoll" },
  { pattern: /niagara/i,                                manufacturer: "Niagara" },
  { pattern: /helical/i,                                manufacturer: "Helical" },
  { pattern: /harvey/i,                                 manufacturer: "Harvey" },
  { pattern: /dormer|pramet/i,                          manufacturer: "Dormer Pramet" },
  { pattern: /horn/i,                                   manufacturer: "Horn" },
  { pattern: /sumitomo/i,                               manufacturer: "Sumitomo" },
  { pattern: /yg1|yg-1/i,                               manufacturer: "YG1" },
  { pattern: /ma[_\s-]?ford/i,                          manufacturer: "MA Ford" },
  { pattern: /accupro/i,                                manufacturer: "Accupro" },
  { pattern: /ampc/i,                                   manufacturer: "AMPC" },
  { pattern: /camfix/i,                                 manufacturer: "Camfix" },
  { pattern: /rego-?fix/i,                              manufacturer: "Rego-Fix" },
  { pattern: /big\s+daishowa/i,                         manufacturer: "Big Daishowa" },
  { pattern: /flash/i,                                  manufacturer: "Flash" },
  { pattern: /rapidkut/i,                               manufacturer: "Rapidkut" },
  { pattern: /global[_\s-]?cnc/i,                       manufacturer: "Global CNC" },
  { pattern: /zenit|zeni/i,                             manufacturer: "Zenit" },
  { pattern: /orange\s+vise/i,                          manufacturer: "Orange Vise" },
];

function detectManufacturer(filename: string): string {
  for (const { pattern, manufacturer } of MANUFACTURER_PATTERNS) {
    if (pattern.test(filename)) return manufacturer;
  }
  return "unknown";
}

function detectCatalogType(filename: string): CatalogType {
  const f = filename.toLowerCase();
  if (/drill/.test(f)) return "drilling";
  if (/thread/.test(f)) return "threading";
  if (/grooving/.test(f)) return "grooving";
  if (/holemaking/.test(f)) return "holemaking";
  if (/mill/.test(f)) return "milling";
  if (/turning|turn/.test(f)) return "turning";
  if (/tooling\s+systems|tooling\.pdf/.test(f)) return "tooling_systems";
  if (/rotating/.test(f)) return "rotating";
  if (/solid/.test(f)) return "solid";
  if (/workholding|fixture|vise|chuck/.test(f)) return "workholding";
  if (/indexable/.test(f)) return "indexable";
  return "general";
}

function categorizeSize(bytes: number): "small" | "medium" | "large" | "huge" {
  const mb = bytes / (1024 * 1024);
  if (mb < 5) return "small";
  if (mb < 30) return "medium";
  if (mb < 100) return "large";
  return "huge";
}

/** Rough heuristic: Sandvik/Iscar PDFs hold ~50-80 tools per MB; derate. */
function estimateToolCount(bytes: number, type: CatalogType, manufacturer: string): number {
  const mb = bytes / (1024 * 1024);
  let base = 60; // tools per MB baseline
  // Larger catalogs are denser in pages but may have lots of descriptive content
  if (mb > 100) base = 40;
  if (mb > 200) base = 30;
  // Big Four vendors have rich tool metadata
  if (["Sandvik", "Iscar", "Kennametal", "Seco"].includes(manufacturer)) base *= 1.2;
  // Workholding catalogs are lower tool density
  if (type === "workholding") base *= 0.3;
  return Math.round(mb * base);
}

function targetJsonFor(manufacturer: string, type: CatalogType): string {
  const mfg = manufacturer.toLowerCase().replace(/\s+/g, "-");
  return `${mfg}-${type}-extracted.json`;
}

// ============================================================================
// ENGINE
// ============================================================================

const DEFAULT_ROOT = "H:/prism/resources/MANUFACTURER_CATALOGS/uploaded";
const DEFAULT_INDEX = "H:/prism/mcp-server/data/CATALOG_INDEX.json";
const DEFAULT_EXTRACT_DIR = "H:/prism/mcp-server/src/data";
const TARGET_TOTAL_TOOLS = 90000;

export class VendorCatalogManifestEngine {
  private readonly rootPath: string;
  private readonly indexPath: string;
  private readonly extractDir: string;

  constructor(opts?: { rootPath?: string; indexPath?: string; extractDir?: string }) {
    this.rootPath = opts?.rootPath ?? DEFAULT_ROOT;
    this.indexPath = opts?.indexPath ?? DEFAULT_INDEX;
    this.extractDir = opts?.extractDir ?? DEFAULT_EXTRACT_DIR;
  }

  /**
   * Build a full extraction manifest: every visible PDF classified +
   * matched against current index + gap-analysis.
   */
  build(): CatalogManifest {
    const rootExists = fs.existsSync(this.rootPath);
    if (!rootExists) {
      log.warn(`[VendorCatalogManifest] Root path not found: ${this.rootPath}`);
      return this.emptyManifest();
    }

    const allFiles = fs.readdirSync(this.rootPath);
    const pdfFiles = allFiles.filter(f => /\.pdf$/i.test(f));
    const zipShards = allFiles.filter(f => /\.zip\.\d+$/.test(f));

    const currentIndex = this.loadCurrentIndex();
    const catalogs: CatalogEntry[] = [];

    for (const filename of pdfFiles) {
      const fullPath = path.join(this.rootPath, filename);
      let sizeBytes = 0;
      try { sizeBytes = fs.statSync(fullPath).size; } catch { /* ignore */ }
      const manufacturer = detectManufacturer(filename);
      const type = detectCatalogType(filename);
      const targetJson = targetJsonFor(manufacturer, type);
      const currentEntries = currentIndex.fileEntries.get(targetJson) ?? 0;

      catalogs.push({
        filename,
        path: fullPath,
        manufacturer,
        type,
        sizeBytes,
        sizeCategory: categorizeSize(sizeBytes),
        extracted: currentEntries > 0,
        targetJson,
        currentEntries,
        estimatedTools: estimateToolCount(sizeBytes, type, manufacturer),
      });
    }

    const byManufacturer: Record<string, { pdfs: number; currentEntries: number; estimatedGap: number }> = {};
    for (const c of catalogs) {
      if (!byManufacturer[c.manufacturer]) {
        byManufacturer[c.manufacturer] = { pdfs: 0, currentEntries: 0, estimatedGap: 0 };
      }
      byManufacturer[c.manufacturer].pdfs++;
      byManufacturer[c.manufacturer].estimatedGap += c.estimatedTools;
    }
    // Current entries are derived from aggregate per-file counts
    for (const [mfg, counts] of Object.entries(currentIndex.manufacturerEntries)) {
      if (byManufacturer[mfg]) byManufacturer[mfg].currentEntries = counts;
    }
    // Subtract current entries from estimated gap (diminishing returns if already partial)
    for (const mfg of Object.keys(byManufacturer)) {
      byManufacturer[mfg].estimatedGap = Math.max(0,
        byManufacturer[mfg].estimatedGap - byManufacturer[mfg].currentEntries,
      );
    }

    const totalEstimatedTools = catalogs.reduce((s, c) => s + c.estimatedTools, 0);
    const totalCurrentEntries = currentIndex.totalEntries;
    const gapToTarget = Math.max(0, TARGET_TOTAL_TOOLS - totalCurrentEntries);

    const recommendations = this.makeRecommendations(catalogs, gapToTarget, zipShards.length);

    return {
      generated: new Date().toISOString(),
      rootPath: this.rootPath,
      totalPdfs: pdfFiles.length,
      totalZipShards: zipShards.length,
      catalogs: catalogs.sort((a, b) => b.estimatedTools - a.estimatedTools),
      byManufacturer,
      totalEstimatedTools,
      totalCurrentEntries,
      gapToTarget,
      recommendations,
    };
  }

  /** Load current CATALOG_INDEX.json counts, if available. */
  private loadCurrentIndex(): {
    totalEntries: number;
    fileEntries: Map<string, number>;
    manufacturerEntries: Record<string, number>;
  } {
    try {
      if (!fs.existsSync(this.indexPath)) {
        return { totalEntries: 0, fileEntries: new Map(), manufacturerEntries: {} };
      }
      const raw = fs.readFileSync(this.indexPath, "utf-8");
      const parsed = JSON.parse(raw) as {
        totalEntries?: number;
        byManufacturer?: Record<string, { entries?: number }>;
        catalogs?: Array<{ file: string; entries: number }>;
      };
      const fileEntries = new Map<string, number>();
      for (const c of parsed.catalogs ?? []) {
        fileEntries.set(c.file, c.entries);
      }
      const manufacturerEntries: Record<string, number> = {};
      for (const [mfg, info] of Object.entries(parsed.byManufacturer ?? {})) {
        manufacturerEntries[mfg] = info?.entries ?? 0;
      }
      return {
        totalEntries: parsed.totalEntries ?? 0,
        fileEntries,
        manufacturerEntries,
      };
    } catch (e) {
      log.warn(`[VendorCatalogManifest] Failed to load index: ${e instanceof Error ? e.message : e}`);
      return { totalEntries: 0, fileEntries: new Map(), manufacturerEntries: {} };
    }
  }

  private emptyManifest(): CatalogManifest {
    return {
      generated: new Date().toISOString(),
      rootPath: this.rootPath,
      totalPdfs: 0,
      totalZipShards: 0,
      catalogs: [],
      byManufacturer: {},
      totalEstimatedTools: 0,
      totalCurrentEntries: 0,
      gapToTarget: TARGET_TOTAL_TOOLS,
      recommendations: [`Root path not found: ${this.rootPath}. Check PRISM_ROOT or adjust constructor.`],
    };
  }

  private makeRecommendations(
    catalogs: CatalogEntry[],
    gapToTarget: number,
    zipShards: number,
  ): string[] {
    const recs: string[] = [];

    const bigFour = catalogs.filter(c =>
      ["Sandvik", "Iscar", "Kennametal", "Seco"].includes(c.manufacturer) && !c.extracted,
    );
    if (bigFour.length > 0) {
      const est = bigFour.reduce((s, c) => s + c.estimatedTools, 0);
      recs.push(
        `HIGH PRIORITY: ${bigFour.length} Big-4 vendor PDFs unextracted ` +
        `(estimated +${est.toLocaleString()} tools). Top candidates: ` +
        bigFour.slice(0, 3).map(c => c.filename).join(", "),
      );
    }

    const huge = catalogs.filter(c => c.sizeCategory === "huge");
    if (huge.length > 0) {
      recs.push(
        `${huge.length} huge PDFs (>100MB) require long-running extraction. ` +
        `Process these one at a time with PDFTableExtractionEngine.processBatch.`,
      );
    }

    if (zipShards > 0) {
      recs.push(
        `${zipShards} split zip shards detected (${this.rootPath}). ` +
        `Build ArchiveCrawlerEngine (U-AWR21) to unpack — likely contains ` +
        `deeper vendor content not visible in loose PDFs.`,
      );
    }

    if (gapToTarget > 0) {
      recs.push(
        `Current index: ${TARGET_TOTAL_TOOLS - gapToTarget}/${TARGET_TOTAL_TOOLS} tools. ` +
        `Gap: ${gapToTarget.toLocaleString()}. ` +
        `Extracting visible PDFs should close most of this gap.`,
      );
    }

    return recs;
  }

  /**
   * Return ordered list of PDFs that are not yet in the index, sorted by
   * estimated tool count descending — i.e., the best batch processing order.
   */
  getExtractionQueue(): CatalogEntry[] {
    const manifest = this.build();
    return manifest.catalogs
      .filter(c => !c.extracted)
      .sort((a, b) => b.estimatedTools - a.estimatedTools);
  }

  /** Summary for quick AI/dashboard consumption. */
  getSummary(): {
    totalPdfs: number;
    extractedPdfs: number;
    unextractedPdfs: number;
    currentTools: number;
    estimatedGainFromVisiblePdfs: number;
    projectedTotal: number;
    gapToTarget: number;
  } {
    const manifest = this.build();
    const extracted = manifest.catalogs.filter(c => c.extracted).length;
    const unextractedGain = manifest.catalogs
      .filter(c => !c.extracted)
      .reduce((s, c) => s + c.estimatedTools, 0);
    return {
      totalPdfs: manifest.totalPdfs,
      extractedPdfs: extracted,
      unextractedPdfs: manifest.totalPdfs - extracted,
      currentTools: manifest.totalCurrentEntries,
      estimatedGainFromVisiblePdfs: unextractedGain,
      projectedTotal: manifest.totalCurrentEntries + unextractedGain,
      gapToTarget: manifest.gapToTarget,
    };
  }

  /** Persist the manifest to disk for sharing with /pdf-learn batch runs. */
  saveManifest(outputPath?: string): string {
    const target = outputPath ?? path.join(this.extractDir, "..", "data", "vendor-catalog-manifest.json");
    const manifest = this.build();
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify(manifest, null, 2));
    log.info(`[VendorCatalogManifest] Saved manifest to ${target}`);
    return target;
  }
}

export const vendorCatalogManifestEngine = new VendorCatalogManifestEngine();
