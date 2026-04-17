# Hookify Rule: Block redundant ToolSearch
type: block
event: PreToolUse
tool: ToolSearch

## Pattern
Blocks ToolSearch when the tool was already loaded via a previous keyword search.

## Condition
query starts with "select:" AND the tool name was already returned by a prior ToolSearch in this session

## Message
TOKEN SAVE: This tool was already loaded by a previous ToolSearch. Call it directly.
