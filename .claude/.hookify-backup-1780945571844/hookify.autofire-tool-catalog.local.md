# Hookify Rule: Auto-trigger /tool-catalog
type: autofire
event: UserMessage
skill: tool-catalog

## Pattern
Triggers when user asks about cutting tools, endmills, drills, or tool recommendations.

## Condition
message matches "(find|search|look up|recommend).*(tool|endmill|drill|tap|insert|cutter)" OR "(what|which).*(tool|endmill|drill).*(for|should|best)"

## Message
Routing to /tool-catalog for cutting tool database search.
