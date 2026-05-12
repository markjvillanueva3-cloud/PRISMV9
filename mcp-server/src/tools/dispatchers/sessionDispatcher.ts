/**
 * Session Dispatcher — 48 actions for session lifecycle, state management, and context control.
 *
 * Manages cross-session persistence (memory_save/recall), context pressure monitoring,
 * state checkpointing (auto_checkpoint, checkpoint_enhanced), WIP capture/restore,
 * workflow tracking, system introspection (system_snapshot, dispatcher_map, action_search),
 * and intent-based tool routing (tool_route, tool_route_best).
 *
 * Every PRISM session should call context_boot at start and memory_save at end.
 * Auto_checkpoint fires every 5-10 tool calls for crash recovery.
 *
 * @module sessionDispatcher
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_SESSION_SCHEMAS } from "../../schemas/sessionActionSchemas.js";
import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";
import { hookExecutor, type HookPhase } from "../../engines/HookExecutor.js";
import type { StateEvent } from "../../types/prism-schema.js";
import { atomicWrite } from "../../utils/atomicWrite.js";
import { PATHS } from "../../constants.js";
import { sessionDeltaEngine } from "../../engines/SessionDeltaEngine.js";
import { systemSnapshotEngine } from "../../engines/SystemSnapshotEngine.js";
import type { SnapshotDepth } from "../../engines/SystemSnapshotEngine.js";
import { safeWriteSync } from "../../utils/atomicWrite.js";
import * as TaskClaimService from "../../services/TaskClaimService.js";

// PRISM-STAB-MS0/U-B1 (2026-05-09): per-session handoff write/read with in-memory mutex.
// Map keyed by session_id; ensures single-writer-per-session under concurrent
// dispatcher invocations within this MCP server process.
const HANDOFFS_DIR = "H:/prism/state/shared/handoffs";
const handoffWriteLocks = new Map<string, Promise<unknown>>();

function sanitizeForFilename(s: string): string {
  return String(s).replace(/[^a-zA-Z0-9._@-]/g, "_").replace(/_+/g, "_");
}

function handoffPathFor(sessionId: string, topic?: string | null): string {
  const base = sanitizeForFilename(sessionId);
  const topicSuffix = topic ? `-${String(topic).replace(/[^a-zA-Z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 20)}` : "";
  return path.join(HANDOFFS_DIR, `HANDOFF-${base}${topicSuffix}.md`).replace(/\\/g, "/");
}

async function withHandoffLock<T>(sessionId: string, fn: () => Promise<T>): Promise<T> {
  const prior = handoffWriteLocks.get(sessionId) || Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((r) => (release = r));
  const ourEntry = prior.then(() => next);
  handoffWriteLocks.set(sessionId, ourEntry);
  try {
    await prior;
    return await fn();
  } finally {
    release();
    if (handoffWriteLocks.get(sessionId) === ourEntry) {
      handoffWriteLocks.delete(sessionId);
    }
  }
}

// Fire lifecycle hooks (non-blocking, errors logged but don't break session ops)
async function fireLifecycleHook(phase: string, metadata: Record<string, any>): Promise<void> {
  try {
    await hookExecutor.execute(phase as HookPhase, {
      operation: phase,
      target: { type: "calculation" as const, id: phase, data: metadata },
      session: metadata.session,
      metadata: { dispatcher: "sessionDispatcher", ...metadata }
    });
  } catch (err) {
    log.warn(`[sessionDispatcher] Lifecycle hook ${phase} error: ${err}`);
  }
}

const ACTIONS = [
  "state_load",
  "state_save", 
  "state_checkpoint",
  "state_diff",
  "handoff_prepare",
  "handoff_write",
  "handoff_read",
  "resume_session",
  "memory_save",
  "memory_recall",
  "context_pressure",
  "context_size",
  "context_compress",
  "context_expand", 
  "compaction_detect",
  "transcript_read",
  "state_reconstruct",
  "session_recover",
  "quick_resume",
  "session_start",
  "session_end",
  "auto_checkpoint",
  "wip_capture",
  "wip_list",
  "wip_restore",
  "state_rollback",
  "resume_score",
  "checkpoint_enhanced",
  "workflow_start",
  "workflow_advance", 
  "workflow_status",
  "workflow_complete",
  "health_check",
  "dsl_mode",
  "context_preload",
  "context_boot",
  "context_delta_boot",
  "quick_ref_regenerate",
  "session_delta",
  "session_bookmark",
  "session_compare_bookmark",
  "system_snapshot",
  "system_snapshot_layered",
  "system_drift_report",
  "dispatcher_map",
  "dispatcher_map_compact",
  "action_search",
  "action_find",
  "tool_route",
  "tool_route_best",
  "coordination_record",
  "coordination_detect_conflicts",
  "coordination_recent",
  "coordination_count",
  // ENGINE-WIRE-MS0/U-WIRE22: AgentSelfAwarenessEngine — unified self-awareness
  "self_awareness_build",
  "self_awareness_search",
  "self_awareness_context_summary",
  "self_awareness_health",
  "self_awareness_quick_stats",
  "self_awareness_recommended_actions",
  // COGNITIVE-BRIDGE-MS0/U-WIRE-COG-BATCH4: Awareness
  "awareness_unified_query",
  "awareness_command_detect",
  "awareness_command_suggest_string",
  "awareness_filter",
  "awareness_lifecycle_get_current",
  "awareness_lifecycle_get_history",
  // OBSIDIAN-AUTOMATE-MS3/U-OLLAMA-HEALTH-EXPOSE: surface OllamaIntegrationEngine
  "ollama_health",
  // HTML-PRIMARY-MS0/U-HPS07: render any Markdown doc/spec → HTML via SpecHTMLCompanionEngine
  "doc_render",
  // HOOK-SYNERGY-MS0/U-HOOK-REGISTRY (H2): compact event → top-N hook ids map (mirrors dispatcher_map_compact for hooks)
  "hook_map_compact"
] as const;

function ok(data: any) {
  return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(data)) }] };
}

const STATE_DIR = PATHS.STATE_DIR;
const SCRIPTS_DIR = PATHS.SCRIPTS_CORE;
const CURRENT_STATE_FILE = path.join(STATE_DIR, "CURRENT_STATE.json");
const SESSION_MEMORY_FILE = path.join(STATE_DIR, "SESSION_MEMORY.json");
const ROADMAP_FILE = path.join(STATE_DIR, "ROADMAP_TRACKER.json");
const PRESSURE_LOG = path.join(STATE_DIR, "context_pressure_log.json");
const EVENT_LOG_FILE = path.join(STATE_DIR, "session_events.jsonl");
const SNAPSHOTS_DIR = path.join(STATE_DIR, "snapshots");
const TRANSCRIPTS_DIR = "/mnt/transcripts";
const PYTHON = PATHS.PYTHON;

const THRESHOLDS = {
  GREEN_MAX: 0.60,
  YELLOW_MAX: 0.75,
  ORANGE_MAX: 0.85,
  RED_MAX: 0.92,
  MAX_TOKENS: 200000
};

function loadJsonFile(filepath: string): any {
  try {
    if (fs.existsSync(filepath)) {
      return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    }
  } catch (e) {
    log.error(`Failed to load ${filepath}`, e);
  }
  return null;
}

function saveJsonFile(filepath: string, data: any): void {
  safeWriteSync(filepath, JSON.stringify(data, null, 2));
}

// ============================================================================
// APPEND-ONLY EVENT LOG (P2-001)
// Every state mutation is recorded as an immutable event.
// Recovery = latest snapshot + replay events after snapshot timestamp.
// ============================================================================

// StateEvent — imported from prism-schema

function appendEvent(type: string, data: any): void {
  try {
    const event: StateEvent = {
      ts: new Date().toISOString(),
      type,
      session: data.session || data.currentSession?.id,
      phase: data.phase || data.currentSession?.phase,
      data: trimEventData(data),
    };
    fs.appendFileSync(EVENT_LOG_FILE, JSON.stringify(event) + "\n");
  } catch { /* append failed — non-fatal, state_save still works */ }
}

