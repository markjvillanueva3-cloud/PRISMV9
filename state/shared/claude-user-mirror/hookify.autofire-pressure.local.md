# Hookify Rule: Auto-trigger /pressure
type: autofire
event: UserMessage
skill: pressure

## Pattern
Triggers when user asks about context window pressure or utilization.

## Condition
message matches "(context|window).*(pressure|utilization|usage|full)" OR "how much context" OR "context pressure" OR "running out of context"

## Message
Routing to /pressure for context window pressure monitoring.
