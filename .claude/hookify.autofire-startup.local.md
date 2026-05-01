# Hookify Rule: Auto-trigger /startup
type: autofire
event: UserMessage
skill: startup

## Pattern
Triggers when user asks to run startup or initialize session.

## Condition
message matches "\\bstartup\\b" OR "session.?(start|init)" OR "initialize session" OR "load session"

## Message
Routing to /startup for session initialization macro.
