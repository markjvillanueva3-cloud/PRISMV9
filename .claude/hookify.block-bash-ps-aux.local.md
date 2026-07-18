---
name: block-bash-ps-aux
enabled: true
event: bash
action: warn
tool_matcher: Bash
---
TOKEN SAVE: ps aux lists all processes (~200+ lines). Add `| grep <process>` to filter, or use `pgrep <name>`.
