# Hookify Rule: Auto-trigger /replay
type: autofire
event: UserMessage
skill: replay

## Pattern
Triggers when user asks to reconstruct or resume session context.

## Condition
message matches "(replay|reconstruct|what (was|did) (I|we)|last session|previous session|resume (context|work)|where (was|did) (I|we) leave)" AND NOT message matches "snapshot"

## Message
Routing to /replay for session context reconstruction.
