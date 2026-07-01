# SELF-COMPACTION/U-ZULU-PRECOMPACT-WAIT — [MAIN] [SELF-COMPACTION]/U-ZULU-PRECOMPACT-WAIT (slot:alpha): fix the /precompact->/compact race in the self-compaction actuator (lands the patch-sibling now that the rename is committed)

**Commit:** `5aad20f5cd77` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T20:59:04-05:00
**Tags:** self-compaction, u-zulu-precompact-wait, auto-distilled

## Subject
[MAIN] [SELF-COMPACTION]/U-ZULU-PRECOMPACT-WAIT (slot:alpha): fix the /precompact->/compact race in the self-compaction actuator (lands the patch-sibling now that the rename is committed)

## Body
```
[MAIN] [SELF-COMPACTION]/U-ZULU-PRECOMPACT-WAIT (slot:alpha): fix the /precompact->/compact race in the self-compaction actuator (lands the patch-sibling now that the rename is committed)

staggerAfterLine gave /compact a 90s wait but /precompact only the 5s DEFAULT_STAGGER_MS -- yet the zulu actuator types ["/precompact","/compact","/checkin-<slot>"] and /precompact makes the MODEL author its handoff (~30-60s). So /compact landed ~5s later, mid-authoring, defeating the model-authored-handoff guarantee the /precompact-first sequence exists to provide. Fix: DEFAULT_PRECOMPACT_WAIT_MS=75s + a /precompact branch in staggerAfterLine + precompactWaitMs() sweep helper (knob PRISM_ZULU_PRECOMPACT_WAIT_MS) passed through sendLines. Runtime-verified: staggerAfterLine("/precompact")=75000 (was 5000), override+non-finite-guard work, /compact(90000)+/checkin(5000) unchanged. 67/67 node:test (+2 fail-on-revert). EOL-aware patch (lib=CRLF, sweep=LF). Supersedes patch-sibling 6f9897118 (now landed in code).
```

## Files touched (4)
- scripts/lib/zulu-orchestrator-lib.mjs      | 11 +++++++++++
- scripts/lib/zulu-orchestrator-lib.test.mjs |  9 +++++++++
- scripts/zulu-orchestrator-sweep.mjs        | 10 ++++++++++
- 3 files changed, 30 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5aad20f5cd77`
- Milestone envelope: `mcp-server/data/milestones/SELF-COMPACTION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._