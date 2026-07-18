# Machine Power Curves & Limits (OSCAR)

**Galaxy:** OSCAR (Speed & Feed Calculator)
**Status:** Core Topic - Master Level

## Description
Every machine has a power curve that limits the combination of speed, feed, and depth of cut. Ignoring this is one of the most common causes of tool and machine damage.

## PRISM Implementation
- MachineRegistry stores power curve data per machine
- SpeedFeedOrchestratorEngine performs real-time power limit checks
- Warning + hard stop behavior configurable per machine

## Key Considerations
- Spindle power vs. axis power
- Efficiency losses at different RPM ranges
- 5-axis machines often have lower effective power at the tool tip

## JM Die Notes
- Several older machines have significantly lower real power than nameplate rating
- Always derate older machines by 15–25% for safety

**Last Updated:** 2026-06-12 (4-LOOP + RGS + Critic + Self-Review + Persistent Memory enforced)