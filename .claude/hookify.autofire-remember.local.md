---
name: autofire-remember
enabled: true
event: prompt
pattern: (remember\s+(this|that|it|always|to\s+always|to\s+never|for\s+next)|save\s+(this|that)\s+(to|in)\s+memory|note\s+(this|that)|don'?t\s+(ever|forget)|add\s+to\s+memory|persist\s+(this|that)|store\s+(this|that)|always\s+(use|do|run|prefer|start\s+with|include)|never\s+(use|do|run|auto|skip|commit|push)|from\s+now\s+on|in\s+future\s+sessions|across\s+sessions|persistent\s+preference)
action: warn
---

Use `/remember` for structured memory persistence. Invoke with the Skill tool: `skill: "remember"`. It deduplicates against existing MEMORY.md entries, routes to the correct section, compresses to minimal tokens, and enforces the 200-line budget. Example: `/remember fix always use vitest not jest`
