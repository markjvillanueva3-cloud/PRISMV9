import path from "node:path";
import process from "node:process";
import { appendLine, cachePath } from "./hook-cache.mjs";

function basenameSafe(target) {
  try {
    return path.basename(target);
  } catch {
    return "";
  }
}

async function main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); }) {
  const toolName = process.env.TOOL_NAME ?? "unknown";
  const toolInput =
    process.env.TOOL_INPUT_command ??
    process.env.TOOL_INPUT_file_path ??
    process.env.TOOL_INPUT_pattern ??
    "";
  const toolError = process.env.TOOL_ERROR ?? "";

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
