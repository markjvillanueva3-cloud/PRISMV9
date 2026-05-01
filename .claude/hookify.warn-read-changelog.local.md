# Hookify Rule: Warn on reading CHANGELOG files
type: warn
event: PreToolUse
tool: Read

## Pattern
Warns when reading CHANGELOG/HISTORY files — these are often very large and rarely useful.

## Condition
file_path matches "(CHANGELOG|HISTORY|CHANGES)\.(md|txt|rst)$" (case insensitive)

## Message
TOKEN SAVE: CHANGELOG files are often 5-50K+ tokens. Use Grep for specific version entries instead of reading the whole file.
