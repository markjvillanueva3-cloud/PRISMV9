---
id: "wnc-151"
title: "Electrode Wear Compensation — Multiple Electrodes per Feature"
source: "web:worknc-docs"
confidence: 88
category: "cam_strategy"
tags: ["electrode", "wear", "compensation", "copies", "batch"]
_source: "worknc-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.738Z
---

# Electrode Wear Compensation — Multiple Electrodes per Feature

EDM electrodes wear during the burn process — graphite wears 1-10% of the machined depth, copper wears 0.5-3%. For deep cavities, plan multiple copies of the same electrode: 1 for roughing (will wear significantly), 1-2 for semi-finishing, and 1 for final finishing. WorkNC programs all copies in a batch — same CAM program, multiple blanks nested in one setup. Track electrode wear by measuring the electrode after each burn stage. If wear exceeds the finishing stock remaining, burn a fresh electrode before the finish pass.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:worknc-docs
**Operations:** edm

## Related
- [[cimatron-cam-tips-cim-017|Copper Electrode EDM Burn Compensation]]
- [[catia-cam-tips-cat-192|Electrode Design and Machining Integration in CATIA]]
- [[cimatron-cam-tips-cim-002|Electrode Extraction from Mold Cavity]]
- [[cimatron-cam-tips-cim-015|Graphite Electrode Machining Parameters]]
- [[cimatron-cam-tips-cim-039|Process Variability in Electrode Spark Gap Control]]
