#!/usr/bin/env node
// DISABLED_TOKEN_REDUX_2026_04_23: short-circuited by user-approved token-reduction pass.
// Remove the next 2 lines to re-enable. See .claude/helpers/apply-hook-fixes.mjs
process.stdout.write(JSON.stringify({ continue: true })); process.exit(0);
/**
 * mcp-route-suggest.mjs
 * ---------------------
 * Compact PreToolUse router that nudges PRISM work toward existing MCP, helper,
 * and audit-chain surfaces before broad shell churn expands token cost.
 */

const PRISM_ROOT = "H:/PRISM";
const MCP_ROOT = "H:/PRISM/mcp-server";
const AUDIT_CHAIN_CMD =
  "npx tsx H:/PRISM/mcp-server/scripts/run-dev-audit-chain.ts --edited-file <path>";

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

async function main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); }) {
  const input = await readStdin();
  const toolName = input.tool_name || input.toolName || "";
  const toolInput = input.tool_input || input.input || {};
  const messages = [];

  if (!["Bash", "Read", "Edit", "Write", "MultiEdit"].includes(toolName)) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const filePath = getFilePath(toolInput);
  const bashCommand = getBashCommand(toolInput);
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
