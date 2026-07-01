# BACKEND-DEV-LOOP/U-MIQ-DOCS-HONESTY — [MAIN] [BACKEND-DEV-LOOP]/U-MIQ-DOCS-HONESTY: correct iter-0 mis-diagnosis — `hits` field elision is MCP serializer (slimResponse), not an engine bug

**Commit:** `abbcc457b12f` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T10:06:03-05:00
**Tags:** backend-dev-loop, u-miq-docs-honesty, auto-distilled

## Subject
[MAIN] [BACKEND-DEV-LOOP]/U-MIQ-DOCS-HONESTY: correct iter-0 mis-diagnosis — `hits` field elision is MCP serializer (slimResponse), not an engine bug

## Body
```
[MAIN] [BACKEND-DEV-LOOP]/U-MIQ-DOCS-HONESTY: correct iter-0 mis-diagnosis — `hits` field elision is MCP serializer (slimResponse), not an engine bug

iter-1 (slot hotel). Re-verifying iter-0's pinned engine quirk #1 found that
MasterIndexEngine.emptyResult() correctly returns `hits: []` (verified at line
1036), and the main query() path always sets `hits`. The empty-key elision
in the live MCP response is `utils/responseSlimmer.slimResponse` (wired into
sessionDispatcher line 220) stripping empty arrays/objects for token
efficiency — same behavior eliminates topUtilized:[], underUtilized:[],
bySource:{}, byBuildClass:{} when empty.

NOT an engine bug. Iter-0's wiki + memory called it "a real R12 inconsistency
in MasterIndexEngine.query"; corrected here per R12 honesty doctrine. Test's
hitsOf() helper is the right contract on the caller side regardless.

Pinned-quirk #2 (STOPWORDS over-include code-search vocabulary) IS still a
real concern; updated docs flag the candidate follow-up unit: opt-in
`stopwords?: "minimal" | "default" | string[]` on MasterIndexQueryOptions.

CHANGED (docs only — no engine/test/schema diff):
- knowledge/wiki/architecture/master-index-filter-contract-fix.md
- knowledge/memories/reference/reference_master_index_filter_contract_fix_2026_05_18.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- .../reference_master_index_filter_contract_fix_2026_05_18.md       | 4 ++--
- knowledge/wiki/architecture/master-index-filter-contract-fix.md    | 7 ++++---
- 2 files changed, 6 insertions(+), 5 deletions(-)

## Lessons surfaced in commit body
- tils/responseSlimmer.slimResponse` (wired into
- tilized:[], underUtilized:[],
- till a

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show abbcc457b12f`
- Milestone envelope: `mcp-server/data/milestones/BACKEND-DEV-LOOP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._