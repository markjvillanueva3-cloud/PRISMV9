# Hookify Rule: Warn on reading full catalog data files
type: warn
event: PreToolUse
tool: Read

## Pattern
Warns when reading large catalog data files without offset/limit.

## Condition
file_path contains "catalog" AND file_path endsWith ".ts" AND NOT has limit/offset

## Message
TOKEN SAVE: Catalog files (tool catalogs, machine profiles, holders) are 5-50K+ tokens. Use Grep for specific entries or offset/limit for sections. Full reads waste significant context budget.
