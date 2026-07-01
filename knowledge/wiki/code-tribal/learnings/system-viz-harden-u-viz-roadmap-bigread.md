# SYSTEM-VIZ-HARDEN/U-VIZ-ROADMAP-BIGREAD — [MAIN-FORCE] [SYSTEM-VIZ-HARDEN]/U-VIZ-ROADMAP-BIGREAD (slot:sierra): fix 2 roadmap<->viz scripts crashing on the 765MB graph (ERR_STRING_TOO_LONG)

**Commit:** `d5a21b63dfba` · **By:** markjvillanueva3-cloud · **At:** 2026-06-16T15:40:42-05:00
**Tags:** system-viz-harden, u-viz-roadmap-bigread, auto-distilled

## Subject
[MAIN-FORCE] [SYSTEM-VIZ-HARDEN]/U-VIZ-ROADMAP-BIGREAD (slot:sierra): fix 2 roadmap<->viz scripts crashing on the 765MB graph (ERR_STRING_TOO_LONG)

## Body
```
[MAIN-FORCE] [SYSTEM-VIZ-HARDEN]/U-VIZ-ROADMAP-BIGREAD (slot:sierra): fix 2 roadmap<->viz scripts crashing on the 765MB graph (ERR_STRING_TOO_LONG)

loadGraphNodeIds (roadmap-to-viz-nodes.mjs) + loadGraphNodeIndex (audit-roadmap-viz-bindings.mjs)
both did JSON.parse(readFileSync(graph,'utf8')) on the merged system-graph.json (765MB /
346,676 nodes) -- over Node's UTF-8 string cap (0x1fffffe8 ~512MB) -> ERR_STRING_TOO_LONG.
roadmap-to-viz-nodes.test.mjs had 3 tests crashing; audit-roadmap-viz-bindings exited fatally
on the live graph.

Fix (both, same canonical pattern as U-VIZ-COVERAGE-TEST-BIGREAD): size-gate via
exceedsStringParseCap() -> streamGraphArray(abs,'nodes',processNode) (projection, low memory,
never materializes the giant string) when over the cap; original JSON.parse(readFileSync) path
kept for under-cap small fixture/curated graphs (incl the nested {graph:{nodes}} fallback the
streamer does not cover). Per-node body extracted to a closure applied identically on both
branches -- behavior byte-equivalent (engineStems preserves ORIGINAL-case n.id; ids/prefixes
lowercased).

Verified live: roadmap-to-viz-nodes.test.mjs 26/26 (was 3 crash); audit-roadmap-viz-bindings
smoke ran clean on the real graph (346,676 nodes, RESOLVES 7). 2-agent scrutiny PASS (0 P0/P1).
P2 deferred: audit-roadmap-viz-bindings has no dedicated unit test (proven via the unit-tested
identical sibling + live smoke). Part of the big-read bug-class sweep (graph crossed 512MB
2026-05-27, now 765MB); canonical readers already use readGraphStreaming.
```

## Files touched (3)
- scripts/audit-roadmap-viz-bindings.mjs | 428 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/roadmap-to-viz-nodes.mjs       |  25 +++++++--
- 2 files changed, 447 insertions(+), 6 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d5a21b63dfba`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ-HARDEN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._