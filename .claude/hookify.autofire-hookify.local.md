---
name: autofire-hookify
enabled: true
event: prompt
pattern: (create\s+(a\s+)?hook(ify)?\s+rule|add\s+(a\s+)?hook(ify)?\s+rule|new\s+hook(ify)?\s+rule|hookify\s+rule\s+for|prevent\s+(me|claude|this)\s+from|warn\s+(me|when|if)\s+(i|we|claude))
action: warn
---

Use the `/hookify` skill to create new hook rules from conversation analysis. Invoke it with the Skill tool: `skill: "hookify:hookify"`. This analyzes conversation patterns and creates `.local.md` rules that prevent unwanted behaviors.
