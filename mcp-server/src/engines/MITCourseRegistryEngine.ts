/**
 * MITCourseRegistryEngine.ts
 * PDF-EXT-MS2 U-PDF10: MIT OCW Course Registry
 *
 * Loads and manages MIT OpenCourseWare content for PRISM knowledge augmentation.
 * Maps academic algorithms to PRISM engines via ALGORITHM_REGISTRY.json.
 */

import { BaseEngine } from "./BaseEngine.js";
import { logger } from "../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// Types
// ============================================================================

export interface AlgorithmMapping {
  name: string;
  course: string;
  prismEngines: string[];
}

export interface CourseMetadata {
  courseId: string;
  title: string;
  term?: string;
  year?: string;
  level?: string[];
  instructors?: Array<{
    first_name: string;
    last_name: string;
    title: string;
  }>;
  topics?: string[][];
  learningResourceTypes?: string[];
  description?: string;
}

export interface CourseResources {
  pdfs: number;
  lectures: number;
  assignments: number;
  videos: number;
  total: number;
}

export interface CourseEntry {
  type: "extracted" | "archived";
  courseId: string;
  path: string;
  hasContent: boolean;
  categories: string[];
  metadata: CourseMetadata | null;
  resources: CourseResources | null;
  prismRelevant: boolean;
  algorithmCount?: number;
}

export interface AlgorithmCategory {
  [subcategory: string]: {
    algorithms?: AlgorithmMapping[];
  } | AlgorithmMapping[];
}

export interface AlgorithmRegistry {
  version: string;
  created: string;
  description: string;
  totalAlgorithms: number;
  categories: {
    [category: string]: AlgorithmCategory;
  };
  coverage: {
    totalPrismEngines: number;
    enginesMapped: number;
    coveragePercent: number;
  };
}

export interface CourseIndex {
  version: string;
  created: string;
  description: string;
  totalCourses: number;
  coursesByCategory: {
    [category: string]: {
      priority: string;
      description: string;
      courses: Array<{
        id: string;
        name: string;
        file?: string;
        extracted?: boolean;
        topics: string[];
      }>;
    };
  };
  prismMapping: {
    [engine: string]: string[];
  };
}

export interface PRISMCourseCatalog {
  scanDate: string;
  rootPath: string;
  totalCourses: number;
  extracted: number;
  archived: number;
  byCategory: {
    [category: string]: string[];
  };
  courses: CourseEntry[];
}

export interface EngineAlgorithmMap {
  engineName: string;
  algorithms: Array<{
    name: string;
    course: string;
    category: string;
  }>;
}

// ============================================================================
// Engine
// ============================================================================

export class MITCourseRegistryEngine extends BaseEngine {
  private algorithmRegistry: AlgorithmRegistry | null = null;
  private courseIndex: CourseIndex | null = null;
  private courseCatalog: PRISMCourseCatalog | null = null;
  private initialized = false;

  // Path to MIT courses (configurable for testing)
  private coursesRoot: string;
  private resourcesPath: string;

  constructor(resourcesPath?: string) {
    super({
      name: "MITCourseRegistryEngine",
      version: "1.0.0",
      domain: "knowledge",
      description: "Loads and manages MIT OpenCourseWare content for PRISM knowledge augmentation",
    });
    // Default to actual resources path
    this.resourcesPath = resourcesPath || "H:/prism/resources/MIT COURSES";
    this.coursesRoot = this.resourcesPath;
  }

  getCapabilities(): import("./BaseEngine.js").EngineCapability[] {
    return [
      {
        name: "getAlgorithmsForEngine",
        description: "Get all MIT OCW algorithms mapped to a specific PRISM engine",
        input: "{ engineName: string }",
        output: "EngineAlgorithmMap",
      },
      {
        name: "getAlgorithmsByCourse",
        description: "Get all algorithms from a specific MIT course by courseId",
        input: "{ courseId: string }",
        output: "AlgorithmMapping[]",
      },
      {
        name: "getCoursesByCategory",
        description: "Get courses belonging to a named category",
        input: "{ category: string }",
        output: "Array<{ id, name, topics }>",
      },
      {
        name: "getStats",
        description: "Get overall registry statistics",
        output: "{ totalAlgorithms, totalCourses, extractedCourses, archivedCourses, coverage, categories, manufacturingAlgorithms }",
      },
    ];
  }

