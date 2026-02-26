---
name: mfg-learn-correction
description: Submit and track corrections to federated manufacturing knowledge
---

# Learning Correction Protocol

## When To Use
- Reporting inaccurate or outdated knowledge in the federated network
- Submitting corrections with evidence from your own machining results
- Tracking the status of submitted corrections through the review process
- Reviewing transparency logs showing how knowledge has been corrected over time

## How To Use
```
prism_intelligence action=learn_correction params={knowledge_id: "KN-TI64-ROUGH-001", correction: {field: "recommended_Vc", old_value: 55, new_value: 45, reason: "Excessive tool wear observed at 55 m/min across 3 production runs"}}
prism_intelligence action=learn_transparency params={knowledge_id: "KN-TI64-ROUGH-001"}
```

## What It Returns
- `correction_id` — unique identifier for the correction submission
- `status` — review status (submitted, under_review, accepted, rejected)
- `evidence_score` — strength of evidence supporting the correction
- `transparency_log` — chronological history of corrections to this knowledge
- `impact` — estimated impact of the correction on downstream recommendations

## Examples
- Submit a parameter correction: `learn_correction params={knowledge_id: "KN-AL6061-HSM-003", correction: {field: "max_fz", old_value: 0.15, new_value: 0.12, reason: "Chatter onset above 0.12 mm/tooth at ae>50%"}}`
- View correction history: `learn_transparency params={knowledge_id: "KN-TI64-ROUGH-001"}`
- Track correction status: `learn_transparency params={correction_id: "COR-2026-0087"}`
