# Hookify Rule: Auto-trigger /unit-convert
type: autofire
event: UserMessage
skill: unit-convert

## Pattern
Triggers when user asks to convert between metric and imperial units.

## Condition
message matches "(convert|change).*(mm|inch|metric|imperial|thou)" OR "(mm to inch|inch to mm|metric to imperial|imperial to metric)" OR "what is .* in (mm|inches)"

## Message
Routing to /unit-convert for metric/imperial conversion.
