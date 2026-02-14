/**
 * ManusATCSBridge — F2.3: Bridges ATCS work units to Manus-style Claude API execution
 * 
 * Allows ATCS to delegate individual work units to background Claude API calls,
 * then poll results back for unit_complete integration.
 * 
 * Flow:
 *   ATCS queue_next(delegate:true) → bridge.delegateUnits() → Claude API calls (async)
 *   ATCS poll_delegated → bridge.pollResults() → completed results for unit_complete
 */
import { log } from "../utils/Logger.js";
import { hasValidApiKey, getApiKey, getModelForTier } from "../config/api-config.js";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// TYPES
// ============================================================================

export interface DelegatedUnit {
  unit_id: number;
  task_id: string;
  description: string;
  type: string;
  status: "pending" | "running" | "completed" | "failed";
  created_at: string;
  completed_at?: string;
  result?: string;
  error?: string;
  model: string;
  tokens?: { input: number; output: number };
  duration_ms?: number;
}

export interface DelegationResult {
  success: boolean;
  delegated: number;
  task_ids: Array<{ unit_id: number; task_id: string }>;
  errors?: string[];
}

export interface PollResult {
  success: boolean;
  completed: Array<{ unit_id: number; task_id: string; output: string; tokens?: any; duration_ms?: number }>;
  still_running: number;
  failed: Array<{ unit_id: number; task_id: string; error: string }>;
}

// ============================================================================
// IN-MEMORY TASK TRACKING
// ============================================================================

const delegatedTasks = new Map<string, DelegatedUnit>();
let taskCounter = 0;

function genDelegationId(): string {
  return `manus_atcs_${++taskCounter}_${Date.now()}`;
}

// ============================================================================
// CLAUDE API CALLER (same pattern as manusDispatcher)
// ============================================================================

