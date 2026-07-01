---
name: reference_5h_keystone_2026_06_11
description: 5h-quota keystone (sum -> populate -> denominator-free switch gate) shipped + E2E-validated; 2 Number(null)===0 bugs found
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.458Z
aliases: reference_5h_keystone_2026_06_11
---


**ZULU-ACCOUNT-CYCLE keystone (the ledger's "everything downstream waits on this") -- shipped 2026-06-11, slot:bravo, in logical order.** Closes the C5 chokepoint: Claude Code never emits `rate_limits.five_hour` on this host, so `quota.fiveHour.pct` was null and the whole auto-account-switch chain was dark.

**Chain (each on a proven foundation):**
1. **`scripts/lib/five-hour-token-sum.mjs`** (slot/bravo) -- real rolling-5h used-token SUM across ALL transcripts, **enumerated by RECORD timestamp NOT file mtime** (Windows doesn't flush mtime on open-append transcripts; `find -mmin -300` returns 0 while an 18MB transcript is live -> mtime-filter would miss active sessions). Pure core + injected fs/clock, 23/23 tests. Exposes `usedTokens` + `weightedTokens` (published cache mults 1.25x write / 0.1x read; raw total is cacheRead-dominated + a poor budget signal -- live ~500M raw vs ~82-95M weighted). LIVE: 15 sessions / 21 transcripts.
2. **`scripts/populate-five-hour-sidecar.mjs`** (slot/bravo) -- merges the sum into `token-budget-<slot>.json` `quota.fiveHour`; `pct = weightedTokens/PRISM_5H_WEIGHTED_BUDGET` (preferred) or `usedTokens/PRISM_5H_TOKEN_BUDGET`, ELSE `null` (NO fabricated denominator; coordinator fails-loud on null which is correct until budget set). Atomic, merge-preserving, 16/16 tests.
3. **`scripts/lib/five-hour-switch-gate.mjs`** (slot/bravo) -- `decideSwitch`: pct gate when budget set, ELSE **absolute weighted-token trigger** (`PRISM_5H_WEIGHTED_TOKEN_TRIGGER`, **denominator-free** -- the keystone works WITHOUT the dynamic Max-plan denominator that is not locally derivable), ELSE undecidable -> fail-loud (same `FIVE_HOUR_SOURCE_UNAVAILABLE` code). 11/11 tests.
4. **Coordinator wire** (`scripts/account-switch-restart-coordinator.mjs`, main `a5b65b8711`) -- `runCoordinator` uses `decideSwitch`; `readFiveHourPct` surfaces max `weightedTokens`. 55/55 tests (51 original zero-regression + 4 new absolute-path). **LIVE E2E (real transcripts):** Path A pct=null + weighted=95.98M + trigger -> switch via absolute gate; Path B weighted-budget -> pct=1.25 -> switch via pct gate.

**TWO bugs found (both the `Number(null) === 0` trap -- a recurring JS footgun):**
- `decideSwitch` initially used `Number.isFinite(Number(pct))` -- `Number(null)===0` is finite, so a null pct wrongly took the pct path as 0% instead of falling to the absolute path. Fixed with `pct != null &&` guards (caught by unit tests, R9).
- `readFiveHourPct` (pre-existing, latent) read an explicit `quota.fiveHour.pct=null` as 0% (same trap) -- dormant because the field never existed before; the new populator writing explicit `null` exposed it. Fixed: `if (raw == null) continue` (caught by the LIVE E2E, R15 -- pure unit tests missed it because they inject the reader). **Lesson: `Number(null)` is `0`, not `NaN` -- always guard `x != null` before `Number.isFinite(Number(x))` when null means "unknown".**

**#4 (SHIPPED 2026-06-11, main `ac8cc4e7c8`):** on-demand fallback -- the C5 closer. **Design pivoted Option A -> Option C (R7).** The handoff committed to integrating the sum INTO `token-awareness-sidecar.mjs` (the live hook), but that hook fires every UserPromptSubmit + PostToolUse x25 chats -- coupling an O(all-transcripts) scan to the fleet's hottest hook = latency + blast-radius risk. The coordinator is the SOLE consumer + NOT latency-sensitive, so Option C dissolves the two-writers problem: `fiveHourFallbackFromTranscripts` computes the host-wide weighted sum ON-DEMAND inside `readFiveHourPct` when no sidecar carries a usable value. No hook edit, no new file, no scheduled task, no clobber, always fresh. Gated `(opts._sum | opts.fallbackLive)` + env kill-switch `PRISM_5H_ONDEMAND_FALLBACK` -> zero-regression (legacy calls lack both). Sidecar-first preserved; undecidable error now surfaces the live weighted figure (actionable calibration). 67/67 tests + LIVE E2E (weighted=121.9M on-demand -> fail-loud w/ figure). 2-agent scrutiny PASS (P1+P2 = a 4th `Number(null)===0` instance on the sidecar-weighted read + error-msg, fixed). **#4b** (token-awareness display banner) = only optional remainder. INERT until operator sets `PRISM_5H_WEIGHTED_TOKEN_TRIGGER`/`_BUDGET`.

**LANDMINE cleaned (the superseded-bug, LIVE):** while validating, found 9 sidecars (foxtrot/kilo/november/quebec/uniform/victor/whiskey/xray/yankee) carrying `quota.fiveHour.pct=1` `weighted=undefined` `source=populate-5h-quota:jsonl-rolling-sum` `computedAt=04:24:13` -- ZULU's SUPERSEDED `populate-5h-quota.mjs` (the hardcoded-88M-ceiling -> pct=1.0 false-trigger). Single one-shot run (identical computedAt), 11h-stale (slots inactive). My coordinator reads `pct=1 >= 0.90` -> would mis-SWITCH the whole fleet if armed. Stripped all 9 (atomic, merge-preserving, only `source.includes("populate-5h-quota")`). Confirms the supersession memo's prediction. zulu must NOT re-run that script.

## Supersedes zulu's parallel build (R7/R8 reconciliation)

slot:zulu built a PARALLEL keystone overnight (`scripts/populate-5h-quota.mjs`, UNCOMMITTED) -- see [[reference_5h_quota_keystone_needs_calibration_2026_06_11]]. **Mine supersedes it** (committed, E2E-validated, no ceiling bug). zulu's 2 bugs vs mine:
- **cacheRead over-count:** zulu flagged cacheRead (~2.08B of 2.2B) is NOT metered like real 5h usage. INCORPORATED -- added `meteredTokens = input+output+cacheCreation` (cacheRead EXCLUDED). LIVE figures: raw=645M / billing-weighted=102M / **metered=33M** (cacheRead inflates raw ~20x). meteredTokens exposed in the sidecar for operator calibration.
- **Hardcoded ceiling -> pct=1.0 false-trigger:** zulu's `DEFAULT_FIVE_HOUR_CEILING=88M` clamped pct to 1.0. **Mine has NO hardcoded ceiling** -- budget/trigger default to null -> pct null -> coordinator inert (fails loud, no switch). So mine does NOT have zulu's false-trigger bug.
- **Inert-by-default:** like zulu's, mine is safe because nothing auto-fires (coordinator dry-run + no scheduled task + no operator-set trigger). Honors bravo soul `unsafe-fleet-control-before-governance`.

ACTION: zulu's uncommitted `populate-5h-quota.mjs` should NOT be committed (superseded). Posted to chat bus 2026-06-11.

Ledger: `BRAVO-HERMES-ZULU-OPEN-TASKS-LEDGER.md` row 1. Wiki: `knowledge/wiki/architecture/five-hour-token-keystone.md`. Commits: slot/bravo 5h-token-sum + sidecar-populate + switch-gate + metered; main a5b65b8711 (coordinator wire).
