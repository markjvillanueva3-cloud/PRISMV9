# Hookify Rule: Auto-trigger /forge-postflight
type: autofire
event: UserMessage
skill: forge-postflight

## Pattern
Triggers when user asks to run postflight checks or integration verification.

## Condition
message matches "forge.?postflight" OR "postflight check" OR "integration.?verif" OR "run postflight"

## Message
Routing to /forge-postflight for integration verification protocol.
