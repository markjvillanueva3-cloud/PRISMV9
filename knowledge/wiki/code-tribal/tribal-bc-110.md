---
name: tribal-bc-110
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["tapping", "rigid-tap", "peck-tap", "g84", "v37"]
confidence: 89
source: "web:bobcad-tapping"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-110.md
promoted_at: 2026-06-09T22:31:15.959Z
---

# Tapping with Rigid and Floating Modes

BobCAD supports rigid tapping (synchronous G84) and floating holder modes. Rigid: feed = RPM × pitch exactly. Set retract speed to 1.5x cutting speed. For floating holders, program 2-5% above synchronous feed. Include G04 dwell (0.5-1s) at bottom before retract. V37 enhanced peck tapping eliminates the need for custom post scripts on Fanuc, Siemens, Heidenhain, and Haas controllers — the native peck tap cycle is output automatically.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:bobcad-tapping
**Operations:** tapping

## Related
- [[surfcam-cam-tips-sc2-094|Tapping with Rigid and Floating Modes]]
- [[camworks-cam-tips-cw-101|Tapping — Synchronize Spindle Speed and Feed for Thread Quality]]
- [[catia-cam-tips-cat-114|Tapping Synchronization and Feedrate Calculation]]
- [[controller-knowledge-tips-ctrl-036|Brother CNC-C00 high-speed tapping advantage]]
- [[controller-knowledge-tips-ctrl-061|Fanuc milling-specific canned cycles (0i-MF / 31i-B5)]]
