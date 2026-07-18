# TOKEN-EFFICIENCY/U-OLLAMA-PS-PROBE-PRECEDENCE-TEST — [MAIN-FORCE] [TOKEN-EFFICIENCY]/U-OLLAMA-PS-PROBE-PRECEDENCE-TEST (slot:alpha): pin name||model precedence (arm-B scrutiny gap-close)

**Commit:** `b33393f31e0f` · **By:** markjvillanueva3-cloud · **At:** 2026-06-20T08:14:21-05:00
**Tags:** token-efficiency, u-ollama-ps-probe-precedence-test, auto-distilled

## Subject
[MAIN-FORCE] [TOKEN-EFFICIENCY]/U-OLLAMA-PS-PROBE-PRECEDENCE-TEST (slot:alpha): pin name||model precedence (arm-B scrutiny gap-close)

## Body
```
[MAIN-FORCE] [TOKEN-EFFICIENCY]/U-OLLAMA-PS-PROBE-PRECEDENCE-TEST (slot:alpha): pin name||model precedence (arm-B scrutiny gap-close)

Arm B of the 3-of-3 (run inline -- subagent spawns were rate-limited) surfaced
that the name||model fallback ORDER was not actually pinned: both existing
parse tests used entries with only one field, so a flip to model||name would
have passed equally. Added a discriminating test (entry with BOTH name + a
different model tag -> name wins), matching the canonical ask-ollama#loadWarmModels
name||model contract. 15/15.
```

## Files touched (2)
- scripts/lib/ollama-ps-probe.test.mjs | 8 ++++++++
- 1 file changed, 8 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b33393f31e0f`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-EFFICIENCY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._