/**
 * LatheProgramCatalogEngine (E108)
 * =================================
 *
 * Queryable catalog of lathe programs indexed by programming style, controller,
 * customer, and features. Primary source: JM Die program archive (~36,929 files).
 *
 * Responsibilities:
 *   - Classify each program by programming_style (macro/hardcode/cam/conversational)
 *   - Detect cam_system from post-processor headers (hyperMILL/Mastercam/Fusion/etc.)
 *   - Detect conversational_type (mazatrol/winmax/klartext/navi_mill/shop_mill/manual_guide_i)
 *   - Provide similarity search by part spec + controller
 *   - Aggregate customer programming history
 *   - Return pie-chart-ready style distribution
 *
 * Design notes:
 *   - Does NOT re-index — accepts externally-provided entries and caches by path
 *   - Optional lazy filesystem scan via scanDirectory() (bounded, non-blocking)
 *   - Classification is heuristic: file extension + first-N-line header patterns
 *   - Similarity search uses feature-vector overlap (Jaccard-like scoring)
 *
 * Contract with dispatcher:
 *   - findSimilarPrograms(partSpec, controller?) → ranked matches
 *   - getProgrammingHistory(customer) → style distribution per customer
 *   - getStyleDistribution() → pie chart data
 *
 * @module engines/LatheProgramCatalogEngine
 * @milestone LATHE-AWARE-HARDEN MS10 (U-LAT71, U-LAT72)
 * @version 1.0.0
 */

import * as fs from "fs";
import * as path from "path";
import { log } from "../utils/Logger.js";
import type {
  ProgrammingStyle,
  ConversationalType,
} from "./LatheProgrammingStyleSelectorEngine.js";

// ── Types ──────────────────────────────────────────────────────────────────

export type CamSystem =
  | "hypermill"
  | "mastercam"
  | "fusion"
  | "esprit"
  | "gibbscam"
  | "solidcam"
  | "nx_cam"
  | "powermill"
  | "surfcam"
  | "unknown";

export interface ProgramCatalogEntry {
  program_id: string;
  path: string;
  programming_style: ProgrammingStyle;
  cam_system?: CamSystem;
  conversational_type?: ConversationalType;
  controller: string;
  customer: string;
  part_family?: string;
  features: string[]; // "threading" | "grooving" | "live_tooling" | etc.
  cycle_time_sec?: number;
  created_date?: string; // ISO
  last_run_date?: string; // ISO
  success_rate?: number; // 0..1
  file_size_bytes?: number;
  file_ext: string;
  /**
   * Optional pointer to the linked blueprint (back-annotated via U-PPL-D1's
   * ProgramPrintLinkIndexEngine). Absent until either a `register()` call
   * supplies the link OR `linkPrint()` is called post-hoc.
   */
  linked_blueprint_path?: string;
  /** Match confidence (v6 union: "exact"/"loose"/"ambiguous"/"filename_exact"/"filename_loose"). */
  linked_blueprint_confidence?: string;
  /** 1-indexed PDF page when the print is multi-page (Docustrata containers). */
  linked_blueprint_page?: number;
}

/**
 * Print-pointer payload — accepted by `linkPrint()` and by `register()`'s
 * upstream caller (the dispatcher's auto-link orchestration).
 */
export interface BlueprintLinkInfo {
  path: string;
  confidence: string;
  page?: number;
}

export interface PartSpec {
  controller?: string;
  customer?: string;
  material?: string;
  part_family?: string;
  features?: string[];
  part_complexity?: "simple" | "moderate" | "complex" | "very_complex";
  has_threading?: boolean;
  has_live_tooling?: boolean;
}

export interface SimilarityMatch {
  entry: ProgramCatalogEntry;
  similarity_score: number; // 0..1
  matched_features: string[];
  match_reasoning: string[];
}

export interface ProgrammingHistory {
  customer: string;
  program_count: number;
  style_distribution: Record<ProgrammingStyle, number>;
  cam_system_distribution: Record<string, number>;
  controllers_used: string[];
  most_common_style: ProgrammingStyle | null;
  most_common_cam_system?: string;
}

export interface StyleDistribution {
  total_programs: number;
  by_style: Array<{ style: ProgrammingStyle; count: number; percentage: number }>;
  by_cam_system: Array<{ cam_system: string; count: number; percentage: number }>;
  by_controller: Array<{ controller: string; count: number }>;
  by_conversational_type: Array<{ type: ConversationalType; count: number }>;
}

export interface ScanOptions {
  maxFiles?: number;
  extensions?: string[]; // filter
  onProgress?: (scanned: number, total: number) => void;
}

