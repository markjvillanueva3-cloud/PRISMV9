# OLLAMA-OFFLOAD/U-NIGHT-TREEKILL-TEST-TIGHTEN — [MAIN-FORCE] [OLLAMA-OFFLOAD]/U-NIGHT-TREEKILL-TEST-TIGHTEN (slot:zulu): tighten grandchild regression oracle below KILL_GRACE_MS (scrutiny arm-B P2)

**Commit:** `8bac0b7934e7` · **By:** markjvillanueva3-cloud · **At:** 2026-06-16T17:27:44-05:00
**Tags:** ollama-offload, u-night-treekill-test-tighten, auto-distilled

## Subject
[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-NIGHT-TREEKILL-TEST-TIGHTEN (slot:zulu): tighten grandchild regression oracle below KILL_GRACE_MS (scrutiny arm-B P2)

## Body
```
[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-NIGHT-TREEKILL-TEST-TIGHTEN (slot:zulu): tighten grandchild regression oracle below KILL_GRACE_MS (scrutiny arm-B P2)

Arm-B P2: the grandchild-pipe regression test asserted elapsed<10000, but with
KILL_GRACE_MS=5000 a tree-kill-ONLY break (direct child killed, grandchild
leaks) still settles via the grace backstop at ~5000ms -> the test would PASS
even with a broken tree-kill (R9 oracle blunted). Tighten to <3000ms: the real
tree-kill returns in <1s (measured 1031ms), a broken one leaks to ~5s -> now
caught. 15/15 still pass.
```

## Files touched (2)
- scripts/ollama-night-batch.test.mjs | 7 ++++++-
- 1 file changed, 6 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- till settles via the grace backstop at ~5000ms -> the test would PASS
- till pass.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8bac0b7934e7`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-OFFLOAD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._