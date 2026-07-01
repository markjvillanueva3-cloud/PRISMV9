#!/usr/bin/env node
// tier: T4
/**
 * posttool-threshold-nudges.mjs — PostToolUse hook
 * Covers gaps B2 (slow Bash), B3 (Grep many-hits), B4 (Edit oversized), B6 (Task oversized-return).
 * Knob: PRISM_POSTTOOL_THRESHOLD_DISABLE=1
 */
import { readFileSync } from "node:fs";

export const THRESHOLDS = {
  bashSlowMs: 30000,           // B2: bash >30s → suggest background
  grepHitsHigh: 100,            // B3: grep result >100 lines → suggest narrow
  editLinesHigh: 50,            // B4: edit diff >50 lines → suggest split
  taskResultBytesHigh: 5120,    // B6: task return >5KB → suggest Ollama summarize before merge
};

export function classifyResultPattern(toolName, toolInput, toolResult, elapsedMs) {
  if (toolName === "Bash" && typeof elapsedMs === "number" && elapsedMs > THRESHOLDS.bashSlowMs) {
    return { gap: "B2", hint: `Slow Bash (${(elapsedMs/1000).toFixed(1)}s). Next time consider \`run_in_background:true\` to keep the main thread free.` };
  }
  if (toolName === "Grep" && typeof toolResult === "string") {
    const lines = toolResult.split("\n").length;
    if (lines > THRESHOLDS.grepHitsHigh) {
      return { gap: "B3", hint: `Grep returned ${lines} lines — consider narrowing with \`glob\`/\`type\` or \`output_mode:'files_with_matches'\`. \`prism_session:master_index_query\` is also slimmer.` };
    }
  }
  if ((toolName === "Edit" || toolName === "MultiEdit") && toolInput) {
    const content = String(toolInput.new_string || (toolInput.edits || []).map(e => e.new_string || "").join(""));
    const lines = content.split("\n").length;
    if (lines > THRESHOLDS.editLinesHigh) {
      return { gap: "B4", hint: `Edit added ${lines} lines. Consider splitting into multiple smaller logical commits — easier review + finer-grained rollback.` };
    }
  }
  if (toolName === "Task" && typeof toolResult === "string" && toolResult.length > THRESHOLDS.taskResultBytesHigh) {
    return { gap: "B6", hint: `Task returned ${Math.round(toolResult.length/1024)}KB. Before merging to main context, route through \`prism_dev:ollama_hook_query\` with \`hookType:"general"\` to summarize — Ollama not Claude.` };
  }
  return null;
}

export function formatNudge(classification) {
  if (!classification) return null;
  return `## 📊 Post-tool threshold nudge (${classification.gap})\n${classification.hint}\n_Disable: \`PRISM_POSTTOOL_THRESHOLD_DISABLE=1\`._`;
}

async function readStdin() {
  try { return JSON.parse(readFileSync(0, "utf8") || "{}"); } catch { return {}; }
}
function pass() { process.stdout.write(JSON.stringify({ continue: true })); }

async function main() {
  if (process.env.PRISM_POSTTOOL_THRESHOLD_DISABLE === "1") { pass(); return; }
  const input = await readStdin();
  const toolName = input.tool_name || input.toolName || "";
  const toolInput = input.tool_input || input.input || {};
  const toolResult = input.tool_response || input.toolResponse || input.tool_result || "";
  const elapsedMs = Number(input.duration_ms || input.durationMs || input.elapsed_ms || 0);
  const c = classifyResultPattern(toolName, toolInput, typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult), elapsedMs);
  const nudge = formatNudge(c);
  if (!nudge) { pass(); return; }
  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: nudge },
  }));
}

if (process.argv[1] && process.argv[1].endsWith("posttool-threshold-nudges.mjs")) {
  main().catch(() => pass());
}
