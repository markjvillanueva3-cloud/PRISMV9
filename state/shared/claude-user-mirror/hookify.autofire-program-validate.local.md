# Hookify Rule: Auto-trigger /program-validate
type: autofire
event: UserMessage
skill: program-validate

## Pattern
Triggers when user asks to validate or verify G-code / NC programs.

## Condition
message matches "(validate|verify|check).*(g-?code|nc program|program)" OR "(g-?code|nc program).*(valid|error|issue|problem)"

## Message
Routing to /program-validate for CNC G-code verification.
