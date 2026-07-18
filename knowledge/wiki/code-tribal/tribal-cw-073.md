---
name: tribal-cw-073
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "wire-edm", "2-axis", "profile", "offset"]
confidence: 89
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-073.md
promoted_at: 2026-06-09T22:31:16.003Z
---

# 2-Axis Wire EDM — Profile Cutting with Automatic Feature Detection

CAMWorks Wire EDM automatically recognizes 2-axis profiles from the solid model — select the through-feature and the system identifies start holes, approach paths, and cutting profiles. For die openings, set the wire offset based on final tolerance: rough cut +0.15mm, first skim +0.05mm, finish skim +0.01mm. Always verify the cutting direction (CW for die, CCW for punch) to ensure the wire offset applies to the correct side of the profile.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:camworks-docs
**Operations:** wire_edm

## Related
- [[bobcad-cam-tips-bc-061|2-Axis Wire EDM Profile with Open and Closed Shapes]]
- [[edgecam-cam-tips-ec-048|Wire EDM 2-Axis Profile with Lead Strategy]]
- [[esprit-cam-tips-esp-051|Wire EDM 2-Axis Profile with Automatic Lead Placement]]
- [[mastercam-cam-tips-mc-118|2-axis wire EDM profile cuts require proper lead-in to avoid witness marks on the part]]
- [[surfcam-cam-tips-sc2-055|2-Axis Wire EDM Profile Cutting with Auto-Threading]]
