---
name: warn-bash-du-sh
enabled: true
event: bash
action: warn
tool_matcher: Bash
---
TOKEN SAVE: du can produce massive output. Add `| sort -rh | head -20` or limit to a specific directory.
