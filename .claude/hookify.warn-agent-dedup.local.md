---
name: warn-agent-dedup
enabled: true
event: all
action: block
---
TOKEN SAVE: This exact Agent query ran recently. Use the previous results instead of re-running (~5-20K tokens saved per blocked duplicate).
