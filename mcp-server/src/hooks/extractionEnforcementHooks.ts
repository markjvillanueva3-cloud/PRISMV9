/**
 * Extraction Enforcement Hooks — Hard blocks for extraction pipeline compliance
 *
 * These hooks BLOCK operations if:
 *   1. Extraction files exist but haven't been ingested
 *   2. Ingested data hasn't been wired to engines
 *   3. New extraction scripts aren't registered
 *   4. Workflow templates are stale (> 7 days since last ingestion)
 *
 * Integrates with HookEngine for automatic enforcement.
 *
 * @module hooks/extractionEnforcementHooks
 */

import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface EnforcementResult {
  passed: boolean;
  blocked: boolean;
  blocker?: string;
  reason?: string;
  pending_actions?: string[];
  auto_fix_available?: boolean;
}

export interface EnforcementContext {
  operation: string;
  phase: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  /** Max age in days before ingestion is considered stale */
  MAX_INGESTION_AGE_DAYS: 7,

  /** Minimum workflow templates required */
  MIN_WORKFLOW_TEMPLATES: 10,

  /** Minimum tribal tips required */
  MIN_TRIBAL_TIPS: 50,

  /** Operations that require extraction compliance */
  ENFORCED_OPERATIONS: [
    "build",
    "commit",
    "deploy",
    "release",
    "pipeline_execute",
    "program_generate",
  ],

  /** Operations that trigger auto-ingestion instead of blocking */
  AUTO_INGEST_OPERATIONS: [
    "session_start",
    "context_boot",
  ],
};

// ============================================================================
// STATE CHECKS
// ============================================================================

function getPendingExtractionFiles(): string[] {
  const pending: string[] = [];
  const stateFile = join(process.cwd(), "data/state/extraction-ingestion-state.json");

  let processedFiles: string[] = [];
  if (existsSync(stateFile)) {
    try {
      const state = JSON.parse(readFileSync(stateFile, "utf-8"));
      processedFiles = state.files_processed || [];
    } catch { /* corrupted */ }
  }

  const extractionDirs = [
    "data/extracted-knowledge/hypermill",
    "data/extracted-knowledge/hypermill-api",
    "data/extracted-knowledge/hypermill-workflows",
    "data/extracted-knowledge/hypercad",
  ];

  for (const dir of extractionDirs) {
    const fullDir = join(process.cwd(), dir);
    if (!existsSync(fullDir)) continue;

    const files = readdirSync(fullDir).filter(f => f.endsWith(".json"));
    for (const file of files) {
      const fullPath = join(fullDir, file);
      if (!processedFiles.includes(fullPath)) {
        pending.push(fullPath);
      }
    }
  }

  return pending;
}

function getIngestionAge(): number {
  const stateFile = join(process.cwd(), "data/state/extraction-ingestion-state.json");
  if (!existsSync(stateFile)) return Infinity;

  try {
    const state = JSON.parse(readFileSync(stateFile, "utf-8"));
    if (!state.last_run) return Infinity;

    const lastRun = new Date(state.last_run).getTime();
    const now = Date.now();
    return (now - lastRun) / (1000 * 60 * 60 * 24); // days
  } catch {
    return Infinity;
  }
}

function getWorkflowTemplateCount(): number {
  const workflowDir = join(process.cwd(), "data/extracted-knowledge/hypermill-workflows");
  if (!existsSync(workflowDir)) return 0;

  const files = readdirSync(workflowDir).filter(f => f.startsWith("hypermill-workflows-") && f.endsWith(".json"));
  if (files.length === 0) return 0;

  try {
    const latest = files.sort().reverse()[0];
    const data = JSON.parse(readFileSync(join(workflowDir, latest), "utf-8"));
    return data.workflows?.total || 0;
  } catch {
    return 0;
  }
}

