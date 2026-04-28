---
id: "ctrl-047"
title: "Fadal CNC legacy controller compatibility notes"
source: "controller:fadal_programming_reference"
confidence: 82
category: "programming"
tags: ["fadal", "legacy", "fanuc-compatible", "g-code", "macro-b"]
_source: "controller-knowledge-tips.ts"
indexed_at: 2026-04-28T01:00:42.189Z
---

# Fadal CNC legacy controller compatibility notes

Fadal CNC controllers use a modified Fanuc-compatible G-code dialect with key differences: M60 (pallet change, not M60 on Fanuc), G28 homes differently (intermediate point handling), and Fadal uses O-word numbering for programs starting at O0001. The controller supports Macro B but with limited variable range (#100-#149 only). Modern CAM posts should use 'Fadal VMC' post, not generic Fanuc. Fadal is now owned by JTEKT/Toyoda.

**Category:** programming
**Confidence:** 82
**Source:** controller:fadal_programming_reference

## Related
- [[controller-knowledge-tips-ctrl-113|Fadal CNC Format 1 vs Format 2 critical differences]]
- [[controller-knowledge-tips-ctrl-085|iTNC 530 limitations vs TNC 640 — migration awareness]]
- [[bobcad-cam-tips-bc-089|Canned Cycle Output for Standard and Custom Cycles]]
- [[camworks-cam-tips-cw-085|Post Customization — Modify Output Format for Your Controller]]
- [[camworks-cam-tips-cw-087|Canned Cycle Output — Map Operations to Controller Drill Cycles]]
