# Hookify Rule: Auto-trigger /injection-mold-quote
type: autofire
event: UserMessage
skill: injection-mold-quote

## Pattern
Triggers when user asks about injection molding costs or plastic part quotes.

## Condition
message matches "(injection|mold|molding).*(quote|cost|price|estimat)" OR "(plastic|polymer).*(part|component).*(cost|quote|price)" OR "mold cost" OR "injection mold"

## Message
Routing to /injection-mold-quote for plastic part cost estimation.
