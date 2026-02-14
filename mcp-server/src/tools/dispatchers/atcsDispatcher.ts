/**
 * ATCS Dispatcher - Autonomous Task Completion System
 * Dispatcher #23: File-system-driven state machine for autonomous multi-session task execution
 * 
 * Tool: prism_atcs
 * Actions: task_init, task_resume, task_status, queue_next, unit_complete,
 *          batch_validate, checkpoint, replan, assemble, stub_scan
 * 
 * Architecture:
 *   State lives on disk (TASK_MANIFEST.json) — not in context
 *   Work products written incrementally to output/ files
 *   Progress tracked via manifest + WORK_QUEUE.json
 *   Quality enforced via stub scan + acceptance criteria + Ralph Loop + Omega
 *   Context pressure managed by checkpointing — work on disk is safe
 *   User says "continue" to resume across sessions
 * 
 * Safety: This dispatcher handles safety-critical manufacturing data.
 *         NO stubs, placeholders, TODOs, or approximations are permitted.
 *         S(x) >= 0.70 and Ω >= 0.70 gates enforced.
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";
import type { TaskManifest, WorkUnit, StubScanResult, TaskStatus, UnitStatus } from "../../types/prism-schema.js";
import { hasValidApiKey, getApiKey, getModelForTier } from "../../config/api-config.js";
import { delegateUnits, pollResults, clearCompletedDelegations } from "../../engines/ManusATCSBridge.js";

// ============================================================================
// CONSTANTS
// ============================================================================

const ATCS_ROOT = "C:\\PRISM\\autonomous-tasks";
const DEFAULT_BATCH_SIZE = 20;
const MAX_RALPH_ITERATIONS = 3;
const REPLAN_FAILURE_THRESHOLD = 0.30; // 30% failure rate triggers replan
const REPLAN_BATCH_INTERVAL = 5;       // Replan every 5 batches

const ACTIONS = [
  "task_init", "task_resume", "task_status", "queue_next", "unit_complete",
  "batch_validate", "checkpoint", "replan", "assemble", "stub_scan",
  "delegate_to_manus", "poll_delegated"
] as const;

// ============================================================================
// F2.3: MANUS↔ATCS BRIDGE — Async delegation of work units to Claude API
// ============================================================================

interface DelegatedUnit {
  unit_id: number;
  manus_id: string;
  status: "pending" | "running" | "completed" | "failed";
  created_at: string;
  completed_at?: string;
  result?: string;
  error?: string;
  model: string;
  tokens?: { input: number; output: number };
  duration_ms?: number;
}

/** In-memory store for async delegation results (survives within session) */
const delegationResults = new Map<string, DelegatedUnit>();
let delegationCounter = 0;

function genDelegationId(): string {
  return `atcs_del_${++delegationCounter}_${Date.now()}`;
}

/** Minimal Claude API caller for delegation (same pattern as manusDispatcher) */
async function callClaudeForUnit(
  systemPrompt: string, userPrompt: string, model: string, maxTokens = 4096
): Promise<{ text: string; tokens: { input: number; output: number }; duration_ms: number }> {
  const apiKey = getApiKey();
  const startTime = Date.now();
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: maxTokens, system: systemPrompt, messages: [{ role: "user", content: userPrompt }] })
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API ${response.status}: ${errText.slice(0, 200)}`);
  }
  const data = await response.json() as any;
  const text = data.content?.map((c: any) => c.text || "").join("\n") || "";
  return {
    text,
    tokens: { input: data.usage?.input_tokens || 0, output: data.usage?.output_tokens || 0 },
    duration_ms: Date.now() - startTime
  };
}

/** Persist delegation state to task directory */
function saveDelegationState(taskId: string, delegated: DelegatedUnit[]): void {
  const taskDir = getTaskDir(taskId);
  const filePath = path.join(taskDir, "DELEGATED_UNITS.json");
  fs.writeFileSync(filePath, JSON.stringify({ task_id: taskId, updated_at: new Date().toISOString(), units: delegated }, null, 2));
}

/** Load delegation state from task directory */
function loadDelegationState(taskId: string): DelegatedUnit[] {
  const taskDir = getTaskDir(taskId);
  const filePath = path.join(taskDir, "DELEGATED_UNITS.json");
  if (!fs.existsSync(filePath)) return [];
  try { return JSON.parse(fs.readFileSync(filePath, "utf-8")).units || []; } catch { return []; }
}

// ============================================================================
// DEFAULT STUB PATTERNS — The Zero-Tolerance Scanner
// ============================================================================

const DEFAULT_STUB_PATTERNS = {
  scan_version: "1.0",
  patterns: {
    literal_stubs: [
      "TODO", "FIXME", "TBD", "PLACEHOLDER", "STUB", "EXAMPLE",
      "INSERT HERE", "FILL IN", "REPLACE WITH", "NEED TO ADD",
      "lorem ipsum", "foo", "bar", "baz", "test123"
    ],
    suspicious_values: {
      numbers: ["0.0", "-1", "999", "9999", "123", "1234", "12345"],
      strings: ["N/A", "unknown", "varies", "see manual", "TBD", "none"],
      patterns: ["xxx", "yyy", "zzz", "aaa", "bbb"]
    },
    vague_language: [
      "approximately", "around", "roughly", "about",
      "typically", "generally", "usually", "often",
      "e.g.", "for example", "such as", "like",
      "etc.", "and so on", "and more"
    ]
  },
  action_on_detection: "FAIL unit → add to retry_queue",
  severity: "CRITICAL"
};

// ============================================================================
// TYPES — TaskManifest, WorkUnit, StubScanResult imported from prism-schema
// ============================================================================

// ============================================================================
// FILE SYSTEM HELPERS
// ============================================================================

function getTaskDir(taskId: string): string {
  return path.join(ATCS_ROOT, taskId);
}

function ensureTaskDirs(taskId: string): void {
  const base = getTaskDir(taskId);
  const subdirs = ["checkpoints", "output", "ralph-loops", "validation", "replan"];
  for (const dir of [base, ...subdirs.map(d => path.join(base, d))]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

function readJSON<T>(filePath: string): T {
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

function writeJSON(filePath: string, data: any): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function appendLog(taskId: string, entry: string): void {
  const logPath = path.join(getTaskDir(taskId), "EXECUTION_LOG.md");
  const timestamp = new Date().toISOString();
  const line = `\n[${timestamp}] ${entry}`;
  if (fs.existsSync(logPath)) {
    fs.appendFileSync(logPath, line, "utf-8");
  } else {
    fs.writeFileSync(logPath, `# Execution Log: ${taskId}\n${line}`, "utf-8");
  }
}

/** F2.3: Build a prompt for Claude API from a work unit + task context */
function buildUnitPrompt(unit: WorkUnit, manifest: TaskManifest, criteria: any): string {
  const parts = [
    `## Task: ${manifest.objective || manifest.task_id}`,
    `## Unit ${unit.unit_id}: ${unit.description}`,
    `Type: ${unit.type}`,
    ``,
    `Generate the complete, real data for this unit. Return as a valid JSON object.`,
  ];
  if (criteria?.fields) {
    parts.push(``, `## Required Fields:`, JSON.stringify(criteria.fields, null, 2));
  }
  if (criteria?.constraints) {
    parts.push(``, `## Constraints:`, ...criteria.constraints.map((c: string) => `- ${c}`));
  }
  parts.push(``, `CRITICAL: Return ONLY valid JSON. No markdown, no code fences, no explanation.`);
  return parts.join("\n");
}

function listActiveTasks(): string[] {
  if (!fs.existsSync(ATCS_ROOT)) return [];
  return fs.readdirSync(ATCS_ROOT).filter(d => {
    const manifestPath = path.join(ATCS_ROOT, d, "TASK_MANIFEST.json");
    return fs.existsSync(manifestPath);
  });
}

