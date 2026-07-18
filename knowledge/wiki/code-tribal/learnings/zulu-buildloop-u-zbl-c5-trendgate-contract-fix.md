# ZULU-BUILDLOOP/U-ZBL-C5-TRENDGATE-CONTRACT-FIX — [MAIN-FORCE] [ZULU-BUILDLOOP]/U-ZBL-C5-TRENDGATE-CONTRACT-FIX (slot:zulu): C5 honored its 'single spike never escalates' contract only once the window was full -- a cold slot's 1-2 breaching samples escalated

**Commit:** `03b14647a4ea` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T21:02:45-05:00
**Tags:** zulu-buildloop, u-zbl-c5-trendgate-contract-fix, auto-distilled

## Subject
[MAIN-FORCE] [ZULU-BUILDLOOP]/U-ZBL-C5-TRENDGATE-CONTRACT-FIX (slot:zulu): C5 honored its 'single spike never escalates' contract only once the window was full -- a cold slot's 1-2 breaching samples escalated

## Body
```
[MAIN-FORCE] [ZULU-BUILDLOOP]/U-ZBL-C5-TRENDGATE-CONTRACT-FIX (slot:zulu): C5 honored its 'single spike never escalates' contract only once the window was full -- a cold slot's 1-2 breaching samples escalated

3-of-3 scrutiny finding (arms A AND B independently, P2): assessBackPressure's
trend gate set `need = Math.min(minConsecutiveHigh, recent.length)`, so a slot
with only 1-2 in-window samples collapsed `need` to the available count and a
LONE breaching sample escalated to high/blocked -- directly contradicting the
engine's documented invariant ("a single high sample does NOT escalate; a level
escalates only when >= minConsecutiveHigh recent samples breach"). The existing
"single spike" test supplied 3 samples, so the 1-2-sample cold-slot boundary was
untested.

fix: `need = minConsecutiveHigh` (the full threshold) + the breach guard now
leads with `recent.length >= need` -- a slot must have accumulated >= minConsecutiveHigh
in-window samples AND have that many breach before any escalation above "low".
A cold slot's first 1-2 samples stay "low" regardless of severity; a full window
of sustained breaches still escalates (the fix never suppresses a real trend).

Advisory-only blast radius (C5 never vetoes / never overrides the Governor) --
worst pre-fix case was a spurious recommended_delay on a fresh slot -- but the
code-vs-its-own-contract gap was real and two reviewers caught it. +1 regression
test (1-sample + 2-sample all-breaching windows stay low; 3-sample sustained
still blocks). C5 24/24, full Zulu suite 244/244, esbuild-clean.

Part of the C1-C8 hermes-zulu queue 3-of-3 batch (session 7efaddb4, arms A/B/C
all PASS). The other surfaced findings (auction-feed wiring, C8 domain_filter
idempotency, Zod schemas) are P2 deferrables logged in the bravo brief.
```

## Files touched (3)
- mcp-server/src/__tests__/ZuluAdaptiveBackPressureEngine.test.ts | 12 ++++++++++++
- mcp-server/src/engines/ZuluAdaptiveBackPressureEngine.ts        |  9 +++++++--
- 2 files changed, 19 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- till escalates (the fix never suppresses a real trend).
- till blocks). C5 24/24, full Zulu suite 244/244, esbuild-clean.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 03b14647a4ea`
- Milestone envelope: `mcp-server/data/milestones/ZULU-BUILDLOOP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._