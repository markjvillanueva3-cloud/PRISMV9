# Hookify Rule: Auto-trigger /what-changed
type: autofire
event: UserMessage
skill: what-changed

## Pattern
Triggers when user asks what changed recently.

## Condition
message matches "(what|show).*(changed|modified|updated|committed) (recently|today|last)" OR "recent (changes|commits|activity)"

## Message
Routing to /what-changed for recent activity snapshot.