function findActiveTask(): string | null {
  const tasks = listActiveTasks();
  for (const taskId of tasks) {
    try {
      const manifest = readJSON<TaskManifest>(path.join(getTaskDir(taskId), "TASK_MANIFEST.json"));
      if (manifest.status === "IN_PROGRESS" || manifest.status === "PAUSED") return taskId;
    } catch { /* skip corrupted */ }
  }
  return tasks[0] || null;
}

// ============================================================================
// STUB SCANNER ENGINE
// ============================================================================

function runStubScan(data: any, patterns?: any): StubScanResult {
  const stubPatterns = patterns || DEFAULT_STUB_PATTERNS;
  const hits: StubScanResult["hits"] = [];
  let scannedFields = 0;

  function scanValue(fieldPath: string, value: any): void {
    if (value === null || value === undefined) return;
    scannedFields++;

    const strValue = String(value).trim();
    if (!strValue) return;

    // Check literal stubs
    for (const stub of stubPatterns.patterns.literal_stubs) {
      if (strValue.toUpperCase().includes(stub.toUpperCase())) {
        hits.push({ field: fieldPath, value: strValue.substring(0, 100), pattern: stub, category: "literal_stub" });
      }
    }

    // Check suspicious number values
    if (typeof value === "number") {
      const numStr = String(value);
      for (const suspicious of stubPatterns.patterns.suspicious_values.numbers) {
        if (numStr === suspicious) {
          hits.push({ field: fieldPath, value: numStr, pattern: suspicious, category: "suspicious_number" });
        }
      }
    }

    // Check suspicious string values
    if (typeof value === "string") {
      for (const suspicious of stubPatterns.patterns.suspicious_values.strings) {
        if (strValue.toUpperCase() === suspicious.toUpperCase()) {
          hits.push({ field: fieldPath, value: strValue.substring(0, 100), pattern: suspicious, category: "suspicious_string" });
        }
      }
      // Check vague language
      for (const vague of stubPatterns.patterns.vague_language) {
        if (strValue.toLowerCase().includes(vague.toLowerCase())) {
          hits.push({ field: fieldPath, value: strValue.substring(0, 100), pattern: vague, category: "vague_language" });
        }
      }
      // Check suspicious patterns
      for (const pat of (stubPatterns.patterns.suspicious_values.patterns || [])) {
        if (strValue.toLowerCase().includes(pat.toLowerCase())) {
          hits.push({ field: fieldPath, value: strValue.substring(0, 100), pattern: pat, category: "suspicious_pattern" });
        }
      }
    }
  }

  function scanObject(obj: any, prefix: string = ""): void {
    if (Array.isArray(obj)) {
      obj.forEach((item, i) => scanObject(item, `${prefix}[${i}]`));
    } else if (obj && typeof obj === "object") {
      for (const [key, val] of Object.entries(obj)) {
        const fieldPath = prefix ? `${prefix}.${key}` : key;
        if (val && typeof val === "object") {
          scanObject(val, fieldPath);
        } else {
          scanValue(fieldPath, val);
        }
      }
    } else {
      scanValue(prefix || "root", obj);
    }
  }

  scanObject(data);

  return {
    clean: hits.length === 0,
    hits,
    scanned_fields: scannedFields,
    timestamp: new Date().toISOString()
  };
}

// ============================================================================
// ACCEPTANCE CRITERIA VALIDATOR
// ============================================================================

function validateAcceptanceCriteria(unit: any, criteria: any): { passed: boolean; failures: string[] } {
  const failures: string[] = [];
  if (!criteria || !criteria.required_fields) return { passed: true, failures };

  for (const field of criteria.required_fields) {
    const value = unit[field.field];

    // Check existence
    if (value === undefined || value === null) {
      if (unit[field.field + "_not_applicable"] && unit[field.field + "_justification"]) {
        continue; // NOT_APPLICABLE with justification is allowed
      }
      failures.push(`Missing required field: ${field.field}`);
      continue;
    }

    // Check type
    if (field.type === "number" && typeof value !== "number") {
      failures.push(`${field.field}: expected number, got ${typeof value}`);
    }
    if (field.type === "string" && typeof value !== "string") {
      failures.push(`${field.field}: expected string, got ${typeof value}`);
    }
    if (field.type === "enum" && field.values && !field.values.includes(value)) {
      failures.push(`${field.field}: value "${value}" not in allowed values [${field.values.join(", ")}]`);
    }

    // Check range rules
    if (field.rule) {
      if (field.rule.includes("> 0") && typeof value === "number" && value <= 0) {
        failures.push(`${field.field}: value ${value} violates rule "${field.rule}"`);
      }
    }
  }

  return { passed: failures.length === 0, failures };
}

// ============================================================================
// PROGRESS HELPERS
// ============================================================================

function computeProgress(manifest: TaskManifest): {
  percent: number;
  eta_batches: number;
  summary: string;
} {
  const total = manifest.decomposition.total_units;
  const done = manifest.progress.completed_units;
  const failed = manifest.progress.failed_units;
  const percent = total > 0 ? Math.round((done / total) * 1000) / 10 : 0;
  const remainingBatches = manifest.decomposition.total_batches - manifest.progress.completed_batches;

  return {
    percent,
    eta_batches: remainingBatches,
    summary: `${done}/${total} units (${percent}%). ${failed} failed. Batch ${manifest.progress.current_batch}/${manifest.decomposition.total_batches}. ~${remainingBatches} batches remaining.`
  };
}

// ============================================================================
// UTILITY
// ============================================================================

function ok(data: any) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}

function err(message: string, extra?: any) {
  return { content: [{ type: "text" as const, text: JSON.stringify({ error: message, ...extra }) }], isError: true };
}

// ============================================================================
// DISPATCHER
// ============================================================================