// ── Classification Heuristics ──────────────────────────────────────────────

const EXT_TO_STYLE: Record<string, ProgrammingStyle> = {
  // CAM output
  ".mcx": "cam",
  ".mcx-8": "cam",
  ".mcx-9": "cam",
  ".mcam": "cam",
  ".hmc": "cam",
  ".f3d": "cam",
  ".prt": "cam",
  // Okuma / Fanuc / generic G-code (could be macro OR hardcode — header check)
  ".min": "hardcode",
  ".nc": "hardcode",
  ".eia": "hardcode",
  ".iso": "hardcode",
  ".mpf": "hardcode",
  ".spf": "hardcode",
  // Conversational
  ".pgm": "conversational", // Mazatrol
  ".mzk": "conversational", // Mazatrol
  ".cnc": "hardcode", // generic
};

const EXT_TO_CONV_TYPE: Record<string, ConversationalType> = {
  ".pgm": "mazatrol",
  ".mzk": "mazatrol",
};

/** Regexes that detect macros/conversational in header text (first ~2KB) */
const MACRO_HINTS = [
  /\bG65\s*P\d+/i, // Macro B call
  /\bG66\s*P\d+/i, // Modal macro call
  /#\d{3,4}\s*=/, // macro variable assignment
  /\bIF\s*\[.*\]\s*GOTO\b/i,
  /\bWHILE\s*\[.*\]\s*DO\b/i,
  /\bUSER TASK\b/i, // Okuma User Task
];

const CAM_HEADER_HINTS: Array<{ regex: RegExp; cam: CamSystem }> = [
  { regex: /hyper[\s_-]?mill/i, cam: "hypermill" },
  { regex: /mastercam/i, cam: "mastercam" },
  { regex: /autodesk\s+fusion|fusion\s*360/i, cam: "fusion" },
  { regex: /esprit/i, cam: "esprit" },
  { regex: /gibbs[\s_-]?cam/i, cam: "gibbscam" },
  { regex: /solid[\s_-]?cam/i, cam: "solidcam" },
  { regex: /(?:^|\W)nx[\s_-]?cam\b/i, cam: "nx_cam" },
  { regex: /power[\s_-]?mill/i, cam: "powermill" },
  { regex: /surf[\s_-]?cam/i, cam: "surfcam" },
];

const FEATURE_HINTS: Array<{ regex: RegExp; feature: string }> = [
  { regex: /G76|G92|G33|\bTHREAD\b/i, feature: "threading" },
  { regex: /G75|\bGROOV/i, feature: "grooving" },
  { regex: /G74|\bPECK\b|G83/i, feature: "peck_drilling" },
  { regex: /M19|live[\s_-]?tool/i, feature: "live_tooling" },
  { regex: /C[-+]?\d|\bCAXIS\b/i, feature: "c_axis" },
  { regex: /G12\.1|G112|polar/i, feature: "polar" },
  { regex: /G87|G88/i, feature: "boring" },
];

const CONTROLLER_EXT_GUESS: Record<string, string> = {
  ".min": "okuma_osp",
  ".mpf": "siemens",
  ".eia": "heidenhain",
  ".pgm": "mazatrol",
  ".mzk": "mazatrol",
};

// ── Engine Implementation ──────────────────────────────────────────────────

class LatheProgramCatalogEngineImpl {
  private catalog = new Map<string, ProgramCatalogEntry>();

  /**
   * Register a program entry in the catalog (idempotent — keyed by path).
   *
   * When re-registering an already-cataloged path WITHOUT a link payload
   * (`entry.linked_blueprint_path` undefined), a previously-attached link
   * is PRESERVED — auto-rescan must not silently strip a known-good
   * pointer. Pass the link fields explicitly on the new entry to overwrite,
   * or call `linkPrint(path, null)` to clear.
   */
  register(entry: ProgramCatalogEntry): void {
    const existing = this.catalog.get(entry.path);
    if (
      existing?.linked_blueprint_path &&
      !entry.linked_blueprint_path
    ) {
      entry = {
        ...entry,
        linked_blueprint_path: existing.linked_blueprint_path,
        linked_blueprint_confidence: existing.linked_blueprint_confidence,
        ...(existing.linked_blueprint_page !== undefined
          ? { linked_blueprint_page: existing.linked_blueprint_page }
          : {}),
      };
    }
    this.catalog.set(entry.path, entry);
  }

