# Hookify Rule: Block git add -A / git add .
type: block
event: PreToolUse
tool: Bash

## Pattern
Blocks `git add -A` and `git add .` which can stage secrets, large files, or unrelated changes.

## Condition
command matches "git add (-A|\.)" AND NOT command matches "git add -A --dry-run"

## Message
SAFETY + TOKEN SAVE: git add -A / git add . stages everything including secrets and unrelated files. Stage specific files by name instead.
