---
name: autofire-review-pr
enabled: true
event: prompt
pattern: (review\s+(this\s+)?pr|review\s+(this\s+)?pull\s+request|code\s+review\s+(the|this|pr|pull)|deep\s+review|thorough(ly)?\s+review|full\s+review)
action: warn
---

Use the `/review-pr` skill for comprehensive, multi-agent PR review. Invoke it with the Skill tool: `skill: "pr-review-toolkit:review-pr"`. This launches specialized agents for code review, type design, silent failure hunting, and test analysis. Best for thorough reviews before merge.
