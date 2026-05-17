#!/usr/bin/env node
// tier: T4
/**
 * mcp-route-suggest.mjs
 * ---------------------
 * Compact PreToolUse router that nudges PRISM work toward existing MCP, helper,
 * and audit-chain surfaces before broad shell churn expands token cost.
 * Uses local Ollama for intelligent suggestions (zero Claude API tokens).
 * Falls back to regex-based suggestions when Ollama unavailable.
 */

import { shouldSkipHook as _hp_shouldSkip } from "../helpers/hook-profile.mjs";
import { dirname, join as _pathJoin } from 'path';
import { fileURLToPath } from 'url';
import _fs from 'node:fs';
import _os from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));

// SLOT-DRIFT-FIX-MS0/U-SDF11 (2026-05-17): per-(session,file) rate-limiter
// for the "Doctrine/command surface" reminder. The reminder was firing on
// EVERY Read of a .claude/hooks/ file (~50 fires/session for the kinds of
// audit work that touches the hook stack). Same message, same advice, no
// new information after the first impression — pure context burn. Keep a
// per-file stamp; skip if seen within 30 minutes for the same session.
const _DOCTRINE_RATE_WINDOW_MS = 30 * 60 * 1000;
const _DOCTRINE_RATE_FILE = _pathJoin(_os.tmpdir(), "prism-hook-state", "mcp-route-doctrine-seen.json");
function _loadDoctrineSeen() {
  try { return JSON.parse(_fs.readFileSync(_DOCTRINE_RATE_FILE, "utf8")); }
  catch { return {}; }
}
function _saveDoctrineSeen(state) {
  try {
    const dir = dirname(_DOCTRINE_RATE_FILE);
    if (!_fs.existsSync(dir)) _fs.mkdirSync(dir, { recursive: true });
    _fs.writeFileSync(_DOCTRINE_RATE_FILE, JSON.stringify(state));
  } catch { /* ignore */ }
}
function _doctrineRecentlySeen(sessionId, filePath) {
  if (!sessionId || !filePath) return false;
  const state = _loadDoctrineSeen();
  const key = `${sessionId}:${filePath}`;
  const last = state[key];
  if (typeof last !== "number") return false;
  return (Date.now() - last) < _DOCTRINE_RATE_WINDOW_MS;
}
function _markDoctrineSeen(sessionId, filePath) {
  if (!sessionId || !filePath) return;
  const state = _loadDoctrineSeen();
  state[`${sessionId}:${filePath}`] = Date.now();
  // Trim entries older than 2 windows to keep the file small.
  const cutoff = Date.now() - 2 * _DOCTRINE_RATE_WINDOW_MS;
  for (const [k, t] of Object.entries(state)) {
    if (typeof t !== "number" || t < cutoff) delete state[k];
  }
  _saveDoctrineSeen(state);
}

const PRISM_ROOT = "H:/PRISM";
const MCP_ROOT = "H:/PRISM/mcp-server";
const AUDIT_CHAIN_CMD =
  "npx tsx H:/PRISM/mcp-server/scripts/run-dev-audit-chain.ts --edited-file <path>";

// Lazy-load Ollama bridge (don't fail if missing)
let queryOllama = null;
try {
  const bridge = await import('./lib/ollama-hook-bridge.mjs');
  queryOllama = bridge.queryOllama;
} catch {
  // Ollama bridge not available — will use regex fallback
}

function readStdin() {
  return new Promise((resolve) => {
    let buffer = "";
    process.stdin.on("data", (chunk) => {
      buffer += chunk;
    });
    process.stdin.on("end", () => {
      try {
        resolve(JSON.parse(buffer || "{}"));
      } catch {
        resolve({});
      }
    });
    setTimeout(() => resolve({}), 200);
  });
}

function normalize(value) {
  return String(value || "").replace(/\\/g, "/");
}

function getFilePath(toolInput) {
  return normalize(toolInput?.file_path || toolInput?.filePath || "");
}

