---
type: warn
event: PreToolUse
tool: Agent
condition: prompt matches "single file|one file|just this file|only in .+\.(ts|js|py|md)"
message: "TOKEN SAVE: For single-file queries, use Read or Grep directly instead of Agent (saves ~2000 tokens overhead)."
---
