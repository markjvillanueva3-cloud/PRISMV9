# Hookify Rule: Auto-trigger /forge-triple
type: autofire
event: UserMessage
skill: forge-triple

## Pattern
Triggers when user asks to run the full forge pipeline (engines + skills + hooks).

## Condition
message matches "forge.triple" OR "forge triple" OR "(engines|skills|hooks).*(pipeline|all three|triple)"

## Message
Routing to /forge-triple for engines + skills + hooks pipeline.
