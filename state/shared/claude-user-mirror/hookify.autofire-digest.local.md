# Hookify Rule: Auto-trigger /digest
type: autofire
event: UserMessage
skill: digest

## Pattern
Triggers when user asks for a file/directory summary or digest.

## Condition
message matches "(digest|summarize|overview of|what('s| is) in).*(file|directory|folder|module|engine)" AND NOT message matches "(forge|create|build)"

## Message
Routing to /digest for compact file/directory summary.
