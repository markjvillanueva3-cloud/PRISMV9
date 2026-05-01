---
name: autofire-smart
enabled: true
event: prompt
pattern: ^(refactor|optimize|analyze|architect|migrate|deploy|configure|set\s?up|integrate)\s+
action: warn
---

Invoke `/smart` for intelligent auto-configuration. Use the Skill tool: `skill: "smart"`. This analyzes task complexity, selects the optimal model tier and effort level, and assigns a domain-specific role before executing.
