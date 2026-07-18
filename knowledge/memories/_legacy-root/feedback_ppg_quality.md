---
schema_version: 1.0.0
kind: mirrored_memory
source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/feedback_ppg_quality.md
source_filename: feedback_ppg_quality.md
content_hash: 62ef4ccf25d55db515bdab82eabb112fd72b2f593c24a0a76d5571d6047816ac
mirror_ts: 2026-05-05T13:00:09.465Z
mirror_engine: ObsidianMemorySyncEngine
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
