# FLEET-REAPER-HARDEN/U-NODE-ORPHAN-CLEANER-PROTECT — [MAIN] [FLEET-REAPER-HARDEN]/U-NODE-ORPHAN-CLEANER-PROTECT (slot:golf /loop): apply shared PRISM-worker protect to the 2nd node reaper

**Commit:** `8ee957e6ee36` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T14:07:43-05:00
**Tags:** fleet-reaper-harden, u-node-orphan-cleaner-protect, auto-distilled

## Subject
[MAIN] [FLEET-REAPER-HARDEN]/U-NODE-ORPHAN-CLEANER-PROTECT (slot:golf /loop): apply shared PRISM-worker protect to the 2nd node reaper

## Body
```
[MAIN] [FLEET-REAPER-HARDEN]/U-NODE-ORPHAN-CLEANER-PROTECT (slot:golf /loop): apply shared PRISM-worker protect to the 2nd node reaper

node-orphan-cleaner.mjs is a SECOND node reaper (scheduled-task + Stop) with the
same incident risk: aggressive mode (auto-on when total node mem > 8GB, i.e.
almost always with 24+ slots) kills any idle node with cpu<=5 && mem<=350 unless
it is in the narrow KEEP_PATTERNS -- so detached idle fleet workers (miners,
sidecars, pipelines) were reapable here too.

FIX (single source of truth, R15 apply-to-all): import the hardened
DEFAULT_PRISM_WORKER_PROTECT_REGEX from fleet-reaper-mcp-zombie-hunter.mjs and
add it to isProtected(). Also added a main-guard (run() only when invoked
directly, not on import) + exported isProtected/shouldKill/isTransient for tests.

TESTED 10/10 (PRISM worker families protected, foreign vitest/unknown still
reapable, aggressive-mode idle worker spared, recall preserved).
VALIDATED LIVE (--dry-run --force, aggressive 8378MB): protected 50/53 (was 31
pre-fix, +19 fleet workers), would-kill 1 = genuine foreign npx chrome-devtools-mcp.
```

## Files touched (3)
- .claude/helpers/node-orphan-cleaner.mjs      | 23 ++++++++++++++++++++++-
- .claude/helpers/node-orphan-cleaner.test.mjs | 61 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 83 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- till

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8ee957e6ee36`
- Milestone envelope: `mcp-server/data/milestones/FLEET-REAPER-HARDEN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._