# Hookify Rule: Auto-trigger /autopilot
type: autofire
event: UserMessage
skill: autopilot

## Pattern
Triggers when user asks for autopilot or autonomous development.

## Condition
message matches "^/autopilot" OR "autopilot" OR "(auto|autonomous).*(develop|build|execute|run)" AND NOT message matches "(forge|engine)"

## Message
Routing to /autopilot for full development cycle pipeline.
