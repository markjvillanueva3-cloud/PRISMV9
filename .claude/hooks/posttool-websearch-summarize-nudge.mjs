#!/usr/bin/env node
// tier: T4
/**
 * posttool-websearch-summarize-nudge.mjs — PostToolUse hook (WebSearch)
 *
 * TOKEN-SAVINGS-EXPAND/U-PSN-WEBSEARCH-SUMMARIZE (gap-B5, 2026-05-23, slot:alpha)
 *
 * After a WebSearch returns, the result blob is typically several KB of
 * raw snippets. If the operator/model's next step is "summarize what we
 * found" or "extract X from these results", that's qwen2.5-coder:32b
 * territory per CLAUDE.md §AI SYSTEM ROUTING — zero Claude tokens.
 *
 * Pattern: PostToolUse → WebSearch → suggest Ollama summarize before
 * the next Claude turn that would inline-summarize.
 *
 * Advisory only. Knob: PRISM_WEBSEARCH_SUMMARIZE_DISABLE=1.
 */

import { readFileSync } from "node:fs";

/**
 * Pure: format the nudge text. Returns null when no nudge applies.
 * Exported for tests.
 */
export function formatWebSearchNudge(toolName, queryText) {
  if (toolName !== "WebSearch") return null;
  const q = String(queryText || "").trim();
  if (!q) return null;
  // Truncate query for display
  const qPreview = q.length > 80 ? q.slice(0, 77) + "..." : q;
  return [
    "## 🧠 WebSearch results — Ollama summarize candidate",
    "",
    `Search returned. Query: \`${qPreview}\`. If your next step is to *summarize*, *extract*, or *classify* findings from these results, route through Ollama:`,
    "",
    "→ `prism_dev:ollama_hook_query` with `hookType: \"general\"` and `prompt: \"summarize: <paste WebSearch results>\"`",
    "→ or `/ollama-bridge` skill",
    "",
    "_Claude needed only when synthesis crosses safety-critical surfaces. Disable: `PRISM_WEBSEARCH_SUMMARIZE_DISABLE=1`._",
  ].join("\n");
}

async function readStdin() {
  try { return JSON.parse(readFileSync(0, "utf8") || "{}"); }
  catch { return {}; }
}

function pass() { process.stdout.write(JSON.stringify({ continue: true })); }

async function main() {
  if (process.env.PRISM_WEBSEARCH_SUMMARIZE_DISABLE === "1") { pass(); return; }
  const input = await readStdin();
  const toolName = input.tool_name || input.toolName || "";
  const toolInput = input.tool_input || input.input || {};
  const query = String(toolInput.query || "");

  const nudge = formatWebSearchNudge(toolName, query);
  if (!nudge) { pass(); return; }

  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: nudge },
  }));
}

if (process.argv[1] && process.argv[1].endsWith("posttool-websearch-summarize-nudge.mjs")) {
  main().catch(() => pass());
}