  validate(input: unknown): string | null {
    if (input === null || input === undefined) return null; // stats query requires no input
    if (typeof input !== "object") return "Input must be an object or null";
    return null;
  }

  protected async executeImpl(input: unknown): Promise<unknown> {
    // Default action: return overall registry stats.
    // Callers that need specific query methods invoke them directly.
    const params = (input ?? {}) as Record<string, unknown>;
    if (typeof params.engineName === "string") {
      return this.getAlgorithmsForEngine(params.engineName);
    }
    if (typeof params.courseId === "string") {
      return this.getAlgorithmsByCourse(params.courseId);
    }
    if (typeof params.category === "string") {
      return this.getCoursesByCategory(params.category);
    }
    return this.getStats();
  }

  /**
   * Initialize by loading all registry files
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load algorithm registry
      const algorithmPath = path.join(this.coursesRoot, "ALGORITHM_REGISTRY.json");
      if (fs.existsSync(algorithmPath)) {
        const raw = fs.readFileSync(algorithmPath, "utf-8");
        this.algorithmRegistry = JSON.parse(raw);
        logger.info(`[MITCourseRegistry] Loaded ${this.algorithmRegistry?.totalAlgorithms} algorithms`);
      }

      // Load course index
      const indexPath = path.join(this.coursesRoot, "MIT_COURSE_INDEX.json");
      if (fs.existsSync(indexPath)) {
        const raw = fs.readFileSync(indexPath, "utf-8");
        this.courseIndex = JSON.parse(raw);
        logger.info(`[MITCourseRegistry] Loaded ${this.courseIndex?.totalCourses} courses from index`);
      }

      // Load PRISM course catalog
      const catalogPath = path.join(this.coursesRoot, "PRISM_COURSE_CATALOG.json");
      if (fs.existsSync(catalogPath)) {
        const raw = fs.readFileSync(catalogPath, "utf-8");
        this.courseCatalog = JSON.parse(raw);
        logger.info(`[MITCourseRegistry] Loaded catalog: ${this.courseCatalog?.extracted} extracted, ${this.courseCatalog?.archived} archived`);
      }

      this.initialized = true;
    } catch (err) {
      logger.error("[MITCourseRegistry] Init failed:", err);
      throw err;
    }
  }

  /**
   * Get all algorithms mapped to a specific PRISM engine
   */
  getAlgorithmsForEngine(engineName: string): EngineAlgorithmMap {
    if (!this.algorithmRegistry) {
      return { engineName, algorithms: [] };
    }

    const algorithms: Array<{ name: string; course: string; category: string }> = [];

    // Recursively search through all categories
    const searchCategory = (obj: unknown, categoryPath: string): void => {
      if (!obj || typeof obj !== "object") return;

      if (Array.isArray(obj)) {
        // Array of algorithm mappings
        for (const algo of obj as AlgorithmMapping[]) {
          if (algo.prismEngines?.includes(engineName)) {
            algorithms.push({
              name: algo.name,
              course: algo.course,
              category: categoryPath,
            });
          }
        }
      } else {
        // Check if this has an "algorithms" array
        const record = obj as Record<string, unknown>;
        if (record.algorithms && Array.isArray(record.algorithms)) {
          for (const algo of record.algorithms as AlgorithmMapping[]) {
            if (algo.prismEngines?.includes(engineName)) {
              algorithms.push({
                name: algo.name,
                course: algo.course,
                category: categoryPath,
              });
            }
          }
        }

        // Recursively check nested objects
        for (const [key, value] of Object.entries(record)) {
          if (key !== "algorithms" && typeof value === "object") {
            searchCategory(value, categoryPath ? `${categoryPath}.${key}` : key);
          }
        }
      }
    };

    searchCategory(this.algorithmRegistry.categories, "");
    return { engineName, algorithms };
  }

