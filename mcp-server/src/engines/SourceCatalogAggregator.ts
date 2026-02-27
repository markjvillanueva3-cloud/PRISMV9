/**
 * SourceCatalogAggregator — Unified query interface for all 28 engine SOURCE_FILE_CATALOG exports.
 * Each engine exports a catalog of source files it was ported from, with metadata like
 * filename, source_dir, category, lines, safety_class, and description.
 *
 * This aggregator collects them all and provides search/filter/stats capabilities.
 */
import { log } from "../utils/Logger.js";

// Lazy-loaded catalog map: engine_name → catalog entries
let _aggregated: Record<string, Record<string, CatalogEntry>> | null = null;

export interface CatalogEntry {
  filename: string;
  source_dir: string;
  category: string;
  lines: number;
  safety_class: string;
  description: string;
  [key: string]: any; // Some engines add extra fields (ai_domain, target_engine, etc.)
}

interface CatalogImport {
  engine: string;
  module: string;
  constName: string;
}

// All 28 catalog sources — lazy-imported to avoid startup cost
const CATALOG_SOURCES: CatalogImport[] = [
  { engine: "AlgorithmGateway", module: "AlgorithmGatewayEngine", constName: "ALGORITHM_SOURCE_FILE_CATALOG" },
  { engine: "Apprentice", module: "ApprenticeEngine", constName: "APPRENTICE_SOURCE_FILE_CATALOG" },
  { engine: "CAMIntegration", module: "CAMIntegrationEngine", constName: "CAM_SOURCE_FILE_CATALOG" },
  { engine: "Campaign", module: "CampaignEngine", constName: "CAMPAIGN_SOURCE_FILE_CATALOG" },
  { engine: "Collision", module: "CollisionEngine", constName: "SIMULATION_SOURCE_FILE_CATALOG" },
  { engine: "Compliance", module: "ComplianceEngine", constName: "QUALITY_SOURCE_FILE_CATALOG" },
  { engine: "DNCTransfer", module: "DNCTransferEngine", constName: "DNC_SOURCE_FILE_CATALOG" },
  { engine: "ERPIntegration", module: "ERPIntegrationEngine", constName: "INTEGRATION_SOURCE_FILE_CATALOG" },
  { engine: "EventBus", module: "EventBus", constName: "EVENTBUS_SOURCE_FILE_CATALOG" },
  { engine: "FederatedLearning", module: "FederatedLearningEngine", constName: "FEDERATED_SOURCE_FILE_CATALOG" },
  { engine: "GCodeTemplate", module: "GCodeTemplateEngine", constName: "POST_PROCESSOR_SOURCE_FILE_CATALOG" },
  { engine: "Intelligence", module: "IntelligenceEngine", constName: "INTELLIGENCE_SOURCE_FILE_CATALOG" },
  { engine: "JobLearning", module: "JobLearningEngine", constName: "JOB_LEARNING_SOURCE_FILE_CATALOG" },
  { engine: "KnowledgeGraph", module: "KnowledgeGraphEngine", constName: "KNOWLEDGE_SOURCE_FILE_CATALOG" },
  { engine: "KnowledgeQuery", module: "KnowledgeQueryEngine", constName: "KNOWLEDGE_QUERY_SOURCE_FILE_CATALOG" },
  { engine: "MachineConnectivity", module: "MachineConnectivityEngine", constName: "CONNECTIVITY_SOURCE_FILE_CATALOG" },
  { engine: "ManufacturingCalc", module: "ManufacturingCalculations", constName: "UNITS_SOURCE_FILE_CATALOG" },
  { engine: "Measurement", module: "MeasurementIntegrationEngine", constName: "MEASUREMENT_SOURCE_FILE_CATALOG" },
  { engine: "Optimization", module: "OptimizationEngine", constName: "OPTIMIZATION_SOURCE_FILE_CATALOG" },
  { engine: "PhysicsPrediction", module: "PhysicsPredictionEngine", constName: "PHYSICS_SOURCE_FILE_CATALOG" },
  { engine: "Product", module: "ProductEngine", constName: "BUSINESS_SOURCE_FILE_CATALOG" },
  { engine: "ProtocolBridge", module: "ProtocolBridgeEngine", constName: "PROTOCOL_SOURCE_FILE_CATALOG" },
  { engine: "ScriptExecutor", module: "ScriptExecutor", constName: "SCRIPT_SOURCE_FILE_CATALOG" },
  { engine: "ShopScheduler", module: "ShopSchedulerEngine", constName: "SCHEDULER_SOURCE_FILE_CATALOG" },
  { engine: "SpindleProtection", module: "SpindleProtectionEngine", constName: "SPINDLE_SOURCE_FILE_CATALOG" },
  { engine: "Toolpath", module: "ToolpathCalculations", constName: "TOOLPATH_SOURCE_FILE_CATALOG" },
  { engine: "Workholding", module: "WorkholdingEngine", constName: "WORKHOLDING_SOURCE_FILE_CATALOG" },
  { engine: "WorkholdingIntel", module: "WorkholdingIntelligenceEngine", constName: "WORKHOLDING_INTELLIGENCE_SOURCE_FILE_CATALOG" },
];

