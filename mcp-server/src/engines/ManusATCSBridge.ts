/**
 * ManusATCSBridge -- F2.3: Bridges ATCS work units to background AI execution
 *
 * Allows ATCS to delegate individual work units to background AI calls (FREE
 * Ollama-first via llmEngine, with Claude as the adaptive backup), then poll
 * results back for unit_complete integration. A unit that resolves to an offline
 * stub (no provider available) is marked FAILED, never completed (R12).
 *
 * Flow:
 *   ATCS queue_next(delegate:true) -> bridge.delegateUnits() -> llmEngine calls (async, free-first)
 *   ATCS poll_delegated -> bridge.pollResults() -> completed results for unit_complete
 */
import { log } from "../utils/Logger.js";
import { getModelForTier } from "../config/api-config.js";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// TYPES
// ============================================================================

/** Delegated Unit configuration/data structure.
 */
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

/** Delegation Result configuration/data structure.
 */
export interface DelegationResult {
  success: boolean;
  delegated: number;
  task_ids: Array<{ unit_id: number; task_id: string }>;
  errors?: string[];
}

/** Poll Result configuration/data structure.
 */
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
// LLM CALLER -- FREE-first via the Ollama-first llmEngine (Claude is the backup)
// ============================================================================

/**
 * Execute one delegated work-unit prompt through the shared free-AI substrate
 * (FREE-AI-MIGRATION/U-MANUS-ATCS-LLM-ROUTE). Was a direct PAID Claude fetch;
 * now routes through `llmEngine.query` which is Ollama-first (free) with an
 * adaptive Claude backup on BOTH availability (down/timeout) AND capability
 * (refusal / too-short-for-complexity:"high"), then offline. Delegated build
 * units are non-trivial, so `complexity:"high"` raises the local-adequacy bar --
 * a weak local answer escalates to the Claude backup, matching the operator's
 * "Claude is the backup if Ollama can't handle it" rule.
 *
 * The caller's task-delegation `systemPrompt` is preserved via the `system`
 * override (it replaces the default PRISM manufacturing prompt). Return contract
 * is unchanged for `executeUnitTask`; `model` reports the REAL provider that
 * answered ("...(ollama)" | "claude-sonnet-4-6" | "offline"), and `tokens` is
 * {0,0} on the free local path (honest -- no billing). `_model` is accepted for
 * call-site compatibility but is advisory: the provider is chosen by the ladder.
 */
export async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  _model?: string,
  maxTokens?: number
): Promise<{ text: string; tokens: { input: number; output: number }; duration_ms: number; model: string }> {
  const startTime = Date.now();
  const { llmEngine } = await import("./LLMEngine.js");
  const res = await llmEngine.query({
    prompt: userPrompt,
    system: systemPrompt,
    complexity: "high",
    max_tokens: maxTokens || 4096,
  });
  return {
    text: res.answer,
    tokens: res.tokens_used,
    duration_ms: Date.now() - startTime,
    model: res.model,
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

    // R12 honesty: an "offline" result means NO real provider answered (Ollama down + no
    // Claude key) -- the text is a generic offline stub, not a real delegated build result.
    // Mark such a unit FAILED, never "completed", so callers don't trust a stub as work done.
    if (r.model === "offline") {
      task.status = "failed";
      task.completed_at = new Date().toISOString();
      task.error = "no AI provider available (Ollama down and no Claude backup key) -- delegation produced only an offline stub";
      task.duration_ms = r.duration_ms;
      log.error(`[manus-atcs] Unit ${task.unit_id} failed: no AI provider available`);
      return;
    }

    task.status = "completed";
    task.completed_at = new Date().toISOString();
    task.result = r.text;
    task.tokens = r.tokens;
    task.duration_ms = r.duration_ms;
    task.model = r.model; // honest provenance: the REAL provider that answered (ollama/claude)
    log.info(`[manus-atcs] Unit ${task.unit_id} completed via ${r.model} (${r.duration_ms}ms, ${r.tokens.output} tokens)`);
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
  * @param units - units
  * @param acceptanceCriteria - acceptance criteria
  * @returns promise resolving to delegation result
 */
export async function delegateUnits(
  units: Array<{ unit_id: number; type: string; description: string }>,
  acceptanceCriteria?: any
): Promise<DelegationResult> {
  // FREE-AI-MIGRATION: delegation no longer REQUIRES a Claude key -- callClaude routes
  // through the Ollama-first free substrate (Claude is only the backup). We proceed as long
  // as ANY provider could serve: a local Ollama OR a Claude key. With neither, units would
  // resolve to an offline stub, which executeUnitTask honestly marks FAILED (R12) rather
  // than claiming a real result. (No hard pre-gate on the Claude key alone.)

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

  log.info(`[manus-atcs] Delegated ${taskIds.length}/${units.length} units to the free AI substrate (Ollama-first, Claude backup)`);

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
  * @param taskIds - task ids
  * @returns poll result
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
  * @param taskId - task identifier
  * @returns delegated unit | null
 */
export function getDelegationStatus(taskId: string): DelegatedUnit | null {
  return delegatedTasks.get(taskId) || null;
}

/**
 * Get all active delegations for an ATCS task (by unit_id range).
  * @returns array of delegated unit items
 */
export function getActiveDelegations(): DelegatedUnit[] {
  return Array.from(delegatedTasks.values()).filter(t => t.status === "pending" || t.status === "running");
}

/**
 * Clear completed/failed delegations to free memory.
  * @returns computed numeric result
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
  * @param callNumber - call number value
  * @returns { completed: number; running: number; failed: number }
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
  * @returns {
  active_delegations: number;
  total_tracked: number;
  by_status:  record<string, number>;
}
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
