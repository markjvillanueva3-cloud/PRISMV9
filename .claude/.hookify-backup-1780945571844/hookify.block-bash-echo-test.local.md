# Hookify Rule: Block echo for testing
type: block
event: PreToolUse
tool: Bash

## Pattern
Blocks echo/printf used just for testing or confirming something works.

## Condition
command matches "^echo (test|hello|hi|ok|done|working)" OR command is exactly "echo" OR command matches "^printf '(test|hello)'"

## Message
TOKEN SAVE: No need to echo test strings. Just proceed with the actual command.
