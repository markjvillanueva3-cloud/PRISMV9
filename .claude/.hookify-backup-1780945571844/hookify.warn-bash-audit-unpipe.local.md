# Hookify Rule: Warn on npm audit without output pipe
type: warn
event: PreToolUse
tool: Bash

## Pattern
Warns when npm audit runs without output limiting — produces 5-50K tokens.

## Condition
command matches "^npm audit" AND command does NOT contain "|"

## Message
TOKEN SAVE: npm audit produces massive output. Pipe through `| head -30` or use `--json | head -50`.
