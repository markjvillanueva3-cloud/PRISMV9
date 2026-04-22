---
type: warn
event: PreToolUse
tool: Glob
condition: pattern matches "\*\*/\*$" and pattern does not match "\.(ts
message: "js|py|md|json)")|TOKEN SAVE: Unbounded **/* glob returns thousands of files. Add file extension filter."
---
