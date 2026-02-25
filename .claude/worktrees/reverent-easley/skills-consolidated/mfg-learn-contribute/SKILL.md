---
name: mfg-learn-contribute
description: Contribute manufacturing knowledge to the federated learning network
---

# Knowledge Contribution Engine

## When To Use
- Sharing proven cutting parameters, process insights, or best practices with the network
- Contributing anonymized job outcomes after successful production runs
- Aggregating local shop knowledge into the shared learning pool
- Building collective intelligence across multiple manufacturing facilities

## How To Use
```
prism_intelligence action=learn_contribute params={type: "cutting_params", material: "Ti-6Al-4V", operation: "roughing", data: {Vc: 45, fz: 0.08, ap: 2.0, ae: 6.0}, outcome: {tool_life_min: 38, surface_Ra: 1.6}}
prism_intelligence action=learn_aggregate params={topic: "titanium_roughing", min_contributions: 10}
```

## What It Returns
- `contribution_id` — unique identifier for the submitted knowledge
- `status` — acceptance status (accepted, pending_review, rejected)
- `anonymization_level` — level of data anonymization applied
- `network_impact` — estimated impact on network knowledge quality
- `aggregate` — aggregated statistics when using learn_aggregate

## Examples
- Contribute successful parameters: `learn_contribute params={type: "cutting_params", material: "Inconel 718", operation: "finishing", data: {Vc: 30, fz: 0.05}, outcome: {surface_Ra: 0.8}}`
- Contribute tool life data: `learn_contribute params={type: "tool_life", tool: "carbide endmill 12mm", material: "SS 316L", observed_life_min: 52}`
- Aggregate network knowledge: `learn_aggregate params={topic: "aluminum_hsm", metric: "tool_life"}`
