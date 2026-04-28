---
id: "ctrl-042"
title: "Kitamura Arumatik-Mi proprietary control features"
source: "controller:kitamura_arumatik_overview"
confidence: 83
category: "programming"
tags: ["kitamura", "arumatik", "fanuc-based", "thermal-compensation"]
_source: "controller-knowledge-tips.ts"
indexed_at: 2026-04-28T01:00:42.185Z
---

# Kitamura Arumatik-Mi proprietary control features

Kitamura's Arumatik-Mi (based on Fanuc 31i) adds: thermal displacement compensation using 8 embedded sensors (better than Fanuc standard), vibration monitoring dashboard, automatic spindle warm-up cycle, and predictive maintenance alerts. G-code is 100% Fanuc-compatible. The -Mi 5X variant adds 5-axis TCP control optimized for Kitamura's rotary table geometry. Programs written for Fanuc 31i-B5 run without modification.

**Category:** programming
**Confidence:** 83
**Source:** controller:kitamura_arumatik_overview

## Related
- [[bobcad-cam-tips-bc-215|Thermal Compensation Feedback from Digital Twin to BobCAD]]
- [[esprit-cam-tips-esp-206|Digital Twin Thermal Compensation Feedback Loop]]
- [[surfcam-cam-tips-sc2-196|Digital Twin Thermal Compensation Feedback to SURFCAM]]
