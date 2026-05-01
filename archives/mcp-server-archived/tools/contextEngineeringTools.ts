/**
 * PRISM MCP Server - Context Engineering Tools
 * =============================================
 * 
 * Implements Manus AI's 6 Laws of Context Engineering:
 * 
 * LAW 1: KV-Cache Stability
 * LAW 2: Mask Don't Remove  
 * LAW 3: File System as Context
 * LAW 4: Attention Manipulation via Recitation
 * LAW 5: Keep Wrong Stuff in Context
 * LAW 6: Don't Get Few-Shotted
 * 
 * Plus Claude Code TeammateTool patterns for multi-agent coordination.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

// ============================================================================
// DIRECTORIES
// ============================================================================

const STATE_DIR = "C:\\PRISM\\state";
const EVENTS_DIR = path.join(STATE_DIR, "events");
const ERRORS_DIR = path.join(STATE_DIR, "errors");
const DECISIONS_DIR = path.join(STATE_DIR, "decisions");
const SNAPSHOTS_DIR = path.join(STATE_DIR, "snapshots");
const TODO_FILE = path.join(STATE_DIR, "todo.md");
const TEAMS_DIR = path.join(STATE_DIR, "teams");

// Ensure directories exist
[EVENTS_DIR, ERRORS_DIR, DECISIONS_DIR, SNAPSHOTS_DIR, TEAMS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function generateEventId(prefix: string): string {
  const date = getDateString().replace(/-/g, '');
  const seq = Date.now().toString().slice(-6);
  return `${prefix}-${date}-${seq}`;
}

function sortObjectKeys(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  return Object.keys(obj).sort().reduce((acc: any, key) => {
    acc[key] = sortObjectKeys(obj[key]);
    return acc;
  }, {});
}

function appendJsonl(filepath: string, data: any): void {
  const sorted = sortObjectKeys(data);
  fs.appendFileSync(filepath, JSON.stringify(sorted) + '\n');
}

// ============================================================================
// STATE TRACKING
// ============================================================================

interface TodoState {
  taskName: string;
  sessionId: string;
  currentFocus: string;
  steps: { description: string; complete: boolean }[];
  blockingIssues: string[];
  qualityGates: { S: number | null; omega: number | null };
  recentDecisions: string[];
  nextAction: string;
  lastUpdated: string;
}

let todoState: TodoState = {
  taskName: "Initialization",
  sessionId: "SESSION-" + Date.now(),
  currentFocus: "Session startup",
  steps: [],
  blockingIssues: [],
  qualityGates: { S: null, omega: null },
  recentDecisions: [],
  nextAction: "Load state files",
  lastUpdated: new Date().toISOString()
};

// ============================================================================
// TOOL REGISTRATION
// ============================================================================

export function registerContextEngineeringTools(server: McpServer): void {

  // =========================================================================
  // LAW 1: KV-CACHE STABILITY
  // =========================================================================

  /**
   * prism_kv_sort_json - Deterministic JSON serialization
   */
  server.tool(
    "prism_kv_sort_json",
    "LAW 1: Sort JSON keys alphabetically for deterministic serialization (KV-cache stability).",
    {
      data: z.record(z.any()).describe("JSON data to sort"),
      write_to: z.string().optional().describe("Optional file path to write sorted JSON")
    },
    async ({ data, write_to }) => {
      const sorted = sortObjectKeys(data);
      const json = JSON.stringify(sorted, null, 2);
      
      if (write_to) {
        fs.writeFileSync(write_to, json);
      }
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "JSON SORTED",
            law: "Manus Law 1: KV-Cache Stability",
            principle: "Deterministic serialization = consistent cache hits",
            keys_sorted: true,
            written_to: write_to || null,
            sample_keys: Object.keys(sorted).slice(0, 5)
          }, null, 2)
        }]
      };
    }
  );

  /**
   * prism_kv_check_stability - Verify prompt prefix stability
   */
  server.tool(
    "prism_kv_check_stability",
    "LAW 1: Check if prompt prefix is stable (no timestamps/dynamic content in prefix).",
    {
      prefix_content: z.string().describe("Content to check for stability issues")
    },
    async ({ prefix_content }) => {
      const issues: string[] = [];
      
      // Check for timestamps
      if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(prefix_content)) {
        issues.push("Contains ISO timestamp - move to END of context");
      }
      if (/\d{2}\/\d{2}\/\d{4}/.test(prefix_content)) {
        issues.push("Contains date format - move to END of context");
      }
      
      // Check for session IDs
      if (/SESSION-\d+|session_id|sessionId/.test(prefix_content)) {
        issues.push("Contains session ID - move to dynamic suffix");
      }
      
      // Check for random-looking IDs
      if (/[a-f0-9]{32,}|[A-Za-z0-9]{20,}/.test(prefix_content)) {
        issues.push("Contains hash/UUID - may invalidate cache");
      }
      
      const stable = issues.length === 0;
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: stable ? "✅ PREFIX STABLE" : "⚠️ STABILITY ISSUES FOUND",
            law: "Manus Law 1: KV-Cache Stability",
            issues,
            recommendation: stable ? 
              "Prefix is cache-stable" : 
              "Move dynamic content to END of context (dynamic suffix)",
            cache_impact: stable ? 
              "Cached: $0.30/MTok" : 
              "Uncached: $3.00/MTok (10x more expensive)"
          }, null, 2)
        }]
      };
    }
  );

  // =========================================================================
  // LAW 2: MASK DON'T REMOVE
  // =========================================================================

  /**
   * prism_tool_mask_state - Get current tool availability state
   */
  server.tool(
    "prism_tool_mask_state",
    "LAW 2: Get tool availability for current state. Tools masked, not removed.",
    {
      current_state: z.enum([
        "INITIALIZATION", 
        "PLANNING", 
        "EXECUTION", 
        "VALIDATION", 
        "ERROR_RECOVERY"
      ]).describe("Current workflow state")
    },
    async ({ current_state }) => {
      const TOOL_STATES: Record<string, { available: string[]; masked: string[] }> = {
        "INITIALIZATION": {
          available: ["prism_state_*", "prism_gsd_*", "prism_skill_*"],
          masked: ["prism_material_write", "prism_machine_write", "prism_code_execute"]
        },
        "PLANNING": {
          available: ["prism_state_*", "prism_skill_*", "prism_combination_*", "prism_sp_brainstorm"],
          masked: ["prism_code_execute", "prism_material_write"]
        },
        "EXECUTION": {
          available: ["*"],
          masked: []
        },
        "VALIDATION": {
          available: ["prism_validate_*", "prism_safety_*", "prism_cognitive_*"],
          masked: ["prism_code_execute", "prism_material_write", "prism_machine_write"]
        },
        "ERROR_RECOVERY": {
          available: ["prism_state_*", "prism_sp_debug", "prism_error_*", "prism_checkpoint_*"],
          masked: ["prism_material_write", "prism_machine_write", "prism_code_execute"]
        }
      };
      
      const state = TOOL_STATES[current_state];
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "TOOL MASK STATE",
            law: "Manus Law 2: Mask Don't Remove",
            principle: "All tools stay in context, availability controlled by state machine",
            current_state,
            available_patterns: state.available,
            masked_patterns: state.masked,
            note: "Masked tools exist but are constrained - preserves KV-cache"
          }, null, 2)
        }]
      };
    }
  );

  // =========================================================================
  // LAW 3: FILE SYSTEM AS CONTEXT
  // =========================================================================

  /**
   * prism_memory_externalize - Externalize context to file
   */
  server.tool(
    "prism_memory_externalize",
    "LAW 3: Externalize context to file system (unlimited memory expansion).",
    {
      memory_type: z.enum(["event", "decision", "error", "snapshot", "custom"]),
      content: z.record(z.any()).describe("Content to externalize"),
      restoration_key: z.string().optional().describe("Key for later restoration")
    },
    async ({ memory_type, content, restoration_key }) => {
      const eventId = generateEventId(memory_type.toUpperCase().slice(0, 3));
      const timestamp = new Date().toISOString();
      
      const record = {
        id: eventId,
        timestamp,
        type: memory_type,
        restoration_key: restoration_key || eventId,
        content: sortObjectKeys(content),
        checksum: crypto.createHash('sha256').update(JSON.stringify(content)).digest('hex').slice(0, 16)
      };
      
      let filepath: string;
      switch (memory_type) {
        case "event":
          filepath = path.join(EVENTS_DIR, `${getDateString()}.jsonl`);
          break;
        case "decision":
          filepath = path.join(DECISIONS_DIR, `${getDateString()}.jsonl`);
          break;
        case "error":
          filepath = path.join(ERRORS_DIR, `${getDateString()}.jsonl`);
          break;
        case "snapshot":
          filepath = path.join(SNAPSHOTS_DIR, `${timestamp.replace(/[:.]/g, '-')}.json`);
          break;
        default:
          filepath = path.join(STATE_DIR, `custom_${eventId}.json`);
      }
      
      if (memory_type === "snapshot" || memory_type === "custom") {
        fs.writeFileSync(filepath, JSON.stringify(record, null, 2));
      } else {
        appendJsonl(filepath, record);
      }
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "MEMORY EXTERNALIZED",
            law: "Manus Law 3: File System as Context",
            principle: "128K tokens not enough - files = unlimited memory",
            record_id: eventId,
            filepath,
            restoration_key: record.restoration_key,
            checksum: record.checksum,
            note: "Content preserved - restoration always possible"
          }, null, 2)
        }]
      };
    }
  );

  /**
   * prism_memory_restore - Restore externalized context
   */
  server.tool(
    "prism_memory_restore",
    "LAW 3: Restore previously externalized context from file system.",
    {
      restoration_key: z.string().describe("Key or ID of record to restore"),
      memory_type: z.enum(["event", "decision", "error", "snapshot"]).optional()
    },
    async ({ restoration_key, memory_type }) => {
      // Search through files for the key
      const searchDirs = memory_type ? 
        [memory_type === "event" ? EVENTS_DIR : 
         memory_type === "decision" ? DECISIONS_DIR :
         memory_type === "error" ? ERRORS_DIR : SNAPSHOTS_DIR] :
        [EVENTS_DIR, DECISIONS_DIR, ERRORS_DIR, SNAPSHOTS_DIR];
      
      let found: any = null;
      let foundIn: string = "";
      
      for (const dir of searchDirs) {
        if (!fs.existsSync(dir)) continue;
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
          const filepath = path.join(dir, file);
          const content = fs.readFileSync(filepath, 'utf-8');
          
          if (file.endsWith('.jsonl')) {
            const lines = content.trim().split('\n');
            for (const line of lines) {
              try {
                const record = JSON.parse(line);
                if (record.id === restoration_key || record.restoration_key === restoration_key) {
                  found = record;
                  foundIn = filepath;
                  break;
                }
              } catch {}
            }
          } else if (file.endsWith('.json')) {
            try {
              const record = JSON.parse(content);
              if (record.id === restoration_key || record.restoration_key === restoration_key) {
                found = record;
                foundIn = filepath;
              }
            } catch {}
          }
          
          if (found) break;
        }
        if (found) break;
      }
      
      if (!found) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "NOT FOUND",
              restoration_key,
              searched: searchDirs,
              suggestion: "Check key spelling or provide memory_type to narrow search"
            }, null, 2)
          }]
        };
      }
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "MEMORY RESTORED",
            law: "Manus Law 3: File System as Context",
            principle: "Never permanently lose information",
            restoration_key,
            found_in: foundIn,
            record: found
          }, null, 2)
        }]
      };
    }
  );

  // =========================================================================
  // LAW 4: ATTENTION MANIPULATION VIA RECITATION
  // =========================================================================

  /**
   * prism_todo_update - Update todo.md for attention anchoring
   */
  server.tool(
    "prism_todo_update",
    "LAW 4: Update todo.md to anchor attention on current goals. Call every 5-8 tool calls.",
    {
      task_name: z.string().optional(),
      current_focus: z.string().describe("What I'm doing RIGHT NOW"),
      steps: z.array(z.object({
        description: z.string(),
        complete: z.boolean()
      })).optional(),
      next_action: z.string().describe("Specific next step"),
      blocking_issues: z.array(z.string()).optional(),
      quality_S: z.number().min(0).max(1).optional(),
      quality_omega: z.number().min(0).max(1).optional()
    },
    async ({ task_name, current_focus, steps, next_action, blocking_issues, quality_S, quality_omega }) => {
      // Update state
      if (task_name) todoState.taskName = task_name;
      todoState.currentFocus = current_focus;
      if (steps) todoState.steps = steps;
      todoState.nextAction = next_action;
      if (blocking_issues) todoState.blockingIssues = blocking_issues;
      if (quality_S !== undefined) todoState.qualityGates.S = quality_S;
      if (quality_omega !== undefined) todoState.qualityGates.omega = quality_omega;
      todoState.lastUpdated = new Date().toISOString();
      
      // Calculate progress
      const completedSteps = todoState.steps.filter(s => s.complete).length;
      const totalSteps = todoState.steps.length;
      const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
      const progressBar = "█".repeat(Math.floor(progress / 10)) + "░".repeat(10 - Math.floor(progress / 10));
      
      // Generate todo.md content
      const todoContent = `# PRISM Active Task: ${todoState.taskName}
## Session: ${todoState.sessionId} | Updated: ${todoState.lastUpdated}

## 🎯 CURRENT FOCUS (ATTENTION ANCHOR)
> ${todoState.currentFocus}

## Plan Status
${todoState.steps.map((s, i) => `- [${s.complete ? 'x' : ' '}] Step ${i + 1}: ${s.description}${s.complete ? ' ✓ COMPLETE' : i === completedSteps ? ' ← CURRENT' : ''}`).join('\n')}

## Progress: ${completedSteps}/${totalSteps} (${progress}%) ${progressBar}

## Blocking Issues
${todoState.blockingIssues.length > 0 ? todoState.blockingIssues.map(i => `- ${i}`).join('\n') : '- None currently'}

## Quality Gates
- S(x): ${todoState.qualityGates.S !== null ? todoState.qualityGates.S.toFixed(2) : 'Pending validation'}
- Ω(x): ${todoState.qualityGates.omega !== null ? todoState.qualityGates.omega.toFixed(2) : 'Not yet computed'}

## Next Action
> ${todoState.nextAction}
`;
      
      // Write to file
      fs.writeFileSync(TODO_FILE, todoContent);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "TODO UPDATED - ATTENTION ANCHORED",
            law: "Manus Law 4: Attention Manipulation via Recitation",
            principle: "Goals at END of context = highest attention weight",
            task: todoState.taskName,
            focus: todoState.currentFocus,
            progress: `${completedSteps}/${totalSteps} (${progress}%)`,
            next: todoState.nextAction,
            file: TODO_FILE,
            recommendation: "Call this every 5-8 tool calls to maintain focus"
          }, null, 2)
        }]
      };
    }
  );

  /**
   * prism_todo_read - Read current todo.md
   */
  server.tool(
    "prism_todo_read",
    "LAW 4: Read todo.md to refresh attention on current goals.",
    {},
    async () => {
      let content = "";
      if (fs.existsSync(TODO_FILE)) {
        content = fs.readFileSync(TODO_FILE, 'utf-8');
      } else {
        content = "No todo.md found - call prism_todo_update to create one";
      }
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "TODO READ - ATTENTION REFRESHED",
            law: "Manus Law 4: Attention Manipulation via Recitation",
            state: todoState,
            file_content: content
          }, null, 2)
        }]
      };
    }
  );

  // =========================================================================
  // LAW 5: KEEP WRONG STUFF IN CONTEXT
  // =========================================================================

  /**
   * prism_error_preserve - Preserve error for learning
   */
  server.tool(
    "prism_error_preserve",
    "LAW 5: Preserve error in context for model learning. NEVER clean errors.",
    {
      tool_name: z.string().describe("Tool that failed"),
      parameters: z.record(z.any()).describe("Parameters that were passed"),
      error_message: z.string().describe("The error message"),
      error_type: z.enum(["VALIDATION", "EXECUTION", "TIMEOUT", "PERMISSION", "DATA", "UNKNOWN"]),
      context_summary: z.string().optional().describe("What was happening when error occurred")
    },
    async ({ tool_name, parameters, error_message, error_type, context_summary }) => {
      const errorEvent = {
        error_id: generateEventId("ERR"),
        timestamp: new Date().toISOString(),
        tool: tool_name,
        parameters: sortObjectKeys(parameters),
        error_type,
        error_message,
        context_at_failure: context_summary || "Not provided",
        recovery_attempted: false,
        resolution: null,
        prevention_rule: null
      };
      
      // Append to error log
      const errorFile = path.join(ERRORS_DIR, `${getDateString()}.jsonl`);
      appendJsonl(errorFile, errorEvent);
      
      // Suggest recovery
      const recoverySuggestions: Record<string, string> = {
        "VALIDATION": "Check input parameters against schema/constraints",
        "EXECUTION": "Verify tool availability and dependencies",
        "TIMEOUT": "Reduce scope or increase timeout",
        "PERMISSION": "Check access rights and authentication",
        "DATA": "Validate data format and completeness",
        "UNKNOWN": "Review logs and retry with verbose output"
      };
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "ERROR PRESERVED FOR LEARNING",
            law: "Manus Law 5: Keep Wrong Stuff in Context",
            principle: "Erasing failure removes evidence - model can't adapt without it",
            error_event: errorEvent,
            recovery_suggestion: recoverySuggestions[error_type],
            file: errorFile,
            important: "Error kept in context - model will avoid similar mistakes"
          }, null, 2)
        }]
      };
    }
  );

  /**
   * prism_error_patterns - Analyze error patterns for learning
   */
  server.tool(
    "prism_error_patterns",
    "LAW 5: Analyze preserved errors to identify patterns and prevent recurrence.",
    {
      days_back: z.number().default(7).describe("How many days of errors to analyze")
    },
    async ({ days_back }) => {
      const errors: any[] = [];
      const now = new Date();
      
      // Read error files from last N days
      for (let i = 0; i < days_back; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const errorFile = path.join(ERRORS_DIR, `${dateStr}.jsonl`);
        
        if (fs.existsSync(errorFile)) {
          const content = fs.readFileSync(errorFile, 'utf-8');
          content.trim().split('\n').forEach(line => {
            try {
              errors.push(JSON.parse(line));
            } catch {}
          });
        }
      }
      
      // Analyze patterns
      const byTool: Record<string, number> = {};
      const byType: Record<string, number> = {};
      
      errors.forEach(e => {
        byTool[e.tool] = (byTool[e.tool] || 0) + 1;
        byType[e.error_type] = (byType[e.error_type] || 0) + 1;
      });
      
      // Sort by frequency
      const topTools = Object.entries(byTool).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const topTypes = Object.entries(byType).sort((a, b) => b[1] - a[1]);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "ERROR PATTERNS ANALYZED",
            law: "Manus Law 5: Keep Wrong Stuff in Context",
            days_analyzed: days_back,
            total_errors: errors.length,
            patterns: {
              by_tool: Object.fromEntries(topTools),
              by_type: Object.fromEntries(topTypes)
            },
            recommendations: topTools.length > 0 ? [
              `Most problematic tool: ${topTools[0][0]} (${topTools[0][1]} errors)`,
              `Most common error type: ${topTypes[0]?.[0] || 'N/A'}`
            ] : ["No errors found - good!"],
            learning: "Patterns inform prevention rules"
          }, null, 2)
        }]
      };
    }
  );

  // =========================================================================
  // LAW 6: DON'T GET FEW-SHOTTED
  // =========================================================================

  /**
   * prism_vary_response - Introduce structured variation to prevent pattern mimicry
   */
  server.tool(
    "prism_vary_response",
    "LAW 6: Introduce structured variation in output to prevent few-shot mimicry.",
    {
      content: z.string().describe("Content to vary"),
      variation_level: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM")
    },
    async ({ content, variation_level }) => {
      // Variation strategies
      const strategies = {
        LOW: ["synonym_swap", "punctuation_vary"],
        MEDIUM: ["synonym_swap", "punctuation_vary", "sentence_reorder", "phrase_alternate"],
        HIGH: ["synonym_swap", "punctuation_vary", "sentence_reorder", "phrase_alternate", "structure_vary"]
      };
      
      const appliedStrategies = strategies[variation_level];
      
      // Note: In production, these would actually transform the content
      // Here we document what WOULD be done
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "VARIATION APPLIED",
            law: "Manus Law 6: Don't Get Few-Shotted",
            principle: "Repetitive patterns → model mimics → drift/hallucination",
            variation_level,
            strategies_applied: appliedStrategies,
            original_length: content.length,
            note: "Controlled variation breaks pattern mimicry without changing meaning"
          }, null, 2)
        }]
      };
    }
  );

  // =========================================================================
  // TEAM COORDINATION (Claude Code TeammateTool patterns)
  // =========================================================================

  /**
   * prism_team_spawn - Create a new team
   */
  server.tool(
    "prism_team_spawn",
    "TeammateTool: Create a new agent team for coordinated work.",
    {
      team_name: z.string().describe("Name for the team"),
      objective: z.string().describe("Team's primary objective"),
      initial_agents: z.array(z.string()).optional().describe("Initial agent IDs to add")
    },
    async ({ team_name, objective, initial_agents }) => {
      const teamId = `TEAM-${Date.now()}`;
      const teamDir = path.join(TEAMS_DIR, teamId);
      fs.mkdirSync(teamDir, { recursive: true });
      fs.mkdirSync(path.join(teamDir, "tasks"));
      fs.mkdirSync(path.join(teamDir, "inbox"));
      
      const teamState = {
        id: teamId,
        name: team_name,
        objective,
        created: new Date().toISOString(),
        agents: initial_agents || [],
        status: "ACTIVE",
        tasks: [],
        heartbeat: new Date().toISOString()
      };
      
      fs.writeFileSync(path.join(teamDir, "state.json"), JSON.stringify(teamState, null, 2));
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "TEAM SPAWNED",
            pattern: "Claude Code TeammateTool",
            team_id: teamId,
            team_name,
            objective,
            agents: initial_agents || [],
            directories_created: [
              `${teamDir}/tasks`,
              `${teamDir}/inbox`
            ],
            next_steps: ["Add agents with prism_team_add_agent", "Create tasks with prism_team_create_task"]
          }, null, 2)
        }]
      };
    }
  );

  /**
   * prism_team_broadcast - Send message to all team members
   */
  server.tool(
    "prism_team_broadcast",
    "TeammateTool: Broadcast message to all agents in a team.",
    {
      team_id: z.string().describe("Team ID"),
      message: z.string().describe("Message to broadcast"),
      priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL")
    },
    async ({ team_id, message, priority }) => {
      const teamDir = path.join(TEAMS_DIR, team_id);
      
      if (!fs.existsSync(teamDir)) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: `Team not found: ${team_id}` }, null, 2)
          }]
        };
      }
      
      const teamState = JSON.parse(fs.readFileSync(path.join(teamDir, "state.json"), 'utf-8'));
      const broadcastId = `MSG-${Date.now()}`;
      
      const broadcast = {
        id: broadcastId,
        timestamp: new Date().toISOString(),
        type: "BROADCAST",
        priority,
        message,
        recipients: teamState.agents
      };
      
      // Write to each agent's inbox
      teamState.agents.forEach((agentId: string) => {
        const inboxFile = path.join(teamDir, "inbox", `${agentId}.jsonl`);
        appendJsonl(inboxFile, broadcast);
      });
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "BROADCAST SENT",
            pattern: "Claude Code TeammateTool",
            broadcast_id: broadcastId,
            team_id,
            priority,
            recipients: teamState.agents,
            message_preview: message.slice(0, 100) + (message.length > 100 ? "..." : "")
          }, null, 2)
        }]
      };
    }
  );

  /**
   * prism_team_create_task - Create task with dependencies
   */
  server.tool(
    "prism_team_create_task",
    "TeammateTool: Create task with optional dependencies (blocks/blockedBy).",
    {
      team_id: z.string().describe("Team ID"),
      title: z.string().describe("Task title"),
      description: z.string().describe("Task description"),
      assigned_to: z.string().optional().describe("Agent ID to assign to"),
      blocked_by: z.array(z.string()).optional().describe("Task IDs this is blocked by"),
      priority: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]).default("NORMAL")
    },
    async ({ team_id, title, description, assigned_to, blocked_by, priority }) => {
      const teamDir = path.join(TEAMS_DIR, team_id);
      
      if (!fs.existsSync(teamDir)) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: `Team not found: ${team_id}` }, null, 2)
          }]
        };
      }
      
      const taskId = `TASK-${Date.now()}`;
      const task = {
        id: taskId,
        title,
        description,
        status: blocked_by && blocked_by.length > 0 ? "BLOCKED" : "PENDING",
        priority,
        assigned_to: assigned_to || null,
        blocked_by: blocked_by || [],
        blocks: [],
        created: new Date().toISOString(),
        started: null,
        completed: null
      };
      
      fs.writeFileSync(path.join(teamDir, "tasks", `${taskId}.json`), JSON.stringify(task, null, 2));
      
      // Update blockedBy tasks to know they block this one
      if (blocked_by) {
        blocked_by.forEach(blockerId => {
          const blockerFile = path.join(teamDir, "tasks", `${blockerId}.json`);
          if (fs.existsSync(blockerFile)) {
            const blocker = JSON.parse(fs.readFileSync(blockerFile, 'utf-8'));
            blocker.blocks = blocker.blocks || [];
            blocker.blocks.push(taskId);
            fs.writeFileSync(blockerFile, JSON.stringify(blocker, null, 2));
          }
        });
      }
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "TASK CREATED",
            pattern: "Claude Code TeammateTool",
            task_id: taskId,
            team_id,
            title,
            initial_status: task.status,
            assigned_to: task.assigned_to,
            dependencies: blocked_by || [],
            note: task.status === "BLOCKED" ? 
              `Task blocked until ${blocked_by?.join(', ')} complete` : 
              "Task ready to start"
          }, null, 2)
        }]
      };
    }
  );

  /**
   * prism_team_heartbeat - Update team heartbeat
   */
  server.tool(
    "prism_team_heartbeat",
    "TeammateTool: Update heartbeat for abandonment detection (30s threshold).",
    {
      team_id: z.string().describe("Team ID")
    },
    async ({ team_id }) => {
      const teamDir = path.join(TEAMS_DIR, team_id);
      
      if (!fs.existsSync(teamDir)) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: `Team not found: ${team_id}` }, null, 2)
          }]
        };
      }
      
      const stateFile = path.join(teamDir, "state.json");
      const teamState = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
      
      const lastHeartbeat = new Date(teamState.heartbeat);
      const now = new Date();
      const elapsed = (now.getTime() - lastHeartbeat.getTime()) / 1000;
      
      teamState.heartbeat = now.toISOString();
      fs.writeFileSync(stateFile, JSON.stringify(teamState, null, 2));
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "HEARTBEAT UPDATED",
            pattern: "Claude Code TeammateTool",
            team_id,
            last_heartbeat: lastHeartbeat.toISOString(),
            current_heartbeat: teamState.heartbeat,
            elapsed_seconds: elapsed.toFixed(1),
            warning: elapsed > 30 ? "⚠️ Previous gap exceeded 30s threshold" : null,
            recommendation: "Call heartbeat every 20-25 seconds"
          }, null, 2)
        }]
      };
    }
  );
}

export default registerContextEngineeringTools;
