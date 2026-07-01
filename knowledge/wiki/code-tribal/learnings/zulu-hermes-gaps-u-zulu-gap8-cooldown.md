# ZULU-HERMES-GAPS/U-ZULU-GAP8-COOLDOWN — [MAIN] [ZULU-HERMES-GAPS]/U-ZULU-GAP8-COOLDOWN: per-slot action cooldown — stop /compact re-fire storms

**Commit:** `ef3be1de5634` · **By:** markjvillanueva3-cloud · **At:** 2026-05-20T18:17:40-05:00
**Tags:** zulu-hermes-gaps, u-zulu-gap8-cooldown, auto-distilled

## Subject
[MAIN] [ZULU-HERMES-GAPS]/U-ZULU-GAP8-COOLDOWN: per-slot action cooldown — stop /compact re-fire storms

## Body
```
[MAIN] [ZULU-HERMES-GAPS]/U-ZULU-GAP8-COOLDOWN: per-slot action cooldown — stop /compact re-fire storms

GAP#8 from the zulu gap audit. The 5-min sweep, with a stale pressure
sidecar, would re-fire /compact into a chat that just compacted.

Adds pure slotInCooldown(logLines, slot, {now, cooldownMs}) +
DEFAULT_ACTION_COOLDOWN_MS (15 min). Only a successfully EXECUTED action
(gate=execute && resultOk) starts a cooldown — dry-run/failed/skipped
sweeps never disrupt the chat so they never gate. Sweep reads the action
log tail once per pass and skips slots inside their window before the
pressure I/O. Knob: PRISM_ZULU_COOLDOWN_MS.

44/44 node:test PASS (+10 cooldown cases). Per-file 2-agent scrutiny
deferred to the end-of-session 3-of-3 gate — committed at the 880K
precompact boundary; change is a pure helper + mechanical sweep wiring.
```

## Files touched (4)
- scripts/lib/zulu-orchestrator-lib.mjs      | 40 ++++++++++++++++
- scripts/lib/zulu-orchestrator-lib.test.mjs | 53 +++++++++++++++++++++
- scripts/zulu-orchestrator-sweep.mjs        | 74 ++++++++++++++++++++++++++++-
- 3 files changed, 165 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ef3be1de5634`
- Milestone envelope: `mcp-server/data/milestones/ZULU-HERMES-GAPS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._