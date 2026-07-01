# Hookify Rule: Warn on large tool output
type: warn
event: PostToolUse
tool: Bash

## Pattern
Matches when a tool produces output larger than 5000 characters.

## Condition
output_length > 5000

## Message
TOKEN SAVE: Large output detected. Consider using OutputBudgetEngine.enforce(data, preset("compact")) to trim results, or pipe through CompactFormatterEngine.compact() for 60-80% reduction.
