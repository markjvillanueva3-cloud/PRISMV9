# Hookify Rule: Auto-trigger /action-help
type: autofire
event: UserMessage
skill: action-help

## Pattern
Triggers when user asks about dispatcher action parameters or usage.

## Condition
message matches "(what params|parameters for|how to (call|use)|action (help|params|schema)|dispatcher.*(action|param))" AND NOT message matches "(forge|create|build)"

## Message
Routing to /action-help for dispatcher action parameter lookup.
