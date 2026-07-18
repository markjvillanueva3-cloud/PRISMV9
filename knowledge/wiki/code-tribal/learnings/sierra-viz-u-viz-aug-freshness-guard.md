# SIERRA-VIZ/U-VIZ-AUG-FRESHNESS-GUARD — [MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-AUG-FRESHNESS-GUARD (slot:sierra): surface merged-but-stale augmentations the GREEN badge masks

**Commit:** `4d2003214e23` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T21:33:22-05:00
**Tags:** sierra-viz, u-viz-aug-freshness-guard, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-AUG-FRESHNESS-GUARD (slot:sierra): surface merged-but-stale augmentations the GREEN badge masks

## Body
```
[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-AUG-FRESHNESS-GUARD (slot:sierra): surface merged-but-stale augmentations the GREEN badge masks

ROOT CAUSE (reference_augmentation_staleness_graph_fresh_inputs_stale_2026_06_21):
the system-viz graph-health badge reads GREEN because system-graph.json was RE-MERGED
recently -- NOT because its augmentation INPUTS are fresh. regen-viz re-merges from
whatever augmentation files exist; a FAST[] generator that silently fails (runner logs
failed++ and CONTINUES) or a RETIRED generator whose loadOptional() in merge-augmentations
was never removed leaves a stale orphan that keeps folding stale data into the canonical
graph every regen. LIVE: 10 merged augmentations are ~44 DAYS stale (awareness,
business-value-map, core-inventory, engine-spotlight, file-coverage-v2, fs-inventory,
h-drive-exhaustive-audit, h-drive-skipped-census, heuristic-classification, novelty-catalog)
yet still folded -- invisible until now.

WIRE -> TEST -> VALIDATE:
- scripts/lib/augmentation-freshness.mjs: pure classifier. parseMergedAugmentations()
  reads the authoritative loadOptional() set from merge-augmentations.mjs (the merge code
  IS the contract for what lands in the graph); classifyAugmentationFreshness() ages each
  by mtime -> fresh / stale-warn / stale-expected (HEAVY/--full SLOW_CADENCE allowlist) /
  stale-orphan (ALARM) / absent / future; injectable now+stat (deterministic).
- scripts/lib/augmentation-freshness.test.mjs: 11 tests -- reference values, exact
  boundaries (24h/168h/720h), 3 failure modes, 2+ adversarial (empty/non-array/NaN/future),
  + a LIVE assertion that the real merge source folds the 4 known orphans -> stale-orphan.
- scripts/audit-augmentation-freshness.mjs: CLI -> loud report + atomic sidecar
  (.augmentation-freshness.json via atomicWriteText). LIVE: flags the 10 orphans, 0 false
  alarms on the 2 HEAVY (slow-expected). Knobs PRISM_AUG_{FRESH,STALE,SLOW}_HR; --strict/--json.
- sierra-graph-health-inject.mjs: formatAugmentationStaleness() appends the staleOrphan
  count+list to the GREEN line (parity with the embeds/drift blocks, 24h window, best-effort).
  LIVE-verified: the hook now surfaces the 10 orphans for the sierra slot.
- regen-viz.mjs: post-merge advisory spawn of the audit -> sidecar auto-refreshes every regen.

ALSO FIXED (pre-existing, AUTO-FIX INLINE): the hook's E2E tests hardcoded NOW=2026-06-15
while the spawned hook uses the real Date.now() -- so the fixtures rotted to STALE once
wall-clock passed NOW+24h (both E2E block-tests were red today). Added realRecent() so E2E
fixtures are real-time-relative; pure-helper tests keep the injected NOW. 32/32 green.

dedup: distinct axis from detect-system-viz-drift (fsCoverage-walk staleness) and the
graph-health regen verdict (re-merge recency). FOLLOW-UP (logged): per-orphan remediation
(retire loadOptional vs re-wire generator) needs per-file judgment -- the audit is the worklist.
```

## Files touched (7)
- .claude/hooks/sierra-graph-health-inject.mjs      |  33 +++++++++++++++++++++++
- .claude/hooks/sierra-graph-health-inject.test.mjs |  79 ++++++++++++++++++++++++++++++++++++++++++++++++++---
- scripts/audit-augmentation-freshness.mjs          | 101 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/augmentation-freshness.mjs            | 133 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/augmentation-freshness.test.mjs       | 191 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/regen-viz.mjs                             |   9 +++++++
- 6 files changed, 543 insertions(+), 3 deletions(-)

## Lessons surfaced in commit body
- till folded -- invisible until now.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4d2003214e23`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._