/** Keep event data small — strip large nested objects */
function trimEventData(data: any): any {
  if (!data || typeof data !== "object") return data;
  const trimmed: any = {};
  for (const [k, v] of Object.entries(data)) {
    if (k === "currentSession" || k === "progress" || k === "quickResume" ||
        k === "session" || k === "phase" || k === "summary" || k === "next" ||
        k === "completed" || k === "status" || k === "checkpoint_id" ||
        k === "session_name" || k === "next_actions" || k === "quick_resume") {
      trimmed[k] = v;
    }
  }
  return Object.keys(trimmed).length > 0 ? trimmed : { _raw: JSON.stringify(data).slice(0, 500) };
}

function saveSnapshot(): string | null {
  try {
    const state = loadJsonFile(CURRENT_STATE_FILE);
    if (!state) return null;
    if (!fs.existsSync(SNAPSHOTS_DIR)) fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const snapPath = path.join(SNAPSHOTS_DIR, `snapshot_${ts}.json`);
    state._snapshot_ts = new Date().toISOString();
    saveJsonFile(snapPath, state);
    return snapPath;
  } catch { return null; }
}

function replayEventLog(afterTimestamp?: string): { events: StateEvent[]; reconstructed: any } {
  const events: StateEvent[] = [];
  const reconstructed: any = { sessions: [], checkpoints: [], phases: [], timeline: [] };
  try {
    if (!fs.existsSync(EVENT_LOG_FILE)) return { events, reconstructed };
    const lines = fs.readFileSync(EVENT_LOG_FILE, "utf-8").trim().split("\n");
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line) as StateEvent;
        if (afterTimestamp && event.ts <= afterTimestamp) continue;
        events.push(event);
        reconstructed.timeline.push(`[${event.ts}] ${event.type}: ${event.phase || ""}`);
        if (event.type === "session_start") reconstructed.sessions.push(event.data);
        if (event.type === "checkpoint") reconstructed.checkpoints.push(event.data);
        if (event.phase) reconstructed.phases.push(event.phase);
        // Apply latest values
        if (event.data?.session) reconstructed.session = event.data.session;
        if (event.data?.phase) reconstructed.phase = event.data.phase;
        if (event.data?.summary) reconstructed.summary = event.data.summary;
        if (event.data?.quickResume) reconstructed.quickResume = event.data.quickResume;
        if (event.data?.quick_resume) reconstructed.quickResume = event.data.quick_resume;
      } catch { /* bad line — skip */ }
    }
  } catch { /* file read failed */ }
  return { events, reconstructed };
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function getPressureLevel(percentage: number): string {
  if (percentage <= THRESHOLDS.GREEN_MAX) return "GREEN";
  if (percentage <= THRESHOLDS.YELLOW_MAX) return "YELLOW";
  if (percentage <= THRESHOLDS.ORANGE_MAX) return "ORANGE";
  if (percentage <= THRESHOLDS.RED_MAX) return "RED";
  return "CRITICAL";
}

async function runPythonScript(scriptName: string, args: string[] = []): Promise<string> {
  const scriptPath = path.join(SCRIPTS_DIR, scriptName);
  if (!fs.existsSync(scriptPath)) {
    return `ERROR: Script not found: ${scriptPath}`;
  }
  try {
    const result = execFileSync(PYTHON, [scriptPath, ...args], {
      encoding: 'utf-8',
      timeout: 30000,
      cwd: SCRIPTS_DIR
    });
    return result;
  } catch (error: any) {
    return `ERROR: ${error.message}`;
  }
}

async function loadCurrentState(): Promise<any> {
  const state = loadJsonFile(CURRENT_STATE_FILE);
  if (state) return state;
  
  return {
    version: "1.0.0",
    lastUpdated: new Date().toISOString(),
    currentSession: {
      id: `session-${Date.now()}`,
      status: "IN_PROGRESS",
      phase: "1",
      sessionNumber: "1.4",
      progress: {}
    },
    quickResume: "New session started"
  };
}

