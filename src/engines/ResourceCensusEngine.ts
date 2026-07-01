/**
 * ResourceCensusEngine — SQ2-0-CENSUS: Resource Census Across PRISM + Archive + Box
 *
 * Scans filesystem locations for manufacturing resources (PDFs, videos, STEP models,
 * catalogs, JSON data, handbooks, course packs). Produces a typed inventory with
 * categorization by type, domain, and location.
 *
 * Three scan locations:
 *   1. H:/prism — Active workspace (PDFs, videos, STEP, catalogs, JSON)
 *   2. H:/PRISM_ARCHIVE_2026-02-01 — Archive (MIT courses, manufacturer catalogs, old resources)
 *   3. H:/prism/BOX — Box sync (CAD models, tool libraries, macro programs, training)
 *
 * Persists results to H:/prism/state/shared/RESOURCE_CENSUS.json
 *
 * @module ResourceCensusEngine
 */

import * as fs from "fs";
import * as path from "path";
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type ResourceType =
  | "pdf"
  | "video"
  | "cad_model"
  | "json_data"
  | "catalog"
  | "handbook"
  | "course"
  | "macro"
  | "post_processor"
  | "tool_library"
  | "fixture"
  | "other";

export type ResourceDomain =
  | "manufacturer_catalog"
  | "cutting_data"
  | "machine_model"
  | "part_model"
  | "fixture_model"
  | "tool_holder"
  | "course_material"
  | "handbook_reference"
  | "hypermill_doc"
  | "macro_program"
  | "post_processor"
  | "tool_library"
  | "training"
  | "cnc_program"
  | "registry_data"
  | "unclassified";

export interface ResourceEntry {
  path: string;
  filename: string;
  type: ResourceType;
  domain: ResourceDomain;
  location: "prism" | "archive" | "box";
  size_bytes: number;
  extension: string;
}

export interface LocationSummary {
  location: string;
  total_files: number;
  total_size_mb: number;
  by_type: Record<string, number>;
  by_domain: Record<string, number>;
}

export interface CensusReport {
  timestamp: string;
  scan_duration_ms: number;
  total_resources: number;
  total_size_mb: number;
  locations: LocationSummary[];
  by_type: Record<string, number>;
  by_domain: Record<string, number>;
  top_directories: Array<{ dir: string; count: number }>;
  warnings: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SCAN_LOCATIONS: Array<{ name: "prism" | "archive" | "box"; path: string }> = [
  { name: "prism", path: "H:/prism" },
  { name: "archive", path: "H:/PRISM_ARCHIVE_2026-02-01" },
  { name: "box", path: "H:/prism/BOX" },
];

const PERSIST_PATH = "H:/prism/state/shared/RESOURCE_CENSUS.json";

const EXT_TYPE_MAP: Record<string, ResourceType> = {
  ".pdf": "pdf",
  ".mp4": "video",
  ".mkv": "video",
  ".avi": "video",
  ".mov": "video",
  ".webm": "video",
  ".step": "cad_model",
  ".stp": "cad_model",
  ".iges": "cad_model",
  ".igs": "cad_model",
  ".stl": "cad_model",
  ".3mf": "cad_model",
  ".f3d": "cad_model",
  ".json": "json_data",
  ".nc": "macro",
  ".ngc": "macro",
  ".tap": "macro",
  ".gcode": "macro",
  ".cps": "post_processor",
  ".hmc": "other",
  ".csv": "other",
  ".xlsx": "other",
  ".xls": "other",
};

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  ".claude",
  ".taskmaster",
  ".swarm",
  ".claude-flow",
  ".lsmcp",
  ".playwright-cli",
  ".pytest_cache",
  "__pycache__",
  ".serena",
  "build",
]);

// ============================================================================
// DOMAIN DETECTION
// ============================================================================

