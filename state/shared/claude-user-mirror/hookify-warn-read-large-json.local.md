---
type: warn
event: PreToolUse
tool: Read
condition: file_path matches "\.(json)$" and file_path matches "(package-lock|yarn\.lock|node_modules|\.map$)"
message: "TOKEN SAVE: Lock files and source maps are huge (10K-500K tokens). Use Grep for specific entries."
---
