# FLEET-INJECTION-BUDGET-AUDIT/U-FIBA-COMPACT-PHANTOM-FIX — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-INJECTION-BUDGET-AUDIT]/U-FIBA-COMPACT-PHANTOM-FIX (slot:alpha): stop the constant false /compact nudge -- a byte-estimate above the context ceiling is transcript-bloat, not pressure.

**Commit:** `7b8dbde2dd00` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T11:15:09-05:00
**Tags:** fleet-injection-budget-audit, u-fiba-compact-phantom-fix, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-INJECTION-BUDGET-AUDIT]/U-FIBA-COMPACT-PHANTOM-FIX (slot:alpha): stop the constant false /compact nudge -- a byte-estimate above the context ceiling is transcript-bloat, not pressure.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-INJECTION-BUDGET-AUDIT]/U-FIBA-COMPACT-PHANTOM-FIX (slot:alpha): stop the constant false /compact nudge -- a byte-estimate above the context ceiling is transcript-bloat, not pressure.

OPERATOR: 'fix the auto compaction... so all chats can continue without stopping all the time saying you hit context area to compact.'

ROOT CAUSE (verified live on THIS session): chat-token-watch.readChatPressure's byte-estimate fallback (used when no fresh sidecar -- e.g. slot=unknown, the zulu read) counts the post-compact transcript JSONL / 3.5. But the JSONL redundantly logs every turn's FULL hook-injection + FULL tool outputs, so it OVER-reports massively vs real context. This session: real post-compact = 5.5MB JSONL -> byte-est 1.58M-1.86M 'tokens' -- PHYSICALLY IMPOSSIBLE (the window holds <=1M; if it were that full the API would have auto-compacted). That phantom classified 'critical' -> zulu CHO01 decideClearOrCompact -> '/compact recommended' on EVERY turn, and zulu-orchestrator-sweep would auto-SendKeys /compact. precompact-auto-trigger (the HARD block) already self-protects via its 1.1x CONTEXT_CAP TOKEN_COUNT_SUSPECT floor; chat-token-watch lacked the parity guard -- so the advisory/sweep surfaces kept nudging.

FIX (parity with precompact-auto-trigger, the file's 'both consumers improve together' contract): a byte-estimate > 1.1x CONTEXT_CAP (1M, knob PRISM_CHAT_TOKEN_CONTEXT_CAP) is impossible-as-real -> flag suspect:true + downgrade the false 'critical' to 'warn' (-> zulu advise-only 'build on', NOT /compact). The authoritative sidecar path (tried FIRST) is untouched, so REAL critical still fires; an in-window byte-est (940K-1.1M) still classifies critical (conservative). Complements the 2026-06-10 sidecar-first fix [[reference_cho02_sidecar_first_2026_06_10]] -- that fixed the sidecar path, this fixes the byte FALLBACK.

WIRE (R15): the fix is in the SHARED chat-token-watch.mjs -> ALL consumers covered at once: zulu-advisory-inject, zulu-orchestrator-sweep (auto-compact actuator), zulu-orchestrator-lib. TEST: 42/42 (3 new: >1.1x-cap downgrades critical->warn+suspect, in-window critical still fires, knob tunes the cap; existing 'large->critical' corrected to an in-window fixture since its old 1.2M was itself a phantom). VALIDATE (live, this 26MB/1.86M-est session): pressureLevel critical->warn, suspect:true, zulu decision compact->advise-only (no nudge). FOLLOW-UP: statusline shows the raw number (display-only, doesn't stop chats); transcript-token-counter could take the same guard.
```

## Files touched (3)
- scripts/lib/chat-token-watch.mjs      | 21 ++++++++++++++++++++-
- scripts/lib/chat-token-watch.test.mjs | 61 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++---
- 2 files changed, 78 insertions(+), 4 deletions(-)

## Lessons surfaced in commit body
- till fires; an in-window byte-est (940K-1.1M) still classifies critical (conservative). Complements the 2026-06-10 sidecar-first fix [[reference_cho02_sidecar_first_2026_06_10]] -- that fixed the sidecar path, this fixes the byte FALLBACK.
- till fires, knob tunes the cap; existing 'large->critical' corrected to an in-window fixture since its old 1.2M was itself a phantom). VALIDATE (live, this 26MB/1.86M-est session): pressureLevel critical->warn, suspect:true, zulu decision compact->advise-only (no nudge). FOLLOW-UP: statusline shows the raw number (display-only, doesn't stop chats); transcript-token-counter could take the same guard.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7b8dbde2dd00`
- Milestone envelope: `mcp-server/data/milestones/FLEET-INJECTION-BUDGET-AUDIT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._