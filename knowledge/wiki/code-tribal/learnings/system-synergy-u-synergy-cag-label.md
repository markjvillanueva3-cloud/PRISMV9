# SYSTEM-SYNERGY/U-SYNERGY-CAG-LABEL — [MAIN] [SYSTEM-SYNERGY]/U-SYNERGY-CAG-LABEL (slot:golf): close gap #7 — cag-router named a non-existent qdrant collection

**Commit:** `8550436c8a67` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T22:22:30-05:00
**Tags:** system-synergy, u-synergy-cag-label, auto-distilled

## Subject
[MAIN] [SYSTEM-SYNERGY]/U-SYNERGY-CAG-LABEL (slot:golf): close gap #7 — cag-router named a non-existent qdrant collection

## Body
```
[MAIN] [SYSTEM-SYNERGY]/U-SYNERGY-CAG-LABEL (slot:golf): close gap #7 — cag-router named a non-existent qdrant collection

gap-map #7: cag-router.mjs:399 advertised "qdrant://prism-memory (semantic
vector search)" but that collection does NOT exist — qdrant holds prism_engines
(~3866 pts) / prism_skills / prism_formulas; memory recall is on AgentDB/file-vault.
The label mis-routed any downstream consumer to a phantom collection (R12 honesty).

Fix: name the collections that actually exist + are populated. Keeps "qdrant"
(the route-class test still asserts it) while dropping the false prism-memory
reference. 44/44 cag-router tests pass.
```

## Files touched (2)
- scripts/lib/cag-router.mjs | 6 +++++-
- 1 file changed, 5 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- till asserts it) while dropping the false prism-memory

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8550436c8a67`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._