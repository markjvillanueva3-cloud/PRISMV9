#!/usr/bin/env node
// tier: T1
/**
 * H: Drive Enforcement Hook — PreToolUse
 *
 * Blocks Write/Edit/MultiEdit/Bash commands that create or modify files on
 * C: drive within the PRISM project. All work must live on H:\prism\.
 *
 * Allowed C: paths (system / CLI runtime only — NOT user-authored work):
 *   - C:\Users\*\.claude\{projects,sessions,todos,tasks,cache,file-history,
 *                         telemetry,statsig,debug,backups,ide,paste-cache,
 *                         shell-snapshots,plugins,session-env,rollouts,temp}
 *     (Claude CLI runtime state — managed by the CLI, not by the user)
 *   - C:\Users\*\.claude\{settings.json,keybindings.json,history.jsonl,CLAUDE.md}
 *     (Claude CLI root config files)
 *   - C:\Users\*\AppData\          (system)
 *   - C:\Program Files*\           (system)
 *   - C:\Windows\                  (system)
 *   - C:\ProgramData\              (system)
 *   - C:\temp, C:\tmp              (transient)
 *
 * Explicitly DENIED on C: (must go to H:\.claude\ for drive-swap portability):
 *   - C:\Users\*\.claude\{commands,agents,hooks,skills,rules,plans}
 *     (user-authored content — duplicated on H:\.claude\ for portability)
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

  // Bash: only flag paths that look like *write targets*, not mere mentions
  // (e.g., in commit messages, logs, or documentation strings). We detect
  // write targets by scanning for specific operators/commands.
  if (tool === "Bash" && typeof input.command === "string") {
    const cmd = input.command;
    // Strip quoted heredoc/commit-message bodies to avoid false positives
    const stripped = cmd
      .replace(/<<['"]?EOF['"]?[\s\S]*?EOF/g, "")
      .replace(/-m\s+"[^"]*"/g, "")
      .replace(/-m\s+'[^']*'/g, "");

    // Patterns that indicate a file *target* on C: (destination of a write)
    const writePatterns = [
      // Redirection: > C:/path   >> C:/path   2> C:/path
      /(?:^|\s)[12]?>>?\s*["']?((?:[cC]:[\\/]|\/c\/)[^"'\s;|&]+)/g,
      // cp/mv/rsync DEST as last positional arg when dest is C:
      /\b(?:cp|mv|rsync|install|ln)\s+[^;|&]*?\s((?:[cC]:[\\/]|\/c\/)[^\s;|&]+)/g,
      // tee
      /\btee\s+["']?((?:[cC]:[\\/]|\/c\/)[^"'\s;|&]+)/g,
      // mkdir / touch / Out-File / Set-Content targets
      /\b(?:mkdir|touch|Out-File|Set-Content|Add-Content)\s+(?:-\w+\s+)*["']?((?:[cC]:[\\/]|\/c\/)[^"'\s;|&]+)/g,
      // echo "..." > C:/path already covered by redirection above
    ];
    for (const re of writePatterns) {
      let m;
      while ((m = re.exec(stripped)) !== null) {
        paths.push(m[1]);
      }
    }
  }

  return paths.filter(Boolean);
}

// ── Classify a path as blocked, allowed, or irrelevant ─────────────────────

// CLI-managed subdirs under ~/.claude/ — the Claude CLI writes these itself,
// the user does not author or version them. Safe to allow.
const CLI_RUNTIME_SUBDIRS =
  "projects|sessions|todos|tasks|cache|file-history|telemetry|statsig|debug|" +
  "backups|ide|paste-cache|shell-snapshots|plugins|session-env|rollouts|temp";

// Root-level config files that Claude CLI owns (settings, keybindings, etc.).
const CLI_ROOT_FILES =
  "settings\\.json|settings\\.local\\.json|keybindings\\.json|history\\.jsonl|" +
  "CLAUDE\\.md|\\.watchman-cookie[^\\\\/]*|\\.credentials\\.json";

// User-authored subdirs that must live on H:\.claude\ for drive portability.
// Any write under these on C: is DENIED regardless of PROJECT_WORK_SIGNALS.
const USER_AUTHORED_SUBDIRS = "commands|agents|hooks|skills|rules|plans";

const DENIED_C_CLAUDE_PATTERNS = [
  new RegExp(
    `^[cC]:[\\\\/]Users[\\\\/][^\\\\/]+[\\\\/]\\.claude[\\\\/](?:${USER_AUTHORED_SUBDIRS})(?:[\\\\/]|$)`,
    "i",
  ),
  new RegExp(
    `^/c/Users/[^/]+/\\.claude/(?:${USER_AUTHORED_SUBDIRS})(?:/|$)`,
    "i",
  ),
  // hookify-*.md files at .claude root are user-authored — deny on C:.
  /^[cC]:[\\/]Users[\\/][^\\/]+[\\/]\.claude[\\/]hookify[.\-][^\\/]+\.md$/i,
  /^\/c\/Users\/[^/]+\/\.claude\/hookify[.\-][^/]+\.md$/i,
];

const ALLOWED_C_PATTERNS = [
  // CLI runtime subdirs under ~/.claude/
  new RegExp(
    `^[cC]:[\\\\/]Users[\\\\/][^\\\\/]+[\\\\/]\\.claude[\\\\/](?:${CLI_RUNTIME_SUBDIRS})(?:[\\\\/]|$)`,
    "i",
  ),
  new RegExp(
    `^/c/Users/[^/]+/\\.claude/(?:${CLI_RUNTIME_SUBDIRS})(?:/|$)`,
    "i",
  ),
  // CLI root config files (settings.json, history.jsonl, etc.)
  new RegExp(
    `^[cC]:[\\\\/]Users[\\\\/][^\\\\/]+[\\\\/]\\.claude[\\\\/](?:${CLI_ROOT_FILES})$`,
    "i",
  ),
  new RegExp(
    `^/c/Users/[^/]+/\\.claude/(?:${CLI_ROOT_FILES})$`,
    "i",
  ),
  // Windows user AppData and system paths
  /^[cC]:[\\/]Users[\\/][^\\/]+[\\/]AppData/i,
  /^\/c\/Users\/[^/]+\/AppData/i,
  /^[cC]:[\\/]Program ?Files/i,                        // System programs
  /^[cC]:[\\/]Windows/i,                                // Windows system
  /^[cC]:[\\/]ProgramData/i,                            // Shared app data
  /^[cC]:[\\/]temp(?:[\\/]|$)/i,                        // Transient
  /^[cC]:[\\/]tmp(?:[\\/]|$)/i,
];

const PROJECT_WORK_SIGNALS = [
  /[\\/](?:src|mcp-server|cad-engine|engines|data|scripts|tests|__tests__|resources|state|docs|mit_ocw|knowledge_store)[\\/]/i,
  /[\\/]prism[\\/]/i,
  /\.(?:ts|tsx|js|jsx|mjs|py|json|md|yaml|yml)$/i,
];

function classifyPath(p) {
  const isOnC = /^(?:[cC]:[\\/]|\/c\/)/.test(p);
  if (!isOnC) return "off-c-drive";
  // Explicit deny: user-authored content under ~/.claude/ must go to H:\.claude\
  for (const deny of DENIED_C_CLAUDE_PATTERNS) {
    if (deny.test(p)) return "blocked";
  }
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
  "H: drive enforcement: project work must stay on H:\\prism\\ and " +
  "user-authored ~/.claude/ content (commands, agents, hooks, skills, rules, " +
  "plans) must live on H:\\.claude\\ for drive-swap portability.\n" +
  "Blocked paths:\n  - " + blocked.join("\n  - ") +
  "\nRedirect: C:\\Users\\*\\.claude\\<authored>  →  H:\\.claude\\<authored>\n" +
  "          C:\\...\\prism project files       →  H:\\prism\\... (or /h/prism/...)";

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