  /**
   * Attach a blueprint pointer to an EXISTING catalog entry (post-hoc /
   * operator-invoked path). Returns the updated entry, or null if no entry
   * exists for the path. Pass `linkInfo === null` to explicitly clear the
   * pointer. FAIL-LOUD on malformed payload (throws) — silent miss would
   * hide a caller bug.
   */
  linkPrint(
    programPath: string,
    linkInfo: BlueprintLinkInfo | null,
  ): ProgramCatalogEntry | null {
    const entry = this.catalog.get(programPath);
    if (!entry) return null;
    if (linkInfo === null) {
      delete entry.linked_blueprint_path;
      delete entry.linked_blueprint_confidence;
      delete entry.linked_blueprint_page;
      return entry;
    }
    const validated = validateLinkInfo(linkInfo);
    if (!validated) {
      throw new Error(
        `[LatheProgramCatalog.linkPrint] invalid linkInfo for ${programPath}: ` +
          `path must be non-empty string, confidence must be non-empty string, ` +
          `page (if present) must be finite positive integer`,
      );
    }
    entry.linked_blueprint_path = validated.path;
    entry.linked_blueprint_confidence = validated.confidence;
    if (validated.page !== undefined) {
      entry.linked_blueprint_page = validated.page;
    } else {
      delete entry.linked_blueprint_page;
    }
    return entry;
  }

  /**
   * Bulk-attach blueprint pointers (e.g. from a batch back-annotation pass).
   * Returns {attached, missing, invalid} counts. `invalid` payloads are
   * skipped (do NOT throw on a single bad row — bulk callers want progress).
   */
  linkPrintBatch(
    pairs: Array<{ programPath: string; linkInfo: BlueprintLinkInfo | null }>,
  ): { attached: number; missing: number; invalid: number; cleared: number } {
    let attached = 0;
    let missing = 0;
    let invalid = 0;
    let cleared = 0;
    for (const p of pairs) {
      const entry = this.catalog.get(p.programPath);
      if (!entry) {
        missing++;
        continue;
      }
      if (p.linkInfo === null) {
        delete entry.linked_blueprint_path;
        delete entry.linked_blueprint_confidence;
        delete entry.linked_blueprint_page;
        cleared++;
        continue;
      }
      const validated = validateLinkInfo(p.linkInfo);
      if (!validated) {
        invalid++;
        continue;
      }
      entry.linked_blueprint_path = validated.path;
      entry.linked_blueprint_confidence = validated.confidence;
      if (validated.page !== undefined) {
        entry.linked_blueprint_page = validated.page;
      } else {
        delete entry.linked_blueprint_page;
      }
      attached++;
    }
    return { attached, missing, invalid, cleared };
  }

  /**
   * Bulk-register entries.
   */
  registerMany(entries: ProgramCatalogEntry[]): void {
    for (const e of entries) this.register(e);
  }

  /**
   * Classify a single program file into a catalog entry.
   * Reads up to 2KB of the file to detect macro/CAM hints.
   *
   * @param filePath Absolute path to program file
   * @param customer Customer folder name
   * @param controller Optional controller override (else guessed from extension)
   */
  classifyFile(
    filePath: string,
    customer: string,
    controller?: string
  ): ProgramCatalogEntry {
    const ext = path.extname(filePath).toLowerCase();
    const basename = path.basename(filePath);

    let programming_style: ProgrammingStyle = EXT_TO_STYLE[ext] ?? "hardcode";
    let conversational_type = EXT_TO_CONV_TYPE[ext];
    let cam_system: CamSystem | undefined;
    let features: string[] = [];
    let file_size_bytes: number | undefined;

    // Read a small header if the file exists — otherwise classify by extension only
    let header = "";
    try {
      const stat = fs.statSync(filePath);
      file_size_bytes = stat.size;
      const fd = fs.openSync(filePath, "r");
      const buf = Buffer.alloc(2048);
      const read = fs.readSync(fd, buf, 0, 2048, 0);
      fs.closeSync(fd);
      header = buf.subarray(0, read).toString("utf8");
    } catch {
      // File not readable — classification stays at extension level
    }

    if (header) {
      // Detect CAM system in header
      for (const h of CAM_HEADER_HINTS) {
        if (h.regex.test(header)) {
          cam_system = h.cam;
          programming_style = "cam";
          break;
        }
      }
      // Detect macro usage (only upgrade from hardcode)
      if (programming_style === "hardcode") {
        for (const pattern of MACRO_HINTS) {
          if (pattern.test(header)) {
            programming_style = "macro";
            break;
          }
        }
      }
      // Feature detection
      const featSet = new Set<string>();
      for (const f of FEATURE_HINTS) {
        if (f.regex.test(header)) featSet.add(f.feature);
      }
      features = [...featSet];
    }

    const guessedController =
      controller ?? CONTROLLER_EXT_GUESS[ext] ?? "unknown";

    return {
      program_id: `${customer}__${basename}`,
      path: filePath,
      programming_style,
      cam_system,
      conversational_type,
      controller: guessedController,
      customer,
      features,
      file_ext: ext,
      file_size_bytes,
    };
  }

