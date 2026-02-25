---
name: Manufacturing Risk Assessor
description: Assess manufacturing risk for process plan features and operations
---

## When To Use
- When evaluating risk of a generated process plan before production
- When identifying features or operations likely to cause problems
- When prioritizing quality checks and inspection points
- NOT for tool breakage prediction — use mfg-tool-breakage instead
- NOT for chatter prediction — use mfg-chatter-predict instead

## How To Use
```
prism_intelligence action=genplan_risk params={
  plan_id: "plan-bracket-001",
  risk_categories: ["tolerance", "surface_finish", "tool_life", "fixturing"],
  material: "Ti-6Al-4V",
  criticality: "aerospace"
}
```

## What It Returns
- Risk score per feature and operation (low/medium/high/critical)
- Risk category breakdown with contributing factors
- Mitigation recommendations for high-risk items
- Suggested inspection points and methods
- Overall plan risk rating with confidence level

## Examples
- Input: `genplan_risk params={plan_id: "plan-A1", material: "Inconel 718", criticality: "aerospace"}`
- Output: 3 high-risk items — thin wall deflection, deep bore tolerance, tool life on finish pass. Mitigation: reduced DOC, boring bar dampener, mid-cycle tool change

- Input: `genplan_risk params={plan_id: "plan-B2", material: "6061-T6", criticality: "commercial"}`
- Output: 1 medium-risk item — thread tolerance near capability. Mitigation: gauge verification after first part