  /**
   * Get all algorithms from a specific MIT course
   */
  getAlgorithmsByCourse(courseId: string): AlgorithmMapping[] {
    if (!this.algorithmRegistry) return [];

    const results: AlgorithmMapping[] = [];

    const searchCategory = (obj: unknown): void => {
      if (!obj || typeof obj !== "object") return;

      if (Array.isArray(obj)) {
        for (const algo of obj as AlgorithmMapping[]) {
          if (algo.course === courseId) {
            results.push(algo);
          }
        }
      } else {
        const record = obj as Record<string, unknown>;
        if (record.algorithms && Array.isArray(record.algorithms)) {
          for (const algo of record.algorithms as AlgorithmMapping[]) {
            if (algo.course === courseId) {
              results.push(algo);
            }
          }
        }
        for (const [key, value] of Object.entries(record)) {
          if (key !== "algorithms" && typeof value === "object") {
            searchCategory(value);
          }
        }
      }
    };

    searchCategory(this.algorithmRegistry.categories);
    return results;
  }

  /**
   * Get courses by category
   */
  getCoursesByCategory(category: string): Array<{ id: string; name: string; topics: string[] }> {
    if (!this.courseIndex?.coursesByCategory[category]) {
      return [];
    }
    return this.courseIndex.coursesByCategory[category].courses;
  }

  /**
   * Get available categories with priorities
   */
  getCategories(): Array<{ name: string; priority: string; description: string; courseCount: number }> {
    if (!this.courseIndex) return [];

    return Object.entries(this.courseIndex.coursesByCategory).map(([name, data]) => ({
      name,
      priority: data.priority,
      description: data.description,
      courseCount: data.courses.length,
    }));
  }

  /**
   * Get manufacturing-relevant courses (TIER_1 priority)
   */
  getManufacturingCourses(): Array<{ id: string; name: string; topics: string[] }> {
    return this.getCoursesByCategory("manufacturing");
  }

  /**
   * Get extracted courses with full metadata
   */
  getExtractedCourses(): CourseEntry[] {
    if (!this.courseCatalog) return [];
    return this.courseCatalog.courses.filter((c) => c.type === "extracted");
  }

  /**
   * Load course data.json for an extracted course
   */
  async loadCourseData(courseId: string): Promise<CourseMetadata | null> {
    const coursePath = path.join(this.coursesRoot, courseId, "data.json");
    if (!fs.existsSync(coursePath)) {
      // Try with different path patterns
      const altPath = path.join(this.coursesRoot, courseId.toLowerCase(), "data.json");
      if (fs.existsSync(altPath)) {
        const raw = fs.readFileSync(altPath, "utf-8");
        return this.parseCourseData(raw, courseId);
      }
      return null;
    }

    const raw = fs.readFileSync(coursePath, "utf-8");
    return this.parseCourseData(raw, courseId);
  }

  private parseCourseData(raw: string, courseId: string): CourseMetadata {
    const data = JSON.parse(raw);
    return {
      courseId,
      title: data.course_title || "Unknown",
      term: data.term,
      year: data.year,
      level: data.level,
      instructors: data.instructors,
      topics: data.topics,
      learningResourceTypes: data.learning_resource_types,
      description: data.course_description,
    };
  }

  /**
   * Load content map for an extracted course
   */
  async loadContentMap(courseId: string): Promise<Map<string, string> | null> {
    const mapPath = path.join(this.coursesRoot, courseId, "content_map.json");
    if (!fs.existsSync(mapPath)) return null;

    const raw = fs.readFileSync(mapPath, "utf-8");
    const data = JSON.parse(raw);
    return new Map(Object.entries(data));
  }

  /**
   * Get courses that map to a PRISM engine category
   */
  getCoursesForPrismEngine(engineKey: string): string[] {
    if (!this.courseIndex?.prismMapping[engineKey]) {
      return [];
    }
    return this.courseIndex.prismMapping[engineKey];
  }

