---
name: autofire-yolo-mode
enabled: true
event: prompt
pattern: (yolo\s*mode|full\s+speed|max(imum)?\s+velocity|bypass\s+permissions|go\s+fast|stop\s+asking|auto.?accept\s+all|no\s+more\s+(prompts|questions|confirmations))
action: warn
---

Use `/yolo-mode` for maximum velocity development. Enables bypass permissions (hooks still enforced), autonomous decision-making, and auto-fix protocol (3 attempts per error with rollback safety net). Deactivate with `/yolo-mode off`.
