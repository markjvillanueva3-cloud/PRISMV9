---
name: autofire-forge-audit
enabled: true
event: prompt
pattern: (code\s+quality\s+(scan|check|audit)|full\s+audit|audit\s+(the\s+)?code(base)?|quality\s+scan|codebase\s+audit|scan\s+for\s+(issues|smells|problems))
action: warn
---

Use `/forge-audit` for comprehensive codebase quality scanning. Invoke with `skill: "forge-audit"`. This scans for code smells (MINOR), implementation gaps (MAJOR), and safety concerns (CRITICAL) across the entire codebase, producing a scored quality report.
