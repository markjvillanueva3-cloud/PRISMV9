---
name: autofire-forge-metrics
enabled: true
event: prompt
pattern: (code(base)?\s+metrics?|complexity\s+(score|analys|report)|coupling\s+(analys|metric|score)|codebase\s+(stats?|statistic|health\s+score)|file\s+size\s+(distribut|analys)|how\s+(big|complex|coupled)\s+is)
action: warn
---

Use `/forge-metrics` for codebase metrics dashboard. Invoke with `skill: "forge-metrics"`. This computes complexity scores, coupling analysis, file size distribution, PRISM-specific metrics, and trend tracking against saved baselines.
