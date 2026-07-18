# Hookify Rule: Auto-Boot Context
type: autofire
event: SessionStart

## Pattern
Fires on every session start to provide ultra-compact context.

## Action
When a new session starts, suggest reading `data/quick-ref.json` instead of
large inventory files. This saves ~2000 tokens per session.

## Message
SESSION BOOT: Read `C:/PRISM/mcp-server/data/quick-ref.json` for instant context (35 lines, ~100 tokens). Skip SYSTEM_INVENTORY.md and PATH_INDEX.md unless doing deep work.
