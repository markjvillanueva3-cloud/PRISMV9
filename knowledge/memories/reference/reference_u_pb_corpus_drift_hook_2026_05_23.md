---
name: reference-u-pb-corpus-drift-hook-2026-05-23
description: "U-PB-CORPUS-DRIFT-HOOK (slot:foxtrot iter3) — static-scan Stop advisory for playbook corpus drift; shipped in commit 583e4b7393 (absorbed into peer slot:alpha iter9 TOKEN-SAVINGS-PIVOT broad git-add); 12/12 tests, wired in Stop chain after stop-bug-finding-wiki-gate"
aliases: reference_u_pb_corpus_drift_hook_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.239Z
---


2026-05-23 foxtrot `/loop` iter3 ("complete all units | units fully wired to all dependable nodes"). Closes the third "Next high-ROI playbook unit" from `reference_playbook_conflict_detect_2026_05_22` — wires playbook corpus-quality scanning into automatic drift detection at session-Stop time.

## Shipped

**`stop-playbook-corpus-drift-advisory.mjs`** (T3 Stop advisory, wired in C: `settings.json` Stop[0].hooks after `stop-bug-finding-wiki-gate`, mirrored to H: by c-to-h-mirror). Lightweight static-parse of `MachiningPlaybookEngine.ts` catches the two cheapest never-fail drift modes:

1. **Duplicate `id:` strings** across PLAYBOOK_RULES (copy-paste corruption)
2. **Broken `related_rules` references** (deletion of referenced rule)

Triggers only when engine `mtime > last-stamp mtime` AND throttle elapsed (60min default). Non-blocking advisory — emits `systemMessage` nudge pointing at `prism_shop_practice:playbook_validate_corpus` for the deeper scan. Deep semantic conflict + structural audit stay on-demand via the existing dispatcher actions.

**`scanPlaybookSource()`** exported for testing — 12 hermetic fixtures: clean 2-rule, single dup, sorted-dup output, unresolved ref + source attribution, multi-rule unresolved, self-ref allowed at static tier, empty related_rules, region-slice ignores pre-PLAYBOOK_RULES `id:` mentions in type-defs/comments, completely empty input, single/double-quoted id mix, malformed related_rules tolerance, 20-ref unresolved batch. **12/12 PASS** via `node --test`.

**Knobs:** `PRISM_PLAYBOOK_DRIFT_DISABLE=1`, `PRISM_PLAYBOOK_DRIFT_THROTTLE_MIN=N` (default 60), `PRISM_PLAYBOOK_DRIFT_MAX_LIST=N` (default 5).

## Files

- `.claude/hooks/stop-playbook-corpus-drift-advisory.mjs` (NEW, 190 lines)
- `.claude/hooks/__tests__/stop-playbook-corpus-drift-advisory.test.mjs` (NEW, 164 lines)
- `H:/.claude/settings.json` + `C:/.claude/settings.json` (Stop chain insert after `stop-bug-finding-wiki-gate`, before `scrutiny-verdict-persist`; 3000ms timeout)

## Wiring audit closure (iter2 finding)

Per dispatcher doctrine ("Cross-dispatcher calls are forbidden — use shared engines instead") the WIRE-TO-ALL-SOURCES doctrine for `MachiningPlaybookEngine` is **already satisfied via engine-indirection**:
- `prism_shop_practice` — primary (15 actions)
- Indirect via `AdvancedPostProcessorEngine` (`playbook_rules` stage in 38-stage `postPipeline`) → reachable from `prism_cam:pp_resolve_context`
- Indirect via `AdaptiveFeedControlEngine` (direct `machiningPlaybookEngine.advise()` call)
- Static registry refs in 3 AI engines

Duplicate playbook actions on `prism_cam` / `prism_safety` would VIOLATE the cross-dispatcher rule. No new wiring action needed.

## Misattribution closeout (peer absorption)

The 2 files were committed in `583e4b7393` under slot:alpha's `[MAIN] [TOKEN-SAVINGS-PIVOT]/U-PSN-NUDGE-R12-AUDIT-TIER (slot:alpha iter9)` commit — the peer ran a broad `git add` that captured my staged files (peer's audit script touched the same `prism_shop_practice:*` action namespace via its R12-tier-classification, so my hook's `systemMessage` reference fell into peer's evidence sweep). The peer's commit body even explicitly names `stop-playbook-corpus-drift-advisory` in its Tier B punch list line. Same pattern as `reference_h8_misattribution_2026_05_20` (echo's H8 work absorbed into hotel's U-COST-DASHBOARD). **The work IS shipped** — only the commit attribution drifted. Per `feedback_commit_prefix_main_on_shared_tree` and `feedback_conflict_fork_rule`, the surgical fix is to write this closeout memo + carry forward; no commit reverse-attribution needed.

## Iter trail

- iter1 (this session): verified the 5/22 `conditions_all` P2 follow-up is ALREADY shipped in `ba21bc16c3` (U-PB-CONFLICT-DETECT-CONDITIONS-ALL) — `conditionDiscretes` folds BOTH `conditions` AND `conditions_all`. Memory note `reference_playbook_conflict_detect_2026_05_22` had stale "Open P2" line — flagged for cleanup.
- iter2: WIRE-TO-ALL-SOURCES audit. Conclusion: satisfied via engine-indirection (postPipeline stage + AdaptiveFeedControl + AI registries). Adding duplicate dispatcher actions would violate the cross-dispatcher rule.
- iter3 (this entry): shipped the corpus-drift Stop advisory hook (above).

Wiki: [[playbook-capability-extensions]] (parent unit covering U-PB-EXPAND / INTEGRITY-AUDIT / CONFLICT-DETECT trio). Lineage: [[reference_playbook_conflict_detect_2026_05_22]] · [[reference_playbook_suggest_resolution_2026_05_22]] · [[reference_playbook_related_graph_2026_05_23]] · [[reference_playbook_validate_corpus_2026_05_23]] · [[reference_h8_misattribution_2026_05_20]] (misattribution pattern).