function detectDomain(filePath: string, type: ResourceType): ResourceDomain {
  const lower = filePath.toLowerCase().replace(/\\/g, "/");

  // Catalog detection
  if (lower.includes("/catalogs/") || lower.includes("catalog")) return "manufacturer_catalog";

  // hyperMILL docs
  if (lower.includes("/hypermill/")) return "hypermill_doc";

  // Course materials
  if (lower.includes("/mit courses/") || lower.includes("/course") || lower.includes("training")) return "course_material";

  // Resource PDFs / handbooks
  if (lower.includes("/resource pdf") || lower.includes("handbook")) return "handbook_reference";

  // Machine models
  if (type === "cad_model" && (lower.includes("machine") || lower.includes("cnc"))) return "machine_model";

  // Part models
  if (type === "cad_model" && (lower.includes("part model") || lower.includes("part_model"))) return "part_model";

  // Fixtures
  if (lower.includes("fixture")) return "fixture_model";

  // Tool holders / libraries
  if (lower.includes("tool holder") || lower.includes("tool_holder")) return "tool_holder";
  if (lower.includes("tool library") || lower.includes("tool_library")) return "tool_library";

  // Macro programs
  if (type === "macro" || lower.includes("macro")) return "macro_program";

  // Post processors
  if (type === "post_processor" || lower.includes("post")) return "post_processor";

  // CNC programs
  if (lower.includes("program example") || lower.includes("program_example")) return "cnc_program";

  // Registry / JSON data
  if (type === "json_data" && lower.includes("/data/")) return "registry_data";

  // CAD training
  if (lower.includes("cad-cam") || lower.includes("cad_cam")) return "training";

  // Cutting data
  if (lower.includes("cutting") || lower.includes("speed") || lower.includes("feed")) return "cutting_data";

  return "unclassified";
}

// ============================================================================
// ENGINE
// ============================================================================

class ResourceCensusEngine {
  /**
   * Scan all configured locations and produce a census report.
   * @param location Optional location filter ("prism", "archive", "box")
   * @param type Optional type filter ("pdf", "video", "cad_model", etc.)
   * @returns CensusReport with full resource inventory
   */
  async scan(
    location?: string,
    type?: string,
  ): Promise<CensusReport> {
    const warnings: string[] = [];
    const start = Date.now();
    const entries: ResourceEntry[] = [];

    // Validate filters
    if (location && !["prism", "archive", "box"].includes(location)) {
      warnings.push(`Unknown location '${location}'. Valid: prism, archive, box`);
    }
    if (type && !Object.values(EXT_TYPE_MAP).includes(type as ResourceType)) {
      warnings.push(`Unknown type '${type}'. Valid: pdf, video, cad_model, json_data, catalog, macro, post_processor, other`);
    }

    // Determine which locations to scan
    const locations = location
      ? SCAN_LOCATIONS.filter((l) => l.name === location)
      : SCAN_LOCATIONS;

    for (const loc of locations) {
      if (!fs.existsSync(loc.path)) {
        warnings.push(`Location not found: ${loc.path}`);
        continue;
      }

      try {
        this._walkDir(loc.path, loc.name, entries, 0);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        warnings.push(`Scan error in ${loc.path}: ${msg}`);
      }
    }

    // Apply type filter
    const filtered = type
      ? entries.filter((e) => e.type === type)
      : entries;

    // Compute summaries
    const byType: Record<string, number> = {};
    const byDomain: Record<string, number> = {};
    const dirCounts: Record<string, number> = {};
    let totalSize = 0;

    for (const e of filtered) {
      byType[e.type] = (byType[e.type] || 0) + 1;
      byDomain[e.domain] = (byDomain[e.domain] || 0) + 1;
      totalSize += e.size_bytes;
      const dir = path.dirname(e.path).replace(/\\/g, "/");
      dirCounts[dir] = (dirCounts[dir] || 0) + 1;
    }

    // Per-location summaries
    const locationSummaries: LocationSummary[] = [];
    for (const loc of locations) {
      const locEntries = filtered.filter((e) => e.location === loc.name);
      const locByType: Record<string, number> = {};
      const locByDomain: Record<string, number> = {};
      let locSize = 0;
      for (const e of locEntries) {
        locByType[e.type] = (locByType[e.type] || 0) + 1;
        locByDomain[e.domain] = (locByDomain[e.domain] || 0) + 1;
        locSize += e.size_bytes;
      }
      locationSummaries.push({
        location: loc.name,
        total_files: locEntries.length,
        total_size_mb: Math.round((locSize / (1024 * 1024)) * 10) / 10,
        by_type: locByType,
        by_domain: locByDomain,
      });
    }

    // Top directories
    const topDirs = Object.entries(dirCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([dir, count]) => ({ dir, count }));

    const report: CensusReport = {
      timestamp: new Date().toISOString(),
      scan_duration_ms: Date.now() - start,
      total_resources: filtered.length,
      total_size_mb: Math.round((totalSize / (1024 * 1024)) * 10) / 10,
      locations: locationSummaries,
      by_type: byType,
      by_domain: byDomain,
      top_directories: topDirs,
      warnings,
    };

    // Persist
    this._persist(report);

    log.info(
      `[ResourceCensus] Scanned ${filtered.length} resources across ${locations.length} locations in ${report.scan_duration_ms}ms`,
    );

    return report;
  }

