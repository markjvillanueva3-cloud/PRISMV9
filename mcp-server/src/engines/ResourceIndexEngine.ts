/**
 * ResourceIndexEngine — H: Drive Resource Mapping & Discovery
 *
 * Indexes all resources available on the H: drive:
 * - PDF documents
 * - MIT courses
 * - Manufacturer catalogs
 * - Machine models
 * - Post processors
 * - JM DIE programs
 *
 * Tracks extraction status and provides search interface.
 *
 * @module engines/ResourceIndexEngine
 */

import { log } from "../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// TYPES
// ============================================================================

export type ResourceType =
  | "pdf"
  | "video"
  | "course"
  | "catalog"
  | "program"
  | "cad"
  | "post"
  | "model"
  | "spreadsheet"
  | "archive"
  | "other";

export type ExtractionStatus = "not_started" | "partial" | "completed" | "failed";

export interface ResourceEntry {
  id: string;
  name: string;
  path: string;
  type: ResourceType;
  size?: number;
  fileCount?: number;
  extractionStatus: ExtractionStatus;
  tipsGenerated?: number;
  lastIndexed: string;
  priority: "high" | "medium" | "low";
  metadata?: Record<string, unknown>;
}

export interface ResourceFolder {
  path: string;
  name: string;
  type: ResourceType;
  fileCount: number;
  subfolders: number;
  status: ExtractionStatus;
  priority: "high" | "medium" | "low";
}

export interface ResourceIndex {
  schemaVersion: "1.0.0";
  lastUpdated: string;
  basePaths: string[];
  totalFiles: number;
  totalFolders: number;
  byType: Record<ResourceType, number>;
  folders: ResourceFolder[];
  extractionProgress: {
    completed: number;
    partial: number;
    notStarted: number;
  };
}

// ============================================================================
// STATIC DATA — Known resource folders
// ============================================================================

