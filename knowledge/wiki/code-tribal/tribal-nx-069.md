---
name: tribal-nx-069
category: code-tribal
subdomain: safety
domain: tribal-knowledge
tags: ["siemens-nx", "gouge-checking", "assembly", "5-axis", "collision-prevention"]
confidence: 88
source: "web:siemens-nx-docs"
promoted_from: knowledge/tribal/nx-cam-tips-ext-nx-069.md
promoted_at: 2026-06-09T22:31:16.479Z
---

# Gouge Checking with Full Assembly Validation

Enable gouge checking against all components (part + IPW + fixture + clamps + neighboring tools in the magazine) by setting Check Scope to Entire Assembly in 5-axis operations. NX defaults to Part Only, which misses holder-to-fixture collisions that are the most common crash cause in 5-axis work. Full assembly gouge checking adds 5-10% to computation time but catches 95% of near-miss scenarios that would otherwise require ISV to detect.

**Category:** safety
**Confidence:** 88
**Source:** web:siemens-nx-docs
**Operations:** roughing, finishing, 5-axis

## Related
- [[nx-cam-tips-ext-nx-061|Variable Axis Surface Contour with Lead/Lag Angles]]
- [[nx-cam-tips-ext-nx-063|SWARF Driving with Ruled Surface Verification]]
- [[nx-cam-tips-ext-nx-066|Generic Motion for Custom 5-Axis Trajectories]]
- [[nx-cam-tips-ext-nx-067|Tool Axis Vector Interpolation Methods]]
- [[nx-cam-tips-ext-nx-068|Smooth Transition Strategies Between 5-Axis Regions]]
