# Hookify Rule: Warn when grepping a file you just read
type: warn
event: PreToolUse
tool: Grep

## Pattern
Warns when Grep targets a specific file that was Read within the last 90 seconds.

## Condition
Temporal check — implemented in pretooluse-unified.sh. Checks /tmp/claude-read-{hash} tracker set by Read tool dedup logic.

## Message
TOKEN SAVE: You already Read this file recently. Search the content you already have in context instead of re-fetching via Grep (~500-2K tokens saved).
