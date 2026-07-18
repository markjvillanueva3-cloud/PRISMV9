# Hookify Rule: Auto-trigger /stock-optimize
type: autofire
event: UserMessage
skill: stock-optimize

## Pattern
Triggers when user asks about raw material size selection.

## Condition
message matches "(stock|raw material|bar|plate|billet).*(size|select|optim|what size)" OR "what size (stock|bar|material)"

## Message
Routing to /stock-optimize for raw material size selection.
