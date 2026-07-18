# TOKEN-SAVINGS-PIVOT/U-PSN-TAKEUP-MAP-EXPORT — [MAIN] [TOKEN-SAVINGS-PIVOT]/U-PSN-TAKEUP-MAP-EXPORT (slot:alpha iter6): derive iter1's credited-actions set from canonical takeup map + guard route-suggest main() against import-side stdout pollution

**Commit:** `16643c0a8384` · **By:** markjvillanueva3-cloud · **At:** 2026-05-23T13:56:06-05:00
**Tags:** token-savings-pivot, u-psn-takeup-map-export, auto-distilled

## Subject
[MAIN] [TOKEN-SAVINGS-PIVOT]/U-PSN-TAKEUP-MAP-EXPORT (slot:alpha iter6): derive iter1's credited-actions set from canonical takeup map + guard route-suggest main() against import-side stdout pollution

## Body
```
[MAIN] [TOKEN-SAVINGS-PIVOT]/U-PSN-TAKEUP-MAP-EXPORT (slot:alpha iter6): derive iter1's credited-actions set from canonical takeup map + guard route-suggest main() against import-side stdout pollution

Two small cohesive PSN-synergy fixes that close drift classes.

PRIMARY — TAKEUP_CREDITED_ACTIONS source-of-truth unification:

iter1's test had its own hardcoded 9-entry TAKEUP_CREDITED_ACTIONS set
that duplicated the canonical _ACTION_TO_CLASSIFIERS keyset in
mcp-route-takeup.mjs. Take-up shipped iter20 (/U-WEBSEARCH-KB-ROUTE)
adding prism_knowledge:search + prism_knowledge:cross_query — but the
inline duplicate would silently drift the next time, leaving iter1's
"every action is credited" round-trip test against a stale subset.

Fix: exported _ACTION_TO_CLASSIFIERS from mcp-route-takeup.mjs; iter1's
test now derives the set via Object.keys() at import time. Single source
of truth, no drift possible.

Added regression test #20:
  • derived set non-empty
  • every entry matches /^prism_[a-z_]+:[a-z_]+$/ shape contract

SECONDARY — mcp-route-suggest.mjs import-guard:

main() at the bottom of mcp-route-suggest.mjs invoked unconditionally on
module load. When `node --test` imports the module (via the iter1 test
file), main() fires + writes {"continue":true} to stdout, polluting the
TAP stream and confusing node:test's summary emission — false exit-255
even when all individual tests pass.

Fix: guarded with the same process.argv[1].endsWith() pattern used in
the iter4/5 Ollama injector. Module is now safely importable.

53/53 tests pass across:
  • mcp-route-action-hint.test.mjs (24 — was 23, +1 for new derived-set
    shape assertion)
  • ollama-pipeline-verb-routes-r12.test.mjs (6)
  • ollama-pipeline-verb-trigger.test.mjs (23)

No new files; 3-file diff, ~+15 lines net (the inline 9-entry set
replaced by 1 import + 1 derive).
```

## Files touched (4)
- .../hooks/__tests__/mcp-route-action-hint.test.mjs | 35 +++++++++++-----------
- .claude/hooks/mcp-route-suggest.mjs                | 14 +++++++--
- .claude/hooks/mcp-route-takeup.mjs                 |  8 ++++-
- 3 files changed, 36 insertions(+), 21 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 16643c0a8384`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS-PIVOT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._