const KNOWN_RESOURCE_FOLDERS: Array<{
  path: string;
  name: string;
  type: ResourceType;
  status: ExtractionStatus;
  priority: "high" | "medium" | "low";
}> = [
  // High priority — rich content
  { path: "MIT COURSES", name: "MIT OpenCourseWare", type: "course", status: "partial", priority: "high" },
  { path: "MANUFACTURER_CATALOGS", name: "Manufacturer Catalogs", type: "catalog", status: "not_started", priority: "high" },
  { path: "MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS", name: "Machining Formulas", type: "pdf", status: "partial", priority: "high" },
  { path: "PDF", name: "Technical PDFs", type: "pdf", status: "partial", priority: "high" },

  // Medium priority — useful content
  { path: "HYPERMILL", name: "hyperMILL Scripts", type: "program", status: "partial", priority: "medium" },
  { path: "MasterCam", name: "MasterCam Resources", type: "pdf", status: "completed", priority: "medium" },
  { path: "OKUMA MULTUS PDFS", name: "Okuma Documentation", type: "pdf", status: "completed", priority: "medium" },
  { path: "FUSION360", name: "Fusion 360 Resources", type: "cad", status: "not_started", priority: "medium" },
  { path: "FUSION POSTS", name: "Fusion Post Processors", type: "post", status: "not_started", priority: "medium" },
  { path: "FUSION BASIC POSTS", name: "Basic Fusion Posts", type: "post", status: "not_started", priority: "medium" },
  { path: "POSTS AND MACHINES", name: "Post Processors", type: "post", status: "not_started", priority: "medium" },
  { path: "OPEN MIND", name: "OPEN MIND / hyperMILL", type: "pdf", status: "not_started", priority: "medium" },

  // Lower priority — reference material
  { path: "MACHINE_SIMULATION_MODELS", name: "Machine Simulation Models", type: "model", status: "not_started", priority: "low" },
  { path: "GENERIC MACHINE MODELS", name: "Generic Machine Models", type: "model", status: "not_started", priority: "low" },
  { path: "GENERIC_MACHINE_MODELS", name: "Generic Machine Models Alt", type: "model", status: "not_started", priority: "low" },
  { path: "CAD FILES", name: "CAD Files", type: "cad", status: "not_started", priority: "low" },
  { path: "PART MODELS FOR LEARNING ENGINE", name: "Part Models", type: "cad", status: "not_started", priority: "low" },
  { path: "MACRO PROGRAMS", name: "Macro Programs", type: "program", status: "not_started", priority: "low" },
  { path: "MULTUS PROGRAMS", name: "MULTUS Programs", type: "program", status: "not_started", priority: "low" },
  { path: "PRISM CAD-CAM TRAINING", name: "PRISM Training", type: "pdf", status: "not_started", priority: "low" },

  // Training folders
  { path: "1- Basic Training Day 1", name: "Training Day 1", type: "pdf", status: "not_started", priority: "low" },
  { path: "2- Basic Training Day 2", name: "Training Day 2", type: "pdf", status: "not_started", priority: "low" },
  { path: "3- Basic Training Day 3", name: "Training Day 3", type: "pdf", status: "not_started", priority: "low" },

  // U-AWR17 expansion — previously-dark folders surfaced by 5-agent scrutiny
  // CAD / Solid Modeling (53% of resources were unknown to ResourceIndex)
  { path: "SOLIDWORKS", name: "SOLIDWORKS Files (14k+)", type: "cad", status: "not_started", priority: "high" },
  { path: "RESOURCE PDFS", name: "Resource PDFs (3k+)", type: "pdf", status: "not_started", priority: "high" },
  { path: "HSMWorks 2026", name: "HSMWorks 2026 Library", type: "program", status: "not_started", priority: "medium" },
  { path: "Virtual_Machining_Center", name: "Virtual Machining Center", type: "model", status: "not_started", priority: "medium" },
  { path: "WORKHOLDING AND FIXTURE CATALOGS", name: "Workholding Catalogs", type: "catalog", status: "not_started", priority: "medium" },
  { path: "SOLIDCAM", name: "SolidCAM Resources", type: "program", status: "not_started", priority: "medium" },
  { path: "TOOL_HOLDER_CAD_FILES", name: "Tool Holder CAD", type: "cad", status: "not_started", priority: "medium" },
  { path: "excel_extract", name: "Excel Extractions", type: "catalog", status: "not_started", priority: "medium" },
  { path: "STEP FILES", name: "STEP CAD Files", type: "cad", status: "not_started", priority: "low" },
  { path: "IGES", name: "IGES CAD Files", type: "cad", status: "not_started", priority: "low" },

  // Manufacturer references
  { path: "SANDVIK", name: "Sandvik Materials", type: "catalog", status: "partial", priority: "medium" },
  { path: "KENNAMETAL", name: "Kennametal Materials", type: "catalog", status: "partial", priority: "medium" },
  { path: "ISCAR", name: "Iscar Materials", type: "catalog", status: "partial", priority: "medium" },
  { path: "SECO", name: "Seco Materials", type: "catalog", status: "not_started", priority: "low" },
  { path: "MITSUBISHI MATERIALS", name: "Mitsubishi Materials", type: "catalog", status: "not_started", priority: "low" },
  { path: "GUHRING", name: "Guhring Catalog", type: "catalog", status: "partial", priority: "low" },
  { path: "OSG", name: "OSG Catalog", type: "catalog", status: "not_started", priority: "low" },

  // Program archives
  { path: "NC PROGRAMS ARCHIVE", name: "NC Programs Archive", type: "program", status: "not_started", priority: "low" },
  { path: "MACRO LIBRARY", name: "Macro Library", type: "program", status: "not_started", priority: "low" },

  // Simulation / Training
  { path: "CNC SIMULATOR", name: "CNC Simulator Assets", type: "model", status: "not_started", priority: "low" },
  { path: "VIDEOS", name: "Training Videos", type: "video", status: "partial", priority: "medium" },
];

// JM DIE program folders — expanded per U-AWR18 (8 → 16) to cover previously
// orphaned program sets. Scrutiny found ~722 programs orphaned (MATTHEW 698,
// QUEUE 20, JM DIE COMPANY 4) and additional setup/project folders.
const JM_DIE_FOLDERS = [
  "CNC LATHE",
  "CNC MILL HAAS",
  "CNC OKUMA MULTUS",
  "WIRE EDM",
  "OKUMA",
  "LATHE",
  "HAAS-HURCO",
  "ROKU-ROKU",
  // U-AWR18 expansion: previously orphaned folders
  "MATTHEW",
  "QUEUE",
  "JM DIE COMPANY",
  "SETUPS",
  "BASEBALL PARTS",
  "GENERAL BANDAGES",
  "REVERSE ENGINEERING",
  "PROGRAMS",
];

/** Recognized CNC program extensions (U-AWR18 — includes Mastercam formats) */
const PROGRAM_EXTENSIONS = [
  ".nc", ".NC",          // Standard G-code
  ".MIN", ".min",        // Okuma min format
  ".mcx", ".MCX",        // Mastercam older
  ".mcx-8",              // Mastercam X8
  ".mcam",               // Mastercam 2017+
];

/** Check whether filename matches a CNC program extension */
function isProgramFile(filename: string): boolean {
  for (const ext of PROGRAM_EXTENSIONS) {
    if (filename.endsWith(ext)) return true;
  }
  return false;
}

// ============================================================================
// ENGINE
// ============================================================================

