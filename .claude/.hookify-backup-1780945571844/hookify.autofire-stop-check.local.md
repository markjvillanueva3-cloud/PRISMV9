# Hookify Rule: Auto-trigger /stop-check
type: autofire
event: UserMessage
skill: stop-check

## Pattern
Triggers when user asks about stop conditions or whether a tool call should proceed.

## Condition
message matches "should.*stop" OR "stop condition" OR "should.*(call|run|read)" OR "is it worth.*reading"

## Message
Routing to /stop-check for tool call evaluation.