async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  model?: string,
  maxTokens?: number
): Promise<{ text: string; tokens: { input: number; output: number }; duration_ms: number; model: string }> {
  const apiKey = getApiKey();
  const useModel = model || getModelForTier("sonnet");
  const startTime = Date.now();

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: useModel,
      max_tokens: maxTokens || 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }]
    })
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "unknown");
    throw new Error(`Claude API ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = await response.json() as any;
  const text = data.content?.map((c: any) => c.text || "").join("") || "";
  return {
    text,
    tokens: { input: data.usage?.input_tokens || 0, output: data.usage?.output_tokens || 0 },
    duration_ms: Date.now() - startTime,
    model: useModel
  };
}

// ============================================================================
// UNIT EXECUTION (async background)
// ============================================================================

async function executeUnitTask(task: DelegatedUnit, acceptanceCriteria?: any): Promise<void> {
  task.status = "running";
  try {
    const systemPrompt = buildUnitSystemPrompt(task.type, acceptanceCriteria);
    const userPrompt = buildUnitUserPrompt(task);

    const r = await callClaude(systemPrompt, userPrompt, getModelForTier("sonnet"), 4096);

    task.status = "completed";
    task.completed_at = new Date().toISOString();
    task.result = r.text;
    task.tokens = r.tokens;
    task.duration_ms = r.duration_ms;
    log.info(`[manus-atcs] Unit ${task.unit_id} completed (${r.duration_ms}ms, ${r.tokens.output} tokens)`);
  } catch (err: any) {
    task.status = "failed";
    task.completed_at = new Date().toISOString();
    task.error = err.message;
    log.error(`[manus-atcs] Unit ${task.unit_id} failed: ${err.message}`);
  }
}

function buildUnitSystemPrompt(unitType: string, criteria?: any): string {
  const criteriaStr = criteria
    ? `\n\nACCEPTANCE CRITERIA (your output MUST satisfy these):\n${JSON.stringify(criteria, null, 2)}`
    : "";

  return `You are a PRISM Manufacturing Intelligence expert executing a work unit.
Your task type: ${unitType}

RULES:
- Provide REAL, verified manufacturing data only
- NO placeholders, stubs, "TBD", "TODO", or example data
- Include sources/references where applicable
- Format output as valid JSON when structured data is expected
- For material properties: use ISO/AISI/DIN standards
- For cutting parameters: use physics-based calculations (Kienzle, Taylor)
- If you cannot determine data with certainty, say "NEEDS_RESEARCH: [reason]"
${criteriaStr}`;
}

function buildUnitUserPrompt(task: DelegatedUnit): string {
  return `Execute this work unit:\n\nUnit ID: ${task.unit_id}\nType: ${task.type}\nDescription: ${task.description}\n\nProvide the complete output for this unit. Be thorough and accurate.`;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Delegate ATCS work units to background Claude API execution.
 * Creates async tasks for each unit and returns immediately with task IDs.
 */
export async function delegateUnits(
  units: Array<{ unit_id: number; type: string; description: string }>,
  acceptanceCriteria?: any
): Promise<DelegationResult> {
  if (!hasValidApiKey()) {
    return { success: false, delegated: 0, task_ids: [], errors: ["ANTHROPIC_API_KEY not configured"] };
  }

  const taskIds: Array<{ unit_id: number; task_id: string }> = [];
  const errors: string[] = [];

  for (const unit of units) {
    try {
      const taskId = genDelegationId();
      const delegated: DelegatedUnit = {
        unit_id: unit.unit_id,
        task_id: taskId,
        description: unit.description,
        type: unit.type,
        status: "pending",
        created_at: new Date().toISOString(),
        model: getModelForTier("sonnet")
      };

      delegatedTasks.set(taskId, delegated);
      taskIds.push({ unit_id: unit.unit_id, task_id: taskId });

      // Fire async — don't await
      executeUnitTask(delegated, acceptanceCriteria).catch(e =>
        log.error(`[manus-atcs] Background execution failed for unit ${unit.unit_id}: ${e}`)
      );
    } catch (err: any) {
      errors.push(`Unit ${unit.unit_id}: ${err.message}`);
    }
  }

  log.info(`[manus-atcs] Delegated ${taskIds.length}/${units.length} units to Claude API`);

  return {
    success: taskIds.length > 0,
    delegated: taskIds.length,
    task_ids: taskIds,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Poll for completed delegated units.
 * Returns completed results ready to feed into ATCS unit_complete.
 */
export function pollResults(taskIds?: string[]): PollResult {
  const targets = taskIds
    ? taskIds.map(id => delegatedTasks.get(id)).filter(Boolean) as DelegatedUnit[]
    : Array.from(delegatedTasks.values());

  const completed: PollResult["completed"] = [];
  const failed: PollResult["failed"] = [];
  let stillRunning = 0;

  for (const task of targets) {
    if (task.status === "completed" && task.result) {
      completed.push({
        unit_id: task.unit_id,
        task_id: task.task_id,
        output: task.result,
        tokens: task.tokens,
        duration_ms: task.duration_ms
      });
    } else if (task.status === "failed") {
      failed.push({
        unit_id: task.unit_id,
        task_id: task.task_id,
        error: task.error || "Unknown error"
      });
    } else {
      stillRunning++;
    }
  }

  return { success: true, completed, still_running: stillRunning, failed };
}

/**
 * Get status of a specific delegated task.
 */
export function getDelegationStatus(taskId: string): DelegatedUnit | null {
  return delegatedTasks.get(taskId) || null;
}

/**
 * Get all active delegations for an ATCS task (by unit_id range).
 */
export function getActiveDelegations(): DelegatedUnit[] {
  return Array.from(delegatedTasks.values()).filter(t => t.status === "pending" || t.status === "running");
}

/**
 * Clear completed/failed delegations to free memory.
 */
export function clearCompletedDelegations(): number {
  let cleared = 0;
  for (const [id, task] of delegatedTasks) {
    if (task.status === "completed" || task.status === "failed") {
      delegatedTasks.delete(id);
      cleared++;
    }
  }
  return cleared;
}

// ============================================================================
// CADENCE INTEGRATION — called from autoHookWrapper
// ============================================================================

/**
 * Auto-poll for completed delegated units (cadence function).
 * Called periodically from autoHookWrapper to surface completion status.
 */
export function autoManusATCSPoll(callNumber: number): { completed: number; running: number; failed: number } {
  const all = Array.from(delegatedTasks.values());
  if (all.length === 0) return { completed: 0, running: 0, failed: 0 };

  return {
    completed: all.filter(t => t.status === "completed").length,
    running: all.filter(t => t.status === "pending" || t.status === "running").length,
    failed: all.filter(t => t.status === "failed").length
  };
}

/**
 * Get bridge status summary for _context injection.
 */
export function getBridgeStatus(): {
  active_delegations: number;
  total_tracked: number;
  by_status: Record<string, number>;
} {
  const all = Array.from(delegatedTasks.values());
  const byStatus: Record<string, number> = {};
  for (const t of all) {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
  }

  return {
    active_delegations: all.filter(t => t.status === "pending" || t.status === "running").length,
    total_tracked: all.length,
    by_status: byStatus
  };
}
