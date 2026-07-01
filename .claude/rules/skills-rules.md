---
paths:
  - "**/.claude/skills/**"
---

# Skill Conventions

- SKILL.md requires name and description in frontmatter
- Skill names: lowercase, hyphens, max 64 chars
- Description must be specific enough for auto-invocation matching
- Use $ARGUMENTS for parameter substitution
- Heavy skills (>30s expected) should use context:fork
- Read-only skills should set allowed-tools
- Include argument-hint for autocomplete
