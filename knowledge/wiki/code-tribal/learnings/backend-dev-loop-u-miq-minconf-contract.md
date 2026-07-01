# BACKEND-DEV-LOOP/U-MIQ-MINCONF-CONTRACT — [MAIN] [BACKEND-DEV-LOOP]/U-MIQ-MINCONF-CONTRACT: post-blend min_confidence filter (R12 fix) + 22-case dispatcher round-trip test + /knowledge-query skill

**Commit:** `affff27a21a6` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T09:57:29-05:00
**Tags:** backend-dev-loop, u-miq-minconf-contract, auto-distilled

## Subject
[MAIN] [BACKEND-DEV-LOOP]/U-MIQ-MINCONF-CONTRACT: post-blend min_confidence filter (R12 fix) + 22-case dispatcher round-trip test + /knowledge-query skill

## Body
```
[MAIN] [BACKEND-DEV-LOOP]/U-MIQ-MINCONF-CONTRACT: post-blend min_confidence filter (R12 fix) + 22-case dispatcher round-trip test + /knowledge-query skill

iter-0 of the backend-dev /loop (slot hotel). Dedup-preflight caught that
prism_session:master_index_query already shipped 2026-05-12. Re-scoped to
discoverability + regression coverage; that regression test caught a real
R12 silent contract bug.

R12 BUG (now fixed): MasterIndexEngine.query() applied min_confidence at
lines 668/732 against RAW pre-blend score, then mutated h.confidence at
line 750 via blend (× max(UTIL_FLOOR=0.4, utilization^UTIL_BIAS)). Since
blend monotonically reduces, hits passing min_confidence: 0.5 raw came out
at confidence: 0.235. Fix: post-blend filter pass (early prune kept for
perf); downstream aggregations + totals + returned hits all switched to
filteredHits.

SHIPPED:
- mcp-server/src/__tests__/MasterIndexFilters.dispatcher.e2e.test.ts (363 LOC, 22 cases)
  3 wiring + 1 happy + 7 filter wiring + 5 failure mode + 3 adversarial + 3 variability
  All pass against the live system-graph.json
- mcp-server/src/engines/MasterIndexEngine.ts (R12 fix in query())
- knowledge/wiki/architecture/master-index-filter-contract-fix.md
- knowledge/memories/reference/reference_master_index_filter_contract_fix_2026_05_18.md
- .claude/commands/knowledge-query.md (operator-local, gitignored)

PINNED ENGINE QUIRKS for future cleanup units:
- Engine omits `hits` field when totalHits=0 (vs hits:[])
- STOPWORDS drop: engine/engines/feature/features/system/systems/node/label/info/wiki/memory/prism

VERIFIED: 22/22 pass; tsc --noEmit clean.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (5)
- ..._master_index_filter_contract_fix_2026_05_18.md |  59 ++++
- .../master-index-filter-contract-fix.md            | 100 ++++++
- .../MasterIndexFilters.dispatcher.e2e.test.ts      | 363 +++++++++++++++++++++
- mcp-server/src/engines/MasterIndexEngine.ts        |  32 +-
- 4 files changed, 547 insertions(+), 7 deletions(-)

## Lessons surfaced in commit body
- TIL_FLOOR=0.4, utilization^UTIL_BIAS)). Since

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show affff27a21a6`
- Milestone envelope: `mcp-server/data/milestones/BACKEND-DEV-LOOP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._