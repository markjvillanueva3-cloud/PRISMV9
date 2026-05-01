# Hookify Rule: Warn on multiple rapid edits to same file
type: warn
event: PreToolUse
tool: Edit

## Pattern
Warns when editing the same file 3+ times in 60 seconds — suggests batching edits.

## Condition
Temporal check — implemented in pretooluse-unified.sh via /tmp/claude-edit-burst-{hash} tracker.

## Message
TOKEN SAVE: Multiple edits to same file in quick succession. Consider combining changes into a single larger Edit to reduce tool call overhead.