  /**
   * Get overall stats
   */
  getStats(): {
    totalAlgorithms: number;
    totalCourses: number;
    extractedCourses: number;
    archivedCourses: number;
    coverage: { totalPrismEngines: number; enginesMapped: number; coveragePercent: number };
    categories: number;
    manufacturingAlgorithms: number;
  } {
    const manufacturingAlgos = [
      ...this.getAlgorithmsByCourse("2.810"),
      ...this.getAlgorithmsByCourse("2.003"),
      ...this.getAlgorithmsByCourse("2.032"),
      ...this.getAlgorithmsByCourse("2.830"),
    ];

    return {
      totalAlgorithms: this.algorithmRegistry?.totalAlgorithms ?? 0,
      totalCourses: this.courseIndex?.totalCourses ?? 0,
      extractedCourses: this.courseCatalog?.extracted ?? 0,
      archivedCourses: this.courseCatalog?.archived ?? 0,
      coverage: this.algorithmRegistry?.coverage ?? { totalPrismEngines: 0, enginesMapped: 0, coveragePercent: 0 },
      categories: Object.keys(this.courseIndex?.coursesByCategory ?? {}).length,
      manufacturingAlgorithms: manufacturingAlgos.length,
    };
  }

  /**
   * Search algorithms by name pattern
   */
  searchAlgorithms(pattern: string): AlgorithmMapping[] {
    if (!this.algorithmRegistry) return [];

    const results: AlgorithmMapping[] = [];
    const regex = new RegExp(pattern, "i");

    const searchCategory = (obj: unknown): void => {
      if (!obj || typeof obj !== "object") return;

      if (Array.isArray(obj)) {
        for (const algo of obj as AlgorithmMapping[]) {
          if (regex.test(algo.name)) {
            results.push(algo);
          }
        }
      } else {
        const record = obj as Record<string, unknown>;
        if (record.algorithms && Array.isArray(record.algorithms)) {
          for (const algo of record.algorithms as AlgorithmMapping[]) {
            if (regex.test(algo.name)) {
              results.push(algo);
            }
          }
        }
        for (const [key, value] of Object.entries(record)) {
          if (key !== "algorithms" && typeof value === "object") {
            searchCategory(value);
          }
        }
      }
    };

    searchCategory(this.algorithmRegistry.categories);
    return results;
  }

  /**
   * Get all unique PRISM engines referenced in the registry
   */
  getAllMappedEngines(): string[] {
    if (!this.algorithmRegistry) return [];

    const engines = new Set<string>();

    const collectEngines = (obj: unknown): void => {
      if (!obj || typeof obj !== "object") return;

      if (Array.isArray(obj)) {
        for (const algo of obj as AlgorithmMapping[]) {
          if (algo.prismEngines) {
            for (const engine of algo.prismEngines) {
              engines.add(engine);
            }
          }
        }
      } else {
        const record = obj as Record<string, unknown>;
        if (record.algorithms && Array.isArray(record.algorithms)) {
          for (const algo of record.algorithms as AlgorithmMapping[]) {
            if (algo.prismEngines) {
              for (const engine of algo.prismEngines) {
                engines.add(engine);
              }
            }
          }
        }
        for (const [key, value] of Object.entries(record)) {
          if (key !== "algorithms" && typeof value === "object") {
            collectEngines(value);
          }
        }
      }
    };

    collectEngines(this.algorithmRegistry.categories);
    return Array.from(engines).sort();
  }

  /**
   * Generate a knowledge augmentation report for a PRISM engine
   */
  generateEngineKnowledgeReport(engineName: string): string {
    const mapping = this.getAlgorithmsForEngine(engineName);
    if (mapping.algorithms.length === 0) {
      return `No academic algorithms mapped to ${engineName}`;
    }

    const lines = [
      `# Knowledge Augmentation Report: ${engineName}`,
      "",
      `## Mapped Algorithms (${mapping.algorithms.length})`,
      "",
    ];

    // Group by course
    const byCourse = new Map<string, typeof mapping.algorithms>();
    for (const algo of mapping.algorithms) {
      const list = byCourse.get(algo.course) ?? [];
      list.push(algo);
      byCourse.set(algo.course, list);
    }

    for (const [course, algos] of byCourse) {
      lines.push(`### MIT ${course}`);
      for (const algo of algos) {
        lines.push(`- ${algo.name} (${algo.category})`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }
}

// Singleton instance
export const mitCourseRegistryEngine = new MITCourseRegistryEngine();
