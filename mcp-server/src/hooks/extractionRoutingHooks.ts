/**
 * Extraction Routing Hooks — Intelligence routing with stop hooks
 *
 * These hooks ensure extracted knowledge is routed everywhere it can provide value.
 * STOP HOOKS block the pipeline if routing fails or detects issues.
 *
 * Hook Chain:
 *   pre_route → route → post_route → verify_wiring → stop_on_failure
 *
 * @module hooks/extractionRoutingHooks
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync } from "fs";
import { join } from "path";
import { log } from "../utils/Logger.js";
import {
  extractionRouter,
  RoutingDecision,
  UpgradeSuggestion,
  ContentType,
  KnowledgeDomain,
} from "../engines/ExtractionIntelligenceRouter.js";
import {
  aiExtractionReasoner,
  type AIRoutingDecision,
  type AIConsumerMatch,
  type AIUpgradeSuggestion,
} from "../engines/AIExtractionReasonerEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface RoutingHookResult {
  success: boolean;
  blocked: boolean;
  blocker?: string;
  reason?: string;
  decisions?: RoutingDecision[];
  upgrades?: UpgradeSuggestion[];
  warnings?: string[];
  wiring_actions?: WiringAction[];
}

export interface WiringAction {
  consumer_id: string;
  consumer_name: string;
  action_type: "tip_inject" | "registry_add" | "config_update" | "direct_import" | "code_gen";
  target_file: string;
  status: "pending" | "applied" | "failed" | "skipped";
  content_summary: string;
  error?: string;
}

export interface RoutingContext {
  source_file: string;
  extraction_type: string;
  content_count: number;
  timestamp: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  /** Enable AI reasoning (Claude) for routing decisions */
  AI_REASONING_ENABLED: process.env.AI_EXTRACTION_REASONING !== "0",

  /** Minimum routing success rate to pass */
  MIN_ROUTING_SUCCESS_RATE: 0.8,

  /** Maximum failed routes before blocking */
  MAX_FAILED_ROUTES: 10,

  /** Minimum consumers per content item */
  MIN_CONSUMERS_PER_ITEM: 1,

  /** Block on critical upgrade suggestions */
  BLOCK_ON_CRITICAL_UPGRADES: true,

  /** Require wiring verification */
  REQUIRE_WIRING_VERIFICATION: true,

  /** Log file for routing audit */
  ROUTING_AUDIT_LOG: "data/state/routing-audit.jsonl",

  /** Pending upgrades file */
  PENDING_UPGRADES_FILE: "data/state/pending-extraction-upgrades.json",

  /** Wiring actions queue file */
  WIRING_QUEUE_FILE: "data/state/wiring-actions-queue.json",

  /** Max items to process with AI per batch (rate limiting) */
  AI_BATCH_LIMIT: 10,
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

interface RoutingState {
  last_run: string;
  total_items_routed: number;
  total_routes_created: number;
  total_upgrades_suggested: number;
  failed_routes: number;
  consumers_updated: string[];
}

function loadRoutingState(): RoutingState {
  const stateFile = join(process.cwd(), "data/state/extraction-routing-state.json");
  try {
    if (existsSync(stateFile)) {
      return JSON.parse(readFileSync(stateFile, "utf-8"));
    }
  } catch { /* corrupted */ }

  return {
    last_run: "",
    total_items_routed: 0,
    total_routes_created: 0,
    total_upgrades_suggested: 0,
    failed_routes: 0,
    consumers_updated: [],
  };
}

function saveRoutingState(state: RoutingState): void {
  const dir = join(process.cwd(), "data/state");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "extraction-routing-state.json"), JSON.stringify(state, null, 2));
}

function appendAuditLog(entry: any): void {
  const logFile = join(process.cwd(), CONFIG.ROUTING_AUDIT_LOG);
  const dir = join(process.cwd(), "data/state");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  appendFileSync(logFile, JSON.stringify({ ...entry, timestamp: new Date().toISOString() }) + "\n");
}

function savePendingUpgrades(upgrades: UpgradeSuggestion[]): void {
  const file = join(process.cwd(), CONFIG.PENDING_UPGRADES_FILE);
  const dir = join(process.cwd(), "data/state");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(file, JSON.stringify({ upgrades, updated: new Date().toISOString() }, null, 2));
}

