---
name: autofire-code-simplifier
enabled: true
event: prompt
pattern: (simplif(y|ied)|clean\s*up\s+(the\s+)?(code|implementation)|tidy\s+up|improve\s+readability|refactor\s+for\s+clarit|make\s+(it|the\s+code)\s+(cleaner|simpler|more\s+readable))
action: warn
---

Use the `/code-simplifier` skill to simplify and refine code for clarity, consistency, and maintainability while preserving all functionality. Invoke it with the Skill tool: `skill: "code-simplifier:code-simplifier"`. This focuses on recently modified code unless instructed otherwise.
