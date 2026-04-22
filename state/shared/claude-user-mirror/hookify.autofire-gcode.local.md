# Hookify Rule: Auto-trigger /gcode
type: autofire
event: UserMessage
skill: gcode

## Pattern
Triggers when user asks for G-code snippets or templates.

## Condition
message matches "(g-?code|gcode).*(snippet|template|generate|example)" OR message matches "(tool change|peck drill|tap cycle|program header|face mill|contour).*(g-?code|code)"

## Message
Routing to /gcode for G-code snippet generation.
