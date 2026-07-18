# Hookify Rule: Auto-trigger /snapshot
type: autofire
event: UserMessage
skill: snapshot

## Pattern
Triggers when user asks to save/load session state or context snapshot.

## Condition
message matches "(save|load|restore).*(snapshot|session|context)" OR "pick up where.*left" OR "resume.*session"

## Message
Routing to /snapshot for session state management.
