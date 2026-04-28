---
id: "esp-159"
title: "Wire EDM Multi-Pass Threading for Broken Wire Recovery"
source: "web:esprit-forum"
confidence: 0.87
category: "cam_strategy"
tags: ["wire-edm", "auto-thread", "broken-wire", "recovery", "start-hole"]
_source: "esprit-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.597Z
---

# Wire EDM Multi-Pass Threading for Broken Wire Recovery

ESPRIT programs automatic wire threading and broken wire recovery sequences. Under Wire EDM → Technology → Auto Thread, configure: thread position (start hole or last-cut position), threading retry count (typically 3), and threading jet pressure. If the wire breaks during cutting, the machine re-threads at the break point and resumes cutting with a 2-5mm overlap to ensure no material is left uncut at the break location. ESPRIT inserts the auto-recovery M-codes specific to your machine (Mitsubishi M60-M68 series, Fanuc M50/M51, Sodick M12/M13). For critical parts, program extra start holes at 25% intervals along long cuts.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:esprit-forum
**Operations:** wire_edm

## Related
- [[surfcam-cam-tips-sc2-060|Automatic Wire Threading with Broken-Wire Recovery]]
- [[camworks-cam-tips-cw-162|Wire EDM Auto-Threading and Recovery — Unattended Operation]]
- [[bobcad-cam-tips-bc-155|BobCAD Wire EDM No-Core Cutting Strategy]]
- [[bobcad-cam-tips-bc-160|BobCAD Wire EDM Automatic Wire Threading Point Optimization]]
- [[camworks-cam-tips-cw-163|Wire EDM Start Hole Optimization — Minimize Pre-Drilling]]
