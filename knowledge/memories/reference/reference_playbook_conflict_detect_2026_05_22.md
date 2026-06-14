---
name: reference-playbook-conflict-detect-2026-05-22
description: 2026-05-22 foxtrot /loop — U-PB-CONFLICT-DETECT shipped MachiningPlaybookEngine.detectConflicts() playbook semantic conflict scanner + playbook_conflicts action.
aliases: reference_playbook_conflict_detect_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.271Z
---


# U-PB-CONFLICT-DETECT — playbook semantic conflict detector

2026-05-22 foxtrot `/loop` iter 2 ("drastically enhance and expand playbooks"). Commit `7124fff4` — 5 files, 416 insertions, 37 tests, 3-of-3 PASS.

`MachiningPlaybookEngine.detectConflicts(): PlaybookConflictReport` — finds pairs of playbook rules giving CONTRADICTORY parameter directives (e.g. one "increase feedrate", another "reduce feedrate") under overlapping machining conditions. Semantic-layer complement to `auditIntegrity()` (structural). Directive extraction = deterministic nearest-parameter lexicon co-occurrence (NOT NLP — `method: "lexicon-cooccurrence"`), negation-aware, internal-ambiguity excluded. Co-fire gate = same category + condition overlap (`describeOverlap`). 4 exported types; `playbook_conflicts` action on `prism_shop_practice` (5-surface wire).

Playbook query surface is now: advise / lookup / add_rule / sequence / setup / antipatterns / explain / coverage / quantitative / audit / conflicts — built up across U-PB-EXPAND, U-PB-INTEGRITY-AUDIT, U-PB-CONFLICT-DETECT.

**Closed 2026-05-22 — `conditions_all` P2 (reviewer C):** shipped same-day in `ba21bc16c3` (U-PB-CONFLICT-DETECT-CONDITIONS-ALL). `conditionDiscretes` now folds BOTH `rule.conditions` AND `rule.conditions_all` into the discrete set. Test coverage: `PlaybookConflictDetection.test.ts:345-475` (killer case + mixed + always-in-conditions_all + adversarial non-array/null/non-string).

**Closed 2026-05-22 — Doc-reflection:** wiki entry shipped as `knowledge/wiki/architecture/playbook-capability-extensions.md` (covers the full U-PB-EXPAND / U-PB-INTEGRITY-AUDIT / U-PB-CONFLICT-DETECT trio with co-fire detection, 11-action surface table, architecture layering).

**Closed 2026-05-23 (foxtrot iter3) — Stop/cron drift detection:** shipped as `.claude/hooks/stop-playbook-corpus-drift-advisory.mjs` (commit `583e4b7393`, peer-absorbed — see `reference_u_pb_corpus_drift_hook_2026_05_23`). Static-scan Stop advisory catches duplicate ids + broken related_rules refs; nudges operator to `prism_shop_practice:playbook_validate_corpus` for the deeper engine-driven scan.

**Wiring audit closed 2026-05-23 (foxtrot reorient iter2):** WIRE-TO-ALL-SOURCES is satisfied via engine-indirection — `MachiningPlaybookEngine.advise()` consumed by `AdvancedPostProcessorEngine` (postPipeline stage `playbook_rules`) reachable from `prism_cam:pp_resolve_context`, plus `AdaptiveFeedControlEngine` direct call, plus 3 AI registry references. Per dispatcher doctrine ("Cross-dispatcher calls are forbidden — use shared engines instead"), duplicate playbook actions on `prism_cam`/`prism_safety` would VIOLATE doctrine. No new wiring needed.

**Open — P1-U07 `/playbook` CLI skill:** SHIPPED — `H:/prism/.claude/commands/playbook.md` exists (186 lines).

**Still open — `PLAYBOOK_RULES` corpus expansion in blind-spot categories** (`coverageReport` identifies them). Genuine multi-iter data work, not a single-iter task.

Lexicon-cooccurrence is heuristic and advisory — every conflict carries the rule ids for human verification. See [[feedback_always_close_out]].
