# Hookify Rule: Auto-trigger /template
type: autofire
event: UserMessage
skill: template

## Pattern
Triggers when user asks to use a prompt template.

## Condition
message matches "(template|boilerplate|scaffold|generate.*(engine|dispatcher|test|hook|commit).*template)" AND NOT message matches "(forge|build)"

## Message
Routing to /template for prompt template usage.
