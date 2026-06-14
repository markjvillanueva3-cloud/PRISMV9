---
name: reference_post_ship_memory-wiki-optimization-ms0-u-mwo07
description: Auto-distilled learnings from shipping MEMORY-WIKI-OPTIMIZATION-MS0/U-MWO07 (commit 7a1a62c75). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.557Z
aliases: reference_post_ship_memory-wiki-optimization-ms0-u-mwo07
---


# MEMORY-WIKI-OPTIMIZATION-MS0/U-MWO07

[MAIN] [MEMORY-WIKI-OPTIMIZATION-MS0]/U-MWO07 (slot:bravo iter20): Shift-D wiki-stub auto-stager — 3 files. NEW .claude/hooks/stop-wiki-stub-stager.mjs (Stop T4 hook, opt-in PRISM_WIKI_STUB_STAGE=1) detects fresh U-<ID> commit (extractUnitId regex), checks wiki/code-tribal/learnings/<slug>.md absence, 5-min throttle, then detach-spawns runner. NEW scripts/dream-stage-wiki-stub.mjs writes STAGED 4-file Hermes-Dreaming bundle proposing the new wiki entry — operator reviews via /dream-review before any apply. Pure-fn separation: unitSlug + parseArgs + buildWikiStub + renderReport + artifactId + buildBundle + fetchCommitInfo + run (with mocked fetcher/runner). Cross-file invariant: hook-side unitSlug === runner-side unitSlug asserted in test. Frontmatter stub includes unit/commit/staged_by/staged_at metadata + WHAT/WHY/HOW operator-fillable sections. 17/17 PASS hermetic (3 unitSlug + 3 parseArgs + 2 extractUnitId + 2 buildWikiStub + 1 renderReport + 1 artifactId + 1 buildBundle + 2 fetchCommitInfo + 2 run integration). spawnSync (no shell) for git invocations — no exec(). Knobs: PRISM_WIKI_STUB_STAGE (off default), _THROTTLE_MS (300000), _DRY_RUN. Hook verified emits {continue:true} JSON. Closes U-MWO07 from spec — Shift D adds wiki generation discipline.

**Shipped:** 2026-05-26T20:18:17-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[memory-wiki-optimization-ms0-u-mwo07]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._