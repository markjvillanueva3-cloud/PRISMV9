# PRISM-EFFICIENCY-MS0/U-MISL-FALLBACK — [MAIN] [PRISM-EFFICIENCY-MS0]/U-MISL-FALLBACK: JULIETT F1 latent-bug fix — system-graph oversize → architecture-graph fallback

**Commit:** `b0c1ad418520` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T12:15:11-05:00
**Tags:** prism-efficiency-ms0, u-misl-fallback, auto-distilled

## Subject
[MAIN] [PRISM-EFFICIENCY-MS0]/U-MISL-FALLBACK: JULIETT F1 latent-bug fix — system-graph oversize → architecture-graph fallback

## Body
```
[MAIN] [PRISM-EFFICIENCY-MS0]/U-MISL-FALLBACK: JULIETT F1 latent-bug fix — system-graph oversize → architecture-graph fallback

When the merged system-graph.json exceeds PRISM_GRAPH_MAX_BYTES (default
200MB), master-index-search-lib.loadGraph() previously silently returned
null — unified search degraded fleet-wide to nothing. Now falls back to
the sibling architecture-graph.json (~27MB, L0-L10 only) so search stays
working (degraded but not blind). Fail-loud stderr line; PRISM_GRAPH_FALLBACK_DISABLE=1
restores the original null-on-overflow. Basename-gate (system-graph.json)
makes the guard tmpdir-test friendly.

Status: LATENT bug — current system-graph at 155.9MB < 200MB cap, so the
old code currently works. This is preventative for when regen-viz --full
pushes the merge past 200MB (already documented as a class in the juliett
F1 finding).

6 regression tests added (43/43 total pass): oversized→fallback,
disable-knob, basename-gate, missing-sibling-graceful, FALLBACK_PATH
override, both-oversized→null.

Memory: [[reference_juliett_devtools_synergy_map_2026_05_17]]
```

## Files touched (3)
- scripts/lib/master-index-search-lib.mjs      |  40 +++++++-
- scripts/lib/master-index-search-lib.test.mjs | 147 +++++++++++++++++++++++++++
- 2 files changed, 186 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b0c1ad418520`
- Milestone envelope: `mcp-server/data/milestones/PRISM-EFFICIENCY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._