---
name: autofire-claude-md
enabled: true
event: prompt
pattern: ((update|improve|audit|fix|check)\s+(the\s+)?claude\.?md|claude\.?md\s+(maintenance|optimization|improvement))
action: warn
---

Use the `/claude-md-improver` skill for CLAUDE.md maintenance. Invoke it with the Skill tool: `skill: "claude-md-management:claude-md-improver"`. This scans for all CLAUDE.md files, evaluates quality against templates, outputs a quality report, and makes targeted updates.
