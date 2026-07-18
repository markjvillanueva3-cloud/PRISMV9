---
name: reference_papa_tsc_infra_campaign_2026_06_16
description: BUILD-QUALITY-PAPA infra tsc campaign 2026-06-16 — 329->269 (60 cleared, 3 commits); HookExecutor authored-but-undeclared seam root-cause pattern; adversarial-verify caught 6 bad sonnet fixes
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.724Z
aliases: reference_papa_tsc_infra_campaign_2026_06_16
---


# Papa infra tsc campaign — 2026-06-16 (slot:papa, session claude-a59e4a3e)

Continued the BUILD-QUALITY-PAPA clean-tsc campaign (live state: `state/shared/specs/TSC-DOMAIN-FIX-CAMPAIGN-STATE-2026-06-15.md` §SESSION 2026-06-16). All 9 DOMAIN galaxies were already done; this session worked the **PAPA-INFRA bucket**. Clean build `638 -> 329 -> 269` (this session -60, 3 MAIN-FORCE commits `df56fd140c`, `b7f00bae5f`, `9e9028b031`). MCP bridge was dead all session -> direct `node` fallbacks.

## Two durable learnings

**1. HookExecutor.ts "authored-but-undeclared" seam — fix ROOT-CAUSE, not per-file.** `src/engines/HookExecutor.ts` `HookDefinition`/`HookCategory` lagged what hook authors actually wrote. ONE additive edit there cleared ~9 hook files at once (ManufacturingHooks, Safety/Recovery/ControllerHooks, SchemaHooks, NLHookEngine, resourceIntegrityHook). Added members (all additive, verified NO `Record<HookCategory>`/exhaustive-switch/`satisfies` guard exists so safe): HookCategory `+"quality" +"data-quality"`; HookDefinition `+condition?:(ctx)=>boolean +timeoutMs?:number`. Fanning out per-file sonnet agents on a shared-producer seam would race-edit HookExecutor.ts -> always pull seam files OUT of the harness batch and do the producer edit yourself (Opus). NOTE: `condition`/`timeoutMs` are currently UNCONSUMED by the executor (advisory) -> wiring them in is a separate behavior-changing unit for the hook owner; declaring them is behavior-neutral.

**2. The `tsc-fix-verify-wf.js` sonnet harness makes SERIOUS errors; the adversarial-verify stage + Opus diff-review are LOAD-BEARING.** Across batches 2-3, sonnet fix-agents produced 6 bad fixes the verify-skeptic (or my review) caught + reverted: (a) authHttp.ts agent GUTTED 288 lines of working OAuth -> stub; (b) SyncCodeVerification agent inverted a boolean ternary (silent signal-detection break on the dominant path); (c) aiDispatcher fabricated model IDs (`qwen3-coder:32b` != canonical `qwen2.5-coder:32b`); (d) HookDAGValidator renamed a public method breaking `hookDispatcher.ts:301` while claiming "zero callers"; (e) hooks/index dup-export fix silently DOWNGRADED a blocking safety gate to a warning; (f) noop+CRLF noise. Also caught a subtler one MYSELF: ToolCatalogAdaptive's `unknown`->`typeof` guard admitted `0`/`""` where the original truthy-guard excluded them, shifting a tool-boost score -> tightened to `typeof x==='number' && x`. **Lesson: every harness fix needs (1) the sonnet adversarial-verify AND (2) an Opus diff-review; commit ONLY clean-tsc-confirmed files; revert FAIL + defer.**

## Method that worked (repeat for batch4+)
Per batch: stage <=10 papa-infra units (deterministic node parse of the clean log, NOT ollama — exact + free) -> `Workflow{scriptPath: tsc-fix-verify-wf.js, args:units}` -> read fix/verify verdicts -> revert every FAIL -> clean tsc `--incremental false` + new-error-file diff (R12 gate) -> `git add` ONLY verified files (anti-sweep) -> `[MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-TSC-INFRA-BATCHn`. The PreToolUse "0->574" tsc warning is a STALE-TRACKER ARTIFACT (ignore; authority is the clean count).

## Remaining (269) — batch4 staged; PAPA-FIXABLE-WITH-CARE items need Opus not sonnet
HookDAGValidator (coordinated `validate`->`validateDAG` rename in engine + `hookDispatcher.ts:301`), hooks/index (distinct-name the two `preMachineControllerCompatibility`), authHttp (add OAuthConfig fields or derive from issuer), SyncCodeVerification (null-assert preserving original ternary grouping). Owner-defers route per the deterministic map in the campaign doc. Related: [[reference_papa_tsc_generic_seam_2026_06_15]].
