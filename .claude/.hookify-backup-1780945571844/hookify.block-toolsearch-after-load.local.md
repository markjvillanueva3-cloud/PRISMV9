# Hookify Rule: Block redundant ToolSearch select: calls
type: block
event: PreToolUse
tool: ToolSearch

## Pattern
Blocks ToolSearch select: calls for tools already loaded this session.

## Condition
Temporal check — implemented in pretooluse-unified.sh. Tracks loaded tools in /tmp/claude-tools-loaded. Blocks if all requested tools already in file.

## Message
TOKEN SAVE: Tool(s) already loaded this session. Call them directly without re-selecting.