function getBashCommand(toolInput) {
  return String(toolInput?.command || toolInput?.cmd || "").trim();
}

function isBackendFile(filePath) {
  return /^h:\/prism\/mcp-server\/src\/(?:engines|tools\/dispatchers|schemas|routes|hooks|services|utils)\/.+\.(?:ts|js)$/i.test(
    filePath,
  );
}

function isDoctrineFile(filePath) {
  return /^h:\/(?:prism\/)?\.claude\/(?:commands|hooks|helpers)\/.+/i.test(filePath) ||
    /^h:\/prism\/state\/shared\/.+/i.test(filePath) ||
    /^h:\/(?:prism\/)?\.claude\/settings\.json$/i.test(filePath) ||
    /^h:\/prism\/\.claude\/settings\.json$/i.test(filePath);
}

function isBroadShell(command) {
  const lower = command.toLowerCase();
  return [
    "get-childitem",
    "select-string",
    "findstr",
    "git diff",
    "git status",
    "npm run build",
    "npm run test",
    "npx vitest",
    "npx tsc",
    "ls ",
    "dir ",
  ].some((token) => lower.includes(token));
}

// DEV-VELOCITY-AUTOTRIGGER-MS0/U-C1 (2026-05-12): smarter classifier — suppress
// route-first nudges where no dispatcher actually fits. Was firing on every
// git/ls/grep against H:/prism (the false-positive everyone learned to ignore).
//
// A command is dispatcher-routable when it's exploring ENGINE / DISPATCHER /
// ACTION / SCHEMA surfaces — not when it's:
//   - git/gh metadata (git log, git show, git diff, git status, gh pr/run/issue)
//   - settings.json / .claude config edits
//   - hook source navigation (.claude/hooks/*.mjs, .claude/helpers/*.mjs)
//   - skill/command file navigation (.claude/commands/*.md)
//   - state/shared JSON read-only inspection (audit + handoff surfaces)
//   - node/python script invocations (already programmatic, no further route)
//   - npm/build/test (dev cycle commands — prism_dev exposes them but the nudge
//     is unhelpful here; the operator just typed it intentionally)
//   - cd / pushd / popd / pwd (navigation primitives)
//   - rm / mv / cp / mkdir / touch / chmod (file operations, no route)
function hasNoDispatcherRoute(command) {
  if (!command) return true;
  const lower = command.toLowerCase().trim();
  // Strip common prefixes (rtk, time, env VAR=val, etc.) before classification
  const stripped = lower
    .replace(/^(rtk|time|env\s+\w+=\S+)\s+/i, "")
    .replace(/^&\s+/, "");

  // git / gh metadata — none of these has a dispatcher route
  if (/^(git|gh)\b/.test(stripped)) {
    // exception: `git grep <pattern>` could be replaced by action_search for code patterns
    if (/^git\s+grep\b/.test(stripped)) return false;
    return true;
  }

  // node / python / npx script execution — no further routing
  if (/^(node|python|python3|npx|tsx|deno|bun)\b/.test(stripped)) return true;

  // npm / pnpm / yarn — dev cycle commands, operator-intentional
  if (/^(npm|pnpm|yarn)\b/.test(stripped)) return true;

  // File system primitives — no route
  if (/^(cd|pushd|popd|pwd|rm|mv|cp|mkdir|touch|chmod|ln|stat)\b/.test(stripped)) return true;

  // Pure navigation (ls / dir alone — but only when the path is non-engine)
  if (/^(ls|dir)\b/.test(stripped)) {
    // ls under .claude/, state/shared/, mcp-server/data/state/ → no route
    if (/(\.claude|state\/shared|mcp-server\/data\/state)/.test(stripped)) return true;
    // ls on engine/dispatcher dirs → route-able (action_search / dispatcher_map_compact)
    return false;
  }

  // grep / select-string targeting non-engine surfaces → no route
  if (/^(grep|select-string|findstr|rg)\b/.test(stripped)) {
    if (/(\.claude|state\/shared|mcp-server\/data\/state|state\/handoffs)/.test(stripped)) return true;
    // grep over engines/dispatchers — route-able
    return false;
  }

  // Default: assume the command might be route-able (preserve existing behavior
  // for commands not explicitly classified above)
  return false;
}

