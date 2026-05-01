---
name: autofire-findings
enabled: true
event: prompt
pattern: (open\s+issues|outstanding\s+(bugs|issues|problems)|what'?s\s+(broken|wrong|failing)|known\s+(issues|bugs|problems)|critical\s+findings|major\s+findings|unresolved\s+(issues|bugs))
action: warn
---

Use `/findings` to scan milestone envelopes and state files for open issues. It filters by severity (CRITICAL/MAJOR/MINOR) and cross-references against MEMORY.md baselines. Run `/findings` for a full scan or `/findings critical` for high-priority only.
