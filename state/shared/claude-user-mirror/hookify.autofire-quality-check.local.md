---
name: autofire-quality-check
enabled: true
event: prompt
pattern: (spc\s+(analysis|chart|control)|process\s+capability|cpk\s+(analysis|predict|calc)|tolerance\s+stack|gd&?t\s+(valid|check|analysis)|cmm\s+(plan|inspect)|gauge\s+r&?r|measurement\s+system|control\s+chart|western\s+electric|quality\s+(check|report|analysis)|statistical\s+process\s+control|run\s+a\s+(quality|spc|cpk)\s+(check|analysis))
action: warn
---

Use `/quality-check` for shop floor quality engineering. Supports SPC, Cpk, tolerance stack-up, GD&T validation, CMM planning, and gauge R&R through the prism_quality dispatcher. Examples: `/quality-check spc bore_diameter 25.01 25.02 24.99 25.00 25.01` (SPC analysis), `/quality-check cpk bore_diameter 25.05 24.95` (process capability), `/quality-check stack features...` (tolerance stack-up), `/quality-check full part_name` (complete chain).
