# Hookify Rule: Warn on du -sh without limiting
type: warn
event: PreToolUse
tool: Bash

## Pattern
Warns when du runs on broad paths — can scan entire disk producing huge output.

## Condition
command matches "^du " AND command does NOT contain "| head" AND command does NOT contain "| tail" AND command does NOT contain "| sort"

## Message
TOKEN SAVE: du can produce massive output. Add `| sort -rh | head -20` or limit to a specific directory.
