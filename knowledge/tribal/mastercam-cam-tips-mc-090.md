---
id: "mc-090"
title: "Control-specific optimization: output AICC/Nano mode commands for each control brand"
source: "web:community"
confidence: 86
category: "post_processor"
tags: ["mastercam", "aicc", "nano-mode", "fanuc", "mazak", "heidenhain", "high-speed"]
_source: "mastercam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.179Z
---

# Control-specific optimization: output AICC/Nano mode commands for each control brand

Different CNC controls use different G-codes to activate high-speed/smooth interpolation: Fanuc uses G05.1 Q1 (AI Contour Control), Mazak uses G05 P10000 (High-Speed Mode), Heidenhain uses CYCLE832 (HSC tolerance), Siemens uses CYCLE832/SOFT. Configure the post to output the correct activation command at program start and deactivation at end. Without these commands, the control processes blocks one at a time instead of using look-ahead, causing jerky motion above 3000 mm/min regardless of toolpath quality.

**Category:** post_processor
**Confidence:** 86
**Source:** web:community
**Operations:** post_processing, hsm

## Related
- [[mastercam-cam-tips-mc-079|Look-ahead buffer size in the post must match the CNC control's capabilities]]
- [[mastercam-cam-tips-mc-204|Control definition files must match the specific CNC control for accurate G-code generation]]
- [[mastercam-cam-tips-mc-226|Aluminum high-speed strategies in Mastercam exploit the material's heat tolerance and chip clearance]]
- [[mastercam-cam-tips-mc-231|Cast iron machining benefits from dry cutting and rigid setups with controlled chip breaking]]
- [[mastercam-cam-tips-mc-249|High-speed machine mode enables arc transitions and feed optimization for HSM-capable CNC controls]]
