---
name: Manufacturing Troubleshooter
description: General manufacturing troubleshoot — describe problem, get diagnosis and fix
---

## When To Use
- A machining problem does not fit neatly into surface finish, tool life, or dimensional categories
- Multiple symptoms are present and you need holistic diagnosis
- You want to describe a problem in plain language and get structured guidance
- Quick first-pass triage before diving into specialized inverse solvers

## How To Use
```
prism_intelligence action=inverse_troubleshoot params={
  problem: "Parts coming out with blue discoloration on finish pass, tool lasting only 8 minutes",
  material: "Ti-6Al-4V",
  operation: "turning",
  machine: "Okuma LB3000",
  cutting_params: { speed: 80, feed: 0.15, depth: 0.5 }
}
```

## What It Returns
- Prioritized list of probable causes with confidence levels
- Diagnostic questions to narrow down the root cause
- Immediate corrective actions ranked by likelihood of success
- Links to specialized inverse solvers for deeper analysis

## Examples
- Input: `inverse_troubleshoot params={ problem: "burr formation on aluminum exit edges", material: "AL-6061", operation: "milling" }`
- Output: Likely causes: dull tool (45%), wrong helix angle (30%), feed too low (25%); check tool wear first

- Input: `inverse_troubleshoot params={ problem: "intermittent squealing noise, random intervals, no visible chatter marks" }`
- Output: Probable built-up edge breaking free; increase speed 15% or switch to coated insert
