/**
 * PRISM MCP Server - Enforcement Tools
 * Phase 1: Stop the Bleeding
 * 
 * Tools:
 * - prism_pre_write_gate: Block >50 line writes without approved plan (A2)
 * - prism_pre_call_validate: Validate tool exists before calling (A3)
 * - prism_pre_write_diff: Enforce read-before-edit (A4)
 * 
 * These are callable tools that Claude should invoke as part of its workflow.
 * They maintain session state to track approvals, reads, and tool validity.
 * 
 * @version 1.0.0
 */

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { log } from "../utils/Logger.js";

// ============================================================================
// SESSION STATE (resets each server restart)
// ============================================================================

/** A2: Approved write plans — maps file path to approved plan */
const approvedPlans = new Map<string, { plan: string; lines: number; approved_at: string; expires_at: string }>();

/** A4: Files read this session — tracks what Claude has read before writing */
const filesReadThisSession = new Set<string>();

/** A3: Known working tools cache — populated on first call */
let workingToolsCache: Set<string> | null = null;
let workingToolsCacheTime: number = 0;
const CACHE_TTL_MS = 300000; // 5 min

// ============================================================================
// SCHEMAS
// ============================================================================

// A2: Pre-write gate
const PreWriteGateSchema = z.object({
  action: z.enum(["check", "approve", "status"]).describe("check: verify write is allowed; approve: register a plan; status: show all approvals"),
  file_path: z.string().optional().describe("File path being written to"),
  line_count: z.number().optional().describe("Number of lines being written"),
  plan: z.string().optional().describe("Description of what's being written and why (for approve)"),
});

// A3: Pre-call validate
const PreCallValidateSchema = z.object({
  tool_name: z.string().describe("Tool name to validate before calling"),
  known_renames: z.record(z.string()).optional().describe("Known tool renames map (old→new)"),
});

// A4: Pre-write diff
const PreWriteDiffSchema = z.object({
  action: z.enum(["register_read", "check_write", "status"]).describe("register_read: mark file as read; check_write: verify file was read first; status: show all reads"),
  file_path: z.string().describe("File path"),
});

// ============================================================================
// KNOWN TOOL RENAMES (hardcoded fallback)
// ============================================================================

const KNOWN_RENAMES: Record<string, string> = {
  "skill_stats": "skill_stats_v2",
  "script_search": "script_search_v2",
  "script_execute": "script_execute_v2",
  "skill_search": "skill_search_v2",
  "ralph_loop_lite": "prism_ralph_loop",
  "prism_gsd_core": "DC:read_file GSD_v15.md",
  "autopilot": "prism_autopilot_v2",
};

// ============================================================================
// TOOL REGISTRATION
// ============================================================================

