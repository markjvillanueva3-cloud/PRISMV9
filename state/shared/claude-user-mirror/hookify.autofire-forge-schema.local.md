---
name: autofire-forge-schema
enabled: true
event: prompt
pattern: (validate\s+(json\s+)?schema|schema\s+(check|valid|violat)|json\s+(schema|valid)|registry\s+schema|milestone\s+schema|envelope\s+(valid|schema|format)|generate\s+schema)
action: warn
---

Use `/forge-schema` for JSON schema validation and generation. Invoke with `skill: "forge-schema"`. This validates registry files, milestone envelopes, and config files against schemas, detects structural violations, and can generate missing schemas.
