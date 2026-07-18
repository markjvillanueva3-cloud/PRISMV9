---
name: reference_skill_curator_already_exists_2026_06_18
description: "The PRISM skill-usage CURATOR already exists (SKILLS-UTILIZATION-MS0 + CLEANUP-MS0/U-CLEANUP-H2) -- do NOT build a new one. skill-utilization-scan.mjs (weekly Tue, advisory 30d-unused archive candidates) + skill-refinement-digest.mjs + SkillRefinementDigestEngine ARE the Hermes-article 'skill curator'. A 2026-06-18 zulu autonomous-build attempt nearly built a duplicate; grep-by-name (curator|decay) missed the asset NAMED utilization-scan -- deep read-first caught it."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.205Z
aliases: reference_skill_curator_already_exists_2026_06_18
---


**The PRISM skill-usage CURATOR already exists -- do NOT rebuild it (slot:zulu, 2026-06-18).**

Building "a usage-driven skill curator" (the net-new gap I first flagged in `HERMES-UTILIZATION-ASSESSMENT-2026-06-18`) is a **DUPLICATE**. The curator was already shipped by **SKILLS-UTILIZATION-MS0** + **CLEANUP-MS0/U-CLEANUP-H2**:

- `scripts/skill-utilization-scan.mjs` -- weekly Tue 04:23 cron; sweeps `~/.claude/commands` (~390) + `.claude/commands` (~160); surfaces **30-day-unused skills as ADVISORY archive candidates** (never auto-moves -- respects the asset-preservation rule); signals = SKILL_QUALITY_REGISTRY `invocation_count_30d` + mtime fallback + skill-lint; outputs `state/shared/SKILL_UTILIZATION_REPORT.{md,json}`. = the article's phase-1 mechanical decay curator.
- `scripts/skill-refinement-digest.mjs` -- weekly Fri 09:13 cron; `SkillRefinementDigestEngine` + `prism_dev:skill_refinement_digest`; linter-flagged/stale/output-overridden digest. = the article's phase-2 review.
- Plus `skill-utilization-index.mjs`, `archived-skill-suggest.mjs`, `skill-lint-stop.mjs`, `skill-3q-gate.mjs`, `SkillGapAnalyzerEngine` (overlap analysis -- note it uses `Math.random()` usage, not real data).

**Live state 2026-06-18:** scan runs (schemaVersion 1, 30d window) but proposed **0** archives; `SKILL_QUALITY_REGISTRY.json` absent at the obvious `mcp-server/data/state` + `state/shared` paths -> the curator is effectively **mtime-only** today (matches its own "invocation_count... many entries null" caveat). `skill-usage-stats.json` (from `skill-usage-tracker.mjs`) tracks only **11 of 749** skills.

**The genuine residual** is NOT a missing curator -- it is the **sparse telemetry feed** (11/749 tracked; registry unpopulated). If anyone improves this: feed real invocation telemetry into the EXISTING curator's signal (owner: alpha/skills); do NOT author a new curator.

**Lesson (R8/R12/R16):** grep-by-keyword (`curator|decay|archive.*skill`) MISSED the asset because it is NAMED `skill-utilization-scan`. Deep read-first (reading the two closest scripts end-to-end) caught the near-duplicate -- the exact `e6cf9b23e6` "almost built a duplicate; R8 read-first caught it" trap. When assessing "does X exist," search by CAPABILITY (run the candidate, read adjacent assets), not just by the name you'd give it. Sibling: [[feedback_read_full_content_not_titles]] · [[feedback_never_claim_absence_without_deep_search]].