  /**
   * Scan a directory tree, classify files, and register them.
   * Returns the number of programs added.
   *
   * Bounded by maxFiles (default 500) to avoid blocking large filesystems.
   */
  scanDirectory(
    rootPath: string,
    customer: string,
    options: ScanOptions = {}
  ): number {
    const maxFiles = options.maxFiles ?? 500;
    const allowedExts =
      options.extensions ?? Object.keys(EXT_TO_STYLE);

    if (!fs.existsSync(rootPath)) {
      log.warn(`[ProgramCatalog] Directory not found: ${rootPath}`);
      return 0;
    }

    const found: string[] = [];
    const walk = (dir: string): void => {
      if (found.length >= maxFiles) return;
      let entries: fs.Dirent[] = [];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        if (found.length >= maxFiles) break;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
          walk(p);
        } else {
          const ext = path.extname(e.name).toLowerCase();
          if (allowedExts.includes(ext)) {
            found.push(p);
          }
        }
      }
    };

    walk(rootPath);

    const total = found.length;
    let scanned = 0;
    for (const f of found) {
      const entry = this.classifyFile(f, customer);
      this.register(entry);
      scanned++;
      if (options.onProgress && scanned % 50 === 0) {
        options.onProgress(scanned, total);
      }
    }
    if (options.onProgress) options.onProgress(scanned, total);

    log.info(`[ProgramCatalog] Scanned ${scanned} programs from ${customer}`);
    return scanned;
  }

  /**
   * Find similar programs by partSpec + optional controller filter.
   * Score = (matched_features / required_features) * 0.6 + controller_match * 0.2 + customer_match * 0.2
   */
  findSimilarPrograms(
    partSpec: PartSpec,
    limit = 10
  ): SimilarityMatch[] {
    const requested = new Set<string>();
    if (partSpec.features) partSpec.features.forEach((f) => requested.add(f));
    if (partSpec.has_threading) requested.add("threading");
    if (partSpec.has_live_tooling) requested.add("live_tooling");

    const controller = partSpec.controller?.toLowerCase();
    const customer = partSpec.customer?.toLowerCase();

    const matches: SimilarityMatch[] = [];

    for (const entry of this.catalog.values()) {
      const matchedFeatures: string[] = [];
      for (const f of requested) {
        if (entry.features.includes(f)) matchedFeatures.push(f);
      }
      const featScore =
        requested.size === 0 ? 0.3 : matchedFeatures.length / requested.size;

      let ctrlScore = 0;
      if (controller && entry.controller.toLowerCase().includes(controller)) {
        ctrlScore = 1;
      }

      let custScore = 0;
      if (customer && entry.customer.toLowerCase() === customer) {
        custScore = 1;
      }

      const similarity_score =
        featScore * 0.6 + ctrlScore * 0.2 + custScore * 0.2;

      if (similarity_score === 0) continue;

      const reasoning: string[] = [];
      if (matchedFeatures.length > 0) {
        reasoning.push(`Matched ${matchedFeatures.length}/${requested.size} requested features`);
      }
      if (ctrlScore > 0) reasoning.push(`Controller family match: ${entry.controller}`);
      if (custScore > 0) reasoning.push(`Same customer: ${entry.customer}`);

      matches.push({
        entry,
        similarity_score,
        matched_features: matchedFeatures,
        match_reasoning: reasoning,
      });
    }

    matches.sort((a, b) => b.similarity_score - a.similarity_score);
    return matches.slice(0, limit);
  }

  /**
   * Programming history for a specific customer.
   */
  getProgrammingHistory(customer: string): ProgrammingHistory {
    const entries = [...this.catalog.values()].filter(
      (e) => e.customer.toLowerCase() === customer.toLowerCase()
    );

    const styleCounts: Record<ProgrammingStyle, number> = {
      macro: 0,
      hardcode: 0,
      cam: 0,
      conversational: 0,
    };
    const camCounts: Record<string, number> = {};
    const controllers = new Set<string>();

    for (const e of entries) {
      styleCounts[e.programming_style]++;
      if (e.cam_system) camCounts[e.cam_system] = (camCounts[e.cam_system] ?? 0) + 1;
      controllers.add(e.controller);
    }

    const mostCommonStyle = (Object.entries(styleCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null) as ProgrammingStyle | null;
    const sortedCams = Object.entries(camCounts).sort((a, b) => b[1] - a[1]);
    const mostCommonCam = sortedCams[0]?.[0];

    return {
      customer,
      program_count: entries.length,
      style_distribution: styleCounts,
      cam_system_distribution: camCounts,
      controllers_used: [...controllers],
      most_common_style: entries.length > 0 ? mostCommonStyle : null,
      most_common_cam_system: mostCommonCam,
    };
  }

  /**
   * Global style distribution (pie-chart-ready).
   */
  getStyleDistribution(): StyleDistribution {
    const total = this.catalog.size;
    const styleCounts: Record<ProgrammingStyle, number> = {
      macro: 0,
      hardcode: 0,
      cam: 0,
      conversational: 0,
    };
    const camCounts: Record<string, number> = {};
    const controllerCounts: Record<string, number> = {};
    const convCounts: Record<ConversationalType, number> = {
      mazatrol: 0,
      winmax: 0,
      klartext: 0,
      navi_mill: 0,
      shop_mill: 0,
      manual_guide_i: 0,
    };

    for (const e of this.catalog.values()) {
      styleCounts[e.programming_style]++;
      if (e.cam_system) camCounts[e.cam_system] = (camCounts[e.cam_system] ?? 0) + 1;
      controllerCounts[e.controller] = (controllerCounts[e.controller] ?? 0) + 1;
      if (e.conversational_type) convCounts[e.conversational_type]++;
    }

    const byStyle = (Object.entries(styleCounts) as Array<[ProgrammingStyle, number]>)
      .map(([style, count]) => ({
        style,
        count,
        percentage: total === 0 ? 0 : round3((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    const byCam = Object.entries(camCounts)
      .map(([cam_system, count]) => ({
        cam_system,
        count,
        percentage: total === 0 ? 0 : round3((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    const byController = Object.entries(controllerCounts)
      .map(([controller, count]) => ({ controller, count }))
      .sort((a, b) => b.count - a.count);

    const byConversational = (Object.entries(convCounts) as Array<[ConversationalType, number]>)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    return {
      total_programs: total,
      by_style: byStyle,
      by_cam_system: byCam,
      by_controller: byController,
      by_conversational_type: byConversational,
    };
  }

  /**
   * Get a specific entry by path, or undefined if not registered.
   */
  getEntry(programPath: string): ProgramCatalogEntry | undefined {
    return this.catalog.get(programPath);
  }

  /**
   * Total number of entries currently in the catalog.
   */
  size(): number {
    return this.catalog.size;
  }

  /**
   * Clear all catalog entries (for tests and reset operations).
   */
  clear(): void {
    this.catalog.clear();
  }

  /**
   * Lightweight stats for dispatcher status endpoint.
   */
  getStats(): {
    total_entries: number;
    styles_present: string[];
    cam_systems_present: string[];
    customers_count: number;
  } {
    const styles = new Set<string>();
    const cams = new Set<string>();
    const customers = new Set<string>();
    for (const e of this.catalog.values()) {
      styles.add(e.programming_style);
      if (e.cam_system) cams.add(e.cam_system);
      customers.add(e.customer);
    }
    return {
      total_entries: this.catalog.size,
      styles_present: [...styles],
      cam_systems_present: [...cams],
      customers_count: customers.size,
    };
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Validate a BlueprintLinkInfo payload. Returns canonicalized form (page
 * dropped if not a finite positive integer) or null on structural miss.
 * Exported so the dispatcher's auto-link orchestration can pre-validate
 * before mass-registering.
 */
export function validateLinkInfo(
  info: BlueprintLinkInfo,
): BlueprintLinkInfo | null {
  if (!info || typeof info !== "object") return null;
  const path = typeof info.path === "string" ? info.path.trim() : "";
  const confidence =
    typeof info.confidence === "string" ? info.confidence.trim() : "";
  if (path.length === 0 || confidence.length === 0) return null;
  let page: number | undefined;
  if (info.page !== undefined && info.page !== null) {
    if (
      typeof info.page === "number" &&
      Number.isFinite(info.page) &&
      Number.isInteger(info.page) &&
      info.page >= 1
    ) {
      page = info.page;
    }
    // Otherwise silently drop malformed page — path + confidence still useful.
  }
  return page === undefined ? { path, confidence } : { path, confidence, page };
}

// ── Singleton Export ───────────────────────────────────────────────────────

export const latheProgramCatalogEngine = new LatheProgramCatalogEngineImpl();
export type { LatheProgramCatalogEngineImpl };
