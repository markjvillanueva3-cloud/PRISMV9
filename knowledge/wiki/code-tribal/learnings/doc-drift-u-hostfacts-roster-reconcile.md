# DOC-DRIFT/U-HOSTFACTS-ROSTER-RECONCILE — [MAIN-FORCE] [DOC-DRIFT]/U-HOSTFACTS-ROSTER-RECONCILE (slot:zulu): correct stale 10-model roster -> live 16; void the false ':7b not installed' premise

**Commit:** `c6c30cad823c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-16T22:02:04-05:00
**Tags:** doc-drift, u-hostfacts-roster-reconcile, auto-distilled

## Subject
[MAIN-FORCE] [DOC-DRIFT]/U-HOSTFACTS-ROSTER-RECONCILE (slot:zulu): correct stale 10-model roster -> live 16; void the false ':7b not installed' premise

## Body
```
[MAIN-FORCE] [DOC-DRIFT]/U-HOSTFACTS-ROSTER-RECONCILE (slot:zulu): correct stale 10-model roster -> live 16; void the false ':7b not installed' premise

Re-verified live /api/tags 2026-06-16: 16 Ollama models, not the 10 snapshotted
2026-06-09. Six added since: deepseek-r1:32b/:14b, qwen3-coder:30b, qwen2.5vl:32b,
qwen2.5-coder:14b, qwen2.5-coder:7b. The doc's ':7b NOT installed' claim is now
FALSE -> the fleet-wide ':7b -> :32b' campaign premise is VOID. This stale doc
seeded false 'phantom model' drift in a Hermes-config audit this session.
Non-destructive R12 update note (preserves the 06-09 snapshot).
```

## Files touched (2)
- state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md | 2 ++
- 1 file changed, 2 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c6c30cad823c`
- Milestone envelope: `mcp-server/data/milestones/DOC-DRIFT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._