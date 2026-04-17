---
name: autofire-forge-cleanup
enabled: true
event: prompt
pattern: (dead\s+(code|files?|exports?)|unused\s+files?|orphan(ed)?\s+tests?|stale\s+(files?|state|snapshot)|clean\s*up\s+(the\s+)?(codebase|project|repo)|remove\s+dead\s+(code|files?)|find\s+unused)
action: warn
---

Use `/forge-cleanup` for dead code and file detection. Invoke with `skill: "forge-cleanup"`. This identifies dead files (no imports), dead code within files, orphaned tests, stale state files, and duplicate code patterns.
