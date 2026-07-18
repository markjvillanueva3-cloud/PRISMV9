# SYSTEM-VIZ/U-VIZ-GRAPH-ATOMIC-WRITE — [MAIN] [SYSTEM-VIZ]/U-VIZ-GRAPH-ATOMIC-WRITE (slot:sierra): canonical graph write -> atomic (root-cause fix for the truncated RED graph)

**Commit:** `153887a51935` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T22:22:40-05:00
**Tags:** system-viz, u-viz-graph-atomic-write, auto-distilled

## Subject
[MAIN] [SYSTEM-VIZ]/U-VIZ-GRAPH-ATOMIC-WRITE (slot:sierra): canonical graph write -> atomic (root-cause fix for the truncated RED graph)

## Body
```
[MAIN] [SYSTEM-VIZ]/U-VIZ-GRAPH-ATOMIC-WRITE (slot:sierra): canonical graph write -> atomic (root-cause fix for the truncated RED graph)

ROOT CAUSE of the 11h-RED system-viz graph: merge-augmentations.mjs:2876 (the
ONE canonical writer of system-graph.json) used the NON-atomic
writeGraphStreaming. When that process is SIGKILLed mid-write -- reaper / OOM /
commit-pressure (a documented R12 class: reference_u_regen_viz_merge_faillod_2026_05_17,
"merge SIGKILLed at 97% commit") -- it leaves a TRUNCATED system-graph.json.
Confirmed live: the 660MB file ended mid-edges-array (`...,"intensity":0.3},` --
no closing `]}`), so readGraphStreaming threw "Unexpected end of JSON input"
(graph-io.mjs:179) in EVERY consumer: augment-molecules (the failing regen
stage), system-viz-query, lint-orphans --graph.

FIX: switch to the existing crash-safe writeGraphStreamingAtomic (tmp-<pid> +
rename). A kill mid-write now leaves only an orphan .tmp (swept by the
tmp-orphan janitor), NEVER a truncated canonical graph. The other graph writers
(seed-ghost-from-unwired, vault-to-gnn-refpool) were ALREADY atomic; merge was
the lone non-atomic outlier. Output is byte-identical (proven by test) -- only
crash-safety changes.

Tests: +3 graph-io.test.mjs cases for writeGraphStreamingAtomic (round-trip +
NO .tmp orphan on success + byte-identical-to-writeGraphStreaming + in-place
overwrite). 14/14 pass. Both files node --check clean.

NOTE: this fixes the WRITE going forward; the currently-truncated live graph
still needs a regen-viz to rebuild (launched separately, now crash-safe).
```

## Files touched (3)
- scripts/lib/graph-io.test.mjs   | 55 ++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- scripts/merge-augmentations.mjs | 13 ++++++++-----
- 2 files changed, 62 insertions(+), 6 deletions(-)

## Lessons surfaced in commit body
- NOTE: this fixes the WRITE going forward; the currently-truncated live graph
- till needs a regen-viz to rebuild (launched separately, now crash-safe).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 153887a51935`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._