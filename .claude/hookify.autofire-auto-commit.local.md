# Hookify Rule: Auto-trigger /auto-commit
type: autofire
event: UserMessage
skill: auto-commit

## Pattern
Triggers when user asks to commit changes.

## Condition
message matches "(commit|save).*(change|work|progress)" OR "auto.commit" OR "commit (this|these|everything|what)"

## Message
Routing to /auto-commit for automatic git commits.
