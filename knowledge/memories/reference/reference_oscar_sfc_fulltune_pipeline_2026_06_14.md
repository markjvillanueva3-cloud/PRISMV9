---
name: reference_oscar_sfc_fulltune_pipeline_2026_06_14
description: SFC-FULLTUNE batch sweep+compare+baseline+triage+autonomous-cron pipeline shipped (10/14 units + U-FT-CRON) on slot/oscar 2026-06-14; the 342ms/cell was 99% bus I/O not physics (O_APPEND fix); full 20.3M-cell sweep runnable ~2.5min/14workers. Remaining 4 units (calib pair U-FT-11/12 HIGH-risk axis-mapping crux, tier-2 U-FT-13, guard test U-FT-14).
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.705Z
aliases: reference_oscar_sfc_fulltune_pipeline_2026_06_14
---


# SFC-FULLTUNE pipeline -- 9/14 units shipped (2026-06-14, slot:oscar)

`/goal` "full closed-loop training/learning/testing of the SFC + comparison to gwizard/
hsmadvisor with max combinations (billions)". Built the compute->compare->baseline->
ollama-routing pipeline of the `SFC-FULLTUNE-BUILDOUT-PLAN-2026-06-12.md` (14 units).

## Shipped (12/14 numbered units + CRON on slot/oscar)
- **U-FT-14** `scripts/lib/no-inline-physics-constants.{mjs,test.mjs}` + `src/__tests__/
  no-inline-physics-constants.test.ts` + `.baseline.json` -- CI guard automating "never inline
  Kienzle/Taylor". PRECISION scanner (kc1_1/kc11/anchor-const + mc-exponent 0.20-0.32 band +
  Taylor C/n; ignores params/types/reads/comments/URLs; `// no-inline-exempt` escape). RATCHETS
  against a committed per-file baseline (864 pre-existing across 114 files: kienzle 479, mc 305,
  taylor 80 -- a FLEET-WIDE debt, not oscar's) -> fails only on NEW inlining. 25/25 node:test,
  0 regressions, 2-reviewer round-2 PASS (round-1 FAIL on recall gaps -> fixed). `b53c0b641c`.
- **U-FT-12** `src/__tests__/UltimateSpeedFeedEngine.calib-coherence.test.ts` -- LOCKS the calib
  write-key==apply-key coherence (NOT the plan's regressive "add toolMaterial" fix). See
  [[reference_oscar_sfc_fulltune_calib_axis_finding_2026_06_14]]. Empirically validated:
  apply==write=='P|_|roughing'. 2-reviewer PASS. `d26fc2411c`.

## Shipped earlier (10/14 + CRON)
- **U-FT-CRON** `scripts/sfc-closed-loop-cron.mjs` -- AUTONOMOUS orchestrator chaining
  sweep->aggregate->[triage]->[calib-sync] as child `npx tsx` procs; fail-soft, timeout-bounded
  (sweep 6h/step 30m), optional stages SKIP-not-error until built (fs.existsSync auto-detect),
  cron-log.jsonl + cron-status.json. Plain-node launchable (self-resolves npx). `install-sfc-
  closed-loop-task.ps1` registers "PRISM SFC Closed Loop" daily 02:17. `73f3e1fd5e`.
- **U-FT-09** `scripts/sfc-divergence-triage.mjs` (+ reducer emits `divergence-rows.jsonl`,
  schema 1.0.0->1.1.0). Clusters disagreements by regime sig (iso|op|cut|tool), each substantial
  cluster through `verifiedOffload` (cost-router sfc_divergence_triage tier picks model, CODE
  verifies JSON {category,recommended_action,hypothesis,confidence} vs fixed enums, ANY miss ->
  deterministic rule-based fallback). Per-cluster source recorded; totals split llm_verified/
  llm_fell_back/gate_skipped + ollama callStats. ADVISORY ONLY. 17/17 node:test, E2E validated,
  2-reviewer PASS. `210ea3febe`. NOTE: bare sweep emits 0 divergence rows (uncited abstain) ->
  triage is a clean no-op until the sweep carries vendor context.

## Earlier commits this session
- **U-FT-01** FAST bulk flag (`PRISM_SFC_FAST_BULK`/`input.fast_bulk`) gates the per-call
  `captureSFC` telemetry emission in `UltimateSpeedFeedEngine.calculate()`. Result byte-identical
  (return discarded). `c12583637c`.
- **U-FT-01B** (the real discovery) -- profiled: **342ms/cell was ~99% FILE I/O, not physics**.
  `OutcomeCaptureBusEngine.atomicAppend` did read-rewrite-rename O(file^2) on the **89MB**
  `speed_feed.jsonl` on EVERY `calculate()` (the `5ae481f748` main-tree fix never reached
  slot/oscar). Fixed -> `fs.appendFileSync` O_APPEND + bounded retry + `PRISM_OUTCOMES_DIR`
  override. **Swept 4.45GB / 229 orphaned `.tmp`.** FAST flag -> **0.087ms/cell** -> full sweep
  ~30min single-thread / **~2.5min on 14 workers** (NOT the plan's 20h -- wrong bottleneck assumed).
  `d86a28dc94`.
- **U-FT-03** `enumerateWorkUnits()` -- the 1,152 regime-aligned units (`partitionSpace(1152)`
  = 1 (validCell x iso) each, 17,640 cells; the enumerator already delivered the addressing).
- **U-FT-04** `scripts/sfc-batch-worker.mjs` -- forked-child worker; enumerate slice ->
  `driveCells({fastBulk:true})` (new reusable driver method) -> atomic `.partial`->rename shard.
- **U-FT-05** `scripts/sfc-batch-coordinator.mjs` -- fork pool + atomic resumable manifest. Had
  a **P0 liveness hang** (FOUND+FIXED+reverified: refill decoupled from `code!=0` gate, finish()
  fail-loud, `MAX_UNIT_ATTEMPTS=3`).
- **U-FT-06** `scripts/sfc-aggregate.mjs` -- regime-grouped streaming reducer reusing
  `compareRecords`+`deriveBaseline` -> `baseline-params.json`+`compare-summary.json`.
- **U-FT-07** PORTED `scripts/lib/ollama-verified-offload.mjs` verbatim from
  `cad-fusion-live-ms0` (DEDUP: alpha shipped it 2026-06-09 w/ 9 consumers; my draft was divergent).
- **U-FT-08** cost-router SFC categories (`sfc_vendor_classify`/`sfc_divergence_triage`/
  `sfc_formula_reason`/`sfc_correction_propose`) + gpt-oss:120b->best / gpt-oss:20b->strong.
- **U-FT-10** read-only `sfc_combinatorial_sweep`+`sfc_baseline_generic_params` on the
  ollama-prism-bridge L2 MCP_ALLOWLIST.

Runnable now: `cd mcp-server && npx tsx scripts/sfc-batch-coordinator.mjs` then
`npx tsx scripts/sfc-aggregate.mjs`.

## HONEST GAP (R12): bare sweep is citation-free
The enumerated cells carry iso+diameter but **no tool identity** -> `resolveCell` finds no
vendor citation -> every cell `uncited` -> **comparable=0** -> baselines are `prism_only`
(real PRISM physics envelopes, NEVER `vendor_corroborated`; the engine abstains, never
fabricates). So the sweep produces the PRISM-physics moat across all 20.3M combos; the
**vendor comparison** (gwizard/hsmadvisor) signal needs the sweep to carry vendor context
(densification) OR uses the existing `SpeedFeedTriComparatorEngine` (live tri-vendor compare).

## Remaining 4 units (for fresh-context execution)
- **U-FT-11 + U-FT-12 (THE HIGH-RISK CALIB PAIR -- do together, fresh ctx).**
  **Axis-mapping crux:** CSFH baseline regime = `(iso_group, OPERATION=milling/turning/...)`;
  the DL segment key (`SpeedFeedDeepLearningEngine.composeSegmentKey:444`) = `iso|tool|cutType`
  where regime is **CutType** (roughing/finishing), NOT operation -- they DON'T map 1:1.
  U-FT-12 bug: apply site `UltimateSpeedFeedEngine.ts:2842` `composeSegmentKey({material,
  regime:cutType})` OMITS toolMaterial -> key `iso|_|cutType`; a feedback written WITH
  toolMaterial never matches at apply. FIX U-FT-12 = include `input.tool_material` at the apply
  site MATCHING what U-FT-11 writes (only useful if U-FT-11 writes tool-specific keys -> PAIR them).
  U-FT-11 reads `baseline-params.json`, filters `confidence=vendor_corroborated`, synthesizes 1
  `FeedbackEntry`/regime (vendor p50=actual, PRISM p50=predicted) via `prism_calc:
  sfc_dl_record_feedback` (`calcDispatcher.ts ~9496`). **NOTE: bare sweep has comparable=0 ->
  NO vendor_corroborated regimes -> calib-sync is a no-op until the sweep carries vendor context.**
  HIGH-risk (writes calibration, shop_floor S(x)>=0.98); clamps `[0.5,2.0]`DL n `[0.4,2.5]`apply;
  byte-identity-when-flag-OFF anti-regression test (proven pattern).
- **U-FT-13** tier-2 `prism_calc:sfc_propose_constant_change` (gated, physics-reviewer 3-of-3,
  never auto-writes `constants.ts`).
- **U-FT-14** inline-physics-constant guard test -- **CAREFUL pattern**: grep `kc1_1`/`kc1.1`
  ASSIGNMENTS outside `constants.ts`, NOT bare `1800` (huge false-positive surface).

## Key runtime + workflow facts
- TS workers spawn via `child_process.fork(path, [], {execArgv: process.execArgv})` (inherits
  tsx loader). **worker_threads + tsx is BROKEN** post-Node-20 (tsx refuses `register()`).
  Coordinator/reducer/worker all run under `npx tsx`.
- Worktree LACKS vitest -> validate via tsx oracles + `node --test` for `.mjs`; the `.test.ts`
  files run in main-tree CI.
- `PRISM_OUTCOMES_DIR` env redirects the outcome bus (test isolation; added U-FT-01B).
- WORKTREE DIRT: hundreds of pre-existing `M .claude/hooks/lib/*` are NOT mine (fleet state) --
  stage explicit paths only, never `git add -A`.
- Every unit got 2-reviewer per-file scrutiny PASS. Loop-state at iter 8/13 running.
