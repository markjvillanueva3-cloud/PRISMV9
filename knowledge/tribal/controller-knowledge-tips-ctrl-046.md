---
id: "ctrl-046"
title: "Sodick LN Professional for wire EDM"
source: "controller:sodick_ln_manual"
confidence: 85
category: "programming"
tags: ["sodick", "edm", "wire-edm", "ln-professional", "awt", "taper-cutting"]
_source: "controller-knowledge-tips.ts"
indexed_at: 2026-04-28T01:00:42.188Z
---

# Sodick LN Professional for wire EDM

Sodick's LN Professional EDM controller is optimized for wire/sinker EDM. Key differences from milling controllers: no spindle RPM or feed rate in the traditional sense. Programs specify wire feed tension, flushing pressure, discharge current/voltage, and gap voltage. Sodick uses LN Professional's AWT (Automatic Wire Threading) codes: M50 (thread wire), M51 (cut wire). Taper cutting uses UV-axis programming with standard G41/G42 for wire radius comp.

**Category:** programming
**Confidence:** 85
**Source:** controller:sodick_ln_manual

## Related
- [[controller-knowledge-tips-ctrl-110|Sodick EDM linear motor and programming considerations]]
- [[bobcad-cam-tips-bc-066|Wire Threading and Glue Stop Programming]]
- [[bobcad-cam-tips-bc-160|BobCAD Wire EDM Automatic Wire Threading Point Optimization]]
- [[gibbscam-cam-tips-gc-069|Automatic wire threading enables multi-opening unattended production]]
- [[mastercam-cam-tips-mc-122|Automatic wire threading sequences enable unattended wire EDM operation]]
