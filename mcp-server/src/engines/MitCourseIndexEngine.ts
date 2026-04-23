/**
 * MitCourseIndexEngine -- Indexes 200+ MIT OpenCourseWare courses from the
 * resources/MIT COURSES directory tree.
 *
 * Scans 6 directory zones:
 *   1. Root:       H:/prism/resources/MIT COURSES/ (zips + extracted folders)
 *   2. UPLOADED:   MIT COURSES/UPLOADED/ (45 zips)
 *   3. MC2:        MIT COURSES/MIT COURSES 2/ + UPLOADED/ (20 entries)
 *   4. MC3:        MIT COURSES/MIT COURSES 3/ + UPLOADED/ (17 entries)
 *   5. MC4:        MIT COURSES/MIT COURSES 4/ + uploaded/ (42 entries)
 *   6. MC5:        MIT COURSES/MIT COURSES 5/FULL FILES/ (96 entries)
 *
 * Each course follows the OCW slug format: {dept}.{number}-{semester}-{year}
 * (e.g., "2.43-spring-2024", "18.s191-fall-2020", "esd.342-spring-2006")
 *
 * Also parses pre-existing index JSON files when present:
 *   - MIT_COURSE_INDEX.json
 *   - ALGORITHM_REGISTRY.json
 *   - PRISM_COURSE_CATALOG.json
 *
 * @module MitCourseIndexEngine
 */

import { readdir, stat, readFile } from "fs/promises";
import path from "path";

// ============================================================================
// TYPES
// ============================================================================

/** Relevance classification for manufacturing intelligence */
export type CourseRelevance =
  | "manufacturing"
  | "materials"
  | "algorithms"
  | "controls"
  | "design"
  | "fluid_thermal"
  | "general_engineering"
  | "other";

/** A single MIT course entry */
export interface MitCourse {
  /** Raw folder/zip name, e.g. "2.43-spring-2024" */
  slug: string;
  /** Department prefix, e.g. "2", "18", "esd" */
  department: string;
  /** Course number portion, e.g. "43", "s191", "342" */
  courseNumber: string;
  /** Full course ID, e.g. "2.43", "18.s191", "esd.342" */
  courseId: string;
  /** Semester string, e.g. "spring", "fall", "january-iap", "iap", "summer" */
  semester: string;
  /** Year, e.g. 2024 */
  year: number;
  /** Whether the course has an extracted folder (not just a zip) */
  isExtracted: boolean;
  /** Whether a .zip archive exists for this course */
  hasZip: boolean;
  /** Total file count (only populated for extracted courses) */
  totalFiles: number;
  /** File count by extension (only populated for extracted courses) */
  filesByExtension: Record<string, number>;
  /** Source zone identifier */
  source: string;
  /** Full path to the entry (folder or zip) */
  entryPath: string;
  /** Relevance classification for PRISM */
  relevance: CourseRelevance;
}

/** Full harvest result */
export interface MitCourseIndexResult {
  /** All courses found */
  courses: MitCourse[];
  /** Count by department prefix */
  byDepartment: Record<string, number>;
  /** Count by semester */
  bySemester: Record<string, number>;
  /** Count by relevance category */
  byRelevance: Record<string, number>;
  /** Count by source zone */
  bySource: Record<string, number>;
  /** Count by year */
  byYear: Record<string, number>;
  /** Total unique course entries */
  totalCourses: number;
  /** Total files across all extracted courses */
  totalFiles: number;
  /** Pre-existing index data found */
  existingIndexes: ExistingIndexInfo[];
  /** ISO timestamp of the harvest */
  timestamp: string;
}

/** Audit summary */
export interface MitCourseAuditResult {
  totalCourses: number;
  totalFiles: number;
  extractedCount: number;
  zipOnlyCount: number;
  topDepartments: Array<{ department: string; count: number }>;
  topRelevance: Array<{ category: string; count: number }>;
  semesterBreakdown: Record<string, number>;
  yearRange: { min: number; max: number };
  sourceBreakdown: Record<string, number>;
  existingIndexes: string[];
  timestamp: string;
}

/** Info about pre-existing JSON index files */
export interface ExistingIndexInfo {
  filename: string;
  filePath: string;
  sizeBytes: number;
  parseable: boolean;
  topLevelKeys: string[];
}

/** Source zone definition */
export interface MitCourseSourceInfo {
  name: string;
  path: string;
  expectedCourses: number;
  description: string;
}

// ============================================================================
// PATHS & CONSTANTS
// ============================================================================

const MIT_ROOT = "H:/prism/resources/MIT COURSES";

