---
id: "gc-081"
title: "Macro variable output enables parametric programs for part families"
source: "web:community"
confidence: 84
category: "cam_strategy"
tags: ["gibbscam", "post-processor", "macro-variable", "parametric", "part-family"]
_source: "gibbscam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.895Z
---

# Macro variable output enables parametric programs for part families

GibbsCAM posts can output macro variable assignments (#-variables on Fanuc, Q-parameters on Heidenhain) for parametric programming. Define dimensions as macro variables in the program header, then reference them in the machining moves. This creates a single program that machines an entire part family by changing variable values. Common applications: different bolt circle diameters, variable pocket depths, and adjustable bore sizes. The post must be configured to output the variable references instead of literal values—work with your reseller to enable this capability for your specific control.

**Category:** cam_strategy
**Confidence:** 84
**Source:** web:community

## Related
- [[gibbscam-cam-tips-gc-092|Parametric geometry with macros creates part families from variable dimensions]]
- [[gibbscam-cam-tips-gc-076|Post processor customization through Compost enables machine-specific G-code]]
- [[gibbscam-cam-tips-gc-077|Multi-axis post processors handle rotary axis output and RTCP compensation]]
- [[gibbscam-cam-tips-gc-078|Canned cycle output from post maps GibbsCAM operations to G81/G83/G84]]
- [[gibbscam-cam-tips-gc-079|Machine-specific posts must match exact control firmware for safety codes]]
