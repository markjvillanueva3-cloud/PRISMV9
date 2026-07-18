# SIERRA-VIZ/U-VIZ-AWARENESS-BIZVAL-STREAMING-FIX — [MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-AWARENESS-BIZVAL-STREAMING-FIX (slot:sierra): un-break 2 graph-loaders dead on the V8 512MiB string cap for 44 days -> STALE-ORPHAN 4->2

**Commit:** `b26a827e652d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T10:39:29-05:00
**Tags:** sierra-viz, u-viz-awareness-bizval-streaming-fix, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-AWARENESS-BIZVAL-STREAMING-FIX (slot:sierra): un-break 2 graph-loaders dead on the V8 512MiB string cap for 44 days -> STALE-ORPHAN 4->2

## Body
```
[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-AWARENESS-BIZVAL-STREAMING-FIX (slot:sierra): un-break 2 graph-loaders dead on the V8 512MiB string cap for 44 days -> STALE-ORPHAN 4->2

The DEFERRED-BROKEN follow-up from U-VIZ-AUG-STALE-REWIRE (10d7942143). augment-graph-with-awareness.mjs
and build-business-value-map.mjs both read system-graph.json via JSON.parse(fs.readFileSync(p,"utf8")).
The graph is now 781MB > V8's 0x1fffffe8 (512MiB) max string length, so the readFileSync(utf8) threw
"Cannot create a string longer than 0x1fffffe8" and BOTH exited 1 -- they have been unable to produce
fresh data since the graph crossed ~512MiB (~44 days), which is WHY their augmentations were stale-orphan
(nobody could regenerate them). Corroborated by reference_regen_viz_string_length_2026_05_23 (papa, May).

FIX (R8 surgical): migrate the graph read ONLY (the small SVI/BUILD_STATE/findings reads stay) to
readGraphStreaming from scripts/lib/graph-io.mjs -- the established Buffer-stream parser that bypasses the
string cap (the same reader merge-augmentations.mjs uses). awareness wraps it in try/catch to preserve its
graceful [fatal] exit-1; business-value lets readGraphStreaming's descriptive throw propagate (its prior
JSON.parse threw too). Then HEAVY[]-wired both (--full only; they load the full graph).

VALIDATED (R15, ran on the live 781MB graph with the 24GB heap):
- augment-graph-with-awareness.mjs: exit 0 in 11s, augmented 351,265 nodes (svi_psi=0.875). Was exit 1.
- build-business-value-map.mjs: exit 0 in 12s, tagged 351,265 nodes (customer/infra/learning/ROI). Was exit 1.

RESULT (numbers): STALE-ORPHAN 4->2 (fresh 107->109); dual-reg HEAVY 3->5, FAST 104, 0 crashRisks /
0 silentDiscards (both-or-neither holds -- merge splices at :143/:145). The 2 remaining stale-orphans are
NOT code bugs: engine-spotlight.json (hand-curated static, no generator by design) + h-drive-exhaustive-audit.json
(.ps1, needs VSS/recycle-bin elevation -- operator-gated scheduled task). regen-viz-fast-order.test.mjs (4/4):
the prior "broken stay UNWIRED" assertion flipped to "migrated ARE in HEAVY[], NEVER FAST[]" (a 781MB load
per regen would re-introduce the slow/OOM class). Combined with U-VIZ-AUG-STALE-REWIRE: 8 stale-orphans -> 2.
```

## Files touched (5)
- scripts/augment-graph-with-awareness.mjs | 311 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/build-business-value-map.mjs     | 284 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/regen-viz-fast-order.test.mjs    |  19 ++---
- scripts/regen-viz.mjs                    |   5 +-
- 4 files changed, 608 insertions(+), 11 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b26a827e652d`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._