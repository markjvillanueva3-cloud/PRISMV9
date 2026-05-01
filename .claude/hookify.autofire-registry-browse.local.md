---
name: autofire-registry-browse
enabled: true
event: prompt
pattern: (browse\s+registr|registr\w+\s+(entries|contents|list|search|browse|explore|stats)|what'?s\s+(in|registered\s+in)\s+(the\s+)?(algorithm|formula|tool|material|machine)\s+registry|show\s+registr|list\s+registr|registry\s+gaps|how\s+many\s+(entries|items)\s+in)
action: warn
---

Use `/registry-browse` to explore PRISM's 18 registries. Examples: `/registry-browse` (list all), `/registry-browse algorithm` (browse specific), `/registry-browse search formula coolant` (search), `/registry-browse stats` (statistics), `/registry-browse gaps` (find empty registries).
