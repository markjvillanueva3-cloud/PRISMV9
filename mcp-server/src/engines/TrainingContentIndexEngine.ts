/**
 * TrainingContentIndexEngine — Indexes and classifies 3,000+ training/resource files
 *
 * Scans 6 training content directories under H:/prism/resources/ and builds a
 * structured inventory of all files with metadata: content type, topic domain,
 * difficulty level, CAM system, controller, and training day.
 *
 * Sources:
 *   1- Basic Training Day 1 — 2D CAD/CAM intro (~20 files)
 *   2- Basic Training Day 2 — 3D machining, tool library (~1,600 files)
 *   3- Basic Training Day 3 — Advanced ops, drilling, 5-axis (~11 files)
 *   RESOURCE PDFS — CNC guides, controller manuals, CAM tutorials (~3,009 files)
 *   PRISM CAD-CAM TRAINING — Casing projects (~7 files)
 *   PDF — hyperMILL manuals (~9 files)
 *
 * Actions: training_index, training_audit, training_filter_topic, training_filter_cam,
 *          training_sources
 *
 * @module TrainingContentIndexEngine
 */

import { readdir, stat } from "fs/promises";
import path from "path";

// ============================================================================
// TYPES
// ============================================================================

export type ContentType =
  | "tutorial"
  | "reference"
  | "exercise"
  | "manual"
  | "project"
  | "presentation"
  | "media"
  | "data"
  | "unknown";

export type TopicDomain =
  | "cnc_basics"
  | "g_code"
  | "cam_software"
  | "tooling"
  | "materials"
  | "gdt"
  | "5axis"
  | "turning"
  | "threading"
  | "milling"
  | "drilling"
  | "edm"
  | "grinding"
  | "quality"
  | "setup"
  | "safety"
  | "general";

export type DifficultyLevel = "beginner" | "intermediate" | "advanced" | "expert";

export interface TrainingFileEntry {
  filename: string;
  directory: string;
  filePath: string;
  extension: string;
  fileSize: number;
  contentType: ContentType;
  topic: TopicDomain;
  difficulty: DifficultyLevel;
  camSystem: string | null;
  controller: string | null;
  trainingDay: number | null;
  source: string;
}

export interface TrainingContentIndexResult {
  files: TrainingFileEntry[];
  totalFiles: number;
  byContentType: Record<string, number>;
  byTopic: Record<string, number>;
  byDifficulty: Record<string, number>;
  byCamSystem: Record<string, number>;
  byController: Record<string, number>;
  byExtension: Record<string, number>;
  byTrainingDay: Record<string, number>;
  bySource: Record<string, number>;
  timestamp: string;
}

export interface TrainingAuditResult {
  totalFiles: number;
  topTopics: Array<{ topic: string; count: number }>;
  trainingDayBreakdown: Record<string, number>;
  topExtensions: Array<{ extension: string; count: number }>;
  sourceBreakdown: Record<string, number>;
  camSystemBreakdown: Record<string, number>;
  difficultyBreakdown: Record<string, number>;
  timestamp: string;
}

export interface TrainingSourceInfo {
  name: string;
  path: string;
  expectedFiles: number;
  description: string;
}

// ============================================================================
// PATHS
// ============================================================================

const RESOURCES_ROOT = "H:/prism/resources";

const SOURCE_DIRS: TrainingSourceInfo[] = [
  {
    name: "Training Day 1",
    path: path.join(RESOURCES_ROOT, "1- Basic Training Day 1"),
    expectedFiles: 20,
    description: "2D CAD/CAM intro — chains, shapes, edit menu, basic CAD",
  },
  {
    name: "Training Day 2",
    path: path.join(RESOURCES_ROOT, "2- Basic Training Day 2"),
    expectedFiles: 1600,
    description: "3D machining, tool library, MAXX roughing, Z-level, cavity mold",
  },
  {
    name: "Training Day 3",
    path: path.join(RESOURCES_ROOT, "3- Basic Training Day 3"),
    expectedFiles: 11,
    description: "Advanced 2D, drilling, pockets, contours, 5-axis vise files",
  },
  {
    name: "RESOURCE PDFS",
    path: path.join(RESOURCES_ROOT, "RESOURCE PDFS"),
    expectedFiles: 3009,
    description: "CNC guides, controller manuals, CAM tutorials, MIT courseware",
  },
  {
    name: "PRISM CAD-CAM TRAINING",
    path: path.join(RESOURCES_ROOT, "PRISM CAD-CAM TRAINING"),
    expectedFiles: 7,
    description: "Basic single hole casing projects with STEP models and drawings",
  },
  {
    name: "PDF",
    path: path.join(RESOURCES_ROOT, "PDF"),
    expectedFiles: 9,
    description: "hyperMILL/hyperCAD-S official manuals and documentation",
  },
];

