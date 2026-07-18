# FLEET-HYGIENE/U-SURROGATE-SAFE-INJECT — [MAIN] [FLEET-HYGIENE]/U-SURROGATE-SAFE-INJECT (slot:golf): kill the lone-surrogate API-400 class (bravo hard-blocked)

**Commit:** `c1a50b7c99be` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T14:04:33-05:00
**Tags:** fleet-hygiene, u-surrogate-safe-inject, auto-distilled

## Subject
[MAIN] [FLEET-HYGIENE]/U-SURROGATE-SAFE-INJECT (slot:golf): kill the lone-surrogate API-400 class (bravo hard-blocked)

## Body
```
[MAIN] [FLEET-HYGIENE]/U-SURROGATE-SAFE-INJECT (slot:golf): kill the lone-surrogate API-400 class (bravo hard-blocked)

bravo kept hitting `400 The request body is not valid JSON: no low surrogate in string`.
Root cause CLASS: an injector did a naive `str.slice(0, N)` on emoji-heavy content; .slice
cuts at a UTF-16 code-unit boundary, so a cut mid-surrogate-pair (mid-emoji) leaves a LONE
high surrogate. A lone surrogate anywhere in the request body makes the Anthropic API reject
the whole request (even JSON.stringify's \uXXXX escape of a lone high surrogate fails the
API's strict "must be followed by a low surrogate" parser).

Fix:
- NEW scripts/lib/safe-truncate.mjs: stripLoneSurrogates (Node20+ toWellFormed w/ regex
  fallback) + hasLoneSurrogate + clampUtf8/utf8Truncate (promoted from galaxy-context-card's
  proven impl) + safeTruncate. 12/12 node:test (incl. a regression anchor proving naive
  .slice(0,3) WOULD leave a lone surrogate).
- slot-soul-inject.mjs (confirmed naive truncator, line 68): naive .slice -> safeTruncate +
  stripLoneSurrogates guard at the emit chokepoint. Live-validated: hook emits valid JSON,
  additionalContext lone-surrogate=false.

Scanned 1033 per-prompt source files (handoffs/consolidated/souls/slot files) -> ZERO
poisoned static files, so the surrogate is generated at TRUNCATION time (not a bad file).
galaxy-context-card.mjs ALREADY truncates safely; this propagates that safety to the naive
injectors (R15 build-once). Follow-up: adopt safe-truncate across the other ~30 naive
.slice(0,N) injectors. bravo's own live transcript may still carry a stuck lone surrogate ->
bravo should /compact to flush it.
```

## Files touched (4)
- .claude/hooks/slot-soul-inject.mjs | 116 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/safe-truncate.mjs      | 107 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/safe-truncate.test.mjs |  88 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 311 insertions(+)

## Lessons surfaced in commit body
- till carry a stuck lone surrogate ->

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c1a50b7c99be`
- Milestone envelope: `mcp-server/data/milestones/FLEET-HYGIENE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._