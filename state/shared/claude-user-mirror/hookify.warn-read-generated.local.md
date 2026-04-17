# Hookify Rule: Warn on reading generated/compiled files
type: warn
event: PreToolUse
tool: Read

## Pattern
Warns when reading files that appear to be auto-generated.

## Condition
file_path matches "(\.generated\.|\.g\.|_generated|auto-generated)" OR file_path ends with ".d.ts"

## Message
TOKEN SAVE: This looks like a generated file. Read the source file instead — generated files waste tokens and will be overwritten.
