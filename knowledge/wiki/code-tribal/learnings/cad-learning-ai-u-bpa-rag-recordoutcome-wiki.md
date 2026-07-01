# CAD-LEARNING-AI/U-BPA-RAG-RECORDOUTCOME-WIKI — [MAIN-FORCE] [CAD-LEARNING-AI]/U-BPA-RAG-RECORDOUTCOME-WIKI (slot:india): correct canonical-writer lesson -- dispatcher wiring was NOT a one-liner

**Commit:** `7e60dc838dcc` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T14:17:53-05:00
**Tags:** cad-learning-ai, u-bpa-rag-recordoutcome-wiki, auto-distilled

## Subject
[MAIN-FORCE] [CAD-LEARNING-AI]/U-BPA-RAG-RECORDOUTCOME-WIKI (slot:india): correct canonical-writer lesson -- dispatcher wiring was NOT a one-liner

## Body
```
[MAIN-FORCE] [CAD-LEARNING-AI]/U-BPA-RAG-RECORDOUTCOME-WIKI (slot:india): correct canonical-writer lesson -- dispatcher wiring was NOT a one-liner

R12 / bug-finding->wiki gate: the lesson claimed the blueprint_rag_extract
recordOutcome wiring was "a de-risked one-liner". WRONG -- the writer is repo-root
.mjs, the dispatcher is .ts->dist; no clean import spans that boundary. Documents
the real CWD-independent dynamic-import resolution (import.meta.url repo-root
anchor, src/dist co-depth, +1 .. to escape mcp-server), and the silent-breakage
trap (engine's empty advisory catch means a wrong dist path fails silently -- only
a through-the-real-consumer test proves the wire). Shipped in e2fa23c46f.
```

## Files touched (2)
- knowledge/wiki/lessons/canonical-ledger-writer-pattern.md | 34 ++++++++++++++++++++++++++++++++--
- 1 file changed, 32 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- lesson -- dispatcher wiring was NOT a one-liner
- lesson claimed the blueprint_rag_extract
- WRONG -- the writer is repo-root
- wrong dist path fails silently -- only

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7e60dc838dcc`
- Milestone envelope: `mcp-server/data/milestones/CAD-LEARNING-AI.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._