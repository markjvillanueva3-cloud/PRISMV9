# Hookify Rule: Auto-trigger /rgs
type: autofire
event: UserMessage
skill: rgs

## Pattern
Triggers when user asks about the roadmap generation system.

## Condition
message matches "\\brgs\\b" OR "roadmap.*(generat|system)" OR "(create|generate|plan).*(roadmap|milestone)" OR "new milestone"

## Message
Routing to /rgs for Roadmap Generation System.
