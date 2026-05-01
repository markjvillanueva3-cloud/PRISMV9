---
type: block
event: PreToolUse
tool: Bash
condition: command matches "^cat [^|]+" and command does not match "<<|heredoc|EOF|>>"
message: "TOKEN SAVE: Use the Read tool instead of cat for reading files."
---
