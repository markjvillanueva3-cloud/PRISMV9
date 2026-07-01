# Hookify Rule: Block WebSearch for G-code syntax
type: block
event: PreToolUse
tool: WebSearch

## Pattern
Blocks searching the web for G-code command syntax that PRISM's knowledge base covers.

## Condition
query matches g-code/G-code syntax, meaning, reference queries

## Message
TOKEN SAVE: Use /gcode for G-code snippets or PRISM's KNOWLEDGE_BASE for G-code reference (~1500 tokens saved).
