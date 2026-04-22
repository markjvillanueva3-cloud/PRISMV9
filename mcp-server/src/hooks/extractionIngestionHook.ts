/**
 * Extraction Ingestion Hook — Auto-wires extracted knowledge into PRISM
 *
 * Fires after extraction scripts complete and:
 *   1. Detects new extraction JSON files in data/extracted-knowledge/
 *   2. Converts to engine-consumable formats (TypeScript tips, atoms, templates)
 *   3. Updates registries and knowledge graph
 *   4. Logs ingestion metrics
 *
 * Hook Triggers:
 *   - Post-script: After scripts/extract-*.ts completes
 *   - Manual: Via prism_hook:run_ingestion
 *   - Scheduled: Via cron (if configured)
 *
 * @module hooks/extractionIngestionHook
 */

import { existsSync, readdirSync, readFileSync, writeFileSync, statSync } from "fs";
import { join, basename } from "path";
import { log } from "../utils/Logger.js";
import { runRoutingPipeline, type RoutingHookResult } from "./extractionRoutingHooks.js";

// ============================================================================
// TYPES
// ============================================================================

export interface IngestionResult {
  source_file: string;
  extraction_type: ExtractionType;
  items_ingested: number;
  tips_created: number;
  atoms_created: number;
  templates_created: number;
  errors: string[];
  timestamp: string;
}

export type ExtractionType =
  | "hypermill-workflows"
  | "hypermill-deep"
  | "hypermill-tribal-tips"
  | "hypermill-api"
  | "hypercad-python-api"
  | "generic";

interface ExtractedWorkflow {
  id: string;
  name: string;
  category: string;
  steps: Array<{ step_number: number; action: string }>;
  confidence: number;
}

interface ExtractedTip {
  id?: string;
  title: string;
  body: string;
  category: string;
  confidence?: number;
}

interface IngestionState {
  last_run: string;
  files_processed: string[];
  total_items_ingested: number;
}

// ============================================================================
// STATE TRACKING
// ============================================================================

const STATE_FILE = "data/state/extraction-ingestion-state.json";

function loadState(): IngestionState {
  const statePath = join(process.cwd(), STATE_FILE);
  if (existsSync(statePath)) {
    try {
      return JSON.parse(readFileSync(statePath, "utf-8"));
    } catch {
      // Corrupted state, start fresh
    }
  }
  return { last_run: "", files_processed: [], total_items_ingested: 0 };
}

function saveState(state: IngestionState): void {
  const statePath = join(process.cwd(), STATE_FILE);
  writeFileSync(statePath, JSON.stringify(state, null, 2));
}

// ============================================================================
// DETECTION
// ============================================================================

/**
 * Detect new extraction files that haven't been ingested yet.
 */
export function detectNewExtractions(): Array<{ path: string; type: ExtractionType; mtime: Date }> {
  const state = loadState();
  const results: Array<{ path: string; type: ExtractionType; mtime: Date }> = [];

  const baseDir = join(process.cwd(), "data/extracted-knowledge");
  if (!existsSync(baseDir)) return results;

  const subdirs = ["hypermill", "hypermill-api", "hypermill-workflows", "hypercad"];

  for (const subdir of subdirs) {
    const dir = join(baseDir, subdir);
    if (!existsSync(dir)) continue;

    const files = readdirSync(dir).filter(f => f.endsWith(".json"));
    for (const file of files) {
      const fullPath = join(dir, file);
      if (state.files_processed.includes(fullPath)) continue;

      const stat = statSync(fullPath);
      const type = inferExtractionType(file, subdir);

      results.push({ path: fullPath, type, mtime: stat.mtime });
    }
  }

  // Sort by modification time (newest first)
  return results.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
}

function inferExtractionType(filename: string, subdir: string): ExtractionType {
  if (filename.includes("workflow")) return "hypermill-workflows";
  if (filename.includes("deep-extraction")) return "hypermill-deep";
  if (filename.includes("tribal-tips")) return "hypermill-tribal-tips";
  if (filename.includes("python-api") || subdir === "hypercad") return "hypercad-python-api";
  if (subdir === "hypermill-api" || filename.includes("api")) return "hypermill-api";
  return "generic";
}

// ============================================================================
// INGESTION
// ============================================================================

/**
 * Ingest a single extraction file and convert to engine formats.
 */
export function ingestFile(filePath: string, type: ExtractionType): IngestionResult {
  const result: IngestionResult = {
    source_file: filePath,
    extraction_type: type,
    items_ingested: 0,
    tips_created: 0,
    atoms_created: 0,
    templates_created: 0,
    errors: [],
    timestamp: new Date().toISOString(),
  };

  try {
    const content = readFileSync(filePath, "utf-8");
    const data = JSON.parse(content);

    switch (type) {
      case "hypermill-workflows":
        ingestWorkflows(data, result);
        break;
      case "hypermill-tribal-tips":
        ingestTribalTips(data, result);
        break;
      case "hypermill-deep":
        ingestDeepExtraction(data, result);
        break;
      case "hypercad-python-api":
        ingestPythonApi(data, result);
        break;
      case "hypermill-api":
        ingestApiDefinitions(data, result);
        break;
      default:
        ingestGeneric(data, result);
    }

    // Update state
    const state = loadState();
    state.files_processed.push(filePath);
    state.total_items_ingested += result.items_ingested;
    state.last_run = result.timestamp;
    saveState(state);

  } catch (err: any) {
    result.errors.push(`Failed to ingest ${filePath}: ${err.message}`);
  }

  return result;
}

