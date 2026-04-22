# Hookify Rule: Auto-trigger /batch-check
type: autofire
event: UserMessage
skill: batch-check

## Pattern
Triggers when user asks about tool call batching or optimization.

## Condition
message matches "(batch|parallel|optimize).*(tool|call)" OR "batching opportunities"

## Message
Routing to /batch-check for tool call optimization analysis.
