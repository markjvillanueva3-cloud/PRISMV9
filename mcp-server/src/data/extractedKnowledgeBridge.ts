/**
 * Extracted Knowledge Bridge — Unified loader for all extraction data
 *
 * Provides a single interface for engines to access:
 *   - Workflow templates (CAD/CAM sequences)
 *   - Tribal knowledge tips
 *   - Knowledge atoms
 *   - Python API references
 *   - Property definitions
 *
 * Auto-loads from data/extracted-knowledge/ directories.
 * Caches data after first load for performance.
 *
 * @module data/extractedKnowledgeBridge
 */

import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface ExtractedWorkflowStep {
  step_number: number;
  action: string;
  rationale?: string;
  optional?: boolean;
}

export interface ExtractedWorkflow {
  id: string;
  name: string;
  category: string;
  description: string;
  prerequisites: string[];
  steps: ExtractedWorkflowStep[];
  result: string;
  source_file: string;
  confidence: number;
}

export interface OrderOfOperations {
  category: string;
  name: string;
  operations: string[];
  rationale: string;
  source: string;
}

export interface ExtractedTip {
  id: string;
  title: string;
  body: string;
  category: string;
  tags: string[];
  confidence: number;
  source: string;
}

export interface ExtractedAtom {
  id: string;
  type: string;
  name: string;
  description: string;
  parameters?: Record<string, any>;
  source: string;
}

export interface PythonApiFunction {
  name: string;
  module: string;
  category: string;
  description?: string;
  signature?: string;
}

export interface PropertyDefinition {
  name: string;
  key: string;
  type: string;
  category: string;
  ncVariable?: string;
}

export interface ExtractedKnowledge {
  workflows: ExtractedWorkflow[];
  orderOfOperations: OrderOfOperations[];
  quickReference: Record<string, string[]>;
  tips: ExtractedTip[];
  atoms: ExtractedAtom[];
  pythonApi: PythonApiFunction[];
  properties: PropertyDefinition[];
  stats: {
    workflows: number;
    orderOfOps: number;
    tips: number;
    atoms: number;
    pythonFunctions: number;
    properties: number;
    lastLoaded: string;
  };
}

// ============================================================================
// CACHE
// ============================================================================

let _cache: ExtractedKnowledge | null = null;
let _cacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// LOADERS
// ============================================================================

function loadLatestJson(dir: string, prefix: string): any | null {
  if (!existsSync(dir)) return null;

  const files = readdirSync(dir)
    .filter(f => f.startsWith(prefix) && f.endsWith(".json"))
    .sort()
    .reverse();

  if (files.length === 0) return null;

  try {
    return JSON.parse(readFileSync(join(dir, files[0]), "utf-8"));
  } catch (err) {
    log.warn(`[ExtractedKnowledgeBridge] Error loading ${files[0]}: ${err}`);
    return null;
  }
}

function loadWorkflows(baseDir: string): {
  workflows: ExtractedWorkflow[];
  orderOfOps: OrderOfOperations[];
  quickRef: Record<string, string[]>;
} {
  const dir = join(baseDir, "hypermill-workflows");
  const data = loadLatestJson(dir, "hypermill-workflows-");

  if (!data) {
    return { workflows: [], orderOfOps: [], quickRef: {} };
  }

  const workflows = (data.workflows?.items || [])
    .filter((w: any) => w.confidence >= 0.75 && w.steps?.length >= 2)
    .map((w: any) => ({
      id: w.id,
      name: w.name || "Unnamed Workflow",
      category: w.category || "general",
      description: w.description || "",
      prerequisites: w.prerequisites || [],
      steps: w.steps || [],
      result: w.result || "",
      source_file: w.source_file || "",
      confidence: w.confidence || 0.8,
    }));

  return {
    workflows,
    orderOfOps: data.order_of_operations || [],
    quickRef: data.quick_reference || {},
  };
}