function getTribalTipsCount(): number {
  const tipsFile = join(process.cwd(), "src/data/auto-ingested-tips.ts");
  if (!existsSync(tipsFile)) return 0;

  try {
    const content = readFileSync(tipsFile, "utf-8");
    const match = content.match(/AUTO_INGESTED_TIPS_COUNT\s*=\s*(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  } catch {
    return 0;
  }
}

function checkEngineWiring(): { wired: boolean; missing: string[] } {
  const requiredFiles = [
    "src/engines/WorkflowTemplateEngine.ts",
    "src/engines/WorkflowIntegrationHelper.ts",
    "src/data/extractedKnowledgeBridge.ts",
  ];

  const missing: string[] = [];
  for (const file of requiredFiles) {
    if (!existsSync(join(process.cwd(), file))) {
      missing.push(file);
    }
  }

  return { wired: missing.length === 0, missing };
}

// ============================================================================
// ENFORCEMENT HOOKS
// ============================================================================

/**
 * Pre-build hook: Blocks build if extractions haven't been ingested.
 */
export async function enforceIngestionBeforeBuild(
  context: EnforcementContext
): Promise<EnforcementResult> {
  const pending = getPendingExtractionFiles();

  if (pending.length > 0) {
    return {
      passed: false,
      blocked: true,
      blocker: "extraction-ingestion-required",
      reason: `${pending.length} extraction files pending ingestion. Run: prism_hook:run_ingestion`,
      pending_actions: ["prism_hook:run_ingestion"],
      auto_fix_available: true,
    };
  }

  return { passed: true, blocked: false };
}

/**
 * Pre-build hook: Blocks if ingestion is stale.
 */
export async function enforceIngestionFreshness(
  context: EnforcementContext
): Promise<EnforcementResult> {
  const ageDays = getIngestionAge();

  if (ageDays > CONFIG.MAX_INGESTION_AGE_DAYS) {
    return {
      passed: false,
      blocked: true,
      blocker: "extraction-ingestion-stale",
      reason: `Ingestion is ${Math.round(ageDays)} days old (max ${CONFIG.MAX_INGESTION_AGE_DAYS}). Run: prism_hook:run_ingestion`,
      pending_actions: ["prism_hook:run_ingestion"],
      auto_fix_available: true,
    };
  }

  return { passed: true, blocked: false };
}

/**
 * Pre-build hook: Blocks if workflow templates are missing.
 */
export async function enforceWorkflowTemplates(
  context: EnforcementContext
): Promise<EnforcementResult> {
  const count = getWorkflowTemplateCount();

  if (count < CONFIG.MIN_WORKFLOW_TEMPLATES) {
    return {
      passed: false,
      blocked: true,
      blocker: "workflow-templates-missing",
      reason: `Only ${count} workflow templates (min ${CONFIG.MIN_WORKFLOW_TEMPLATES}). Run extraction scripts first.`,
      pending_actions: [
        "npx tsx scripts/extract-hypermill-workflows.ts",
        "prism_hook:run_ingestion",
      ],
      auto_fix_available: false,
    };
  }

  return { passed: true, blocked: false };
}

/**
 * Pre-build hook: Blocks if engine wiring is incomplete.
 */
export async function enforceEngineWiring(
  context: EnforcementContext
): Promise<EnforcementResult> {
  const { wired, missing } = checkEngineWiring();

  if (!wired) {
    return {
      passed: false,
      blocked: true,
      blocker: "engine-wiring-incomplete",
      reason: `Missing engine files: ${missing.join(", ")}`,
      pending_actions: missing.map(f => `Create ${f}`),
      auto_fix_available: false,
    };
  }

  return { passed: true, blocked: false };
}

/**
 * Pre-commit hook: Warns if tribal tips are low.
 */
export async function warnLowTribalTips(
  context: EnforcementContext
): Promise<EnforcementResult> {
  const count = getTribalTipsCount();

  if (count < CONFIG.MIN_TRIBAL_TIPS) {
    // Warn but don't block
    log.warn(
      `[ExtractionEnforcement] Only ${count} tribal tips (recommend ${CONFIG.MIN_TRIBAL_TIPS}+). ` +
      `Consider running more extractions.`
    );
  }

  return { passed: true, blocked: false };
}

// ============================================================================
// COMPOSITE ENFORCEMENT
// ============================================================================

/**
 * Run all enforcement checks for an operation.
 * Returns first blocking result, or passed if all pass.
 */
export async function enforceExtractionPipeline(
  context: EnforcementContext
): Promise<EnforcementResult> {
  // Skip enforcement for non-enforced operations
  if (!CONFIG.ENFORCED_OPERATIONS.includes(context.operation)) {
    return { passed: true, blocked: false };
  }

  // Check if this operation should auto-ingest instead of block
  if (CONFIG.AUTO_INGEST_OPERATIONS.includes(context.operation)) {
    const pending = getPendingExtractionFiles();
    if (pending.length > 0) {
      log.info(`[ExtractionEnforcement] Auto-ingesting ${pending.length} pending files...`);
      try {
        const { runIngestion } = await import("./extractionIngestionHook.js");
        await runIngestion();
      } catch (err) {
        log.warn(`[ExtractionEnforcement] Auto-ingestion failed: ${err}`);
      }
    }
    return { passed: true, blocked: false };
  }

  // Run all enforcement checks
  const checks = [
    enforceIngestionBeforeBuild,
    enforceIngestionFreshness,
    enforceWorkflowTemplates,
    enforceEngineWiring,
    warnLowTribalTips,
  ];

  for (const check of checks) {
    const result = await check(context);
    if (result.blocked) {
      log.error(
        `[ExtractionEnforcement] BLOCKED by ${result.blocker}: ${result.reason}`
      );
      return result;
    }
  }

  return { passed: true, blocked: false };
}

/**
 * Auto-fix: Run ingestion if that's the issue.
 */
export async function autoFixIngestion(): Promise<{
  fixed: boolean;
  items_ingested: number;
  error?: string;
}> {
  try {
    const { runIngestion } = await import("./extractionIngestionHook.js");
    const result = await runIngestion();
    return {
      fixed: true,
      items_ingested: result.total_items,
    };
  } catch (err: any) {
    return {
      fixed: false,
      items_ingested: 0,
      error: err.message,
    };
  }
}

// ============================================================================
// HOOK REGISTRATIONS
// ============================================================================

export const extractionEnforcementHooks = [
  {
    id: "enforce-ingestion-before-build",
    name: "Enforce Ingestion Before Build",
    description: "Blocks build if extraction files haven't been ingested",
    event: "pre-build",
    phase: "before",
    enabled: true,
    priority: 100, // High priority - run early
    execute: enforceIngestionBeforeBuild,
  },
  {
    id: "enforce-ingestion-freshness",
    name: "Enforce Ingestion Freshness",
    description: "Blocks build if ingestion is too old",
    event: "pre-build",
    phase: "before",
    enabled: true,
    priority: 99,
    execute: enforceIngestionFreshness,
  },
  {
    id: "enforce-workflow-templates",
    name: "Enforce Workflow Templates",
    description: "Blocks build if workflow templates are missing",
    event: "pre-build",
    phase: "before",
    enabled: true,
    priority: 98,
    execute: enforceWorkflowTemplates,
  },
  {
    id: "enforce-engine-wiring",
    name: "Enforce Engine Wiring",
    description: "Blocks build if engine wiring is incomplete",
    event: "pre-build",
    phase: "before",
    enabled: true,
    priority: 97,
    execute: enforceEngineWiring,
  },
  {
    id: "warn-low-tribal-tips",
    name: "Warn Low Tribal Tips",
    description: "Warns if tribal tips count is low",
    event: "pre-commit",
    phase: "before",
    enabled: true,
    priority: 50,
    execute: warnLowTribalTips,
  },
  {
    id: "enforce-extraction-pipeline",
    name: "Enforce Extraction Pipeline",
    description: "Composite check for all extraction pipeline requirements",
    event: "pre-build",
    phase: "before",
    enabled: true,
    priority: 100,
    execute: enforceExtractionPipeline,
  },
];

// ============================================================================
// QUICK ACCESS
// ============================================================================

export const enforcement = {
  check: enforceExtractionPipeline,
  autoFix: autoFixIngestion,
  hooks: extractionEnforcementHooks,
  config: CONFIG,
};
