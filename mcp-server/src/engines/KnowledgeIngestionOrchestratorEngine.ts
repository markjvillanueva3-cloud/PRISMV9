/**
 * KnowledgeIngestionOrchestratorEngine.ts
 * PDF-EXT-MS2 U-PDF13: Course-to-Academy Bridge + Auto-Ingestion Pipeline
 * KAR-MS3: Real Engine Wiring (U-KAR16-20)
 *
 * Orchestrates automatic discovery → extraction → wiring for all PDF types.
 * Can be triggered by hooks, dispatchers, or scheduled tasks.
 */

import { BaseEngine, type EngineCapability } from "./BaseEngine.js";
import { logger } from "../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";

// Registry imports for KAR-MS3 wiring
import { formulaRegistry, type Formula } from "../registries/FormulaRegistry.js";
import { materialRegistry } from "../registries/MaterialRegistry.js";
import type { Material } from "../types.js";
import { toolRegistry, type CuttingTool } from "../registries/ToolRegistry.js";
import { DATA_LAYERS } from "../constants.js";
// KAR-MS3 U-KAR19: KnowledgeGraph wiring
import { graphAddNode, graphAddEdge, graphHasNode, type NodeType } from "./KnowledgeGraphEngine.js";

// ============================================================================
// Types
// ============================================================================

export type ResourceCategory =
  | "tool_catalog"
  | "handbook"
  | "mit_course"
  | "academic_paper"
  | "machine_manual"
  | "standard"
  | "unknown";

export interface DiscoveredResource {
  path: string;
  name: string;
  category: ResourceCategory;
  size: number;
  modifiedAt: Date;
  processed: boolean;
}

export interface ExtractionResult {
  resource: string;
  category: ResourceCategory;
  success: boolean;
  extracted: {
    formulas: number;
    tools: number;
    materials: number;
    algorithms: number;
  };
  /** KAR-MS3: Actual extracted data for wiring */
  extractedData?: {
    formulas?: Partial<Formula>[];
    tools?: Partial<CuttingTool>[];
    materials?: Partial<Material>[];
    algorithms?: Array<{ id: string; name: string; description: string; source: string }>;
  };
  wiredTo: string[]; // PRISM engines that received the data
  wiringResults?: Array<{ engine: string; action: string; success: boolean; error?: string }>;
  error?: string;
}

export interface IngestionPipelineResult {
  discovered: number;
  processed: number;
  skipped: number;
  failed: number;
  results: ExtractionResult[];
  duration: number;
}

export interface WiringTarget {
  engine: string;
  action: string;
  dataType: "formula" | "tool" | "material" | "algorithm";
}

// Category detection patterns
const CATEGORY_PATTERNS: Array<{ pattern: RegExp; category: ResourceCategory }> = [
  { pattern: /sandvik|kennametal|iscar|seco|walter|mitsubishi|tungaloy|sumitomo|kyocera|guhring|osg|dormer|emuge/i, category: "tool_catalog" },
  { pattern: /machinery.*handbook|machinist.*handbook|metal.*handbook|tool.*engineer/i, category: "handbook" },
  { pattern: /mit[-_\s]|mit\d|ocw|courseware|lecture.*\d{2,}/i, category: "mit_course" },
  { pattern: /paper|journal|proceedings|ieee|asme|cirp|ijmtm|stle/i, category: "academic_paper" },
  { pattern: /okuma|haas|mazak|dmg.*mori|hurco|fanuc|siemens.*sinumerik|heidenhain/i, category: "machine_manual" },
  { pattern: /iso[-_\s]?\d|asme[-_\s]|din[-_\s]|ansi[-_\s]/i, category: "standard" },
];

