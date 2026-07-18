---
name: tribal-sc2-206
category: code-tribal
subdomain: quality
domain: tribal-knowledge
tags: ["probing", "stock-verification", "semi-finish", "conditional", "safety"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-206.md
promoted_at: 2026-06-09T22:31:16.705Z
---

# SURFCAM Stock Verification Probing Between Operations

Insert probing operations between roughing and finishing in SURFCAM to verify stock allowance before the finish pass. Probe the semi-finished surface at 5-10 points and compare against the expected stock model. If measured stock exceeds the expected allowance by >0.2mm, the finish pass may be overloaded. Program conditional logic: if excess stock detected, insert an additional semi-finish pass before the final finish. This prevents tool breakage and dimensional errors from inconsistent casting/forging stock. The probe macro stores measurements in machine variables for the conditional check.

**Category:** quality
**Confidence:** 0.85
**Source:** web:surfcam-docs
**Operations:** probing, finishing

## Related
- [[camworks-cam-tips-cw-198|Stock Verification Probing — Confirm Raw Material Before Machining]]
- [[camworks-cam-tips-cw-116|Tool Measurement Probing — Verify Tool Length and Diameter On-Machine]]
- [[cimatron-cam-tips-cim-194|Probing for Stock Verification Before Semi-Finish]]
- [[powermill-cam-tips-pm-195|Probing for Stock Verification]]
- [[bobcad-cam-tips-bc-081|Machine Simulation PRO with Full Kinematic Model]]
