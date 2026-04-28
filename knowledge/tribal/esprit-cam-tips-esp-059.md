---
id: "esp-059"
title: "Sinker EDM Electrode Path Planning in ESPRIT"
source: "web:esprit-sinker-edm"
confidence: 86
category: "cam_strategy"
tags: ["sinker-edm", "electrode", "path-planning", "gap"]
_source: "esprit-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.486Z
---

# Sinker EDM Electrode Path Planning in ESPRIT

ESPRIT generates electrode plunge paths for sinker EDM with controlled approach, burn, and retract sequences. Define the electrode geometry, workpiece cavity, and gap distance (typically 0.01-0.05mm for finishing). Program multiple electrodes for rough (oversized electrode, fast removal) and finish (near-net electrode, fine finish). ESPRIT manages the electrode numbering, offset compensation, and Z-depth control for each stage.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:esprit-sinker-edm
**Operations:** sinker_edm

## Related
- [[mastercam-cam-tips-mc-142|Electrode creation from solid bodies automates EDM electrode design and machining]]
- [[wedm-knowledge-tips-wedm-sp-006|SP43/SP64 copper (Cu) library: 3-pass High Precision achieves Ra 12 µin — use for electrode and fixture cutting]]
- [[controller-knowledge-tips-ctrl-110|Sodick EDM linear motor and programming considerations]]
- [[esprit-cam-tips-esp-060|Sinker EDM Orbital Motion for Improved Flushing]]
- [[esprit-cam-tips-esp-061|Sinker EDM Vector Erosion for Non-Vertical Surfaces]]
