# Hookify Rule: Auto-trigger /quick-ref
type: autofire
event: UserMessage
skill: quick-ref

## Pattern
Triggers when user asks for a quick reference card or cheat sheet.

## Condition
message matches "(quick ref|reference card|cheat sheet|quick (look|check))" OR "remind me (about|how|what)"

## Message
Routing to /quick-ref for zero-cost context card.
