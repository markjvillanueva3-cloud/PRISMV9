# Hookify Rule: Auto-trigger /material-price
type: autofire
event: UserMessage
skill: material-price

## Pattern
Triggers when user asks about material pricing or costs.

## Condition
message matches "(material|stock|bar|plate|billet).*(price|cost|how much)" OR "price.*(aluminum|steel|titanium|brass|copper|stainless)"

## Message
Routing to /material-price for market-adjusted material cost lookup.
