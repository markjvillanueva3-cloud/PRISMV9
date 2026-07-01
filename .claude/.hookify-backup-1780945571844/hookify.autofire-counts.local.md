# Hookify Rule: Auto-trigger /counts
type: autofire
event: UserMessage
skill: counts

## Pattern
Triggers when user asks for live system counts/metrics.

## Condition
message matches "(count|how many).*(engine|dispatcher|action|test|hook|algorithm|formula|cadence)" OR "live (count|metric|stat)" OR "system (count|metric)"

## Message
Routing to /counts for live system metrics.