/** Maximum files to scan from RESOURCE PDFS for practical speed */
const RESOURCE_PDFS_LIMIT = 3000;

// ============================================================================
// CLASSIFICATION HELPERS
// ============================================================================

/**
 * Maps file extension to content type.
 * @param ext - lowercase extension with dot (e.g. ".pdf")
 * @param sourceName - source directory name for context
 */
function classifyContentType(ext: string, sourceName: string): ContentType {
  const e = ext.toLowerCase();
  if (e === ".pdf") return sourceName === "PDF" ? "manual" : "reference";
  if (e === ".pptx" || e === ".ppt") return "presentation";
  if (e === ".hmc" || e === ".hmf") return "project";
  if (e === ".sldprt" || e === ".sldasm") return "project";
  if (e === ".step" || e === ".stp") return "project";
  if (e === ".mcx-8" || e === ".mcx") return "project";
  if (e === ".mp4" || e === ".avi" || e === ".wmv") return "media";
  if (e === ".xlsx" || e === ".csv" || e === ".xls") return "data";
  if (e === ".db" || e === ".tooldb") return "data";
  // hyperMILL-related project formats
  if (e === ".3df" || e === ".pof" || e === ".omx" || e === ".vis") return "project";
  if (e === ".pcf" || e === ".nclist" || e === ".hmccrc32" || e === ".settings") return "data";
  // CAD interchange
  if (e === ".igs" || e === ".iges") return "project";
  if (e === ".dwg" || e === ".dxf") return "project";
  if (e === ".stl") return "project";
  // web/docs from RESOURCE PDFS
  if (e === ".html" || e === ".htm") return "tutorial";
  if (e === ".json" || e === ".xml") return "data";
  if (e === ".js" || e === ".css" || e === ".map") return "data";
  if (e === ".txt") return "reference";
  if (e === ".zip") return "data";
  // media subtitles / images
  if (e === ".vtt" || e === ".srt" || e === ".webvtt") return "media";
  if (e === ".jpg" || e === ".jpeg" || e === ".png" || e === ".svg" || e === ".ico" || e === ".gif") return "media";
  // fonts
  if (e === ".woff" || e === ".woff2" || e === ".ttf" || e === ".eot") return "data";
  // MIN programs (CNC)
  if (e === ".min") return "project";
  return "unknown";
}

/**
 * Classifies topic domain from filename and path keywords.
 * @param filename - file basename
 * @param fullPath - full file path for additional context
 */
function classifyTopic(filename: string, fullPath: string): TopicDomain {
  const combined = (filename + " " + fullPath).toLowerCase();

  if (/drill/.test(combined)) return "drilling";
  if (/thread/.test(combined)) return "threading";
  if (/turn(?:ing)?/.test(combined) && !/return/.test(combined)) return "turning";
  if (/5[- ]?axis|5axis|multi[- ]?axis/.test(combined)) return "5axis";
  if (/\bedm\b|wire.?edm|sinker.?edm|electrical.?discharge/.test(combined)) return "edm";
  if (/grind/.test(combined)) return "grinding";
  if (/mill(?:ing)?/.test(combined) && !/hypermill/.test(combined)) return "milling";
  if (/\btool\b|insert|holder|tool.?(?:db|database|library|builder|crib)/.test(combined)) return "tooling";
  if (/material|steel|aluminum|carbide|alloy/.test(combined)) return "materials";
  if (/gd&t|gd.t|tolerance|dimension|metrol/.test(combined)) return "gdt";
  if (/g[- ]?code|g.?code|\bcnc\b|cnc.?basic|cnc.?101|cnc.?501/.test(combined)) return "cnc_basics";
  if (/setup|fixtur|clamp|vise|vice/.test(combined)) return "setup";
  if (/safety|osha|lockout/.test(combined)) return "safety";
  if (/quality|spc|inspect|cmm/.test(combined)) return "quality";
  if (/\bcam\b|cam.?software|hypermill|mastercam|solidcam|fusion/.test(combined)) return "cam_software";

  return "general";
}

