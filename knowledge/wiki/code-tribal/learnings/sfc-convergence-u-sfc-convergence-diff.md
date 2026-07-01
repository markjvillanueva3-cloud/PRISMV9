# SFC-CONVERGENCE/U-SFC-CONVERGENCE-DIFF — [MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-CONVERGENCE-DIFF (slot:oscar): per-case convergence diff harness + operator decision report

**Commit:** `3b940cfef977` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T14:18:01-05:00
**Tags:** sfc-convergence, u-sfc-convergence-diff, auto-distilled

## Subject
[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-CONVERGENCE-DIFF (slot:oscar): per-case convergence diff harness + operator decision report

## Body
```
[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-CONVERGENCE-DIFF (slot:oscar): per-case convergence diff harness + operator decision report

The operator-gated convergence P2 re-baselines the production SFC UI numbers, so it
needs the EXACT per-material/operation diff for sign-off. scripts/sfc-convergence-diff.mjs
runs the production engine (speedFeedOrchestratorEngine.compute) vs the convergence target
(ultimateSpeedFeedEngine.calculate via the P1 adapter) across 7 representative cases and
tabulates Vc/RPM/Fc/power/life/Ra deltas. Read-only -- changes NOTHING in production.
Emits state/shared/SFC-CONVERGENCE-DIFF.md for the operator to review before approving P2.

KEY FINDING (would have been missed without the full sweep): the convergence is NOT uniform.
- Roughing (soft/medium): engine FASTER, orchestrator over-conservative -> recovers
  productivity (steel +99%, Ti +149%, stainless +142%, cast iron +81%, alu +25%).
- Hardened steel HB500 finishing: engine FAR slower+SAFER (-81%, 226->42.8 m/min). The
  orchestrator runs HB500 at 226 m/min with 6-min tool life (over-speed HAZARD); the
  engine's hardness H-switch derates to 42.8 m/min / 185-min life. CONVERGENCE FIXES a
  real safety problem, not just a speed change.
- Finishing (steel): engine slightly more conservative (-39%).
=> Converging onto the engine is BOTH a productivity gain (roughing) AND a safety fix
   (hardened/finishing over-speed).

8/8 pure-helper tests (pctDiff signed/null-safe, two-shape extractMetrics orchestrator+engine
AtomicValue unwrap, buildDiffRows reference-value diff%). Engine result-shape fixed after first
run (power=required_power_kw, ra=practical_ra_um). Memory: reference_oscar_sfc_engine_divergence_magnitude_2026_06_21.
```

## Files touched (4)
- mcp-server/scripts/sfc-convergence-diff.mjs      | 129 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/scripts/sfc-convergence-diff.test.mjs |  67 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/SFC-CONVERGENCE-DIFF.md             |  84 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 280 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3b940cfef977`
- Milestone envelope: `mcp-server/data/milestones/SFC-CONVERGENCE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._