// Wiring targets for each category
const CATEGORY_WIRING: Record<ResourceCategory, WiringTarget[]> = {
  tool_catalog: [
    { engine: "SpeedFeedOrchestratorEngine", action: "updateToolData", dataType: "tool" },
    { engine: "ToolSelectionEngine", action: "registerTool", dataType: "tool" },
    { engine: "KnowledgeGraphEngine", action: "addToolNode", dataType: "tool" },
  ],
  handbook: [
    { engine: "SpeedFeedOrchestratorEngine", action: "updateFormulaRegistry", dataType: "formula" },
    { engine: "MaterialRegistryEngine", action: "updateMaterial", dataType: "material" },
    { engine: "FormulaRegistryEngine", action: "register", dataType: "formula" },
  ],
  mit_course: [
    { engine: "SpeedFeedOrchestratorEngine", action: "augmentWithAlgorithm", dataType: "algorithm" },
    { engine: "LearningPipelineEngine", action: "addCourseContent", dataType: "algorithm" },
    { engine: "AcademyEngine", action: "createModule", dataType: "algorithm" },
  ],
  academic_paper: [
    { engine: "SpeedFeedOrchestratorEngine", action: "updateFormulaRegistry", dataType: "formula" },
    { engine: "FormulaRegistryEngine", action: "registerWithCitation", dataType: "formula" },
  ],
  machine_manual: [
    { engine: "MachineRegistryEngine", action: "updateSpecs", dataType: "material" },
    { engine: "ControllerProfileEngine", action: "updateProfile", dataType: "material" },
  ],
  standard: [
    { engine: "ComplianceEngine", action: "registerStandard", dataType: "material" },
    { engine: "ToleranceEngine", action: "updateISO", dataType: "material" },
  ],
  unknown: [],
};

// ============================================================================
// Engine
// ============================================================================

export class KnowledgeIngestionOrchestratorEngine extends BaseEngine {
  private processedResources: Set<string> = new Set();
  private resourcesRoot: string;

  constructor(resourcesPath?: string) {
    super({
      name: "KnowledgeIngestionOrchestratorEngine",
      version: "1.0.0",
      domain: "knowledge",
      description: "Routes discovered resources (tool catalogs, handbooks, MIT courses, papers, manuals, standards) to the right extraction engine and aggregates results.",
    });
    this.resourcesRoot = resourcesPath || "H:/prism/resources";
  }

  // BaseEngine surface — keeps the engine type-checkable and plays into the
  // generic execute() contract so dispatchers can invoke uniformly.

  getCapabilities(): EngineCapability[] {
    return [
      {
        name: "ingest_resource",
        description: "Detect category from path, route to specialist extractor, aggregate results.",
        actions: [
          "tool_catalog", "handbook", "mit_course", "academic_paper",
          "machine_manual", "standard",
        ],
      },
    ];
  }

  validate(input: unknown): string | null {
    if (!input || typeof input !== "object") return "input must be a DiscoveredResource object";
    const r = input as { path?: unknown; category?: unknown; name?: unknown };
    if (typeof r.path !== "string" || !r.path) return "input.path must be a non-empty string";
    if (typeof r.name !== "string" || !r.name) return "input.name must be a non-empty string";
    if (typeof r.category !== "string" || !r.category) return "input.category must be a non-empty string";
    return null;
  }

  protected async executeImpl(input: unknown): Promise<unknown> {
    return this.ingestResource(input as DiscoveredResource);
  }

  /**
   * Detect category from filename/path
   */
  detectCategory(resourcePath: string): ResourceCategory {
    const name = path.basename(resourcePath).toLowerCase();
    const dir = path.dirname(resourcePath).toLowerCase();
    const fullPath = `${dir}/${name}`;

    for (const { pattern, category } of CATEGORY_PATTERNS) {
      if (pattern.test(fullPath)) {
        return category;
      }
    }
    return "unknown";
  }

