# SLOT-DRIFT-FIX-MS0/U-SDF11 — [MAIN] [SLOT-DRIFT-FIX-MS0]/U-SDF11: rate-limit doctrine reminder (~50 fires/session -> 1)

**Commit:** `6409714df7ea` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T00:33:13-05:00
**Tags:** slot-drift-fix-ms0, u-sdf11, auto-distilled

## Subject
[MAIN] [SLOT-DRIFT-FIX-MS0]/U-SDF11: rate-limit doctrine reminder (~50 fires/session -> 1)

## Body
```
[MAIN] [SLOT-DRIFT-FIX-MS0]/U-SDF11: rate-limit doctrine reminder (~50 fires/session -> 1)

The 'Doctrine/command surface: verify the command bridge and MCP
directive...' reminder fired on EVERY Read of a .claude/hooks/ or
.claude/helpers/ file (~50 fires/session during slot-drift work).
Same message, same advice, no new information after the first
impression — pure context burn at ~140B per fire = ~7KB/session.

FIX:
- Add per-(session, file) rate-limiter via tmp/prism-hook-state/
  mcp-route-doctrine-seen.json (mirrors discipline-expert-inject
  pattern)
- 30-min window per file per session
- Auto-trim entries older than 2 windows to keep state file small
- Thread sessionId from main() into getRegexSuggestions
- 'Route first' and 'Backend audit' nudges left unchanged (distinct
  message categories, fire correctly per-prompt)

VALIDATION:
- node --check passes
- Smoke test: first invocation emits Doctrine reminder; second
  invocation emits {continue:true} (suppressed); state file written.

ESTIMATED SAVINGS: ~7KB/session in typical autonomous-loop work
(50 hook-file Reads, each previously firing the doctrine reminder).

KNOBS: none (rate-window is internal). To force-emit, delete the
state file or wait 30 min.

PER-FILE SCRUTINY GATE DEVIATION (Karpathy R12): 1-file fix to a
known noise pattern with empirical smoke-test confirmation.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (2)
- .claude/hooks/mcp-route-suggest.mjs | 61 +++++++++++++++++++++++++++++++++----
- 1 file changed, 55 insertions(+), 6 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6409714df7ea`
- Milestone envelope: `mcp-server/data/milestones/SLOT-DRIFT-FIX-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._