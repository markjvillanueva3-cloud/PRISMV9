---
name: autofire-scope
enabled: true
event: prompt
pattern: (what\s+(files?|modules?|components?)\s+(does\s+this|will\s+this|would\s+this)\s+(affect|change|impact|touch)|impact\s+analysis|blast\s+radius|change\s+impact|scope\s+of\s+(this\s+)?change|what\s+(will|would)\s+break|ripple\s+effect|downstream\s+effects?)
action: warn
---

Use `/scope` for change impact analysis. Invoke with `skill: "scope"`. This traces imports, exports, and dependencies to identify all files and modules affected by a change, preventing unexpected regressions.
