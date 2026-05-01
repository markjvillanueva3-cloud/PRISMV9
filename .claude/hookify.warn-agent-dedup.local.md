# Hookify Rule: Block duplicate Agent queries
type: block
event: PreToolUse
tool: Agent

## Pattern
Blocks running the exact same Agent query within 120 seconds.

## Condition
Temporal check — implemented in pretooluse-unified.sh. Hashes Agent prompt, checks /tmp/claude-agent-{hash} tracker.

## Message
TOKEN SAVE: This exact Agent query ran recently. Use the previous results instead of re-running (~5-20K tokens saved per blocked duplicate).
