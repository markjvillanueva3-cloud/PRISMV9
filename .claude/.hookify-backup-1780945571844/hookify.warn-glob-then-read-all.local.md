# Hookify Rule: Warn on reading every Glob result
type: warn
event: PreToolUse
tool: Read

## Pattern
Warns when attempting to read many files sequentially (likely reading all Glob results).

## Condition
Multiple Read calls to files matching same pattern within 30s (tracked via burst counter)

## Message
TOKEN SAVE: Reading many files sequentially. Consider using Grep to search across files, or Agent for batch analysis.
