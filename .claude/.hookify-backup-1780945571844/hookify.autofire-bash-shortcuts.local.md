# Hookify Rule: Auto-trigger /bash-shortcuts
type: autofire
event: UserMessage
skill: bash-shortcuts

## Pattern
Triggers when user asks about bash shortcuts or token-saving scripts.

## Condition
message matches "bash shortcut" OR "shell shortcut" OR "prism.*(scan|build) script" OR "token.*(saving|sav).*(script|bash)" OR "bash-shortcuts"

## Message
Routing to /bash-shortcuts for quick reference on token-saving scripts.