function loadTips(baseDir: string): ExtractedTip[] {
  const dir = join(baseDir, "hypermill");
  const data = loadLatestJson(dir, "hypermill-tribal-tips-");

  if (!data?.tips) return [];

  return data.tips
    .filter((t: any) => t.title && t.body && t.title.length >= 3 && t.body.length >= 20)
    .map((t: any) => ({
      id: t.id || `tip-${Math.random().toString(36).slice(2, 8)}`,
      title: t.title,
      body: t.body,
      category: t.category || "general",
      tags: t.tags || [],
      confidence: t.confidence || 0.8,
      source: t.source || "hypermill-extracted",
    }));
}

function loadAtoms(baseDir: string): ExtractedAtom[] {
  const dir = join(baseDir, "hypermill");
  const data = loadLatestJson(dir, "hypermill-atoms-");

  if (!data?.atoms) return [];

  return data.atoms.map((a: any) => ({
    id: a.id || `atom-${Math.random().toString(36).slice(2, 8)}`,
    type: a.type || "unknown",
    name: a.name || "",
    description: a.description || "",
    parameters: a.parameters,
    source: a.source || "hypermill-extracted",
  }));
}

function loadPythonApi(baseDir: string): PythonApiFunction[] {
  const dir = join(baseDir, "hypercad");
  const data = loadLatestJson(dir, "hypercad-python-api-");

  if (!data) return [];

  const functions: PythonApiFunction[] = [];

  // Load from functions array if present
  if (data.functions) {
    for (const f of data.functions) {
      functions.push({
        name: f.name || f,
        module: f.module || "om",
        category: f.category || "general",
        description: f.description,
        signature: f.signature,
      });
    }
  }

  // Load from api_reference if present
  if (data.api_reference) {
    for (const [module, funcs] of Object.entries(data.api_reference)) {
      if (Array.isArray(funcs)) {
        for (const f of funcs as any[]) {
          functions.push({
            name: typeof f === "string" ? f : f.name,
            module,
            category: "api",
          });
        }
      }
    }
  }

  return functions;
}

