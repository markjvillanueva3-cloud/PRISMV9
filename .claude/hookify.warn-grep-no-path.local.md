# Hookify Rule: Warn on Grep content-mode without path restriction
type: warn
event: PreToolUse
tool: Grep

## Pattern
Warns when using Grep in content output_mode without specifying a path, which searches the entire codebase.

## Condition
output_mode = "content" AND path is empty

## Message
TOKEN SAVE: Grep content-mode without path restriction searches the entire codebase. Add a path parameter to narrow scope and reduce token output.
