---
type: block
event: PreToolUse
tool: Bash
condition: command matches "^ls (-la|-al|-lah|-lha) " and command does not match "\|"
message: "TOKEN SAVE: Use Glob for file listing. ls -la outputs verbose metadata that wastes tokens."
---
