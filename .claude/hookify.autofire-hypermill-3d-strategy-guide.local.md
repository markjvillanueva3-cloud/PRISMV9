# Hookify Rule: Auto-trigger /hypermill-3d-strategy-guide
type: autofire
event: UserMessage
skill: hypermill-3d-strategy-guide

## Pattern
Triggers when user asks about hyperMILL 3D machining strategy selection.

## Condition
message matches "hypermill.*(3d|3D).*(strategy|cycle)" OR "(3d|3D).*(machining|milling).*(strategy|cycle|which)" OR "which 3d strategy"

## Message
Routing to /hypermill-3d-strategy-guide for 3D machining cycle selection.
