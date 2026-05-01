---
name: autofire-quick-review
enabled: true
event: prompt
pattern: (quick(ly)?\s+review|glance\s+at\s+(the\s+)?pr|skim\s+(the\s+)?pr|look\s+at\s+(this|the)\s+pr|check\s+(this|the)\s+pr|fast\s+review|light\s+review)
action: warn
---

Use the `/code-review` skill for a fast, single-pass PR review. Invoke it with the Skill tool: `skill: "code-review:code-review"`. Best for quick feedback or small PRs. For deep multi-agent review, use `/review-pr` instead.
