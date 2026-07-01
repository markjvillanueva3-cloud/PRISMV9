# Hookify Rule: Block Grep on entire codebase without type filter
type: warn
event: PreToolUse
tool: Grep

## Pattern
Warns when Grep searches the entire codebase without a type or glob filter — matches too many files.

## Condition
output_mode is "content" AND no path AND no glob AND no type parameter set

## Message
TOKEN SAVE: Grep content-mode on entire codebase without type/glob/path filter. Add path, glob, or type to narrow scope (~2-10K tokens saved).
