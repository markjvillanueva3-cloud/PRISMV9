# LEFTOVER-TRUTH/U-MISC-COMPOUND-BASENAME-FIX — [MAIN-FORCE] [LEFTOVER-TRUTH]/U-MISC-COMPOUND-BASENAME-FIX (slot:zulu): extractCodeAssets dropped compound basenames -> false-ABSENT -> false-close

**Commit:** `1ac297d7c881` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T21:57:28-05:00
**Tags:** leftover-truth, u-misc-compound-basename-fix, auto-distilled

## Subject
[MAIN-FORCE] [LEFTOVER-TRUTH]/U-MISC-COMPOUND-BASENAME-FIX (slot:zulu): extractCodeAssets dropped compound basenames -> false-ABSENT -> false-close

## Body
```
[MAIN-FORCE] [LEFTOVER-TRUTH]/U-MISC-COMPOUND-BASENAME-FIX (slot:zulu): extractCodeAssets dropped compound basenames -> false-ABSENT -> false-close

The first live Ollama recall sweep (--limit 40, this session) false-closed MISC-124
on the reason "File no longer exists" -- but scrutiny-ledger.test.mjs DOES exist
(.claude/helpers/). Root cause (R12, my own code): the shared CODE_ASSET_RE
`/\b[\w-]+\.(?:mjs|ts|js)\b/` stops at the LAST dot-segment, so a compound
basename like `scrutiny-ledger.test.mjs` extracted as `test.mjs` -> missed the
basename path-index -> gatherEvidence emitted "ABSENT" -> Ollama (correctly reading
ABSENT) closed it. A never-false-close charter violation in practice, AND it
mis-fed BOTH arms (deterministic stale-reference + now-wired, and the Ollama arm).
fix: `/\b[\w-]+(?:\.[\w-]+)*\.(?:mjs|ts|js)\b/` -- allow interior dot-segments,
backtracking so `a.mjs b.mjs` still yields two matches. Bonus: vitest.config.ts now
extracts whole -> correctly hits the wire-target exclusion (before it degraded to
config.ts and escaped the filter). +1 R9 oracle (compound name extracts whole, not
test.mjs; 2-file line; vitest.config.ts excluded). 22/22 det + 12/12 ollama. LIVE:
MISC-124 evidence now reads "scrutiny-ledger.test.mjs EXISTS" (was ABSENT).
Surfaced by dogfooding the recall arm -- the sweep paid for itself.
```

## Files touched (3)
- scripts/verify-misc-tasks-open.mjs      |  7 ++++++-
- scripts/verify-misc-tasks-open.test.mjs | 14 ++++++++++++++
- 2 files changed, 20 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- till yields two matches. Bonus: vitest.config.ts now

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1ac297d7c881`
- Milestone envelope: `mcp-server/data/milestones/LEFTOVER-TRUTH.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._