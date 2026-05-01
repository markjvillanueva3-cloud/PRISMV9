---
name: prism-census
description: Run live capability census showing engine utilization, dark engines, wiring gaps, and domain breakdown.
model: sonnet
effort: high
context: 20%
allowed-tools: ["Read", "Bash", "Agent"]
---

# /census — Live Capability Census

Scan the entire PRISM system and report utilization metrics.

## Usage
- `/census` — Full report
- `/census --save` — Save census to data/state/CAPABILITY_CENSUS.json

## Implementation

1. Call `prism_dev` with action `capability_census_report` (no params needed)
2. Display the report in this format:

```
PRISM Capability Census
========================
Engines:     [total] | Wired: [N] ([%]) | Dark: [N] | Internal: [N]
Dispatchers: [total] | Active: [N] | Stubs: [N]
Actions:     [total]
Utilization: [%]

Domain Breakdown:
  physics:        [X] engines | [Y]% utilized
  post_processor: [X] engines | [Y]% utilized
  business:       [X] engines | [Y]% utilized
  ...

Top 10 Dark Engines (built but no dispatcher path):
  1. [engine name]
  2. ...

Top Gaps (severity-sorted):
  1. [gap description]
  ...
```

3. If `--save` flag, also call `prism_dev` with action `capability_census_save`
