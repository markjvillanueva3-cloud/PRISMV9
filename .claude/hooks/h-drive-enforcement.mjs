#!/usr/bin/env node
/**
 * H: Drive Enforcement Hook — PreToolUse
 *
 * Blocks Write/Edit/MultiEdit/Bash commands that create or modify files on
 * C: drive within the PRISM project. All work must live on H:\prism\.
 *
 * Allowed C: paths (system / tooling — not project work):
 *   - C:\Users\*\.claude\         (Claude Code config — may need user edits)
 *   - C:\Users\*\AppData\          (system)
 *   - C:\Program Files*\           (system)
 *   - C:\Windows\                  (system)
 *   - C:\ProgramData\              (system)
 *   - C:\temp, C:\tmp              (transient)
 *
 * Everything else on C: that looks like PRISM work (src/, mcp-server/, data/,
 * engines/, cad-engine/, etc.) is denied.
 *
 * Input: Claude Code passes the hook JSON on stdin with tool name and input.
 * Output: JSON with permissionDecision="deny" + reason to block,
 *         or exit 0 (empty) to allow.
 */

import { readFileSync } from "node:fs";
import { exit, stdin } from "node:process";

// Read stdin
let input = "";
try {
  input = readFileSync(0, "utf-8");
} catch {
  // No stdin — allow
  exit(0);
}

let payload;
try {
  payload = JSON.parse(input);
} catch {
  exit(0);
}

const tool = payload?.tool_name || payload?.tool || "";
const toolInput = payload?.tool_input || payload?.input || {};

// ── Extract file paths from tool input ─────────────────────────────────────

function candidatePaths(tool, input) {
  const paths = [];
  if (typeof input.file_path === "string") paths.push(input.file_path);
  if (typeof input.path === "string") paths.push(input.path);
  if (typeof input.notebook_path === "string") paths.push(input.notebook_path);

  // Bash: scan the command string for file-like C: paths
  if (tool === "Bash" && typeof input.command === "string") {
    const cmd = input.command;
    // Match C:/..., C:\..., /c/... style absolute paths with project-style segments
    const regex = /(?:[cC]:[\\/]|\/c\/)[A-Za-z0-9_\-.\\/: ]+/g;
    const matches = cmd.match(regex) || [];
    paths.push(...matches);
  }

  return paths.filter(Boolean);
}

// ── Classify a path as blocked, allowed, or irrelevant ─────────────────────

const ALLOWED_C_PATTERNS = [
  /^[cC]:[\\/]Users[\\/][^\\/]+[\\/]\.claude/i,       // Claude config
  /^[cC]:[\\/]Users[\\/][^\\/]+[\\/]AppData/i,        // Windows user app data
  /^[cC]:[\\/]Program ?Files/i,                        // System programs
  /^[cC]:[\\/]Windows/i,                                // Windows system
  /^[cC]:[\\/]ProgramData/i,                            // Shared app data
  /^[cC]:[\\/]temp(?:[\\/]|$)/i,                        // Transient
  /^[cC]:[\\/]tmp(?:[\\/]|$)/i,
  /^\/c\/Users\/[^/]+\/\.claude/i,                      // bash-style allowed
  /^\/c\/Users\/[^/]+\/AppData/i,
];

const PROJECT_WORK_SIGNALS = [
  /[\\/](?:src|mcp-server|cad-engine|engines|data|scripts|tests|__tests__|resources|state|docs|mit_ocw|knowledge_store)[\\/]/i,
  /[\\/]prism[\\/]/i,
  /\.(?:ts|tsx|js|jsx|mjs|py|json|md|yaml|yml)$/i,
];

function classifyPath(p) {
  const isOnC = /^(?:[cC]:[\\/]|\/c\/)/.test(p);
  if (!isOnC) return "off-c-drive";
  for (const allow of ALLOWED_C_PATTERNS) {
    if (allow.test(p)) return "allowed";
  }
  // If it's on C but doesn't look like project work, allow
  const looksLikeProjectWork = PROJECT_WORK_SIGNALS.some(re => re.test(p));
  return looksLikeProjectWork ? "blocked" : "allowed";
}

// ── Main ───────────────────────────────────────────────────────────────────

const writeTools = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit", "Bash"]);
if (!writeTools.has(tool)) exit(0);

const paths = candidatePaths(tool, toolInput);
const blocked = paths.filter(p => classifyPath(p) === "blocked");

if (blocked.length === 0) exit(0);

const reason =
  "H: drive enforcement: project work must stay on H:\\prism\\. " +
  "Redirect these paths:\n  - " + blocked.join("\n  - ") +
  "\nUse H:\\prism\\... or the /h/prism/... Git-Bash equivalent.";

// PreToolUse: emit deny decision
const response = {
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: reason,
  },
};
process.stdout.write(JSON.stringify(response));
exit(0);
