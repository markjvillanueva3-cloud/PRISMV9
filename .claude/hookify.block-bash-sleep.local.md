# Hookify Rule: Block sleep commands
type: block
event: PreToolUse
tool: Bash

## Pattern
Blocks sleep commands — they waste time and tokens while blocking.

## Condition
command matches "^sleep " OR command contains "; sleep " OR command contains "&& sleep "

## Message
TOKEN SAVE: Sleep commands waste time. Use run_in_background for long tasks, or just run the next command directly.
