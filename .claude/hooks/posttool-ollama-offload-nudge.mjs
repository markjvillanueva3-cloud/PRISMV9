#!/usr/bin/env node
// tier: T4
/**
 * posttool-ollama-offload-nudge.mjs — PostToolUse hook
 *
 * TOKEN-SAVINGS-PIVOT/U-PSN-OLLAMA-POSTREAD (iter15-#2, 2026-05-23, slot:alpha)
 *
 * Gap-fill #2 of the 5-fill PSN goal. After a Read of a large file
 * (CLAUDE.md, ENGINE_DIGEST, MEMORY.md, large engine, etc.), suggest
 * routing the next summarize/explain pass through Ollama
 * (prism_dev:ollama_hook_query with hookType='code_explain') instead of
 * Claude. Directly attacks the 9% → 30% offload-rate gap; the iter4
 * verb-trigger only catches bare prose, this catches the dominant
 * pattern (large Read followed by implicit summarization).
 *
 * Fires only when:
 *   - tool was Read
 *   - file matches isLargeRead pattern (large doc/digest/index)
 *   - PRISM_OLLAMA_POSTREAD_DISABLE != "1"
 *
 * Pure-function eligibility export for tests.
 */

import { readFileSync } from "node:fs";

// Reuses the same isLargeRead pattern from mcp-route-suggest.mjs so behavior
// is consistent. Inlining here (rather than importing) keeps this hook
// standalone — no circular dependencies with PreToolUse hook stack.
export function isLargeRead(filePath) {
  if (!filePath || typeof filePath !== "string") return false;
  const p = filePath.replace(/\\/g, "/");
  return /(?:^|\/)(?:ENGINE_DIGEST|DISPATCHER_DIGEST|DIRECTORY_DIGEST|PRISM-INVENTORY-LATEST|BASELINE_INVENTORY|CODE_SYSTEM_INDEX|MEMORY|CLAUDE)\.(?:md|json)$/i.test(p)
    || /(?:^|\/)knowledge\/wiki\/index\.md$/i.test(p);
}

/**
 * Pure: produce the offload-nudge text. Exported for tests. Returns null
 * when no nudge applies.
 */
export function formatOffloadNudge(toolName, filePath) {
  if (toolName !== "Read") return null;
  if (!isLargeRead(filePath)) return null;
  return [
    "## 🧠 Ollama offload candidate (post-Read of large doc)",
    "",
    "You just Read a large digest/index/CLAUDE-level doc. If your next step is to *summarize*, *explain*, or *classify* its contents, route through Ollama for zero Claude tokens:",
    "",
    "→ `prism_dev:ollama_hook_query` with `hookType: \"code_explain\"` and `prompt: \"summarize <relevant section>\"`",
    "→ or `/ollama-bridge` skill",
    "",
    "_Claude only needed when the summary feeds safety-critical reasoning. Disable: `PRISM_OLLAMA_POSTREAD_DISABLE=1`._",
  ].join("\n");
}

async function readStdin() {
  try { return JSON.parse(readFileSync(0, "utf8") || "{}"); }
  catch { return {}; }
}

function pass() { process.stdout.write(JSON.stringify({ continue: true })); }

async function main() {
  if (process.env.PRISM_OLLAMA_POSTREAD_DISABLE === "1") { pass(); return; }
  const input = await readStdin();
  const toolName = input.tool_name || input.toolName || "";
  const toolInput = input.tool_input || input.input || {};
  const filePath = String(toolInput.file_path || toolInput.filePath || "");

  const nudge = formatOffloadNudge(toolName, filePath);
  if (!nudge) { pass(); return; }

  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: nudge,
    },
  }));
}

if (process.argv[1] && process.argv[1].endsWith("posttool-ollama-offload-nudge.mjs")) {
  main().catch(() => pass());
}
