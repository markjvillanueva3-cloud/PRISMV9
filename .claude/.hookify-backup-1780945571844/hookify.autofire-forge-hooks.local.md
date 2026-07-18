# Hookify Rule: Auto-trigger /forge-hooks
type: autofire
event: UserMessage
skill: forge-hooks

## Pattern
Triggers when user asks to create or discover new hooks.

## Condition
message matches "(forge|create|build|generate).*(hook)" OR "new hook" OR "hook (discovery|creation|gap)"

## Message
Routing to /forge-hooks for hook discovery and creation.
