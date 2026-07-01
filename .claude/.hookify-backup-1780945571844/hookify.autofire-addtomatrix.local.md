# Hookify Rule: Auto-trigger /addtomatrix
type: autofire
event: UserMessage
skill: addtomatrix

## Pattern
Triggers when user asks to register or add products to MASTER_INDEX.

## Condition
message matches "(add|register|wire).*(matrix|master.?index|index)" OR "add to matrix" OR "register.*(engine|algorithm|dispatcher|hook)"

## Message
Routing to /addtomatrix for product registration in MASTER_INDEX.
