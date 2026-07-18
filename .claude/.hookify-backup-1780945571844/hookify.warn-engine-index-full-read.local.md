# Hookify Rule: Warn on full engines/index.ts read
type: warn
event: PreToolUse
tool: Read

## Pattern
Matches when reading the full engines barrel file (2300+ lines).

## Condition
file_path contains "engines/index.ts"

## Message
TOKEN SAVE: engines/index.ts is 2300+ lines. Use contextDigestEngine.oneLiner() for file summaries, or Grep for specific exports. Only read index.ts for wiring new engines.
