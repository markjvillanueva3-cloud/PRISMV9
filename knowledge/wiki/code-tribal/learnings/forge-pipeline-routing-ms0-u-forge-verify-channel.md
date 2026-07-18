# FORGE-PIPELINE-ROUTING-MS0/U-FORGE-VERIFY-CHANNEL — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FORGE-PIPELINE-ROUTING-MS0]/U-FORGE-VERIFY-CHANNEL: real forge7 v7 verification-gate wrapper (fixes the missing-script silent-skip)

**Commit:** `73a46caf4cb4` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T21:24:32-05:00
**Tags:** forge-pipeline-routing-ms0, u-forge-verify-channel, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FORGE-PIPELINE-ROUTING-MS0]/U-FORGE-VERIFY-CHANNEL: real forge7 v7 verification-gate wrapper (fixes the missing-script silent-skip)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FORGE-PIPELINE-ROUTING-MS0]/U-FORGE-VERIFY-CHANNEL: real forge7 v7 verification-gate wrapper (fixes the missing-script silent-skip)

run-verification-channel.mjs: runs a unit's DECLARED verifies_via command, gates
on exit code + optional pass-signal. forge7 referenced this script but it was
never built -> v7's whole HARD verify gate silently no-op'd (FLEET-HOOK-AUDIT #1
forge7 bug). Pure core (decideVerification/parseCommand/readVerifiesVia, injectable
spawn) + CLI (--tool|--spec --expect-signal --json, exit 0=PASS/1=FAIL/2=usage).
shell:true so node/vitest resolve on Windows PATH (live-caught: bare-node spawn
returned status:null) - SAFE: verifies_via is author-declared trusted input.
18 tests + live-validated (pass/fail/self-verify on its own test file: pass 18).
forge7.md wired to use it (LOCAL-ONLY gitignored skill). slot:tango.
```

## Files touched (3)
- scripts/run-verification-channel.mjs      | 111 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/run-verification-channel.test.mjs | 100 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 211 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 73a46caf4cb4`
- Milestone envelope: `mcp-server/data/milestones/FORGE-PIPELINE-ROUTING-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._