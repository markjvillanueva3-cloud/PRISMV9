# Hookify Rule: Auto-trigger /calc
type: autofire
event: UserMessage
skill: calc

## Pattern
Triggers when user asks for quick CNC calculations (RPM, feed, MRR, tap drill, chipload).

## Condition
message matches "(calculate|calc|what('s| is).*rpm|what('s| is).*feed|mrr|material removal|tap drill|chipload|surface (speed|feet)|sfm|ipm|ipt)" AND NOT message matches "(forge|engine|build|create|test)"

## Message
Routing to /calc for instant CNC calculation.
