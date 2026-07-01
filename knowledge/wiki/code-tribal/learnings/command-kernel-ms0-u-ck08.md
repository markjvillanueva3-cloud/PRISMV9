# COMMAND-KERNEL-MS0/U-CK08 — [MAIN] [COMMAND-KERNEL-MS0]/U-CK08: command-migrate-runner.mjs per-category executor + 24 tests

**Commit:** `649dfc4f78c4` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T19:27:43-05:00
**Tags:** command-kernel-ms0, u-ck08, auto-distilled

## Subject
[MAIN] [COMMAND-KERNEL-MS0]/U-CK08: command-migrate-runner.mjs per-category executor + 24 tests

## Body
```
[MAIN] [COMMAND-KERNEL-MS0]/U-CK08: command-migrate-runner.mjs per-category executor + 24 tests

U-CK08 — per-category executor over U-CK07's command-migrate.mjs codemod:
  - .claude/scripts/command-migrate-runner.mjs — wraps runMigration (R8: 0 new edit rules), groups the 233-command corpus by filename-prefix category, generates wiki/os/commands/<slug>.md ARCHITECTURE stubs (frontmatter-only; skill .md remains the executable spec, linked via mirrors_skill:), emits state/shared/U-CK08-migration-report.md per-category verdicts.
  - Per-category protocol honored: --category <name> restricts a run; spec calls for scrutiny pass per category (~13 categories per ACP-MS0). --codemod-apply gated behind --apply (defensive: stub creation is the common path, source rewrite is the careful one).
  - HAND-CURATED PRESERVATION (R12 safety invariant): classifyExistingStub treats unit:U-CK08 as runner-owned (safe overwrite), any other unit / no-frontmatter as hand-curated (PRESERVED byte-for-byte, never clobbered). E.g. checkin.md (U-CK04) survives untouched.

Tests — 24/24 PASS (node --test):
  - categoryOf: prefix derivation, no-hyphen, empty/null, leading-hyphen→misc, case-insensitive
  - groupByCategory: alpha-sorted cats, slug-sorted within, empty input
  - buildOsCommandStub: full required frontmatter, NO fabricated description/triggers/dispatcher_actions, ISO date default, single-word title
  - classifyExistingStub: missing / U-CK08-owned / other-unit-preserve / no-frontmatter-preserve
  - runRunner: dry-run no-write / apply+category-filter / same-day idempotent / CROSS-DAY idempotent (preserves original date — no 232-file commit churn) / hand-curated preserved / runner-owned refreshed / report-only / report content

SELF-CROSS-CHECK + 1 self-found P1 fixed (R12 fail-loud — agent scrutiny rate-limited this iter):
  - The formal per-file Mode-A 2-agent scrutiny gate could NOT run: BOTH reviewer agents hit the Anthropic usage limit (resets ~22:10 CST). Surfaced honestly here, not hidden.
  - Self-cross-check against the 6 P1 classes from the U-CK05 review found a REAL cross-day idempotency bug: buildOsCommandStub stamped date:<today>, so a re-run on a later day would rewrite all ~232 stubs (massive commit churn). FIXED: refreshing a runner-owned stub now preserves its ORIGINAL date: (first-creation stamps today; refresh preserves). +1 fail-on-revert cross-day test (24/24 green).
  - DEFERRED to next loop iter (post limit-reset): formal 2-agent Mode-A scrutiny on command-migrate-runner.mjs + its test. Flagged in handoff + CLAUDE.md regression log.

Application protocol (per-category, operator/loop-paced — NOT run in this commit; the runner is the deliverable, the 232-stub sweep is the protocol the spec mandates be per-category-with-scrutiny):
  node .claude/scripts/command-migrate-runner.mjs --list-categories
  node .claude/scripts/command-migrate-runner.mjs --apply --category <cat>   # one cat, scrutiny, commit, next

Inlined constants: 0. Security: no exec (pure fs + delegation to CK07). Live dry-run verified: 233 commands, 0 failed, 807 anti-patterns, 13+ categories.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- .claude/scripts/command-migrate-runner.mjs         | 462 +++++++++++++++++++++
- .../src/__tests__/command-migrate-runner.test.mjs  | 403 ++++++++++++++++++
- 2 files changed, 865 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 649dfc4f78c4`
- Milestone envelope: `mcp-server/data/milestones/COMMAND-KERNEL-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._