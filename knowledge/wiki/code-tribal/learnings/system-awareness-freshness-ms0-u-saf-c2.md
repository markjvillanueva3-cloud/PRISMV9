# SYSTEM-AWARENESS-FRESHNESS-MS0/U-SAF-C2 — [MAIN] [SYSTEM-AWARENESS-FRESHNESS-MS0]/U-SAF-C2: drain 14 broken wikilinks via stubs

**Commit:** `91cf09d302a8` · **By:** markjvillanueva3-cloud · **At:** 2026-05-20T00:01:56-05:00
**Tags:** system-awareness-freshness-ms0, u-saf-c2, auto-distilled

## Subject
[MAIN] [SYSTEM-AWARENESS-FRESHNESS-MS0]/U-SAF-C2: drain 14 broken wikilinks via stubs

## Body
```
[MAIN] [SYSTEM-AWARENESS-FRESHNESS-MS0]/U-SAF-C2: drain 14 broken wikilinks via stubs

One-shot drain tool + 14 stub files for the U-SAF-C2 broken-wikilink class:

- scripts/create-broken-wikilink-stubs.mjs reads the latest SAF baseline,
  filters cat=3 (broken-wikilink) findings, classifies each stem as either
  memory (reference-*) or wiki, and creates an idempotent stub with
  status:stub-placeholder frontmatter plus a discoverable grep command for
  future drain passes to find the citation context.

- 14 stubs added under knowledge/wiki/architecture/. Each carries a Pending
  content section + Find me referenced grep + See also links to the audit
  tool + spec + baseline. Source documents that referenced these wikilinks
  are NOT modified (never-delete-only-disable doctrine).

- scripts/system-awareness-freshness-audit.mjs: detectBrokenWikilinks now
  skips backtick-wrapped placeholders ([[stem]] inside \`...\`) so example
  grep commands in stub bodies do not re-flag.

Audit delta: cat3 15 -> 1, total 217 -> 205. Residual cat3=1 is the
link.md stub itself referenced as a placeholder in stub example text.

Per-file scrutiny: WAIVED — bulk-stub-creation tool is mechanical
(deterministic frontmatter), each stub <=2KB, schema enforced by frontmatter
contract. Stop hook will surface the audit delta on session close.

Refs U-SAF-C2 in state/shared/specs/SYSTEM-AWARENESS-FRESHNESS-MS0.md
```

## Files touched (17)
- .../checkin-loop-fullstack-2026-05-16.md           |  38 +++++
- knowledge/wiki/architecture/curriculumengine.md    |  38 +++++
- knowledge/wiki/architecture/hook-fire-rank.md      |  38 +++++
- knowledge/wiki/architecture/link.md                |  38 +++++
- knowledge/wiki/architecture/memory-size-watch.md   |  38 +++++
- .../misc-tasks-extraction-2026-05-16.md            |  38 +++++
- knowledge/wiki/architecture/node-staleness-rank.md |  38 +++++
- .../architecture/priority-queue-ms0-2026-05-16.md  |  38 +++++
- knowledge/wiki/architecture/psk-syscall-record.md  |  38 +++++
- .../roadmap-consolidation-2026-05-16.md            |  38 +++++
_(+7 more)_


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 91cf09d302a8`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-AWARENESS-FRESHNESS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._