# Hookify Rule: Auto-trigger /job-planning
type: autofire
event: UserMessage
skill: job-planning

## Pattern
Triggers when user asks to plan a manufacturing job end-to-end.

## Condition
message matches "(plan|planning).*(job|manufacturing|production|machining)" OR "(job plan|production plan|manufacturing plan)" OR "plan.*(how to (make|machine|manufacture))"

## Message
Routing to /job-planning for end-to-end manufacturing job planning.