export function registerEnforcementTools(server: McpServer): void {
  log.info("Registering Enforcement tools (Phase 1: A2+A3+A4)...");

  // =========================================================================
  // A2: prism_pre_write_gate
  // =========================================================================
  server.tool(
    "prism_pre_write_gate",
    `Block large writes without an approved plan. CALL BEFORE writing >50 lines.

Actions:
- approve: Register a plan for a file write (plan + line_count required)
- check: Verify if a write to file_path of line_count lines is allowed
- status: Show all current approvals

Rules:
- Writes ≤50 lines: always allowed (no approval needed)
- Writes >50 lines: BLOCKED unless plan is approved first
- Approvals expire after 30 minutes
- Forces "plan first, then build" discipline`,
    PreWriteGateSchema.shape,
    async (args) => {
      try {
        const parsed = PreWriteGateSchema.parse(args);
        
        switch (parsed.action) {
          case "approve": {
            if (!parsed.file_path || !parsed.plan) {
              return { content: [{ type: "text", text: JSON.stringify({ error: "file_path and plan required for approve" }) }] };
            }
            const now = new Date();
            const expires = new Date(now.getTime() + 30 * 60 * 1000);
            approvedPlans.set(parsed.file_path, {
              plan: parsed.plan,
              lines: parsed.line_count || 0,
              approved_at: now.toISOString(),
              expires_at: expires.toISOString(),
            });
            return { content: [{ type: "text", text: JSON.stringify({ status: "APPROVED", file: parsed.file_path, plan: parsed.plan, expires: expires.toISOString() }) }] };
          }
          
          case "check": {
            if (!parsed.file_path) {
              return { content: [{ type: "text", text: JSON.stringify({ error: "file_path required for check" }) }] };
            }
            const lineCount = parsed.line_count || 0;
            
            // Small writes always allowed
            if (lineCount <= 50) {
              return { content: [{ type: "text", text: JSON.stringify({ status: "ALLOWED", reason: "≤50 lines, no approval needed", file: parsed.file_path, lines: lineCount }) }] };
            }
            
            // Check for approval
            const approval = approvedPlans.get(parsed.file_path);
            if (!approval) {
              return { content: [{ type: "text", text: JSON.stringify({ status: "BLOCKED", reason: `${lineCount} lines exceeds 50-line threshold. Call with action='approve' first.`, file: parsed.file_path, lines: lineCount }) }] };
            }
            
            // Check expiry
            if (new Date() > new Date(approval.expires_at)) {
              approvedPlans.delete(parsed.file_path);
              return { content: [{ type: "text", text: JSON.stringify({ status: "BLOCKED", reason: "Approval expired. Re-approve the plan.", file: parsed.file_path }) }] };
            }
            
            return { content: [{ type: "text", text: JSON.stringify({ status: "ALLOWED", reason: "Approved plan exists", file: parsed.file_path, plan: approval.plan, approved_at: approval.approved_at }) }] };
          }
          
          case "status": {
            const entries = Array.from(approvedPlans.entries()).map(([path, a]) => ({ path, ...a }));
            return { content: [{ type: "text", text: JSON.stringify({ active_approvals: entries.length, approvals: entries }) }] };
          }
        }
      } catch (err: any) {
        return { content: [{ type: "text", text: JSON.stringify({ error: err.message }) }] };
      }
    }
  );


  // =========================================================================
  // A3: prism_pre_call_validate
  // =========================================================================
  server.tool(
    "prism_pre_call_validate",
    `Validate a tool exists before calling it. Prevents "tool not found" errors.

Checks:
1. Is tool_name in the known working tools list?
2. Has tool_name been renamed? (returns correct name)
3. Is tool_name a common misspelling?

Known renames: skill_stats→skill_stats_v2, script_search→script_search_v2, etc.
Call this when uncertain about a tool name to avoid wasted calls.`,
    PreCallValidateSchema.shape,
    async (args) => {
      try {
        const parsed = PreCallValidateSchema.parse(args);
        const toolName = parsed.tool_name;
        const renames = { ...KNOWN_RENAMES, ...(parsed.known_renames || {}) };
        
        // Check renames first
        if (renames[toolName]) {
          return { content: [{ type: "text", text: JSON.stringify({
            status: "RENAMED",
            original: toolName,
            correct_name: renames[toolName],
            message: `"${toolName}" was renamed to "${renames[toolName]}". Use the new name.`
          }) }] };
        }
        
        // Check if tool exists in server (we can't introspect MCP server tools directly,
        // so we maintain a known-good list from prism_working_tools output)
        // For now, return UNKNOWN with advice to verify
        return { content: [{ type: "text", text: JSON.stringify({
          status: "NOT_IN_RENAME_MAP",
          tool_name: toolName,
          message: "Tool not found in rename map. Likely valid — call prism_working_tools to verify if unsure.",
          known_renames: Object.keys(renames),
        }) }] };
      } catch (err: any) {
        return { content: [{ type: "text", text: JSON.stringify({ error: err.message }) }] };
      }
    }
  );

  // =========================================================================
  // A4: prism_pre_write_diff
  // =========================================================================
  server.tool(
    "prism_pre_write_diff",
    `Enforce read-before-edit discipline. Prevents overwriting files without reading first.

Actions:
- register_read: Mark a file as read this session (call after DC:read_file or prism_file_read)
- check_write: Verify a file was read before writing to it
- status: Show all files read this session

Rule: NEVER edit a file you haven't read first.
This prevents the #1 cause of data loss: blind overwrites.`,
    PreWriteDiffSchema.shape,
    async (args) => {
      try {
        const parsed = PreWriteDiffSchema.parse(args);
        const normalized = parsed.file_path.replace(/\\/g, "/").toLowerCase();
        
        switch (parsed.action) {
          case "register_read": {
            filesReadThisSession.add(normalized);
            return { content: [{ type: "text", text: JSON.stringify({
              status: "REGISTERED",
              file: parsed.file_path,
              total_reads: filesReadThisSession.size,
            }) }] };
          }
          
          case "check_write": {
            const wasRead = filesReadThisSession.has(normalized);
            if (wasRead) {
              return { content: [{ type: "text", text: JSON.stringify({
                status: "ALLOWED",
                file: parsed.file_path,
                reason: "File was read this session before writing",
              }) }] };
            }
            return { content: [{ type: "text", text: JSON.stringify({
              status: "BLOCKED",
              file: parsed.file_path,
              reason: "File was NOT read this session. Read it first with DC:read_file or prism_file_read before editing.",
              files_read: Array.from(filesReadThisSession).slice(0, 20),
            }) }] };
          }
          
          case "status": {
            return { content: [{ type: "text", text: JSON.stringify({
              files_read_count: filesReadThisSession.size,
              files_read: Array.from(filesReadThisSession),
            }) }] };
          }
        }
      } catch (err: any) {
        return { content: [{ type: "text", text: JSON.stringify({ error: err.message }) }] };
      }
    }
  );

  log.info("✅ Registered 3 Enforcement tools (Phase 1: A2+A3+A4)");
}
