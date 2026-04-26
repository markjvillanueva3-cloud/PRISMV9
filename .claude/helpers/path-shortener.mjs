#!/usr/bin/env node
/**
 * path-shortener.mjs — PostToolUse hook for Bash|Read
 *
 * Compresses long PRISM paths in output to shorter relative forms:
 *   H:\prism\mcp-server\src\engines\ → src/engines/
 *   H:/prism/mcp-server/src/ → src/
 *   /h/prism/mcp-server/ → mcp-server/
 *
 * Saves 5-15% on outputs with many file paths.
 */

import { readFileSync } from "node:fs";
import process from "node:process";

// Parse stdin for hook input
let stdinInput = {};
try {
  const stdin = readFileSync(0, "utf-8").trim();
  if (stdin) stdinInput = JSON.parse(stdin);
} catch { /* No stdin */ }

// Path patterns to compress (order matters - most specific first)
const PATH_REPLACEMENTS = [
  // Full paths to src-relative
  [/[Hh]:[\\\/]prism[\\\/]mcp-server[\\\/]src[\\\/]engines[\\\/]/g, "src/engines/"],
  [/[Hh]:[\\\/]prism[\\\/]mcp-server[\\\/]src[\\\/]tools[\\\/]dispatchers[\\\/]/g, "src/dispatchers/"],
  [/[Hh]:[\\\/]prism[\\\/]mcp-server[\\\/]src[\\\/]algorithms[\\\/]/g, "src/algorithms/"],
  [/[Hh]:[\\\/]prism[\\\/]mcp-server[\\\/]src[\\\/]schemas[\\\/]/g, "src/schemas/"],
  [/[Hh]:[\\\/]prism[\\\/]mcp-server[\\\/]src[\\\/]registries[\\\/]/g, "src/registries/"],
  [/[Hh]:[\\\/]prism[\\\/]mcp-server[\\\/]src[\\\/]hooks[\\\/]/g, "src/hooks/"],
  [/[Hh]:[\\\/]prism[\\\/]mcp-server[\\\/]src[\\\/]__tests__[\\\/]/g, "src/__tests__/"],
  [/[Hh]:[\\\/]prism[\\\/]mcp-server[\\\/]src[\\\/]data[\\\/]/g, "src/data/"],
  [/[Hh]:[\\\/]prism[\\\/]mcp-server[\\\/]src[\\\/]/g, "src/"],
  [/[Hh]:[\\\/]prism[\\\/]mcp-server[\\\/]/g, "mcp-server/"],
  [/[Hh]:[\\\/]prism[\\\/]\.claude[\\\/]helpers[\\\/]/g, ".claude/helpers/"],
  [/[Hh]:[\\\/]prism[\\\/]\.claude[\\\/]hooks[\\\/]/g, ".claude/hooks/"],
  [/[Hh]:[\\\/]prism[\\\/]\.claude[\\\/]/g, ".claude/"],
  [/[Hh]:[\\\/]prism[\\\/]state[\\\/]shared[\\\/]/g, "state/shared/"],
  [/[Hh]:[\\\/]prism[\\\/]state[\\\/]/g, "state/"],
  [/[Hh]:[\\\/]prism[\\\/]/g, "PRISM/"],

  // Unix-style paths (git bash, WSL)
  [/\/h\/prism\/mcp-server\/src\//g, "src/"],
  [/\/h\/prism\/mcp-server\//g, "mcp-server/"],
  [/\/h\/prism\//g, "PRISM/"],

  // Global claude paths
  [/[Hh]:[\\\/]\.claude[\\\/]/g, "~/.claude/"],
  [/[Cc]:[\\\/]Users[\\\/]\w+[\\\/]\.claude[\\\/]/g, "~/.claude/"],
];

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

function shortenPaths(text) {
  let result = text;
  for (const [pattern, replacement] of PATH_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function main() {
  const output = collectOutputText();

  // Only process if output has paths and is substantial
  if (output.length < 200) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  // Check if output contains PRISM paths
  const hasPrismPaths = /[Hh]:[\\\/]prism|\/h\/prism/i.test(output);
  if (!hasPrismPaths) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const shortened = shortenPaths(output);
  const savedChars = output.length - shortened.length;
  const savedPct = Math.round((savedChars / output.length) * 100);

  // Only inject if we saved at least 5%
  if (savedPct >= 5 && savedChars > 50) {
    process.stdout.write(JSON.stringify({
      additionalContext: `[Paths shortened: ${savedPct}% — ~${Math.round(savedChars / 4)} tokens. Full paths: H:\\prism\\mcp-server\\src\\ = src/]`,
    }));
  } else {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
}

main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); });