export class ResourceIndexEngine {
  private baseResourcePath: string;
  private jmDiePath: string;
  private indexCache: ResourceIndex | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL_MS = 600000; // 10 minutes

  constructor() {
    this.baseResourcePath = "H:/prism/resources";
    this.jmDiePath = "H:/PRISM/JM DIE";
    log.info("[ResourceIndex] Initialized — H: drive resource mapping");
  }

  // ============================================================================
  // INDEX METHODS
  // ============================================================================

  /**
   * Get full resource index
   */
  async getIndex(forceRefresh: boolean = false): Promise<ResourceIndex> {
    const now = Date.now();
    if (!forceRefresh && this.indexCache && now - this.cacheTimestamp < this.CACHE_TTL_MS) {
      return this.indexCache;
    }

    log.info("[ResourceIndex] Building resource index...");

    const folders: ResourceFolder[] = [];
    let totalFiles = 0;
    let totalFolders = 0;
    const byType: Record<ResourceType, number> = {
      pdf: 0,
      video: 0,
      course: 0,
      catalog: 0,
      program: 0,
      cad: 0,
      post: 0,
      model: 0,
      spreadsheet: 0,
      archive: 0,
      other: 0,
    };

    // Index known resource folders
    for (const folder of KNOWN_RESOURCE_FOLDERS) {
      const fullPath = path.join(this.baseResourcePath, folder.path);
      const stats = this.getFolderStats(fullPath);

      folders.push({
        path: folder.path,
        name: folder.name,
        type: folder.type,
        fileCount: stats.fileCount,
        subfolders: stats.subfolderCount,
        status: folder.status,
        priority: folder.priority,
      });

      totalFiles += stats.fileCount;
      totalFolders += stats.subfolderCount + 1;
      byType[folder.type] += stats.fileCount;
    }

    // Count JM DIE programs
    const jmDieStats = this.getJMDieStats();
    totalFiles += jmDieStats.totalPrograms;
    byType.program += jmDieStats.totalPrograms;

    const extractionProgress = {
      completed: folders.filter((f) => f.status === "completed").length,
      partial: folders.filter((f) => f.status === "partial").length,
      notStarted: folders.filter((f) => f.status === "not_started").length,
    };

    const index: ResourceIndex = {
      schemaVersion: "1.0.0",
      lastUpdated: new Date().toISOString(),
      basePaths: [this.baseResourcePath, this.jmDiePath],
      totalFiles,
      totalFolders,
      byType,
      folders,
      extractionProgress,
    };

    this.indexCache = index;
    this.cacheTimestamp = now;

    return index;
  }

