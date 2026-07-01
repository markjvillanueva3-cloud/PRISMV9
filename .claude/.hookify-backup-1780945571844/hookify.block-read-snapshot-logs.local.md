# Hookify Rule: Block reading session transcript logs
type: block
event: PreToolUse
tool: Read

## Pattern
Blocks reading .jsonl session transcript logs — these are enormous (50-500K tokens).

## Condition
file_path ends with ".jsonl" AND file_path contains ".claude/projects"

## Message
TOKEN SAVE: Session transcripts are 50-500K+ tokens. Use Grep with a specific pattern to find what you need, or use /replay for context reconstruction.
