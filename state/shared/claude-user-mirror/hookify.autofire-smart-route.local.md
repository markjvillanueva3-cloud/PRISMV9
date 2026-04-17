# Hookify Rule: Auto-suggest smart route for dispatcher calls
type: warn
event: PreToolUse
tool: Bash

## Pattern
Matches when about to call a dispatcher action that has a direct engine shortcut.

## Condition
command contains "prism_session" AND (command contains "rpm" OR command contains "feed_rate" OR command contains "tap_drill" OR command contains "mrr")

## Message
TOKEN SAVE: Use QuickCalcEngine directly instead of dispatcher call. Run `/calc` or import quickCalcEngine for instant results (~50 tokens vs ~400 tokens).
