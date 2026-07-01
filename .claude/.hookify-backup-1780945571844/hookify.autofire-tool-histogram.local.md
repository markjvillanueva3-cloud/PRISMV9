# Hookify Rule: Auto-trigger /tool-histogram
type: autofire
event: UserMessage
skill: tool-histogram

## Pattern
Triggers when user asks about tool usage distribution.

## Condition
message matches "tool.*(histogram|distribution|usage|breakdown)" OR "which tools.*(most|expensive|used)" OR "tool histogram"

## Message
Routing to /tool-histogram for tool usage visualization.