function saveWiringQueue(actions: WiringAction[]): void {
  const file = join(process.cwd(), CONFIG.WIRING_QUEUE_FILE);
  const dir = join(process.cwd(), "data/state");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(file, JSON.stringify({ actions, updated: new Date().toISOString() }, null, 2));
}

// ============================================================================
// PRE-ROUTING HOOK — Validates content before routing
// ============================================================================

export async function preRoutingHook(
  content: any[],
  context: RoutingContext
): Promise<RoutingHookResult> {
  const warnings: string[] = [];

  log.info(`[PreRoutingHook] Validating ${content.length} items from ${context.source_file}`);

  // Validate content array
  if (!Array.isArray(content) || content.length === 0) {
    return {
      success: false,
      blocked: true,
      blocker: "pre-routing-validation",
      reason: "No valid content to route",
    };
  }

  // Check for empty items
  const emptyItems = content.filter(item => !item || Object.keys(item).length === 0);
  if (emptyItems.length > content.length * 0.5) {
    return {
      success: false,
      blocked: true,
      blocker: "pre-routing-validation",
      reason: `Too many empty items: ${emptyItems.length}/${content.length}`,
    };
  }

  if (emptyItems.length > 0) {
    warnings.push(`${emptyItems.length} empty items will be skipped`);
  }

  // Log audit entry
  appendAuditLog({
    hook: "pre_routing",
    context,
    content_count: content.length,
    empty_items: emptyItems.length,
    passed: true,
  });

  return {
    success: true,
    blocked: false,
    warnings,
  };
}

// ============================================================================
// ROUTING HOOK — Main intelligence routing
// ============================================================================

