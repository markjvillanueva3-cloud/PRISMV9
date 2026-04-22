# Hookify Rule: Block WebSearch for things PRISM can calculate
type: block
event: PreToolUse
tool: WebSearch

## Pattern
Blocks searching the web for CNC parameters that PRISM engines can calculate directly.

## Condition
Temporal check — implemented in pretooluse-unified.sh. Checks query for speed/feed/rpm/sfm patterns.

## Message
TOKEN SAVE: PRISM has engines for speed/feed calculations. Use /calc, /defaults, or /process-calc instead of web searching. Saves ~1500 tokens per blocked search.
