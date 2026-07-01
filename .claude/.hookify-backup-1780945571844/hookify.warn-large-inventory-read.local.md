# Hookify Rule: Warn on Large Inventory File Read
type: warn
event: PreToolUse
tool: Read

## Pattern
Matches when reading SYSTEM_INVENTORY.md or MASTER_INDEX.md — large files that
can be replaced by quick-ref.json for most use cases.

## Condition
file_path contains "SYSTEM_INVENTORY.md" OR file_path contains "MASTER_INDEX.md"

## Message
TOKEN SAVE: Consider reading `data/quick-ref.json` (35 lines) instead of this large file. Use /boot or /status for compact system info. Only read full inventory for deep audits.
