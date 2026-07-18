---
name: warn-glob-burst
enabled: true
event: all
action: warn
---
TOKEN SAVE: Multiple Glob calls on same path in quick succession. Combine patterns with brace expansion (e.g., **/*.{ts,tsx,js}) or use a single broader pattern to reduce tool call overhead.