/**
 * Classifies difficulty level from source and filename.
 * @param sourceName - source directory name
 * @param filename - file basename
 */
function classifyDifficulty(sourceName: string, filename: string): DifficultyLevel {
  if (sourceName === "Training Day 1") return "beginner";
  if (sourceName === "Training Day 2") return "intermediate";
  if (sourceName === "Training Day 3") return "advanced";
  if (sourceName === "PDF") return "intermediate";
  if (sourceName === "PRISM CAD-CAM TRAINING") return "intermediate";

  // RESOURCE PDFS: classify from filename keywords
  const lower = filename.toLowerCase();
  if (/intro|basic|beginner|fundamental|getting.?started|101/.test(lower)) return "beginner";
  if (/advanced|expert|complex|optimization|multi.?axis/.test(lower)) return "advanced";
  return "intermediate";
}

/**
 * Detects CAM system from file path.
 * @param fullPath - full file path
 */
function detectCamSystem(fullPath: string): string | null {
  const lower = fullPath.toLowerCase();
  if (/hypermill|hyper.?mill|hypercad/.test(lower)) return "hypermill";
  if (/mastercam|master.?cam/.test(lower)) return "mastercam";
  if (/fusion.?360|fusion/.test(lower)) return "fusion360";
  if (/solidcam|solid.?cam/.test(lower)) return "solidcam";
  if (/inventorcam|inventor.?cam/.test(lower)) return "inventorcam";
  return null;
}

/**
 * Detects CNC controller from file path.
 * @param fullPath - full file path
 */
function detectController(fullPath: string): string | null {
  const lower = fullPath.toLowerCase();
  if (/fanuc/.test(lower)) return "fanuc";
  if (/haas/.test(lower)) return "haas";
  if (/okuma/.test(lower)) return "okuma";
  if (/mazak/.test(lower)) return "mazak";
  if (/siemens/.test(lower)) return "siemens";
  if (/heidenhain/.test(lower)) return "heidenhain";
  return null;
}

/**
 * Extracts training day number from source name.
 * @param sourceName - source directory name
 */
function extractTrainingDay(sourceName: string): number | null {
  if (sourceName === "Training Day 1") return 1;
  if (sourceName === "Training Day 2") return 2;
  if (sourceName === "Training Day 3") return 3;
  return null;
}

// ============================================================================
// DIRECTORY SCANNER
// ============================================================================

/**
 * Recursively collects all files from a directory, up to a limit.
 * @param dirPath - directory to scan
 * @param limit - maximum files to collect (0 = unlimited)
 * @returns array of absolute file paths
 */
async function collectFiles(dirPath: string, limit: number = 0): Promise<string[]> {
  const results: string[] = [];

  async function walk(dir: string): Promise<void> {
    if (limit > 0 && results.length >= limit) return;

    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (limit > 0 && results.length >= limit) return;
      // Skip hidden files and system files
      if (entry.startsWith(".") || entry === "Thumbs.db" || entry === "desktop.ini") continue;

      const fullPath = path.join(dir, entry);
      let stats;
      try {
        stats = await stat(fullPath);
      } catch {
        continue;
      }

      if (stats.isDirectory()) {
        await walk(fullPath);
      } else if (stats.isFile()) {
        results.push(fullPath);
      }
    }
  }

  await walk(dirPath);
  return results;
}

// ============================================================================
// AGGREGATION HELPERS
// ============================================================================

function incrementMap(map: Record<string, number>, key: string): void {
  map[key] = (map[key] || 0) + 1;
}

function sortedTopN(
  map: Record<string, number>,
  n: number
): Array<{ key: string; count: number }> {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, count]) => ({ key, count }));
}

// ============================================================================
// ENGINE
// ============================================================================

/**
 * TrainingContentIndexEngine — static class for indexing training content.
 *
 * Scans 6 resource directories and classifies each file by content type,
 * topic domain, difficulty level, CAM system, and controller.
 */
export class TrainingContentIndexEngine {
  /**
   * Returns the 6 source directories with expected file counts and descriptions.
   * @returns array of TrainingSourceInfo objects
   */
  static getSources(): TrainingSourceInfo[] {
    return SOURCE_DIRS.map((s) => ({ ...s }));
  }

