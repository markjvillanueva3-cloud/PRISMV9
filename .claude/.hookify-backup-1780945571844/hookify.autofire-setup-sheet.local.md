# Hookify Rule: Auto-trigger /setup-sheet-generate
type: autofire
event: UserMessage
skill: setup-sheet-generate

## Pattern
Triggers when user asks to generate a setup sheet.

## Condition
message matches "(setup sheet|job sheet|operator sheet).*(generat|creat|make)" OR "generate.*(setup|job) sheet"

## Message
Routing to /setup-sheet-generate for CNC job setup sheet automation.
