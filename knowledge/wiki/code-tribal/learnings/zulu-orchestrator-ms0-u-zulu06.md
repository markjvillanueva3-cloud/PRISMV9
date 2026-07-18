# ZULU-ORCHESTRATOR-MS0/U-ZULU06 — [MAIN] [ZULU-ORCHESTRATOR-MS0]/U-ZULU06 (slot:bravo): zulu-advisory-inject UserPromptSubmit hook — 19/19 tests

**Commit:** `d94e08da19d6` · **By:** markjvillanueva3-cloud · **At:** 2026-05-20T11:40:19-05:00
**Tags:** zulu-orchestrator-ms0, u-zulu06, auto-distilled

## Subject
[MAIN] [ZULU-ORCHESTRATOR-MS0]/U-ZULU06 (slot:bravo): zulu-advisory-inject UserPromptSubmit hook — 19/19 tests

## Body
```
[MAIN] [ZULU-ORCHESTRATOR-MS0]/U-ZULU06 (slot:bravo): zulu-advisory-inject UserPromptSubmit hook — 19/19 tests

Advisory surface — distinct from token-awareness-inject (raw state) and
from the U-ZULU02 main loop (which SendKeys the chat). For chats that
have NOT opted into SendKeys, this hook is the only signal they receive
from zulu's decision module.

Reads THIS chat's transcript via CHO02 readChatPressure, calls CHO01
decideClearOrCompact, emits an additionalContext block when action !=
noop. Validates the CHO01+CHO02 backbone against live chat-slots data
WITHOUT touching SendKeys — the safe-half of the orchestrator.

Pure-core + injected deps:
  * resolveSlotFromSlotsFile(sessionId, slotsDoc) — same pattern as
    token-awareness-inject (exact chatId match OR claude-XX hex prefix
    substring); fail-safe to "unknown"
  * buildChatState(pressure, {hasActiveLoop, hasHandoff}) — slim adapter
    for CHO01. Conservative default hasUncommittedCriticalWork=true so a
    critical chat with uncommitted work prefers /compact (preserve) over
    /clear (wipe). Strict-equality (=== true) on flags.
  * renderAdvisory(decision, slot, pressure) — pure render. Returns null
    on noop (caller handles PRISM_ZULU_ADVISE_ON_NOOP gate). Distinct
    block-types per action (advise-only / clear / compact / unknown).

Knobs (cascade):
  PRISM_ZULU_DISABLE=1            kill switch (cascade from sweep)
  PRISM_ZULU_ADVISORY_DISABLE=1   disable this hook only
  PRISM_ZULU_ADVISE_ON_NOOP=1     also inject when decision=noop
  PRISM_ZULU_TEST_SLOTS_FILE      hermetic test override
  PRISM_ZULU_TEST_LOOP_DIR        hermetic test override

R12 fail-safe: missing/corrupt sidecar OR decision-module throw → silent
no-op (never blocks the prompt). chatState=null returns null from
buildChatState; decideClearOrCompact's own R12 returns advise-only on
unknown state.

Tests (19, all hermetic):
  * 6 resolveSlotFromSlotsFile (missing-sid / missing-doc / exact-match /
    prefix-substring-match / null-slot-skip / no-match)
  * 5 buildChatState (null-pressure / full-flags / default-flags / zero-
    tokens / strict-equality-rejects-null)
  * 8 renderAdvisory (null-decision / noop-returns-null / advise-only /
    compact-block / clear-block / kill-switch-hint / unknown-action-
    fallback / no-measurement-tokens)

Tier: T2 (injector). Not yet wired in settings.json — U-ZULU07 will
add the UserPromptSubmit chain entry (alongside doc reflection).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- .../hooks/__tests__/zulu-advisory-inject.test.mjs | 126 ++++++++++++++++++
- .claude/hooks/zulu-advisory-inject.mjs            | 143 +++++++++++++++++++++
- 2 files changed, 269 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d94e08da19d6`
- Milestone envelope: `mcp-server/data/milestones/ZULU-ORCHESTRATOR-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._