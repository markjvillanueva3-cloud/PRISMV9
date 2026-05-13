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
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

async function getRegexSuggestions(toolName, filePath, bashCommand) {
  const messages = [];
  const normalizedCommand = normalize(bashCommand);

  if (
    toolName === "Bash" &&
    isBroadShell(bashCommand) &&
    (normalizedCommand.toLowerCase().includes("/prism") ||
      normalizedCommand.toLowerCase().includes("/mcp-server") ||
      normalizedCommand.toLowerCase().includes("h:/"))
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
    messages.push(
      "Doctrine/command surface: verify the command bridge and MCP directive before teaching a new manual workflow.",
    );
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
    messages = await getRegexSuggestions(toolName, filePath, bashCommand);
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
