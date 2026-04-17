# Hookify Rule: Auto-trigger /forge
type: autofire
event: UserMessage
skill: forge

## Pattern
Triggers when user asks to brainstorm, plan, or iterate on a feature.

## Condition
message matches "^/forge " OR "(brainstorm|plan|iterate|design).*(feature|engine|component|system)" AND message matches "forge"

## Message
Routing to /forge for brainstorm → plan → iterate pipeline.
