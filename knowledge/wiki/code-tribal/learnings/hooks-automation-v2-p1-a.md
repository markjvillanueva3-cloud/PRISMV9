# HOOKS-AUTOMATION-V2/P1-A — atomically swap 10 stop_on_* gates → stop-regression-bundle

**Commit:** `62587fb9f3af` · **By:** markjvillanueva3-cloud · **At:** 2026-05-15T23:30:16-05:00
**Tags:** hooks-automation-v2, p1-a, auto-distilled

## Subject
[HOOKS-AUTOMATION-V2]/P1-A-WIRE: atomically swap 10 stop_on_* gates → stop-regression-bundle

## Body
```
[HOOKS-AUTOMATION-V2]/P1-A-WIRE: atomically swap 10 stop_on_* gates → stop-regression-bundle

Completes P1-A: the stop-regression-bundle (built+6/6-tested earlier this
session) is now wired, replacing its 10 folded dev-tool Stop gates. Routed
through safeSettingsEdit — the swap (10 remove + 1 add) executes inside ONE
lock + ONE atomic write per mirror, so there is NO window where the 10
gates are unguarded and NO lost-update race with peer chats. This is the
first real adopter of the settings-drift root-cause fix. Verified:
Stop chain 48→39, 0 folded gates remaining, bundle present once, both
machining-safety gates (cutting_calculation_protocol, unsafe_gcode)
correctly preserved as individual entries, C:+H: byte-identical.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (2)
- scripts/_wire-stop-regression-bundle.mjs | 47 ++++++++++++++++++++++++++++++++
- 1 file changed, 47 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 62587fb9f3af`
- Milestone envelope: `mcp-server/data/milestones/HOOKS-AUTOMATION-V2.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._