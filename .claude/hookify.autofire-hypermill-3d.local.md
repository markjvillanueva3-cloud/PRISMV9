# Hookify Rule: Auto-trigger /hypermill-3d-strategy-guide
type: autofire
event: UserMessage
skill: hypermill-3d-strategy-guide

## Pattern
Triggers when user asks about hyperMILL 3D machining strategies.

## Condition
message matches "(hypermill|hyper.?mill).*(3d|strategy|cycle|finishing|roughing)" OR "(which|what|best).*(3d strategy|machining cycle|finishing strategy)"

## Message
Routing to /hypermill-3d-strategy-guide for 3D machining cycle selection.
