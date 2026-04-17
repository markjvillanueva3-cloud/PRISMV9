---
name: autofire-count-drift
enabled: true
event: prompt
pattern: (update.*(docs|documentation|counts|numbers)|sync.*(counts|docs)|check.*(drift|counts|stale)|counts? (are |look )?(wrong|stale|outdated|off))
action: warn
---

Run the count drift check to verify CLAUDE.md and MEMORY.md counts match reality:

```bash
cd C:/PRISM/mcp-server && bash state/SYS-MS3/count-drift-check.sh
```

Then use `/update-all-docs` to fix any drift. Key counts tracked: dispatchers, engine exports, unwired engines, algorithms, milestones.
