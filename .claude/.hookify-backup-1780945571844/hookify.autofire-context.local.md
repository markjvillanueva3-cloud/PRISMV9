# Hookify Rule: Auto-trigger /context
type: autofire
event: UserMessage
skill: context

## Pattern
Triggers when user asks about context window, context budget, or context usage.

## Condition
message matches "(context (budget|window|usage|size|remaining|left))" OR "how much context" OR "am I (running out|low on) context"

## Message
Routing to /context for context budget inspection.
