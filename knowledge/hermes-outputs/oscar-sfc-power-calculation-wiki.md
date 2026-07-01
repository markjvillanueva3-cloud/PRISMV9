# Power Calculation Model (OSCAR)

**Galaxy:** OSCAR (Speed & Feed Calculator)
**Status:** Core Formula - Master Level

## Formula
```
P = (Fc · V) / (60 · η)
```

Where:
- P = Required power (kW)
- Fc = Cutting force (N)
- V = Cutting speed (m/min)
- η = Machine efficiency (0.65–0.85 typical)

## PRISM Implementation
- Real-time power limit checking in SpeedFeedOrchestratorEngine
- Efficiency factor stored per machine in MachineRegistry
- Combined with torque check for small-diameter tools

## Edge Cases
- Older machines often have η < 0.70
- 5-axis machines frequently have lower effective efficiency due to multiple servo systems
- Interrupted cutting can cause power spikes not captured by average calculation

## JM Die Notes
- Multiple tool breakage events traced to ignoring power limit on Ø8mm tools in HRC 52+ material
- Always cross-check with torque calculation on small tools

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)