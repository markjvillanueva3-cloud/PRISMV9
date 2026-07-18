# SIERRA-VIZ-HARDEN/U-VIZ-NODE-DISPATCH-HEAP-RESPAWN — [MAIN-FORCE] [SIERRA-VIZ-HARDEN]/U-VIZ-NODE-DISPATCH-HEAP-RESPAWN (slot:sierra): node-dispatch CLI thrashed (empty output) against the 432MB default heap -> CLI-only heap self-respawn

**Commit:** `c93d0179c20d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T08:33:56-05:00
**Tags:** sierra-viz-harden, u-viz-node-dispatch-heap-respawn, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VIZ-HARDEN]/U-VIZ-NODE-DISPATCH-HEAP-RESPAWN (slot:sierra): node-dispatch CLI thrashed (empty output) against the 432MB default heap -> CLI-only heap self-respawn

## Body
```
[MAIN-FORCE] [SIERRA-VIZ-HARDEN]/U-VIZ-NODE-DISPATCH-HEAP-RESPAWN (slot:sierra): node-dispatch CLI thrashed (empty output) against the 432MB default heap -> CLI-only heap self-respawn

Follow-up to U-VIZ-QUERY-OOM-HEAP-RESPAWN. Root cause is a fleet-wide low default
node heap: bare `node` on this 136GB box reports heap_size_limit=432MB (NODE_OPTIONS
empty, no .npmrc; `--max-old-space-size` lifts it to 8240MB). system-viz-node-dispatch
uses the cap-safe readGraphStreaming (no >512MiB string throw) but still materializes
the full ~300K-node array -> on the 432MB heap it GC-thrashed (Mark-Compact churn) and
returned exit 0 with EMPTY stdout (effectively broken).

FIX: CLI-only heap self-respawn in the `isCli` block (before main()->loadGraph), reusing
the shared planHeapRespawn() decision (scripts/lib/viz-query-heap-reexec.mjs). Kept OUT
of the exported pure main() so its 50 tests never spawn. Knob: PRISM_VIZ_NODE_DISPATCH_HEAP_MB
(default 4096; nodes-only, no edges).

MEASURE-FIRST (R12, no cargo-cult): audited the other two apparent targets and they need
NO guard --
  - hub-blast-radius-rank.loadGraph: MAX_GRAPH_BYTES cap + defaults to the small
    architecture-graph.json; THROWS on the merged graph by design ("it OOMs JSON.parse").
  - build-system-viz-livediff.loadGraph: MAX_GRAPH_BYTES cap -> returns {ok:false} on
    oversize; never raw-loads the big graph.
Adding heap guards to those would be pure complexity with zero net benefit. Verified, not
assumed.

VALIDATED: node --check ok; 50/50 existing tests (main() unchanged); live `--node-id eng.mill`
-> 0 GC-thrash markers (was churning) + correct route JSON on stdout (was EMPTY).

OPEN (operator decision, surfaced not actioned): the real root is the 432MB fleet-wide
default heap on a 136GB box. A global NODE_OPTIONS=--max-old-space-size=N would fix every
node process at once, but it touches the shared settings.json env governing all 26 chats'
hooks (high blast radius) -- needs an operator nod, not a unilateral tail-of-turn edit. The
targeted per-graph-CLI approach is otherwise correct (only a handful materialize the big graph).

Lesson: heap_guard=0 by grep is NOT "unguarded" -- a script can mitigate the same OOM via a
size-cap-refuse or a streaming reader. Verify the ACTUAL load path before adding a guard.
```

## Files touched (2)
- scripts/system-viz-node-dispatch.mjs | 22 ++++++++++++++++++++++
- 1 file changed, 22 insertions(+)

## Lessons surfaced in commit body
- till materializes
- Lesson: heap_guard=0 by grep is NOT "unguarded" -- a script can mitigate the same OOM via a

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c93d0179c20d`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VIZ-HARDEN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._