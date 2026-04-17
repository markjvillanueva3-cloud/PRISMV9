---
name: autofire-scrutinize
enabled: true
event: prompt
pattern: (code\s+(review|quality|check)|review\s+(my|this|the)\s+(code|changes)|before\s+(commit|shipping)|quality\s+check|pre.?commit\s+(check|review)|check\s+(for|my)\s+(issues|problems|bugs)|any\s+type\s+abuse|todo\s+check)
action: warn
---

Use `/scrutinize` for a standalone code quality review. Modes: `/scrutinize` (all changes), `/scrutinize staged` (staged only), `/scrutinize quick` (build + any-count + TODO-count one-liner), `/scrutinize [file]` (specific file). Checks for TypeScript errors, any abuse, TODOs, empty catches, safety concerns, and DSL compliance.
