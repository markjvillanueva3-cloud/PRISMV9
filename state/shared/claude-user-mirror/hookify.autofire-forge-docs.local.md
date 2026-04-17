---
name: autofire-forge-docs
enabled: true
event: prompt
pattern: (missing\s+doc(s|umentation)?|undocumented\s+(function|method|class|api|export)|generate\s+doc(s|umentation)?|add\s+(jsdoc|tsdoc|doc\s+comments?)|doc(umentation)?\s+coverage|no\s+doc(s|umentation)?\s+(for|on))
action: warn
---

Use `/forge-docs` for documentation gap analysis and generation. Invoke with `skill: "forge-docs"`. This identifies undocumented exports, missing JSDoc, and incomplete documentation across the codebase, with optional auto-generation.
