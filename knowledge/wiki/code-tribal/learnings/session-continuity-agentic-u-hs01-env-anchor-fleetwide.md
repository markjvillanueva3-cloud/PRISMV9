# SESSION-CONTINUITY-AGENTIC/U-HS01-ENV-ANCHOR-FLEETWIDE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [SESSION-CONTINUITY-AGENTIC]/U-HS01-ENV-ANCHOR-FLEETWIDE (slot:alpha): fix HS-01 fleet-wide via CLAUDE_CODE_SESSION_ID env anchor -- not 24 caller edits

**Commit:** `e81dec5cbadc` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T15:29:22-05:00
**Tags:** session-continuity-agentic, u-hs01-env-anchor-fleetwide, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [SESSION-CONTINUITY-AGENTIC]/U-HS01-ENV-ANCHOR-FLEETWIDE (slot:alpha): fix HS-01 fleet-wide via CLAUDE_CODE_SESSION_ID env anchor -- not 24 caller edits

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [SESSION-CONTINUITY-AGENTIC]/U-HS01-ENV-ANCHOR-FLEETWIDE (slot:alpha): fix HS-01 fleet-wide via CLAUDE_CODE_SESSION_ID env anchor -- not 24 caller edits

The HS-01 root fix (7dec157db0) added an explicit --session-id arg (anchor 0),
but the 24 BARE callers (/precompact line 49, /handoff lines 55/111/149/194, the
78 per-slot wrappers) pass NO arg and have NO stdin -> they still fell through to
the PID-pin heuristic, the chain that silently returned a PEER's id
(claude-c48a1aff for session db273e77). Editing 24+ call sites is the wrong fix
(R7/R8): the harness already exports CLAUDE_CODE_SESSION_ID into EVERY tool
subprocess's env, scoped to THIS chat's process -- a per-process var CANNOT be a
peer's id the way the shared PID-pin file / cwd cache can. So one new anchor (1.5)
in the single shared helper fixes every bare caller + hook + wrapper at once, with
ZERO caller changes. Fleet-wide the instant it commits (one file all 26 slots call).

The pre-existing env anchor (3) read CLAUDE_SESSION_ID -- the WRONG name (UNSET);
the harness sets CLAUDE_CODE_SESSION_ID. Anchor 1.5 reads the correct one and is
ranked ABOVE the PID-pin (a non-Claude cron has no such var -> falls through,
unchanged). LIVE PROOF: bare `node stable-session-id.mjs` (no arg, no stdin) in
this chat now prints claude-db273e77 (was a peer); per-agent-handoff read via the
bare pattern returns matchedBy:same-instance-newest. 10/10 tests (6 arg + 4 env).
```

## Files touched (3)
- .claude/helpers/__tests__/stable-session-id-env.test.mjs | 69 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/helpers/stable-session-id.mjs                    | 34 ++++++++++++++++++++++++++++++++++
- 2 files changed, 103 insertions(+)

## Lessons surfaced in commit body
- till fell through to
- wrong fix
- WRONG name (UNSET);

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e81dec5cbadc`
- Milestone envelope: `mcp-server/data/milestones/SESSION-CONTINUITY-AGENTIC.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._