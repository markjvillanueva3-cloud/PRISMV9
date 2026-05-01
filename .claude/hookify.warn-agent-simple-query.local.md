# Hookify Rule: Warn on Agent tool for simple lookups
type: warn
event: PreToolUse
tool: Agent

## Pattern
Warns when Agent is invoked with a short, simple query that could be handled by direct Glob/Grep/Read.

## Condition
Agent prompt < 80 chars AND starts with simple verb (find/search/look/locate/where/what/list/show/get/check/count) AND does NOT contain complexity markers (and/then/also/across/multiple/all/every/compare/analyze/refactor)

## Message
TOKEN SAVE: Short query to Agent. Consider Glob/Grep/Read directly — Agent spawns a sub-conversation costing 2-5x more tokens than direct tool calls.
