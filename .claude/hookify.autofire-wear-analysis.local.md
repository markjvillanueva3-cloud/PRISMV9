# Hookify Rule: Auto-trigger /wear-analysis
type: autofire
event: UserMessage
skill: wear-analysis

## Pattern
Triggers when user asks about tool wear analysis or compensation.

## Condition
message matches "(tool wear|wear (analysis|pattern|rate|compensation))" OR "(flank|crater|notch|BUE).*(wear)" OR "tool life.*(analyz|predict|estimat)"

## Message
Routing to /wear-analysis for tool wear analysis and force compensation.
