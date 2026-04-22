# Hookify Rule: Auto-trigger /injection-mold-quote
type: autofire
event: UserMessage
skill: injection-mold-quote

## Pattern
Triggers when user asks about injection molding costs or quotes.

## Condition
message matches "(injection mold|mold (cost|quote|price|estimat))" OR "(plastic part).*(cost|quote|estimat)" OR "how much.*(mold|injection)"

## Message
Routing to /injection-mold-quote for plastic part cost estimation.