const SOURCE_ZONES: MitCourseSourceInfo[] = [
  {
    name: "root",
    path: MIT_ROOT,
    expectedCourses: 14,
    description:
      "Root MIT COURSES directory — 11 zips + 3 extracted folders (10.34, 6.046j, 6.837)",
  },
  {
    name: "uploaded",
    path: path.join(MIT_ROOT, "UPLOADED"),
    expectedCourses: 45,
    description: "UPLOADED subdirectory — 45 course zips",
  },
  {
    name: "mc2",
    path: path.join(MIT_ROOT, "MIT COURSES 2"),
    expectedCourses: 20,
    description:
      "MIT COURSES 2 — 2 root zips + UPLOADED with 16 zips and 2 extracted folders",
  },
  {
    name: "mc3",
    path: path.join(MIT_ROOT, "MIT COURSES 3"),
    expectedCourses: 16,
    description:
      "MIT COURSES 3 — 2 root zips + 2 extracted + UPLOADED with 12 zips",
  },
  {
    name: "mc4",
    path: path.join(MIT_ROOT, "MIT COURSES 4"),
    expectedCourses: 42,
    description:
      "MIT COURSES 4 — 1 root zip + extracted + uploaded with 30+ zips and 9 folders",
  },
  {
    name: "mc5",
    path: path.join(MIT_ROOT, "MIT COURSES 5"),
    expectedCourses: 96,
    description:
      "MIT COURSES 5 — FULL FILES with 95 zips + 1 extracted folder",
  },
];

/** JSON index files that may exist in the root */
const KNOWN_INDEX_FILES = [
  "MIT_COURSE_INDEX.json",
  "ALGORITHM_REGISTRY.json",
  "PRISM_COURSE_CATALOG.json",
];

/**
 * Regex for standard OCW slug format.
 * Captures: department, courseNumber, semester, year
 * Examples:
 *   "2.43-spring-2024"         -> dept=2, num=43, sem=spring, yr=2024
 *   "18.s191-fall-2020"        -> dept=18, num=s191, sem=fall, yr=2020
 *   "esd.342-spring-2006"      -> dept=esd, num=342, sem=spring, yr=2006
 *   "res.ll-005-january-iap-2020" -> dept=res, num=ll-005, sem=january-iap, yr=2020
 *   "6.041sc-fall-2013"        -> dept=6, num=041sc, sem=fall, yr=2013
 *   "16.660j-january-iap-2012" -> dept=16, num=660j, sem=january-iap, yr=2012
 *   "3.042-spring-2008(1)"     -> dept=3, num=042, sem=spring, yr=2008
 */
const SLUG_REGEX =
  /^([a-z]+|\d+)\.([a-z0-9._-]+?)-(spring|fall|summer|january-iap|iap)-(\d{4})/i;

// ============================================================================
// MIT Department -> Relevance Mapping
// ============================================================================

/**
 * MIT department number to relevance classification.
 *
 * MIT departments (numbers map to):
 *   1  = Civil & Environmental
 *   2  = Mechanical Engineering (manufacturing, controls, design, fluid/thermal)
 *   3  = Materials Science
 *   4  = Architecture
 *   6  = EECS (algorithms, software)
 *   8  = Physics
 *   9  = Brain/Cognitive Sciences
 *   10 = Chemical Engineering
 *   11 = Urban Studies
 *   12 = Earth/Atmospheric/Planetary
 *   15 = Sloan Management (operations, optimization)
 *   16 = Aero/Astro (controls, systems, design)
 *   18 = Mathematics (algorithms)
 */
