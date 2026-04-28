---
id: "ctrl-025"
title: "Haas UMC 5-axis TCPC setup"
source: "controller:haas_5axis_setup"
confidence: 90
category: "programming"
tags: ["haas", "umc", "tcpc", "g234", "5-axis", "pivot-point"]
_source: "controller-knowledge-tips.ts"
indexed_at: 2026-04-28T01:00:42.173Z
---

# Haas UMC 5-axis TCPC setup

Haas Tool Center Point Control (TCPC, equivalent to Fanuc G43.4) is activated with G234 on UMC series. Requires: Setting 33 (Tool Offset Measure) = router geometry. Setting 256 (TCPC enabled) = ON. Pivot point set in Settings 276-281 (XYZ offsets for A and B rotary axes). Without correct pivot lengths, TCPC will crash. Test with G234 at low feed (F10) first, watching for unexpected XYZ moves.

**Category:** programming
**Confidence:** 90
**Source:** controller:haas_5axis_setup

## Related
- [[bobcad-cam-tips-bc-090|Machine-Specific Posts for Major CNC Brands]]
- [[controller-knowledge-tips-ctrl-022|Haas NGC Setting 191 for smoothing tolerance]]
- [[controller-knowledge-tips-ctrl-023|Haas macro variables and probing]]
- [[controller-knowledge-tips-ctrl-024|Haas NGC unique M-codes reference]]
- [[controller-knowledge-tips-ctrl-088|Haas G187 accuracy/speed control for HSM]]
