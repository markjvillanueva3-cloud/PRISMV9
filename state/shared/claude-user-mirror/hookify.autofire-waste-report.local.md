# Hookify Rule: Auto-trigger /waste-report
type: autofire
event: UserMessage
skill: waste-report

## Pattern
Triggers when user asks about token waste or session efficiency.

## Condition
message matches "(waste|wasted).*(token|context)" OR "token waste" OR "session efficiency" OR "what.*(wast|inefficien)" OR "waste report"

## Message
Routing to /waste-report for token waste analysis.
