# Hookify Rule: Block repeated clean build/test runs
type: block
event: PreToolUse
tool: Bash

## Pattern
Blocks re-running build/test commands that passed clean less than 60 seconds ago.

## Condition
Temporal check — implemented in pretooluse-unified.sh. Caches build results in /tmp/claude-build-{hash}, checks age and previous status.

## Message
TOKEN SAVE: This build/test ran clean recently. No source files changed. Skip re-run (~1500 tokens saved).
