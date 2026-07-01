# SIERRA-VIZ/U-VIZ-POSTFLIGHT-SIDECAR — [MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-POSTFLIGHT-SIDECAR (slot:sierra): the freshness postflight now REFRESHES the awareness sidecar -- completes the value chain to sierra-graph-health (R15 reach-the-destination)

**Commit:** `971e7ecc6763` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T11:57:43-05:00
**Tags:** sierra-viz, u-viz-postflight-sidecar, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-POSTFLIGHT-SIDECAR (slot:sierra): the freshness postflight now REFRESHES the awareness sidecar -- completes the value chain to sierra-graph-health (R15 reach-the-destination)

## Body
```
[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-POSTFLIGHT-SIDECAR (slot:sierra): the freshness postflight now REFRESHES the awareness sidecar -- completes the value chain to sierra-graph-health (R15 reach-the-destination)

The iter-13 postflight only WARNED in the regen log (ephemeral). The freshness data's real
destination is the persistent .augmentation-freshness.json sidecar that sierra-graph-health-inject.mjs
reads on EVERY prompt -- but that was refreshed ONLY by a manual `audit-augmentation-freshness.mjs`
run, so the graph-health badge could lag the live graph between audits. Now every regen (cron / --full
/ manual) writes it, so the awareness surface always reflects the latest merge.

- Extracted `buildFreshnessReport(rows, {now,vizDirRel,thresholds})` into the augmentation-freshness lib
  (the exact .augmentation-freshness.json shape: at/vizDir/thresholds/summary/rows-sorted-desc). SINGLE
  SOURCE so the audit CLI + the regen-viz postflight write a byte-identical sidecar.
- audit-augmentation-freshness.mjs refactored to use it (de-dups its inline report construction).
- regen-viz postflight builds the report + atomicWriteText's the sidecar (best-effort: a write failure
  never fails the regen; gated by the same PRISM_VIZ_FRESHNESS_POSTFLIGHT knob).

VALIDATED: postflight report keys IDENTICAL to the audit sidecar (at,vizDir,thresholds,summary,rows;
staleOrphan=2; rows=114) -- proven by building it exactly as regen-viz does. Tests: augmentation-freshness
17/17 (+buildFreshnessReport: shape/sorted-desc/defaults/adversarial), dual-reg 13/13, fast-order 4/4.
```

## Files touched (5)
- scripts/audit-augmentation-freshness.mjs    | 14 ++++++--------
- scripts/lib/augmentation-freshness.mjs      | 18 ++++++++++++++++++
- scripts/lib/augmentation-freshness.test.mjs | 19 +++++++++++++++++++
- scripts/regen-viz.mjs                       | 19 ++++++++++++++-----
- 4 files changed, 57 insertions(+), 13 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 971e7ecc6763`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._