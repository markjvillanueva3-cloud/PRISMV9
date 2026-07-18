# Hookify Rule: Block reading a file you just edited
type: block
event: PreToolUse
tool: Read

## Pattern
Blocks reading a file that was written/edited within the last 60 seconds.

## Condition
Temporal check — implemented in pretooluse-unified.sh via /tmp/claude-edited-{hash} tracker.
PostToolUse records edits, PreToolUse blocks reads on same file within 60s.

## Message
TOKEN SAVE: This file was just written/edited. You already know its content from the edit operation. Use that knowledge instead of re-reading (~2-8K tokens saved per blocked read).