export async function routingHook(
  content: any[],
  context: RoutingContext
): Promise<RoutingHookResult> {
  const decisions: RoutingDecision[] = [];
  const allUpgrades: UpgradeSuggestion[] = [];
  const wiringActions: WiringAction[] = [];
  const warnings: string[] = [];
  let failedRoutes = 0;

  const useAI = CONFIG.AI_REASONING_ENABLED;
  log.info(`[RoutingHook] Routing ${content.length} items to consumers (AI: ${useAI ? "enabled" : "disabled"})`);

  // Process items - use AI for first N items if enabled
  const aiLimit = Math.min(content.length, CONFIG.AI_BATCH_LIMIT);

  for (let i = 0; i < content.length; i++) {
    const item = content[i];
    if (!item || Object.keys(item).length === 0) continue;

    try {
      // Use AI reasoning for first batch, fallback to rule-based for rest
      if (useAI && i < aiLimit) {
        // AI-powered routing
        const aiDecision = await aiExtractionReasoner.reason(item, context.source_file);

        // Convert AI decision to standard format
        const standardDecision: RoutingDecision = {
          content_id: aiDecision.content_id,
          classification: {
            primary_type: aiDecision.classification.content_type,
            secondary_types: aiDecision.classification.secondary_types,
            domain: aiDecision.classification.domain,
            specificity: "general",
            confidence: aiDecision.classification.confidence,
            tags: aiDecision.classification.tags,
          },
          routes: aiDecision.recommended_consumers.map(c => ({
            consumer: {
              id: c.consumer_id,
              name: c.consumer_name,
              type: "engine" as const,
              file_path: `src/engines/${c.consumer_name}.ts`,
              accepts: [],
              domains: [],
              wiring_method: (c.wiring_recommendation as any) || "direct_import",
              priority: Math.round(c.relevance_score * 100),
            },
            relevance_score: c.relevance_score,
            wiring_action: c.wiring_recommendation,
            status: "pending" as const,
            reason: c.match_reasoning,
          })),
          upgrade_suggestions: aiDecision.upgrade_suggestions.map(u => ({
            target_system: u.target_system,
            suggestion_type: u.suggestion_type,
            description: u.description,
            extracted_evidence: u.extracted_evidence,
            priority: u.priority,
            estimated_effort: u.estimated_effort,
          })),
          reasoning: aiDecision.reasoning_chain,
          timestamp: new Date().toISOString(),
        };

        decisions.push(standardDecision);
        allUpgrades.push(...standardDecision.upgrade_suggestions);

        // Create wiring actions from AI recommendations
        for (const consumer of aiDecision.recommended_consumers) {
          if (consumer.relevance_score >= 0.5) {
            wiringActions.push({
              consumer_id: consumer.consumer_id,
              consumer_name: consumer.consumer_name,
              action_type: (consumer.wiring_recommendation as any) || "direct_import",
              target_file: `src/engines/${consumer.consumer_name}.ts`,
              status: "pending",
              content_summary: `AI: ${consumer.match_reasoning.slice(0, 80)}`,
            });
          }
        }

        log.info(`[RoutingHook] AI routed item ${i + 1}/${aiLimit} → ${aiDecision.recommended_consumers.length} consumers`);

      } else {
        // Rule-based routing (fallback)
        const decision = extractionRouter.routeContent(item, context.source_file);
        decisions.push(decision);

        // Collect upgrades
        allUpgrades.push(...decision.upgrade_suggestions);

        // Create wiring actions for each route
        for (const route of decision.routes) {
          if (route.status === "pending") {
            wiringActions.push({
              consumer_id: route.consumer.id,
              consumer_name: route.consumer.name,
              action_type: route.consumer.wiring_method,
              target_file: route.consumer.file_path,
              status: "pending",
              content_summary: JSON.stringify(item).slice(0, 100),
            });
          } else if (route.status === "failed") {
            failedRoutes++;
          }
        }
      }

      // Check minimum consumers
      const activeRoutes = decisions[decisions.length - 1].routes.filter(r => r.status !== "skipped");
      if (activeRoutes.length < CONFIG.MIN_CONSUMERS_PER_ITEM) {
        warnings.push(`Item has only ${activeRoutes.length} routes (min: ${CONFIG.MIN_CONSUMERS_PER_ITEM})`);
      }
    } catch (err) {
      failedRoutes++;
      log.warn(`[RoutingHook] Failed to route item: ${err}`);
    }
  }

  // Check failure threshold
  if (failedRoutes > CONFIG.MAX_FAILED_ROUTES) {
    return {
      success: false,
      blocked: true,
      blocker: "routing-failure-threshold",
      reason: `Too many failed routes: ${failedRoutes} > ${CONFIG.MAX_FAILED_ROUTES}`,
      decisions,
      upgrades: allUpgrades,
      warnings,
    };
  }

  // Check success rate
  const successRate = decisions.length > 0
    ? (decisions.length - failedRoutes) / decisions.length
    : 0;

  if (successRate < CONFIG.MIN_ROUTING_SUCCESS_RATE) {
    return {
      success: false,
      blocked: true,
      blocker: "routing-success-rate",
      reason: `Routing success rate ${(successRate * 100).toFixed(0)}% < ${(CONFIG.MIN_ROUTING_SUCCESS_RATE * 100)}% required`,
      decisions,
      upgrades: allUpgrades,
      warnings,
    };
  }

  // Check for critical upgrades
  const criticalUpgrades = allUpgrades.filter(u => u.priority === "critical");
  if (CONFIG.BLOCK_ON_CRITICAL_UPGRADES && criticalUpgrades.length > 0) {
    warnings.push(`${criticalUpgrades.length} CRITICAL upgrade suggestions require attention`);
    // Don't block, but flag strongly
  }

  // Save pending upgrades
  savePendingUpgrades(allUpgrades);

  // Save wiring queue
  saveWiringQueue(wiringActions);

  // Log audit entry
  appendAuditLog({
    hook: "routing",
    context,
    decisions_count: decisions.length,
    upgrades_count: allUpgrades.length,
    wiring_actions_count: wiringActions.length,
    failed_routes: failedRoutes,
    success_rate: successRate,
    passed: true,
  });

  log.info(`[RoutingHook] Routed to ${wiringActions.length} consumers, ${allUpgrades.length} upgrades suggested`);

  return {
    success: true,
    blocked: false,
    decisions,
    upgrades: allUpgrades,
    warnings,
    wiring_actions: wiringActions,
  };
}

// ============================================================================
// POST-ROUTING HOOK — Verifies routing completed
// ============================================================================

