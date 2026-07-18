# COMMAND-KERNEL-MS0/U-CK04 — [MAIN] [COMMAND-KERNEL-MS0]/U-CK04: knowledge/wiki/os/ namespace + entity frontmatter schema

**Commit:** `b6a0db35a0d5` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T04:24:10-05:00
**Tags:** command-kernel-ms0, u-ck04, auto-distilled

## Subject
[MAIN] [COMMAND-KERNEL-MS0]/U-CK04: knowledge/wiki/os/ namespace + entity frontmatter schema

## Body
```
[MAIN] [COMMAND-KERNEL-MS0]/U-CK04: knowledge/wiki/os/ namespace + entity frontmatter schema

EXTENDS U-VAULT01 (knowledge-vault-schema). Adds a structured 6-kind
sub-namespace under wiki/ for vault-as-OS entities: commands, pipelines,
processes, runqueue, sessions, syscalls. Frontmatter schema with required
+ kind-aware optional keys, cross-namespace linking conventions, validation
via existing /wiki-lint, promotion path consistent with U-VAULT01.

NOT a 6th top-level vault namespace — U-VAULT01's 5 (memory/wiki/commands/
handoffs/specs) are unchanged. wiki/os/ lives under wiki/ and follows the
existing wiki regen pipeline.

Frontmatter REQUIRED keys: title, slug, kind∈{command|pipeline|process|
runqueue|session|syscall}, status, date, milestone, unit, author. Kind-
aware optional keys (e.g. command.mirrors_skill, syscall.kernel_handler,
pipeline.cron) documented per row.

Files:
 - knowledge/wiki/os/_schema.md (new, frontmatter+sub-namespace schema)
 - knowledge/wiki/os/commands/.gitkeep (new)
 - knowledge/wiki/os/pipelines/.gitkeep (new)
 - knowledge/wiki/os/processes/.gitkeep (new)
 - knowledge/wiki/os/runqueue/.gitkeep (new)
 - knowledge/wiki/os/sessions/.gitkeep (new)
 - knowledge/wiki/os/syscalls/.gitkeep (new)

Strictly additive — no existing wiki entries touched. Unblocks U-CK05
(generator mirrors os/ entities → JSON registries).
```

## Files touched (8)
- knowledge/wiki/os/_schema.md         | 117 +++++++++++++++++++++++++++++++++++
- knowledge/wiki/os/commands/.gitkeep  |   0
- knowledge/wiki/os/pipelines/.gitkeep |   0
- knowledge/wiki/os/processes/.gitkeep |   0
- knowledge/wiki/os/runqueue/.gitkeep  |   0
- knowledge/wiki/os/sessions/.gitkeep  |   0
- knowledge/wiki/os/syscalls/.gitkeep  |   0
- 7 files changed, 117 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b6a0db35a0d5`
- Milestone envelope: `mcp-server/data/milestones/COMMAND-KERNEL-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._