# Hookify Rule: Auto-trigger /token-budget
type: autofire
event: UserMessage
skill: token-budget

## Pattern
Triggers when user asks about token budget, remaining tokens, or context usage.

## Condition
message matches "(token budget|how (many|much) tokens|context (remaining|left|budget)|am I running (low|out)|budget (check|status|remaining))"

## Message
Routing to /token-budget for context budget inspection.
