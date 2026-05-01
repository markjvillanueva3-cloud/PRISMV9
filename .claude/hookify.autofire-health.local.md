---
name: autofire-health
enabled: true
event: prompt
pattern: (system\s+(health|status|check)|health\s+check|what'?s\s+(broken|wrong|the\s+status)|check\s+(system|health|status)|overall\s+status|how\s+(is\s+the\s+system|are\s+things)\s+(doing|looking)|dashboard\s+status)
action: warn
---

Use `/health` for a system health dashboard. Invoke with `skill: "health"`. This checks hook status, ARCHITECTURE.json freshness, PRISM build status, test results, count drift, and overall system health in one view.
