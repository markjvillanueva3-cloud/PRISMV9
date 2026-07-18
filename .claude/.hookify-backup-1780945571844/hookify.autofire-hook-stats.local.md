# Hookify Rule: Auto-trigger /hook-stats
type: autofire
event: UserMessage
skill: hook-stats

## Pattern
Triggers when user asks about hook savings, hook ROI, or hook effectiveness.

## Condition
message matches "hook (savings|stats|efficiency|roi)" OR "how much.*hooks.*sav" OR "token.*hook.*report"

## Message
Routing to /hook-stats for hook efficiency metrics.
