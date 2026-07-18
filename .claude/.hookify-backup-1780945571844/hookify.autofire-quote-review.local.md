# Hookify Rule: Auto-trigger /quote-review
type: autofire
event: UserMessage
skill: quote-review

## Pattern
Triggers when user asks to review or compare quote accuracy.

## Condition
message matches "(review|compare|check).*(quote|bid)" OR "quote (accuracy|review|calibrat)" OR "(actual vs|win.loss).*(quote|bid)"

## Message
Routing to /quote-review for quote accuracy review.
