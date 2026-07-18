# CONTEXT-RECOVERY-MS0/U-CR02 — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CONTEXT-RECOVERY-MS0]/U-CR02 (slot:tango): close 3-of-3 scrutiny -- P0 resume-wiring + P1 argv hardening + tests

**Commit:** `bf09f35a2c2d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T17:56:40-05:00
**Tags:** context-recovery-ms0, u-cr02, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CONTEXT-RECOVERY-MS0]/U-CR02 (slot:tango): close 3-of-3 scrutiny -- P0 resume-wiring + P1 argv hardening + tests

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CONTEXT-RECOVERY-MS0]/U-CR02 (slot:tango): close 3-of-3 scrutiny -- P0 resume-wiring + P1 argv hardening + tests

3-of-3 review of U-CR01 returned 2 FAILs (the gate working as intended). Fixed:

P0 (reviewer B) -- the source=resume injection was DEAD in production: the hook
was wired to SessionStart under startup/compact/clear matchers but NOT resume,
so on the launcher's  path Claude Code never invoked it. Added a
matcher:'resume' SessionStart arm carrying session-start-auto-resume.mjs to
settings.json (C: -> mirrored H:; both valid JSON, 5 arms). My U-CR01 'tested
green' had piped synthetic source=resume stdin, bypassing real dispatch -- an
R15-WIRE gap.

P1 x2 (reviewer C) -- recover-today-context.mjs --slot argv was not gated by
SLOT_NAME_RE (only chat-slots.json keys were), so  reached
path.join write + unlinkSync (traversal) and  could
throw on a metachar. Fixed: validate --slot argv against SLOT_NAME_RE (reject
loudly), and regex-escape the slot before interpolation (defense-in-depth).

Tests (reviewers B+C P1: 'no committed tests'): .claude/hooks/__tests__/
context-recovery-ms0.test.mjs -- 5/5 pass: getRecoveryPointer fail-soft + real
pointer, the SessionStart resume-arm WIRING assertion (standing guard vs the
known settings-drift hazard, would have caught the P0), and the two --slot
adversarial cases (traversal rejected, metachar no-crash).

Verified: settings valid+resume-arm in C:+H:; --slot ../x and 'a)(b' both
rejected, no write, no SyntaxError; extractor --all still emits 11 files.
```

## Files touched (38)
- mcp-server/src/engines/academy/SOUL.md              |  35 ++++++++++++
- mcp-server/src/engines/agent-orchestration/SOUL.md  |  28 ++++++++++
- mcp-server/src/engines/ai-training/SOUL.md          |  33 +++++++++++
- mcp-server/src/engines/backend-helper/SOUL.md       |  28 ++++++++++
- mcp-server/src/engines/blueprint-vision/SOUL.md     |  37 ++++++++++++
- mcp-server/src/engines/bug-hunting/SOUL.md          |  38 +++++++++++++
- mcp-server/src/engines/business/SOUL.md             |  35 ++++++++++++
- mcp-server/src/engines/cad-fusion-live/SOUL.md      |  28 ++++++++++
- mcp-server/src/engines/cad/SOUL.md                  |  33 +++++++++++
- mcp-server/src/engines/cam/SOUL.md                  |  33 +++++++++++
_(+28 more)_

## Lessons surfaced in commit body
- till emits 11 files.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show bf09f35a2c2d`
- Milestone envelope: `mcp-server/data/milestones/CONTEXT-RECOVERY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._