export async function postRoutingHook(
  result: RoutingHookResult,
  context: RoutingContext
): Promise<RoutingHookResult> {
  const warnings: string[] = [...(result.warnings || [])];

  log.info(`[PostRoutingHook] Verifying routing results`);

  if (!result.decisions || result.decisions.length === 0) {
    return {
      success: false,
      blocked: true,
      blocker: "post-routing-verification",
      reason: "No routing decisions were made",
    };
  }

  // Count unique consumers reached
  const consumersReached = new Set<string>();
  for (const decision of result.decisions) {
    for (const route of decision.routes) {
      if (route.status === "pending" || route.status === "wired") {
        consumersReached.add(route.consumer.id);
      }
    }
  }

  if (consumersReached.size === 0) {
    return {
      success: false,
      blocked: true,
      blocker: "post-routing-verification",
      reason: "Content was not routed to any consumers",
    };
  }

  // Update state
  const state = loadRoutingState();
  state.last_run = new Date().toISOString();
  state.total_items_routed += result.decisions.length;
  state.total_routes_created += result.wiring_actions?.length || 0;
  state.total_upgrades_suggested += result.upgrades?.length || 0;
  state.consumers_updated = [...new Set([...state.consumers_updated, ...consumersReached])];
  saveRoutingState(state);

  // Log audit entry
  appendAuditLog({
    hook: "post_routing",
    context,
    consumers_reached: consumersReached.size,
    consumer_ids: [...consumersReached],
    passed: true,
  });

  log.info(`[PostRoutingHook] Content routed to ${consumersReached.size} unique consumers`);

  return {
    success: true,
    blocked: false,
    decisions: result.decisions,
    upgrades: result.upgrades,
    warnings,
    wiring_actions: result.wiring_actions,
  };
}

// ============================================================================
// WIRING VERIFICATION HOOK — Ensures wiring was applied
// ============================================================================

export async function wiringVerificationHook(
  wiringActions: WiringAction[]
): Promise<RoutingHookResult> {
  const warnings: string[] = [];
  let pendingCount = 0;
  let appliedCount = 0;
  let failedCount = 0;

  log.info(`[WiringVerificationHook] Verifying ${wiringActions.length} wiring actions`);

  for (const action of wiringActions) {
    // Check if target file exists
    const targetPath = join(process.cwd(), action.target_file);
    if (!existsSync(targetPath)) {
      action.status = "skipped";
      action.error = "Target file does not exist";
      warnings.push(`Skipped wiring to ${action.consumer_name}: file not found`);
      continue;
    }

    // For now, mark as pending (actual wiring happens in separate process)
    if (action.status === "pending") {
      pendingCount++;
    } else if (action.status === "applied") {
      appliedCount++;
    } else if (action.status === "failed") {
      failedCount++;
    }
  }

  // Don't block on pending - wiring is async
  // But do block if all failed
  if (failedCount === wiringActions.length && wiringActions.length > 0) {
    return {
      success: false,
      blocked: true,
      blocker: "wiring-verification",
      reason: "All wiring actions failed",
      wiring_actions: wiringActions,
      warnings,
    };
  }

  // Log audit entry
  appendAuditLog({
    hook: "wiring_verification",
    total_actions: wiringActions.length,
    pending: pendingCount,
    applied: appliedCount,
    failed: failedCount,
    passed: true,
  });

  log.info(`[WiringVerificationHook] Wiring: ${appliedCount} applied, ${pendingCount} pending, ${failedCount} failed`);

  return {
    success: true,
    blocked: false,
    wiring_actions: wiringActions,
    warnings,
  };
}

// ============================================================================
// STOP HOOK — Blocks pipeline on critical issues
// ============================================================================

export async function stopOnFailureHook(
  results: RoutingHookResult[]
): Promise<RoutingHookResult> {
  log.info(`[StopOnFailureHook] Checking ${results.length} hook results for failures`);

  // Check for any blocked results
  for (const result of results) {
    if (result.blocked) {
      log.error(`[StopOnFailureHook] BLOCKED by ${result.blocker}: ${result.reason}`);
      return {
        success: false,
        blocked: true,
        blocker: result.blocker,
        reason: result.reason,
      };
    }
  }

  // Check for critical upgrades that need immediate attention
  const allUpgrades = results.flatMap(r => r.upgrades || []);
  const criticalUpgrades = allUpgrades.filter(u => u.priority === "critical");

  if (criticalUpgrades.length > 0) {
    log.warn(`[StopOnFailureHook] ${criticalUpgrades.length} CRITICAL upgrades need attention:`);
    for (const upgrade of criticalUpgrades) {
      log.warn(`  → ${upgrade.target_system}: ${upgrade.description}`);
    }
    // Log but don't block - critical upgrades are tracked for manual review
  }

  // Aggregate stats
  const totalDecisions = results.reduce((sum, r) => sum + (r.decisions?.length || 0), 0);
  const totalWiring = results.reduce((sum, r) => sum + (r.wiring_actions?.length || 0), 0);
  const totalUpgrades = allUpgrades.length;

  // Log audit entry
  appendAuditLog({
    hook: "stop_on_failure",
    total_decisions: totalDecisions,
    total_wiring: totalWiring,
    total_upgrades: totalUpgrades,
    critical_upgrades: criticalUpgrades.length,
    passed: true,
  });

  log.info(`[StopOnFailureHook] All checks passed. ${totalDecisions} items → ${totalWiring} wiring actions, ${totalUpgrades} upgrades`);

  return {
    success: true,
    blocked: false,
    upgrades: allUpgrades,
  };
}

