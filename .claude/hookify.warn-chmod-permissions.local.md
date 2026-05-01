---
name: warn-chmod-permissions
enabled: true
event: bash
pattern: chmod\s+(777|666|776|775|o\+[rwx])\s
action: warn
---

**Overly permissive file permissions detected!**

`chmod 777` (or similar) grants read/write/execute to all users on the system.

- Use least-privilege: 755 for scripts/dirs, 644 for config, 600 for sensitive files
- If you need group access, use `chmod 775` or `chgrp` to target a specific group
