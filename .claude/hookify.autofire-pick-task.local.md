---
name: autofire-pick-task
enabled: true
event: prompt
pattern: (start working|what should I|next task|pick a task|what's next|begin work|resume work|get started)
action: warn
---

Use the `/pick-task` skill to claim a unit from the PRISM roadmap. Invoke it with the Skill tool: `skill: "pick-task"`. This handles roadmap scanning, claim coordination, and unit loading automatically.
