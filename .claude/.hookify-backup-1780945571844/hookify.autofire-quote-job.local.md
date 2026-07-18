# Hookify Rule: Auto-trigger /quote-job
type: autofire
event: UserMessage
skill: quote-job

## Pattern
Triggers when user asks for a manufacturing quote.

## Condition
message matches "(quote|bid|pricing).*(job|part|component|machining)" OR "how much.*(to (machine|make|manufacture)|would.*cost)" OR "generate.*quote"

## Message
Routing to /quote-job for manufacturing quote generation.
