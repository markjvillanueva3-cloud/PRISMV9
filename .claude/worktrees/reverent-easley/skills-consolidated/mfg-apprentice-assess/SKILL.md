---
name: mfg-apprentice-assess
description: Assess machinist skill level with challenges and scoring
---

# Skill Assessment Engine

## When To Use
- Evaluating a machinist's competency level before assigning tasks
- Running skill challenges to test knowledge retention after training
- Benchmarking team capabilities across manufacturing domains
- Identifying knowledge gaps for targeted training plans

## How To Use
```
prism_intelligence action=apprentice_assess params={domain: "turning", operator_id: "OP-42"}
prism_intelligence action=apprentice_challenge params={topic: "tool selection", difficulty: "intermediate"}
```

## What It Returns
- `score` — numeric assessment score (0-100) with pass/fail threshold
- `level` — assessed skill level (novice/beginner/intermediate/advanced/expert)
- `gaps` — identified knowledge gaps with recommended remediation
- `challenge` — generated challenge question or scenario with answer key
- `history` — prior assessment results for tracking progress over time

## Examples
- Assess turning skills: `apprentice_assess params={domain: "turning", operator_id: "OP-42"}` — returns score 72/100, intermediate level, gap in thread cutting
- Generate a tool selection challenge: `apprentice_challenge params={topic: "tool selection", difficulty: "intermediate"}` — returns scenario: "Select insert grade for machining 316L stainless at 180 m/min"
- Assess multi-domain competency: `apprentice_assess params={domain: "general", operator_id: "OP-15"}` — returns breakdown across turning (85), milling (62), drilling (78)
