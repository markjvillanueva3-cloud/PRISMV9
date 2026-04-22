# Hookify Rule: Block ps aux without filter
type: warn
event: PreToolUse
tool: Bash

## Pattern
Warns when ps aux runs without grep filter — lists all processes.

## Condition
command matches "^ps (aux|ef)" AND command does NOT contain "| grep"

## Message
TOKEN SAVE: ps aux lists all processes (~200+ lines). Add `| grep <process>` to filter, or use `pgrep <name>`.
