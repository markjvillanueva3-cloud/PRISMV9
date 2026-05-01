---
name: autofire-handoff
enabled: true
event: prompt
pattern: (end(ing)?\s+(this\s+)?session|wrapping\s+up|goodbye|done\s+for\s+(now|today)|sign(ing)?\s+off|closing\s+(out|session)|before\s+I\s+(go|leave)|save\s+session|session\s+handoff|continue\s+(this\s+)?later|next\s+session|stopping\s+(for\s+now|here)|save\s+(state|progress|my\s+work)|pick\s+(this\s+)?up\s+(later|tomorrow|next)|where\s+did\s+we\s+leave)
action: warn
---

Use `/handoff` to save session state before ending. Invoke with the Skill tool: `skill: "handoff"`. This captures your active task, decisions made, files modified, and next actions into `C:/PRISM/state/HANDOFF.md` so the next session can resume instantly. Quick version: `/handoff quick`.
