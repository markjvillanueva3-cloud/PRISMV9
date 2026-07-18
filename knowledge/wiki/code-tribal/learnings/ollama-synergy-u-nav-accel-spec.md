# OLLAMA-SYNERGY/U-NAV-ACCEL-SPEC — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-SYNERGY]/U-NAV-ACCEL-SPEC (slot:sierra): codebase-nav accel audit + plan (operator-approved Both Gap A first) + tribal-QA shipped marker

**Commit:** `4ea295132153` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T14:59:07-05:00
**Tags:** ollama-synergy, u-nav-accel-spec, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-SYNERGY]/U-NAV-ACCEL-SPEC (slot:sierra): codebase-nav accel audit + plan (operator-approved Both Gap A first) + tribal-QA shipped marker

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-SYNERGY]/U-NAV-ACCEL-SPEC (slot:sierra): codebase-nav accel audit + plan (operator-approved Both Gap A first) + tribal-QA shipped marker

4-agent audit (file:line cited): most nav infra already built; LLM-wire-every-node is WRONG (embeddings do it O(768), already wired). GAP A (next, deterministic): ~3300/5320 source files lack a node -> file-level FAST[] node gen + merge-splice -> seekCard every file. GAP B: node embed + LAZY semantic rerank after BM25 (opt-in, off hot-path). GAP C backlog: Ollama drafts forge-triple SCAFFOLD as CANDIDATE thru dedup->tests->scrutiny (never auto-wire). Coordinates w/ alpha ollama-nav-enforce. Marks #2 tribal-QA (6fb278a2ee) shipped.
```

## Files touched (3)
- state/shared/specs/CODEBASE-NAV-ACCEL-2026-06-09.md   | 39 +++++++++++++++++++++++++++++++++++++++
- state/shared/specs/OLLAMA-SYNERGY-AUDIT-2026-06-09.md |  6 ++++--
- 2 files changed, 43 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- WRONG (embeddings do it O(768), already wired). GAP A (next, deterministic): ~3300/5320 source files lack a node -> file-level FAST[] node gen + merge-splice -> seekCard every file. GAP B: node embed + LAZY semantic rerank after BM25 (opt-in, off hot-path). GAP C backlog: Ollama drafts forge-triple SCAFFOLD as CANDIDATE thru dedup->tests->scrutiny (never auto-wire). Coordinates w/ alpha ollama-nav-enfo

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4ea295132153`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._