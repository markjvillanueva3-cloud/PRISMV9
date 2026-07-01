---
name: warn-broad-search
enabled: true
event: bash
pattern: (grep|rg|find)\s+(-r\s+)?['".]?\.\s
action: warn
---

**Broad search pattern detected — this may return excessive results.**

- Narrow the search path or add file type filters to reduce output tokens
