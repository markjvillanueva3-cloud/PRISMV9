---
name: autofire-commit
enabled: true
event: prompt
pattern: (commit\s+(this|these|my|the|all|changes|it|everything)|make\s+a\s+commit|create\s+a\s+commit|ready\s+to\s+commit|let'?s\s+commit|push\s+(this|and\s+commit|these\s+changes|my\s+changes))
action: warn
---

Use the `/commit` skill for this task. Invoke it with the Skill tool: `skill: "commit"`. This handles git staging, commit message drafting, and follows repository conventions automatically.