function classifyRelevance(dept: string, courseNum: string): CourseRelevance {
  const d = dept.toLowerCase();
  const cn = courseNum.toLowerCase();

  // Department 2 — Mechanical Engineering: subdivide further
  if (d === "2") {
    // Manufacturing courses
    if (
      /^(81|83|85|852|854|830|875|008|007|993|670|997)/.test(cn)
    )
      return "manufacturing";
    // Controls courses
    if (/^(14|003|004|141|171|086)/.test(cn)) return "controls";
    // Fluid/thermal
    if (/^(06|25|26|27)/.test(cn)) return "fluid_thermal";
    // Design
    if (/^(00[7]|007|43|032|035|75|158)/.test(cn)) return "design";
    // General ME
    return "general_engineering";
  }

  // Department 3 — Materials Science
  if (d === "3") return "materials";

  // Department 10 — Chemical Engineering (materials processing)
  if (d === "10") return "materials";

  // Department 6 — EECS: mostly algorithms
  if (d === "6") {
    // CAD/graphics courses
    if (/^(83[78])/.test(cn)) return "design";
    // Control systems
    if (/^(302|641)/.test(cn)) return "controls";
    return "algorithms";
  }

  // Department 18 — Mathematics: algorithms
  if (d === "18") return "algorithms";

  // Department 15 — Sloan: optimization, operations, management
  if (d === "15") return "algorithms";

  // Department 16 — Aero/Astro
  if (d === "16") {
    if (/^(660|842|682|810|852)/.test(cn)) return "manufacturing";
    if (/^(410|400|422)/.test(cn)) return "controls";
    if (/^(355|885)/.test(cn)) return "design";
    return "general_engineering";
  }

  // Department 8 — Physics
  if (d === "8") return "general_engineering";

  // Department 9 — Brain/Cognitive
  if (d === "9") return "other";

  // Department 1 — Civil/Environmental
  if (d === "1") return "general_engineering";

  // Department 4 — Architecture
  if (d === "4") return "design";

  // Department 11 — Urban Studies
  if (d === "11") return "other";

  // Department 12 — Earth/Planetary
  if (d === "12") return "other";

  // Special prefixes
  if (d === "esd") return "design";
  if (d === "mas") return "general_engineering";
  if (d === "res") return "general_engineering";
  if (d === "ids") return "algorithms";
  if (d === "ec") return "general_engineering";
  if (d === "sts") return "other";

  return "other";
}

// ============================================================================
// FILESYSTEM HELPERS
// ============================================================================

/**
 * Recursively counts files in a directory tree, returning totals by extension.
 * @param dirPath - directory to walk
 * @returns total count and by-extension breakdown
 */
async function countFilesInDir(
  dirPath: string
): Promise<{ total: number; byExt: Record<string, number> }> {
  let total = 0;
  const byExt: Record<string, number> = {};

  async function walk(dir: string): Promise<void> {
    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.startsWith(".") || entry === "Thumbs.db" || entry === "desktop.ini") continue;
      const full = path.join(dir, entry);
      let s;
      try {
        s = await stat(full);
      } catch {
        continue;
      }
      if (s.isDirectory()) {
        await walk(full);
      } else if (s.isFile()) {
        total++;
        const ext = path.extname(entry).toLowerCase() || "(none)";
        byExt[ext] = (byExt[ext] || 0) + 1;
      }
    }
  }

  await walk(dirPath);
  return { total, byExt };
}

/**
 * Parse a course slug into structured data.
 * @param slug - e.g. "2.43-spring-2024" or "esd.342-spring-2006"
 * @returns parsed fields or null if not matching OCW format
 */
function parseSlug(
  slug: string
): {
  department: string;
  courseNumber: string;
  courseId: string;
  semester: string;
  year: number;
} | null {
  // Strip trailing (1) or email annotations like " (pmanzano@jmdie.com)"
  const cleaned = slug.replace(/\s*\(.*\)$/, "").replace(/\(1\)$/, "").trim();
  const m = SLUG_REGEX.exec(cleaned);
  if (!m) return null;
  const department = m[1].toLowerCase();
  const courseNumber = m[2].toLowerCase();
  const courseId = `${department}.${courseNumber}`;
  const semester = m[3].toLowerCase();
  const year = parseInt(m[4], 10);
  return { department, courseNumber, courseId, semester, year };
}

function incrementMap(map: Record<string, number>, key: string): void {
  map[key] = (map[key] || 0) + 1;
}

// ============================================================================
// ENGINE
// ============================================================================

/**
 * MitCourseIndexEngine -- static class for indexing MIT OCW courses.
 *
 * Scans 6 source zones under H:/prism/resources/MIT COURSES/ and returns a
 * structured inventory of all course entries with department classification,
 * relevance tagging, semester/year metadata, and file counts for extracted courses.
 */
export class MitCourseIndexEngine {
  /**
   * Returns the 6 source zone definitions with expected counts.
   * @returns array of MitCourseSourceInfo
   */
  static getSources(): MitCourseSourceInfo[] {
    return SOURCE_ZONES.map((s) => ({ ...s }));
  }

