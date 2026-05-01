---
type: warn
event: PreToolUse
tool: Read
condition: file_path matches "\.(min\.js|min\.css|bundle\.js|chunk\.js)$"
message: "TOKEN SAVE: Minified/bundled files are unreadable and waste 5-50K tokens. Read the source files instead."
---