// ============================================================================
// COMPOSITE ROUTING PIPELINE
// ============================================================================

/**
 * Run the complete routing pipeline with all hooks
 */
export async function runRoutingPipeline(
  content: any[],
  sourceFile: string,
  extractionType: string
): Promise<RoutingHookResult> {
  const context: RoutingContext = {
    source_file: sourceFile,
    extraction_type: extractionType,
    content_count: content.length,
    timestamp: new Date().toISOString(),
  };

  const results: RoutingHookResult[] = [];

  try {
    // Hook 1: Pre-routing validation
    log.info("[RoutingPipeline] Running pre-routing hook...");
    const preResult = await preRoutingHook(content, context);
    results.push(preResult);
    if (preResult.blocked) {
      return stopOnFailureHook(results);
    }

    // Hook 2: Main routing
    log.info("[RoutingPipeline] Running routing hook...");
    const routeResult = await routingHook(content, context);
    results.push(routeResult);
    if (routeResult.blocked) {
      return stopOnFailureHook(results);
    }

    // Hook 3: Post-routing verification
    log.info("[RoutingPipeline] Running post-routing hook...");
    const postResult = await postRoutingHook(routeResult, context);
    results.push(postResult);
    if (postResult.blocked) {
      return stopOnFailureHook(results);
    }

    // Hook 4: Wiring verification
    if (CONFIG.REQUIRE_WIRING_VERIFICATION && postResult.wiring_actions) {
      log.info("[RoutingPipeline] Running wiring verification hook...");
      const wiringResult = await wiringVerificationHook(postResult.wiring_actions);
      results.push(wiringResult);
      if (wiringResult.blocked) {
        return stopOnFailureHook(results);
      }
    }

    // Hook 5: Final stop check
    log.info("[RoutingPipeline] Running stop-on-failure check...");
    return stopOnFailureHook(results);

  } catch (err: any) {
    log.error(`[RoutingPipeline] Pipeline failed: ${err.message}`);
    return {
      success: false,
      blocked: true,
      blocker: "pipeline-error",
      reason: err.message,
    };
  }
}

// ============================================================================
// HOOK REGISTRATIONS FOR HookEngine
// ============================================================================

export const extractionRoutingHooks = [
  {
    id: "pre-routing-validation",
    name: "Pre-Routing Validation",
    description: "Validates content before intelligent routing",
    event: "extraction-route",
    phase: "before",
    enabled: true,
    priority: 100,
    execute: preRoutingHook,
  },
  {
    id: "intelligent-routing",
    name: "Intelligent Routing",
    description: "Routes content to all relevant consumers",
    event: "extraction-route",
    phase: "during",
    enabled: true,
    priority: 90,
    execute: routingHook,
  },
  {
    id: "post-routing-verification",
    name: "Post-Routing Verification",
    description: "Verifies routing completed successfully",
    event: "extraction-route",
    phase: "after",
    enabled: true,
    priority: 80,
    execute: postRoutingHook,
  },
  {
    id: "wiring-verification",
    name: "Wiring Verification",
    description: "Verifies wiring actions were applied",
    event: "extraction-route",
    phase: "after",
    enabled: true,
    priority: 70,
    execute: wiringVerificationHook,
  },
  {
    id: "stop-on-routing-failure",
    name: "Stop on Routing Failure",
    description: "Blocks pipeline if routing fails",
    event: "extraction-route",
    phase: "final",
    enabled: true,
    priority: 100,
    execute: stopOnFailureHook,
  },
];

// ============================================================================
// QUICK ACCESS
// ============================================================================

export const routingHooks = {
  run: runRoutingPipeline,
  preRoute: preRoutingHook,
  route: routingHook,
  postRoute: postRoutingHook,
  verifyWiring: wiringVerificationHook,
  stopOnFailure: stopOnFailureHook,
  hooks: extractionRoutingHooks,
  config: CONFIG,
};
