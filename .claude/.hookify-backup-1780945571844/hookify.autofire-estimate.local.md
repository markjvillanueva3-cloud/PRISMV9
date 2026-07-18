# Hookify Rule: Auto-trigger /estimate
type: autofire
event: UserMessage
skill: estimate

## Pattern
Triggers when user asks for manufacturing cost estimates.

## Condition
message matches "(estimate|cost|price|how much.*(cost|machine|make|manufacture)|shop rate|material (cost|price))" AND NOT message matches "(forge|engine|build|create)"

## Message
Routing to /estimate for quick manufacturing cost estimate.
