/**
 * PDFSourceRegistryEngine.ts
 *
 * PDF-EXT-MS0 U-PDF01: PDF Source Registry
 *
 * Manages a registry of PDF sources for knowledge extraction:
 * - Machining handbooks (Machinery's Handbook, Kalpakjian, Shaw)
 * - Tool manufacturer catalogs (Sandvik, Kennametal, Walter, ISCAR)
 * - MIT OCW course materials
 * - Academic papers (Merchant, Kienzle, Taylor, Altintas)
 * - CAM software documentation (HyperMILL, Mastercam, Fusion)
 *
 * @module engines/PDFSourceRegistryEngine
 */

import { promises as fs } from "fs";
import path from "path";
import { logger } from "../utils/Logger.js";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface PDFSource {
  id: string;
  title: string;
  category: PDFSourceCategory;
  priority: 1 | 2 | 3; // 1=highest
  path?: string;
  url?: string;
  status: "pending" | "downloaded" | "extracted" | "indexed" | "error";
  extractionTargets: ExtractionTarget[];
  metadata: PDFSourceMetadata;
  lastProcessed?: string;
  extractedItems?: number;
}

export type PDFSourceCategory =
  | "handbook"
  | "catalog"
  | "academic"
  | "mit_course"
  | "ai_textbook" // cyrilXBT 12 free MIT-Press AI/ML textbooks (corpus-as-permanent-reasoning-layer, 2026-06-08)
  | "cam_documentation"
  | "standards"
  | "paper";

export type ExtractionTarget =
  | "cutting_data_tables"
  | "formulas"
  | "material_properties"
  | "tool_specifications"
  | "machining_parameters"
  | "threading_data"
  | "tolerance_charts"
  | "surface_finish_data"
  | "gd_t_symbols"
  | "problem_solutions"
  | "diagrams";

export interface PDFSourceMetadata {
  author?: string;
  publisher?: string;
  edition?: string;
  year?: number;
  isbn?: string;
  pages?: number;
  fileSize?: number;
  language?: string;
  courseId?: string; // For MIT courses
  topics?: string[]; // Subject tags for retrieval/routing (ai_textbook entries)
  source?: string; // Provenance tag (e.g. "cyrilXBT-12-mit-ai-textbooks-2026-06-08")
  note?: string; // Curator annotation (e.g. hub-entry disambiguation)
}

export interface PDFExtractionResult {
  sourceId: string;
  timestamp: string;
  tables: ExtractedTable[];
  formulas: ExtractedFormula[];
  materialData: ExtractedMaterialData[];
  toolData: ExtractedToolData[];
  errors: string[];
}

export interface ExtractedTable {
  id: string;
  title: string;
  page: number;
  rows: number;
  columns: number;
  headers: string[];
  data: string[][];
  confidence: number;
  targetRegistry?: string;
}

export interface ExtractedFormula {
  id: string;
  name: string;
  latex?: string;
  plainText: string;
  variables: Record<string, string>;
  page: number;
  confidence: number;
  domain: string;
}

export interface ExtractedMaterialData {
  material: string;
  isoGroup?: string;
  properties: Record<string, number | string>;
  source: string;
  page: number;
}

