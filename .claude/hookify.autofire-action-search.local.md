---
name: autofire-action-search
enabled: true
event: prompt
pattern: (search\s+(for\s+)?(action|dispatcher)|find\s+(the\s+)?(action|dispatcher)|which\s+dispatcher\s+(handles|has|does)|what\s+actions\s+(does|are|exist)|list\s+actions|action\s+(for|that|to)|dispatcher\s+actions|unwired\s+actions|how\s+many\s+actions)
action: warn
---

Use `/action-search` to search across 1260+ dispatcher actions. Examples: `/action-search thermal` (keyword search), `/action-search dispatcher safety` (list dispatcher actions), `/action-search count` (per-dispatcher counts), `/action-search unwired` (find missing handlers), `/action-search map` (domain overview).
