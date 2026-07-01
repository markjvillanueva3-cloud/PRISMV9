# Hookify Rule: Auto-trigger /machine-enrich
type: autofire
event: UserMessage
skill: machine-enrich

## Pattern
Triggers when user asks to enrich or add machines to the database.

## Condition
message matches "machine.?enrich" OR "(add|enrich|expand).*(machine|cnc).*(database|db|catalog|profile)" OR "machine pipeline"

## Message
Routing to /machine-enrich for machine database enrichment.
