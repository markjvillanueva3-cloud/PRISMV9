---
name: warn-bash-audit-unpipe
enabled: true
event: bash
action: warn
tool_matcher: Bash
---
TOKEN SAVE: npm audit produces massive output. Pipe through `| head -30` or use `--json | head -50`.
