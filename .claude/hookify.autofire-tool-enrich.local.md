# Hookify Rule: Auto-trigger /tool-enrich
type: autofire
event: UserMessage
skill: tool-enrich

## Pattern
Triggers when user asks to enrich or add cutting tools to the database.

## Condition
message matches "tool.?enrich" OR "(add|enrich|expand).*(tool|cutter|endmill|drill).*(database|db|catalog)" OR "tool pipeline"

## Message
Routing to /tool-enrich for unified tool database enrichment.
