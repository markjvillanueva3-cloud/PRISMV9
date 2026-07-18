# OBSIDIAN-VAULT-OPS/U-VAULT06 — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-OPS]/U-VAULT06 (slot:sierra): vault-rot sentinel

**Commit:** `cd8105211446` · **By:** markjvillanueva3-cloud · **At:** 2026-06-06T00:06:52-05:00
**Tags:** obsidian-vault-ops, u-vault06, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-OPS]/U-VAULT06 (slot:sierra): vault-rot sentinel

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-OPS]/U-VAULT06 (slot:sierra): vault-rot sentinel

Read-only auditor (dunik 90-day vault-rot pattern): flags notes that are BOTH
stale AND orphaned (zero inbound [[wikilinks]]). NEVER deletes/moves
(never-delete-only-disable) — emits triage report + state/shared/vault-rot-report.json.
Reuses the alias-aware link extraction from promote-memory-to-wiki.mjs (ONE
source of truth for [[wikilink]] parsing).

FINDING (R12): filesystem mtime is a useless staleness signal for the memory
namespace because the C:->H: mirror rewrites files constantly (every note looks
fresh) — so age resolves from authored date (frontmatter written_at/date/...,
incl. indented provenance; or filename YYYY_MM_DD) and falls back to mtime only
as last resort.

Live validation (11,751 notes, orphaned=10,583): 90d=0 rotting (vault is ~2mo
old, correctly nothing that stale), 30d=86 rotting (devops_improvements 39d/0refs),
14d=453 — monotonic, detector proven. Tests 12/12 (incl. mirror scenario:
old authored date + fresh mtime still flagged).
```

## Files touched (3)
- scripts/vault-rot-sentinel.mjs      | 217 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/vault-rot-sentinel.test.mjs | 135 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 352 insertions(+)

## Lessons surfaced in commit body
- till flagged).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show cd8105211446`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-VAULT-OPS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._