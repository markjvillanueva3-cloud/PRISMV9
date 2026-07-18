# Hookify Rule: Auto-trigger /context-map
type: autofire
event: UserMessage
skill: context-map

## Pattern
Triggers when user asks about context window contents or space usage.

## Condition
message matches "context (map|window|space|contents)" OR "what.*(in|using).*(context|window)" OR "context map" OR "show.*context" OR "context visualization"

## Message
Routing to /context-map for context window visualization.
