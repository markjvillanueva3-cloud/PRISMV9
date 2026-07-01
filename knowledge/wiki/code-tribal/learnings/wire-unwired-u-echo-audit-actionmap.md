# WIRE-UNWIRED/U-ECHO-AUDIT-ACTIONMAP — [MAIN] [WIRE-UNWIRED]/U-ECHO-AUDIT-ACTIONMAP: track + fix audit-unwired-engines table-driven ACTION_MAP detection

**Commit:** `9e27d9d420ac` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T22:54:41-05:00
**Tags:** wire-unwired, u-echo-audit-actionmap, auto-distilled

## Subject
[MAIN] [WIRE-UNWIRED]/U-ECHO-AUDIT-ACTIONMAP: track + fix audit-unwired-engines table-driven ACTION_MAP detection

## Body
```
[MAIN] [WIRE-UNWIRED]/U-ECHO-AUDIT-ACTIONMAP: track + fix audit-unwired-engines table-driven ACTION_MAP detection

audit-unwired-engines.mjs (the wiring auditor BUILD_STATE.json's NEEDS_WIRING
is built from) was untracked AND its detector only matched engines in literal
import paths. mechanicalDesignDispatcher + fluidThermalDispatcher wire ~51
engines each via a table-driven ACTION_MAP (templated dynamic import + engine
name as a quoted tuple element) - invisible to the old regex. ~28
genuinely-wired engines were systematically false-flagged UNWIRED.

Fix: new exported pure predicate engineReferencedInConsumer() detecting static
import, literal dynamic import, AND table-driven ACTION_MAP wiring. Literal
paths anchored to segment boundary; engine name regex-escaped before
interpolation; .test/.spec/.types/.archive siblings excluded from engine set.
Re-run: UNWIRED 709 -> 682, WIRED-DIRECT 2389 -> 2417.

audit-unwired-engines.test.mjs: 18 node:test cases incl. a real-file E2E
against mechanicalDesignDispatcher.ts + fail-on-revert guards. Per-file
2-reviewer scrutiny: round 1 FAIL -> fixed -> round 2 PASS/PASS.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- scripts/audit-unwired-engines.mjs      | 356 +++++++++++++++++++++++++++++++++
- scripts/audit-unwired-engines.test.mjs | 176 ++++++++++++++++
- 2 files changed, 532 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9e27d9d420ac`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._