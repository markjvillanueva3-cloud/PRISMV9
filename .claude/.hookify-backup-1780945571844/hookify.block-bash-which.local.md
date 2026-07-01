# Hookify Rule: Block which/type/command -v queries
type: block
event: PreToolUse
tool: Bash

## Pattern
Blocks which/type/command checks — standard tools are always available.

## Condition
command matches "^(which|type|command -v) (node|npm|npx|git|python|tsc|vitest|jest)"

## Message
TOKEN SAVE: Standard dev tools (node/npm/git/python/tsc) are always available. Skip existence checks.
