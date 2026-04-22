---
name: autofire-forge-deps
enabled: true
event: prompt
pattern: (dependen(cy|cies)\s+(health|check|audit|outdated|vulnerab)|npm\s+audit|security\s+vulnerabilit|outdated\s+(packages?|deps?|dependenc)|unused\s+(packages?|deps?|dependenc)|circular\s+(import|depend))
action: warn
---

Use `/forge-deps` for dependency health analysis. Invoke with `skill: "forge-deps"`. This runs npm audit, checks for outdated packages, finds unused dependencies, detects circular imports, and produces a dependency health score.
