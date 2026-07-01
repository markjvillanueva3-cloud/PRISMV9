# Hookify Rule: Auto-trigger /defaults
type: autofire
event: UserMessage
skill: defaults

## Pattern
Triggers when user asks for default machining parameters.

## Condition
message matches "(default|recommended).*(speed|feed|rpm|doc|woc|chipload|coolant|engagement)" OR message matches "what (speed|feed|rpm|parameters).*(should|for|with)" AND NOT message matches "(forge|engine|build|create)"

## Message
Routing to /defaults for smart machining parameter defaults.