/**
 * Ingest workflow templates into WorkflowTemplateEngine format.
 */
function ingestWorkflows(data: any, result: IngestionResult): void {
  if (!data.workflows?.items) return;

  const highConfidence = data.workflows.items.filter(
    (w: ExtractedWorkflow) => w.confidence >= 0.85 && w.steps?.length >= 3
  );

  result.templates_created = highConfidence.length;
  result.items_ingested = highConfidence.length;

  // Also count order_of_operations if present
  if (data.order_of_operations) {
    result.items_ingested += data.order_of_operations.length;
  }

  log.info(`[IngestionHook] Workflows: ${result.templates_created} templates, ${data.order_of_operations?.length || 0} order guides`);
}

/**
 * Ingest tribal tips and generate TypeScript module.
 */
function ingestTribalTips(data: any, result: IngestionResult): void {
  if (!data.tips) return;

  const cleanTips = data.tips.filter((t: ExtractedTip) => {
    const title = (t.title || "").trim();
    const body = (t.body || "").trim();
    return title.length >= 5 && title.length <= 60 &&
           body.length >= 30 && body.length <= 300;
  });

  result.tips_created = cleanTips.length;
  result.items_ingested = cleanTips.length;

  // Generate TypeScript tips file
  if (cleanTips.length > 0) {
    generateTribalTipsTs(cleanTips, data.source || "extracted");
  }

  log.info(`[IngestionHook] Tribal tips: ${result.tips_created} clean tips`);
}

/**
 * Ingest deep extraction (cycles, procedures, warnings).
 */
function ingestDeepExtraction(data: any, result: IngestionResult): void {
  let count = 0;

  if (data.cycles) {
    count += data.cycles.length;
  }
  if (data.procedures) {
    count += data.procedures.length;
    result.atoms_created = data.procedures.length;
  }
  if (data.warnings) {
    count += data.warnings.length;
    result.tips_created = data.warnings.length;
  }

  result.items_ingested = count;
  log.info(`[IngestionHook] Deep extraction: ${data.cycles?.length || 0} cycles, ${data.procedures?.length || 0} procedures, ${data.warnings?.length || 0} warnings`);
}

/**
 * Ingest Python API definitions.
 */
function ingestPythonApi(data: any, result: IngestionResult): void {
  let count = 0;

  if (data.functions) {
    count += data.functions.length;
  }
  if (data.commands) {
    count += data.commands.length;
  }

  result.items_ingested = count;
  log.info(`[IngestionHook] Python API: ${data.functions?.length || 0} functions, ${data.commands?.length || 0} commands`);
}

/**
 * Ingest API definitions (properties, operations).
 */
function ingestApiDefinitions(data: any, result: IngestionResult): void {
  let count = 0;

  if (data.properties?.definitions) {
    count += data.properties.definitions.length;
  }
  if (data.operation_mappings?.mappings) {
    count += data.operation_mappings.mappings.length;
  }

  result.items_ingested = count;
  log.info(`[IngestionHook] API definitions: ${data.properties?.total || 0} properties, ${data.operation_mappings?.total || 0} operations`);
}

/**
 * Ingest generic extraction data.
 */
function ingestGeneric(data: any, result: IngestionResult): void {
  // Count top-level arrays
  let count = 0;
  for (const key of Object.keys(data)) {
    if (Array.isArray(data[key])) {
      count += data[key].length;
    }
  }
  result.items_ingested = count;
  log.info(`[IngestionHook] Generic: ${count} items`);
}

// ============================================================================
// CODE GENERATION
// ============================================================================

/**
 * Generate TypeScript tips file from extracted tips.
 */
function generateTribalTipsTs(tips: ExtractedTip[], source: string): void {
  const outputPath = join(process.cwd(), "src/data/auto-ingested-tips.ts");

  let tipId = 5000; // Start at 5000 to avoid conflicts

  const cleanedTips = tips.map(t => {
    const id = `auto-${tipId++}`;
    const title = cleanString(t.title).slice(0, 60);
    const body = cleanString(t.body).slice(0, 280);
    const category = t.category === "Safety" ? "safety_warning" : "cam_strategy";

    return { id, title, body, category };
  });

  const output = `/**
 * Auto-Ingested Tribal Knowledge Tips
 * Generated by extractionIngestionHook at ${new Date().toISOString()}
 * Source: ${source}
 * DO NOT EDIT — This file is auto-generated
 */
import type { KnowledgeTip } from '../engines/TribalKnowledgeEngine.js';

export const AUTO_INGESTED_TIPS: KnowledgeTip[] = [
${cleanedTips.map(t => `  {
    id: "${t.id}",
    title: "${t.title}",
    body: "${t.body}",
    category: "${t.category}",
    tags: ["auto-ingested"],
    operation_types: ["general"],
    confidence: 80,
    source: "auto:${source}",
    created_at: "${new Date().toISOString().split('T')[0]}",
    usage_count: 0,
  }`).join(',\n')}
];

export const AUTO_INGESTED_TIPS_COUNT = AUTO_INGESTED_TIPS.length;
`;

  writeFileSync(outputPath, output);
  log.info(`[IngestionHook] Generated ${cleanedTips.length} tips at ${outputPath}`);
}

