# Hookify Rule: Auto-trigger /status
type: autofire
event: UserMessage
skill: status

## Pattern
Triggers when user asks for a system status overview.

## Condition
message matches "^/status$" OR "(system|prism) status" OR "how (many|much).*(engine|dispatcher|action|test|hook)" OR "give me a (status|overview|summary) of (the )?(system|prism)"

## Message
Routing to /status for instant system overview.
