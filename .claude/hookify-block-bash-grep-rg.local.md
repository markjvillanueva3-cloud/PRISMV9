---
type: block
event: PreToolUse
tool: Bash
condition: command matches "^(grep|rg) " and command does not match "\|"
message: "TOKEN SAVE: Use the Grep tool instead of grep/rg for content search."
---
