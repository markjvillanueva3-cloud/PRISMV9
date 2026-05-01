# Hookify Rule: Auto-trigger /update-all-docs
type: autofire
event: UserMessage
skill: update-all-docs

## Pattern
Triggers when user asks to update all documentation.

## Condition
message matches "update.?all.?doc" OR "update (all )?documents" OR "refresh.*(docs|documentation)" OR "doc update"

## Message
Routing to /update-all-docs for comprehensive documentation update.