function loadProperties(baseDir: string): PropertyDefinition[] {
  const dir = join(baseDir, "hypermill-api");
  const data = loadLatestJson(dir, "hypermill-api-");

  if (!data?.properties?.definitions) return [];

  return data.properties.definitions.map((p: any) => ({
    name: p.name,
    key: p.key,
    type: p.type || "unknown",
    category: p.category || "general",
    ncVariable: p.ncVariable,
  }));
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Load all extracted knowledge from data/extracted-knowledge/.
 * Results are cached for 5 minutes.
 */
export function loadExtractedKnowledge(forceReload = false): ExtractedKnowledge {
  const now = Date.now();

  if (!forceReload && _cache && now - _cacheTime < CACHE_TTL_MS) {
    return _cache;
  }

  log.info("[ExtractedKnowledgeBridge] Loading extracted knowledge...");

  const baseDir = join(process.cwd(), "data/extracted-knowledge");

  const { workflows, orderOfOps, quickRef } = loadWorkflows(baseDir);
  const tips = loadTips(baseDir);
  const atoms = loadAtoms(baseDir);
  const pythonApi = loadPythonApi(baseDir);
  const properties = loadProperties(baseDir);

  _cache = {
    workflows,
    orderOfOperations: orderOfOps,
    quickReference: quickRef,
    tips,
    atoms,
    pythonApi,
    properties,
    stats: {
      workflows: workflows.length,
      orderOfOps: orderOfOps.length,
      tips: tips.length,
      atoms: atoms.length,
      pythonFunctions: pythonApi.length,
      properties: properties.length,
      lastLoaded: new Date().toISOString(),
    },
  };

  _cacheTime = now;

  log.info(`[ExtractedKnowledgeBridge] Loaded: ${workflows.length} workflows, ${tips.length} tips, ${atoms.length} atoms, ${pythonApi.length} API functions, ${properties.length} properties`);

  return _cache;
}

/**
 * Get workflow template by process type.
 */
export function getWorkflowsForProcess(processType: string): ExtractedWorkflow[] {
  const data = loadExtractedKnowledge();
  return data.workflows.filter(w =>
    w.category.toLowerCase().includes(processType.toLowerCase()) ||
    w.name.toLowerCase().includes(processType.toLowerCase())
  );
}

/**
 * Get order of operations for a category.
 */
export function getOrderOfOperations(category?: string): OrderOfOperations[] {
  const data = loadExtractedKnowledge();
  if (!category) return data.orderOfOperations;
  return data.orderOfOperations.filter(o =>
    o.category.toLowerCase().includes(category.toLowerCase())
  );
}

/**
 * Get quick reference sequence.
 */
export function getQuickReference(key: string): string[] {
  const data = loadExtractedKnowledge();
  return data.quickReference[key] || [];
}

/**
 * Get tips filtered by criteria.
 */
export function getTips(options?: {
  category?: string;
  minConfidence?: number;
  limit?: number;
}): ExtractedTip[] {
  const data = loadExtractedKnowledge();
  let tips = data.tips;

  if (options?.category) {
    tips = tips.filter(t => t.category.toLowerCase().includes(options.category!.toLowerCase()));
  }
  if (options?.minConfidence) {
    tips = tips.filter(t => t.confidence >= options.minConfidence!);
  }
  if (options?.limit) {
    tips = tips.slice(0, options.limit);
  }

  return tips;
}

/**
 * Get Python API functions.
 */
export function getPythonApiFunctions(module?: string): PythonApiFunction[] {
  const data = loadExtractedKnowledge();
  if (!module) return data.pythonApi;
  return data.pythonApi.filter(f => f.module.includes(module));
}

/**
 * Get properties by category.
 */
export function getProperties(category?: string): PropertyDefinition[] {
  const data = loadExtractedKnowledge();
  if (!category) return data.properties;
  return data.properties.filter(p => p.category === category);
}

/**
 * Search across all extracted knowledge.
 */
export function searchExtractedKnowledge(query: string, limit = 20): {
  workflows: ExtractedWorkflow[];
  tips: ExtractedTip[];
  atoms: ExtractedAtom[];
  pythonApi: PythonApiFunction[];
} {
  const data = loadExtractedKnowledge();
  const lowerQuery = query.toLowerCase();

  const matchWorkflow = (w: ExtractedWorkflow) =>
    w.name.toLowerCase().includes(lowerQuery) ||
    w.description.toLowerCase().includes(lowerQuery) ||
    w.steps.some(s => s.action.toLowerCase().includes(lowerQuery));

  const matchTip = (t: ExtractedTip) =>
    t.title.toLowerCase().includes(lowerQuery) ||
    t.body.toLowerCase().includes(lowerQuery);

  const matchAtom = (a: ExtractedAtom) =>
    a.name.toLowerCase().includes(lowerQuery) ||
    a.description.toLowerCase().includes(lowerQuery);

  const matchApi = (f: PythonApiFunction) =>
    f.name.toLowerCase().includes(lowerQuery) ||
    (f.description || "").toLowerCase().includes(lowerQuery);

  return {
    workflows: data.workflows.filter(matchWorkflow).slice(0, limit),
    tips: data.tips.filter(matchTip).slice(0, limit),
    atoms: data.atoms.filter(matchAtom).slice(0, limit),
    pythonApi: data.pythonApi.filter(matchApi).slice(0, limit),
  };
}

/**
 * Get extraction statistics.
 */
export function getExtractionStats(): ExtractedKnowledge["stats"] {
  return loadExtractedKnowledge().stats;
}

/**
 * Clear cache to force reload on next access.
 */
export function clearCache(): void {
  _cache = null;
  _cacheTime = 0;
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export const extractedKnowledgeBridge = {
  load: loadExtractedKnowledge,
  getWorkflowsForProcess,
  getOrderOfOperations,
  getQuickReference,
  getTips,
  getPythonApiFunctions,
  getProperties,
  search: searchExtractedKnowledge,
  getStats: getExtractionStats,
  clearCache,
};
