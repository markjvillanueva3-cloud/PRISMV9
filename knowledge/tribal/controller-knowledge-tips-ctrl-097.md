---
id: "ctrl-097"
title: "Okuma Super-NURBS for high-speed curved surface machining"
source: "controller:web_research"
confidence: 80
category: "programming"
tags: ["controller", "okuma", "Super-NURBS", "surface-finish", "HSM", "mold"]
_source: "controller-knowledge-tips.ts"
indexed_at: 2026-04-28T01:00:42.229Z
---

# Okuma Super-NURBS for high-speed curved surface machining

Super-NURBS on Okuma OSP controls processes curved surfaces using native NURBS interpolation rather than short-line-segment approximation. Benefits: smoother surface finish, faster cycle times (fewer blocks to process), reduced axis reversal marks. CAM must output NURBS format (G06.2 on Okuma) rather than G01 line segments. Not all CAM systems support NURBS output for Okuma — verify post processor capability. Best for: mold/die finishing, aerospace contours, medical implant surfaces. Super-NURBS pairs well with Machining Navi for chatter-free finishing at optimal speeds.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-102|Makino SGI.5 — high-speed micro-block processing for mold finishing]]
- [[controller-knowledge-tips-ctrl-082|TNC 640 Cycle 32 TOLERANCE for HSM optimization]]
- [[controller-knowledge-tips-ctrl-088|Haas G187 accuracy/speed control for HSM]]
- [[controller-knowledge-tips-ctrl-099|Hurco UltiMotion — 10,000-block look-ahead for HSM]]
- [[controller-knowledge-tips-ctrl-051|Fanuc look-ahead buffer sizes by controller model]]
