# Hookify Rule: Auto-trigger /bash-optimize
type: autofire
event: UserMessage
skill: bash-optimize

## Pattern
Triggers when user asks about optimizing bash commands or shell scripts.

## Condition
message matches "bash optimi" OR "optimize.*(bash|shell|command)" OR "bash.*(efficien|faster|cheaper)" OR "reduce bash" OR "bash savings"

## Message
Routing to /bash-optimize for Bash command optimization.
