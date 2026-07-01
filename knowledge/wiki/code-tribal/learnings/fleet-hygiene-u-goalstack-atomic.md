# FLEET-HYGIENE/U-GOALSTACK-ATOMIC — [MAIN-FORCE] [FLEET-HYGIENE]/U-GOALSTACK-ATOMIC: atomic write for the shared GOAL_STACK.json

**Commit:** `09b57b69f687` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T14:49:51-05:00
**Tags:** fleet-hygiene, u-goalstack-atomic, auto-distilled

## Subject
[MAIN-FORCE] [FLEET-HYGIENE]/U-GOALSTACK-ATOMIC: atomic write for the shared GOAL_STACK.json

## Body
```
[MAIN-FORCE] [FLEET-HYGIENE]/U-GOALSTACK-ATOMIC: atomic write for the shared GOAL_STACK.json

Bug-hunt (hooks sweep). always-build-guard.mjs (Stop hook) read-modify-writes the
SHARED mcp-server/data/state/GOAL_STACK.json non-atomically (line 303). readJson
fail-opens to empty by design (intentional -- a Stop hook must not fail closed on
corrupt state), and the turns>2 guard blocks the fail-open->clobber path, so P2 not
P0 -- BUT a torn concurrent write at fleet-wide Stop (26 chats share this file) can
corrupt the goal stack -> next read fail-opens to empty -> goals lost until /goal
re-run. The goal stack is PRECIOUS operational state (drives the goal-complete-gate
+ always-build), unlike the regenerable helper caches verified benign earlier.

Fix: writeFileSync -> the shared self-tested writeAtomicSync (temp+rename, fsync:false
for operational data); dropped the now-unused writeFileSync import. Validated: node
--check OK; 0 writeFileSync / 1 writeAtomicSync; live smoke emits valid {continue:true}
JSON, exit 0. 3rd real fix this session (regen-digests, error-learn-store, GOAL_STACK).
```

## Files touched (2)
- .claude/hooks/always-build-guard.mjs | 5 +++--
- 1 file changed, 3 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- til /goal

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 09b57b69f687`
- Milestone envelope: `mcp-server/data/milestones/FLEET-HYGIENE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._