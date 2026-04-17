# Hookify Rule: Auto-trigger /forge-skills
type: autofire
event: UserMessage
skill: forge-skills

## Pattern
Triggers when user asks to create or discover new skills/commands.

## Condition
message matches "(forge|create|build|generate).*(skill|command|slash command)" OR "new (skill|command)" OR "skill (discovery|creation|gap)"

## Message
Routing to /forge-skills for skill discovery and creation.
