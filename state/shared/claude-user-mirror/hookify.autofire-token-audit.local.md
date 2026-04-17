---
name: autofire-token-audit
enabled: true
event: prompt
pattern: (token usage|token count|how many tokens|context (window|size|length)|running out of context|save tokens|reduce tokens|token (budget|efficiency|optimization))
action: warn
---

**Token/Context Analysis — Use `/context` for a full budget audit.**

Run `/context` for a detailed breakdown of MEMORY.md size, CLAUDE.md overhead, hook costs, and optimization suggestions. For quick trimming, use `/slim`. For full pre-compaction prep, use `/compact`.
