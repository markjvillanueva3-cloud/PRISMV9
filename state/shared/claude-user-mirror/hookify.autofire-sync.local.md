---
name: autofire-sync
enabled: true
event: prompt
pattern: (fix\s+(the\s+)?drift|out\s+of\s+sync|counts?\s+(don'?t|do\s+not)\s+match|sync\s+(the\s+)?(counts?|docs?|state|system)|mismatch\s+(in|between)|stale\s+(docs?|counts?|data)|docs?\s+(are\s+)?(outdated|wrong|stale))
action: warn
---

Use `/sync` for system state synchronization. Invoke with `skill: "sync"`. This verifies CLAUDE.md/MEMORY.md counts match reality, fixes drift in dispatcher/engine/milestone counts, and aligns documentation with code. For count-specific checks, use `/check-dsl` or the count-drift-check script.
