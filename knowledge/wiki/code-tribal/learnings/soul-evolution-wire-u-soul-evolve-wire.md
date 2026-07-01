# SOUL-EVOLUTION-WIRE/U-SOUL-EVOLVE-WIRE — [MAIN] [SOUL-EVOLUTION-WIRE]/U-SOUL-EVOLVE-WIRE (slot:bravo): de-dup + WIRE the dormant soul-evolution Stop hook + bound its draft

**Commit:** `a18dbc012e6b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T11:05:50-05:00
**Tags:** soul-evolution-wire, u-soul-evolve-wire, auto-distilled

## Subject
[MAIN] [SOUL-EVOLUTION-WIRE]/U-SOUL-EVOLVE-WIRE (slot:bravo): de-dup + WIRE the dormant soul-evolution Stop hook + bound its draft

## Body
```
[MAIN] [SOUL-EVOLUTION-WIRE]/U-SOUL-EVOLVE-WIRE (slot:bravo): de-dup + WIRE the dormant soul-evolution Stop hook + bound its draft

stop-soul-evolution.mjs was BUILT (U-HRP05) but never wired in any settings.json
or the stop-bundle -- discovered during the dream-queue activation (69f82bb12c).
It is COMPLEMENTARY to the dream-queue producer, not redundant: it proposes
refuse-rules by SEMANTIC NOVELTY (single occurrence, rerank<0.5 vs existing rules);
the dream-queue proposes by REPETITION (>=2 same token) + skills from the error
ledger. Different gates catch different signals -- wire-not-deprecate.

Changes:
- De-dup: stop-soul-evolution.mjs now imports collectRecentCorrections +
  readSoulRefuseList from scripts/lib/dream-signal.mjs (they were byte-identical
  inline copies; the dream-queue producer uses the same readers -> one tested
  source, no divergent collectors, R8).
- Import-safe run()-export pattern matching the dream producer (R11 conformance);
  R12 fail-soft isDirect catch.
- CAP (new): bound the draft to PRISM_SOUL_EVOLVE_MAX (default 25). The Stop
  auto-feed touches many feedback-memory mtimes at once, so without a cap a single
  Stop drafts hundreds of "novel" rules against a small refuse_list (substring
  fallback rarely matches). Advisory honestly reports "top N of M".
- Wired into settings.json Stop (after the dream hooks); gitignored
  state/shared/slot-souls/*.draft.md (regenerated advisory drafts).

Tests: .claude/hooks/stop-soul-evolution.test.mjs -- happy + no-corrections +
slot-unknown + overlap-skip + rerank high/low + the cap (6 tests). 42/42 across
the dream-signal + producer + soul-evolution suites.

LIVE-VALIDATED: bravo run drafted 25 of 200 novel candidates (cap held, draft
62KB->8.4KB); without the cap it wrote a 62KB/200-rule draft (the noise this
fixes). Production horizon is 900s so the steady-state count is far lower.
```

## Files touched (4)
- .claude/hooks/stop-soul-evolution.mjs      | 140 ++++++++++++++++++++++++++++++++++++++++++++++++---------------------------------------
- .claude/hooks/stop-soul-evolution.test.mjs | 100 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .gitignore                                 |   1 +
- 3 files changed, 178 insertions(+), 63 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a18dbc012e6b`
- Milestone envelope: `mcp-server/data/milestones/SOUL-EVOLUTION-WIRE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._