  /**
   * Read the last persisted census report.
   * @returns CensusReport or null if none exists
   */
  async read(): Promise<CensusReport | null> {
    try {
      if (!fs.existsSync(PERSIST_PATH)) return null;
      const raw = fs.readFileSync(PERSIST_PATH, "utf-8");
      return JSON.parse(raw) as CensusReport;
    } catch {
      return null;
    }
  }

  /**
   * Generate a compact markdown summary of a census report.
   */
  summary(report: CensusReport): string {
    const lines: string[] = [
      `# Resource Census`,
      `Scanned: ${report.timestamp} | Duration: ${report.scan_duration_ms}ms`,
      `Total: ${report.total_resources} resources | ${report.total_size_mb} MB`,
      "",
      "## By Location",
    ];

    for (const loc of report.locations) {
      lines.push(`- **${loc.location}**: ${loc.total_files} files, ${loc.total_size_mb} MB`);
    }

    lines.push("", "## By Type");
    for (const [t, count] of Object.entries(report.by_type).sort((a, b) => b[1] - a[1])) {
      lines.push(`- ${t}: ${count}`);
    }

    lines.push("", "## By Domain");
    for (const [d, count] of Object.entries(report.by_domain).sort((a, b) => b[1] - a[1])) {
      lines.push(`- ${d}: ${count}`);
    }

    if (report.top_directories.length > 0) {
      lines.push("", "## Top Directories");
      for (const td of report.top_directories.slice(0, 10)) {
        lines.push(`- ${td.dir}: ${td.count}`);
      }
    }

    if (report.warnings.length > 0) {
      lines.push("", "## Warnings");
      for (const w of report.warnings) {
        lines.push(`- ${w}`);
      }
    }

    return lines.join("\n");
  }

  // ==========================================================================
  // PRIVATE
  // ==========================================================================

  private _walkDir(
    dirPath: string,
    location: "prism" | "archive" | "box",
    entries: ResourceEntry[],
    depth: number,
  ): void {
    if (depth > 12) return; // Max recursion depth

    let items: string[];
    try {
      items = fs.readdirSync(dirPath);
    } catch {
      return; // Permission denied or inaccessible
    }

    for (const item of items) {
      if (SKIP_DIRS.has(item)) continue;
      const fullPath = path.join(dirPath, item);

      let stat: fs.Stats;
      try {
        stat = fs.statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        // Skip BOX inside prism scan (it gets its own scan)
        if (location === "prism" && item === "BOX") continue;
        this._walkDir(fullPath, location, entries, depth + 1);
      } else if (stat.isFile()) {
        const ext = path.extname(item).toLowerCase();
        const type = EXT_TYPE_MAP[ext];
        if (!type) continue; // Skip unknown extensions

        const domain = detectDomain(fullPath, type);
        entries.push({
          path: fullPath.replace(/\\/g, "/"),
          filename: item,
          type,
          domain,
          location,
          size_bytes: stat.size,
          extension: ext,
        });
      }
    }
  }

  private _persist(report: CensusReport): void {
    try {
      const dir = path.dirname(PERSIST_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(PERSIST_PATH, JSON.stringify(report, null, 2), "utf-8");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn(`[ResourceCensus] Failed to persist: ${msg}`);
    }
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const resourceCensusEngine = new ResourceCensusEngine();
export { ResourceCensusEngine };