  /**
   * Main harvest method — scans all 6 directories and builds the full index.
   * RESOURCE PDFS is limited to first 3,000 files for practical speed.
   *
   * @returns TrainingContentIndexResult with all files and aggregation counts
   */
  static async harvest(): Promise<TrainingContentIndexResult> {
    const files: TrainingFileEntry[] = [];
    const byContentType: Record<string, number> = {};
    const byTopic: Record<string, number> = {};
    const byDifficulty: Record<string, number> = {};
    const byCamSystem: Record<string, number> = {};
    const byController: Record<string, number> = {};
    const byExtension: Record<string, number> = {};
    const byTrainingDay: Record<string, number> = {};
    const bySource: Record<string, number> = {};

    for (const source of SOURCE_DIRS) {
      const limit = source.name === "RESOURCE PDFS" ? RESOURCE_PDFS_LIMIT : 0;
      const filePaths = await collectFiles(source.path, limit);

      for (const filePath of filePaths) {
        const filename = path.basename(filePath);
        const directory = path.dirname(filePath);
        const ext = path.extname(filename).toLowerCase();
        let fileSize = 0;
        try {
          const s = await stat(filePath);
          fileSize = s.size;
        } catch {
          // stat already succeeded during collection; fallback to 0
        }

        const contentType = classifyContentType(ext, source.name);
        const topic = classifyTopic(filename, filePath);
        const difficulty = classifyDifficulty(source.name, filename);
        const camSystem = detectCamSystem(filePath);
        const controller = detectController(filePath);
        const trainingDay = extractTrainingDay(source.name);

        const entry: TrainingFileEntry = {
          filename,
          directory: directory.replace(/\\/g, "/"),
          filePath: filePath.replace(/\\/g, "/"),
          extension: ext || "(none)",
          fileSize,
          contentType,
          topic,
          difficulty,
          camSystem,
          controller,
          trainingDay,
          source: source.name,
        };

        files.push(entry);

        incrementMap(byContentType, contentType);
        incrementMap(byTopic, topic);
        incrementMap(byDifficulty, difficulty);
        if (camSystem) incrementMap(byCamSystem, camSystem);
        if (controller) incrementMap(byController, controller);
        incrementMap(byExtension, ext || "(none)");
        if (trainingDay !== null) incrementMap(byTrainingDay, String(trainingDay));
        incrementMap(bySource, source.name);
      }
    }

    return {
      files,
      totalFiles: files.length,
      byContentType,
      byTopic,
      byDifficulty,
      byCamSystem,
      byController,
      byExtension,
      byTrainingDay,
      bySource,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Returns a summary audit of the training content index.
   * @returns TrainingAuditResult with top topics, day breakdown, extensions
   */
  static async audit(): Promise<TrainingAuditResult> {
    const result = await TrainingContentIndexEngine.harvest();

    const topTopics = sortedTopN(result.byTopic, 10).map((e) => ({
      topic: e.key,
      count: e.count,
    }));

    const topExtensions = sortedTopN(result.byExtension, 10).map((e) => ({
      extension: e.key,
      count: e.count,
    }));

    return {
      totalFiles: result.totalFiles,
      topTopics,
      trainingDayBreakdown: result.byTrainingDay,
      topExtensions,
      sourceBreakdown: result.bySource,
      camSystemBreakdown: result.byCamSystem,
      difficultyBreakdown: result.byDifficulty,
      timestamp: result.timestamp,
    };
  }

  /**
   * Filters files by topic domain.
   * @param files - array of TrainingFileEntry
   * @param topic - TopicDomain to filter by
   * @returns filtered array
   */
  static filterByTopic(
    files: TrainingFileEntry[],
    topic: TopicDomain
  ): TrainingFileEntry[] {
    return files.filter((f) => f.topic === topic);
  }

  /**
   * Filters files by CAM system.
   * @param files - array of TrainingFileEntry
   * @param cam - CAM system string (e.g. "hypermill", "mastercam")
   * @returns filtered array
   */
  static filterByCam(
    files: TrainingFileEntry[],
    cam: string
  ): TrainingFileEntry[] {
    return files.filter((f) => f.camSystem === cam);
  }
}
