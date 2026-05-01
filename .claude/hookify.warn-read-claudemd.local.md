# Hookify Rule: Warn on reading CLAUDE.md files
type: warn
event: PreToolUse
tool: Read

## Pattern
Warns when reading CLAUDE.md — it's already loaded as system context.

## Condition
file_path endsWith "CLAUDE.md"

## Message
TOKEN SAVE: CLAUDE.md content is automatically loaded as system instructions. You already have it in context — no need to re-read unless editing.
