# Hookify Rule: Auto-trigger /forge-safety
type: autofire
event: UserMessage
skill: forge-safety

## Pattern
Triggers when user asks to audit or harden the safety chain.

## Condition
message matches "forge.?safety" OR "(audit|harden|check).*(safety|S\\(x\\)|safe)" OR "safety chain"

## Message
Routing to /forge-safety for safety chain audit and hardening.
