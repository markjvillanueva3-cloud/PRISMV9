#!/usr/bin/env bash
# review-gate.sh — PreToolUse hook for Write/Edit
# BLOCKS engine file edits when engine_edits_since_review exceeds threshold
# without a /prism-review run. Forces the V24 4-LOOP protocol.
#
# Reads/writes: H:/prism/state/session-edit-counter.json
# Outputs: JSON with decision:"block" if review is overdue

set -euo pipefail

# Use portable path (H: = portable SSD)
COUNTER_FILE="H:/prism/state/session-edit-counter.json"
FILE_PATH="${TOOL_INPUT_file_path:-}"
MAX_EDITS_WITHOUT_REVIEW=3

# Only gate engine files in mcp-server/src/engines/
if ! echo "$FILE_PATH" | grep -qE 'mcp-server/src/engines/.*\.ts$'; then
  echo "{}"
  exit 0
fi

# Skip test files — those should always be editable
if echo "$FILE_PATH" | grep -qE '\.(test|spec)\.ts$'; then
  echo "{}"
  exit 0
fi

# Use node for JSON ops (available from npm, handles Windows paths correctly)
result=$(node -e "
const fs = require('fs');
const counterFile = '$COUNTER_FILE';
const filePath = '$FILE_PATH'.replace(/\\\\/g, '/');
const maxEdits = $MAX_EDITS_WITHOUT_REVIEW;

let d;
try {
  d = JSON.parse(fs.readFileSync(counterFile, 'utf8'));
} catch {
  d = { session_date: new Date().toISOString().slice(0,10), edit_count: 0, engine_edits_since_review: 0, engines_written: [], test_files_written: [], prism_review_count: 0, last_compact: '' };
}

const edits = d.engine_edits_since_review || 0;
const reviews = d.prism_review_count || 0;

if (edits >= maxEdits) {
  const filename = filePath.split('/').pop();
  const msg = 'REVIEW GATE BLOCKED: You have edited ' + edits + ' engine files without running /prism-review. The V24 roadmap protocol requires the 4-LOOP cycle: BUILD → SCRUTINIZE → GAP FILL. Run /prism-review on your changes before editing more engines. Reviews completed this session: ' + reviews + '. Blocked file: ' + filename;
  console.log(JSON.stringify({ decision: 'block', reason: msg }));
} else {
  // Increment counter
  d.engine_edits_since_review = edits + 1;
  d.edit_count = (d.edit_count || 0) + 1;
  if (!d.engines_written) d.engines_written = [];
  if (!d.engines_written.includes(filePath)) d.engines_written.push(filePath);
  fs.writeFileSync(counterFile, JSON.stringify(d, null, 2));

  const remaining = maxEdits - edits - 1;
  if (remaining <= 1) {
    console.log(JSON.stringify({ additionalContext: 'REVIEW REMINDER: ' + (edits + 1) + '/' + maxEdits + ' engine edits used. Run /prism-review soon or next engine edit will be BLOCKED.' }));
  } else {
    console.log('{}');
  }
}
" 2>/dev/null || echo "{}")

echo "$result"
exit 0
