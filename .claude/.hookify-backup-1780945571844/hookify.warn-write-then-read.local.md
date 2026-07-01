# Hookify Rule: Warn on Write then Read same file
type: block
event: PreToolUse
tool: Read

## Pattern
Blocks reading a file that was just written — you already know the content since you wrote it.

## Condition
File was written/created within last 60s (tracked via /tmp/claude-edited-{hash})

## Message
TOKEN SAVE: This file was just written/created. You know its contents — use that knowledge instead of re-reading.
