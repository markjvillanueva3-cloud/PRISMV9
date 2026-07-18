---
name: block-git-add-all
enabled: true
event: bash
action: block
tool_matcher: Bash
---
SAFETY + TOKEN SAVE: git add -A / git add . stages everything including secrets and unrelated files. Stage specific files by name instead.
