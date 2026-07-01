# SIERRA-VAULT-OPS/U-SYNERGY-ASK-TOOLSIDE-REFLEX — [MAIN-FORCE] [SIERRA-VAULT-OPS]/U-SYNERGY-ASK-TOOLSIDE-REFLEX (slot:sierra): wire the tool-side Grep/Glob reflex into synergy-ask (symmetric with the prompt-side wire; closes the R15 consumer gap)

**Commit:** `befb50c7c70f` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T14:28:24-05:00
**Tags:** sierra-vault-ops, u-synergy-ask-toolside-reflex, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VAULT-OPS]/U-SYNERGY-ASK-TOOLSIDE-REFLEX (slot:sierra): wire the tool-side Grep/Glob reflex into synergy-ask (symmetric with the prompt-side wire; closes the R15 consumer gap)

## Body
```
[MAIN-FORCE] [SIERRA-VAULT-OPS]/U-SYNERGY-ASK-TOOLSIDE-REFLEX (slot:sierra): wire the tool-side Grep/Glob reflex into synergy-ask (symmetric with the prompt-side wire; closes the R15 consumer gap)

The reflex-wire (ca7af888b5) routed the PROMPT-side orientation reflex
(audit-viz-first-inject) into synergy-ask, but the TOOL-side reflex
(viz-first-redirect, fires when Claude reaches for Grep/Glob) still pointed only
at graph-only system-viz-query. R15 says wire to EVERY natural consumer -- this
closes the second reflex point.

formatInjection now appends a synergy-ask pointer, GATED HARD to >=3 hits: a
multi-node concept grep is exactly where a GROUNDED graph+vault answer beats raw
Grep. The 1-hit exact-match banner (known node -> Read directly) and 2-hit
disambiguation paths are untouched -- keeps the injection RARE, not on every
grep (the injection layer is over-supplied; this extends an EXISTING hook, adds
no new one). Probe threaded into the suggested command.

TEST: +3 R9 tests (>=3 hits -> pointer present + probe threaded + names the
graph+vault join; 2 hits -> absent; single exact-match -> absent). 30/30 pass
(27 pre-existing unchanged). VALIDATE (live): grep "kienzle" (multi-hit) ->
synergy-ask pointer present. All ASCII, additive, advisory-only (no block).
```

## Files touched (3)
- .claude/hooks/viz-first-redirect.mjs      | 10 +++++++++-
- .claude/hooks/viz-first-redirect.test.mjs | 32 ++++++++++++++++++++++++++++++++
- 2 files changed, 41 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- till pointed only

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show befb50c7c70f`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VAULT-OPS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._