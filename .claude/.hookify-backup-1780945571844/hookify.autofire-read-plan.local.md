# Hookify Rule: Auto-trigger /read-plan
type: autofire
event: UserMessage
skill: read-plan

## Pattern
Triggers when user asks for an optimal file reading strategy.

## Condition
message matches "read plan" OR "(plan|optimize).*(read|file).*(strateg|efficien)" OR "how to read.*(efficien|optimal)" OR "best way to read"

## Message
Routing to /read-plan for optimal file reading strategy.
