# SIERRA-VAULT-OPS/U-VAULT-HEALTH — [MAIN-FORCE] [SIERRA-VAULT-OPS]/U-VAULT-HEALTH (slot:sierra): unified vault-health dashboard + 2 R12 fixes it exposed

**Commit:** `1ee416f4b737` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T22:02:37-05:00
**Tags:** sierra-vault-ops, u-vault-health, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VAULT-OPS]/U-VAULT-HEALTH (slot:sierra): unified vault-health dashboard + 2 R12 fixes it exposed

## Body
```
[MAIN-FORCE] [SIERRA-VAULT-OPS]/U-VAULT-HEALTH (slot:sierra): unified vault-health dashboard + 2 R12 fixes it exposed

Capstone of the 4-detector vault arc: scripts/vault-health.mjs aggregates the 4 advisory
detector reports (vault-rot, supersession, contradiction, ambiguous-links) into ONE operator
rollup (overall OK/STALE/WARN + per-source headline/severity/freshness + regen commands). A
2nd-brain needs one health surface, not five scattered reports. Pure aggregateHealth() core,
READ-ONLY (writes only state/shared/vault-health.json), reuses the persisted reports (R8 --
never re-runs a detector). 14 mutation-proof tests.

The dashboard immediately CAUGHT 2 real R12 false-state defects (closed both, R16):
1. supersession --mark never rewrote its report -> a fresh-looking but content-stale pre-apply
   candidate count read as a false WARN. FIX (root): vault-supersession-detector.mjs --mark now
   re-scans + rewrites the report post-apply. Live-verified: dashboard reads 0 (converged) after mark.
2. vault-link-doctor --ambiguous wrote generatedAt as the dash-mangled filename stamp (Date.parse
   NaN) -> dashboard showed 'age ?'. FIX: store raw ISO. Live-verified: age now 0d.

2-arm scrutiny: code-analyzer PASS (clean), reviewer FAIL -> fixed -> verified. Reviewer's 2 P1s
were REAL (not hallucinated): (a) a no-NLI-model / 0-pairs-checked contradiction report read OK
(green) though NOTHING was scanned -- the worst health-dashboard failure. FIX: needsScan state
(unscanned -> never ok -> overall STALE), 3 new tests. (b) the post-mark stale value = fix #1
above. P2: --stale-days now clamps both CLI+env paths; regen/confirm surfaces on WARN rows too.
```

## Files touched (5)
- scripts/vault-health.mjs                | 190 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/vault-health.test.mjs           | 151 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/vault-link-doctor.mjs           |   3 +--
- scripts/vault-supersession-detector.mjs |  12 ++++++++-
- 4 files changed, 353 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1ee416f4b737`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VAULT-OPS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._