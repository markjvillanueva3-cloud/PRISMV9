---
id: "ctrl-057"
title: "Fanuc coolant M-codes including through-spindle"
source: "controller:web_research"
confidence: 80
category: "programming"
tags: ["controller", "fanuc", "coolant", "through-spindle", "M-codes"]
_source: "controller-knowledge-tips.ts"
indexed_at: 2026-04-28T01:00:42.197Z
---

# Fanuc coolant M-codes including through-spindle

Standard coolant: M7 (mist coolant on), M8 (flood coolant on), M9 (all coolant off). Combined spindle+coolant: M13 (spindle CW + coolant on), M14 (spindle CCW + coolant on) — saves a line vs separate M3/M8. Through-spindle coolant (TSC): M-codes are builder-specific, commonly M50, M51, or in the M80-M89 range. Always check your machine manual. High-pressure coolant systems may have separate M-codes for pressure selection. Some builders use M-codes in the M600 series for coolant pressure levels. For TSC: ensure spindle is at speed before activating TSC to avoid coolant spray without rotation. When programming TSC with HSM, place the TSC activation M-code before the cutting move, not in the same block as rapid positioning.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-009|Fanuc through-spindle coolant M-codes vary by OEM]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
- [[controller-knowledge-tips-ctrl-051|Fanuc look-ahead buffer sizes by controller model]]
- [[controller-knowledge-tips-ctrl-052|Fanuc Macro B variable ranges and persistence]]
- [[controller-knowledge-tips-ctrl-053|Fanuc probing with G31 skip signal]]
