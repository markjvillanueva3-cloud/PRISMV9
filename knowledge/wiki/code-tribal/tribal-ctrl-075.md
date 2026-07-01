---
name: tribal-ctrl-075
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "siemens", "G-code", "non-ISO", "proprietary", "post-processor", "programming"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-075.md
promoted_at: 2026-06-09T22:31:16.149Z
---

# SINUMERIK Unique G-Codes Beyond ISO Standard

SINUMERIK controllers use numerous proprietary codes not found in ISO 6983: **Path behavior**: G64 (continuous path with look-ahead), G641 (continuous path with programmable rounding via ADIS=<mm>), G642 (automatic corner rounding), G643 (path rounding with max axis acceleration), G644 (jerk-limited rounding). **Feedforward/dynamics**: FFWON/FFWOF (feedforward control on/off), SOFT/BRISK/DRIVE (jerk limitation modes). **Splines**: ASPLINE/BSPLINE/CSPLINE (Akima/B-spline/Cubic spline interpolation), BAUTO/BNAT/BTAN (spline boundary conditions). **Frames**: TRANS/ATRANS (translation), ROT/AROT (rotation), SCALE/ASCALE (scaling), MIRROR/AMIRROR (mirroring) - A-prefix means additive to current frame. **Coordinate transforms**: TRANSMIT (face-end machining on lathe), TRACYL (cylinder surface transformation), TRAANG (inclined axis machining). **Approach/retract**: G147/G148/G247/G248 (approach/retract strategies with various path types). **String variables**: R-parameters (R0-R99 user variables), $-variables (system variables for machine state). **Program control**: STOPRE (preprocessing stop), MCALL (modal subroutine call), MSG (operator messages). Understanding these non-ISO codes is critical for post-processor development and manual program editing on Siemens-controlled machines.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[camworks-cam-tips-cw-085|Post Customization — Modify Output Format for Your Controller]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
- [[catia-cam-tips-cat-070|Post-Processor Table Customization for Controller Compatibility]]
- [[controller-knowledge-tips-ctrl-068|TOROT, TOFRAME, and TCARR Tool Orientation Commands]]
- [[controller-knowledge-tips-ctrl-069|CUT2D/CUT3DC/CUT3DF 3D Tool Compensation Modes]]
