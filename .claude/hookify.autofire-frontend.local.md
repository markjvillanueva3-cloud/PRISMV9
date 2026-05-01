---
name: autofire-frontend
enabled: true
event: prompt
pattern: ((build|create|design|make)\s+(a\s+|the\s+|this\s+|me\s+a\s+)?(web|frontend|ui|landing|dashboard|page|component|interface|layout|website|site))
action: warn
---

Use the `/frontend-design` skill for this UI task. Invoke it with the Skill tool: `skill: "frontend-design:frontend-design"`. This generates distinctive, production-grade frontend interfaces with high design quality that avoids generic AI aesthetics.
