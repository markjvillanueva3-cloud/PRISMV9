---
name: autofire-material-lookup
enabled: true
event: prompt
pattern: (look\s*up\s+(material|alloy|metal|steel)|material\s+(properties|data|info)|alloy\s+(properties|data|composition)|what\s+(is|are)\s+(the\s+)?(properties|composition|hardness|density|strength)\s+of|compare\s+(materials|alloys|steels|metals)|machinability\s+of|which\s+(alloy|material|steel|metal)\s+(has|for|with))
action: warn
---

Use `/material-lookup` to query the PRISM materials database (300+ alloys). Examples: `/material-lookup 4140` (single alloy), `/material-lookup compare 4140 4340` (comparison), `/material-lookup category stainless` (by category), `/material-lookup search uts_annealed > 800` (property search), `/material-lookup stats` (database stats).
