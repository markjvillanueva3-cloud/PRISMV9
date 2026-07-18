#!/usr/bin/env node
// tier: T2
/**
 * prompt-rewriter-health-warn.mjs — UserPromptSubmit hook
 *
 * PSN-PROMPT-REWRITER-FIX/U-PRF02 (2026-05-24, slot:alpha)
 *
 * WHY: prompt-rewriter-ollama.mjs silently degrades to no-op on every failure
 * path (by design — never blocks the prompt). Empirical 2026-05-24: 200/200
 * recent calls failed (106 ollama-offline + 94 timeout) → 100% silent skip
 * for hours. The user had no idea the system was dead. R12 violation.
 *
 * This hook reads the rewriter's JSONL log, computes the skip-rate across
 * the last N entries, and injects a 1-line warning when ≥SKIP_RATE_FLOOR.
 *
 * Knobs:
 *   PRISM_REWRITER_HEALTH_WARN_DISABLE=1
 *   PRISM_REWRITER_HEALTH_WINDOW=N           (default 50)
 *   PRISM_REWRITER_HEALTH_FLOOR=0.0-1.0      (default 0.85)
 */

import { readFileSync, existsSync, statSync } from "node:fs";

const LOG_PATH = "H:/prism/.claude/cache/prompt-rewrites.jsonl";
const DEFAULT_WINDOW = 50;
const DEFAULT_FLOOR = 0.85;
const MAX_READ_BYTES = 200_000; // tail-read cap so we don't slurp a 100MB log

function pass() { process.stdout.write(JSON.stringify({ continue: true })); }

function tailRead(filePath, maxBytes) {
  try {
    const st = statSync(filePath);
    if (st.size === 0) return "";
    const offset = Math.max(0, st.size - maxBytes);
    const buf = readFileSync(filePath, { encoding: "utf8" });
    return buf.length > maxBytes ? buf.slice(buf.length - maxBytes) : buf;
  } catch { return ""; }
}

function summarizeRecent(jsonlText, windowN) {
  const lines = jsonlText.split("\n").filter(Boolean);
  const recent = lines.slice(-windowN);
  if (recent.length === 0) return null;
  let skipped = 0;
  const reasonCounts = {};
  for (const line of recent) {
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }
    if (entry.skip_reason || !entry.rewrite) {
      skipped += 1;
      const r = entry.skip_reason || "unknown";
      reasonCounts[r] = (reasonCounts[r] || 0) + 1;
    }
  }
  return { total: recent.length, skipped, skipRate: skipped / recent.length, reasonCounts };
}

function main() {
  if (process.env.PRISM_REWRITER_HEALTH_WARN_DISABLE === "1") return pass();
  if (!existsSync(LOG_PATH)) return pass();

  const windowN = parseInt(process.env.PRISM_REWRITER_HEALTH_WINDOW || String(DEFAULT_WINDOW), 10);
  const floor = parseFloat(process.env.PRISM_REWRITER_HEALTH_FLOOR || String(DEFAULT_FLOOR));

  const txt = tailRead(LOG_PATH, MAX_READ_BYTES);
  if (!txt) return pass();

  const summary = summarizeRecent(txt, windowN);
  if (!summary || summary.total < 10) return pass(); // not enough data
  if (summary.skipRate < floor) return pass();        // healthy

  const topReason = Object.entries(summary.reasonCounts).sort((a, b) => b[1] - a[1])[0];
  const pct = Math.round(summary.skipRate * 100);
  const additionalContext = [
    `## ⚠ prompt-rewriter-ollama is silently broken`,
    `Last ${summary.total} calls: **${summary.skipped} skipped (${pct}%)**. Top reason: \`${topReason ? topReason[0] : "?"}\` (${topReason ? topReason[1] : 0}/${summary.total}).`,
    `Likely cause: Ollama \`/api/chat\` is dead (GPU contention from NIM endpoints or daemon stuck). Fix: \`curl -s http://127.0.0.1:11434/api/tags\` works but \`/api/chat\` will hang. Restart Ollama or free GPU.`,
    `_Disable this banner: \`PRISM_REWRITER_HEALTH_WARN_DISABLE=1\` · Threshold: \`PRISM_REWRITER_HEALTH_FLOOR=${floor}\`._`,
  ].join("\n");

  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext },
  }));
}

try { main(); } catch { pass(); }
