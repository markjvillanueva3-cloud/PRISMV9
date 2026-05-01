---
name: PPG generated posts must match v10.9 production quality
description: PRISM-Master CPS posts must be full-featured like the v10.9 production post (22K lines), not generic 800-line skeletons
type: feedback
---

PPG-generated posts must be production-grade, not generic skeletons.

**Why:** User compared PRISM-Master-Hurco-VM30i.cps (853 lines) against the real HURCO_VM30i_PRISM_v10_9_DRILLFIX_1.cps (22,059 lines) and correctly identified the generated post as "insanely generic, borderline obsolete to a standard fusion post." A customer would never buy the generated post over a free Fusion post or competitor's post. The generated post needs to justify its price.

**How to apply:** When generating CPS posts, the PPG must produce posts that include ALL of these feature categories that exist in v10.9:
1. Full Hurco base post (3,400+ lines from Autodesk reference) — not a from-scratch rewrite
2. PRISM chip thinning with selectable formula (SQRT/GEOMETRIC/AUTO/OFF)
3. Variable RPM (auto/conservative/aggressive/finishing modes, configurable ±%)
4. Enhanced variable feed (arc correction, direction change reduction, feed ramping, min chip load)
5. Dynamic depth feed adjustment for 3D adaptive toolpaths
6. Lights-out production features (sister tools, tool break detection, Z-retract protection)
7. Complete PRISM intelligence (material-aware S/F, apply modes: advisory/override/smart)
8. Configurable unit system + display formats (SFM/m-min, force N/lbf, power HP/kW)
9. All Hurco-specific features (M140, G05.3, ISNC/BNC, M16, M194, washdown, chip conveyor, air-thru-spindle subprograms)
10. Probing support, 5-axis rewind, work plane handling
11. Per-operation optimization notes with speed-up suggestions

**Critical insight:** The correct approach is to START from the existing enhanced Hurco post (3,455 lines) and ADD the PRISM intelligence layers on top — not to write a minimal skeleton from scratch. The v10.9 post IS the reference architecture.