  /**
   * Discover all resources in the resources folder
   */
  async discoverResources(subdir?: string): Promise<DiscoveredResource[]> {
    const resources: DiscoveredResource[] = [];
    const searchPath = subdir ? path.join(this.resourcesRoot, subdir) : this.resourcesRoot;

    if (!fs.existsSync(searchPath)) {
      logger.warn(`[KnowledgeIngestion] Path not found: ${searchPath}`);
      return resources;
    }

    const scanDir = (dir: string): void => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules, .git, etc.
          if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
            scanDir(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          // Track PDFs and extracted course folders
          if (ext === ".pdf" || ext === ".json") {
            const stats = fs.statSync(fullPath);
            resources.push({
              path: fullPath,
              name: entry.name,
              category: this.detectCategory(fullPath),
              size: stats.size,
              modifiedAt: stats.mtime,
              processed: this.processedResources.has(fullPath),
            });
          }
        }
      }
    };

    try {
      scanDir(searchPath);
    } catch (err) {
      logger.error("[KnowledgeIngestion] Scan error:", err);
    }

    return resources;
  }

  /**
   * Get pending (unprocessed) resources
   */
  async getPending(): Promise<DiscoveredResource[]> {
    const all = await this.discoverResources();
    return all.filter((r) => !r.processed && r.category !== "unknown");
  }

  /**
   * Run the full ingestion pipeline for a single resource
   */
  async ingestResource(resource: DiscoveredResource): Promise<ExtractionResult> {
    const result: ExtractionResult = {
      resource: resource.path,
      category: resource.category,
      success: false,
      extracted: { formulas: 0, tools: 0, materials: 0, algorithms: 0 },
      wiredTo: [],
    };

    try {
      switch (resource.category) {
        case "tool_catalog":
          await this.ingestToolCatalog(resource, result);
          break;
        case "handbook":
          await this.ingestHandbook(resource, result);
          break;
        case "mit_course":
          await this.ingestMITCourse(resource, result);
          break;
        case "academic_paper":
          await this.ingestAcademicPaper(resource, result);
          break;
        case "machine_manual":
          await this.ingestMachineManual(resource, result);
          break;
        case "standard":
          await this.ingestStandard(resource, result);
          break;
        default:
          result.error = "Unknown category";
          return result;
      }

      // Wire extracted data to PRISM engines
      await this.wireToEngines(resource.category, result);

      result.success = true;
      this.processedResources.add(resource.path);

    } catch (err: unknown) {
      result.error = err instanceof Error ? err.message : String(err);
      logger.error(`[KnowledgeIngestion] Failed to ingest ${resource.name}:`, err);
    }

    return result;
  }

  /**
   * Run full pipeline on all pending resources
   */
  async runPipeline(options?: { maxResources?: number; categories?: ResourceCategory[] }): Promise<IngestionPipelineResult> {
    const startTime = Date.now();
    const pending = await this.getPending();

    let filtered = pending;
    if (options?.categories) {
      filtered = pending.filter((r) => options.categories!.includes(r.category));
    }
    if (options?.maxResources) {
      filtered = filtered.slice(0, options.maxResources);
    }

    const results: ExtractionResult[] = [];
    let processed = 0;
    let failed = 0;

    for (const resource of filtered) {
      const result = await this.ingestResource(resource);
      results.push(result);
      if (result.success) {
        processed++;
      } else {
        failed++;
      }
    }

    return {
      discovered: pending.length,
      processed,
      skipped: pending.length - filtered.length,
      failed,
      results,
      duration: Date.now() - startTime,
    };
  }

  // =========================================================================
  // Category-specific ingestion methods
  // =========================================================================

  private async ingestToolCatalog(resource: DiscoveredResource, result: ExtractionResult): Promise<void> {
    const { catalogExtractionEngine } = await import("./CatalogExtractionEngine.js");
    await catalogExtractionEngine.init();

    // Determine manufacturer from path
    const manufacturer = this.inferManufacturer(resource.path);

    // For now, we just track that it was processed
    // Real extraction would read the PDF content
    const stats = catalogExtractionEngine.getStats();
    result.extracted.tools = stats.extractedCount;

    logger.info(`[KnowledgeIngestion] Tool catalog ready: ${manufacturer}`);
  }

  private async ingestHandbook(resource: DiscoveredResource, result: ExtractionResult): Promise<void> {
    const { pdfFormulaExtractionEngine } = await import("./PDFFormulaExtractionEngine.js");
    const { pdfMaterialPropertyExtractionEngine } = await import("./PDFMaterialPropertyExtractionEngine.js");

    // Track for extraction (would need actual PDF text extraction).
    // Both engines' getStats() returns { totalExtracted, ...byCategory/byISOGroup,
    // validatedCount, averageConfidence } — `formulasFound`/`materialsFound`
    // were stale property names from an earlier API.
    result.extracted.formulas = pdfFormulaExtractionEngine.getStats().totalExtracted;
    result.extracted.materials = pdfMaterialPropertyExtractionEngine.getStats().totalExtracted;
  }

  private async ingestMITCourse(resource: DiscoveredResource, result: ExtractionResult): Promise<void> {
    const { mitCourseRegistryEngine } = await import("./MITCourseRegistryEngine.js");
    const { lectureNoteExtractionEngine } = await import("./LectureNoteExtractionEngine.js");

    await mitCourseRegistryEngine.init();

    // If it's a course folder, scan it
    const courseId = path.basename(path.dirname(resource.path));
    if (resource.name === "data.json") {
      const summary = await lectureNoteExtractionEngine.scanCourse(courseId);
      result.extracted.formulas = summary.formulas;
      result.extracted.algorithms = summary.prismMappings;
    }

    // Get algorithm stats
    const stats = mitCourseRegistryEngine.getStats();
    if (result.extracted.algorithms === 0) {
      result.extracted.algorithms = stats.totalAlgorithms;
    }
  }

  private async ingestAcademicPaper(resource: DiscoveredResource, result: ExtractionResult): Promise<void> {
    // Academic paper extraction (would need PDF parsing).
    const { pdfFormulaExtractionEngine } = await import("./PDFFormulaExtractionEngine.js");
    result.extracted.formulas = pdfFormulaExtractionEngine.getStats().totalExtracted;
  }

  private async ingestMachineManual(resource: DiscoveredResource, result: ExtractionResult): Promise<void> {
    // Machine manual extraction placeholder
    logger.info(`[KnowledgeIngestion] Machine manual queued: ${resource.name}`);
  }

  private async ingestStandard(resource: DiscoveredResource, result: ExtractionResult): Promise<void> {
    // Standards extraction placeholder
    logger.info(`[KnowledgeIngestion] Standard queued: ${resource.name}`);
  }

  // =========================================================================
  // Wiring methods
  // =========================================================================

  /**
   * KAR-MS3: Real engine wiring implementation
   * Routes extracted data to actual PRISM registries and engines
   */
  private async wireToEngines(category: ResourceCategory, result: ExtractionResult): Promise<void> {
    const targets = CATEGORY_WIRING[category] || [];
    result.wiringResults = [];

    for (const target of targets) {
      const wiringResult = { engine: target.engine, action: target.action, success: false, error: undefined as string | undefined };

      try {
        // KAR-MS3 U-KAR16: Wire formulas to FormulaRegistry
        if (target.dataType === "formula" && result.extractedData?.formulas?.length) {
          for (const formula of result.extractedData.formulas) {
            if (formula.formula_id || formula.name) {
              const fullFormula: Formula = {
                formula_id: formula.formula_id || `F-EXT-${Date.now()}`,
                name: formula.name || "Extracted Formula",
                domain: formula.domain || "physics",
                category: formula.category || "extracted",
                equation: formula.equation || "",
                equation_plain: formula.equation_plain || formula.equation || "",
                parameters: formula.parameters || [],
                validation: formula.validation || { required_inputs: [] },
                description: formula.description || `Extracted from ${result.resource}`,
                consumers: formula.consumers || [],
              };
              await formulaRegistry.register(fullFormula, DATA_LAYERS.LEARNED);
              logger.info(`[KnowledgeIngestion] Registered formula: ${fullFormula.formula_id}`);
            }
          }
          wiringResult.success = true;
        }

        // KAR-MS3 U-KAR17: Wire materials to MaterialRegistry
        if (target.dataType === "material" && result.extractedData?.materials?.length) {
          for (const material of result.extractedData.materials) {
            if (material.material_id || material.name) {
              // Build material with required fields for registry upsert
              const matId = material.material_id || material.id || `MAT-EXT-${Date.now()}`;
              const extractedMaterial = {
                material_id: matId,
                id: matId,
                name: material.name || "Extracted Material",
                iso_group: material.iso_group || "P",
                category: material.category || "steel",
                kienzle: material.kienzle,
                taylor: material.taylor,
                johnson_cook: material.johnson_cook,
                thermal: material.thermal,
              };
              await materialRegistry.upsert(extractedMaterial as unknown as Material, DATA_LAYERS.LEARNED);
              logger.info(`[KnowledgeIngestion] Upserted material: ${extractedMaterial.material_id}`);
            }
          }
          wiringResult.success = true;
        }

        // KAR-MS3 U-KAR18: Wire tools to ToolRegistry
        if (target.dataType === "tool" && result.extractedData?.tools?.length) {
          for (const tool of result.extractedData.tools) {
            if (tool.id || tool.catalog_number) {
              const fullTool: CuttingTool = {
                id: tool.id || `TOOL-EXT-${Date.now()}`,
                name: tool.name || "Extracted Tool",
                type: tool.type || "endmill",
                manufacturer: tool.manufacturer || this.inferManufacturer(result.resource),
                catalog_number: tool.catalog_number || tool.id || "",
                substrate: tool.substrate || "carbide",
                grade: tool.grade || "",
                geometry: tool.geometry || {
                  diameter: 0,
                  overall_length: 0,
                  flute_length: 0,
                  shank_diameter: 0,
                  flutes: 0,
                  helix_angle: 0,
                  rake_angle: 0,
                  relief_angle: 0,
                },
                performance: tool.performance || {
                  recommendations: {},
                  expected_life_minutes: 0,
                  wear_pattern: "",
                  max_speed_sfm: 0,
                  max_feed_ipt: 0,
                  max_radial_engagement: 0,
                  max_axial_engagement: 0,
                  achievable_surface_finish: 0,
                  achievable_tolerance: "",
                },
                material_groups: tool.material_groups || [],
                application: tool.application || [],
              };
              await toolRegistry.register(fullTool, DATA_LAYERS.LEARNED);
              logger.info(`[KnowledgeIngestion] Registered tool: ${fullTool.id}`);
            }
          }
          wiringResult.success = true;
        }

        // Track successful wiring even if no data (engine was targeted)
        if (!wiringResult.success && !result.extractedData) {
          // No data to wire, but log the target
          wiringResult.success = true;
          logger.debug(`[KnowledgeIngestion] No ${target.dataType} data to wire to ${target.engine}`);
        }

        result.wiredTo.push(`${target.engine}.${target.action}`);
        logger.debug(`[KnowledgeIngestion] Wired to ${target.engine}.${target.action}`);

      } catch (err) {
        wiringResult.error = err instanceof Error ? err.message : String(err);
        logger.warn(`[KnowledgeIngestion] Failed to wire to ${target.engine}:`, err);
      }

      result.wiringResults.push(wiringResult);
    }

    // KAR-MS3 U-KAR19: Wire all extracted entities to KnowledgeGraph
    await this.wireToKnowledgeGraph(result);
  }

  /**
   * KAR-MS3 U-KAR19: Wire extracted data to KnowledgeGraph
   * Creates nodes for extracted entities and edges linking them to sources
   */
  private async wireToKnowledgeGraph(result: ExtractionResult): Promise<void> {
    const sourceNodeId = `src_${path.basename(result.resource).replace(/[^a-zA-Z0-9]/g, "_")}`;
    const evidence = `Extracted from ${path.basename(result.resource)}`;

    // Create source node for the document
    if (!graphHasNode(sourceNodeId)) {
      graphAddNode(sourceNodeId, "application" as NodeType, path.basename(result.resource), {
        type: "extraction_source",
        category: result.category,
        path: result.resource,
        extracted_at: new Date().toISOString(),
      });
    }

    // Wire extracted formulas to graph
    if (result.extractedData?.formulas?.length) {
      for (const formula of result.extractedData.formulas) {
        const nodeId = `formula_${formula.formula_id || formula.name?.replace(/\s+/g, "_") || Date.now()}`;
        if (!graphHasNode(nodeId)) {
          graphAddNode(nodeId, "property" as NodeType, formula.name || "Extracted Formula", {
            formula_id: formula.formula_id,
            domain: formula.domain,
            category: formula.category,
            equation: formula.equation,
          });
          graphAddEdge(nodeId, sourceNodeId, "learned_from", 0.9, evidence);
          logger.debug(`[KnowledgeGraph] Added formula node: ${nodeId}`);
        }
      }
      result.wiredTo.push("KnowledgeGraphEngine.addFormulaNode");
    }

    // Wire extracted materials to graph
    if (result.extractedData?.materials?.length) {
      for (const material of result.extractedData.materials) {
        const nodeId = `mat_${material.material_id || material.name?.replace(/\s+/g, "_").toLowerCase() || Date.now()}`;
        if (!graphHasNode(nodeId)) {
          graphAddNode(nodeId, "material" as NodeType, material.name || "Extracted Material", {
            material_id: material.material_id,
            iso_group: material.iso_group,
            category: material.category,
          });
          graphAddEdge(nodeId, sourceNodeId, "learned_from", 0.9, evidence);
          logger.debug(`[KnowledgeGraph] Added material node: ${nodeId}`);
        }
      }
      result.wiredTo.push("KnowledgeGraphEngine.addMaterialNode");
    }

    // Wire extracted tools to graph
    if (result.extractedData?.tools?.length) {
      for (const tool of result.extractedData.tools) {
        const nodeId = `tool_${tool.id || tool.catalog_number?.replace(/[^a-zA-Z0-9]/g, "_") || Date.now()}`;
        if (!graphHasNode(nodeId)) {
          graphAddNode(nodeId, "tool" as NodeType, tool.name || "Extracted Tool", {
            tool_id: tool.id,
            catalog_number: tool.catalog_number,
            type: tool.type,
            manufacturer: tool.manufacturer,
            substrate: tool.substrate,
          });
          graphAddEdge(nodeId, sourceNodeId, "learned_from", 0.9, evidence);

          // Link tool to manufacturer if known
          const mfr = tool.manufacturer || this.inferManufacturer(result.resource);
          if (mfr !== "unknown") {
            const mfrNodeId = `mfr_${mfr.toLowerCase()}`;
            if (!graphHasNode(mfrNodeId)) {
              graphAddNode(mfrNodeId, "manufacturer" as NodeType, mfr, { type: "tool_manufacturer" });
            }
            graphAddEdge(nodeId, mfrNodeId, "made_by", 0.95, `Catalog: ${path.basename(result.resource)}`);
          }

          logger.debug(`[KnowledgeGraph] Added tool node: ${nodeId}`);
        }
      }
      result.wiredTo.push("KnowledgeGraphEngine.addToolNode");
    }

    // Wire extracted algorithms to graph
    if (result.extractedData?.algorithms?.length) {
      for (const algo of result.extractedData.algorithms) {
        const nodeId = `algo_${algo.id || algo.name?.replace(/\s+/g, "_").toLowerCase() || Date.now()}`;
        if (!graphHasNode(nodeId)) {
          graphAddNode(nodeId, "strategy" as NodeType, algo.name || "Extracted Algorithm", {
            algorithm_id: algo.id,
            description: algo.description,
            source: algo.source,
          });
          graphAddEdge(nodeId, sourceNodeId, "learned_from", 0.85, evidence);
          logger.debug(`[KnowledgeGraph] Added algorithm node: ${nodeId}`);
        }
      }
      result.wiredTo.push("KnowledgeGraphEngine.addAlgorithmNode");
    }

    logger.info(`[KnowledgeIngestion] Wired ${
      (result.extractedData?.formulas?.length || 0) +
      (result.extractedData?.materials?.length || 0) +
      (result.extractedData?.tools?.length || 0) +
      (result.extractedData?.algorithms?.length || 0)
    } entities to KnowledgeGraph`);
  }

  private inferManufacturer(resourcePath: string): string {
    const pathLower = resourcePath.toLowerCase();
    const manufacturers = [
      "sandvik", "kennametal", "iscar", "seco", "walter", "mitsubishi",
      "tungaloy", "sumitomo", "kyocera", "guhring", "osg", "dormer", "emuge"
    ];
    for (const mfr of manufacturers) {
      if (pathLower.includes(mfr)) return mfr;
    }
    return "unknown";
  }

  // =========================================================================
  // Stats and reporting
  // =========================================================================

  getStats(): {
    processedCount: number;
    categories: Record<ResourceCategory, number>;
  } {
    const categories: Record<ResourceCategory, number> = {
      tool_catalog: 0,
      handbook: 0,
      mit_course: 0,
      academic_paper: 0,
      machine_manual: 0,
      standard: 0,
      unknown: 0,
    };

    // Count by category (would need to track this properly)
    return {
      processedCount: this.processedResources.size,
      categories,
    };
  }

  /**
   * Clear processed state (for testing or re-processing)
   */
  clearProcessed(): void {
    this.processedResources.clear();
  }
}

// Singleton
export const knowledgeIngestionOrchestratorEngine = new KnowledgeIngestionOrchestratorEngine();
