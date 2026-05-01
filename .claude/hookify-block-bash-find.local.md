---
type: block
event: PreToolUse
tool: Bash
condition: command matches "^find " and command does not match "\-exec|\-delete|xargs|mv|cp|rm"
message: "TOKEN SAVE: Use the Glob tool instead of find for file discovery."
---
