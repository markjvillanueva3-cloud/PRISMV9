---
name: autofire-check-dsl
enabled: true
event: prompt
pattern: (check\s+dsl|dsl\s+(compliance|check|verify|validation)|atomicvalue\s+pattern|action\s+schema|prism\s+patterns|parameter\s+normalization|verify\s+conventions)
action: warn
---

Use `/check-dsl` to verify PRISM DSL compliance: AtomicValue returns, Action schemas, parameter normalization, safety integration, hook registration, and schema compliance. Reports violations with file:line and suggested fixes.