  /**
   * Full scan of all MIT course directories. Deduplicates by slug across zones.
   * Counts files only for extracted (non-zip) courses.
   *
   * @returns MitCourseIndexResult with courses, aggregation maps, and indexes
   */
  static async harvest(): Promise<MitCourseIndexResult> {
    const courseMap = new Map<string, MitCourse>();
    const byDepartment: Record<string, number> = {};
    const bySemester: Record<string, number> = {};
    const byRelevance: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    const byYear: Record<string, number> = {};
    let totalFiles = 0;

    // --- Scan each zone ---
    for (const zone of SOURCE_ZONES) {
      const entries = await MitCourseIndexEngine._scanZone(zone);
      for (const course of entries) {
        const existing = courseMap.get(course.slug);
        if (existing) {
          // Merge: prefer extracted version, accumulate zip knowledge
          if (course.isExtracted && !existing.isExtracted) {
            course.hasZip = course.hasZip || existing.hasZip;
            courseMap.set(course.slug, course);
          } else {
            existing.hasZip = existing.hasZip || course.hasZip;
          }
          continue; // Don't double-count in aggregation maps
        }
        courseMap.set(course.slug, course);
        incrementMap(byDepartment, course.department);
        incrementMap(bySemester, course.semester);
        incrementMap(byRelevance, course.relevance);
        incrementMap(bySource, course.source);
        incrementMap(byYear, String(course.year));
        totalFiles += course.totalFiles;
      }
    }

    // --- Parse existing JSON indexes ---
    const existingIndexes = await MitCourseIndexEngine._scanIndexFiles();

    const courses = Array.from(courseMap.values()).sort((a, b) =>
      a.slug.localeCompare(b.slug)
    );

    return {
      courses,
      byDepartment,
      bySemester,
      byRelevance,
      bySource,
      byYear,
      totalCourses: courses.length,
      totalFiles,
      existingIndexes,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Returns a summary audit with top departments, relevance, year range, etc.
   * @returns MitCourseAuditResult
   */
  static async audit(): Promise<MitCourseAuditResult> {
    const result = await MitCourseIndexEngine.harvest();

    const topDepartments = Object.entries(result.byDepartment)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([department, count]) => ({ department, count }));

    const topRelevance = Object.entries(result.byRelevance)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count }));

    const years = result.courses.map((c) => c.year);
    const extractedCount = result.courses.filter((c) => c.isExtracted).length;

    return {
      totalCourses: result.totalCourses,
      totalFiles: result.totalFiles,
      extractedCount,
      zipOnlyCount: result.totalCourses - extractedCount,
      topDepartments,
      topRelevance,
      semesterBreakdown: result.bySemester,
      yearRange: {
        min: years.length > 0 ? Math.min(...years) : 0,
        max: years.length > 0 ? Math.max(...years) : 0,
      },
      sourceBreakdown: result.bySource,
      existingIndexes: result.existingIndexes.map((i) => i.filename),
      timestamp: result.timestamp,
    };
  }

  /**
   * Filter courses by department prefix.
   * @param courses - array of MitCourse
   * @param dept - department string (e.g. "2", "18", "esd")
   * @returns filtered array
   */
  static findByDepartment(courses: MitCourse[], dept: string): MitCourse[] {
    const d = dept.toLowerCase();
    return courses.filter((c) => c.department === d);
  }

  /**
   * Filter courses by relevance category.
   * @param courses - array of MitCourse
   * @param category - CourseRelevance value
   * @returns filtered array
   */
  static filterByRelevance(
    courses: MitCourse[],
    category: CourseRelevance
  ): MitCourse[] {
    return courses.filter((c) => c.relevance === category);
  }

  /**
   * Filter courses by semester.
   * @param courses - array of MitCourse
   * @param semester - semester string (e.g. "spring", "fall")
   * @returns filtered array
   */
  static filterBySemester(courses: MitCourse[], semester: string): MitCourse[] {
    const s = semester.toLowerCase();
    return courses.filter((c) => c.semester === s);
  }

  /**
   * Filter courses by year range (inclusive).
   * @param courses - array of MitCourse
   * @param minYear - minimum year (inclusive)
   * @param maxYear - maximum year (inclusive)
   * @returns filtered array
   */
  static filterByYearRange(
    courses: MitCourse[],
    minYear: number,
    maxYear: number
  ): MitCourse[] {
    return courses.filter((c) => c.year >= minYear && c.year <= maxYear);
  }

  // ========================================================================
  // PRIVATE HELPERS
  // ========================================================================

  /**
   * Scan a single source zone, collecting course entries from both root-level
   * and UPLOADED/FULL FILES subdirectories.
   */
  private static async _scanZone(
    zone: MitCourseSourceInfo
  ): Promise<MitCourse[]> {
    const courses: MitCourse[] = [];

    // Collect all relevant subdirectories to scan
    const dirsToScan: Array<{ dirPath: string; sourceName: string }> = [];

    if (zone.name === "root") {
      // Only root-level items (skip MIT COURSES 2..5, UPLOADED, and JSON files)
      dirsToScan.push({ dirPath: zone.path, sourceName: "root" });
    } else if (zone.name === "uploaded") {
      dirsToScan.push({ dirPath: zone.path, sourceName: "uploaded" });
    } else if (zone.name === "mc5") {
      // MC5 has FULL FILES (the main content) and UPLOADED (split archives, skip)
      dirsToScan.push({
        dirPath: path.join(zone.path, "FULL FILES"),
        sourceName: "mc5",
      });
    } else {
      // MC2, MC3, MC4: root items + UPLOADED or uploaded subdirectory
      dirsToScan.push({ dirPath: zone.path, sourceName: zone.name });
      // Check for UPLOADED or uploaded
      for (const sub of ["UPLOADED", "uploaded"]) {
        const subPath = path.join(zone.path, sub);
        try {
          const s = await stat(subPath);
          if (s.isDirectory()) {
            dirsToScan.push({ dirPath: subPath, sourceName: zone.name });
          }
        } catch {
          // subdirectory doesn't exist
        }
      }
    }

    for (const { dirPath, sourceName } of dirsToScan) {
      let rawEntries: string[];
      try {
        rawEntries = await readdir(dirPath);
      } catch {
        continue;
      }

      // Build a set of folder names and zip names for cross-reference
      const folderNames = new Set<string>();
      const zipNames = new Set<string>();

      for (const entry of rawEntries) {
        // Skip known non-course items
        if (entry.endsWith(".json")) continue;
        if (
          zone.name === "root" &&
          (entry.startsWith("MIT COURSES") || entry === "UPLOADED")
        )
          continue;
        // Skip split archive parts (MC5 UPLOADED)
        if (/\.zip\.\d+$/.test(entry)) continue;

        const fullPath = path.join(dirPath, entry);
        let s;
        try {
          s = await stat(fullPath);
        } catch {
          continue;
        }

        if (s.isDirectory()) {
          folderNames.add(entry);
        } else if (entry.endsWith(".zip")) {
          zipNames.add(entry.replace(/\.zip$/, ""));
        }
      }

      // Process folders (extracted courses)
      for (const folder of folderNames) {
        const parsed = parseSlug(folder);
        if (!parsed) continue;

        const folderPath = path.join(dirPath, folder);
        const fileCounts = await countFilesInDir(folderPath);
        const hasZip = zipNames.has(folder);

        courses.push({
          slug: folder,
          department: parsed.department,
          courseNumber: parsed.courseNumber,
          courseId: parsed.courseId,
          semester: parsed.semester,
          year: parsed.year,
          isExtracted: true,
          hasZip,
          totalFiles: fileCounts.total,
          filesByExtension: fileCounts.byExt,
          source: sourceName,
          entryPath: folderPath.replace(/\\/g, "/"),
          relevance: classifyRelevance(parsed.department, parsed.courseNumber),
        });

        // Remove from zipNames so we don't create a duplicate entry
        zipNames.delete(folder);
      }

      // Process zip-only courses (no extracted folder)
      for (const zipSlug of zipNames) {
        const parsed = parseSlug(zipSlug);
        if (!parsed) continue;

        const zipPath = path.join(dirPath, zipSlug + ".zip");

        courses.push({
          slug: zipSlug,
          department: parsed.department,
          courseNumber: parsed.courseNumber,
          courseId: parsed.courseId,
          semester: parsed.semester,
          year: parsed.year,
          isExtracted: false,
          hasZip: true,
          totalFiles: 0,
          filesByExtension: {},
          source: sourceName,
          entryPath: zipPath.replace(/\\/g, "/"),
          relevance: classifyRelevance(parsed.department, parsed.courseNumber),
        });
      }
    }

    return courses;
  }

  /**
   * Scan for pre-existing JSON index files in the MIT COURSES root.
   */
  private static async _scanIndexFiles(): Promise<ExistingIndexInfo[]> {
    const results: ExistingIndexInfo[] = [];

    for (const filename of KNOWN_INDEX_FILES) {
      const filePath = path.join(MIT_ROOT, filename);
      try {
        const s = await stat(filePath);
        if (!s.isFile()) continue;

        let parseable = false;
        let topLevelKeys: string[] = [];

        try {
          const raw = await readFile(filePath, "utf-8");
          const json = JSON.parse(raw);
          parseable = true;
          if (typeof json === "object" && json !== null && !Array.isArray(json)) {
            topLevelKeys = Object.keys(json);
          }
        } catch {
          // JSON parse failed
        }

        results.push({
          filename,
          filePath: filePath.replace(/\\/g, "/"),
          sizeBytes: s.size,
          parseable,
          topLevelKeys,
        });
      } catch {
        // file doesn't exist
      }
    }

    return results;
  }
}
