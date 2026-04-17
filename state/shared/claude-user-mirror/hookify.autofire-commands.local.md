# Hookify Rule: Auto-trigger /commands
type: autofire
event: UserMessage
skill: commands

## Pattern
Triggers when user asks to list or see available slash commands.

## Condition
message matches "(list|show|what).*(commands|slash)" OR "available commands" OR "what can you do"

## Message
Routing to /commands for slash command listing.
