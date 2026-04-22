/**
 * safety-escalation.mjs — Phase 1-B: Post-task escalation detector
 *
 * PostToolUse hook for Task completions. Checks if a completed task
 * involved risky outcomes and flags for user awareness.
 *
 * Complements safety-gates.mjs (pre) with post-execution awareness.
 */

const TOOL_INPUT = process.env.TOOL_INPUT || "{}";
const TOOL_RESULT = process.env.TOOL_RESULT || "";

const ESCALATION_SIGNALS = [
  { pattern: /\berror\b.*\b(critical|fatal|crash)\b/i, level: "HIGH", label: "critical error in task output" },
  { pattern: /\b(timeout|timed?\s*out)\b/i, level: "MEDIUM", label: "timeout detected" },
  { pattern: /\b(permission denied|access denied|unauthorized)\b/i, level: "MEDIUM", label: "permission issue" },
  { pattern: /\b(data loss|corrupted?|truncated)\b/i, level: "HIGH", label: "potential data integrity issue" },
  { pattern: /\b(rollback|reverted?|undone?)\b/i, level: "LOW", label: "rollback occurred" }
];

function main() {
  const resultText = typeof TOOL_RESULT === "string" ? TOOL_RESULT : "";
  if (!resultText || resultText.length < 10) return;

  const matched = ESCALATION_SIGNALS.filter(({ pattern }) => pattern.test(resultText));
  if (matched.length === 0) return;

  const highest = matched.reduce((max, m) =>
    m.level === "HIGH" ? m : (max.level === "HIGH" ? max : m), matched[0]);

  const labels = matched.map(m => `${m.level}: ${m.label}`).join("; ");

  process.stdout.write(JSON.stringify({
    additionalContext: `[safety-escalation] Task result flagged — ${labels}. Review before proceeding.`
  }));
}

main();