/**
 * Lazy-load and aggregate all 28 catalogs.
 */
async function loadAll(): Promise<Record<string, Record<string, CatalogEntry>>> {
  if (_aggregated) return _aggregated;
  _aggregated = {};
  for (const src of CATALOG_SOURCES) {
    try {
      const mod = await import(`./${src.module}.js`);
      const catalog = mod[src.constName];
      if (catalog && typeof catalog === "object") {
        _aggregated[src.engine] = catalog;
      }
    } catch (err) {
      log.debug(`[SourceCatalog] Skipping ${src.engine}: ${err}`);
    }
  }
  return _aggregated;
}

/**
 * Get all catalogs aggregated by engine.
 */
export async function getAllCatalogs(): Promise<{
  engines: Record<string, { entries: number; categories: string[]; total_lines: number }>;
  total_entries: number;
  total_lines: number;
  total_engines: number;
}> {
  const all = await loadAll();
  const engines: Record<string, { entries: number; categories: string[]; total_lines: number }> = {};
  let totalEntries = 0;
  let totalLines = 0;
  for (const [engine, catalog] of Object.entries(all)) {
    const entries = Object.values(catalog);
    const categories = [...new Set(entries.map(e => e.category))];
    const lines = entries.reduce((sum, e) => sum + (e.lines || 0), 0);
    engines[engine] = { entries: entries.length, categories, total_lines: lines };
    totalEntries += entries.length;
    totalLines += lines;
  }
  return { engines, total_entries: totalEntries, total_lines: totalLines, total_engines: Object.keys(engines).length };
}

/**
 * Search across all catalogs by keyword (matches filename, description, category).
 */
export async function searchCatalog(query: string, options?: {
  engine?: string;
  category?: string;
  safety_class?: string;
  limit?: number;
}): Promise<Array<{ engine: string; id: string; entry: CatalogEntry }>> {
  const all = await loadAll();
  const q = query.toLowerCase();
  const results: Array<{ engine: string; id: string; entry: CatalogEntry }> = [];
  const limit = options?.limit || 50;

  for (const [engine, catalog] of Object.entries(all)) {
    if (options?.engine && engine !== options.engine) continue;
    for (const [id, entry] of Object.entries(catalog)) {
      if (options?.category && entry.category !== options.category) continue;
      if (options?.safety_class && entry.safety_class !== options.safety_class) continue;
      const searchable = `${id} ${entry.filename} ${entry.description} ${entry.category}`.toLowerCase();
      if (searchable.includes(q)) {
        results.push({ engine, id, entry });
        if (results.length >= limit) return results;
      }
    }
  }
  return results;
}

/**
 * Get catalog entries for a specific engine.
 */
export async function getEngineCatalog(engineName: string): Promise<Record<string, CatalogEntry> | null> {
  const all = await loadAll();
  return all[engineName] || null;
}

/**
 * Get stats grouped by category across all engines.
 */
export async function getCatalogStats(): Promise<{
  by_category: Record<string, { count: number; total_lines: number; engines: string[] }>;
  by_safety_class: Record<string, number>;
  total_entries: number;
}> {
  const all = await loadAll();
  const byCategory: Record<string, { count: number; total_lines: number; engines: Set<string> }> = {};
  const bySafety: Record<string, number> = {};
  let total = 0;

  for (const [engine, catalog] of Object.entries(all)) {
    for (const entry of Object.values(catalog)) {
      total++;
      const cat = entry.category || "unknown";
      if (!byCategory[cat]) byCategory[cat] = { count: 0, total_lines: 0, engines: new Set() };
      byCategory[cat].count++;
      byCategory[cat].total_lines += entry.lines || 0;
      byCategory[cat].engines.add(engine);

      const sc = entry.safety_class || "UNKNOWN";
      bySafety[sc] = (bySafety[sc] || 0) + 1;
    }
  }

  const by_category: Record<string, { count: number; total_lines: number; engines: string[] }> = {};
  for (const [cat, data] of Object.entries(byCategory)) {
    by_category[cat] = { count: data.count, total_lines: data.total_lines, engines: [...data.engines] };
  }
  return { by_category, by_safety_class: bySafety, total_entries: total };
}
