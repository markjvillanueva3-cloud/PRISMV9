---
name: autofire-slim
enabled: true
event: prompt
pattern: (trim\s+memory|optimize\s+memory|clean\s+(up\s+)?memory|memory\s+(is\s+)?(too\s+)?(big|heavy|bloated|long)|shrink\s+memory|reduce\s+memory|compress\s+memory|slim\s+(memory|context|down))
action: warn
---

Use `/slim` for active context optimization. Invoke with the Skill tool: `skill: "slim"`. It compresses verbose MEMORY.md entries, deduplicates across MEMORY.md and CLAUDE.md files, extracts bloated sections to topic files, and cleans stale state. Dry run first: `/slim dry-run`.
