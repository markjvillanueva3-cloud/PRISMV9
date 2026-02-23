/**
 * PRISM MCP Server - Reasoning & Error Intelligence Tools
 * Phase 1: Stop the Bleeding
 * 
 * Tools:
 * - prism_decision_log: Record/search/revisit architectural decisions (B1)
 * - prism_failure_library: Categorized failure pattern database (B3)
 * - prism_error_capture: Capture, categorize, and log errors (A1)
 * 
 * Storage: C:\PRISM\state\decisions\, C:\PRISM\state\error_log.jsonl, C:\PRISM\state\failure_patterns.jsonl
 * 
 * @version 1.0.0
 */

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { log } from "../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// CONSTANTS & PATHS
// ============================================================================

const STATE_DIR = process.env.PRISM_STATE_DIR || "C:\\PRISM\\state";
const DECISIONS_DIR = path.join(STATE_DIR, "decisions");
const ERROR_LOG_PATH = path.join(STATE_DIR, "error_log.jsonl");
const FAILURE_PATTERNS_PATH = path.join(STATE_DIR, "failure_patterns.jsonl");

// Error categories for A1
const ERROR_CATEGORIES = [
  "off-by-one", "wrong-unit", "stale-reference", "assumption-leak",
  "build-error", "missing-data", "type-error", "tool-not-found",
  "permission-denied", "timeout", "validation-failure", "logic-error",
  "anti-regression", "overwrite-without-read", "uncategorized"
] as const;

// Failure domains for B3
const FAILURE_DOMAINS = [
  "materials", "machines", "calculations", "safety", "hooks",
  "state-management", "file-operations", "tool-routing", "orchestration",
  "session-management", "build-system", "data-integrity", "other"
] as const;

// Severity levels
const SEVERITY_LEVELS = ["critical", "high", "medium", "low"] as const;

// ============================================================================
// ENSURE DIRECTORIES
// ============================================================================

function ensureDirs(): void {
  if (!fs.existsSync(DECISIONS_DIR)) {
    fs.mkdirSync(DECISIONS_DIR, { recursive: true });
  }
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }
}

// ============================================================================
// SCHEMAS
// ============================================================================

// B1: Decision Log
const DecisionLogSchema = z.object({
  action: z.enum(["record", "search", "revisit", "list"]).describe("Operation to perform"),
  decision: z.string().optional().describe("Decision statement (for record)"),
  alternatives: z.array(z.string()).optional().describe("Alternatives considered (for record)"),
  reasoning: z.string().optional().describe("Why this choice was made (for record)"),
  revisit_if: z.array(z.string()).optional().describe("Conditions that would change this decision"),
  confidence: z.number().min(0).max(1).optional().default(0.8).describe("Confidence in decision (0-1)"),
  domain: z.string().optional().describe("Domain: architecture, tools, data, safety, workflow"),
  query: z.string().optional().describe("Search query (for search/revisit)"),
  decision_id: z.string().optional().describe("Specific decision ID to revisit"),
});

// B3: Failure Library
const FailureLibrarySchema = z.object({
  action: z.enum(["record", "check", "stats", "search"]).describe("Operation to perform"),
  type: z.string().optional().describe("Failure type/pattern name (for record)"),
  context: z.string().optional().describe("What was happening when failure occurred (for record)"),
  error: z.string().optional().describe("Error message (for record)"),
  root_cause: z.string().optional().describe("Identified root cause (for record)"),
  prevention: z.string().optional().describe("How to prevent this in future (for record)"),
  domain: z.enum([...FAILURE_DOMAINS]).optional().describe("Failure domain (for record/search)"),
  severity: z.enum([...SEVERITY_LEVELS]).optional().default("medium").describe("Severity level"),
  query: z.string().optional().describe("Search query (for check/search)"),
});

// A1: Error Capture
const ErrorCaptureSchema = z.object({
  error_message: z.string().describe("The error message"),
  tool_name: z.string().describe("Tool that produced the error"),
  error_type: z.enum([...ERROR_CATEGORIES]).optional().default("uncategorized").describe("Error category"),
  context: z.string().optional().describe("What was being attempted"),
  parameters: z.record(z.any()).optional().describe("Parameters that were passed to the tool"),
  auto_fix_attempted: z.boolean().optional().default(false).describe("Whether a fix was already tried"),
});

// ============================================================================
// B1: DECISION LOG - Core Functions
// ============================================================================

interface Decision {
  id: string;
  decision: string;
  alternatives: string[];
  reasoning: string;
  revisit_if: string[];
  confidence: number;
  domain: string;
  status: "active" | "superseded" | "revisited";
  created: string;
  updated: string;
  session: number;
}

