---
paths:
  - "**/skills-consolidated/**"
---

# PRISM Skills System Conventions

- 257 skills indexed in TRIGGER_MAP.json (1206 triggers, 2926 mappings)
- 14 superpowers (priority=100) in SUPERPOWERS_REGISTRY.json
- 10 context-triggered auto-skill hooks in AUTO_SKILL_HOOKS.json
- Skill files: YAML frontmatter + markdown body
- Always check TRIGGER_MAP.json for existing skill before creating new one
- New skills must include: trigger keywords, description, priority level
- MIT course skills (18) and formula skills (6) added 2026-02-26
- Load skills via TRIGGER_MAP auto-matching before manual ToolSearch
