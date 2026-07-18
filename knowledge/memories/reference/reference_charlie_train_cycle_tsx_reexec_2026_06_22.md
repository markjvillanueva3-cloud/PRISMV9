---
name: reference_charlie_train_cycle_tsx_reexec_2026_06_22
description: Quoting train-cycle died under bare `node` (ERR_MODULE_NOT_FOUND on a .ts->.js dynamic import under Node 24 TS type-strip); fixed with a tsx self-reexec guard (U-QP-TSX-REEXEC, slot charlie 2026-06-22).
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.514Z
aliases: reference_charlie_train_cycle_tsx_reexec_2026_06_22
---


# Quoting train-cycle tsx self-reexec fix (U-QP-TSX-REEXEC, 2026-06-22, slot:charlie)

**Commit:** `[MAIN-FORCE] [QUOTING-SYNERGY-MS0]/U-QP-TSX-REEXEC` on `cad-fusion-live-ms0`. 2 files, 279 insertions.

## The bug (P0, keystone training path)
`scripts/quoting-train-cycle.mjs` (the cron-side invoker for the quoting closed-loop OODA training) lazy-loads `QuotingTrainingOrchestratorEngine` **SRC-FIRST** (the `.ts`, deliberately -- per-file `dist/engines/*.js` are stale esbuild fossils, U-QP-EXTPRICE-CALIB 2026-06-01). Under **Node v24** native TS type-strip, plain `node` DOES load the `.ts` orchestrator, but the orchestrator's own runtime `await import("./QuotingTrainingLoopEngine.js")` throws **ERR_MODULE_NOT_FOUND** -- bare node strips types for the entry `.ts` but does NOT rewrite a `.js` specifier in a DYNAMIC import to find its `.ts` sibling (only the `.ts` exists in `src/`). So the ENTIRE train-cycle died opaquely on every bare-`node` launch: the cron's tsx-missing fallback (`install-quoting-pipeline-cron.ps1:144` `& $NodeExe $Stage2`), ad-hoc runs, AND `quoting-pipeline-verify`. The engine-load comment already SAID "invoke via tsx" but the script never ENFORCED it -- it walked straight into the guaranteed-fail `.ts` import.

Live repro: `node scripts/quoting-train-cycle.mjs --json --no-write` -> `{"ok":false,"reason":"unhandled error","error":"ERR_MODULE_NOT_FOUND ... QuotingTrainingLoopEngine.js"}`. Under tsx -> `{"ok":true}`.

## The fix
Self-reexec under tsx once, mirroring the proven `shouldReexecForHeap` pattern in `scripts/nn-graph-retrain-lifecycle.mjs`. Pure exported helpers (testable): `isUnderTsx(execArgv)` (detects `tsx[\\/](dist[\\/])?(loader|preflight|cli)` in `process.execArgv`), `resolveTsxCli(cwd)`, `planTsxReexec({execArgv,env,cwd})` -> `{reexec,reason,tsxCli}`. Guard is the FIRST statement in `main()` (before any `.ts` import / file write): if `reexec`, `spawnSync(process.execPath, [tsxCli, argv[1], ...argv.slice(2)], {stdio:'inherit', env:{...env, PRISM_QTC_REEXEC:'1'}})` then exit with child status (fail-loud on child.error/child.signal/null-status). Infinite-loop breaker: `PRISM_QTC_REEXEC=1` (exact match) set on the child + `isUnderTsx` short-circuit. tsx-absent -> NO reexec, falls through to the pre-existing dist-fallback + honest error (never worse than before). Opt-out: `PRISM_QTC_NO_REEXEC=1`.

## Validation
- Bare `node ... --json --no-write` -> now `ok:true`, `baseline_source` present, `mape_pct` computed (was ERR_MODULE_NOT_FOUND).
- `quoting-train-cycle.guard-preflight.test.mjs` T14 (the originally-failing test) -> 14/14, exit 0.
- New `quoting-train-cycle.tsx-reexec.test.mjs` -> 20/20 (happy + 4 detection + adversarial non-array/non-string + anchor-guard false-match + 6 decision-matrix + exact-breaker-match + both-breaker precedence + resolveTsxCli no-throw + 2 E2E spawn round-trips: bare-node->reexec->ok:true, breaker->honest ok:false).
- Per-file scrutiny: arm A (code-analyzer) PASS; arm B (test-review) initially FAIL on P0 conditional-skip + missing substring false-match guard -> both fixed -> the strengthened test addresses them.

## Lessons (generalizable)
1. **A script that SRC-loads a `.ts` and relies on the caller picking tsx must ENFORCE its own runtime, not document it.** Node 24 type-strip loads an entry `.ts` but does NOT resolve a `.js`->`.ts` rewrite for DYNAMIC imports -- a silent total-failure for any chained `await import("./X.js")`.
2. **Reliable tsx detection = `process.execArgv` carries `tsx/dist/{preflight.cjs,loader.mjs,cli.mjs}`** (same style as `hasHeapFlag(execArgv)`); bare node carries no loader flag. Anchor the regex to the loader/preflight/cli tail so a `tsx-validator`/`my-tsx-helper` dependency name does NOT false-suppress the reexec.
3. **"436/436 PASS" in the frontend-readiness doc was a DIST/tsx run** -- the bare-node verify path was silently broken. Always confirm the LIVE runner before trusting a cited test count (charlie soul rail).

Related: [[reference_post_ship_quoting-synergy-ms0-u-qp-scheduled-retrain]] (the original cron invoker) -- [[reference_charlie_frontend_readiness_2026_06_22]] (the determination this regression undercut) -- the `shouldReexecForHeap` self-reexec sibling in nn-graph-retrain-lifecycle.mjs.
