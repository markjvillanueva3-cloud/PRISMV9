# CONTEXT-RETENTION/U-SUBAGENT-BUNDLE-OOM-FIX — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CONTEXT-RETENTION]/U-SUBAGENT-BUNDLE-OOM-FIX (slot:alpha): fix subagent context bundle OOM (was emitting NOTHING) + wire Obsidian memo recall (Q3)

**Commit:** `35dc2ec4c32c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T01:56:54-05:00
**Tags:** context-retention, u-subagent-bundle-oom-fix, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CONTEXT-RETENTION]/U-SUBAGENT-BUNDLE-OOM-FIX (slot:alpha): fix subagent context bundle OOM (was emitting NOTHING) + wire Obsidian memo recall (Q3)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CONTEXT-RETENTION]/U-SUBAGENT-BUNDLE-OOM-FIX (slot:alpha): fix subagent context bundle OOM (was emitting NOTHING) + wire Obsidian memo recall (Q3)

DISCOVERY (verified): subagent-start-context.mjs produced ZERO output at
production default heap — buildSpawnedAgentAdditionalContext unconditionally
readJson'd the 644MB system-graph.json (for a meta-counts summary) + the 160MB
tribal-embed-index (for a count summary), OOMing the process BEFORE the try/catch
could emit even the fallback. Every spawned subagent (forge/scrutiny/galaxy) was
starting with NO context bundle.

Fixes (2 of the bundle's own giant reads):
- readGraphHeadMeta(): bounded 256KB head-read extracting only meta+generatedAt
  (summarizeSystemViz needs just meta.counts/headline) — 644MB→256KB.
- readJsonBounded(tribalIndex, 20MB): skip the 160MB index for the cosmetic
  count-summary (the valuable per-task tribal RECALL is separate).
Result: bundle now emits the MAIN context at default heap (verified) instead of
crashing — subagents get identity/build-state/doctrine/systemViz/handoff again.

Q3 (HIGHVALUE-DISCOVERY): wired runMemoryIndexSearch into runPerTaskSearches so
the subagent turn gets Obsidian memory-vault recall (it had master-index+tribal
but not memos). Verified correct standalone (5 hits); renders once the per-task
block runs.

KNOWN-REMAINING (honest, R12): a THIRD OOM — runMasterIndexSearch/runTribalSearch
in the SHARED master-index-search-lib load the same 644MB graph, so the per-task
recall block (mi/tribal/memo) still OOMs at default heap WHEN PRISM_MASTER_INDEX_INJECT
is open. That shared-lib fix is cross-cutting (the parent prompt hook uses it too)
— next-milestone, not bundled here. With the gate closed the bundle is fully
restored.
```

## Files touched (2)
- scripts/agents/spawned-agent-context-lib.mjs | 166 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-----
- 1 file changed, 161 insertions(+), 5 deletions(-)

## Lessons surfaced in commit body
- till OOMs at default heap WHEN PRISM_MASTER_INDEX_INJECT

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 35dc2ec4c32c`
- Milestone envelope: `mcp-server/data/milestones/CONTEXT-RETENTION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._