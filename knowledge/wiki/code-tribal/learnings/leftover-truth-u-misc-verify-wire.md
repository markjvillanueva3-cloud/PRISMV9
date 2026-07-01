# LEFTOVER-TRUTH/U-MISC-VERIFY-WIRE — [MAIN-FORCE] [LEFTOVER-TRUTH]/U-MISC-VERIFY-WIRE (slot:zulu): durable weekly auto-run + stable LATEST alias + consumer pointer

**Commit:** `c49137c32c8e` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T13:18:17-05:00
**Tags:** leftover-truth, u-misc-verify-wire, auto-distilled

## Subject
[MAIN-FORCE] [LEFTOVER-TRUTH]/U-MISC-VERIFY-WIRE (slot:zulu): durable weekly auto-run + stable LATEST alias + consumer pointer

## Body
```
[MAIN-FORCE] [LEFTOVER-TRUTH]/U-MISC-VERIFY-WIRE (slot:zulu): durable weekly auto-run + stable LATEST alias + consumer pointer

WIRE half of wire/harden (harden=shipped-in-git shipped f61438a11a). Makes the
MISC-TASKS verifier self-refreshing so the leftover-pickup triage never rots back
to 35-day-stale:
 - install-misc-verify-task.ps1: weekly off-minute (Mon 05:23) + AtLogOn scheduled
   task, cloned from the proven install-tango-reconcile-task.ps1 (SYSTEM principal,
   header-marker sanity check, -RunNow LastTaskResult+mtime proof). Runs the FAST
   deterministic arm only -- the Ollama recall arm stays manual (a cron must not
   depend on Ollama being up). PS AST parse-check clean.
 - verify-misc-tasks-open.mjs: pure outputPaths() + a stable MISC-TASKS-VERIFIED-
   LATEST.{json,md} alias alongside the dated history file, so the auto-refresh +
   any consumer read ONE known path, never "find the newest dated file".
 - ZULU-LEFTOVER-ROADMAP: consumer pointer -- check LATEST before picking any MISC
   item (22/318 already likely-closed).
ENABLED!=RAN lesson ([[reference_post_ship_fleet-hygiene-u-golf-heal-verify-leg]]):
node action proven exit-0 with fresh output live (22 likely-closed, LATEST written);
the -RunNow path proves RAN not just registered. 17/17 tests (new outputPaths
contract: LATEST never embeds a date). Operator: run elevated once to register.
```

## Files touched (9)
- .claude/helpers/install-misc-verify-task.ps1           |  147 ++++++++++
- scripts/verify-misc-tasks-open.mjs                     |   26 +-
- scripts/verify-misc-tasks-open.test.mjs                |   12 +
- state/shared/specs/MISC-TASKS-VERIFIED-2026-06-21.json | 1925 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/specs/MISC-TASKS-VERIFIED-2026-06-21.md   |   29 +-
- state/shared/specs/MISC-TASKS-VERIFIED-LATEST.json     | 1925 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/specs/MISC-TASKS-VERIFIED-LATEST.md       |   34 +++
- state/shared/specs/ZULU-LEFTOVER-ROADMAP-2026-06-20.md |    3 +
- 8 files changed, 4093 insertions(+), 8 deletions(-)

## Lessons surfaced in commit body
- lesson ([[reference_post_ship_fleet-hygiene-u-golf-heal-verify-leg]]):

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c49137c32c8e`
- Milestone envelope: `mcp-server/data/milestones/LEFTOVER-TRUTH.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._