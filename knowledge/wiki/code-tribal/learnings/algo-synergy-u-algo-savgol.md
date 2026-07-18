# ALGO-SYNERGY/U-ALGO-SAVGOL — [MAIN] [ALGO-SYNERGY]/U-ALGO-SAVGOL: SavitzkyGolayFilter + prism_algorithm signal_savgol (slot:tango)

**Commit:** `d51414a0a435` · **By:** markjvillanueva3-cloud · **At:** 2026-05-29T12:08:49-05:00
**Tags:** algo-synergy, u-algo-savgol, auto-distilled

## Subject
[MAIN] [ALGO-SYNERGY]/U-ALGO-SAVGOL: SavitzkyGolayFilter + prism_algorithm signal_savgol (slot:tango)

## Body
```
[MAIN] [ALGO-SYNERGY]/U-ALGO-SAVGOL: SavitzkyGolayFilter + prism_algorithm signal_savgol (slot:tango)

Algorithm-gen /loop next-batch: NEW signal-smoothing primitive — polynomial-least-squares smoothing/differentiation that PRESERVES peak shape (vs moving-average). Reproduces degree<=p polynomials exactly incl. boundaries (the strong invariant); proper asymmetric-window boundary handling (no zero-pad artifacts); optional derivative order + delta scaling. Pure, exact (precomputed pseudo-inverse), Gauss-Jordan invert with singular guard. Serves telemetry/sensor cleanup (spindle load, vibration, probe) before DTW/Viterbi/anomaly detection. Wired signal_savgol (validate-then-calculate -> err). 55/55 tests PASS (17 algorithm: constant/linear/quadratic exact, cubic boundary-deviation, derivatives 2x exact + delta-scaled, deriv>poly=0, variance-reduction + 4 failure + 3 adversarial; 38 synergy incl. z.enum membership). signal_* group 4->5; algorithm-gen total: 8 new algorithms.
```

## Files touched (5)
- mcp-server/src/algorithms/SavitzkyGolayFilter.test.ts                | 118 ++++++++++++++++++++++++++++++
- mcp-server/src/algorithms/SavitzkyGolayFilter.ts                     | 240 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/algorithmDispatcher.synergy.test.ts |  18 +++++
- mcp-server/src/tools/dispatchers/algorithmDispatcher.ts              |  21 ++++++
- 4 files changed, 397 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d51414a0a435`
- Milestone envelope: `mcp-server/data/milestones/ALGO-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._