function generateDecisionId(): string {
  const now = new Date();
  const ts = now.toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 6);
  return `DEC-${ts}-${rand}`;
}

function recordDecision(args: any): Decision {
  ensureDirs();
  const id = generateDecisionId();
  const decision: Decision = {
    id,
    decision: args.decision || "Unnamed decision",
    alternatives: args.alternatives || [],
    reasoning: args.reasoning || "",
    revisit_if: args.revisit_if || [],
    confidence: args.confidence ?? 0.8,
    domain: args.domain || "general",
    status: "active",
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    session: 0, // Will be set by session context
  };
  
  const filePath = path.join(DECISIONS_DIR, `${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(decision, null, 2), "utf-8");
  return decision;
}

function searchDecisions(query: string): Decision[] {
  ensureDirs();
  const results: Decision[] = [];
  const queryLower = query.toLowerCase();
  
  try {
    const files = fs.readdirSync(DECISIONS_DIR).filter(f => f.endsWith(".json"));
    for (const file of files) {
      const content = fs.readFileSync(path.join(DECISIONS_DIR, file), "utf-8");
      const dec: Decision = JSON.parse(content);
      const searchText = `${dec.decision} ${dec.reasoning} ${dec.alternatives.join(" ")} ${dec.domain}`.toLowerCase();
      if (searchText.includes(queryLower)) {
        results.push(dec);
      }
    }
  } catch (e) { /* empty dir is fine */ }
  
  return results.sort((a, b) => b.created.localeCompare(a.created));
}

function listDecisions(limit: number = 20): Decision[] {
  ensureDirs();
  const results: Decision[] = [];
  
  try {
    const files = fs.readdirSync(DECISIONS_DIR).filter(f => f.endsWith(".json"));
    for (const file of files.slice(-limit)) {
      const content = fs.readFileSync(path.join(DECISIONS_DIR, file), "utf-8");
      results.push(JSON.parse(content));
    }
  } catch (e) { /* empty dir is fine */ }
  
  return results.sort((a, b) => b.created.localeCompare(a.created));
}

function revisitDecision(id: string): { decision: Decision | null; should_revisit: boolean; triggers: string[] } {
  ensureDirs();
  const filePath = path.join(DECISIONS_DIR, `${id}.json`);
  
  if (!fs.existsSync(filePath)) {
    return { decision: null, should_revisit: false, triggers: ["Decision not found"] };
  }
  
  const dec: Decision = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  return {
    decision: dec,
    should_revisit: dec.revisit_if.length > 0,
    triggers: dec.revisit_if,
  };
}

// ============================================================================
// B3: FAILURE LIBRARY - Core Functions
// ============================================================================

interface FailurePattern {
  id: string;
  type: string;
  context: string;
  error: string;
  root_cause: string;
  prevention: string;
  domain: string;
  severity: string;
  occurrences: number;
  first_seen: string;
  last_seen: string;
  sessions: number[];
}

function appendJsonl(filePath: string, record: any): void {
  ensureDirs();
  fs.appendFileSync(filePath, JSON.stringify(record) + "\n", "utf-8");
}

function readJsonl<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, "utf-8").trim().split("\n").filter(Boolean);
  return lines.map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean) as T[];
}

function recordFailure(args: any): FailurePattern {
  const patterns = readJsonl<FailurePattern>(FAILURE_PATTERNS_PATH);
  
  // Check for existing similar pattern (merge if found)
  const existing = patterns.find(p => 
    p.type === args.type && p.domain === (args.domain || "other")
  );
  
  if (existing) {
    existing.occurrences++;
    existing.last_seen = new Date().toISOString();
    if (args.root_cause && !existing.root_cause) existing.root_cause = args.root_cause;
    if (args.prevention && !existing.prevention) existing.prevention = args.prevention;
    
    // Rewrite file with updated pattern
    const updated = patterns.map(p => p.id === existing.id ? existing : p);
    fs.writeFileSync(FAILURE_PATTERNS_PATH, updated.map(p => JSON.stringify(p)).join("\n") + "\n", "utf-8");
    return existing;
  }
  
  const pattern: FailurePattern = {
    id: `FAIL-${Date.now().toString(36)}`,
    type: args.type || "unknown",
    context: args.context || "",
    error: args.error || "",
    root_cause: args.root_cause || "",
    prevention: args.prevention || "",
    domain: args.domain || "other",
    severity: args.severity || "medium",
    occurrences: 1,
    first_seen: new Date().toISOString(),
    last_seen: new Date().toISOString(),
    sessions: [],
  };
  
  appendJsonl(FAILURE_PATTERNS_PATH, pattern);
  return pattern;
}

function checkFailures(query: string): { warnings: string[]; patterns: FailurePattern[] } {
  const patterns = readJsonl<FailurePattern>(FAILURE_PATTERNS_PATH);
  const queryLower = query.toLowerCase();
  
  const matches = patterns.filter(p => {
    const text = `${p.type} ${p.context} ${p.error} ${p.root_cause} ${p.domain} ${p.prevention}`.toLowerCase();
    return text.includes(queryLower);
  });
  
  const warnings = matches.map(p => 
    `⚠️ [${p.severity.toUpperCase()}] "${p.type}" (${p.occurrences}x): ${p.prevention || p.root_cause || "No prevention recorded"}`
  );
  
  return { warnings, patterns: matches };
}

function failureStats(): { total: number; by_domain: Record<string, number>; by_severity: Record<string, number>; top_recurring: FailurePattern[] } {
  const patterns = readJsonl<FailurePattern>(FAILURE_PATTERNS_PATH);
  
  const by_domain: Record<string, number> = {};
  const by_severity: Record<string, number> = {};
  
  for (const p of patterns) {
    by_domain[p.domain] = (by_domain[p.domain] || 0) + 1;
    by_severity[p.severity] = (by_severity[p.severity] || 0) + 1;
  }
  
  const top_recurring = [...patterns].sort((a, b) => b.occurrences - a.occurrences).slice(0, 10);
  
  return { total: patterns.length, by_domain, by_severity, top_recurring };
}

// ============================================================================
// A1: ERROR CAPTURE - Core Functions
// ============================================================================

interface ErrorEntry {
  id: string;
  timestamp: string;
  error_message: string;
  tool_name: string;
  error_type: string;
  context: string;
  parameters: Record<string, any>;
  auto_fix_attempted: boolean;
  session: number;
}

// In-memory recent errors for fast checking
let recentErrors: ErrorEntry[] = [];

function captureError(args: any): ErrorEntry {
  ensureDirs();
  
  const entry: ErrorEntry = {
    id: `ERR-${Date.now().toString(36)}`,
    timestamp: new Date().toISOString(),
    error_message: args.error_message,
    tool_name: args.tool_name,
    error_type: args.error_type || "uncategorized",
    context: args.context || "",
    parameters: args.parameters || {},
    auto_fix_attempted: args.auto_fix_attempted || false,
    session: 0,
  };
  
  // Append to persistent log
  appendJsonl(ERROR_LOG_PATH, entry);
  
  // Keep in memory for fast checking
  recentErrors.push(entry);
  if (recentErrors.length > 200) recentErrors = recentErrors.slice(-200);
  
  // Auto-feed failure library if pattern matches
  const patterns = readJsonl<FailurePattern>(FAILURE_PATTERNS_PATH);
  const matchingPattern = patterns.find(p => 
    entry.error_message.toLowerCase().includes(p.type.toLowerCase()) ||
    p.type.toLowerCase().includes(entry.error_type)
  );
  
  if (matchingPattern) {
    matchingPattern.occurrences++;
    matchingPattern.last_seen = entry.timestamp;
    const updated = patterns.map(p => p.id === matchingPattern.id ? matchingPattern : p);
    fs.writeFileSync(FAILURE_PATTERNS_PATH, updated.map(p => JSON.stringify(p)).join("\n") + "\n", "utf-8");
  }
  
  return entry;
}

function getRecentErrors(n: number = 20): ErrorEntry[] {
  if (recentErrors.length > 0) return recentErrors.slice(-n);
  // Fall back to file
  const all = readJsonl<ErrorEntry>(ERROR_LOG_PATH);
  return all.slice(-n);
}

function getErrorStats(): { total: number; by_type: Record<string, number>; by_tool: Record<string, number>; recent_24h: number } {
  const all = readJsonl<ErrorEntry>(ERROR_LOG_PATH);
  const by_type: Record<string, number> = {};
  const by_tool: Record<string, number> = {};
  const cutoff = new Date(Date.now() - 86400000).toISOString();
  let recent_24h = 0;
  
  for (const e of all) {
    by_type[e.error_type] = (by_type[e.error_type] || 0) + 1;
    by_tool[e.tool_name] = (by_tool[e.tool_name] || 0) + 1;
    if (e.timestamp > cutoff) recent_24h++;
  }
  
  return { total: all.length, by_type, by_tool, recent_24h };
}

// ============================================================================
// TOOL REGISTRATION
// ============================================================================

export function registerReasoningTools(server: McpServer): void {
  log.info("Registering Reasoning & Error Intelligence tools (Phase 1)...");

  // =========================================================================
  // B1: prism_decision_log
  // =========================================================================
  server.tool(
    "prism_decision_log",
    `Record, search, and revisit architectural decisions.

Actions:
- record: Log a decision with alternatives, reasoning, and revisit triggers
- search: Find past decisions by keyword
- revisit: Check if a specific decision should be reconsidered
- list: Show recent decisions

Every decision gets a unique ID and is persisted to disk.
Use before building anything significant — stops re-debating settled questions.`,
    DecisionLogSchema.shape,
    async (args) => {
      try {
        const parsed = DecisionLogSchema.parse(args);
        let result: any;
        
        switch (parsed.action) {
          case "record":
            if (!parsed.decision) {
              return { content: [{ type: "text", text: JSON.stringify({ error: "decision field required for record action" }) }] };
            }
            result = recordDecision(parsed);
            result = { action: "recorded", ...result };
            break;
            
          case "search":
            if (!parsed.query) {
              return { content: [{ type: "text", text: JSON.stringify({ error: "query field required for search action" }) }] };
            }
            const searchResults = searchDecisions(parsed.query);
            result = { action: "search", query: parsed.query, count: searchResults.length, decisions: searchResults.slice(0, 10) };
            break;
            
          case "revisit":
            if (!parsed.decision_id) {
              return { content: [{ type: "text", text: JSON.stringify({ error: "decision_id required for revisit action" }) }] };
            }
            result = { action: "revisit", ...revisitDecision(parsed.decision_id) };
            break;
            
          case "list":
            const listed = listDecisions(20);
            result = { action: "list", count: listed.length, decisions: listed };
            break;
        }
        
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: "text", text: JSON.stringify({ error: err.message }) }] };
      }
    }
  );


  // =========================================================================
  // B3: prism_failure_library
  // =========================================================================
  server.tool(
    "prism_failure_library",
    `Categorized failure pattern database. Learns from every error to prevent recurrence.

Actions:
- record: Add a new failure pattern with root cause and prevention
- check: Search for known failures relevant to current task (call BEFORE starting work)
- stats: Get failure statistics by domain and severity
- search: Free-text search across all patterns

Feeds from prism_error_capture automatically. Use 'check' at session start to load relevant warnings.`,
    FailureLibrarySchema.shape,
    async (args) => {
      try {
        const parsed = FailureLibrarySchema.parse(args);
        let result: any;
        
        switch (parsed.action) {
          case "record":
            if (!parsed.type) {
              return { content: [{ type: "text", text: JSON.stringify({ error: "type field required for record action" }) }] };
            }
            result = { action: "recorded", pattern: recordFailure(parsed) };
            break;
            
          case "check":
            if (!parsed.query) {
              return { content: [{ type: "text", text: JSON.stringify({ error: "query field required for check action" }) }] };
            }
            const checkResult = checkFailures(parsed.query);
            result = { action: "check", query: parsed.query, warning_count: checkResult.warnings.length, warnings: checkResult.warnings, patterns: checkResult.patterns.slice(0, 5) };
            break;
            
          case "stats":
            result = { action: "stats", ...failureStats() };
            break;
            
          case "search":
            if (!parsed.query) {
              return { content: [{ type: "text", text: JSON.stringify({ error: "query field required for search action" }) }] };
            }
            const searchResult = checkFailures(parsed.query);
            result = { action: "search", query: parsed.query, count: searchResult.patterns.length, patterns: searchResult.patterns };
            break;
        }
        
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: "text", text: JSON.stringify({ error: err.message }) }] };
      }
    }
  );

  // =========================================================================
  // A1: prism_error_capture
  // =========================================================================
  server.tool(
    "prism_error_capture",
    `Capture, categorize, and log errors. Auto-feeds failure_library.

SAFETY CRITICAL: Every error gets persisted to error_log.jsonl.
If error matches a known failure pattern, that pattern's occurrence count increments.

Call this whenever a tool fails or produces unexpected results.
Returns: error entry + any matching failure patterns with prevention advice.

Categories: ${ERROR_CATEGORIES.join(", ")}`,
    ErrorCaptureSchema.shape,
    async (args) => {
      try {
        const parsed = ErrorCaptureSchema.parse(args);
        const entry = captureError(parsed);
        
        // Check for matching failure patterns to return prevention advice
        const related = checkFailures(parsed.error_message);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              captured: entry,
              matching_patterns: related.patterns.slice(0, 3),
              prevention_warnings: related.warnings.slice(0, 3),
              stats: { total_errors: getRecentErrors(999).length, recent_errors: getRecentErrors(5).map(e => `${e.tool_name}: ${e.error_type}`) },
            }, null, 2)
          }]
        };
      } catch (err: any) {
        return { content: [{ type: "text", text: JSON.stringify({ error: err.message }) }] };
      }
    }
  );

  log.info("✅ Registered 3 Reasoning & Error Intelligence tools (Phase 1: B1+B3+A1)");
}
