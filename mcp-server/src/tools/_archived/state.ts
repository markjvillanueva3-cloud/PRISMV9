/**
 * PRISM MCP Server - State Tools
 * Session state management, checkpoints, and handoffs
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  StateSaveInputSchema,
  CheckpointInputSchema,
  HandoffInputSchema
} from "../schemas.js";
import { PATHS } from "../constants.js";
import { readJsonFile, writeJsonFile, fileExists } from "../utils/files.js";
import { successResponse } from "../utils/formatters.js";
import { withErrorHandling, FileSystemError } from "../utils/errors.js";
import { log } from "../utils/Logger.js";
import type { SessionState } from "../types.js";

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

async function loadCurrentState(): Promise<SessionState> {
  if (await fileExists(PATHS.STATE_FILE)) {
    return await readJsonFile<SessionState>(PATHS.STATE_FILE);
  }
  
  // Return default state
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

async function saveCurrentState(state: SessionState): Promise<void> {
  state.lastUpdated = new Date().toISOString();
  await writeJsonFile(PATHS.STATE_FILE, state);
}

/**
 * Register all state tools with the MCP server
 */
export function registerStateTools(server: McpServer): void {

  server.registerTool(
    "prism_state_load",
    {
      title: "Load Session State",
      description: `Load the current PRISM session state.

Returns the CURRENT_STATE.json which tracks:
- Current session ID and status
- Phase and session number
- Progress tracking
- Quick resume information

Use at session start to understand context.

Returns:
  Current session state with quickResume summary.`,
      inputSchema: z.object({}).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    withErrorHandling("prism_state_load", async () => {
      log.tool("prism_state_load", "Loading state");
      
      const state = await loadCurrentState();
      
      const text = [
        "# PRISM Session State",
        "",
        `**Version:** ${state.version}`,
        `**Last Updated:** ${state.lastUpdated}`,
        "",
        "## Current Session",
        `- **ID:** ${state.currentSession.id}`,
        `- **Status:** ${state.currentSession.status}`,
        `- **Phase:** ${state.currentSession.phase}`,
        `- **Session:** ${state.currentSession.sessionNumber}`,
        "",
        "## Quick Resume",
        state.quickResume,
        "",
        `_State file: ${PATHS.STATE_FILE}_`
      ].join("\n");
      
      return successResponse(text, { success: true, state });
    })
  );

  server.registerTool(
    "prism_state_save",
    {
      title: "Save Session State",
      description: `Save session state to CURRENT_STATE.json.

Persists state for session continuity across context compactions.
CRITICAL: Always save state before ending a session.

Args:
  - state (object): State object to save
  - path (string, optional): Custom path (default: CURRENT_STATE.json)

Returns:
  Confirmation of saved state.`,
      inputSchema: StateSaveInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    withErrorHandling("prism_state_save", async (params) => {
      log.tool("prism_state_save", "Saving state");
      
      const state = params.state as SessionState;
      state.lastUpdated = new Date().toISOString();
      
      const savePath = params.path || PATHS.STATE_FILE;
      await writeJsonFile(savePath, state);
      
      return successResponse(
        `State saved successfully to ${savePath}`,
        { success: true, path: savePath, timestamp: state.lastUpdated }
      );
    })
  );

  server.registerTool(
    "prism_state_checkpoint",
    {
      title: "Create Checkpoint",
      description: `Create a progress checkpoint in the session state.

Checkpoints track progress through micro-sessions:
- Number of items completed
- Next item to process
- Timestamp for recovery

Best practice: Checkpoint every 5-8 items.

Args:
  - completed (number): Number of items completed
  - next (string): Description of next item to process

Returns:
  Updated state with checkpoint.`,
      inputSchema: CheckpointInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    withErrorHandling("prism_state_checkpoint", async (params) => {
      log.tool("prism_state_checkpoint", `Checkpoint: ${params.completed} done, next: ${params.next}`);
      
      const state = await loadCurrentState();
      
      // Update progress
      state.currentSession.progress = {
        ...state.currentSession.progress,
        completed: params.completed,
        next: params.next,
        lastCheckpoint: new Date().toISOString()
      };
      
      state.quickResume = `Checkpoint: ${params.completed} items done. Next: ${params.next}`;
      
      await saveCurrentState(state);
      
      return successResponse(
        `✓ Checkpoint saved: ${params.completed} completed, next: "${params.next}"`,
        { success: true, completed: params.completed, next: params.next }
      );
    })
  );

  server.registerTool(
    "prism_state_diff",
    {
      title: "Compare State",
      description: `Compare current state with a previous version.

Useful for:
- Detecting changes since last session
- Verifying state consistency
- Debugging state issues

Args:
  - previous_path (string, optional): Path to previous state file

Returns:
  Diff of state changes.`,
      inputSchema: z.object({
        previous_path: z.string().optional().describe("Path to previous state file")
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    withErrorHandling("prism_state_diff", async (params) => {
      log.tool("prism_state_diff", "Comparing states");
      
      const current = await loadCurrentState();
      
      // If no previous provided, just show current
      if (!params.previous_path) {
        return successResponse(
          `Current state version: ${current.version}\nLast updated: ${current.lastUpdated}\nNo previous state provided for comparison.`,
          { success: true, current }
        );
      }
      
      if (!await fileExists(params.previous_path)) {
        return successResponse(
          `Previous state file not found: ${params.previous_path}`,
          { success: false, error: "File not found" }
        );
      }
      
      const previous = await readJsonFile<SessionState>(params.previous_path);
      
      const changes: string[] = [];
      if (current.version !== previous.version) {
        changes.push(`Version: ${previous.version} → ${current.version}`);
      }
      if (current.currentSession.status !== previous.currentSession?.status) {
        changes.push(`Status: ${previous.currentSession?.status} → ${current.currentSession.status}`);
      }
      if (current.currentSession.phase !== previous.currentSession?.phase) {
        changes.push(`Phase: ${previous.currentSession?.phase} → ${current.currentSession.phase}`);
      }
      
      const text = [
        "# State Comparison",
        "",
        `**Current:** ${current.lastUpdated}`,
        `**Previous:** ${previous.lastUpdated}`,
        "",
        "## Changes",
        changes.length ? changes.map(c => `- ${c}`).join("\n") : "No significant changes detected."
      ].join("\n");
      
      return successResponse(text, { success: true, changes });
    })
  );

  server.registerTool(
    "prism_handoff_prepare",
    {
      title: "Prepare Handoff",
      description: `Prepare session state for handoff to next session or context.

Creates comprehensive handoff package with:
- Current state summary
- Progress checkpoint
- Next actions list
- Quick resume text

Use at end of session or before context compaction.

Args:
  - status (string): COMPLETE, IN_PROGRESS, or BLOCKED
  - next_actions (string[], optional): List of next actions

Returns:
  Handoff package ready for next session.`,
      inputSchema: HandoffInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    withErrorHandling("prism_handoff_prepare", async (params) => {
      log.tool("prism_handoff_prepare", `Preparing handoff: ${params.status}`);
      
      const state = await loadCurrentState();
      
      // Update state with handoff info
      state.currentSession.status = params.status as "COMPLETE" | "IN_PROGRESS" | "BLOCKED";
      
      const nextActions = params.next_actions || [];
      
      state.quickResume = [
        `Status: ${params.status}`,
        `Phase: ${state.currentSession.phase}`,
        `Session: ${state.currentSession.sessionNumber}`,
        nextActions.length ? `Next: ${nextActions[0]}` : ""
      ].filter(Boolean).join(" | ");
      
      state.currentSession.progress = {
        ...state.currentSession.progress,
        handoffTime: new Date().toISOString(),
        nextActions
      };
      
      await saveCurrentState(state);
      
      const text = [
        "# Session Handoff Prepared",
        "",
        `**Status:** ${params.status}`,
        `**Timestamp:** ${state.lastUpdated}`,
        "",
        "## Quick Resume",
        `> ${state.quickResume}`,
        "",
        nextActions.length ? [
          "## Next Actions",
          ...nextActions.map((a, i) => `${i + 1}. ${a}`)
        ].join("\n") : "",
        "",
        "State saved. Ready for next session."
      ].filter(Boolean).join("\n");
      
      return successResponse(text, {
        success: true,
        status: params.status,
        quickResume: state.quickResume,
        nextActions
      });
    })
  );

  server.registerTool(
    "prism_resume_session",
    {
      title: "Resume Session",
      description: `Resume a PRISM session from saved state.

Loads state and provides context for continuing work:
- Shows quick resume summary
- Lists pending actions
- Provides session context

Use at start of new session to restore context.

Returns:
  Session context for continuation.`,
      inputSchema: z.object({}).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    withErrorHandling("prism_resume_session", async () => {
      log.tool("prism_resume_session", "Resuming session");
      
      const state = await loadCurrentState();
      const progress = state.currentSession.progress as Record<string, unknown>;
      const nextActions = (progress?.nextActions as string[]) || [];
      
      const text = [
        "# Session Resume",
        "",
        "## Quick Resume",
        `> ${state.quickResume}`,
        "",
        "## Session Details",
        `- **ID:** ${state.currentSession.id}`,
        `- **Status:** ${state.currentSession.status}`,
        `- **Phase:** ${state.currentSession.phase}`,
        `- **Session:** ${state.currentSession.sessionNumber}`,
        "",
        progress?.completed ? `**Progress:** ${progress.completed} items completed` : "",
        progress?.next ? `**Next Item:** ${progress.next}` : "",
        "",
        nextActions.length ? [
          "## Pending Actions",
          ...nextActions.map((a, i) => `${i + 1}. ${a}`)
        ].join("\n") : "",
        "",
        state.currentSession.status === "IN_PROGRESS" 
          ? "Session is IN_PROGRESS. Continue from last checkpoint."
          : state.currentSession.status === "BLOCKED"
            ? "⚠️ Session is BLOCKED. Review blockers before continuing."
            : "✓ Previous session COMPLETE. Ready for new work."
      ].filter(Boolean).join("\n");
      
      return successResponse(text, { success: true, state });
    })
  );

  server.registerTool(
    "prism_memory_save",
    {
      title: "Save to Memory",
      description: `Save key information to session memory for persistence.

Memory is stored in SESSION_MEMORY.json and survives context compaction.
Use for important context that should persist.

Args:
  - key (string): Memory key
  - value (any): Value to store
  - category (string, optional): Category for organization

Returns:
  Confirmation of saved memory.`,
      inputSchema: z.object({
        key: z.string().min(1).describe("Memory key"),
        value: z.unknown().describe("Value to store"),
        category: z.string().optional().describe("Category for organization")
      }).strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    withErrorHandling("prism_memory_save", async (params) => {
      log.tool("prism_memory_save", `Saving: ${params.key}`);
      
      let memory: Record<string, unknown> = {};
      
      if (await fileExists(PATHS.SESSION_MEMORY)) {
        memory = await readJsonFile<Record<string, unknown>>(PATHS.SESSION_MEMORY);
      }
      
      const category = params.category || "general";
      if (!memory[category]) {
        memory[category] = {};
      }
      (memory[category] as Record<string, unknown>)[params.key] = {
        value: params.value,
        timestamp: new Date().toISOString()
      };
      
      await writeJsonFile(PATHS.SESSION_MEMORY, memory);
      
      return successResponse(
        `Memory saved: ${params.key} (${category})`,
        { success: true, key: params.key, category }
      );
    })
  );

  server.registerTool(
    "prism_memory_recall",
    {
      title: "Recall from Memory",
      description: `Recall information from session memory.

Args:
  - key (string, optional): Specific key to recall
  - category (string, optional): Category to list

Returns:
  Stored memory value(s).`,
      inputSchema: z.object({
        key: z.string().optional().describe("Specific key to recall"),
        category: z.string().optional().describe("Category to list")
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    withErrorHandling("prism_memory_recall", async (params) => {
      log.tool("prism_memory_recall", `Recalling: ${params.key || "all"}`);
      
      if (!await fileExists(PATHS.SESSION_MEMORY)) {
        return successResponse(
          "No session memory found.",
          { success: true, memory: {} }
        );
      }
      
      const memory = await readJsonFile<Record<string, unknown>>(PATHS.SESSION_MEMORY);
      
      if (params.key && params.category) {
        const categoryMem = memory[params.category] as Record<string, unknown>;
        const value = categoryMem?.[params.key];
        return successResponse(
          value ? JSON.stringify(value, null, 2) : `Key not found: ${params.key}`,
          { success: !!value, value }
        );
      }
      
      if (params.category) {
        const categoryMem = memory[params.category];
        return successResponse(
          JSON.stringify(categoryMem || {}, null, 2),
          { success: true, category: params.category, memory: categoryMem }
        );
      }
      
      // Return all categories
      const categories = Object.keys(memory);
      const text = [
        "# Session Memory",
        "",
        `**Categories:** ${categories.join(", ") || "none"}`,
        "",
        ...categories.map(cat => {
          const items = memory[cat] as Record<string, unknown>;
          return `## ${cat}\n${Object.keys(items).map(k => `- ${k}`).join("\n")}`;
        })
      ].join("\n");
      
      return successResponse(text, { success: true, categories, memory });
    })
  );

  log.debug("State tools registered");
}
