---
name: autofire-safety-audit
enabled: true
event: prompt
pattern: (safety\s+(audit|chain|check|inspect|review|coverage|gaps)|s\(x\)\s+(score|audit|check)|safetyblock|cross.?field\s+physics|safety\s+weak\s+links|which\s+dispatchers\s+(have|lack)\s+safety|safety\s+scoring|unsafe\s+parameters)
action: warn
---

Use `/safety-audit` for PRISM safety chain inspection. Examples: `/safety-audit` (full audit), `/safety-audit weak` (find weak links), `/safety-audit coverage` (dispatcher safety integration), `/safety-audit physics` (cross-field validation), `/safety-audit critical` (critical algorithm test coverage).
