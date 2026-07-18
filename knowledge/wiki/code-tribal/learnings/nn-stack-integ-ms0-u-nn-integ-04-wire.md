# NN-STACK-INTEG-MS0/U-NN-INTEG-04-WIRE — ConformalCalibrationMonitor activates with the rest of the neural stack

**Commit:** `bf0b4151ebf1` · **By:** markjvillanueva3-cloud · **At:** 2026-05-16T21:40:37-05:00
**Tags:** nn-stack-integ-ms0, u-nn-integ-04-wire, auto-distilled

## Subject
[NN-STACK-INTEG-MS0]/U-NN-INTEG-04-WIRE: ConformalCalibrationMonitor activates with the rest of the neural stack

## Body
```
[NN-STACK-INTEG-MS0]/U-NN-INTEG-04-WIRE: ConformalCalibrationMonitor activates with the rest of the neural stack

XProcNeuralAutoFireEngine.activate() now subscribes the conformal coverage
monitor to outcome.completed as a 7th bridge alongside tribal / drift-cal /
replay-buffer / episodic-memory / rl. Symmetric deactivate() entry added.

PRISM_XPROC_AUTOFIRE=0 still disables ALL bridges (the global escape hatch).
PRISM_NN_INTEG_DISABLE=1 short-circuits both the classifier's publish AND
the monitor's subscribe (the engine-level knob — already present in File 3).

Closes the U-NN-INTEG-04 loop: classifier publishes conformal.classification.computed,
monitor receives outcome.completed, joins them via {predictedSet, actualLabel}
in the payload, updates rolling empirical-coverage ring, drift bit flips
when consecutive-below run exceeds K.
```

## Files touched (2)
- mcp-server/src/engines/XProcNeuralAutoFireEngine.ts | 13 +++++++++++++
- 1 file changed, 13 insertions(+)

## Lessons surfaced in commit body
- till disables ALL bridges (the global escape hatch).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show bf0b4151ebf1`
- Milestone envelope: `mcp-server/data/milestones/NN-STACK-INTEG-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._