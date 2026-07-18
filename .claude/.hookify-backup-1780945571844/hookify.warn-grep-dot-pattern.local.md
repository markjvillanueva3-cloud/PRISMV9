# Hookify Rule: Warn on Grep with overly broad pattern
type: warn
event: PreToolUse
tool: Grep

## Pattern
Warns when Grep uses an extremely broad pattern like "." or ".*" that matches everything.

## Condition
pattern is "." or ".*" or ".+" (single char or match-all)

## Message
TOKEN SAVE: Grep pattern is too broad and will match everything. Use a specific pattern to reduce output tokens.
