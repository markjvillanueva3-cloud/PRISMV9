#!/usr/bin/env node
/**
 * write-success-compressor.mjs — PostToolUse hook for Edit|Write
 *
 * Compresses verbose file operation success messages:
 *   "The file X has been updated successfully. (file state is current...)"
 *   → "✓ X updated"
 *
 * Saves 20-40% on file operation confirmations.
 */

import { readFileSync } from "node:fs";
import process from "node:process";

// Parse stdin for hook input
let stdinInput = {};
try {
  const stdin = readFileSync(0, "utf-8").trim();
  if (stdin) stdinInput = JSON.parse(stdin);
} catch { /* No stdin */ }

// Path shortening for file paths
const PATH_SHORTENINGS = [
  [/[Hh]:[\\\/]prism[\\\/]mcp-server[\\\/]src[\\\/]/g, "src/"],
  [/[Hh]:[\\\/]prism[\\\/]mcp-server[\\\/]/g, "mcp-server/"],
  [/[Hh]:[\\\/]prism[\\\/]\.claude[\\\/]/g, ".claude/"],
  [/[Hh]:[\\\/]prism[\\\/]/g, ""],
  [/[Hh]:[\\\/]\.claude[\\\/]/g, "~/.claude/"],
];

function shortenPath(filePath) {
  let result = filePath;
  for (const [pattern, replacement] of PATH_SHORTENINGS) {
    result = result.replace(pattern, replacement);
  }
  // Convert backslashes to forward slashes
  return result.replace(/\\/g, "/");
}

function collectOutputText() {
  const parts = [];
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string" && value.length > 0 && (
      key === "TOOL_RESULT" || key === "TOOL_OUTPUT" ||
      key.startsWith("TOOL_RESULT_") || key.startsWith("TOOL_OUTPUT_")
    )) {
      parts.push(value);
    }
  }
  return parts.join("\n");
}

function main() {
  const toolInput = stdinInput.tool_input || {};
  const toolName = stdinInput.tool_name || process.env.TOOL_NAME || "";
  const filePath = toolInput.file_path || process.env.TOOL_INPUT_file_path || "";
  const output = collectOutputText();

  // Only process Write/Edit tools
  if (!["Write", "Edit", "MultiEdit"].includes(toolName)) {
    process.stdout.write("{}");
    return;
  }

  // Check for success patterns
  const isSuccess = output.includes("successfully") ||
                    output.includes("has been updated") ||
                    output.includes("has been created") ||
                    output.includes("File created");

  if (!isSuccess || output.length < 50) {
    process.stdout.write("{}");
    return;
  }

  // Build compact confirmation
  const shortPath = shortenPath(filePath);
  const action = output.includes("created") ? "created" : "updated";
  const compact = `✓ ${shortPath} ${action}`;

  const savedChars = output.length - compact.length;
  const savedPct = Math.round((savedChars / output.length) * 100);

  if (savedPct > 20) {
    process.stdout.write(JSON.stringify({
      additionalContext: `[${savedPct}% condensed: ${compact}]`,
    }));
  } else {
    process.stdout.write("{}");
  }
}

main();
