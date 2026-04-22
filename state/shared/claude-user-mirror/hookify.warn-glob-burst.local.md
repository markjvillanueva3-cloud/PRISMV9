# Hookify Rule: Warn on rapid-fire Glob calls
type: warn
event: PreToolUse
tool: Glob

## Pattern
Warns when 3+ Glob calls target the same directory path within 30 seconds.

## Condition
Temporal check — implemented in pretooluse-unified.sh. Counts Glob calls per path via /tmp/claude-glob-burst-{hash} tracker.

## Message
TOKEN SAVE: Multiple Glob calls on same path in quick succession. Combine patterns with brace expansion (e.g., **/*.{ts,tsx,js}) or use a single broader pattern to reduce tool call overhead.