export interface ExtractedToolData {
  toolType: string;
  manufacturer?: string;
  specifications: Record<string, number | string>;
  cuttingData?: Record<string, number>;
  source: string;
  page: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// PDF SOURCE REGISTRY
// ═══════════════════════════════════════════════════════════════════════════

const PRIORITY_SOURCES: PDFSource[] = [
  // ─── TIER 1: Essential Handbooks ─────────────────────────────────────────
  {
    id: "machinery-handbook-31",
    title: "Machinery's Handbook 31st Edition",
    category: "handbook",
    priority: 1,
    status: "pending",
    extractionTargets: [
      "cutting_data_tables",
      "formulas",
      "material_properties",
      "threading_data",
      "tolerance_charts",
      "surface_finish_data",
    ],
    metadata: {
      publisher: "Industrial Press",
      edition: "31st",
      year: 2020,
      pages: 2896,
      language: "en",
    },
  },
  {
    id: "kalpakjian-manufacturing-7",
    title: "Manufacturing Engineering and Technology (Kalpakjian)",
    category: "handbook",
    priority: 1,
    status: "pending",
    extractionTargets: [
      "formulas",
      "material_properties",
      "machining_parameters",
      "diagrams",
    ],
    metadata: {
      author: "Serope Kalpakjian, Steven Schmid",
      publisher: "Pearson",
      edition: "7th",
      year: 2014,
      language: "en",
    },
  },
  {
    id: "shaw-metal-cutting-2",
    title: "Metal Cutting Principles (Shaw)",
    category: "academic",
    priority: 1,
    status: "pending",
    extractionTargets: ["formulas", "cutting_data_tables", "diagrams"],
    metadata: {
      author: "Milton C. Shaw",
      publisher: "Oxford University Press",
      edition: "2nd",
      year: 2005,
      language: "en",
    },
  },

  // ─── TIER 1: Tool Manufacturer Catalogs ──────────────────────────────────
  {
    id: "sandvik-main-catalog",
    title: "Sandvik Coromant Main Catalog",
    category: "catalog",
    priority: 1,
    status: "pending",
    extractionTargets: [
      "cutting_data_tables",
      "tool_specifications",
      "machining_parameters",
    ],
    metadata: {
      publisher: "Sandvik Coromant",
      year: 2024,
      language: "en",
    },
  },
  {
    id: "kennametal-master-catalog",
    title: "Kennametal Master Catalog",
    category: "catalog",
    priority: 1,
    status: "pending",
    extractionTargets: [
      "cutting_data_tables",
      "tool_specifications",
      "machining_parameters",
    ],
    metadata: {
      publisher: "Kennametal",
      year: 2024,
      language: "en",
    },
  },
  {
    id: "iscar-master-catalog",
    title: "ISCAR Master Catalog",
    category: "catalog",
    priority: 1,
    status: "pending",
    extractionTargets: [
      "cutting_data_tables",
      "tool_specifications",
      "machining_parameters",
    ],
    metadata: {
      publisher: "ISCAR",
      year: 2024,
      language: "en",
    },
  },
  {
    id: "walter-tools-catalog",
    title: "Walter Tools General Catalog",
    category: "catalog",
    priority: 1,
    status: "pending",
    extractionTargets: [
      "cutting_data_tables",
      "tool_specifications",
      "machining_parameters",
    ],
    metadata: {
      publisher: "Walter AG",
      year: 2024,
      language: "en",
    },
  },

  // ─── TIER 2: MIT OCW Courses ─────────────────────────────────────────────
  {
    id: "mit-2-810",
    title: "MIT 2.810 Manufacturing Processes",
    category: "mit_course",
    priority: 2,
    status: "pending",
    extractionTargets: ["formulas", "problem_solutions", "diagrams"],
    metadata: {
      publisher: "MIT OpenCourseWare",
      courseId: "2.810",
      language: "en",
    },
  },
  {
    id: "mit-2-830",
    title: "MIT 2.830 Control of Manufacturing",
    category: "mit_course",
    priority: 2,
    status: "pending",
    extractionTargets: ["formulas", "problem_solutions"],
    metadata: {
      publisher: "MIT OpenCourseWare",
      courseId: "2.830",
      language: "en",
    },
  },
  {
    id: "mit-6-867",
    title: "MIT 6.867 Machine Learning",
    category: "mit_course",
    priority: 2,
    status: "pending",
    extractionTargets: ["formulas", "problem_solutions"],
    metadata: {
      publisher: "MIT OpenCourseWare",
      courseId: "6.867",
      language: "en",
    },
  },

  // ─── TIER 2: Academic Papers ─────────────────────────────────────────────
  {
    id: "paper-kienzle-1952",
    title: "Kienzle - Die Bestimmung von Kräften (1952)",
    category: "paper",
    priority: 2,
    status: "pending",
    extractionTargets: ["formulas"],
    metadata: {
      author: "Otto Kienzle",
      year: 1952,
      language: "de",
    },
  },
  {
    id: "paper-taylor-1907",
    title: "Taylor - On the Art of Cutting Metals (1907)",
    category: "paper",
    priority: 2,
    status: "pending",
    extractionTargets: ["formulas", "cutting_data_tables"],
    metadata: {
      author: "Frederick Winslow Taylor",
      year: 1907,
      language: "en",
    },
  },
  {
    id: "paper-merchant-1945",
    title: "Merchant - Mechanics of the Metal Cutting Process (1945)",
    category: "paper",
    priority: 2,
    status: "pending",
    extractionTargets: ["formulas", "diagrams"],
    metadata: {
      author: "M. Eugene Merchant",
      year: 1945,
      language: "en",
    },
  },
  {
    id: "altintas-manufacturing-automation",
    title: "Manufacturing Automation (Altintas)",
    category: "academic",
    priority: 2,
    status: "pending",
    extractionTargets: ["formulas", "cutting_data_tables", "diagrams"],
    metadata: {
      author: "Yusuf Altintas",
      publisher: "Cambridge University Press",
      edition: "2nd",
      year: 2012,
      language: "en",
    },
  },

  // ─── TIER 2: CAM Documentation ───────────────────────────────────────────
  {
    id: "hypermill-manual",
    title: "hyperMILL Manual",
    category: "cam_documentation",
    priority: 2,
    path: "H:/prism/resources/PDF/hyperMILL/hyperMILL_Manual-en.pdf",
    status: "downloaded",
    extractionTargets: ["machining_parameters", "tool_specifications"],
    metadata: {
      publisher: "OPEN MIND Technologies",
      language: "en",
    },
  },
  {
    id: "hypercad-s-manual",
    title: "hyperCAD-S Manual",
    category: "cam_documentation",
    priority: 2,
    path: "H:/prism/resources/PDF/hyperCAD-S/hyperCAD-S_Manual-en.pdf",
    status: "downloaded",
    extractionTargets: ["diagrams"],
    metadata: {
      publisher: "OPEN MIND Technologies",
      language: "en",
    },
  },

  // ─── TIER 3: Standards ───────────────────────────────────────────────────
  {
    id: "iso-513-tool-materials",
    title: "ISO 513 - Tool Materials Classification",
    category: "standards",
    priority: 3,
    status: "pending",
    extractionTargets: ["material_properties", "cutting_data_tables"],
    metadata: {
      publisher: "ISO",
      language: "en",
    },
  },
  {
    id: "iso-1832-indexable-inserts",
    title: "ISO 1832 - Indexable Inserts Designation",
    category: "standards",
    priority: 3,
    status: "pending",
    extractionTargets: ["tool_specifications"],
    metadata: {
      publisher: "ISO",
      language: "en",
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class PDFSourceRegistryEngine {
  private sources: Map<string, PDFSource> = new Map();
  private registryPath: string;

  constructor() {
    this.registryPath = path.join(
      process.cwd(),
      "data",
      "pdf-sources",
      "registry.json"
    );

    // Initialize with priority sources
    for (const source of PRIORITY_SOURCES) {
      this.sources.set(source.id, source);
    }
  }

  async init(): Promise<void> {
    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(this.registryPath), { recursive: true });

      // Try to load existing registry
      try {
        const data = await fs.readFile(this.registryPath, "utf8");
        const saved = JSON.parse(data) as { sources: PDFSource[] };
        for (const source of saved.sources) {
          this.sources.set(source.id, source);
        }
        logger.info(
          `[PDFSourceRegistry] Loaded ${this.sources.size} sources from registry`
        );
      } catch {
        // No existing registry, use defaults
        await this.save();
        logger.info(
          `[PDFSourceRegistry] Initialized with ${this.sources.size} priority sources`
        );
      }
    } catch (error) {
      logger.error(`[PDFSourceRegistry] Init error: ${error}`);
    }
  }

  async save(): Promise<void> {
    const data = {
      version: "1.0.0",
      updated: new Date().toISOString(),
      sources: Array.from(this.sources.values()),
    };
    await fs.writeFile(this.registryPath, JSON.stringify(data, null, 2));
  }

  // ─── Query Methods ─────────────────────────────────────────────────────

  getAll(): PDFSource[] {
    return Array.from(this.sources.values());
  }

  getById(id: string): PDFSource | undefined {
    return this.sources.get(id);
  }

  getByCategory(category: PDFSourceCategory): PDFSource[] {
    return this.getAll().filter((s) => s.category === category);
  }

  getByPriority(priority: 1 | 2 | 3): PDFSource[] {
    return this.getAll().filter((s) => s.priority === priority);
  }

  getByStatus(status: PDFSource["status"]): PDFSource[] {
    return this.getAll().filter((s) => s.status === status);
  }

  getPending(): PDFSource[] {
    return this.getByStatus("pending");
  }

  getDownloaded(): PDFSource[] {
    return this.getByStatus("downloaded");
  }

  getExtracted(): PDFSource[] {
    return this.getByStatus("extracted");
  }

  // ─── Management Methods ────────────────────────────────────────────────

  async addSource(source: PDFSource): Promise<void> {
    this.sources.set(source.id, source);
    await this.save();
    logger.info(`[PDFSourceRegistry] Added source: ${source.id}`);
  }

  async updateStatus(
    id: string,
    status: PDFSource["status"],
    extractedItems?: number
  ): Promise<void> {
    const source = this.sources.get(id);
    if (source) {
      source.status = status;
      source.lastProcessed = new Date().toISOString();
      if (extractedItems !== undefined) {
        source.extractedItems = extractedItems;
      }
      await this.save();
      logger.info(`[PDFSourceRegistry] Updated ${id} status to ${status}`);
    }
  }

  async setPath(id: string, filePath: string): Promise<void> {
    const source = this.sources.get(id);
    if (source) {
      source.path = filePath;
      source.status = "downloaded";
      await this.save();
    }
  }

  // ─── Discovery Methods ─────────────────────────────────────────────────

  async discoverLocalPDFs(searchPath: string): Promise<PDFSource[]> {
    const discovered: PDFSource[] = [];

    try {
      const files = await this.findPDFs(searchPath);

      for (const file of files) {
        // Check if already registered
        const existing = this.getAll().find((s) => s.path === file);
        if (existing) continue;

        // Create new source entry
        const source: PDFSource = {
          id: `local-${path.basename(file, ".pdf").toLowerCase().replace(/\s+/g, "-")}`,
          title: path.basename(file, ".pdf"),
          category: this.inferCategory(file),
          priority: 3,
          path: file,
          status: "downloaded",
          extractionTargets: this.inferExtractionTargets(file),
          metadata: {
            language: "en",
          },
        };

        discovered.push(source);
        this.sources.set(source.id, source);
      }

      if (discovered.length > 0) {
        await this.save();
        logger.info(
          `[PDFSourceRegistry] Discovered ${discovered.length} new PDFs`
        );
      }
    } catch (error) {
      logger.error(`[PDFSourceRegistry] Discovery error: ${error}`);
    }

    return discovered;
  }

  private async findPDFs(dir: string): Promise<string[]> {
    const results: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          const subResults = await this.findPDFs(fullPath);
          results.push(...subResults);
        } else if (
          entry.isFile() &&
          entry.name.toLowerCase().endsWith(".pdf")
        ) {
          results.push(fullPath);
        }
      }
    } catch {
      // Ignore permission errors
    }

