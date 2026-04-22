/**
 * safety-gates.mjs — Phase 1-B: Pre-task safety validation
 *
 * PreToolUse hook for Task creation. Checks task descriptions for
 * potentially risky operations and injects safety reminders.
 *
 * NOT a blocker — injects additionalContext warnings only.
 * Blocking is the user's decision, not the hook's.
 */

const TOOL_INPUT = process.env.TOOL_INPUT || "{}";

const RISKY_PATTERNS = [
  { pattern: /\b(delete|remove|drop|destroy|purge)\b/i, label: "destructive operation" },
  { pattern: /\b(force.?push|reset\s+--hard|checkout\s+\.)\b/i, label: "git destructive" },
  { pattern: /\b(rm\s+-rf|rmdir)\b/i, label: "filesystem destructive" },
  { pattern: /\b(deploy|release|publish|push\s+to\s+(prod|main|master))\b/i, label: "external effect" },
  { pattern: /\b(credentials?|secret|api.?key|password|token)\b/i, label: "sensitive data" },
  { pattern: /\b(migration|schema\s+change|alter\s+table)\b/i, label: "schema migration" }
];

function main() {
  let input;
  try {
    input = JSON.parse(TOOL_INPUT);
  } catch {
    return; // Can't parse — skip
  }

  const text = [input.subject, input.description, input.activeForm]
    .filter(Boolean)
    .join(" ");

  if (!text) return;

  const matched = RISKY_PATTERNS.filter(({ pattern }) => pattern.test(text));

  if (matched.length === 0) return;

  const labels = matched.map(m => m.label).join(", ");
  process.stdout.write(JSON.stringify({
    additionalContext: `[safety-gate] Task involves: ${labels}. Confirm with user before executing destructive or externally-visible actions. This is a reminder, not a block.`
  }));
}

main();
