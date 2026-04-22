---
type: block
event: PreToolUse
tool: Bash
condition: command matches "^(head
message: "tail) " and command does not match "\|")|TOKEN SAVE: Use Read with offset/limit instead of head/tail."
---
