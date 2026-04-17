# Hookify Rule: Auto-trigger /forge-engines
type: autofire
event: UserMessage
skill: forge-engines

## Pattern
Triggers when user asks to create or discover new engines.

## Condition
message matches "(forge|create|build|generate).*(engine)" OR "new engine" OR "engine (discovery|creation|gap)"

## Message
Routing to /forge-engines for engine discovery and creation.
