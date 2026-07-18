# OSCAR-SFC-9AXIS-MS0/U-OSC-FINISH-RA-CAP — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-FINISH-RA-CAP (slot:oscar): numeric finish-quality (target Ra) feed cap — desired-finish becomes a tunable axis

**Commit:** `81e37ece165b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T14:07:14-05:00
**Tags:** oscar-sfc-9axis-ms0, u-osc-finish-ra-cap, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-FINISH-RA-CAP (slot:oscar): numeric finish-quality (target Ra) feed cap — desired-finish becomes a tunable axis

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-FINISH-RA-CAP (slot:oscar): numeric finish-quality (target Ra) feed cap — desired-finish becomes a tunable axis

Adds toolpath.target_ra_um: when supplied AND the tool has a nose/corner radius, the
recommended fz is capped so predicted Ra ~= fz^2/(32r) meets the target. Today the
orchestrator only had cut_type (rough/semi/finish CATEGORY, LIVE); this makes 'desired
finish quality' a continuously-tunable NUMERIC axis the category buckets cannot express.

Physics (physics-reviewer GO verdict, no double-count — core has ZERO Ra->fz inversion):
- fz_max via canonical predictedRa (Ra = K*fz^2, K = predictedRa(1,r)) so 32 is NOT inlined
  and the cap round-trips with the engine's own forward Ra. 32r (Ra) not 8r (Rt).
- MIN-ceiling only (never raises fz); placed LAST after workholding/power/runout derates.
  Speed/RPM untouched (finish is feed-direction).
- r<=0.05mm or non-finite radius -> SKIP+warn (never fabricate a radius).
- fz below chip-thickness floor -> FAIL LOUD (R12): clamp to floor, state Ra NOT met.

Named constants FINISH_RA_CAP_MIN_R_MM/FINISH_RA_CAP_FZ_MIN_MM (no inline). 12 tests, 41/41
with siblings. Probe: target_ra_um LIVE 1.51x(Al)/2.36x(steel) feed/MRR, Vc/RPM=1.00.
Per-file 2-reviewer (physics-impl + integration) PASS, 0 P0/P1.
```

## Files touched (4)
- mcp-server/scripts/sfc-orchestrator-axis-liveness.ts          |   2 +
- mcp-server/src/__tests__/finishRaCap.test.ts                  | 156 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/SpeedFeedNineAxisOrchestratorEngine.ts |  71 ++++++++++++++++++++++++++++++-
- 3 files changed, 227 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 81e37ece165b`
- Milestone envelope: `mcp-server/data/milestones/OSCAR-SFC-9AXIS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._