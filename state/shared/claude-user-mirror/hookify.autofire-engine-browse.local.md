---
name: autofire-engine-browse
enabled: true
event: prompt
pattern: (list\s+(all\s+)?engines|browse\s+engines|search\s+engines|engine\s+(inventory|list|catalog|count)|what\s+engines\s+(are|do|exist)|how\s+many\s+engines|find\s+(an?\s+)?engine|engine\s+for\s+|show\s+(me\s+)?engines|which\s+engine\s+(handles|calculates|does)|unwired\s+engines|engine\s+domains?)
action: warn
---

Use `/engine-browse` to explore PRISM's 200+ calculation engines. Examples: `/engine-browse` (domain summary), `/engine-browse force` (search by keyword), `/engine-browse cutting` (list by domain), `/engine-browse TurningForceEngine` (detailed view), `/engine-browse unwired` (find unwired engines).
