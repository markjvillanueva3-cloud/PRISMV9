# JULIETT-12CHAT-ALLOCATION-MS0/U-CLEAR-AUTO-RESUME — [MAIN] [JULIETT-12CHAT-ALLOCATION-MS0]/U-CLEAR-AUTO-RESUME: honest close-out record (corrects 5b16e56c68 message scope)

**Commit:** `c004ad1cb875` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T20:11:22-05:00
**Tags:** juliett-12chat-allocation-ms0, u-clear-auto-resume, auto-distilled

## Subject
[MAIN] [JULIETT-12CHAT-ALLOCATION-MS0]/U-CLEAR-AUTO-RESUME: honest close-out record (corrects 5b16e56c68 message scope)

## Body
```
[MAIN] [JULIETT-12CHAT-ALLOCATION-MS0]/U-CLEAR-AUTO-RESUME: honest close-out record (corrects 5b16e56c68 message scope)

R12 correction. The PRIOR commit 5b16e56c68 carried the U-CLEAR-AUTO-RESUME
message but its DIFF is solely an incidental re-track of mcp-server/.claude/
settings.json (valid JSON, previously tracked in 5e4afb24ba / 44f4fac280,
swept in by an over-broad `**/.claude/settings.json` git-add glob). That
file is benign (a restoration of a pre-tracked valid config) but is NOT the
U-CLEAR deliverable, and the prior message over-claimed.

ACTUAL U-CLEAR-AUTO-RESUME deliverable (a harness-config unit — produces NO
repo diff BY DESIGN; the SessionStart hook chain lives in the user-global
H:/.claude/settings.json + C:/Users/wompu/.claude/settings.json, OUTSIDE the
H:/prism git tree, per the unit spec Files-touched):

  Added a separate additive { matcher: 'clear' } SessionStart arm wiring
  session-start-auto-resume.mjs (whose code already accepts source==='clear'
  at line 319). VERIFIED LIVE: auto-resume matchers = [compact,clear] in
  BOTH C: and H: (c-to-h-mirror parity true); smoke `source=clear` accepted
  cleanly; compact path regression-free. /clear now gets the same handoff
  RESUME injection as /compact (closes the CLEAR-NOT-COMPACT gap; unblocks
  U-CLEAR-BYPASS-COMPOSITE + all-/clear-pickup-fleet-wide).

Lesson: never `git add` harness-config paths with a recursive glob — the
real deliverable is outside the repo; the glob only catches collateral.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (11)
- knowledge/wiki/architecture/_stats.md              |   51 +-
- knowledge/wiki/architecture/u-tribal-embed-gap.md  |   99 +
- .../devDispatcher.formula-harvest-wire.test.ts     |  169 -
- mcp-server/src/engines/FormulaHarvesterEngine.ts   |   50 +-
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |   19 +-
- .../PRISM_ADVANCED_CROSS_DOMAIN_v1.js              |  755 -----
- .../PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js        | 3223 --------------------
- .../PRISM_UNIVERSITY_COURSE_REFERENCE_v1.js        | 2604 ----------------
- scripts/build-wiki-leaf-index.test.mjs             |  196 ++
- .../patches/CLAUDE-PATCH-u-tribal-embed-gap.md     |   26 +
_(+1 more)_

## Lessons surfaced in commit body
- Lesson: never `git add` harness-config paths with a recursive glob — the

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c004ad1cb875`
- Milestone envelope: `mcp-server/data/milestones/JULIETT-12CHAT-ALLOCATION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._