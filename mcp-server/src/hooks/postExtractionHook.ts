/**
 * Post-Extraction Hook — Auto-triggers ingestion after extraction scripts
 *
 * This hook monitors for extraction script completion and automatically:
 *   1. Runs the ingestion pipeline
 *   2. Clears relevant engine caches
 *   3. Notifies downstream systems of new knowledge
 *
 * Registration:
 *   - Add to HookEngine registry with event "post-script"
 *   - Configure in .claude/hooks.json for CLI integration
 *
 * @module hooks/postExtractionHook
 */

import { existsSync, statSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { log } from "../utils/Logger.js";
import { runIngestion, detectNewExtractions } from "./extractionIngestionHook.js";

// ============================================================================
// TYPES
// ============================================================================

export interface PostExtractionContext {
  script_path: string;
  script_name: string;
  exit_code: number;
  duration_ms: number;
  stdout?: string;
  stderr?: string;
}

export interface PostExtractionResult {
  triggered: boolean;
  ingestion_result?: {
    files_processed: number;
    total_items: number;
  };
  caches_cleared: string[];
  notifications_sent: string[];
  errors: string[];
}

// ============================================================================
// STATE
// ============================================================================

const STATE_FILE = "data/state/post-extraction-hook-state.json";

interface HookState {
  last_trigger: string;
  scripts_monitored: string[];
  total_triggers: number;
}

function loadState(): HookState {
  const statePath = join(process.cwd(), STATE_FILE);
  if (existsSync(statePath)) {
    try {
      return JSON.parse(readFileSync(statePath, "utf-8"));
    } catch {
      // Corrupted
    }
  }
  return { last_trigger: "", scripts_monitored: [], total_triggers: 0 };
}

function saveState(state: HookState): void {
  const statePath = join(process.cwd(), STATE_FILE);
  writeFileSync(statePath, JSON.stringify(state, null, 2));
}

// ============================================================================
// EXTRACTION SCRIPT DETECTION
// ============================================================================

const EXTRACTION_SCRIPT_PATTERNS = [
  /extract-hypermill/i,
  /extract-hypercad/i,
  /extract-.*-deep/i,
  /extract-.*-api/i,
  /extract-.*-workflows/i,
  /wire-.*-extraction/i,
];

function isExtractionScript(scriptPath: string): boolean {
  const name = scriptPath.split(/[\\/]/).pop() || "";
  return EXTRACTION_SCRIPT_PATTERNS.some(pattern => pattern.test(name));
}

// ============================================================================
// CACHE CLEARING
// ============================================================================

async function clearRelevantCaches(): Promise<string[]> {
  const cleared: string[] = [];

  try {
    // Clear extracted knowledge bridge cache
    const { clearCache } = await import("../data/extractedKnowledgeBridge.js");
    clearCache();
    cleared.push("extractedKnowledgeBridge");
  } catch { /* not available */ }

  try {
    // Clear workflow template engine cache (force reload)
    const { workflowTemplateEngine } = await import("../engines/WorkflowTemplateEngine.js");
    // Reset loaded flag via reflection
    (workflowTemplateEngine as any).loaded = false;
    cleared.push("workflowTemplateEngine");
  } catch { /* not available */ }

  return cleared;
}

// ============================================================================
// DOWNSTREAM NOTIFICATIONS
// ============================================================================

async function notifyDownstreamSystems(itemCount: number): Promise<string[]> {
  const notified: string[] = [];

  try {
    // Notify event bus
    const { eventBus } = await import("../engines/EventBus.js");
    await eventBus.publish("knowledge:extracted", {
      items_added: itemCount,
      timestamp: new Date().toISOString(),
    });
    notified.push("EventBus:knowledge:extracted");
  } catch { /* not available */ }

  try {
    // Update SVI (System Variability Index) if available
    const sviPath = join(process.cwd(), "data/state/SVI_SNAPSHOT.json");
    if (existsSync(sviPath)) {
      const svi = JSON.parse(readFileSync(sviPath, "utf-8"));
      svi.tribal_tips_count = (svi.tribal_tips_count || 0) + itemCount;
      svi.last_extraction_ingest = new Date().toISOString();
      writeFileSync(sviPath, JSON.stringify(svi, null, 2));
      notified.push("SVI_SNAPSHOT");
    }
  } catch { /* not available */ }

  return notified;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Execute post-extraction hook.
 * Called after extraction scripts complete.
 */
export async function executePostExtractionHook(
  context: PostExtractionContext
): Promise<PostExtractionResult> {
  const result: PostExtractionResult = {
    triggered: false,
    caches_cleared: [],
    notifications_sent: [],
    errors: [],
  };

  // Check if this is an extraction script
  if (!isExtractionScript(context.script_path)) {
    log.debug(`[PostExtractionHook] Not an extraction script: ${context.script_name}`);
    return result;
  }

  // Check if script succeeded
  if (context.exit_code !== 0) {
    log.warn(`[PostExtractionHook] Script failed (exit ${context.exit_code}): ${context.script_name}`);
    result.errors.push(`Script exited with code ${context.exit_code}`);
    return result;
  }

  log.info(`[PostExtractionHook] Extraction script completed: ${context.script_name}`);
  result.triggered = true;

  // Check for new extractions
  const pending = detectNewExtractions();
  if (pending.length === 0) {
    log.info("[PostExtractionHook] No new extraction files to ingest");
    return result;
  }

  log.info(`[PostExtractionHook] Found ${pending.length} new extraction files`);

  // Run ingestion
  try {
    const ingestionResult = await runIngestion();
    result.ingestion_result = {
      files_processed: ingestionResult.files_processed,
      total_items: ingestionResult.total_items,
    };
    log.info(`[PostExtractionHook] Ingested ${ingestionResult.total_items} items from ${ingestionResult.files_processed} files`);
  } catch (err: any) {
    result.errors.push(`Ingestion failed: ${err.message}`);
    log.error(`[PostExtractionHook] Ingestion failed: ${err}`);
  }

  // Clear caches
  result.caches_cleared = await clearRelevantCaches();
  if (result.caches_cleared.length > 0) {
    log.info(`[PostExtractionHook] Cleared caches: ${result.caches_cleared.join(", ")}`);
  }

  // Notify downstream
  if (result.ingestion_result && result.ingestion_result.total_items > 0) {
    result.notifications_sent = await notifyDownstreamSystems(result.ingestion_result.total_items);
    if (result.notifications_sent.length > 0) {
      log.info(`[PostExtractionHook] Notified: ${result.notifications_sent.join(", ")}`);
    }
  }

  // Update state
  const state = loadState();
  state.last_trigger = new Date().toISOString();
  state.total_triggers++;
  if (!state.scripts_monitored.includes(context.script_name)) {
    state.scripts_monitored.push(context.script_name);
  }
  saveState(state);

  return result;
}

/**
 * Check for pending extractions and run ingestion if needed.
 * Can be called manually or via cron.
 */
export async function checkAndIngest(): Promise<PostExtractionResult> {
  return executePostExtractionHook({
    script_path: "manual-trigger",
    script_name: "manual-trigger",
    exit_code: 0,
    duration_ms: 0,
  });
}

/**
 * Get hook status and statistics.
 */
export function getHookStatus(): HookState & { pending_files: number } {
  const state = loadState();
  const pending = detectNewExtractions();
  return {
    ...state,
    pending_files: pending.length,
  };
}

// ============================================================================
// HOOK REGISTRATION
// ============================================================================

export const postExtractionHook = {
  id: "post-extraction-auto-ingest",
  name: "Post-Extraction Auto-Ingest",
  description: "Automatically ingests extracted knowledge after extraction scripts complete",
  event: "post-script",
  phase: "after",
  enabled: true,
  priority: 100,

  /** Execute the hook */
  execute: executePostExtractionHook,

  /** Manual trigger for testing */
  checkAndIngest,

  /** Get status */
  getStatus: getHookStatus,

  /** Check if script matches */
  matches: isExtractionScript,
};