async function getRegexSuggestions(toolName, filePath, bashCommand, sessionId) {
  const messages = [];
  const normalizedCommand = normalize(bashCommand);

  if (
    toolName === "Bash" &&
    isBroadShell(bashCommand) &&
    (normalizedCommand.toLowerCase().includes("/prism") ||
      normalizedCommand.toLowerCase().includes("/mcp-server") ||
      normalizedCommand.toLowerCase().includes("h:/")) &&
    // U-C1 (2026-05-12): suppress when classifier says no dispatcher fits.
    // Eliminates the false-positive nudge on git/.claude/state-shared/script-runs
    // that was teaching operators to tune out the hook.
    !hasNoDispatcherRoute(bashCommand)
  ) {
    messages.push(
      "Route first: prefer prism_session:dispatcher_map_compact, prism_session:action_search, and prism_session:tool_route_best before broad shell exploration.",
    );
  }

  if (isBackendFile(filePath)) {
    messages.push(
      `Backend audit: after meaningful edits use ${AUDIT_CHAIN_CMD} or the equivalent prism_dev chain (test_smoke -> auto_wiring_analyze -> schema_gap_scan -> quality_dashboard -> build_guard_chain).`,
    );
  }

  if (isDoctrineFile(filePath)) {
    // U-SDF11: per-(session,file) rate-limit. After firing once for this
    // file in this session, suppress for 30 min. The reminder teaches
    // nothing new on the 5th repetition of the same Read.
    if (!_doctrineRecentlySeen(sessionId, filePath)) {
      messages.push(
        "Doctrine/command surface: verify the command bridge and MCP directive before teaching a new manual workflow.",
      );
      _markDoctrineSeen(sessionId, filePath);
    }
  }

  return messages;
}

async function getOllamaSuggestions(toolName, filePath, bashCommand) {
  if (!queryOllama) return null;

  // Only query Ollama for Bash commands that look like exploration
  if (toolName !== "Bash" || !isBroadShell(bashCommand)) {
    return null;
  }

  const prompt = `Task: User is running "${bashCommand}" in PRISM codebase.
Available MCP dispatchers: prism_session (dispatcher_map_compact, action_search, tool_route_best), prism_dev (build, test_smoke, quality_dashboard), prism_calc (speed_feed, cutting_force).

What's the best MCP action to use instead? Reply with just: dispatcher:action — reason (10 words max)`;

  try {
    const result = await queryOllama(prompt, {
      hookType: 'mcp_route',
      timeoutMs: 300,
      maxTokens: 40,
    });

    if (result.success && result.response) {
      return [`🤖 Suggested route: ${result.response}`];
    }
  } catch {
    // Ollama failed — fall through to regex
  }

  return null;
}

async function main() {
  if (_hp_shouldSkip("mcp-route-suggest")) { console.log(JSON.stringify({ continue: true })); return; }
  const input = await readStdin();
  const toolName = input.tool_name || input.toolName || "";
  const toolInput = input.tool_input || input.input || {};
  // U-SDF11: extract sessionId for per-session doctrine rate-limiting.
  const sessionId = (input.session_id || input.sessionId || "").toString().slice(0, 36);

  if (!["Bash", "Read", "Edit", "Write", "MultiEdit"].includes(toolName)) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const filePath = getFilePath(toolInput);
  const bashCommand = getBashCommand(toolInput);

  // Try Ollama first for Bash commands
  let messages = await getOllamaSuggestions(toolName, filePath, bashCommand);

  // Fall back to regex-based suggestions
  if (!messages || messages.length === 0) {
    messages = await getRegexSuggestions(toolName, filePath, bashCommand, sessionId);
  }

  if (messages.length === 0) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  process.stdout.write(
    JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: messages.join("\n"),
      },
    }),
  );
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true }));
});
