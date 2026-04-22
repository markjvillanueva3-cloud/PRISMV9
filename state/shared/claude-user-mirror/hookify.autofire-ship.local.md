# Hookify Rule: Auto-trigger /ship
type: autofire
event: UserMessage
skill: ship

## Pattern
Triggers when user asks to ship, complete, or finalize a unit.

## Condition
message matches "(ship|complete|finalize|finish).*(unit|task|milestone)" OR "ready to ship" OR "mark.*(complete|done)"

## Message
Routing to /ship for complete unit checklist.
