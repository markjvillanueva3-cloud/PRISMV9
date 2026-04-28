---
id: "esp-063"
title: "Sinker EDM Burn Depth Control and Electrode Wear"
source: "web:esprit-sinker-edm"
confidence: 86
category: "cam_strategy"
tags: ["sinker-edm", "burn-depth", "electrode-wear", "compensation"]
_source: "esprit-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.489Z
---

# Sinker EDM Burn Depth Control and Electrode Wear

ESPRIT manages burn depth with electrode wear compensation. Graphite electrodes wear at 1-5% of the removal depth (low wear), while copper electrodes wear at 5-15% (standard). Configure the wear ratio per electrode-workpiece material pair and ESPRIT adjusts the plunge depth to compensate. For critical dimensions, program a measurement cycle between rough and finish electrodes to measure actual depth and apply real-time compensation. Always include electrode dressing allowance in the total depth calculation.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:esprit-sinker-edm
**Operations:** sinker_edm

## Related
- [[controller-knowledge-tips-ctrl-110|Sodick EDM linear motor and programming considerations]]
- [[esprit-cam-tips-esp-059|Sinker EDM Electrode Path Planning in ESPRIT]]
- [[esprit-cam-tips-esp-060|Sinker EDM Orbital Motion for Improved Flushing]]
- [[esprit-cam-tips-esp-061|Sinker EDM Vector Erosion for Non-Vertical Surfaces]]
- [[esprit-cam-tips-esp-062|Sinker EDM Linear Path for Rib and Slot Features]]