  /**
   * Get folders that need extraction
   */
  async getUnextractedFolders(priorityFilter?: "high" | "medium" | "low"): Promise<ResourceFolder[]> {
    const index = await this.getIndex();
    let folders = index.folders.filter((f) => f.status === "not_started" || f.status === "partial");

    if (priorityFilter) {
      folders = folders.filter((f) => f.priority === priorityFilter);
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    folders.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return folders;
  }

  /**
   * Search resources by keyword
   */
  async search(query: string, typeFilter?: ResourceType): Promise<ResourceEntry[]> {
    const index = await this.getIndex();
    const normalized = query.toLowerCase();
    const results: ResourceEntry[] = [];

    for (const folder of index.folders) {
      if (typeFilter && folder.type !== typeFilter) continue;

      if (
        folder.name.toLowerCase().includes(normalized) ||
        folder.path.toLowerCase().includes(normalized)
      ) {
        results.push({
          id: folder.path.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase(),
          name: folder.name,
          path: path.join(this.baseResourcePath, folder.path),
          type: folder.type,
          fileCount: folder.fileCount,
          extractionStatus: folder.status,
          lastIndexed: new Date().toISOString(),
          priority: folder.priority,
        });
      }
    }

    return results;
  }

  /**
   * Get extraction summary
   */
  async getExtractionSummary(): Promise<string> {
    const index = await this.getIndex();

    const lines = [
      "═══════════════════════════════════════════════════════",
      "              H: DRIVE RESOURCE EXTRACTION STATUS",
      "═══════════════════════════════════════════════════════",
      "",
      `Total Files: ${index.totalFiles.toLocaleString()} | Folders: ${index.totalFolders}`,
      "",
      "BY TYPE:",
      `  PDFs: ${index.byType.pdf} | Programs: ${index.byType.program} | Courses: ${index.byType.course}`,
      `  CAD: ${index.byType.cad} | Posts: ${index.byType.post} | Catalogs: ${index.byType.catalog}`,
      "",
      "EXTRACTION PROGRESS:",
      `  Completed: ${index.extractionProgress.completed}`,
      `  Partial: ${index.extractionProgress.partial}`,
      `  Not Started: ${index.extractionProgress.notStarted}`,
      "",
      "HIGH PRIORITY (NOT EXTRACTED):",
    ];

    const highPriority = index.folders.filter(
      (f) => f.priority === "high" && f.status !== "completed"
    );
    for (const folder of highPriority) {
      lines.push(`  • ${folder.name}: ${folder.fileCount} files [${folder.status}]`);
    }

    lines.push("");
    lines.push("Use /pdf-learn [folder] to extract knowledge");
    lines.push("═══════════════════════════════════════════════════════");

    return lines.join("\n");
  }

  /**
   * Mark folder as extracted
   */
  markExtracted(folderPath: string, tipsGenerated: number): void {
    const folder = KNOWN_RESOURCE_FOLDERS.find((f) => f.path === folderPath);
    if (folder) {
      folder.status = "completed";
      // NOTE: in-process mutation only — not persisted across restarts.
      // For durable status, update mcp-server/data/state/extraction-log.json
      // via DuplicationGuardEngine.recordExtraction().
      log.info(`[ResourceIndex] In-memory: marked ${folderPath} extracted (${tipsGenerated} tips). Persist via extraction-log.json for durability.`);
    }
    // Invalidate cache
    this.indexCache = null;
  }

  // ============================================================================
  // JM DIE SPECIFIC
  // ============================================================================

  /**
   * Get JM DIE folder structure
   */
  getJMDieFolders(): Array<{ name: string; path: string; programCount: number }> {
    const results: Array<{ name: string; path: string; programCount: number }> = [];

    for (const folder of JM_DIE_FOLDERS) {
      const fullPath = path.join(this.jmDiePath, folder);
      const count = this.countProgramsInDir(fullPath);
      results.push({
        name: folder,
        path: fullPath,
        programCount: count,
      });
    }

    return results;
  }

  /**
   * Get JM DIE program patterns (for analysis)
   */
  async getJMDieProgramSample(machineType: string, count: number = 10): Promise<string[]> {
    if (!JM_DIE_FOLDERS.includes(machineType)) {
      throw new Error(`[ResourceIndex] Invalid machineType "${machineType}" — must be one of: ${JM_DIE_FOLDERS.join(", ")}`);
    }

    const fullPath = path.resolve(this.jmDiePath, machineType);
    const rootResolved = path.resolve(this.jmDiePath);
    if (!fullPath.startsWith(rootResolved + path.sep) && fullPath !== rootResolved) {
      throw new Error(`[ResourceIndex] Path traversal rejected: ${machineType}`);
    }

    const programs: string[] = [];

    try {
      const files = fs.readdirSync(fullPath).filter(isProgramFile);

      for (const file of files.slice(0, count)) {
        const content = fs.readFileSync(path.join(fullPath, file), "utf-8");
        programs.push(content.slice(0, 500)); // First 500 chars
      }
    } catch {
      log.warn(`[ResourceIndex] Could not read JM DIE programs from ${machineType}`);
    }

    return programs;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private getFolderStats(folderPath: string): { fileCount: number; subfolderCount: number } {
    try {
      if (!fs.existsSync(folderPath)) {
        return { fileCount: 0, subfolderCount: 0 };
      }

      let fileCount = 0;
      let subfolderCount = 0;

      const items = fs.readdirSync(folderPath);
      for (const item of items) {
        const itemPath = path.join(folderPath, item);
        try {
          const stat = fs.statSync(itemPath);
          if (stat.isDirectory()) {
            subfolderCount++;
          } else {
            fileCount++;
          }
        } catch {
          // Skip inaccessible items
        }
      }

      return { fileCount, subfolderCount };
    } catch {
      return { fileCount: 0, subfolderCount: 0 };
    }
  }

  private getJMDieStats(): { totalPrograms: number; byMachine: Record<string, number> } {
    const byMachine: Record<string, number> = {};
    let totalPrograms = 0;

    for (const folder of JM_DIE_FOLDERS) {
      const count = this.countProgramsInDir(path.join(this.jmDiePath, folder));
      byMachine[folder] = count;
      totalPrograms += count;
    }

    return { totalPrograms, byMachine };
  }

  private countProgramsInDir(dirPath: string): number {
    try {
      if (!fs.existsSync(dirPath)) return 0;

      let count = 0;
      const files = fs.readdirSync(dirPath);

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        try {
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            count += this.countProgramsInDir(filePath);
          } else if (isProgramFile(file)) {
            count++;
          }
        } catch {
          // Skip inaccessible
        }
      }

      return count;
    } catch {
      return 0;
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const resourceIndexEngine = new ResourceIndexEngine();
