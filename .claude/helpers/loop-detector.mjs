import process from "node:process";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { appendLine, cachePath, readLines, writeLines } from "./hook-cache.mjs";

// Parse stdin for hook input
let stdinInput = {};
try {
  const stdin = readFileSync(0, "utf-8").trim();
  if (stdin) stdinInput = JSON.parse(stdin);
} catch { /* No stdin - fall back to env vars */ }

async function main() {
  const toolInput = stdinInput.tool_input || {};
  const toolName = stdinInput.tool_name || process.env.TOOL_NAME || "unknown";
  const inputSig = [
    toolInput.command || process.env.TOOL_INPUT_command || "",
    toolInput.file_path || process.env.TOOL_INPUT_file_path || "",
    toolInput.pattern || process.env.TOOL_INPUT_pattern || "",
    toolInput.prompt || process.env.TOOL_INPUT_prompt || "",
  ].join("");

  const digest = inputSig
    ? crypto.createHash("md5").update(`${toolName}:${inputSig}`).digest("hex")
    : "no-input";
  const fingerprint = `${toolName}:${digest}`;

  const historyFile = cachePath("tool-history");
  await appendLine(historyFile, fingerprint);
  const trimmedHistory = (await readLines(historyFile)).slice(-20);
  await writeLines(historyFile, trimmedHistory);

  let count = 0;
  for (let index = trimmedHistory.length - 1; index >= 0; index -= 1) {
    if (trimmedHistory[index] === fingerprint) {
      count += 1;
    } else {
      break;
    }
  }

  if (count >= 3) {
    process.stdout.write(
      JSON.stringify({
        additionalContext: `LOOP WARNING: You have called '${toolName}' with identical inputs ${count} times consecutively. This may indicate a loop. Consider a different approach or verify the previous calls succeeded.`,
      }),
    );
    return;
  }

  process.stdout.write(JSON.stringify({ continue: true }));
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true }));
});
