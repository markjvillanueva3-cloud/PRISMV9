---
name: autofire-scripts
enabled: true
event: prompt
pattern: (run\s+(the\s+)?(python\s+)?script|python\s+script|materials?\s+accuracy|run\s+accuracy|execute\s+script|prism\s+script|list\s+scripts|validate\s+scripts)
action: warn
---

Use `/scripts` for PRISM Python script management. Invoke with the Skill tool: `skill: "scripts"`. It discovers 90+ scripts across 8 categories, runs them with the correct Python path and WMI fix, captures results, and checks against known baselines. Example: `/scripts run accuracy`.