/** Registers session dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
export function registerSessionDispatcher(server: any): void {
  server.tool(
    "prism_session",
    "Session state management: save/load/checkpoint/diff, handoff, memory, context pressure, workflows, health. Use 'action' param.",
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params: Record<string, any> }) => {
      log.info(`[prism_session] ${action}`);
      // H1-MS2: Auto-normalize snake_case → camelCase params
      let params = rawParams;
      try {
        const { normalizeParams } = await import("../../utils/paramNormalizer.js");
        params = normalizeParams(rawParams);
      } catch { /* normalizer not available */ }

      // SYS-MS6: Validate params against per-action Zod schema
      const validation = validateActionParams(action, params, ACTION_SESSION_SCHEMAS);
      if (!validation.valid) {
        return dispatcherError(
          `Invalid params for '${action}': ${validation.errorMessage}`,
          action,
          "prism_session"
        );
      }

      try {
        switch (action) {
          case "state_load": {
            const state = await loadCurrentState();
            return ok({ success: true, state, quickResume: state.quickResume });
          }
          
          case "state_save": {
            // Load existing state, merge new data on top
            let state = loadJsonFile(CURRENT_STATE_FILE) || {};
            
            // Support both: params.state={...} (nested) OR top-level params
            const newData = params.state || {};
            const topLevel: Record<string, any> = {};
            for (const [k, v] of Object.entries(params)) {
              if (k !== "state" && k !== "path") topLevel[k] = v;
            }
            
            // Merge: existing ← nested state ← top-level params
            Object.assign(state, newData, topLevel);
            state.lastUpdated = new Date().toISOString();
            
            // Build quickResume from whatever we have
            const parts = [
              state.session ? `Session: ${state.session}` : null,
              state.phase ? `Phase: ${state.phase}` : null,
              state.summary ? state.summary : null,
            ].filter(Boolean);
            if (parts.length > 0) state.quickResume = parts.join(" | ");
            
            // Ensure currentSession structure exists for other tools
            if (!state.currentSession) {
              state.currentSession = { phase: state.phase || "unknown", progress: {} };
            }
            if (state.phase) state.currentSession.phase = state.phase;
            
            const savePath = params.path || CURRENT_STATE_FILE;
            saveJsonFile(savePath, state);
            appendEvent("state_save", state);
            return ok({ success: true, path: savePath, timestamp: state.lastUpdated, quickResume: state.quickResume });
          }
          
          case "state_checkpoint": {
            const state = await loadCurrentState();
            state.currentSession.progress = {
              ...state.currentSession.progress,
              completed: params.completed,
              next: params.next,
              lastCheckpoint: new Date().toISOString()
            };
            state.quickResume = `Checkpoint: ${params.completed} items done. Next: ${params.next}`;
            saveJsonFile(CURRENT_STATE_FILE, state);
            appendEvent("checkpoint", { completed: params.completed, next: params.next, phase: state.currentSession?.phase });
            
            // Fire on-session-checkpoint hooks (5 hooks: backup trigger, metrics snapshot, state sync)
            await fireLifecycleHook("on-session-checkpoint", { completed: params.completed, next: params.next });
            
            return ok({ success: true, completed: params.completed, next: params.next });
          }
          
          case "state_diff": {
            const current = await loadCurrentState();
            if (!params.previous_path) {
              return ok({ success: true, current });
            }
            if (!fs.existsSync(params.previous_path)) {
              return ok({ success: false, error: "File not found" });
            }
            const previous = loadJsonFile(params.previous_path);
            const changes: string[] = [];
            if (current.version !== previous.version) {
              changes.push(`Version: ${previous.version} → ${current.version}`);
            }
            return ok({ success: true, changes });
          }
          
          case "handoff_prepare": {
            const state = await loadCurrentState();
            state.currentSession.status = params.status || "IN_PROGRESS";
            const nextActions = params.next_actions || [];
            state.quickResume = [
              `Status: ${params.status}`,
              `Phase: ${state.currentSession.phase}`,
              nextActions.length ? `Next: ${nextActions[0]}` : ""
            ].filter(Boolean).join(" | ");
            state.currentSession.progress = {
              ...state.currentSession.progress,
              handoffTime: new Date().toISOString(),
              nextActions
            };
            saveJsonFile(CURRENT_STATE_FILE, state);
            return ok({ success: true, status: params.status, quickResume: state.quickResume, nextActions });
          }

          case "handoff_write": {
            // PRISM-STAB-MS0/U-B1: serialized atomic write per session_id.
            const sid = String(params.session_id);
            const topic = params.topic ? String(params.topic) : null;
            const body = String(params.body);
            const machine = params.machine ? String(params.machine) : (process.env.COMPUTERNAME || "unknown");
            const family = params.family ? String(params.family) : "Claude";
            const parentSid = params.parent_session_id ? String(params.parent_session_id) : null;

            const result = await withHandoffLock(sid, async () => {
              fs.mkdirSync(HANDOFFS_DIR, { recursive: true });
              const filePath = handoffPathFor(sid, topic);
              const writtenAt = new Date().toISOString();
              const frontmatter = [
                "---",
                `session: ${sid}`,
                `topic: ${topic || ""}`,
                `written_at: ${writtenAt}`,
                `machine: ${machine}`,
                `family: ${family}`,
                ...(parentSid ? [`parent_session: ${parentSid}`] : []),
                `status: active`,
                `writer: prism_session.handoff_write`,
                "---",
                "",
              ].join("\n");
              const finalBody = body.startsWith("---\n") ? body : frontmatter + body;
              atomicWrite(filePath, finalBody);
              return { file: filePath, writtenAt, bytes: Buffer.byteLength(finalBody, "utf-8") };
            });

            return ok({ success: true, ...result, session_id: sid, topic });
          }

          case "handoff_read": {
            // PRISM-STAB-MS0/U-B1: exact-match read (no topic-glob fallback per U-B4 doctrine).
            const sid = String(params.session_id);
            const topic = params.topic ? String(params.topic) : null;
            const filePath = handoffPathFor(sid, topic);
            if (!fs.existsSync(filePath)) {
              return ok({ success: false, error: "not_found", session_id: sid, topic, expected: filePath });
            }
            const stat = fs.statSync(filePath);
            const content = fs.readFileSync(filePath, "utf-8");
            const ageMinutes = Math.round((Date.now() - stat.mtimeMs) / 60000);
            return ok({
              success: true,
              session_id: sid,
              topic,
              file: filePath,
              content,
              age_minutes: ageMinutes,
              bytes: stat.size,
              modified: new Date(stat.mtimeMs).toISOString(),
            });
          }

          case "resume_session": {
            const state = await loadCurrentState();
            const progress = state.currentSession?.progress || {};
            const nextActions = progress.nextActions || [];
            
            // Fire on-session-resume hooks (3 hooks: state restore, context rebuild, warmup)
            await fireLifecycleHook("on-session-resume", { session_id: state.currentSession?.id });
            
            // W2.2: Run resume_detector for intelligent scenario detection
            let resumeDetection: any = null;
            try {
              const compactionArg = params.compaction_detected ? " --compaction-detected" : "";
              const resumeOutput = await runPythonScript("resume_detector.py", ["--json" + compactionArg]);
              resumeDetection = JSON.parse(resumeOutput);
            } catch { /* non-fatal — fall back to basic resume */ }
            
            // W2.1: Load next_session_prep if available
            let nextSessionPrep: any = null;
            try {
              const prepPath = path.join(STATE_DIR, "next_session_prep.json");
              if (fs.existsSync(prepPath)) {
                nextSessionPrep = JSON.parse(fs.readFileSync(prepPath, "utf-8"));
              }
            } catch { /* non-fatal */ }
            
            // W4: Run resume_validator for state consistency check
            let resumeValidation: any = null;
            try {
              const valOutput = await runPythonScript("resume_validator.py", ["validate", "--json"]);
              resumeValidation = JSON.parse(valOutput);
            } catch { /* non-fatal */ }
            
            return ok({ 
              success: true, state, nextActions, quickResume: state.quickResume,
              resume_detection: resumeDetection,
              resume_validation: resumeValidation,
              next_session_prep: nextSessionPrep
            });
          }
          
          case "memory_save": {
            let memory: Record<string, unknown> = {};
            if (fs.existsSync(SESSION_MEMORY_FILE)) {
              memory = loadJsonFile(SESSION_MEMORY_FILE) || {};
            }
            const category = params.category || "general";
            if (!memory[category]) {
              memory[category] = {};
            }
            (memory[category] as Record<string, unknown>)[params.key] = {
              value: params.value,
              timestamp: new Date().toISOString()
            };
            saveJsonFile(SESSION_MEMORY_FILE, memory);
            return ok({ success: true, key: params.key, category });
          }
          
          case "memory_recall": {
            if (!fs.existsSync(SESSION_MEMORY_FILE)) {
              return ok({ success: true, memory: {} });
            }
            const memory = loadJsonFile(SESSION_MEMORY_FILE) || {};
            if (params.key && params.category) {
              const categoryMem = memory[params.category] as Record<string, unknown>;
              const value = categoryMem?.[params.key];
              return ok({ success: !!value, value });
            }
            if (params.category) {
              const categoryMem = memory[params.category];
              return ok({ success: true, category: params.category, memory: categoryMem });
            }
            return ok({ success: true, categories: Object.keys(memory), memory });
          }
          
          case "context_pressure": {
            let tokensUsed = params.estimated_tokens ?? 50000;
            const percentage = tokensUsed / THRESHOLDS.MAX_TOKENS;
            const level = getPressureLevel(percentage);
            const reading = {
              timestamp: new Date().toISOString(),
              tokens_used: tokensUsed,
              percentage: Math.round(percentage * 100),
              level
            };
            let history: any[] = [];
            if (fs.existsSync(PRESSURE_LOG)) {
              const loaded = loadJsonFile(PRESSURE_LOG);
              if (Array.isArray(loaded)) history = loaded;
            }
            history.push(reading);
            if (history.length > 100) history = history.slice(-100);
            saveJsonFile(PRESSURE_LOG, history);
            // Fire on-context-pressure hooks for elevated pressure (2 hooks: pressure tracking, auto-save)
            if (level !== "GREEN") {
              fireLifecycleHook("on-context-pressure", { level, percentage: Math.round(percentage * 100) });
            }
            
            return ok({ 
              level, 
              percentage: Math.round(percentage * 100),
              tokens_used: tokensUsed,
              urgent: level === "RED" || level === "CRITICAL"
            });
          }
          
          case "context_size": {
            const state = loadJsonFile(CURRENT_STATE_FILE);
            const roadmap = loadJsonFile(ROADMAP_FILE);
            const estimates = {
              system_prompt: 5000,
              memories: 3000,
              state_file: state ? estimateTokens(JSON.stringify(state)) : 0,
              roadmap_file: roadmap ? estimateTokens(JSON.stringify(roadmap)) : 0,
              conversation: 50000,
              tools_loaded: 10000
            };
            const total = Object.values(estimates).reduce((a, b) => a + b, 0);
            const percentage = total / THRESHOLDS.MAX_TOKENS;
            return ok({ estimates, total, percentage });
          }
          
          case "context_compress": {
            const level = (params.compression_level || "MODERATE").toUpperCase();
            const result = await runPythonScript("context_compressor.py", ["--level", level]);
            const manifest = {
              compressed_at: new Date().toISOString(),
              level: params.compression_level || "moderate",
              preserved: params.preserve_categories || ["safety_critical", "current_task"]
            };
            const manifestPath = path.join(STATE_DIR, "compression_manifest.json");
            saveJsonFile(manifestPath, manifest);
            
            // Fire on-compaction hook (1 hook: compaction tracking)
            await fireLifecycleHook("on-compaction", { level: params.compression_level, manifest });
            
            return ok({ success: !result.includes("ERROR"), manifest, output: result });
          }
          
          case "context_expand": {
            const manifestPath = path.join(STATE_DIR, "compression_manifest.json");
            const manifest = loadJsonFile(manifestPath);
            if (!manifest) {
              return ok({ success: false, error: "No compressed context found" });
            }
            const result = await runPythonScript("context_expander.py", params.sections || []);
            return ok({ success: !result.includes("ERROR"), manifest, output: result });
          }
          
          case "compaction_detect": {
            const state = loadJsonFile(CURRENT_STATE_FILE);
            let isCompacted = false;
            let confidence = 0;
            const indicators: Array<{ name: string; detected: boolean }> = [];
            
            if (!state || !state.currentSession) {
              isCompacted = true;
              confidence += 0.5;
            }
            indicators.push({ name: "state_file", detected: !!state });
            
            let latestTranscript: string | null = null;
            try {
              if (fs.existsSync(TRANSCRIPTS_DIR)) {
                const files = fs.readdirSync(TRANSCRIPTS_DIR)
                  .filter(f => f.endsWith('.txt'))
                  .sort()
                  .reverse();
                if (files.length > 0) {
                  latestTranscript = files[0];
                }
              }
            } catch (e) {
              // Continue
            }

            indicators.push({ name: "transcript", detected: !!latestTranscript });
            
            const compactionType = isCompacted ? (latestTranscript ? "soft" : "hard") : "none";
            
            return ok({ 
              is_compacted: isCompacted, 
              compaction_type: compactionType,
              confidence,
              latest_transcript: latestTranscript,
              indicators
            });
          }
          
          case "transcript_read": {
            try {
              if (!fs.existsSync(TRANSCRIPTS_DIR)) {
                return ok({ error: "Transcripts directory not accessible" });
              }
              
              const files = fs.readdirSync(TRANSCRIPTS_DIR)
                .filter(f => f.endsWith('.txt'))
                .sort()
                .reverse();
              
              if (files.length === 0) {
                return ok({ error: "No transcript files found" });
              }
              
              let transcriptPath = "";
              if (params.transcript_name && params.transcript_name !== 'latest') {
                transcriptPath = path.resolve(TRANSCRIPTS_DIR, params.transcript_name);
              } else {
                transcriptPath = path.resolve(TRANSCRIPTS_DIR, files[0]);
              }

              if (!transcriptPath.startsWith(path.resolve(TRANSCRIPTS_DIR))) {
                return ok({ error: "Path traversal detected — access denied" });
              }

              if (!fs.existsSync(transcriptPath)) {
                return ok({ error: `Transcript not found: ${transcriptPath}` });
              }
              
              const content = fs.readFileSync(transcriptPath, 'utf-8');
              const lines = content.split('\n');
              const totalLines = lines.length;
              const numLines = params.lines ?? 200;
              
              let selectedLines: string[];
              if (params.from_end !== false) {
                selectedLines = lines.slice(-numLines);
              } else {
                selectedLines = lines.slice(0, numLines);
              }
              
              return ok({ 
                transcript: path.basename(transcriptPath),
                total_lines: totalLines,
                lines_shown: selectedLines.length,
                content: selectedLines.join('\n')
              });
            } catch (error: any) {
              return ok({ error: `Failed to read transcript: ${error.message}` });
            }
          }
          
          case "state_reconstruct": {
            let state = loadJsonFile(CURRENT_STATE_FILE) || {};
            
            // P2-001: Replay event log for reconstruction
            const { events, reconstructed: replayed } = replayEventLog(params.after_timestamp);
            
            state.reconstructed = {
              timestamp: new Date().toISOString(),
              from_checkpoint: params.checkpoint_id || null,
              summary: params.transcript_summary,
              event_count: events.length,
              replayed_session: replayed.session,
              replayed_phase: replayed.phase,
              timeline_tail: replayed.timeline.slice(-10),
            };
            // Use replayed data to fill gaps
            if (replayed.session && !state.session) state.session = replayed.session;
            if (replayed.phase && !state.currentSession?.phase) {
              state.currentSession = state.currentSession || {};
              state.currentSession.phase = replayed.phase;
            }
            if (replayed.quickResume) state.quickResume = replayed.quickResume;
            else state.quickResume = `RECONSTRUCTED: ${(params.transcript_summary || "").slice(0, 200)}...`;
            
            saveJsonFile(CURRENT_STATE_FILE, state);
            appendEvent("state_reconstruct", { event_count: events.length, phase: replayed.phase });
            return ok({ reconstructed: true, events_replayed: events.length, state });
          }
          
          case "session_recover": {
            let latestTranscript: string | null = null;
            try {
              if (fs.existsSync(TRANSCRIPTS_DIR)) {
                const files = fs.readdirSync(TRANSCRIPTS_DIR)
                  .filter(f => f.endsWith('.txt'))
                  .sort()
                  .reverse();
                if (files.length > 0) {
                  latestTranscript = files[0];
                }
              }
            } catch (e) {
              // Continue
            }
            
            const state = loadJsonFile(CURRENT_STATE_FILE);
            const roadmap = loadJsonFile(ROADMAP_FILE);
            
            const quickResume = [
              state?.quickResume || "Session recovered",
              roadmap?.current_focus || ""
            ].filter(Boolean).join(" | ");
            
            // P2-001: Include event log summary for recovery
            const eventReplay = replayEventLog();
            
            return ok({ 
              transcript: latestTranscript,
              state_loaded: !!state,
              roadmap_loaded: !!roadmap,
              quickResume,
              event_log: eventReplay.events.length > 0 ? {
                total_events: eventReplay.events.length,
                last_phase: eventReplay.reconstructed.phase,
                last_session: eventReplay.reconstructed.session,
              } : null,
            });
          }
          
          case "quick_resume": {
            const state = loadJsonFile(CURRENT_STATE_FILE);
            const roadmap = loadJsonFile(ROADMAP_FILE);
            
            const quickResume = state?.quickResume || "No previous session";
            const currentPhase = roadmap?.current_phase || state?.currentSession?.phase || "Unknown";
            const lastCheckpoint = state?.currentSession?.progress?.lastCheckpoint || "None";
            const nextAction = state?.currentSession?.progress?.next || "Check prism_gsd_core";
            
            return ok({ quickResume, currentPhase, lastCheckpoint, nextAction });
          }
          
          case "session_start": {
            const startTime = new Date().toISOString();
            const sessionId = `SESSION-${Date.now()}`;
            
            let state = loadJsonFile(CURRENT_STATE_FILE) || {
              version: "1.0.0",
              lastUpdated: startTime
            };
            
            state.currentSession = {
              id: sessionId,
              name: params.session_name || `Session ${startTime.split('T')[0]}`,
              startTime,
              status: "IN_PROGRESS",
              phase: state.currentSession?.phase || "0",
              progress: {}
            };
            state.lastUpdated = startTime;
            
            saveJsonFile(CURRENT_STATE_FILE, state);
            appendEvent("session_start", { session: sessionId, session_name: state.currentSession.name, phase: state.currentSession.phase });
            saveSnapshot(); // Full state snapshot at session start
            
            // Fire on-session-start hooks (5 hooks: cognitive init, lifecycle tracking, circuit breaker reset)
            await fireLifecycleHook("on-session-start", { session: { id: sessionId, startTime: new Date(), toolCalls: 0, checkpoints: 0 } });
            
            const roadmap = loadJsonFile(ROADMAP_FILE);
            
            return ok({ session_id: sessionId, state, roadmap_loaded: !!roadmap });
          }
          
          case "session_end": {
            const endTime = new Date().toISOString();
            
            let state = loadJsonFile(CURRENT_STATE_FILE) || {};
            
            if (state.currentSession) {
              state.currentSession.endTime = endTime;
              state.currentSession.status = params.status || "IN_PROGRESS";
              state.currentSession.progress = {
                ...state.currentSession.progress,
                handoffTime: endTime,
                nextActions: params.next_actions || []
              };
            }
            
            state.quickResume = params.quick_resume ?? state.quickResume ?? "Session ended";
            state.lastUpdated = endTime;
            
            saveJsonFile(CURRENT_STATE_FILE, state);
            appendEvent("session_end", { status: params.status, quick_resume: params.quick_resume, phase: state.currentSession?.phase });
            saveSnapshot(); // Full state snapshot at session end
            
            // Fire on-session-end hooks (4 hooks: metrics flush, state sync, learning persist)
            await fireLifecycleHook("on-session-end", { status: params.status, endTime });
            
            // D1: Graceful shutdown — capture WIP and prepare for clean handoff
            let shutdownResult: any = null;
            try {
              const shutdownOutput = await runPythonScript("graceful_shutdown.py", ["execute", "--json"]);
              shutdownResult = JSON.parse(shutdownOutput);
            } catch { /* graceful shutdown failed — non-fatal */ }
            
            // W2.1: Run next_session_prep to prepare for next session
            let nextSessionPrep: any = null;
            try {
              const prepOutput = await runPythonScript("next_session_prep.py", ["generate", "--json", "--save"]);
              nextSessionPrep = JSON.parse(prepOutput);
            } catch { /* non-fatal */ }

            // DA-MS11 UTILIZATION: Run enhanced shutdown for quality scoring + cadence tracking
            let enhancedShutdown: any = null;
            try {
              const PYTHON_PATH = PATHS.PYTHON;
              const shutdownScript = path.join(PATHS.SCRIPTS, "session_enhanced_shutdown.py");
              const summary = params.summary || params.quick_resume || "session ended";
              if (fs.existsSync(shutdownScript)) {
                const sdOutput = execFileSync(
                  PYTHON_PATH, [shutdownScript, "--summary", summary, "--json"],
                  { encoding: 'utf-8', timeout: 15000, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } }
                );
                try { enhancedShutdown = JSON.parse(sdOutput); } catch { enhancedShutdown = { raw: sdOutput.slice(0, 200) }; }
              }
            } catch { /* enhanced shutdown non-fatal */ }

            // Multi-chat coordination: release all claims held by this instance
            let claimsReleased = 0;
            try {
              const instanceIdPath = path.join(PATHS.STATE_DIR || path.resolve("C:\\PRISM\\state"), "INSTANCE_ID.txt");
              if (fs.existsSync(instanceIdPath)) {
                const instanceId = fs.readFileSync(instanceIdPath, "utf-8").trim();
                claimsReleased = await TaskClaimService.releaseAll(instanceId);
              }
            } catch (e: any) { log.debug(`[session_end] claim release: ${e?.message?.slice(0, 80)}`); }

            return ok({ status: params.status, endTime, quickResume: params.quick_resume, graceful_shutdown: shutdownResult, next_session_prep: nextSessionPrep, enhanced_shutdown: enhancedShutdown, claims_released: claimsReleased });
          }
          
          case "auto_checkpoint": {
            let zone = "GREEN";
            let shouldCheckpoint = params.force || false;
            
            const toolCalls = params.tool_calls ?? 0;
            
            if (toolCalls >= 19) {
              zone = "BLACK";
              shouldCheckpoint = true;
            } else if (toolCalls >= 15) {
              zone = "RED";
              shouldCheckpoint = true;
            } else if (toolCalls >= 9) {
              zone = "YELLOW";
              shouldCheckpoint = true;
            }
            
            if (!shouldCheckpoint) {
              return ok({ zone, checkpointed: false, tool_calls: toolCalls });
            }
            
            const checkpointId = `CP-${new Date().toISOString().replace(/[:-]/g, '').split('.')[0]}`;
            
            let state = loadJsonFile(CURRENT_STATE_FILE) || {};
            state.currentSession = state.currentSession || {};
            state.currentSession.progress = state.currentSession.progress || {};
            state.currentSession.progress.lastCheckpoint = checkpointId;
            state.currentSession.progress.checkpointTime = new Date().toISOString();
            state.currentSession.progress.toolCalls = toolCalls;
            state.lastUpdated = new Date().toISOString();
            
            // D5: Session quality metric — tracks error rate, checkpoint frequency, pressure trend
            const errorCount = params.error_count ?? 0;
            const successCount = params.success_count ?? (toolCalls - errorCount);
            const errorRate = toolCalls > 0 ? errorCount / toolCalls : 0;
            const sessionQuality = Math.max(0, Math.min(1, 1 - (errorRate * 2) - (zone === "BLACK" ? 0.3 : zone === "RED" ? 0.15 : 0)));
            
            state.currentSession.progress.sessionQuality = sessionQuality;
            state.currentSession.progress.errorRate = errorRate;
            
            saveJsonFile(CURRENT_STATE_FILE, state);
            appendEvent("auto_checkpoint", { checkpoint_id: checkpointId, zone, toolCalls, phase: state.currentSession?.phase, sessionQuality });
            
            return ok({ zone, checkpointed: true, checkpoint_id: checkpointId, tool_calls: toolCalls, session_quality: sessionQuality, error_rate: errorRate });
          }

          // ================================================================
          // D1: SESSION RESILIENCE — Wired Python modules
          // ================================================================

          case "wip_capture": {
            const desc = params.description || params.notes || "WIP capture";
            const wArgs = ["capture-task", desc, "--json"];
            if (params.next) wArgs.push("--next", params.next);
            if (params.completed) wArgs.push("--completed", String(params.completed));
            if (params.total) wArgs.push("--total", String(params.total));
            const output = await runPythonScript("wip_capturer.py", wArgs);
            try { return ok(JSON.parse(output)); } catch { return ok({ raw: output }); }
          }

          case "wip_list": {
            const output = await runPythonScript("wip_capturer.py", ["list", "--json"]);
            try { return ok(JSON.parse(output)); } catch { return ok({ raw: output }); }
          }

          case "wip_restore": {
            const wipId = params.wip_id || params.id;
            if (!wipId) return ok({ error: "Missing wip_id parameter" });
            const output = await runPythonScript("wip_capturer.py", ["restore", wipId, "--json"]);
            try { return ok(JSON.parse(output)); } catch { return ok({ raw: output }); }
          }

          case "state_rollback": {
            const subcommand = params.subcommand || "preview";
            const target = params.checkpoint_id || params.target || "";
            const rbArgs = [subcommand];
            if (target) rbArgs.push(target);
            rbArgs.push("--json");
            const output = await runPythonScript("state_rollback.py", rbArgs);
            try { return ok(JSON.parse(output)); } catch { return ok({ raw: output }); }
          }

          case "resume_score": {
            // W4: Enhanced with resume_validator.py for comprehensive resume assessment
            const subcommand = params.subcommand || "validate";
            const validCommands = ["detect", "validate", "generate", "actions"];
            
            if (validCommands.includes(subcommand)) {
              const rvArgs = [subcommand, "--json"];
              if (subcommand === "generate" && params.level) {
                rvArgs.push("--level", params.level);
              }
              if (subcommand === "generate" && params.save) {
                rvArgs.push("--save");
              }
              const output = await runPythonScript("resume_validator.py", rvArgs);
              try { return ok(JSON.parse(output)); } catch { return ok({ raw: output }); }
            }
            
            // Fallback: original recovery_scorer
            const output = await runPythonScript("recovery_scorer.py", ["--json"]);
            try { return ok(JSON.parse(output)); } catch { return ok({ raw: output }); }
          }

          case "checkpoint_enhanced": {
            const sub = params.subcommand || "list";
            
            // W4: Route mapper commands to checkpoint_mapper.py
            const mapperCommands = ["chain", "summary", "sessions"];
            if (mapperCommands.includes(sub)) {
              const mapArgs = [sub === "sessions" ? "list" : sub];
              if (params.session_id) mapArgs.push("--session", params.session_id);
              if (params.checkpoint_id) mapArgs.push(params.checkpoint_id);
              const output = await runPythonScript("checkpoint_mapper.py", mapArgs);
              try { return ok(JSON.parse(output)); } catch { return ok({ raw: output }); }
            }
            
            // Default: checkpoint_mgr.py for create/get/list/delete
            const cpArgs = [sub];
            if (params.checkpoint_id) cpArgs.push(params.checkpoint_id);
            cpArgs.push("--json");
            const output = await runPythonScript("checkpoint_mgr.py", cpArgs);
            try { return ok(JSON.parse(output)); } catch { return ok({ raw: output }); }
          }

          // ── W6.1: Workflow Tracker ───────────────────────────────
          case "workflow_start": {
            const wfType = params.type || params.workflow_type;
            if (!wfType) return ok({ error: "Missing 'type' parameter", available: ["session_boot", "bug_fix", "feature_implement", "build_verify", "code_search_edit", "validation", "refactor"] });
            const wfArgs = ["start", wfType];
            if (params.name) wfArgs.push("--name", params.name);
            const output = await runPythonScript("workflow_tracker.py", wfArgs);
            try { return ok(JSON.parse(output)); } catch { return ok({ raw: output }); }
          }

          case "workflow_advance": {
            const wfArgs = ["advance"];
            if (params.intent) wfArgs.push("--intent", params.intent);
            if (params.notes) wfArgs.push("--notes", params.notes);
            if (params.files) {
              wfArgs.push("--files");
              const fileList = Array.isArray(params.files) ? params.files : [params.files];
              wfArgs.push(...fileList);
            }
            const output = await runPythonScript("workflow_tracker.py", wfArgs);
            try { return ok(JSON.parse(output)); } catch { return ok({ raw: output }); }
          }

          case "workflow_status": {
            const sub = params.subcommand || "status";
            const output = await runPythonScript("workflow_tracker.py", [sub]);
            try { return ok(JSON.parse(output)); } catch { return ok({ raw: output }); }
          }

          case "workflow_complete": {
            const sub = params.abort ? "abort" : "complete";
            const wfArgs = [sub];
            if (params.reason) wfArgs.push("--reason", params.reason);
            const output = await runPythonScript("workflow_tracker.py", wfArgs);
            try { return ok(JSON.parse(output)); } catch { return ok({ raw: output }); }
          }
          
          case "health_check": {
            // W4-1: Session Health Signal
            // Thresholds: GREEN (healthy) / YELLOW (aging) / RED (wrap up)
            const HEALTH_THRESHOLDS = {
              CALL_YELLOW: 20, CALL_RED: 35,
              TOKEN_YELLOW: 50000, TOKEN_RED: 80000,
              COMPACTION_YELLOW: 1, COMPACTION_RED: 2
            };

            // Get call count from pressure log (proxy for session calls)
            let callCount = 0;
            let latestTokens = 0;
            let compactionCount = 0;
            if (fs.existsSync(PRESSURE_LOG)) {
              const history = loadJsonFile(PRESSURE_LOG);
              if (Array.isArray(history)) {
                callCount = history.length;
                if (history.length > 0) {
                  latestTokens = history[history.length - 1].tokens_used ?? 0;
                }
              }
            }
            // Count compaction events from session events
            if (fs.existsSync(EVENT_LOG_FILE)) {
              try {
                const eventLines = fs.readFileSync(EVENT_LOG_FILE, "utf-8").split("\n").filter(Boolean);
                for (const line of eventLines) {
                  try {
                    const evt = JSON.parse(line);
                    if (evt.type === "compaction" || evt.event === "compaction") compactionCount++;
                  } catch { /* skip malformed */ }
                }
              } catch { /* no events */ }
            }

            // Allow override from params
            const estimatedTokens = params.estimated_tokens ?? latestTokens ?? 0;
            const calls = params.call_count ?? callCount;
            const compactions = params.compaction_count ?? compactionCount;

            // Determine health status
            let healthStatus: "GREEN" | "YELLOW" | "RED" = "GREEN";
            const reasons: string[] = [];
            if (calls > HEALTH_THRESHOLDS.CALL_RED || estimatedTokens > HEALTH_THRESHOLDS.TOKEN_RED || compactions >= HEALTH_THRESHOLDS.COMPACTION_RED) {
              healthStatus = "RED";
              if (calls > HEALTH_THRESHOLDS.CALL_RED) reasons.push(`calls=${calls} (>${HEALTH_THRESHOLDS.CALL_RED})`);
              if (estimatedTokens > HEALTH_THRESHOLDS.TOKEN_RED) reasons.push(`tokens=${estimatedTokens} (>${HEALTH_THRESHOLDS.TOKEN_RED})`);
              if (compactions >= HEALTH_THRESHOLDS.COMPACTION_RED) reasons.push(`compactions=${compactions} (>=${HEALTH_THRESHOLDS.COMPACTION_RED})`);
            } else if (calls > HEALTH_THRESHOLDS.CALL_YELLOW || estimatedTokens > HEALTH_THRESHOLDS.TOKEN_YELLOW || compactions >= HEALTH_THRESHOLDS.COMPACTION_YELLOW) {
              healthStatus = "YELLOW";
              if (calls > HEALTH_THRESHOLDS.CALL_YELLOW) reasons.push(`calls=${calls} (>${HEALTH_THRESHOLDS.CALL_YELLOW})`);
              if (estimatedTokens > HEALTH_THRESHOLDS.TOKEN_YELLOW) reasons.push(`tokens=${estimatedTokens} (>${HEALTH_THRESHOLDS.TOKEN_YELLOW})`);
              if (compactions >= HEALTH_THRESHOLDS.COMPACTION_YELLOW) reasons.push(`compactions=${compactions} (>=${HEALTH_THRESHOLDS.COMPACTION_YELLOW})`);
            }

            // Get last position save time
            let lastPositionSave: string | null = null;
            const posFile = path.join(PATHS.MCP_SERVER, "data", "docs", "roadmap", "CURRENT_POSITION.md");
            if (fs.existsSync(posFile)) {
              lastPositionSave = fs.statSync(posFile).mtime.toISOString();
            }

            const advisory = healthStatus === "RED"
              ? "Complete current step, write handoff, stop."
              : healthStatus === "YELLOW"
              ? "Session aging. Save state, consider wrapping up."
              : "Healthy. Continue normally.";

            // SYS-MS6: Schema coverage metric
            const schemaCoverage = {
              dispatchers_with_schemas: 7,
              total_dispatchers: 45,
              actions_with_schemas: 147,
              covered: ["prism_calc(48)", "prism_safety(29)", "prism_5axis(5)", "prism_thread(13)", "prism_data(35)", "prism_toolpath(9)", "prism_export(8)"],
            };

            return ok({
              health_status: healthStatus,
              call_count: calls,
              estimated_tokens: estimatedTokens,
              compaction_count: compactions,
              last_position_save: lastPositionSave,
              reasons,
              advisory,
              schema_coverage: schemaCoverage,
            });
          }

          case "dsl_mode": {
            // L0-P1-MS1: DSL compression mode toggle
            // Persists to CURRENT_STATE.json under dsl_mode key
            const DSL_STATE_KEY = "dsl_mode";
            const mode = params.mode; // "enable" | "disable" | "status"
            const state = loadJsonFile(CURRENT_STATE_FILE) || {};

            if (mode === "enable") {
              state[DSL_STATE_KEY] = { enabled: true, activated_at: new Date().toISOString() };
              saveJsonFile(CURRENT_STATE_FILE, state);
              return ok({ dsl_mode: "enabled", message: "DSL compression active. Dispatcher responses will use abbreviated terms." });
            } else if (mode === "disable") {
              state[DSL_STATE_KEY] = { enabled: false, deactivated_at: new Date().toISOString() };
              saveJsonFile(CURRENT_STATE_FILE, state);
              return ok({ dsl_mode: "disabled", message: "DSL compression disabled. Full terms will be used." });
            } else {
              // status
              const dslState = state[DSL_STATE_KEY] || { enabled: false };
              return ok({ dsl_mode: dslState.enabled ? "enabled" : "disabled", state: dslState });
            }
          }

          case "context_preload": {
            const { contextPreloaderEngine } = await import("../../engines/ContextPreloaderEngine.js");
            const ctx = contextPreloaderEngine.getPreloadContext();
            return ok(ctx);
          }
          case "context_boot": {
            const { contextPreloaderEngine: cpe } = await import("../../engines/ContextPreloaderEngine.js");
            const boot = cpe.getBootBlock();
            return ok(boot);
          }
          case "context_delta_boot": {
            const { contextPreloaderEngine: cpe2 } = await import("../../engines/ContextPreloaderEngine.js");
            const sinceCommit = params.since_commit || params.commit || "HEAD~10";
            const delta = cpe2.getDeltaBoot(sinceCommit);
            return ok(delta);
          }
          case "quick_ref_regenerate": {
            const { contextPreloaderEngine: cpe3 } = await import("../../engines/ContextPreloaderEngine.js");
            const result = cpe3.regenerateQuickRef();
            return ok(result);
          }
          case "session_delta": {
            const hours = params.hours ? Number(params.hours) : 24;
            const report = sessionDeltaEngine.getRecentActivity(hours);
            return ok(report);
          }

          case "session_bookmark": {
            const bookmark = sessionDeltaEngine.getSessionBookmark();
            return ok(bookmark);
          }

          case "session_compare_bookmark": {
            const bookmark = params.bookmark;
            if (!bookmark || !bookmark.commitHash || !bookmark.timestamp) {
              return ok({ error: "bookmark param required with commitHash, timestamp, engineCount, dispatcherCount, testCount, actionCount" });
            }
            const delta = sessionDeltaEngine.compareBookmark(bookmark);
            return ok(delta);
          }

          // ================================================================
          // system_snapshot — Ultra-compact single-line system summary
          // ================================================================
          case "system_snapshot": {
            const snapshot = systemSnapshotEngine.getCompactSnapshot();
            return ok({ snapshot });
          }

          // ================================================================
          // system_snapshot_layered — Depth-controlled snapshot
          // ================================================================
          case "system_snapshot_layered": {
            const depth = (params.depth || 'standard') as SnapshotDepth;
            const snapshot = systemSnapshotEngine.getLayeredSnapshot(depth);
            return ok({ depth, snapshot });
          }

          // ================================================================
          // system_drift_report — Live vs documented count comparison
          // ================================================================
          case "system_drift_report": {
            const report = systemSnapshotEngine.getDriftReport();
            return ok(report);
          }

          // ================================================================
          // dispatcher_map — Full dispatcher action catalog
          // ================================================================
          case "dispatcher_map": {
            const { dispatcherMapEngine } = await import("../../engines/DispatcherMapEngine.js");
            return ok(dispatcherMapEngine.getCounts());
          }

          case "dispatcher_map_compact": {
            const { dispatcherMapEngine: dme } = await import("../../engines/DispatcherMapEngine.js");
            const max = params.max_per_dispatcher ? Number(params.max_per_dispatcher) : 5;
            return ok({ map: dme.getCompactMap(max) });
          }

          // HOOK-SYNERGY-MS0/U-HOOK-REGISTRY (H2) — event → top-N hook ids (parallel of dispatcher_map_compact for hooks)
          case "hook_map_compact": {
            const { hookRegistryReaderEngine } = await import("../../engines/HookRegistryReaderEngine.js");
            const max = params.max_per_event != null ? Number(params.max_per_event) : 5;
            return ok({ map: hookRegistryReaderEngine.getCompactMap(max) });
          }

          case "action_search": {
            const { dispatcherMapEngine: dme2 } = await import("../../engines/DispatcherMapEngine.js");
            const q = params.query || params.q || "";
            const max = params.max_results ? Number(params.max_results) : 20;
            return ok(dme2.searchActions(q, max));
          }

          case "action_find": {
            const { dispatcherMapEngine: dme3 } = await import("../../engines/DispatcherMapEngine.js");
            const action_name = params.action || params.name || "";
            const result = dme3.findAction(action_name);
            return ok(result || { error: `Action '${action_name}' not found` });
          }

          // ================================================================
          // tool_route — Intent-based routing for token efficiency
          // ================================================================
          case "tool_route": {
            const { toolRouterEngine } = await import("../../engines/ToolRouterEngine.js");
            const intent = params.intent || params.query || params.q || "";
            return ok(toolRouterEngine.route(intent));
          }

          case "tool_route_best": {
            const { toolRouterEngine: tr } = await import("../../engines/ToolRouterEngine.js");
            const intent = params.intent || params.query || params.q || "";
            const best = tr.bestRoute(intent);
            return ok(best || { error: "No route found for intent" });
          }

          // ================================================================
          // Coordination Ledger — CoordinationLedgerEngine bridge
          // ================================================================
          case "coordination_record": {
            const { coordinationLedgerEngine } = await import("../../engines/CoordinationLedgerEngine.js");
            const ledgerPath = (params.ledger_path as string) || path.join(STATE_DIR, "..", "..", "state", "shared", "COORDINATION_LEDGER.jsonl");
            const at = params.at != null ? Number(params.at) : Date.now();
            if (!Number.isFinite(at)) return ok({ error: "at must be a finite epoch-ms value" });
            if (!params.agent || !params.kind || !params.target) {
              return ok({ error: "agent, kind, and target are required" });
            }
            const event = coordinationLedgerEngine.record({
              agent: String(params.agent),
              kind: params.kind as any,
              target: String(params.target),
              payload: params.payload,
              at,
            });
            try {
              const dir = path.dirname(ledgerPath);
              if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
              fs.appendFileSync(ledgerPath, JSON.stringify(event) + "\n", "utf8");
            } catch (err: any) {
              return ok({ success: false, error: `append failed: ${err.message}`, event });
            }
            return ok({ success: true, event, ledger_path: ledgerPath, count: coordinationLedgerEngine.count() });
          }

          case "coordination_detect_conflicts": {
            const { CoordinationLedgerEngine } = await import("../../engines/CoordinationLedgerEngine.js");
            const ledgerPath = (params.ledger_path as string) || path.join(STATE_DIR, "..", "..", "state", "shared", "COORDINATION_LEDGER.jsonl");
            const windowMs = params.window_ms != null ? Number(params.window_ms) : 30_000;
            const ledger = new CoordinationLedgerEngine();
            let hydrateResult = { hydrated: 0, skipped: 0, errors: [] as any[] };
            if (fs.existsSync(ledgerPath)) {
              const lines = fs.readFileSync(ledgerPath, "utf8").split(/\r?\n/);
              hydrateResult = ledger.hydrateFromJSONL(lines);
            }
            const conflicts = ledger.detectConflicts(windowMs);
            return ok({ success: true, conflicts, count: ledger.count(), hydrate: hydrateResult, ledger_path: ledgerPath, window_ms: windowMs });
          }

          case "coordination_recent": {
            const { CoordinationLedgerEngine } = await import("../../engines/CoordinationLedgerEngine.js");
            const ledgerPath = (params.ledger_path as string) || path.join(STATE_DIR, "..", "..", "state", "shared", "COORDINATION_LEDGER.jsonl");
            const since = params.since != null ? Number(params.since) : Date.now() - 60 * 60 * 1000;
            const ledger = new CoordinationLedgerEngine();
            if (fs.existsSync(ledgerPath)) {
              const lines = fs.readFileSync(ledgerPath, "utf8").split(/\r?\n/);
              ledger.hydrateFromJSONL(lines);
            }
            let events = ledger.since(since);
            if (params.agent) events = events.filter((e) => e.agent === String(params.agent));
            if (params.target) events = events.filter((e) => e.target === String(params.target));
            return ok({ success: true, events, count: events.length, since, ledger_path: ledgerPath });
          }

          case "coordination_count": {
            const { CoordinationLedgerEngine } = await import("../../engines/CoordinationLedgerEngine.js");
            const ledgerPath = (params.ledger_path as string) || path.join(STATE_DIR, "..", "..", "state", "shared", "COORDINATION_LEDGER.jsonl");
            const ledger = new CoordinationLedgerEngine();
            if (fs.existsSync(ledgerPath)) {
              const lines = fs.readFileSync(ledgerPath, "utf8").split(/\r?\n/);
              ledger.hydrateFromJSONL(lines);
            }
            return ok({ success: true, count: ledger.count(), ledger_path: ledgerPath });
          }

          // ================================================================
          // ENGINE-WIRE-MS0/U-WIRE22: AgentSelfAwarenessEngine
          // Unified self-awareness across capabilities + engines
          // ================================================================
          case "self_awareness_build": {
            const { agentSelfAwarenessEngine } = await import("../../engines/AgentSelfAwarenessEngine.js");
            const forceRefresh = params.force_refresh === true || params.forceRefresh === true;
            const awareness = await agentSelfAwarenessEngine.buildAwareness(forceRefresh);
            return ok({
              stats: awareness.stats,
              topCapabilities: awareness.topCapabilities,
              topEngines: awareness.topEngines.slice(0, 10),
              refreshedAt: awareness.refreshedAt.toISOString(),
            });
          }

          case "self_awareness_search": {
            const { agentSelfAwarenessEngine: asa1 } = await import("../../engines/AgentSelfAwarenessEngine.js");
            const query = typeof params.query === "string" ? params.query : (typeof params.q === "string" ? params.q : "");
            if (!query) return ok({ error: "Missing 'query' parameter" });
            const limit = Number.isFinite(Number(params.limit)) ? Number(params.limit) : 20;
            const results = await asa1.search(query, limit);
            return ok({
              query,
              count: results.length,
              results: results.map(r => ({
                type: r.type,
                name: r.name,
                description: r.description,
                category: r.category,
                score: r.score,
              })),
            });
          }

          case "self_awareness_context_summary": {
            const { agentSelfAwarenessEngine: asa2 } = await import("../../engines/AgentSelfAwarenessEngine.js");
            const maxTokens = Number.isFinite(Number(params.max_tokens))
              ? Number(params.max_tokens)
              : (Number.isFinite(Number(params.maxTokens)) ? Number(params.maxTokens) : 500);
            const summary = await asa2.getContextSummary(maxTokens);
            return ok(summary);
          }

          case "self_awareness_health": {
            const { agentSelfAwarenessEngine: asa3 } = await import("../../engines/AgentSelfAwarenessEngine.js");
            const health = await asa3.getHealthCheck();
            return ok(health);
          }

          case "self_awareness_quick_stats": {
            const { agentSelfAwarenessEngine: asa4 } = await import("../../engines/AgentSelfAwarenessEngine.js");
            const stats = await asa4.getQuickStats();
            return ok(stats);
          }

          case "self_awareness_recommended_actions": {
            const { agentSelfAwarenessEngine: asa5 } = await import("../../engines/AgentSelfAwarenessEngine.js");
            const task = typeof params.task === "string" ? params.task : (typeof params.query === "string" ? params.query : "");
            if (!task) return ok({ error: "Missing 'task' parameter" });
            const recs = await asa5.getRecommendedActions(task);
            return ok(recs);
          }

          // ── COGNITIVE-BRIDGE-MS0/U-WIRE-COG-BATCH4: Awareness ──
          case "awareness_unified_query": {
            const { unifiedAwarenessOrchestrator } = await import("../../engines/UnifiedAwarenessOrchestrator.js");
            const result = await unifiedAwarenessOrchestrator.query({
              query: params.query,
              domain: params.domain ?? "all",
              context: params.context,
              limit: params.limit,
            });
            return ok({ result });
          }
          case "awareness_command_detect": {
            const { unifiedCommandAwarenessEngine } = await import("../../engines/UnifiedCommandAwarenessEngine.js");
            const suggestion = await unifiedCommandAwarenessEngine.detectCommands(params.input);
            return ok({ suggestion });
          }
          case "awareness_command_suggest_string": {
            const { unifiedCommandAwarenessEngine } = await import("../../engines/UnifiedCommandAwarenessEngine.js");
            const text = await unifiedCommandAwarenessEngine.getSuggestionString(params.input);
            return ok({ suggestion: text });
          }
          case "awareness_filter": {
            const { situationalAwarenessFilterEngine } = await import("../../engines/SituationalAwarenessFilterEngine.js");
            const result = situationalAwarenessFilterEngine.filter(params.directive, params.prompt, {
              maxLines: params.max_lines,
              minScore: params.min_score,
              alwaysKeepHeaders: params.always_keep_headers,
            });
            return ok({ result });
          }
          case "awareness_lifecycle_get_current": {
            // Engine has no module singleton — per-session factory. Use the
            // shared dispatcher-scoped lifecycle (cached lazily, keyed by
            // session_id param or a default "dispatcher-default").
            const { createSessionAwarenessLifecycle } = await import("../../engines/SessionAwarenessLifecycleEngine.js");
            const sid = (typeof params.session_id === "string" && params.session_id.length > 0)
              ? params.session_id
              : "dispatcher-default";
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cache = (globalThis as any).__prismLifecycleCache ?? new Map<string, ReturnType<typeof createSessionAwarenessLifecycle>>();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (globalThis as any).__prismLifecycleCache = cache;
            let engine = cache.get(sid);
            if (!engine) {
              engine = createSessionAwarenessLifecycle(sid);
              cache.set(sid, engine);
            }
            return ok({
              current: engine.getCurrent(),
              session_id: engine.getSessionId(),
              execute_to_metacog_count: engine.getExecuteToMetacogCount(),
            });
          }
          case "awareness_lifecycle_get_history": {
            const { createSessionAwarenessLifecycle } = await import("../../engines/SessionAwarenessLifecycleEngine.js");
            const sid = (typeof params.session_id === "string" && params.session_id.length > 0)
              ? params.session_id
              : "dispatcher-default";
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cache = (globalThis as any).__prismLifecycleCache ?? new Map<string, ReturnType<typeof createSessionAwarenessLifecycle>>();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (globalThis as any).__prismLifecycleCache = cache;
            let engine = cache.get(sid);
            if (!engine) {
              engine = createSessionAwarenessLifecycle(sid);
              cache.set(sid, engine);
            }
            return ok({ history: engine.getHistory() });
          }

          // OBSIDIAN-AUTOMATE-MS3/U-OLLAMA-HEALTH-EXPOSE — surface Ollama daemon health
          case "ollama_health": {
            const { ollamaIntegrationEngine } = await import("../../engines/OllamaIntegrationEngine.js");
            const probeFresh = params.probe_fresh === true || params.probeFresh === true;
            const refreshModels = params.refresh_models === true || params.refreshModels === true;
            const health = probeFresh
              ? await ollamaIntegrationEngine.ping()
              : ollamaIntegrationEngine.snapshotHealth();
            const models = await ollamaIntegrationEngine.discoverModels(refreshModels);
            return ok({
              connected: health.connected,
              host: health.host,
              lastPingAt: health.lastPingAt,
              lastPingOk: health.lastPingOk,
              lastPingLatencyMs: health.lastPingLatencyMs,
              avgLatencyMs: health.avgLatencyMs,
              okStreak: health.okStreak,
              failStreak: health.failStreak,
              pingsAttempted: health.pingsAttempted,
              models,
              defaultModelMap: ollamaIntegrationEngine.listDefaults(),
              status: ollamaIntegrationEngine.status(),
            });
          }

          // HTML-PRIMARY-MS0/U-HPS07 — general doc → HTML render (mirrors prism_dev:spec_html_render; wire-to-all-consumers)
          case "doc_render": {
            const { specHtmlCompanionEngine } = await import("../../engines/SpecHTMLCompanionEngine.js");
            const projRoot = path.resolve(PATHS.PRISM_ROOT);
            let md = typeof params.md === "string" ? params.md : (typeof params.markdown === "string" ? params.markdown : "");
            let srcPath: string | undefined;
            if (!md && typeof params.path === "string" && params.path) {
              const abs = path.isAbsolute(params.path) ? params.path : path.join(projRoot, params.path);
              const resolved = path.resolve(abs);
              // require a trailing separator so a sibling like H:/prism-cad-complete can't satisfy the prefix check
              if (resolved !== projRoot && !resolved.startsWith(projRoot + path.sep)) return ok({ success: false, error: "path escapes PRISM root" });
              if (!fs.existsSync(resolved)) return ok({ success: false, error: `file not found: ${params.path}` });
              md = fs.readFileSync(resolved, "utf-8");
              srcPath = resolved;
            }
            if (!md) return ok({ success: false, error: "provide 'md' (markdown string) or 'path' (.md file path under the PRISM root)" });
            const rendered = specHtmlCompanionEngine.render(md, {
              theme: params.theme === "dark" || params.theme === "light" ? params.theme : "auto",
              toc: params.toc !== false,
              title: typeof params.title === "string" ? params.title : undefined,
              generatedBy: "prism_session:doc_render",
              sourcePath: srcPath ? path.basename(srcPath) : undefined,
            });
            let wrote: string | undefined;
            if (params.write && srcPath) {
              const stem = srcPath.replace(/\.(md|markdown)$/i, "");
              const outPath = stem === srcPath ? srcPath + ".html" : stem + ".html";
              safeWriteSync(outPath, rendered.html, "utf-8");
              safeWriteSync(outPath + ".hash", `${rendered.sourceHash}  ${path.basename(srcPath)}\n`, "utf-8");
              wrote = path.relative(projRoot, outPath);
            }
            return ok({
              success: true,
              title: rendered.title,
              headings: rendered.headings,
              hasMermaid: rendered.hasMermaid,
              sourceHash: rendered.sourceHash,
              bytes: rendered.bytes,
              warnings: rendered.warnings,
              ...(wrote ? { wrote } : {}),
              ...(params.include_html ? { html: rendered.html } : {}),
            });
          }

          default:
            return ok({ error: `Unknown action: ${action}`, available: ACTIONS });
        }
      } catch (err: any) {
        return dispatcherError(err, action, "prism_session");
      }
    }
  );
}