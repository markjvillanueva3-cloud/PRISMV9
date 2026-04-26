/**
 * compact-counter.mjs — Phase 1-A: Strategic compaction reminder
 *
 * PostToolUse universal hook. Counts tool calls and suggests /compact
 * at thresholds (50, 75, 100). Samples every 10th call for 90% cost
 * reduction — uses in-memory counter for fast-path exit on 9/10 calls.
 *
 * Depends on: tool-counter.mjs (Phase 0-A)
 * Family-agnostic: fires for both Claude and Codex.
 */

import { increment } from "./tool-counter.mjs";

const THRESHOLDS = [50, 75, 100];
// Width of the firing window after each threshold. Fires once for the
// SAMPLE_RATE calls immediately after crossing, then goes quiet until the
// next threshold (or the >100 every-25 reminder below).
const SAMPLE_RATE = 10;

async function main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); }) {
  // Each hook invocation is a separate process — always increment on disk.
  // The hook runs async:true so disk I/O doesn't block the user.
  const count = await increment("tool_calls_session");

  // Check thresholds
  for (const threshold of THRESHOLDS) {
    // Fire when crossing a threshold (within the sample window)
    if (count >= threshold && count < threshold + SAMPLE_RATE) {
      const urgency = count >= 100 ? "HIGH" : count >= 75 ? "MEDIUM" : "LOW";
      const msg = count >= 100
        ? `COMPACTION STRONGLY RECOMMENDED: ${count} tool calls this session. Context window is likely under pressure. Run /compact now.`
        : count >= 75
          ? `Compaction suggested: ${count} tool calls. Consider /compact soon to preserve context quality.`
          : `FYI: ${count} tool calls this session. /compact available if context feels heavy.`;

      process.stdout.write(JSON.stringify({
        additionalContext: `[compact-counter] ${urgency}: ${msg}`
      }));
      return;
    }
  }

  // Past all thresholds — remind every 25 calls
  if (count > 100 && count % 25 === 0) {
    process.stdout.write(JSON.stringify({
      additionalContext: `[compact-counter] HIGH: ${count} tool calls without compaction. Run /compact to avoid context degradation.`
    }));
  }
}

main().catch(() => {
  // Silent failure — never block tool execution
});
