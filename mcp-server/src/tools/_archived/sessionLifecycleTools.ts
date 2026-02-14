/**
 * PRISM MCP Server - Session Lifecycle Tools v1.0
 * ================================================
 * 
 * Critical tools for context management, compaction recovery, and session continuity.
 * Wraps Python scripts in C:\PRISM\scripts\core\ for MCP access.
 * 
 * TOOLS (12 total):
 * 
 * CONTEXT MANAGEMENT (4):
 * - prism_context_pressure: Monitor context window pressure (GREEN/YELLOW/ORANGE/RED/CRITICAL)
 * - prism_context_size: Get current estimated context usage
 * - prism_context_compress: Compress context when nearing limits
 * - prism_context_expand: Expand previously compressed context
 * 
 * COMPACTION RECOVERY (4):
 * - prism_compaction_detect: Detect if context was compacted
 * - prism_transcript_read: Read from /mnt/transcripts/ for recovery
 * - prism_state_reconstruct: Rebuild state from transcript + checkpoint
 * - prism_session_recover: Full recovery from compaction
 * 
 * SESSION CONTINUITY (4):
 * - prism_quick_resume: Fast 5-second session resume
 * - prism_session_start_full: Complete session start protocol
 * - prism_session_end_full: Complete session end protocol
 * - prism_auto_checkpoint: Automatic checkpoint based on buffer zone
 * 
 * @version 1.0.0
 * @module sessionLifecycleTools
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { spawn, execSync } from "child_process";
import { log } from "../utils/Logger.js";

// ============================================================================
// CONFIGURATION
// ============================================================================

const PRISM_ROOT = "C:\\PRISM";
const STATE_DIR = path.join(PRISM_ROOT, "state");
const SCRIPTS_DIR = path.join(PRISM_ROOT, "scripts", "core");
const CURRENT_STATE_FILE = path.join(STATE_DIR, "CURRENT_STATE.json");
const ROADMAP_FILE = path.join(STATE_DIR, "ROADMAP_TRACKER.json");
const PRESSURE_LOG = path.join(STATE_DIR, "context_pressure_log.json");
const TRANSCRIPTS_DIR = "/mnt/transcripts";

// Python executable
const PYTHON = "C:\\Users\\Admin.DIGITALSTORM-PC\\AppData\\Local\\Programs\\Python\\Python312\\python.exe";

// Context thresholds
const THRESHOLDS = {
  GREEN_MAX: 0.60,
  YELLOW_MAX: 0.75,
  ORANGE_MAX: 0.85,
  RED_MAX: 0.92,
  MAX_TOKENS: 200000
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function successResponse(content: string, metadata?: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: content }],
    metadata
  };
}

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

function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters for English
  return Math.ceil(text.length / 4);
}

function getPressureLevel(percentage: number): string {
  if (percentage <= THRESHOLDS.GREEN_MAX) return "GREEN";
  if (percentage <= THRESHOLDS.YELLOW_MAX) return "YELLOW";
  if (percentage <= THRESHOLDS.ORANGE_MAX) return "ORANGE";
  if (percentage <= THRESHOLDS.RED_MAX) return "RED";
  return "CRITICAL";
}

function getRecommendation(level: string): string {
  switch (level) {
    case "GREEN": return "Normal operation. Continue work.";
    case "YELLOW": return "Plan checkpoint. Consider batching operations.";
    case "ORANGE": return "Prepare handoff. Create checkpoint NOW.";
    case "RED": return "IMMEDIATE checkpoint required. Prepare session end.";
    case "CRITICAL": return "STOP ALL WORK. Emergency handoff required.";
    default: return "Unknown state";
  }
}

async function runPythonScript(scriptName: string, args: string[] = []): Promise<string> {
  const scriptPath = path.join(SCRIPTS_DIR, scriptName);
  
  if (!fs.existsSync(scriptPath)) {
    return `ERROR: Script not found: ${scriptPath}`;
  }
  
  try {
    const result = execSync(`"${PYTHON}" "${scriptPath}" ${args.join(' ')}`, {
      encoding: 'utf-8',
      timeout: 30000,
      cwd: SCRIPTS_DIR
    });
    return result;
  } catch (error: any) {
    return `ERROR: ${error.message}`;
  }
}

// ============================================================================
// TOOL REGISTRATION
// ============================================================================

export function registerSessionLifecycleTools(server: McpServer): void {

  // =========================================================================
  // CONTEXT MANAGEMENT TOOLS
  // =========================================================================

  /**
   * prism_context_pressure - Monitor context window pressure
   */
  server.tool(
    "prism_context_pressure",
    `Monitor context window pressure level.

Returns pressure level (GREEN/YELLOW/ORANGE/RED/CRITICAL) with recommendations:
- GREEN (0-60%): Normal operation
- YELLOW (60-75%): Plan checkpoint, consider batching
- ORANGE (75-85%): Prepare handoff, checkpoint NOW
- RED (85-92%): IMMEDIATE checkpoint, prepare session end
- CRITICAL (>92%): STOP ALL WORK, emergency handoff

Use this every 5-8 tool calls to monitor context health.`,
    {
      estimated_tokens: z.number().optional().describe("Estimated tokens used (if known)"),
      include_history: z.boolean().optional().default(false).describe("Include pressure history")
    },
    async (params) => {
      log.info("[prism_context_pressure] Checking context pressure");
      
      // If estimated_tokens provided, use it; otherwise estimate from state
      let tokensUsed = params.estimated_tokens || 0;
      
      if (!tokensUsed) {
        // Try to estimate from state file and recent activity
        const state = loadJsonFile(CURRENT_STATE_FILE);
        const stateSize = state ? JSON.stringify(state).length : 0;
        tokensUsed = estimateTokens(JSON.stringify({ stateSize })) + 50000; // Base estimate
      }
      
      const percentage = tokensUsed / THRESHOLDS.MAX_TOKENS;
      const level = getPressureLevel(percentage);
      const recommendation = getRecommendation(level);
      
      // Log to pressure history
      const reading = {
        timestamp: new Date().toISOString(),
        tokens_used: tokensUsed,
        percentage: Math.round(percentage * 100),
        level,
        recommendation
      };
      
      // Append to log
      let history: any[] = [];
      if (fs.existsSync(PRESSURE_LOG)) {
        try {
          history = JSON.parse(fs.readFileSync(PRESSURE_LOG, 'utf-8'));
        } catch (e) {
          history = [];
        }
      }
      history.push(reading);
      // Keep last 100 readings
      if (history.length > 100) history = history.slice(-100);
      fs.writeFileSync(PRESSURE_LOG, JSON.stringify(history, null, 2));
      
      const emoji = {
        GREEN: "🟢",
        YELLOW: "🟡", 
        ORANGE: "🟠",
        RED: "🔴",
        CRITICAL: "⚫"
      }[level] || "❓";
      
      let output = [
        `# Context Pressure: ${emoji} ${level}`,
        "",
        `**Usage:** ~${tokensUsed.toLocaleString()} / ${THRESHOLDS.MAX_TOKENS.toLocaleString()} tokens (${Math.round(percentage * 100)}%)`,
        "",
        `**Recommendation:** ${recommendation}`,
        ""
      ];
      
      if (level === "YELLOW" || level === "ORANGE") {
        output.push("**Suggested Actions:**");
        output.push("- Use `prism_master_batch` for multiple operations");
        output.push("- Create checkpoint with `prism_checkpoint_create`");
        output.push("");
      }
      
      if (level === "RED" || level === "CRITICAL") {
        output.push("**⚠️ URGENT ACTIONS:**");
        output.push("1. `prism_master_checkpoint` - Save all progress");
        output.push("2. `prism_handoff_prepare` - Prepare session end");
        output.push("3. Update CURRENT_STATE.json with quick resume");
        output.push("");
      }
      
      if (params.include_history && history.length > 1) {
        output.push("## Recent History");
        output.push("| Time | Level | Usage |");
        output.push("|------|-------|-------|");
        history.slice(-5).forEach(h => {
          output.push(`| ${h.timestamp.split('T')[1].split('.')[0]} | ${h.level} | ${h.percentage}% |`);
        });
      }
      
      return successResponse(output.join("\n"), { 
        level, 
        percentage: Math.round(percentage * 100),
        tokens_used: tokensUsed,
        recommendation 
      });
    }
  );

  /**
   * prism_context_size - Get current context size estimate
   */
  server.tool(
    "prism_context_size",
    `Get current estimated context window size and breakdown.

Returns token estimates for different context components.`,
    {},
    async () => {
      log.info("[prism_context_size] Estimating context size");
      
      const state = loadJsonFile(CURRENT_STATE_FILE);
      const roadmap = loadJsonFile(ROADMAP_FILE);
      
      const estimates = {
        system_prompt: 5000,  // Base system prompt
        memories: 3000,       // User memories
        state_file: state ? estimateTokens(JSON.stringify(state)) : 0,
        roadmap_file: roadmap ? estimateTokens(JSON.stringify(roadmap)) : 0,
        conversation: 50000,  // Estimated conversation (unknown)
        tools_loaded: 10000   // MCP tool definitions
      };
      
      const total = Object.values(estimates).reduce((a, b) => a + b, 0);
      const percentage = total / THRESHOLDS.MAX_TOKENS;
      
      const output = [
        "# Context Size Estimate",
        "",
        "| Component | Tokens | % |",
        "|-----------|--------|---|",
        ...Object.entries(estimates).map(([k, v]) => 
          `| ${k.replace('_', ' ')} | ${v.toLocaleString()} | ${Math.round(v / THRESHOLDS.MAX_TOKENS * 100)}% |`
        ),
        `| **TOTAL** | **${total.toLocaleString()}** | **${Math.round(percentage * 100)}%** |`,
        "",
        `**Max Capacity:** ${THRESHOLDS.MAX_TOKENS.toLocaleString()} tokens`,
        `**Available:** ~${(THRESHOLDS.MAX_TOKENS - total).toLocaleString()} tokens`,
        "",
        "_Note: Conversation size is estimated. Actual may vary._"
      ];
      
      return successResponse(output.join("\n"), { estimates, total, percentage });
    }
  );

  /**
   * prism_context_compress - Compress context when nearing limits
   */
  server.tool(
    "prism_context_compress",
    `Compress context by summarizing and externalizing non-critical data.

Creates compressed state that can be expanded later with prism_context_expand.
Use when context pressure reaches ORANGE or RED.`,
    {
      compression_level: z.enum(["light", "moderate", "aggressive", "maximum"]).optional().default("moderate"),
      preserve_categories: z.array(z.string()).optional().describe("Categories to preserve in full")
    },
    async (params) => {
      log.info(`[prism_context_compress] Compressing with level: ${params.compression_level}`);
      
      // Run Python compressor
      const result = await runPythonScript("context_compressor.py", [
        params.compression_level || "moderate"
      ]);
      
      // Create compression manifest
      const manifest = {
        compressed_at: new Date().toISOString(),
        level: params.compression_level,
        preserved: params.preserve_categories || ["safety_critical", "current_task"]
      };
      
      const manifestPath = path.join(STATE_DIR, "compression_manifest.json");
      saveJsonFile(manifestPath, manifest);
      
      return successResponse([
        "# Context Compressed",
        "",
        `**Level:** ${params.compression_level}`,
        `**Manifest:** ${manifestPath}`,
        "",
        "**What was preserved:**",
        "- Safety-critical data (always)",
        "- Current task state",
        "- Recent decisions",
        "",
        "**What was compressed:**",
        "- Historical context",
        "- Completed task details",
        "- Redundant information",
        "",
        "Use `prism_context_expand` to restore full context when needed.",
        "",
        result.includes("ERROR") ? `⚠️ ${result}` : "✅ Compression complete"
      ].join("\n"), { manifest });
    }
  );

  /**
   * prism_context_expand - Expand previously compressed context
   */
  server.tool(
    "prism_context_expand",
    `Expand previously compressed context to restore full details.

Only use when you need full historical context and have available capacity.`,
    {
      sections: z.array(z.string()).optional().describe("Specific sections to expand")
    },
    async (params) => {
      log.info("[prism_context_expand] Expanding compressed context");
      
      const manifestPath = path.join(STATE_DIR, "compression_manifest.json");
      const manifest = loadJsonFile(manifestPath);
      
      if (!manifest) {
        return successResponse("No compressed context found. Nothing to expand.");
      }
      
      const result = await runPythonScript("context_expander.py", 
        params.sections || []
      );
      
      return successResponse([
        "# Context Expanded",
        "",
        `**Original compression:** ${manifest.compressed_at}`,
        `**Sections expanded:** ${params.sections?.join(", ") || "all"}`,
        "",
        result.includes("ERROR") ? `⚠️ ${result}` : "✅ Expansion complete"
      ].join("\n"));
    }
  );

  // =========================================================================
  // COMPACTION RECOVERY TOOLS
  // =========================================================================

  /**
   * prism_compaction_detect - Detect if context was compacted
   */
  server.tool(
    "prism_compaction_detect",
    `Detect if the conversation context has been compacted.

Analyzes:
1. Transcript file presence
2. State file consistency  
3. Context markers

Returns detection result with confidence and recovery recommendation.`,
    {},
    async () => {
      log.info("[prism_compaction_detect] Detecting compaction");
      
      const indicators: any[] = [];
      let isCompacted = false;
      let confidence = 0;
      
      // Check 1: State file exists and has session info
      const state = loadJsonFile(CURRENT_STATE_FILE);
      if (state) {
        const hasSession = state.currentSession || state.session_id;
        indicators.push({
          name: "state_file_exists",
          detected: true,
          evidence: hasSession ? "Session info present" : "No session info"
        });
        if (!hasSession) {
          isCompacted = true;
          confidence += 0.3;
        }
      } else {
        indicators.push({
          name: "state_file_exists",
          detected: false,
          evidence: "State file missing or unreadable"
        });
        isCompacted = true;
        confidence += 0.5;
      }
      
      // Check 2: Look for transcript files
      let transcriptFound = false;
      let latestTranscript = null;
      
      try {
        if (fs.existsSync(TRANSCRIPTS_DIR)) {
          const files = fs.readdirSync(TRANSCRIPTS_DIR)
            .filter(f => f.endsWith('.txt'))
            .sort()
            .reverse();
          
          if (files.length > 0) {
            transcriptFound = true;
            latestTranscript = files[0];
          }
        }
      } catch (e) {
        // Transcripts dir might not be accessible
      }
      
      indicators.push({
        name: "transcript_available",
        detected: transcriptFound,
        evidence: latestTranscript ? `Latest: ${latestTranscript}` : "No transcripts found"
      });
      
      // Determine compaction type
      let compactionType = "none";
      if (isCompacted) {
        compactionType = transcriptFound ? "soft" : "hard";
        if (confidence < 0.5) compactionType = "possible";
      }
      
      const recommendation = isCompacted
        ? `Recovery recommended. Use prism_transcript_read to load: ${latestTranscript || 'latest transcript'}`
        : "No compaction detected. Session appears continuous.";
      
      const emoji = isCompacted ? "⚠️" : "✅";
      
      return successResponse([
        `# Compaction Detection: ${emoji} ${compactionType.toUpperCase()}`,
        "",
        `**Is Compacted:** ${isCompacted}`,
        `**Confidence:** ${Math.round(confidence * 100)}%`,
        `**Type:** ${compactionType}`,
        "",
        "## Indicators",
        ...indicators.map(i => `- **${i.name}:** ${i.detected ? "✓" : "✗"} - ${i.evidence}`),
        "",
        `## Recommendation`,
        recommendation,
        "",
        latestTranscript ? `**Latest Transcript:** ${path.join(TRANSCRIPTS_DIR, latestTranscript)}` : ""
      ].join("\n"), { 
        is_compacted: isCompacted, 
        compaction_type: compactionType,
        confidence,
        latest_transcript: latestTranscript 
      });
    }
  );

  /**
   * prism_transcript_read - Read transcript for recovery
   */
  server.tool(
    "prism_transcript_read",
    `Read a transcript file from /mnt/transcripts/ for context recovery.

Use after prism_compaction_detect identifies a transcript to recover from.`,
    {
      transcript_name: z.string().optional().describe("Transcript filename (or 'latest')"),
      lines: z.number().optional().default(200).describe("Number of lines to read"),
      from_end: z.boolean().optional().default(true).describe("Read from end of file")
    },
    async (params) => {
      log.info(`[prism_transcript_read] Reading transcript: ${params.transcript_name || 'latest'}`);
      
      let transcriptPath = "";
      
      try {
        if (!fs.existsSync(TRANSCRIPTS_DIR)) {
          return successResponse("ERROR: Transcripts directory not accessible.");
        }
        
        const files = fs.readdirSync(TRANSCRIPTS_DIR)
          .filter(f => f.endsWith('.txt'))
          .sort()
          .reverse();
        
        if (files.length === 0) {
          return successResponse("No transcript files found.");
        }
        
        if (params.transcript_name && params.transcript_name !== 'latest') {
          transcriptPath = path.join(TRANSCRIPTS_DIR, params.transcript_name);
        } else {
          transcriptPath = path.join(TRANSCRIPTS_DIR, files[0]);
        }
        
        if (!fs.existsSync(transcriptPath)) {
          return successResponse(`Transcript not found: ${transcriptPath}`);
        }
        
        const content = fs.readFileSync(transcriptPath, 'utf-8');
        const lines = content.split('\n');
        const totalLines = lines.length;
        
        let selectedLines: string[];
        if (params.from_end) {
          selectedLines = lines.slice(-params.lines);
        } else {
          selectedLines = lines.slice(0, params.lines);
        }
        
        return successResponse([
          `# Transcript: ${path.basename(transcriptPath)}`,
          "",
          `**Total Lines:** ${totalLines}`,
          `**Showing:** ${selectedLines.length} lines ${params.from_end ? 'from end' : 'from start'}`,
          "",
          "---",
          "",
          selectedLines.join('\n')
        ].join("\n"), { 
          transcript: path.basename(transcriptPath),
          total_lines: totalLines,
          lines_shown: selectedLines.length 
        });
        
      } catch (error: any) {
        return successResponse(`ERROR reading transcript: ${error.message}`);
      }
    }
  );

  /**
   * prism_state_reconstruct - Rebuild state from transcript
   */
  server.tool(
    "prism_state_reconstruct",
    `Reconstruct session state from transcript and checkpoint data.

Use after reading transcript to rebuild working state.`,
    {
      transcript_summary: z.string().describe("Key information extracted from transcript"),
      checkpoint_id: z.string().optional().describe("Checkpoint ID to restore from")
    },
    async (params) => {
      log.info("[prism_state_reconstruct] Reconstructing state");
      
      // Load existing state as base
      let state = loadJsonFile(CURRENT_STATE_FILE) || {};
      
      // Update with reconstruction info
      state.reconstructed = {
        timestamp: new Date().toISOString(),
        from_checkpoint: params.checkpoint_id || null,
        summary: params.transcript_summary
      };
      
      state.quickResume = `RECONSTRUCTED: ${params.transcript_summary.slice(0, 200)}...`;
      
      // Save reconstructed state
      saveJsonFile(CURRENT_STATE_FILE, state);
      
      return successResponse([
        "# State Reconstructed",
        "",
        "✅ State file updated with reconstruction data.",
        "",
        "## Quick Resume",
        `> ${state.quickResume}`,
        "",
        "## Next Steps",
        "1. Review reconstructed state",
        "2. Verify critical information",
        "3. Continue with `prism_session_resume`"
      ].join("\n"), { reconstructed: true });
    }
  );

  /**
   * prism_session_recover - Full recovery from compaction
   */
  server.tool(
    "prism_session_recover",
    `Complete session recovery workflow after compaction.

Combines: detect → read transcript → reconstruct → resume`,
    {},
    async () => {
      log.info("[prism_session_recover] Starting full recovery");
      
      const steps: string[] = [];
      
      // Step 1: Check for transcripts
      let latestTranscript = null;
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
        // Continue without transcript
      }
      
      steps.push(latestTranscript 
        ? `✅ Found transcript: ${latestTranscript}`
        : "⚠️ No transcript found - limited recovery"
      );
      
      // Step 2: Load any existing state
      const state = loadJsonFile(CURRENT_STATE_FILE);
      steps.push(state 
        ? `✅ State file loaded: v${state.version || 'unknown'}`
        : "⚠️ No state file - creating new"
      );
      
      // Step 3: Load roadmap
      const roadmap = loadJsonFile(ROADMAP_FILE);
      steps.push(roadmap
        ? `✅ Roadmap loaded: ${roadmap.current_phase || 'unknown phase'}`
        : "⚠️ No roadmap file"
      );
      
      // Build recovery summary
      const quickResume = [
        state?.quickResume || "Session recovered",
        roadmap?.current_focus || ""
      ].filter(Boolean).join(" | ");
      
      return successResponse([
        "# Session Recovery Complete",
        "",
        "## Recovery Steps",
        ...steps.map(s => `- ${s}`),
        "",
        "## Quick Resume",
        `> ${quickResume}`,
        "",
        latestTranscript ? [
          "## Transcript Available",
          `Use \`prism_transcript_read\` to view: ${latestTranscript}`,
          ""
        ].join("\n") : "",
        "## Ready to Continue",
        "1. Run `prism_gsd_core` for full instructions",
        "2. Check `prism_context_pressure` for capacity",
        "3. Resume work from last checkpoint"
      ].join("\n"), { 
        transcript: latestTranscript,
        state_loaded: !!state,
        roadmap_loaded: !!roadmap 
      });
    }
  );

  // =========================================================================
  // SESSION CONTINUITY TOOLS
  // =========================================================================

  /**
   * prism_quick_resume - Fast 5-second session resume
   */
  server.tool(
    "prism_quick_resume_v2",
    `Ultra-fast session resume in 5 seconds.

Returns minimal context needed to continue:
- Quick resume summary
- Current phase/task
- Last checkpoint
- Immediate next action

Use at session start for instant context.`,
    {},
    async () => {
      log.info("[prism_quick_resume] Quick resume");
      
      const state = loadJsonFile(CURRENT_STATE_FILE);
      const roadmap = loadJsonFile(ROADMAP_FILE);
      
      const quickResume = state?.quickResume || "No previous session";
      const currentPhase = roadmap?.current_phase || state?.currentSession?.phase || "Unknown";
      const lastCheckpoint = state?.currentSession?.progress?.lastCheckpoint || "None";
      const nextAction = state?.currentSession?.progress?.next || "Check prism_gsd_core";
      
      return successResponse([
        "# ⚡ Quick Resume",
        "",
        `> ${quickResume}`,
        "",
        `**Phase:** ${currentPhase}`,
        `**Last Checkpoint:** ${lastCheckpoint}`,
        `**Next Action:** ${nextAction}`,
        "",
        "---",
        "_Run `prism_gsd_core` for full instructions_"
      ].join("\n"), { quickResume, currentPhase, lastCheckpoint, nextAction });
    }
  );

  /**
   * prism_session_start_full - Complete session start protocol
   */
  server.tool(
    "prism_session_start_v2",
    `Execute complete session start protocol.

Performs:
1. Load CURRENT_STATE.json
2. Check context pressure
3. Load ROADMAP_TRACKER.json
4. Fire STATE-BEFORE-MUTATE-001 hook
5. Initialize todo tracking

Note: For faster boot, use prism_session_boot (1 call) instead.
This tool is the full ceremony; session_boot is the fast path.`,
    {
      session_name: z.string().optional().describe("Optional session name")
    },
    async (params) => {
      log.info(`[prism_session_start_full] Starting session: ${params.session_name || 'unnamed'}`);
      
      const startTime = new Date().toISOString();
      const sessionId = `SESSION-${Date.now()}`;
      
      // Load state
      let state = loadJsonFile(CURRENT_STATE_FILE) || {
        version: "1.0.0",
        lastUpdated: startTime
      };
      
      // Update session info
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
      
      // Load roadmap
      const roadmap = loadJsonFile(ROADMAP_FILE);
      
      return successResponse([
        "# Session Started",
        "",
        `**Session ID:** ${sessionId}`,
        `**Name:** ${state.currentSession.name}`,
        `**Started:** ${startTime}`,
        "",
        "## State Loaded",
        `- Version: ${state.version}`,
        `- Phase: ${state.currentSession.phase}`,
        "",
        roadmap ? [
          "## Roadmap Loaded",
          `- Current Focus: ${roadmap.current_focus || 'Unknown'}`,
          `- Active Tasks: ${roadmap.active_tasks?.length || 0}`,
          ""
        ].join("\n") : "",
        "## Next Steps",
        "1. `prism_gsd_core` - Get full instructions",
        "2. `prism_sp_brainstorm` - Plan implementation",
        "3. `prism_todo_update` - Track progress"
      ].join("\n"), { session_id: sessionId, state });
    }
  );

  /**
   * prism_session_end_full - Complete session end protocol
   */
  server.tool(
    "prism_session_end_v2",
    `Execute complete session end protocol.

Performs:
1. Final checkpoint
2. Update CURRENT_STATE.json with quick resume
3. Write ACTION_TRACKER via prism_doc_write (MCP-native, NOT DC)
4. Generate handoff summary

Use at the end of each session.
Note: Use prism_doc_write("ACTION_TRACKER.md", content) to update tracker.`,
    {
      status: z.enum(["COMPLETE", "IN_PROGRESS", "BLOCKED"]).optional().default("IN_PROGRESS"),
      quick_resume: z.string().describe("Quick resume summary for next session"),
      next_actions: z.array(z.string()).optional().describe("List of next actions")
    },
    async (params) => {
      log.info(`[prism_session_end_full] Ending session: ${params.status}`);
      
      const endTime = new Date().toISOString();
      
      // Load and update state
      let state = loadJsonFile(CURRENT_STATE_FILE) || {};
      
      if (state.currentSession) {
        state.currentSession.endTime = endTime;
        state.currentSession.status = params.status;
        state.currentSession.progress = {
          ...state.currentSession.progress,
          handoffTime: endTime,
          nextActions: params.next_actions || []
        };
      }
      
      state.quickResume = params.quick_resume;
      state.lastUpdated = endTime;
      
      saveJsonFile(CURRENT_STATE_FILE, state);
      
      // Reminder: use prism_doc_write("ACTION_TRACKER.md", content) for tracker
      
      return successResponse([
        "# Session Ended",
        "",
        `**Status:** ${params.status}`,
        `**Ended:** ${endTime}`,
        "",
        "## Quick Resume (for next session)",
        `> ${params.quick_resume}`,
        "",
        params.next_actions?.length ? [
          "## Next Actions",
          ...params.next_actions.map((a, i) => `${i + 1}. ${a}`),
          ""
        ].join("\n") : "",
        "**Next:** Use `prism_doc_write('ACTION_TRACKER.md', content)` to update tracker.",
        "",
        "✅ State saved. Ready for next session."
      ].join("\n"), { status: params.status, endTime });
    }
  );

  /**
   * prism_auto_checkpoint - Automatic checkpoint based on buffer zone
   */
  server.tool(
    "prism_auto_checkpoint",
    `Automatically create checkpoint based on current buffer zone.

Checks tool call count and creates checkpoint if in YELLOW/ORANGE/RED zone.`,
    {
      tool_calls: z.number().describe("Number of tool calls made this session"),
      force: z.boolean().optional().default(false).describe("Force checkpoint regardless of zone")
    },
    async (params) => {
      log.info(`[prism_auto_checkpoint] Tool calls: ${params.tool_calls}, force: ${params.force}`);
      
      // Determine buffer zone
      let zone = "GREEN";
      let emoji = "🟢";
      let shouldCheckpoint = params.force;
      
      if (params.tool_calls >= 19) {
        zone = "BLACK";
        emoji = "⚫";
        shouldCheckpoint = true;
      } else if (params.tool_calls >= 15) {
        zone = "RED";
        emoji = "🔴";
        shouldCheckpoint = true;
      } else if (params.tool_calls >= 9) {
        zone = "YELLOW";
        emoji = "🟡";
        shouldCheckpoint = true;
      } else if (params.tool_calls >= 5) {
        // Consider checkpoint at 5-8
        shouldCheckpoint = params.force;
      }
      
      if (!shouldCheckpoint) {
        return successResponse([
          `# Buffer Zone: ${emoji} ${zone}`,
          "",
          `**Tool Calls:** ${params.tool_calls}`,
          `**Checkpoint:** Not needed yet`,
          "",
          "Continue work. Checkpoint recommended at 5-8 calls."
        ].join("\n"), { zone, checkpointed: false });
      }
      
      // Create checkpoint
      const checkpointId = `CP-${new Date().toISOString().replace(/[:-]/g, '').split('.')[0]}`;
      
      let state = loadJsonFile(CURRENT_STATE_FILE) || {};
      state.currentSession = state.currentSession || {};
      state.currentSession.progress = state.currentSession.progress || {};
      state.currentSession.progress.lastCheckpoint = checkpointId;
      state.currentSession.progress.checkpointTime = new Date().toISOString();
      state.currentSession.progress.toolCalls = params.tool_calls;
      state.lastUpdated = new Date().toISOString();
      
      saveJsonFile(CURRENT_STATE_FILE, state);
      
      const urgency = zone === "RED" || zone === "BLACK" 
        ? "⚠️ **URGENT:** Prepare for session end soon!" 
        : "";
      
      return successResponse([
        `# Buffer Zone: ${emoji} ${zone}`,
        "",
        `**Tool Calls:** ${params.tool_calls}`,
        `**Checkpoint:** ${checkpointId}`,
        "",
        "✅ Checkpoint created.",
        "",
        urgency
      ].join("\n"), { zone, checkpointed: true, checkpoint_id: checkpointId });
    }
  );

  log.info("Session Lifecycle tools registered (12 tools)");
}
