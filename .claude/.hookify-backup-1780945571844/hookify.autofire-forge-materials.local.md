# Hookify Rule: Auto-trigger /forge-materials
type: autofire
event: UserMessage
skill: forge-materials

## Pattern
Triggers when user asks to enrich or add materials to the database.

## Condition
message matches "forge.?material" OR "(add|enrich|expand).*(material|alloy).*(database|db|catalog)" OR "material pipeline"

## Message
Routing to /forge-materials for material database enrichment pipeline.
