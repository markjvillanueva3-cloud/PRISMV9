---
id: "sc2-055"
title: "2-Axis Wire EDM Profile Cutting with Auto-Threading"
source: "web:surfcam-wire-edm"
confidence: 89
category: "cam_strategy"
tags: ["wire-edm", "2-axis", "profile", "auto-threading", "die-punch"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.073Z
---

# 2-Axis Wire EDM Profile Cutting with Auto-Threading

SURFCAM Wire EDM 2-axis profile cutting generates toolpaths for straight-sided cuts with automatic wire threading sequences. Program the threading point inside the slug (not on the profile) with a start hole 0.5mm larger than the wire diameter. Set the approach distance to 3-5mm from the profile to stabilize the wire before cutting. Use the 'Die' strategy for punch profiles (slug falls away) and 'Punch' strategy for die openings (workpiece is the part).

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:surfcam-wire-edm
**Operations:** wire_edm

## Related
- [[bobcad-cam-tips-bc-061|2-Axis Wire EDM Profile with Open and Closed Shapes]]
- [[camworks-cam-tips-cw-073|2-Axis Wire EDM — Profile Cutting with Automatic Feature Detection]]
- [[edgecam-cam-tips-ec-048|Wire EDM 2-Axis Profile with Lead Strategy]]
- [[esprit-cam-tips-esp-051|Wire EDM 2-Axis Profile with Automatic Lead Placement]]
- [[mastercam-cam-tips-mc-118|2-axis wire EDM profile cuts require proper lead-in to avoid witness marks on the part]]