    return results;
  }

  private inferCategory(filePath: string): PDFSourceCategory {
    const lower = filePath.toLowerCase();

    if (lower.includes("catalog") || lower.includes("sandvik") || lower.includes("kennametal")) {
      return "catalog";
    }
    if (lower.includes("mit") || lower.includes("course")) {
      return "mit_course";
    }
    if (lower.includes("hypermill") || lower.includes("mastercam") || lower.includes("fusion")) {
      return "cam_documentation";
    }
    if (lower.includes("iso") || lower.includes("standard")) {
      return "standards";
    }
    if (lower.includes("handbook")) {
      return "handbook";
    }

    return "handbook";
  }

  private inferExtractionTargets(filePath: string): ExtractionTarget[] {
    const lower = filePath.toLowerCase();
    const targets: ExtractionTarget[] = [];

    if (lower.includes("tool") || lower.includes("catalog")) {
      targets.push("tool_specifications", "cutting_data_tables");
    }
    if (lower.includes("material")) {
      targets.push("material_properties");
    }
    if (lower.includes("thread")) {
      targets.push("threading_data");
    }
    if (lower.includes("tolerance") || lower.includes("gd")) {
      targets.push("tolerance_charts", "gd_t_symbols");
    }

    // Default targets
    if (targets.length === 0) {
      targets.push("formulas", "cutting_data_tables");
    }

    return targets;
  }

  // ─── Statistics ────────────────────────────────────────────────────────

  getStats(): {
    total: number;
    byCategory: Record<PDFSourceCategory, number>;
    byStatus: Record<PDFSource["status"], number>;
    byPriority: Record<number, number>;
    totalExtracted: number;
  } {
    const sources = this.getAll();

    const byCategory: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byPriority: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    let totalExtracted = 0;

    for (const source of sources) {
      byCategory[source.category] = (byCategory[source.category] || 0) + 1;
      byStatus[source.status] = (byStatus[source.status] || 0) + 1;
      byPriority[source.priority]++;
      totalExtracted += source.extractedItems || 0;
    }

    return {
      total: sources.length,
      byCategory: byCategory as Record<PDFSourceCategory, number>,
      byStatus: byStatus as Record<PDFSource["status"], number>,
      byPriority,
      totalExtracted,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export const pdfSourceRegistryEngine = new PDFSourceRegistryEngine();