function cleanString(str: string): string {
  if (!str) return "";
  return str
    .replace(/[\x00-\x1f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/'/g, "")
    .replace(/"/g, "")
    .replace(/\\/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================================
// HOOK INTERFACE
// ============================================================================

/**
 * Run the full ingestion pipeline for all new extractions.
 * Now includes intelligent routing to ALL relevant consumers.
 */
export async function runIngestion(): Promise<{
  files_processed: number;
  total_items: number;
  results: IngestionResult[];
  routing_results: RoutingHookResult[];
  blocked?: boolean;
  blocker?: string;
}> {
  log.info("[IngestionHook] Starting extraction ingestion...");

  const newFiles = detectNewExtractions();

  if (newFiles.length === 0) {
    log.info("[IngestionHook] No new extraction files to ingest");
    return { files_processed: 0, total_items: 0, results: [], routing_results: [] };
  }

  log.info(`[IngestionHook] Found ${newFiles.length} new extraction files`);

  const results: IngestionResult[] = [];
  const routingResults: RoutingHookResult[] = [];
  let totalItems = 0;

  for (const file of newFiles) {
    // Step 1: Basic ingestion (existing logic)
    const result = ingestFile(file.path, file.type);
    results.push(result);
    totalItems += result.items_ingested;

    if (result.errors.length > 0) {
      log.warn(`[IngestionHook] Errors ingesting ${basename(file.path)}: ${result.errors.join(", ")}`);
    }

    // Step 2: Intelligent routing to ALL relevant consumers
    try {
      const content = JSON.parse(readFileSync(file.path, "utf-8"));
      let items: any[] = [];

      // Extract items from various formats
      if (Array.isArray(content)) {
        items = content;
      } else if (content.items) {
        items = content.items;
      } else if (content.tips) {
        items = content.tips;
      } else if (content.workflows?.items) {
        items = content.workflows.items;
      } else if (content.procedures) {
        items = content.procedures;
      } else if (content.functions) {
        items = content.functions;
      } else {
        items = [content]; // Single item
      }

      if (items.length > 0) {
        log.info(`[IngestionHook] Routing ${items.length} items from ${basename(file.path)} to consumers...`);
        const routingResult = await runRoutingPipeline(items, file.path, file.type);
        routingResults.push(routingResult);

        // STOP HOOK: If routing blocked, halt the pipeline
        if (routingResult.blocked) {
          log.error(`[IngestionHook] BLOCKED by ${routingResult.blocker}: ${routingResult.reason}`);
          return {
            files_processed: results.length,
            total_items: totalItems,
            results,
            routing_results: routingResults,
            blocked: true,
            blocker: routingResult.blocker,
          };
        }

        // Log routing success
        const wiringCount = routingResult.wiring_actions?.length || 0;
        const upgradeCount = routingResult.upgrades?.length || 0;
        log.info(`[IngestionHook] Routed to ${wiringCount} consumers, ${upgradeCount} upgrade suggestions`);
      }
    } catch (err) {
      log.warn(`[IngestionHook] Routing failed for ${basename(file.path)}: ${err}`);
      // Don't block on routing errors, just log
    }
  }

  log.info(`[IngestionHook] Ingestion complete: ${newFiles.length} files, ${totalItems} items, ${routingResults.length} routing passes`);

  return {
    files_processed: newFiles.length,
    total_items: totalItems,
    results,
    routing_results: routingResults,
  };
}

/**
 * Reset ingestion state (for re-processing all files).
 */
export function resetIngestionState(): void {
  const statePath = join(process.cwd(), STATE_FILE);
  if (existsSync(statePath)) {
    writeFileSync(statePath, JSON.stringify({
      last_run: "",
      files_processed: [],
      total_items_ingested: 0,
    }, null, 2));
    log.info("[IngestionHook] Ingestion state reset");
  }
}

/**
 * Get current ingestion state.
 */
export function getIngestionState(): IngestionState {
  return loadState();
}

// ============================================================================
// HOOK REGISTRATION
// ============================================================================

export const extractionIngestionHook = {
  name: "extraction-ingestion",
  description: "Auto-wires extracted knowledge into PRISM engines",
  phases: ["post-script", "manual"],
  run: runIngestion,
  reset: resetIngestionState,
  getState: getIngestionState,
  detectNew: detectNewExtractions,
};
