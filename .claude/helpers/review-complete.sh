#!/usr/bin/env bash
# review-complete.sh — PostToolUse hook for Bash
# Detects when /prism-review has been run and resets the engine edit counter.
# This closes the 4-LOOP enforcement cycle: edits increment → review resets → edits allowed again.

set -euo pipefail

COMMAND="${TOOL_INPUT_command:-}"
COUNTER_FILE="H:/prism/state/session-edit-counter.json"

# Detect prism-review execution patterns
if ! echo "$COMMAND" | grep -qiE 'prism.review|prism_review|scrutin'; then
  echo "{}"
  exit 0
fi

# Reset the engine edit counter and increment review count using node
result=$(node -e "
const fs = require('fs');
const counterFile = '$COUNTER_FILE';

let d;
try {
  d = JSON.parse(fs.readFileSync(counterFile, 'utf8'));
} catch {
  d = {};
}

d.engine_edits_since_review = 0;
d.prism_review_count = (d.prism_review_count || 0) + 1;
fs.writeFileSync(counterFile, JSON.stringify(d, null, 2));

console.log(JSON.stringify({ additionalContext: 'REVIEW GATE RESET: Engine edit counter cleared. You may now edit more engine files. Next review required after 3 more engine edits.' }));
" 2>/dev/null || echo "{}")

echo "$result"
exit 0
