---
name: tribal-bc-061
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["wire-edm", "2-axis", "profile", "open-closed", "inside-outside"]
confidence: 89
source: "web:bobcad-wire-edm-2axis"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-061.md
promoted_at: 2026-06-09T22:31:15.947Z
---

# 2-Axis Wire EDM Profile with Open and Closed Shapes

BobCAD Wire EDM supports open and closed profiles with inside and outside shape programming. For closed profiles, program threading point inside the slug with a start hole 0.5mm larger than wire diameter. Set approach distance to 3-5mm from profile. Use 'Inside' for die openings (workpiece is the part) and 'Outside' for punch profiles (slug falls away). BobCAD handles lead-in/out geometry automatically with configurable arc or linear approaches.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:bobcad-wire-edm-2axis
**Operations:** wire_edm

## Related
- [[camworks-cam-tips-cw-073|2-Axis Wire EDM — Profile Cutting with Automatic Feature Detection]]
- [[edgecam-cam-tips-ec-048|Wire EDM 2-Axis Profile with Lead Strategy]]
- [[esprit-cam-tips-esp-051|Wire EDM 2-Axis Profile with Automatic Lead Placement]]
- [[mastercam-cam-tips-mc-118|2-axis wire EDM profile cuts require proper lead-in to avoid witness marks on the part]]
- [[surfcam-cam-tips-sc2-055|2-Axis Wire EDM Profile Cutting with Auto-Threading]]
