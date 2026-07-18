---
name: prism-pillar
description: View PRISM product pillars with completeness scores, engine lists, and feature gates.
model: sonnet
effort: high
context: 15%
allowed-tools: ["Read", "Bash", "Agent"]
---

# /pillar — Product Pillar Dashboard

View the 8 PRISM product pillars and their readiness status.

## Usage
- `/pillar` — Show all 8 pillars with completeness scores
- `/pillar <name>` — Detail for a specific pillar (calculator, toolpath, postprocessor, quote, quality, edm, knowledge, automation)
- `/pillar --gate <tier>` — Show pillars accessible at a subscription tier (free, pro, enterprise)

## Implementation

### List all pillars:
1. Call `prism_dev` with action `pillar_summary` and params `{ "wired_engines": [], "active_skills": [] }`
   Note: Pass empty arrays for quick view, or populate from census for accurate scoring
2. Display:

```
PRISM Product Pillars
======================
| Pillar         | Engines | Wired | Completeness | Status  | Tier       |
|----------------|---------|-------|--------------|---------|------------|
| Calculator     | 9       | 7     | 78%          | partial | free       |
| Toolpath       | 5       | 3     | 60%          | partial | pro        |
| PostProcessor  | 6       | 5     | 83%          | ready   | pro        |
| Quote & Cost   | 4       | 3     | 75%          | partial | pro        |
| Quality        | 4       | 1     | 25%          | stub    | pro        |
| Wire EDM       | 4       | 4     | 100%         | ready   | pro        |
| Knowledge      | 4       | 3     | 75%          | partial | free       |
| Automation     | 6       | 6     | 100%         | ready   | enterprise |

Overall: [N] ready, [N] partial, [N] stub | Avg: [X]%
```

### Detail for specific pillar:
1. Call `prism_dev` with action `pillar_score` and params `{ "pillar_id": "<name>" }`
2. Show engines, entry actions, entry skills, dependencies, missing engines

### Gate check:
1. Call `prism_dev` with action `pillar_gate` and params `{ "pillar_id": "<each>", "tier": "<tier>" }`
2. Show which pillars are accessible at that tier
