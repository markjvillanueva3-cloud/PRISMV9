---
name: autofire-feature-dev
enabled: true
event: prompt
pattern: ((build|implement|add|create|develop)\s+(a\s+|the\s+|this\s+)?(new\s+)?feature|feature\s+development)
action: warn
---

Use the `/feature-dev` skill for guided feature development. Invoke it with the Skill tool: `skill: "feature-dev:feature-dev"`. This provides codebase exploration, architecture design, and structured implementation with code-explorer and code-architect agents.
