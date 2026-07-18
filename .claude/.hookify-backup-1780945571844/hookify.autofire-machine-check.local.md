# Hookify Rule: Auto-trigger /machine-check
type: autofire
event: UserMessage
skill: machine-check

## Pattern
Triggers when user asks to validate machining parameters against machine limits.

## Condition
message matches "(check|validate|verify).*(machine|spindle|axis|travel|param)" OR "(can|will).*(machine|spindle).*(handle|reach|do)" OR "machine (limits|capabilities|specs)"

## Message
Routing to /machine-check for machining parameter validation.
