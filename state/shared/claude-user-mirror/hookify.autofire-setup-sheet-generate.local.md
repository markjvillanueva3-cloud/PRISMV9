# Hookify Rule: Auto-trigger /setup-sheet-generate
type: autofire
event: UserMessage
skill: setup-sheet-generate

## Pattern
Triggers when user asks to generate a CNC setup sheet.

## Condition
message matches "(generat|creat|make).*(setup.?sheet)" OR "setup sheet" OR "job setup.*(document|sheet|form)"

## Message
Routing to /setup-sheet-generate for CNC job setup sheet automation.
