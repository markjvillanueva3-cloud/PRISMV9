import { z } from "zod";
import { log } from "../../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { hookExecutor } from "../../engines/HookExecutor.js";
import type { StateEvent } from "../../types/prism-schema.js";
import { atomicWrite } from "../../utils/atomicWrite.js";
import { PATHS } from "../../constants.js";

// Fire lifecycle hooks (non-blocking, errors logged but don't break session ops)
async function fireLifecycleHook(phase: string, metadata: Record<string, any>): Promise<void> {
  try {
    await hookExecutor.execute(phase as any, {
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
  "health_check"
] as const;

function ok(data: any) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
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
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
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
    const result = execSync(`"${PYTHON}" "${scriptPath}" ${args.map(a => a.includes(' ') ? `"${a}"` : a).join(' ')}`, {
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

export function registerSessionDispatcher(server: any): void {
  server.tool(
    "prism_session",
    `Session state + lifecycle (20 actions). Actions: ${ACTIONS.join(", ")}`,
    { action: z.enum(ACTIONS), params: z.record(z.any()).optional() },
    async ({ action, params = {} }: { action: typeof ACTIONS[number]; params: Record<string, any> }) => {
      log.info(`[prism_session] ${action}`);
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
            let tokensUsed = params.estimated_tokens || 50000;
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
                transcriptPath = path.join(TRANSCRIPTS_DIR, params.transcript_name);
              } else {
                transcriptPath = path.join(TRANSCRIPTS_DIR, files[0]);
              }
              
              if (!fs.existsSync(transcriptPath)) {
                return ok({ error: `Transcript not found: ${transcriptPath}` });
              }
              
              const content = fs.readFileSync(transcriptPath, 'utf-8');
              const lines = content.split('\n');
              const totalLines = lines.length;
              const numLines = params.lines || 200;
              
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
            
            state.quickResume = params.quick_resume;
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
                const sdOutput = execSync(
                  `"${PYTHON_PATH}" "${shutdownScript}" --summary "${summary.replace(/"/g, "'")}" --json`,
                  { encoding: 'utf-8', timeout: 15000, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } }
                );
                try { enhancedShutdown = JSON.parse(sdOutput); } catch { enhancedShutdown = { raw: sdOutput.slice(0, 200) }; }
              }
            } catch { /* enhanced shutdown non-fatal */ }

            return ok({ status: params.status, endTime, quickResume: params.quick_resume, graceful_shutdown: shutdownResult, next_session_prep: nextSessionPrep, enhanced_shutdown: enhancedShutdown });
          }
          
          case "auto_checkpoint": {
            let zone = "GREEN";
            let shouldCheckpoint = params.force || false;
            
            const toolCalls = params.tool_calls || 0;
            
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
            const errorCount = params.error_count || 0;
            const successCount = params.success_count || toolCalls - errorCount;
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
                  latestTokens = history[history.length - 1].tokens_used || 0;
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
            const estimatedTokens = params.estimated_tokens || latestTokens || 0;
            const calls = params.call_count || callCount;
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

            return ok({
              health_status: healthStatus,
              call_count: calls,
              estimated_tokens: estimatedTokens,
              compaction_count: compactions,
              last_position_save: lastPositionSave,
              reasons,
              advisory
            });
          }

          default:
            return ok({ error: `Unknown action: ${action}`, available: ACTIONS });
        }
      } catch (err: any) {
        return ok({ error: err.message, action });
      }
    }
  );
}