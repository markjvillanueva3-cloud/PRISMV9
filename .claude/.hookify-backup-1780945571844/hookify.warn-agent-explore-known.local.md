# Hookify Rule: Warn on Agent for exploring known directories
type: warn
event: PreToolUse
tool: Agent

## Pattern
Warns when Agent is used to explore directories that PATH_INDEX already covers.

## Condition
prompt mentions "explore" or "find" AND mentions PRISM directories like src/engines, src/data, src/tools

## Message
TOKEN SAVE: PRISM directory structure is in PATH_INDEX (loaded in context). Use Glob/Grep directly instead of Agent exploration.
