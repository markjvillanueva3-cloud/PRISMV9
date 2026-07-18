# OBSIDIAN-VAULT-OPS/U-VAULT02 — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-OPS]/U-VAULT02 (slot:sierra): Memory->Wiki promotion engine

**Commit:** `74a539b4bc51` · **By:** markjvillanueva3-cloud · **At:** 2026-06-05T23:55:18-05:00
**Tags:** obsidian-vault-ops, u-vault02, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-OPS]/U-VAULT02 (slot:sierra): Memory->Wiki promotion engine

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-OPS]/U-VAULT02 (slot:sierra): Memory->Wiki promotion engine

Closes the vault's missing compounding spine (fleeting->memory->WIKI->CLAUDE.md).
Promotes memories proven durable by USAGE — inboundRefs>=3 AND age>=7d AND
type in {feedback,reference,lessons,decisions,patterns,mistakes} — into the
project-lifetime wiki (Matuschak evergreen pattern). Clones promote-tribal-to-
wiki.mjs (pure-core + injected-IO, dry-run default, atomic writes, skip-exists).
Ref-counting reuses the alias-aware [[t|alias]] extraction fixed in
U-VAULT-ALIAS-LINK-FIX. Wiki->memory backlink in entry body; memory->wiki
pointer guarded behind --backlink.

Live validation: 11,750 memories, 0 malformed, 55 promotable in 3.1s
(feedback_conflict_fork_rule=150 refs, feedback_always_build=22 refs).
Tests: 23/23 (units + hermetic real-FS E2E: gate, alias-ref-counting, skip-
existing idempotence, project/user exclusion, backlink idempotence, malformed
survival, self-ref exclusion, non-finite fail-closed).
```

## Files touched (3)
- scripts/promote-memory-to-wiki.mjs      | 377 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/promote-memory-to-wiki.test.mjs | 242 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 619 insertions(+)

## Lessons surfaced in commit body
- lessons,decisions,patterns,mistakes} — into the

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 74a539b4bc51`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-VAULT-OPS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._