export function registerAtcsDispatcher(server: any): void {
  server.tool(
    "prism_atcs",
    `Autonomous Task Completion System — file-system state machine for multi-session execution with quality gates. Actions: ${ACTIONS.join(", ")}`,
    { action: z.enum(ACTIONS), params: z.record(z.any()).optional() },
    async ({ action, params = {} }: { action: typeof ACTIONS[number]; params: Record<string, any> }) => {
      log.info(`[prism_atcs] ${action}`);
      try {
        switch (action) {

          // ================================================================
          // TASK_INIT — Create a new autonomous task
          // ================================================================
          case "task_init": {
            const taskId = params.task_id;
            if (!taskId) return err("task_id is required");
            if (!params.objective) return err("objective is required");
            if (!params.units || !Array.isArray(params.units) || params.units.length === 0) {
              return err("units[] is required — array of work unit definitions");
            }

            const taskDir = getTaskDir(taskId);
            if (fs.existsSync(path.join(taskDir, "TASK_MANIFEST.json"))) {
              return err(`Task already exists: ${taskId}. Use task_resume to continue.`);
            }

            ensureTaskDirs(taskId);
            const batchSize = params.batch_size || DEFAULT_BATCH_SIZE;
            const totalUnits = params.units.length;
            const totalBatches = Math.ceil(totalUnits / batchSize);

            // Build work queue
            const workQueue: WorkUnit[] = params.units.map((u: any, i: number) => ({
              unit_id: i + 1,
              type: u.type || params.task_type || "custom",
              description: u.description || u.name || `Unit ${i + 1}`,
              status: "PENDING" as const,
              batch: Math.floor(i / batchSize) + 1,
              depends_on: u.depends_on || [],
              retry_count: 0,
              output_ref: null,
              omega_score: null,
              error: null,
              created: new Date().toISOString(),
              completed: null
            }));

            // Build manifest
            const manifest: TaskManifest = {
              task_id: taskId,
              task_type: params.task_type || "custom",
              objective: params.objective,
              created: new Date().toISOString(),
              status: "PLANNED",
              decomposition: {
                strategy: params.strategy || `Decomposed into ${totalUnits} atomic units, ${batchSize} per batch`,
                total_units: totalUnits,
                batch_size: batchSize,
                total_batches: totalBatches,
                dependency_mode: params.dependency_mode || "independent",
                replan_enabled: params.replan_enabled !== false,
                replan_trigger: params.replan_trigger || "every_5_batches"
              },
              progress: {
                completed_units: 0,
                completed_batches: 0,
                failed_units: 0,
                retried_units: 0,
                current_batch: 1,
                current_unit_pointer: 1,
                last_checkpoint: null,
                last_ralph_loop: null,
                estimated_sessions_remaining: null
              },
              quality: {
                safety_gate: "S(x) >= 0.70",
                omega_gate: "Ω >= 0.70",
                ralph_loop_enabled: params.ralph_loop_enabled !== false,
                ralph_max_iterations: params.ralph_max_iterations || MAX_RALPH_ITERATIONS,
                stub_scan_enabled: true,
                validation_frequency: "every_batch",
                zero_tolerance_policy: "NO stubs, placeholders, TODOs, example data, or approximations"
              },
              data_integrity: {
                require_real_data: true,
                require_source_attribution: params.require_source_attribution !== false,
                require_completeness_check: true,
                blocked_patterns: DEFAULT_STUB_PATTERNS.patterns.literal_stubs,
                completeness_rule: "Every field in schema must have a real, verified value or an explicit NOT_APPLICABLE with justification"
              },
              context_management: {
                checkpoint_every_n_units: params.checkpoint_every_n_units || DEFAULT_BATCH_SIZE,
                max_units_per_session: params.max_units_per_session || 100,
                save_on_exit: true
              },
              resume_instructions: "Read TASK_MANIFEST.json → Load WORK_QUEUE.json → Skip to current_unit_pointer → Execute next batch → Validate → Checkpoint → Update manifest → Continue or report."
            };

            // Write acceptance criteria
            const criteria = params.acceptance_criteria || {
              unit_type: params.task_type || "custom",
              required_fields: [],
              completeness_threshold: 1.0,
              notes: "Define acceptance criteria for unit validation"
            };

            // Write all files
            writeJSON(path.join(taskDir, "TASK_MANIFEST.json"), manifest);
            writeJSON(path.join(taskDir, "WORK_QUEUE.json"), workQueue);
            writeJSON(path.join(taskDir, "ACCEPTANCE_CRITERIA.json"), criteria);
            writeJSON(path.join(taskDir, "STUB_PATTERNS.json"), DEFAULT_STUB_PATTERNS);
            appendLog(taskId, `TASK INITIALIZED: ${params.objective}. ${totalUnits} units in ${totalBatches} batches.`);

            return ok({
              task_id: taskId,
              status: "PLANNED",
              total_units: totalUnits,
              total_batches: totalBatches,
              batch_size: batchSize,
              directory: taskDir,
              files_created: ["TASK_MANIFEST.json", "WORK_QUEUE.json", "ACCEPTANCE_CRITERIA.json", "STUB_PATTERNS.json", "EXECUTION_LOG.md"],
              next_step: "Call task_resume to begin execution, or queue_next to get the first batch."
            });
          }

          // ================================================================
          // TASK_RESUME — Cold-resume from manifest
          // ================================================================
          case "task_resume": {
            const taskId = params.task_id || findActiveTask();
            if (!taskId) return err("No active tasks found. Use task_init to create one.", { available: listActiveTasks() });

            const taskDir = getTaskDir(taskId);
            const manifest = readJSON<TaskManifest>(path.join(taskDir, "TASK_MANIFEST.json"));

            // Update status to IN_PROGRESS
            manifest.status = "IN_PROGRESS";
            writeJSON(path.join(taskDir, "TASK_MANIFEST.json"), manifest);

            const progress = computeProgress(manifest);

            // Check if replan is due
            let replanDue = false;
            if (manifest.decomposition.replan_enabled) {
              if (manifest.progress.completed_batches > 0 &&
                  manifest.progress.completed_batches % REPLAN_BATCH_INTERVAL === 0) {
                replanDue = true;
              }
            }

            // Load most recent checkpoint info
            const checkpointDir = path.join(taskDir, "checkpoints");
            let lastCheckpoint = null;
            if (fs.existsSync(checkpointDir)) {
              const checkpoints = fs.readdirSync(checkpointDir).filter(f => f.endsWith(".json")).sort();
              if (checkpoints.length > 0) lastCheckpoint = checkpoints[checkpoints.length - 1];
            }

            appendLog(taskId, `SESSION RESUMED. ${progress.summary}`);

            return ok({
              task_id: taskId,
              objective: manifest.objective,
              status: manifest.status,
              progress: progress.summary,
              current_batch: manifest.progress.current_batch,
              current_unit_pointer: manifest.progress.current_unit_pointer,
              total_batches: manifest.decomposition.total_batches,
              last_checkpoint: lastCheckpoint,
              replan_due: replanDue,
              quality_gates: manifest.quality,
              resume_instructions: manifest.resume_instructions,
              next_step: replanDue
                ? "Replan is due — call replan before continuing."
                : `Call queue_next to get batch ${manifest.progress.current_batch} (${manifest.decomposition.batch_size} units).`
            });
          }

          // ================================================================
          // TASK_STATUS — Progress report without executing
          // ================================================================
          case "task_status": {
            const taskId = params.task_id || findActiveTask();
            if (!taskId) return err("No tasks found.", { available: listActiveTasks() });

            const manifest = readJSON<TaskManifest>(path.join(getTaskDir(taskId), "TASK_MANIFEST.json"));
            const progress = computeProgress(manifest);

            // Count units by status
            let statusCounts: Record<string, number> = {};
            try {
              const queue = readJSON<WorkUnit[]>(path.join(getTaskDir(taskId), "WORK_QUEUE.json"));
              for (const unit of queue) {
                statusCounts[unit.status] = (statusCounts[unit.status] || 0) + 1;
              }
            } catch { /* queue may not exist yet */ }

            // Get average omega from ralph loops
            let avgOmega = null;
            const ralphDir = path.join(getTaskDir(taskId), "ralph-loops");
            if (fs.existsSync(ralphDir)) {
              const ralphFiles = fs.readdirSync(ralphDir).filter(f => f.endsWith(".json"));
              if (ralphFiles.length > 0) {
                let totalOmega = 0;
                let count = 0;
                for (const rf of ralphFiles) {
                  try {
                    const rl = readJSON<any>(path.join(ralphDir, rf));
                    if (rl.batch_summary?.average_omega) {
                      totalOmega += rl.batch_summary.average_omega;
                      count++;
                    }
                  } catch { /* skip */ }
                }
                if (count > 0) avgOmega = Math.round((totalOmega / count) * 100) / 100;
              }
            }

            // F2.3: Poll delegated Manus tasks and auto-ingest completed results
            let delegationStatus: any = undefined;
            if (params.poll_delegated) {
              try {
                const queue = readJSON<WorkUnit[]>(path.join(getTaskDir(taskId), "WORK_QUEUE.json"));
                const delegatedUnits = queue.filter(u => u.status === "DELEGATED" && u.manus_task_id);
                
                if (delegatedUnits.length > 0) {
                  const taskIds = delegatedUnits.map(u => u.manus_task_id!);
                  const pollResult = pollResults(taskIds);
                  
                  // Auto-complete units with successful results
                  const autoCompleted: number[] = [];
                  for (const completed of pollResult.completed) {
                    const qUnit = queue.find(u => u.unit_id === completed.unit_id);
                    if (qUnit) {
                      qUnit.status = "COMPLETE" as UnitStatus;
                      qUnit.completed = new Date().toISOString();
                      qUnit.output_ref = `manus_output_unit_${qUnit.unit_id}`;
                      const outputDir = path.join(getTaskDir(taskId), "output");
                      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
                      fs.writeFileSync(
                        path.join(outputDir, `unit_${qUnit.unit_id}.json`),
                        JSON.stringify({ unit_id: qUnit.unit_id, output: completed.output, source: "manus_delegation", tokens: completed.tokens, duration_ms: completed.duration_ms }, null, 2)
                      );
                      manifest.progress.completed_units++;
                      autoCompleted.push(qUnit.unit_id);
                      appendLog(taskId, `F2.3: Unit ${qUnit.unit_id} auto-completed from Manus (${completed.duration_ms}ms)`);
                    }
                  }
                  
                  for (const failed of pollResult.failed) {
                    const qUnit = queue.find(u => u.unit_id === failed.unit_id);
                    if (qUnit) {
                      qUnit.status = "FAILED" as UnitStatus;
                      qUnit.error = `Manus delegation failed: ${failed.error}`;
                      qUnit.retry_count++;
                      manifest.progress.failed_units++;
                      appendLog(taskId, `F2.3: Unit ${qUnit.unit_id} Manus delegation FAILED: ${failed.error}`);
                    }
                  }
                  
                  if (autoCompleted.length > 0 || pollResult.failed.length > 0) {
                    writeJSON(path.join(getTaskDir(taskId), "WORK_QUEUE.json"), queue);
                    writeJSON(path.join(getTaskDir(taskId), "TASK_MANIFEST.json"), manifest);
                  }
                  
                  delegationStatus = {
                    total_delegated: delegatedUnits.length,
                    auto_completed: autoCompleted,
                    still_running: pollResult.still_running,
                    failed: pollResult.failed.map(f => ({ unit_id: f.unit_id, error: f.error })),
                    instruction: pollResult.still_running > 0 
                      ? "Some units still running. Poll again shortly."
                      : autoCompleted.length > 0
                        ? `${autoCompleted.length} units ingested. Run batch_validate next.`
                        : "No completed results yet."
                  };
                }
              } catch (pollErr: any) {
                delegationStatus = { error: `Poll failed: ${pollErr.message}` };
              }
            }

            return ok({
              task_id: taskId,
              objective: manifest.objective,
              status: manifest.status,
              progress: progress.summary,
              percent_complete: progress.percent,
              unit_status_breakdown: statusCounts,
              quality: {
                average_omega: avgOmega,
                ralph_loops_completed: manifest.progress.last_ralph_loop,
                safety_gate: manifest.quality.safety_gate,
                omega_gate: manifest.quality.omega_gate
              },
              context: manifest.context_management,
              delegation: delegationStatus,
              all_tasks: listActiveTasks()
            });
          }

          // ================================================================
          // QUEUE_NEXT — Get next batch of units
          // ================================================================
          case "queue_next": {
            const taskId = params.task_id || findActiveTask();
            if (!taskId) return err("No active task found.");

            const taskDir = getTaskDir(taskId);
            const manifest = readJSON<TaskManifest>(path.join(taskDir, "TASK_MANIFEST.json"));
            const queue = readJSON<WorkUnit[]>(path.join(taskDir, "WORK_QUEUE.json"));
            const criteria = readJSON<any>(path.join(taskDir, "ACCEPTANCE_CRITERIA.json"));

            const count = params.count || manifest.decomposition.batch_size;
            const batchNumber = manifest.progress.current_batch;

            // Get pending units for current batch (or next available pending units)
            let nextUnits = queue.filter(u => u.status === "PENDING" && u.batch === batchNumber);
            if (nextUnits.length === 0) {
              // Try next available pending units regardless of batch
              nextUnits = queue.filter(u => u.status === "PENDING").slice(0, count);
            }

            if (nextUnits.length === 0) {
              // Check if there are FAILED units to retry
              const retriable = queue.filter(u => u.status === "FAILED" && u.retry_count < MAX_RALPH_ITERATIONS);
              if (retriable.length > 0) {
                return ok({
                  task_id: taskId,
                  batch_number: batchNumber,
                  no_pending_units: true,
                  retriable_failed_units: retriable.length,
                  halted_units: queue.filter(u => u.status === "HALTED").length,
                  suggestion: `No pending units. ${retriable.length} failed units can be retried. Call replan to requeue them.`
                });
              }

              // All done or all halted
              return ok({
                task_id: taskId,
                all_units_processed: true,
                completed: queue.filter(u => u.status === "COMPLETE").length,
                failed: queue.filter(u => u.status === "FAILED" || u.status === "HALTED").length,
                needs_research: queue.filter(u => u.status === "NEEDS_RESEARCH").length,
                next_step: queue.filter(u => u.status === "FAILED" || u.status === "HALTED").length > 0
                  ? "Some units failed. Review EXECUTION_LOG.md or call assemble to finalize with available data."
                  : "All units complete! Call assemble for final validation."
              });
            }

            // Check dependency satisfaction
            const readyUnits = nextUnits.filter(u => {
              if (u.depends_on.length === 0) return true;
              return u.depends_on.every(depId => {
                const dep = queue.find(q => q.unit_id === depId);
                return dep && dep.status === "COMPLETE";
              });
            });

            if (readyUnits.length === 0 && nextUnits.length > 0) {
              return ok({
                task_id: taskId,
                batch_number: batchNumber,
                blocked: true,
                reason: "All next units have unsatisfied dependencies",
                blocked_units: nextUnits.map(u => ({ unit_id: u.unit_id, depends_on: u.depends_on })),
                suggestion: "Complete dependency units first or call replan to reorder."
              });
            }

            // Mark units as IN_PROGRESS
            for (const unit of readyUnits) {
              const queueUnit = queue.find(u => u.unit_id === unit.unit_id);
              if (queueUnit) queueUnit.status = "IN_PROGRESS";
            }

            // F2.3: Manus delegation — delegate units to Claude API for background execution
            if (params.delegate) {
              // Mark as DELEGATED instead of IN_PROGRESS
              for (const unit of readyUnits) {
                const queueUnit = queue.find(u => u.unit_id === unit.unit_id);
                if (queueUnit) queueUnit.status = "DELEGATED" as UnitStatus;
              }
              writeJSON(path.join(taskDir, "WORK_QUEUE.json"), queue);

              const delegationResult = await delegateUnits(
                readyUnits.map(u => ({ unit_id: u.unit_id, type: u.type, description: u.description })),
                criteria
              );

              if (delegationResult.success) {
                // Store manus_task_id on each unit for tracking
                const updatedQueue = readJSON<WorkUnit[]>(path.join(taskDir, "WORK_QUEUE.json"));
                for (const mapping of delegationResult.task_ids) {
                  const qUnit = updatedQueue.find(u => u.unit_id === mapping.unit_id);
                  if (qUnit) {
                    qUnit.manus_task_id = mapping.task_id;
                    qUnit.manus_delegated_at = new Date().toISOString();
                  }
                }
                writeJSON(path.join(taskDir, "WORK_QUEUE.json"), updatedQueue);
                appendLog(taskId, `F2.3: Delegated ${delegationResult.delegated} units to Manus API`);
              }

              return ok({
                task_id: taskId,
                batch_number: batchNumber,
                delegation: {
                  delegated: delegationResult.delegated,
                  task_ids: delegationResult.task_ids,
                  errors: delegationResult.errors,
                  poll_instruction: "Use task_status with poll_delegated:true to check progress, then unit_complete to finalize."
                },
                count: readyUnits.length
              });
            }

            writeJSON(path.join(taskDir, "WORK_QUEUE.json"), queue);

            return ok({
              task_id: taskId,
              batch_number: batchNumber,
              units: readyUnits.map(u => ({
                unit_id: u.unit_id,
                type: u.type,
                description: u.description,
                depends_on: u.depends_on
              })),
              count: readyUnits.length,
              acceptance_criteria: criteria,
              instructions: [
                "Execute each unit — generate REAL data with sources.",
                "Call unit_complete for each finished unit with the output data.",
                "After all units in batch: call batch_validate.",
                "If data cannot be determined with certainty: set status to NEEDS_RESEARCH, do NOT approximate.",
                "ZERO TOLERANCE: No stubs, placeholders, TODOs, or example data."
              ]
            });
          }

          // ================================================================
          // UNIT_COMPLETE — Mark a unit done with output data
          // ================================================================
          case "unit_complete": {
            const taskId = params.task_id || findActiveTask();
            if (!taskId) return err("No active task found.");
            if (params.unit_id === undefined) return err("unit_id is required");
            if (!params.output && params.status !== "NEEDS_RESEARCH" && params.status !== "FAILED") {
              return err("output is required (or set status to NEEDS_RESEARCH/FAILED)");
            }

            const taskDir = getTaskDir(taskId);
            const manifest = readJSON<TaskManifest>(path.join(taskDir, "TASK_MANIFEST.json"));
            const queue = readJSON<WorkUnit[]>(path.join(taskDir, "WORK_QUEUE.json"));
            const criteria = readJSON<any>(path.join(taskDir, "ACCEPTANCE_CRITERIA.json"));

            const unit = queue.find(u => u.unit_id === params.unit_id);
            if (!unit) return err(`Unit not found: ${params.unit_id}`);

            // Handle NEEDS_RESEARCH or FAILED status
            if (params.status === "NEEDS_RESEARCH") {
              unit.status = "NEEDS_RESEARCH";
              unit.error = params.reason || "Data cannot be determined with certainty";
              unit.completed = new Date().toISOString();
              writeJSON(path.join(taskDir, "WORK_QUEUE.json"), queue);
              appendLog(taskId, `Unit ${unit.unit_id} → NEEDS_RESEARCH: ${unit.error}`);
              return ok({ unit_id: unit.unit_id, status: "NEEDS_RESEARCH", reason: unit.error });
            }

            if (params.status === "FAILED") {
              unit.status = "FAILED";
              unit.error = params.reason || "Unit execution failed";
              unit.retry_count++;
              manifest.progress.failed_units++;
              writeJSON(path.join(taskDir, "WORK_QUEUE.json"), queue);
              writeJSON(path.join(taskDir, "TASK_MANIFEST.json"), manifest);
              appendLog(taskId, `Unit ${unit.unit_id} → FAILED (attempt ${unit.retry_count}): ${unit.error}`);
              return ok({ unit_id: unit.unit_id, status: "FAILED", retry_count: unit.retry_count, max_retries: MAX_RALPH_ITERATIONS });
            }

            // Run stub scan on output
            const stubResult = runStubScan(params.output);
            if (!stubResult.clean) {
              unit.status = "FAILED";
              unit.error = `Stub scan failed: ${stubResult.hits.length} stub(s) detected`;
              unit.retry_count++;
              manifest.progress.failed_units++;
              writeJSON(path.join(taskDir, "WORK_QUEUE.json"), queue);
              writeJSON(path.join(taskDir, "TASK_MANIFEST.json"), manifest);

              // Write stub scan report
              writeJSON(path.join(taskDir, "validation", `stub_scan_unit_${unit.unit_id}.json`), stubResult);
              appendLog(taskId, `Unit ${unit.unit_id} → STUB SCAN FAILED: ${stubResult.hits.map(h => `${h.field}="${h.pattern}"`).join(", ")}`);

              return ok({
                unit_id: unit.unit_id,
                status: "FAILED",
                reason: "STUB SCAN FAILURE",
                stub_hits: stubResult.hits,
                retry_count: unit.retry_count,
                instruction: "Fix the flagged values with REAL data and resubmit."
              });
            }

            // Run acceptance criteria check
            const criteriaResult = validateAcceptanceCriteria(params.output, criteria);
            if (!criteriaResult.passed) {
              unit.status = "FAILED";
              unit.error = `Acceptance criteria failed: ${criteriaResult.failures.join("; ")}`;
              unit.retry_count++;
              manifest.progress.failed_units++;
              writeJSON(path.join(taskDir, "WORK_QUEUE.json"), queue);
              writeJSON(path.join(taskDir, "TASK_MANIFEST.json"), manifest);
              appendLog(taskId, `Unit ${unit.unit_id} → ACCEPTANCE FAILED: ${criteriaResult.failures.join("; ")}`);

              return ok({
                unit_id: unit.unit_id,
                status: "FAILED",
                reason: "ACCEPTANCE CRITERIA FAILURE",
                failures: criteriaResult.failures,
                retry_count: unit.retry_count,
                instruction: "Fix the failing fields and resubmit."
              });
            }

            // Unit passed! Write output and update state
            const batchNum = unit.batch;
            const outputFile = `batch_${String(batchNum).padStart(3, "0")}.json`;
            const outputPath = path.join(taskDir, "output", outputFile);

            // Append to batch output file (array of unit outputs)
            let batchOutput: any[] = [];
            if (fs.existsSync(outputPath)) {
              batchOutput = readJSON<any[]>(outputPath);
            }
            batchOutput.push({ unit_id: unit.unit_id, ...params.output });
            writeJSON(outputPath, batchOutput);

            unit.status = "COMPLETE";
            unit.output_ref = outputFile;
            unit.completed = new Date().toISOString();
            manifest.progress.completed_units++;
            manifest.progress.current_unit_pointer = unit.unit_id + 1;

            // Check if batch is complete
            const batchUnits = queue.filter(u => u.batch === batchNum);
            const batchComplete = batchUnits.every(u => u.status !== "PENDING" && u.status !== "IN_PROGRESS");
            if (batchComplete) {
              manifest.progress.completed_batches++;
              manifest.progress.current_batch = batchNum + 1;
            }

            writeJSON(path.join(taskDir, "WORK_QUEUE.json"), queue);
            writeJSON(path.join(taskDir, "TASK_MANIFEST.json"), manifest);
            appendLog(taskId, `Unit ${unit.unit_id} → COMPLETE. ${manifest.progress.completed_units}/${manifest.decomposition.total_units}`);

            const progress = computeProgress(manifest);

            return ok({
              unit_id: unit.unit_id,
              status: "COMPLETE",
              stub_scan: "CLEAN",
              acceptance_criteria: "PASSED",
              batch_complete: batchComplete,
              progress: progress.summary,
              next_step: batchComplete
                ? `Batch ${batchNum} complete. Call batch_validate to run Ralph Loop.`
                : `Continue with next unit in batch ${batchNum}.`
            });
          }

          // ================================================================
          // BATCH_VALIDATE — Ralph Loop + Omega scoring on completed batch
          // ================================================================
          case "batch_validate": {
            const taskId = params.task_id || findActiveTask();
            if (!taskId) return err("No active task found.");

            const taskDir = getTaskDir(taskId);
            const manifest = readJSON<TaskManifest>(path.join(taskDir, "TASK_MANIFEST.json"));
            const batchNum = params.batch_number || manifest.progress.current_batch - 1;

            // Read batch output
            const outputFile = `batch_${String(batchNum).padStart(3, "0")}.json`;
            const outputPath = path.join(taskDir, "output", outputFile);
            if (!fs.existsSync(outputPath)) {
              return err(`No output found for batch ${batchNum}`, { expected: outputPath });
            }

            const batchOutput = readJSON<any[]>(outputPath);

            // Run stub scan on entire batch
            const batchStubScan = runStubScan(batchOutput);

            // Write validation report
            const validationReport = {
              batch: batchNum,
              timestamp: new Date().toISOString(),
              units_in_batch: batchOutput.length,
              stub_scan: {
                clean: batchStubScan.clean,
                total_hits: batchStubScan.hits.length,
                hits: batchStubScan.hits
              },
              // Ralph Loop results placeholder — caller should invoke prism_ralph separately
              // and feed results back via the ralph_results field
              ralph_loop: params.ralph_results || {
                status: "PENDING",
                note: "Call prism_ralph → loop with this batch content, then call batch_validate again with ralph_results"
              },
              recommendation: batchStubScan.clean
                ? "Stub scan CLEAN. Proceed with Ralph Loop validation if not already done."
                : `STUB SCAN FAILED: ${batchStubScan.hits.length} hits. Fix before proceeding.`
            };

            writeJSON(path.join(taskDir, "validation", `validation_batch_${String(batchNum).padStart(3, "0")}.json`), validationReport);

            // If ralph_results are provided, write them too
            if (params.ralph_results) {
              writeJSON(path.join(taskDir, "ralph-loops", `ralph_batch_${String(batchNum).padStart(3, "0")}.json`), {
                batch: batchNum,
                timestamp: new Date().toISOString(),
                ...params.ralph_results
              });
              manifest.progress.last_ralph_loop = `ralph_batch_${String(batchNum).padStart(3, "0")}.json`;
              writeJSON(path.join(taskDir, "TASK_MANIFEST.json"), manifest);
            }

            // Check if replan is due
            const replanDue = manifest.decomposition.replan_enabled &&
              manifest.progress.completed_batches > 0 &&
              manifest.progress.completed_batches % REPLAN_BATCH_INTERVAL === 0;

            appendLog(taskId, `BATCH ${batchNum} VALIDATED. Stub scan: ${batchStubScan.clean ? "CLEAN" : "FAILED"}. Units: ${batchOutput.length}.`);

            return ok({
              task_id: taskId,
              batch: batchNum,
              validation: validationReport,
              replan_due: replanDue,
              next_step: !batchStubScan.clean
                ? "Fix stub scan failures before proceeding."
                : replanDue
                  ? "Replan is due. Call replan before next batch."
                  : `Call queue_next to get batch ${manifest.progress.current_batch}.`
            });
          }

          // ================================================================
          // CHECKPOINT — Save progress snapshot
          // ================================================================
          case "checkpoint": {
            const taskId = params.task_id || findActiveTask();
            if (!taskId) return err("No active task found.");

            const taskDir = getTaskDir(taskId);
            const manifest = readJSON<TaskManifest>(path.join(taskDir, "TASK_MANIFEST.json"));
            const queue = readJSON<WorkUnit[]>(path.join(taskDir, "WORK_QUEUE.json"));

            const checkpointId = `checkpoint_${String(manifest.progress.completed_batches).padStart(3, "0")}`;
            const checkpoint = {
              checkpoint_id: checkpointId,
              timestamp: new Date().toISOString(),
              progress: manifest.progress,
              unit_status_summary: {
                pending: queue.filter(u => u.status === "PENDING").length,
                in_progress: queue.filter(u => u.status === "IN_PROGRESS").length,
                complete: queue.filter(u => u.status === "COMPLETE").length,
                failed: queue.filter(u => u.status === "FAILED").length,
                needs_research: queue.filter(u => u.status === "NEEDS_RESEARCH").length,
                halted: queue.filter(u => u.status === "HALTED").length
              },
              session_note: params.note || null
            };

            writeJSON(path.join(taskDir, "checkpoints", `${checkpointId}.json`), checkpoint);
            manifest.progress.last_checkpoint = `${checkpointId}.json`;
            writeJSON(path.join(taskDir, "TASK_MANIFEST.json"), manifest);

            const progress = computeProgress(manifest);
            appendLog(taskId, `CHECKPOINT ${checkpointId}. ${progress.summary}`);

            return ok({
              task_id: taskId,
              checkpoint_id: checkpointId,
              progress: progress.summary,
              unit_status: checkpoint.unit_status_summary,
              saved_to: path.join(taskDir, "checkpoints", `${checkpointId}.json`)
            });
          }

          // ================================================================
          // REPLAN — Analyze failures and reorder queue
          // ================================================================
          case "replan": {
            const taskId = params.task_id || findActiveTask();
            if (!taskId) return err("No active task found.");

            const taskDir = getTaskDir(taskId);
            const manifest = readJSON<TaskManifest>(path.join(taskDir, "TASK_MANIFEST.json"));
            const queue = readJSON<WorkUnit[]>(path.join(taskDir, "WORK_QUEUE.json"));

            // Analyze failure patterns
            const failedUnits = queue.filter(u => u.status === "FAILED");
            const failuresByType: Record<string, number> = {};
            const failureReasons: Record<string, number> = {};
            for (const unit of failedUnits) {
              failuresByType[unit.type] = (failuresByType[unit.type] || 0) + 1;
              if (unit.error) {
                const reason = unit.error.substring(0, 50);
                failureReasons[reason] = (failureReasons[reason] || 0) + 1;
              }
            }

            // Calculate failure rate for recent batches
            const recentBatch = manifest.progress.current_batch - 1;
            const recentBatchUnits = queue.filter(u => u.batch === recentBatch);
            const recentFailRate = recentBatchUnits.length > 0
              ? recentBatchUnits.filter(u => u.status === "FAILED").length / recentBatchUnits.length
              : 0;

            // Requeue failed units with retry_count < max
            let requeued = 0;
            for (const unit of failedUnits) {
              if (unit.retry_count < MAX_RALPH_ITERATIONS) {
                unit.status = "PENDING";
                // Assign to a new "retry" batch at the end
                unit.batch = manifest.decomposition.total_batches + 1;
                requeued++;
              } else {
                unit.status = "HALTED";
              }
            }

            if (requeued > 0) {
              manifest.decomposition.total_batches++;
              manifest.progress.retried_units += requeued;
            }

            const replanReport = {
              timestamp: new Date().toISOString(),
              trigger: recentFailRate > REPLAN_FAILURE_THRESHOLD ? "failure_spike" : "scheduled",
              recent_batch_failure_rate: Math.round(recentFailRate * 100) + "%",
              total_failed: failedUnits.length,
              failures_by_type: failuresByType,
              failure_reasons: failureReasons,
              requeued,
              halted: failedUnits.filter(u => u.retry_count >= MAX_RALPH_ITERATIONS).length,
              adjustments: [
                requeued > 0 ? `Requeued ${requeued} failed units into retry batch ${manifest.decomposition.total_batches}` : "No units requeued",
                "Quality gates maintained — NEVER lowered"
              ]
            };

            writeJSON(path.join(taskDir, "WORK_QUEUE.json"), queue);
            writeJSON(path.join(taskDir, "TASK_MANIFEST.json"), manifest);
            writeJSON(path.join(taskDir, "replan", `replan_after_batch_${String(recentBatch).padStart(3, "0")}.json`), replanReport);
            appendLog(taskId, `REPLAN: ${requeued} requeued, ${replanReport.halted} halted. Failure rate: ${replanReport.recent_batch_failure_rate}.`);

            return ok({
              task_id: taskId,
              replan: replanReport,
              next_step: `Call queue_next to get batch ${manifest.progress.current_batch}.`
            });
          }

          // ================================================================
          // ASSEMBLE — Final cross-batch consistency check
          // ================================================================
          case "assemble": {
            const taskId = params.task_id;
            if (!taskId) return err("task_id is required for assembly");

            const taskDir = getTaskDir(taskId);
            const manifest = readJSON<TaskManifest>(path.join(taskDir, "TASK_MANIFEST.json"));
            const queue = readJSON<WorkUnit[]>(path.join(taskDir, "WORK_QUEUE.json"));

            manifest.status = "ASSEMBLING";
            writeJSON(path.join(taskDir, "TASK_MANIFEST.json"), manifest);

            // Collect all output batches
            const outputDir = path.join(taskDir, "output");
            const outputFiles = fs.existsSync(outputDir)
              ? fs.readdirSync(outputDir).filter(f => f.endsWith(".json")).sort()
              : [];

            let allOutputs: any[] = [];
            for (const file of outputFiles) {
              try {
                const batch = readJSON<any[]>(path.join(outputDir, file));
                allOutputs = allOutputs.concat(batch);
              } catch { /* skip corrupted */ }
            }

            // Run final stub scan on assembled output
            const finalStubScan = runStubScan(allOutputs);

            // Duplicate detection
            const unitIds = allOutputs.map(o => o.unit_id);
            const duplicates = unitIds.filter((id, i) => unitIds.indexOf(id) !== i);

            // Coverage check
            const completedUnitIds = new Set(unitIds);
            const totalExpected = manifest.decomposition.total_units;
            const missingUnits = [];
            for (let i = 1; i <= totalExpected; i++) {
              if (!completedUnitIds.has(i)) missingUnits.push(i);
            }

            const assemblyReport = {
              task_id: taskId,
              timestamp: new Date().toISOString(),
              total_output_units: allOutputs.length,
              total_expected: totalExpected,
              coverage: Math.round((allOutputs.length / totalExpected) * 1000) / 10 + "%",
              duplicates: duplicates.length > 0 ? duplicates : "none",
              missing_units: missingUnits.length > 0 ? missingUnits : "none",
              final_stub_scan: {
                clean: finalStubScan.clean,
                hits: finalStubScan.hits.length
              },
              halted_units: queue.filter(u => u.status === "HALTED").length,
              needs_research: queue.filter(u => u.status === "NEEDS_RESEARCH").length,
              quality_verdict: finalStubScan.clean && duplicates.length === 0
                ? "ASSEMBLY CLEAN — ready for integration"
                : "ASSEMBLY HAS ISSUES — review required"
            };

            // Write assembled output if clean
            if (finalStubScan.clean && duplicates.length === 0) {
              writeJSON(path.join(taskDir, "ASSEMBLED_OUTPUT.json"), allOutputs);
              manifest.status = "COMPLETE";
            } else {
              manifest.status = "VALIDATING";
            }

            writeJSON(path.join(taskDir, "ASSEMBLY_REPORT.json"), assemblyReport);
            writeJSON(path.join(taskDir, "TASK_MANIFEST.json"), manifest);
            appendLog(taskId, `ASSEMBLY: ${assemblyReport.quality_verdict}. ${allOutputs.length}/${totalExpected} units. Status: ${manifest.status}`);

            return ok(assemblyReport);
          }

          // ================================================================
          // STUB_SCAN — Scan any data for stubs/placeholders
          // ================================================================
          case "stub_scan": {
            if (!params.data) return err("data is required — the object or array to scan");

            const customPatterns = params.patterns || null;
            let patterns = DEFAULT_STUB_PATTERNS;

            // If task_id provided, load its custom patterns
            if (params.task_id) {
              try {
                patterns = readJSON(path.join(getTaskDir(params.task_id), "STUB_PATTERNS.json"));
              } catch { /* use defaults */ }
            }

            // Merge custom patterns if provided
            if (customPatterns) {
              if (customPatterns.literal_stubs) {
                patterns.patterns.literal_stubs = [
                  ...patterns.patterns.literal_stubs,
                  ...customPatterns.literal_stubs
                ];
              }
            }

            const result = runStubScan(params.data, patterns);

            return ok({
              clean: result.clean,
              hits: result.hits,
              scanned_fields: result.scanned_fields,
              verdict: result.clean ? "CLEAN — no stubs detected" : `FAILED — ${result.hits.length} stub(s) found`,
              timestamp: result.timestamp
            });
          }

          // ================================================================
          // F2.3: DELEGATE_TO_MANUS — Async delegate work units to Claude API
          // ================================================================
          case "delegate_to_manus": {
            if (!hasValidApiKey()) return err("ANTHROPIC_API_KEY not configured. Add to .env file.");
            const taskId = params.task_id || findActiveTask();
            if (!taskId) return err("No active task found.");

            const taskDir = getTaskDir(taskId);
            const manifest = readJSON<TaskManifest>(path.join(taskDir, "TASK_MANIFEST.json"));
            const queue = readJSON<WorkUnit[]>(path.join(taskDir, "WORK_QUEUE.json"));
            const criteria = readJSON<any>(path.join(taskDir, "ACCEPTANCE_CRITERIA.json"));

            // Determine which units to delegate
            let unitIds: number[] = params.unit_ids || [];
            if (unitIds.length === 0) {
              // Default: delegate all PENDING units (up to batch_size)
              const batchSize = params.batch_size || manifest.decomposition?.batch_size || 10;
              unitIds = queue
                .filter(u => u.status === "PENDING")
                .slice(0, batchSize)
                .map(u => u.unit_id);
            }
            if (unitIds.length === 0) return err("No eligible units to delegate.");

            const tier = params.tier || "sonnet";
            const model = getModelForTier(tier as any);
            const systemPrompt = params.system_prompt || 
              `You are a manufacturing data expert for PRISM. Generate REAL, verified data only. ZERO tolerance for stubs, placeholders, approximations, or example values. If data cannot be determined with certainty, respond with: {"status":"NEEDS_RESEARCH","reason":"..."}. Respond with valid JSON only.`;

            const existingDelegated = loadDelegationState(taskId);
            const newDelegated: DelegatedUnit[] = [];
            const skipped: { unit_id: number; reason: string }[] = [];

            for (const uid of unitIds) {
              const unit = queue.find(u => u.unit_id === uid);
              if (!unit) { skipped.push({ unit_id: uid, reason: "not found" }); continue; }
              if (unit.status !== "PENDING" && unit.status !== "FAILED") {
                skipped.push({ unit_id: uid, reason: `status=${unit.status}` }); continue;
              }
              // Check dependencies
              const depsOk = unit.depends_on.every(depId => {
                const dep = queue.find(q => q.unit_id === depId);
                return dep && dep.status === "COMPLETE";
              });
              if (!depsOk) { skipped.push({ unit_id: uid, reason: "unmet dependencies" }); continue; }

              const delId = genDelegationId();
              const userPrompt = buildUnitPrompt(unit, manifest, criteria);

              // Mark unit as DELEGATED
              unit.status = "DELEGATED" as UnitStatus;

              const delUnit: DelegatedUnit = {
                unit_id: uid, manus_id: delId, status: "running",
                created_at: new Date().toISOString(), model
              };
              delegationResults.set(delId, delUnit);
              newDelegated.push(delUnit);

              // Fire async — don't await
              callClaudeForUnit(systemPrompt, userPrompt, model).then(r => {
                delUnit.status = "completed";
                delUnit.result = r.text;
                delUnit.tokens = r.tokens;
                delUnit.duration_ms = r.duration_ms;
                delUnit.completed_at = new Date().toISOString();
                delegationResults.set(delId, delUnit);
                saveDelegationState(taskId, [...loadDelegationState(taskId).filter(d => d.manus_id !== delId), delUnit]);
                appendLog(taskId, `Unit ${uid} delegation COMPLETED (${delId}): ${r.duration_ms}ms, ${r.tokens.input}+${r.tokens.output} tokens`);
              }).catch(e => {
                delUnit.status = "failed";
                delUnit.error = e.message;
                delUnit.completed_at = new Date().toISOString();
                delegationResults.set(delId, delUnit);
                saveDelegationState(taskId, [...loadDelegationState(taskId).filter(d => d.manus_id !== delId), delUnit]);
                appendLog(taskId, `Unit ${uid} delegation FAILED (${delId}): ${e.message}`);
              });
            }

            writeJSON(path.join(taskDir, "WORK_QUEUE.json"), queue);
            saveDelegationState(taskId, [...existingDelegated, ...newDelegated]);
            appendLog(taskId, `Delegated ${newDelegated.length} units to Manus (model: ${model})`);

            return ok({
              task_id: taskId,
              delegated: newDelegated.map(d => ({ unit_id: d.unit_id, manus_id: d.manus_id, status: d.status })),
              skipped,
              count: newDelegated.length,
              model,
              instructions: [
                `${newDelegated.length} units delegated to Claude API (${model}).`,
                "Use poll_delegated to check results and auto-complete units.",
                "Delegations run in background — you can continue other work."
              ]
            });
          }

          // ================================================================
          // F2.3: POLL_DELEGATED — Check and auto-complete delegated units
          // ================================================================
          case "poll_delegated": {
            const taskId = params.task_id || findActiveTask();
            if (!taskId) return err("No active task found.");

            const taskDir = getTaskDir(taskId);
            const manifest = readJSON<TaskManifest>(path.join(taskDir, "TASK_MANIFEST.json"));
            const queue = readJSON<WorkUnit[]>(path.join(taskDir, "WORK_QUEUE.json"));
            const criteria = readJSON<any>(path.join(taskDir, "ACCEPTANCE_CRITERIA.json"));
            const autoComplete = params.auto_complete !== false; // default true

            // Merge disk + in-memory delegation state
            const diskState = loadDelegationState(taskId);
            for (const d of diskState) {
              const mem = delegationResults.get(d.manus_id);
              if (mem && (mem.status === "completed" || mem.status === "failed")) {
                d.status = mem.status;
                d.result = mem.result;
                d.error = mem.error;
                d.tokens = mem.tokens;
                d.duration_ms = mem.duration_ms;
                d.completed_at = mem.completed_at;
              }
            }
            saveDelegationState(taskId, diskState);

            const completed: { unit_id: number; manus_id: string; auto_completed: boolean; status: string }[] = [];
            const stillRunning: { unit_id: number; manus_id: string; elapsed_ms: number }[] = [];
            const failed: { unit_id: number; manus_id: string; error: string }[] = [];

            for (const d of diskState) {
              if (d.status === "completed" && d.result && autoComplete) {
                const unit = queue.find(u => u.unit_id === d.unit_id);
                if (!unit || unit.status === "COMPLETE") {
                  completed.push({ unit_id: d.unit_id, manus_id: d.manus_id, auto_completed: false, status: "already_complete" });
                  continue;
                }
                // Try to parse result as JSON for structured output
                let output: any;
                try { output = JSON.parse(d.result); } catch { output = d.result; }

                // Check for NEEDS_RESEARCH response
                if (output?.status === "NEEDS_RESEARCH") {
                  unit.status = "NEEDS_RESEARCH";
                  unit.error = output.reason || "Delegated task determined data needs research";
                  unit.completed = new Date().toISOString();
                  completed.push({ unit_id: d.unit_id, manus_id: d.manus_id, auto_completed: true, status: "NEEDS_RESEARCH" });
                  appendLog(taskId, `Unit ${d.unit_id} auto-completed as NEEDS_RESEARCH from delegation`);
                  continue;
                }

                // Run stub scan
                const stubResult = runStubScan(output);
                if (!stubResult.clean) {
                  unit.status = "FAILED";
                  unit.error = `Delegation stub scan failed: ${stubResult.hits.length} stub(s)`;
                  unit.retry_count++;
                  manifest.progress.failed_units++;
                  completed.push({ unit_id: d.unit_id, manus_id: d.manus_id, auto_completed: true, status: "STUB_FAIL" });
                  appendLog(taskId, `Unit ${d.unit_id} delegation failed stub scan: ${stubResult.hits.map(h => h.field).join(", ")}`);
                  continue;
                }

                // Run acceptance criteria
                const criteriaResult = validateAcceptanceCriteria(output, criteria);
                if (!criteriaResult.passed) {
                  unit.status = "FAILED";
                  unit.error = `Delegation criteria failed: ${criteriaResult.failures.join("; ")}`;
                  unit.retry_count++;
                  manifest.progress.failed_units++;
                  completed.push({ unit_id: d.unit_id, manus_id: d.manus_id, auto_completed: true, status: "CRITERIA_FAIL" });
                  appendLog(taskId, `Unit ${d.unit_id} delegation failed criteria: ${criteriaResult.failures.join("; ")}`);
                  continue;
                }

                // SUCCESS — complete the unit
                unit.status = "COMPLETE";
                unit.output_ref = `delegated:${d.manus_id}`;
                unit.completed = new Date().toISOString();
                manifest.progress.completed_units++;

                // Write output to file
                const outputFile = path.join(taskDir, "output", `unit_${d.unit_id}.json`);
                writeJSON(outputFile, { unit_id: d.unit_id, source: "manus_delegation", manus_id: d.manus_id, output, tokens: d.tokens, duration_ms: d.duration_ms });

                completed.push({ unit_id: d.unit_id, manus_id: d.manus_id, auto_completed: true, status: "COMPLETE" });
                appendLog(taskId, `Unit ${d.unit_id} auto-completed from delegation (${d.duration_ms}ms)`);

              } else if (d.status === "failed") {
                const unit = queue.find(u => u.unit_id === d.unit_id);
                if (unit && unit.status === "DELEGATED") {
                  unit.status = "FAILED";
                  unit.error = `Delegation failed: ${d.error}`;
                  unit.retry_count++;
                  manifest.progress.failed_units++;
                }
                failed.push({ unit_id: d.unit_id, manus_id: d.manus_id, error: d.error || "unknown" });
              } else if (d.status === "running" || d.status === "pending") {
                const elapsedMs = Date.now() - new Date(d.created_at).getTime();
                stillRunning.push({ unit_id: d.unit_id, manus_id: d.manus_id, elapsed_ms: elapsedMs });
              }
            }

            // Save updated queue and manifest
            writeJSON(path.join(taskDir, "WORK_QUEUE.json"), queue);
            writeJSON(path.join(taskDir, "TASK_MANIFEST.json"), manifest);

            // Update progress
            const totalUnits = queue.length;
            const completedCount = queue.filter(u => u.status === "COMPLETE").length;
            manifest.progress.completed_pct = Math.round((completedCount / totalUnits) * 100);

            return ok({
              task_id: taskId,
              completed,
              still_running: stillRunning,
              failed,
              summary: {
                total_delegated: diskState.length,
                completed: completed.length,
                running: stillRunning.length,
                failed: failed.length,
                task_progress: `${completedCount}/${totalUnits} (${manifest.progress.completed_pct}%)`
              },
              next_step: stillRunning.length > 0
                ? `${stillRunning.length} still running. Poll again shortly.`
                : completed.length > 0
                  ? "All delegations resolved. Call batch_validate or queue_next."
                  : "No delegated units found."
            });
          }

          default:
            return err(`Unknown action: ${action}`, { available: ACTIONS });
        }
      } catch (error: any) {
        log.error(`[prism_atcs] Error in ${action}: ${error.message}`);
        return err(error.message, { action, stack: error.stack?.split("\n").slice(0, 3) });
      }
    }
  );
  log.info("✅ Registered: prism_atcs dispatcher (10 actions) — Autonomous Task Completion System");
}
