# Hookify Rule: Warn on reading MEMORY.md repeatedly
type: warn
event: PreToolUse
tool: Read

## Pattern
Warns when reading MEMORY.md more than once — it's already loaded in context via CLAUDE.md system.

## Condition
file_path endsWith "memory/MEMORY.md"

## Message
TOKEN SAVE: MEMORY.md is automatically loaded into every conversation context. Its content is already available — no need to re-read it. Only read it if you need to Edit it.
