---
name: reference_tango_sweep_section_d_disposition_2026_06_16
description: tango worked through TANGO-DISCOVERY-SWEEP §D (meta-tool hygiene) — 2 real hardcoded-path fixes shipped, 1 finding refuted-on-read (non-bug), 2 items queued/routed. slot tango 2026-06-16.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.220Z
aliases: reference_tango_sweep_section_d_disposition_2026_06_16
---


**TANGO SWEEP §D DISPOSITION (slot tango, 2026-06-16, push-through /loop)** — worked through `state/shared/specs/TANGO-DISCOVERY-SWEEP-2026-06-15.md` §D (LOWER-PRIORITY tango/golf meta-tool hygiene). Each item verified-on-disk in the CURRENT tree (sweep agents ran ~1900 commits behind -> stale line numbers).

**SHIPPED (2 real bugs, commit `1224c4fc1c` U-METATOOL-PATH-PORTABILITY):**
- `harness-wiring-audit.mjs` — hardcoded `H:/prism/.claude/hooks` + `HOOK_WIRING_AUDIT.{json,md}` report paths -> derive REPO_ROOT from script location (correct from any worktree/clone; same class as the 5 tango fixed earlier, e.g. `502b811ecf`). Verified: 876/377/506, no regression.
- `high-value-additions-rank.mjs:55` — hardcoded `H:/.claude/settings.json` -> `path.resolve(ROOT,"..",".claude","settings.json")` (repo-sibling .claude). Verified runs clean.

**REFUTED ON READ (R12 -- NOT a bug, do NOT "fix"):**
- `produce-automation-gap-map.mjs` "readdirSync under-count" (sweep P2) -> `listFilesByExt` is non-recursive BY DESIGN: it lists top-level wireable hooks; `bundles/`/`helpers/`/`__tests__/` are libraries/tests handled separately (line 192 walks bundles for sub-hooks). Making it recursive would OVER-count helpers/tests as hooks. The sweep agent flagged a semantic choice as a bug (it never read the schema -- my soul's exact refusal). Left as-is.

**QUEUED / ROUTED (not now-builds):**
- COGNITIVE-STACK-AUDIT regenerator: `COGNITIVE-STACK-AUDIT-2026-05-07.json` is 40d stale; its only generator is `cognitive_formula_scrutiny_swarm.py` (an agent-swarm, not deterministic). Building a deterministic regenerator = reverse-engineering a stale swarm's output schema -> a DEEP, uncertain-value build. Queue for a fresh-budget scoped iteration; verify the audit is still consumed before investing.
- `asset-deletion-block.mjs.bak-20260427` in the active hooks dir -> **golf** (hooks dir is golf/settings-adjacent; tango doesn't touch it). Archive (never delete) per [[feedback_never_delete_only_disable]].
- Stale audits regeneration (CLOSE-OUT-CANDIDATES / SKILL-LIBRARY-AUDIT / ENGINE_WIRING_INDEX / HOOK_WIRING_AUDIT) -> their generators may need the same date-stamp/path fix; golf/owner cadence.

**LESSON:** a discovery-sweep finding is a HYPOTHESIS until verified-on-disk in the current tree. 2 of 4 §D items I checked were real (path bugs); 1 was a refuted non-bug; 1 is a deep build mislabeled "P2". Read the schema before fixing. Sister: [[reference_tango_discovery_coverage_dashboard_2026_06_16]] (the session's coverage-tool capstone), `TANGO-DISCOVERY-SWEEP-2026-06-15.md` (the source sweep).
