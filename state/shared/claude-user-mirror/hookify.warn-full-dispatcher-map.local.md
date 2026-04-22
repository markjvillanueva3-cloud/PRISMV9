# Hookify Rule: Warn on full dispatcher file reads
type: warn
event: PreToolUse
tool: Read

## Pattern
Matches when reading a dispatcher file to discover actions — use DispatcherMapEngine instead.

## Condition
file_path contains "dispatchers/" AND file_path endsWith ".ts"

## Message
TOKEN SAVE: Use DispatcherMapEngine.searchActions(query) or DispatcherMapEngine.findAction(name) instead of reading dispatcher source files. The engine indexes all 55 dispatchers and 1650+ actions with 60s caching.
