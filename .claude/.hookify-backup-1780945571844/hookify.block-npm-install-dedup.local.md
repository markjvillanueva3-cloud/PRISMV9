# Hookify Rule: Block repeated npm/pip install
type: block
event: PreToolUse
tool: Bash

## Pattern
Blocks running npm install / pip install when it was run less than 120 seconds ago.

## Condition
Temporal check — implemented in pretooluse-unified.sh. Tracks install commands in /tmp/claude-install-{hash}.

## Message
TOKEN SAVE: This install command ran recently. Dependencies are already installed (~500 tokens saved).
