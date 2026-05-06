import path from "node:path";
import process from "node:process";
import { readFileSync } from "node:fs";
import { appendLine, cachePath } from "./hook-cache.mjs";

const STDIN_FD = 0;

function basenameSafe(target) {
  try {
    return path.basename(target);
  } catch {
    return "";
  }
}

/**
 * Read the Claude Code hook envelope from stdin.
 *
 * Modern contract: hooks receive a JSON envelope on stdin like
 *   {tool_name, tool_input: {command|file_path|pattern|...},
 *    tool_response: {output, is_error, ...}, hook_event_name, session_id}
 *
 * Legacy contract: env vars TOOL_NAME / TOOL_INPUT_* / TOOL_ERROR.
 *
 * The legacy contract has been dead since ~2026-03-28 04:09 UTC, which is when
 * every appended row in cache/error-log went to {tool:"unknown",input:"",error:""}.
 * We read stdin first, fall back to env vars only if stdin is empty/invalid.
 */
function readEnvelope() {
  let raw = "";
  try {
    raw = readFileSync(STDIN_FD, "utf8");
  } catch {
    raw = "";
  }
  if (raw && raw.trim().length > 0) {
    try {
      const j = JSON.parse(raw);
      if (j && typeof j === "object") return j;
    } catch {
      // fall through to env-var fallback
    }
  }
  return null;
}

function pickToolInput(toolInput) {
  if (!toolInput || typeof toolInput !== "object") return "";
  return (
    toolInput.command ||
    toolInput.file_path ||
    toolInput.pattern ||
    toolInput.url ||
    toolInput.notebook_path ||
    ""
  );
}

function pickToolError(envelope) {
  if (!envelope) return "";
  const tr = envelope.tool_response;
  if (tr && typeof tr === "object") {
    if (tr.is_error && typeof tr.output === "string") return tr.output.slice(0, 2000);
    if (typeof tr.error === "string") return tr.error.slice(0, 2000);
    if (typeof tr.stderr === "string" && tr.stderr) return tr.stderr.slice(0, 2000);
  }
  if (typeof envelope.error === "string") return envelope.error.slice(0, 2000);
  return "";
}

async function main() {
  const envelope = readEnvelope();

  let toolName, toolInput, toolError;
  if (envelope) {
    toolName = envelope.tool_name || envelope.toolName || "unknown";
    toolInput = pickToolInput(envelope.tool_input || envelope.toolInput);
    toolError = pickToolError(envelope);
  } else {
    // Legacy fallback (kept for backward compat with any harness still
    // setting these env vars).
    toolName = process.env.TOOL_NAME ?? "unknown";
    toolInput =
      process.env.TOOL_INPUT_command ??
      process.env.TOOL_INPUT_file_path ??
      process.env.TOOL_INPUT_pattern ??
      "";
    toolError = process.env.TOOL_ERROR ?? "";
  }

  await appendLine(
    cachePath("error-log"),
    JSON.stringify({
      timestamp: new Date().toISOString(),
      tool: toolName,
      input: toolInput,
      error: toolError,
    }),
  );

  let hint = "";
  if (toolName === "Bash" && toolInput.includes("npm run build")) {
    hint = "BUILD FAILED: Try 'npx tsc --noEmit' to see TypeScript errors. Check for import/export mismatches. Last successful build log is in the hook cache/session summaries.";
  }
  if (toolName === "Bash" && (toolInput.includes("vitest") || toolInput.includes("npm test"))) {
    hint = "TESTS FAILED: Run a specific test with 'npx vitest run {file}' to isolate. Check test output for assertion details. Previous test count baseline: 111.";
  }
  if (["Read", "Write", "Edit"].includes(toolName) && toolInput) {
    const basenameFile = basenameSafe(toolInput);
    if (basenameFile) {
      hint = `FILE ERROR on '${basenameFile}': search with a file-name query or Glob pattern like '**/${basenameFile}'. PRISM source is in mcp-server/src/. Config lives in .claude/.`;
    }
  }
  if (toolName === "Glob" || toolName === "Grep") {
    hint = "SEARCH FAILED: Try broadening the pattern. PRISM source is in H:\\prism\\mcp-server\\src\\. Check whether the path exists. Use content search for text and file-name search for paths.";
  }
  if (toolName === "Bash" && toolInput.includes("git ")) {
    hint = "GIT ERROR: Check 'git status' for current state. If merge conflicts exist, resolve them deliberately. If detached HEAD is involved, inspect branch state before continuing.";
  }
  if (toolName === "Bash" && toolInput.includes("JSON.parse")) {
    hint = "JSON PARSE ERROR: Validate with a small Node parse check. Look for trailing commas, missing quotes, or BOM characters.";
  }
  if (`${toolInput} ${toolError}`.toLowerCase().includes("permission denied")) {
    hint = "PERMISSION DENIED: Check file protections and file attributes. Protected inventory/health files may be blocked on purpose. Scripts may need execute permissions in their host environment.";
  }

  if (hint) {
    process.stdout.write(
      JSON.stringify({
        additionalContext: `RECOVERY HINT: ${hint}`,
      }),
    );
    return;
  }

  process.stdout.write(JSON.stringify({ continue: true }));
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true }));
});
