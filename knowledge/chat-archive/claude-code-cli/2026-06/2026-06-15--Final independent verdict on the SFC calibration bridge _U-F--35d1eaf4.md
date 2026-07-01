---
type: "chat-session"
source: "claude-code-cli"
session_id: "35d1eaf4-6a6d-473d-bc4b-97c2e1c28152"
title: "Final independent verdict on the SFC calibration bridge (U-FT-11). Worktree: H:/"
date: "2026-06-15"
first_ts: "2026-06-15T17:48:22.418Z"
last_ts: "2026-06-15T17:53:05.259Z"
cwd: "H:\\prism-slot-oscar\\mcp-server"
messages: 54
user_msgs: 20
assistant_msgs: 34
raw_file: "H:/.claude/projects/H--prism-slot-oscar/35d1eaf4-6a6d-473d-bc4b-97c2e1c28152/subagents/agent-a04cc5d05430bd20d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:03"
---

# Final independent verdict on the SFC calibration bridge (U-FT-11). Worktree: H:/

> **claude-code-cli** | 2026-06-15 | 54 msgs (20 user / 34 assistant) | cwd: H:\prism-slot-oscar\mcp-server
> Raw: `H:/.claude/projects/H--prism-slot-oscar/35d1eaf4-6a6d-473d-bc4b-97c2e1c28152/subagents/agent-a04cc5d05430bd20d.jsonl`

## Transcript

### User | 2026-06-15T17:48:22.418Z

Final independent verdict on the SFC calibration bridge (U-FT-11). Worktree: H:/prism-slot-oscar. Read end-to-end; cite file:line. Do NOT call mcp__prism__*.

FILES: mcp-server/scripts/sfc-calib-sync.mjs + mcp-server/scripts/sfc-calib-sync.test.mjs (both NEW). A prior code-analyzer review PASSED with three P2 nuances (first-order inversion approximation [documented]; single-sweep seeds-but-does-not-move the factor due to the engine's >=5 warmup [now documented in the header EFFECT NOTE]; shared-tmp lost-update in a concurrent singleton write [now documented in the header CONCURRENCY note, pre-existing in safeWriteSync]). The E2E test was strengthened to assert the inverted vendor value (160 = 200/1.25) landed in persisted feedbackHistory under the coherent key "P|_|roughing", not just that the key exists.

Confirm or refute, then give a verdict:
1. Is the bridge correct + safe to ship as the keystone that closes the SFC self-learning loop? Any P0/P1 you'd block on?
2. Segment-key coherence: bridge writes composeSegmentKey({material: ISO_REP_MATERIAL[iso], regime: cut_type}) = iso|_|cut_type; the apply-read site (UltimateSpeedFeedEngine.ts:2842) reads composeSegmentKey({material: input.material, regime: cutType}). Byte-identical for the same iso+cut_type? (THE load-bearing claim.)
3. Vendor inversion sign: actual = prism/(1+bias/100) with bias=(prism-vendor)/vendor*100. Does this push calibration the correct direction (PRISM over-speed -> factor < 1 -> Vc down toward vendor)?
4. Fail modes (missing file, zero corroborated, non-positive p50, null bias, unknown iso, schema<1.1.0 / no cut_type) all handled without throw or silent mis-feed?
5. Test integrity: do the now-7 assertions in the E2E + the unit tests genuinely fail on a regression (sign-flip, wrong segment, lost idempotency)?
6. ASCII-only, no inlined physics constants, conventions match sfc-aggregate.mjs.

Return P0/P1/P2 (file:line) + "VERDICT: PASS" or "VERDICT: FAIL".

### Assistant | 2026-06-15T17:48:24.956Z

I'll review the SFC calibration bridge end-to-end. Let me start by reading both new files and the load-bearing apply-read site.

### Assistant | 2026-06-15T17:48:25.383Z

[tool_use: Read]

### Assistant | 2026-06-15T17:48:25.726Z

[tool_use: Read]

### User | 2026-06-15T17:48:27.233Z

[tool_result] 1	/**
2	 * SFC closed-loop calibration BRIDGE (U-FT-11, SFC-FULLTUNE) -- the keystone that closes the loop.
3	 * ===================================================================================================
4	 *
5	 * Reads the full-sweep baseline moat (<out>/baseline-params.json, U-FT-06 + U-FT-11-PRE) and feeds
6	 * every VENDOR_CORROBORATED regime's (PRISM-vs-vendor) signal into the SFC de
... [+12163 chars truncated]

### User | 2026-06-15T17:48:27.285Z

[tool_result] 1	/**
2	 * Tests for sfc-calib-sync.mjs (U-FT-11) -- run via: tsx --test scripts/sfc-calib-sync.test.mjs
3	 * (node:test; needs tsx because the bridge imports the TS SpeedFeedDeepLearningEngine.)
4	 *
5	 * Covers: the ISO->material round-trip self-check (resolveISOGroup default-to-P trap), the pure
6	 * regime->recordFeedback mapping (vendor inversion + segment-key coherence + skip paths), and an

... [+7039 chars truncated]

### Assistant | 2026-06-15T17:48:29.939Z

Now let me verify the load-bearing claims against the actual engine source. I need to read `composeSegmentKey`, `resolveISOGroup`, `recordFeedback`, the apply-read site at line 2842, and how `segmentFactors`/`feedbackHistory`/`applyWindow` work.

### Assistant | 2026-06-15T17:48:30.825Z

[tool_use: Read]

### User | 2026-06-15T17:48:32.400Z

[tool_result] 1	/**
2	 * SpeedFeedDeepLearningEngine — SF-AI-L1
3	 *
4	 * First-layer AI hardening for Calculator Studio (Speed/Feed).
5	 * Neural networks, Monte Carlo, Bayesian optimization, chain-of-thought,
6	 * and self-learning feedback for cutting parameter optimization.
7	 *
8	 * AI Capabilities:
9	 * ----------------
10	 * 1. NEURAL NETWORK MODELS
11	 *    - Speed prediction from material/tool/operatio
... [+63053 chars truncated]

### Assistant | 2026-06-15T17:48:36.540Z

Now I have the full engine. Let me verify the load-bearing claims. The bridge's claim #2 hinges on the apply-read site. Let me confirm line 2842 reference and check the `composeSegmentKey` read at predictSpeed (line 803) and predictFeed (line 889). The task says apply-read site is at `UltimateSpeedFeedEngine.ts:2842` — let me verify that.

### Assistant | 2026-06-15T17:48:37.481Z

[tool_use: Read]

### Assistant | 2026-06-15T17:48:38.734Z

[tool_use: Grep]

### User | 2026-06-15T17:48:38.847Z

[tool_result] 2800	    const sensRanking = sensitivityRanking(taylor.sensitivity, matConf);
2801	
2802	    // ──────────────────────────────────────────────────
2803	    // STEP 18E: Pareto multi-objective frontier
2804	    // ──────────────────────────────────────────────────
2805	    const consAltMRR = alts.conservative.ap * (alts.conservative.ae_pct / 100 * Dc)
2806	      * alts.conservative.fz * z * ((alts.
... [+6165 chars truncated]

### User | 2026-06-15T17:48:39.597Z

[tool_result] 63:// sandbox nobody read). The flag-gated apply below reads those factors; composeSegmentKey makes the
65:import { speedFeedDeepLearningEngine, composeSegmentKey } from "./SpeedFeedDeepLearningEngine.js";
204:  const f = speedFeedDeepLearningEngine.getCalibrationFactors(segmentKey);
485:    segment_key: string;
2852:      const segKey = composeSegmentKey({ material: input.material, regime: cutTyp
... [+41 chars truncated]

### Assistant | 2026-06-15T17:48:48.022Z

The apply-read site is confirmed at `UltimateSpeedFeedEngine.ts:2852` (the task said 2842, which is within the same STEP 18F block; close enough — the actual `composeSegmentKey` call is line 2852). Both call `composeSegmentKey({ material: input.material, regime: cutType })`.

Now the critical coherence question. The bridge writes `segment = ${iso}|_|${cut_type}` as a literal string (line 118), but the engine's `recordFeedback` does NOT use that literal — it recomputes `segment_key` internally via `composeSegmentKey(context ? { material: context.material, regime: context.regime } : undefined)` (line 1432). So the bridge's `segment` field is for logging only; the ACTUAL persisted key comes from `context = { material: mat, regime: cut_type }`. Let me verify the read-side key construction precisely.

Read site (line 2852): `composeSegmentKey({ material: input.material, regime: cutType })` → `iso = resolveISOGroup(input.material)`, `tool = canonToolType(undefined) = "_"`, `regime = canonRegime(cutType)`. Result: `${iso}|_|${cutType}` when cutType is a valid CutType.

Write site via engine (line 1432): `composeSegmentKey({ material: mat, regime: cut_type })` → `iso = resolveISOGroup(mat)`, `tool = "_"`, `regime = canonRegime(cut_type)`. Result: `${resolveISOGroup(mat)}|_|${cut_type}`.

Let me verify the active calib provider and the flag/clamp helpers used by the read site, plus `activeCalibProvider`.

### Assistant | 2026-06-15T17:48:50.012Z

[tool_use: Read]

### Assistant | 2026-06-15T17:48:51.174Z

[tool_use: Grep]

### User | 2026-06-15T17:48:51.358Z

[tool_result] 180	  // FAST bulk-sweep mode (U-FT-01, SFC-FULLTUNE). Offline combinatorial-sweep flag.
181	  // When true, calculate() skips the per-call outcome-capture telemetry emission
182	  // (captureSFC) -- a pure side-effect whose return value the engine discards -- so a
183	  // 20.3M-cell sweep is not throttled by the ledger append (and does not pollute the
184	  // shop-floor learning ledger with syn
... [+3229 chars truncated]

### User | 2026-06-15T17:48:52.516Z

[tool_result] 197:const CALIB_FACTOR_MIN = 0.4;
198:const CALIB_FACTOR_MAX = 2.5;
207:let activeCalibProvider: SfcCalibProvider = defaultCalibProvider;
215:  activeCalibProvider = provider ?? defaultCalibProvider;
223:export function sfcCalibApplyEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
2838:    //  3. CLAMP each factor to [CALIB_FACTOR_MIN, CALIB_FACTOR_MAX] = [0.4, 2.5] so a runaway learned
28
... [+308 chars truncated]

### Assistant | 2026-06-15T17:49:01.618Z

The read site is fully verified. `activeCalibProvider` → `getCalibrationFactors(segKey)` reads `this.segmentFactors.get(segmentKey)` — the same Map keyed by `composeSegmentKey`. The full closed loop is coherent.

Now let me verify the sign-direction claim with concrete arithmetic, and check the `applyWindow` direction. The bridge feeds `predicted=200, actual=160` for P roughing. In `recordFeedback` (engine line 1410): `errorPct.speed = ((200 - 160)/200)*100 = +20`. In `applyWindow` (line 688): `next = factors[key] * (1 - avgError/200) = 1.0 * (1 - 20/200) = 1.0 * 0.9 = 0.9`. So factor < 1 → at the read site `Vc *= 0.9` → Vc reduced toward vendor. Sign is correct.

Let me check `error_pct` key naming coherence — `applyWindow` iterates `Object.keys(factors)` which are `speed/feed/tool_life/surface_finish`, and reads `e.error_pct[key]`. `recordFeedback` writes `errorPct.speed` and `errorPct.feed`. Keys match. 

Now let me verify the convention reference (`sfc-aggregate.mjs`) and confirm there are no inlined physics constants, and check ASCII. Let me also confirm the baseline `RegimeBaseline` shape (cut_type, bias_vc_pct, vc_mpm.p50, confidence, status) matches what `sfc-aggregate.mjs` emits.

### Assistant | 2026-06-15T17:49:02.049Z

[tool_use: Read]

### User | 2026-06-15T17:49:03.201Z

[tool_result] 1	/**
2	 * SFC full-space batch sweep REDUCER (U-FT-06, SFC-FULLTUNE).
3	 * ===========================================================
4	 *
5	 * Streams the per-unit DrivenCell JSONL shards the coordinator (U-FT-05) produced through
6	 * the CANONICAL compare + baseline engines and writes the two roll-up artifacts the
7	 * Ollama triage layer (U-FT-09) + the calibration bridge (U-FT-11) consume:

... [+3166 chars truncated]

### Assistant | 2026-06-15T17:49:03.807Z

[tool_use: Grep]

### User | 2026-06-15T17:49:05.203Z

[tool_result] 9: *   <out>/baseline-params.json   -- the per-(iso,operation,cut_type) baseline moat (vc/fz envelope,
10: *                                   vendor bias/containment, confidence, provenance)
17: * (iso_group, operation) regime (a one-line peek per shard), then each regime is reduced
26: * and a regime with no vendor citations is prism_only (never vendor_corroborated). The
99:  // ---- Pass 1: gro
... [+784 chars truncated]

### Assistant | 2026-06-15T17:49:09.568Z

The aggregate writes `baseline.regimes` with `schemaVersion: "1.1.0"` and per-regime fields including `cut_type`, `iso_group` (via the baseline params engine). Let me verify the actual `RegimeBaseline` shape emitted by `deriveBaseline` to confirm the field names the bridge reads (`iso_group`, `cut_type`, `vc_mpm.p50`, `fz_mm.p50`, `bias_vc_pct`, `bias_fz_pct`, `confidence`, `status`, `regime`) are correct — this is the contract the bridge depends on.

### Assistant | 2026-06-15T17:49:11.518Z

[tool_use: Grep]

### User | 2026-06-15T17:49:12.811Z

[tool_result] 3: * (U-CSFH-07) into per-regime baseline parameters: a vc/fz envelope (from PRISM's
10: * Regime = (iso_group, operation, cut_type) -- resolves the CutType the DL calibration loop keys on
11: * (segment key iso|_|cut_type). (Finer keys -- tool_material, diameter buckets -- are a future [SCOPED] extension.)
20: *   - a regime with < minRegimeN gate-pass driven cells is insufficient_data (no params
... [+4932 chars truncated]

### Assistant | 2026-06-15T17:49:21.096Z

The contract is fully confirmed. The `RegimeBaseline` shape (`sfc-combinatorial-baseline-params.ts:64-82`) matches exactly what the bridge reads:
- `regime: string` ("iso:op:cut_type") → used for `jobId` (bridge line 114)
- `iso_group: ISOGroup` → bridge line 96
- `cut_type: CutType` → bridge line 95, 117, 118
- `vc_mpm: BaselineEnvelope | null` with `p50` (line 51) → bridge line 98
- `fz_mm`, `bias_vc_pct: number | null`, `bias_fz_pct: number | null` → bridge lines 99, 103, 107
- `status` / `confidence` enums → bridge line 94

Crucially, the docstring at lines 10-11, 68, 179-180 of the baseline engine *independently confirms* the load-bearing claim: "segment key iso|_|cut_type ... sfc-calib-sync feeds per-cut_type regimes (U-FT-11-PRE)." The two sides agree on the contract by design.

Now let me verify two remaining things: (1) the `null`-strip serialization note (line 56-59) — the bridge reads from a local file, not through the dispatcher, so nulls are preserved as `null`; the bridge's `!= null` and optional-chaining guards handle both `null` and absent. (2) ASCII-only check across both new files.

### Assistant | 2026-06-15T17:49:22.925Z

[tool_use: Bash]

### Assistant | 2026-06-15T17:49:24.728Z

[tool_use: Bash]

### User | 2026-06-15T17:49:28.206Z

[tool_result] === scripts/sfc-calib-sync.mjs ===
grep: -P supports only unibyte and UTF-8 locales
ASCII-clean
=== scripts/sfc-calib-sync.test.mjs ===
grep: -P supports only unibyte and UTF-8 locales
ASCII-clean

### User | 2026-06-15T17:49:36.514Z

[tool_result] no inlined physics constants

### Assistant | 2026-06-15T17:49:39.140Z

The `-P` flag failed under the C locale, so let me re-run the non-ASCII check with a method that works to make the ASCII claim auditable rather than a false pass.

### Assistant | 2026-06-15T17:49:41.191Z

[tool_use: Bash]

### User | 2026-06-15T17:49:46.517Z

[tool_result] === scripts/sfc-calib-sync.mjs ===
ASCII-clean (printable + tab only)
=== scripts/sfc-calib-sync.test.mjs ===
ASCII-clean (printable + tab only)

### Assistant | 2026-06-15T17:49:50.740Z

ASCII-only confirmed (printable + tab; no smart-quotes, em-dashes, or control chars). Both files use ASCII `--` and `->` throughout, matching `sfc-aggregate.mjs` convention.

Now let me run the actual test suite to confirm the 7 E2E assertions + unit tests genuinely pass (and verify the idempotency/persistence claims behave as asserted), rather than just reading them.

### Assistant | 2026-06-15T17:49:51.923Z

[tool_use: Bash]

### User | 2026-06-15T17:49:58.157Z

[tool_result] # [calib-sync] no baseline-params.json at C:\\Users\\wompu\\AppData\\Local\\Temp\\calibsync-empty-En0vb1\\baseline-params.json -- run the sweep + sfc-aggregate (U-FT-06) first.
# Subtest: verifyIsoMap: every ISO rep material round-trips to its own ISO letter (no default-to-P trap)
ok 1 - verifyIsoMap: every ISO rep material round-trips to its own ISO letter (no default-to-P trap)
  ---
  duration_
... [+1200 chars truncated]

### Assistant | 2026-06-15T17:50:01.893Z

All 6 test cases pass (6 tests / 24 assertions; the "now-7" in the E2E refers to the 7 persistence assertions inside test 5). Now let me prove test integrity — that the E2E genuinely fails on a sign-flip regression, not just key existence. I'll mutate the inversion sign in a scratch copy and confirm the value-assertion (line 103) catches it.

### Assistant | 2026-06-15T17:50:06.755Z

[tool_use: Bash]

### User | 2026-06-15T17:50:18.512Z

[tool_result] 104:    const v = prismVc * (1 + regime.bias_vc_pct / 100);
108:    const v = prismFz * (1 + regime.bias_fz_pct / 100);
SIGN FLIPPED OK

### Assistant | 2026-06-15T17:50:28.869Z

Now let me write a tiny test harness that imports the flipped bridge and runs the same E2E value-assertion (predicted=200, expect actual≈160). A sign-flip produces 200*1.25=250, which should fail the `Math.abs(actual.speed_mpm - 160) < 1e-6` assertion.

### Assistant | 2026-06-15T17:50:38.828Z

[tool_use: Bash]

### User | 2026-06-15T17:50:53.184Z

[tool_result] 56:import { SpeedFeedDeepLearningEngine, composeSegmentKey } from "H:/prism-slot-oscar/mcp-server/src/engines/SpeedFeedDeepLearningEngine.js";
--- running sign-flip regression (expect FAIL) ---
#     at Hooks.resolve (node:internal/modules/esm/hooks:240:30) {
#   code: 'ERR_MODULE_NOT_FOUND',
#   url: 'file:///C:/tmp/sfc-calib-sync-flipped.mjs'
# }
# Node.js v22.12.0
# Subtest: C:\\Users\\wompu\\A
... [+466 chars truncated]

### Assistant | 2026-06-15T17:50:58.371Z

The flipped file at `/tmp` couldn't resolve `node:` peer relative paths because Windows mapped `/tmp` to `C:/tmp`. The cross-import path resolution broke, not the assertion. Let me place the flipped variant inside the real scripts dir (so its relative engine import resolves) and run the regression test from there.

### Assistant | 2026-06-15T17:51:09.429Z

[tool_use: Bash]

### User | 2026-06-15T17:51:33.286Z

[tool_result] SIGN FLIPPED OK
--- running sign-flip regression (expect FAIL with vc=250) ---
not ok 1 - sign-flip MUST break the E2E value assertion
  error: 'persisted vendor vc=250 (expect 160; sign-flip gives 250)'
  name: 'AssertionError'
# pass 0
# fail 1
--- cleanup scratch files ---
ls: cannot access 'scripts/_sfc-calib-sync-flipped.scratch.mjs': No such file or directory
ls: cannot access 'scripts/_sign
... [+61 chars truncated]

### Assistant | 2026-06-15T17:51:39.036Z

Test integrity is empirically proven: a sign-flip writes `vc=250` (200*1.25) instead of `160` (200/1.25), and the E2E value-assertion (line 103, `Math.abs(actual.speed_mpm - 160) < 1e-6`) genuinely fails on it. Key-existence alone would NOT catch this (the segment still gets created); the strengthened value assertion is what closes the gap the prior review noted. Scratch files cleaned up.

Let me verify no scratch files leaked into git status and confirm the only modified/new files are the two under review.

### Assistant | 2026-06-15T17:51:41.594Z

[tool_use: Bash]

### User | 2026-06-15T17:51:53.360Z

[tool_result]  M scripts/__tests__/train-cnc-controller-from-corpus.test.mjs
 M scripts/aps-smoke-3lo.ts
 M scripts/build-cad-coverage-matrix.ts
 M scripts/build-skill-quality-registry.mjs
 M scripts/cad-regen-test.ts
 M scripts/classify-missing-modules.mjs
 M scripts/diff-box-vs-h.mjs
 M scripts/dump-all-tips.ts
 M scripts/emit-ai-actions-index.ts
 M scripts/emit-cad-training-extractions.mjs
--- untracked scra
... [+37 chars truncated]

### Assistant | 2026-06-15T17:51:58.284Z

No scratch files leaked. The `M` entries are pre-existing unrelated CRLF/mirror churn (not part of this unit). The two files under review (`sfc-calib-sync.mjs` + `.test.mjs`) are new/untracked. Let me do a final targeted check on the remaining fail-mode claims I haven't directly exercised: the `loadLedger` corrupt-file fallback and the `non-positive p50` / `null bias` guards in concert, plus confirm `buildFeedbackArgs` handles `vc_mpm` absent (null envelope on a baseline regime where fz was underivable).

### Assistant | 2026-06-15T17:52:08.576Z

[tool_use: Bash]

### User | 2026-06-15T17:52:33.417Z

[tool_result] # Subtest: null/missing-input fail modes do not throw and skip cleanly
ok 1 - null/missing-input fail modes do not throw and skip cleanly
# pass 1
# fail 0
cleaned: ls: cannot access 'scripts/_edge.scratch.test.mjs': No such file or directory

### Assistant | 2026-06-15T17:53:05.259Z

All fail modes verified empirically — including the subtle `bias=-100` degenerate denominator (which would make `actual = prism/0 = Infinity`), correctly rejected by the `(v > 0 && Number.isFinite(v))` guard at lines 105/109 so that field is omitted rather than mis-fed. NaN/Infinity bias also rejected. No throws.

I now have everything verified end-to-end. Here is my independent verdict.

---

## Independent Review — SFC Calibration Bridge (U-FT-11)

**Files:** `H:/prism-slot-oscar/mcp-server/scripts/sfc-calib-sync.mjs` + `H:/prism-slot-oscar/mcp-server/scripts/sfc-calib-sync.test.mjs` (both new). Read end-to-end against `SpeedFeedDeepLearningEngine.ts`, `UltimateSpeedFeedEngine.ts`, `sfc-combinatorial-baseline-params.ts`, and `sfc-aggregate.mjs`.

### 1. Correct + safe to ship as the keystone? — YES
The bridge is the missing arc: it reads the corroborated sweep baselines and feeds PRISM-vs-vendor signal into the same `segmentFactors` Map the live apply site reads. No P0/P1. It is fail-soft (no throw on missing/corrupt input), idempotent (ledger-gated), and advisory in effect (the apply site is `PRISM_SFC_CALIB_APPLY` default-OFF and clamped to [0.4, 2.5] at `UltimateSpeedFeedEngine.ts:2856-2857`).

### 2. Segment-key coherence — CONFIRMED byte-identical
The bridge's `segment` literal (`sfc-calib-sync.mjs:118`) is log-only; the *real* persisted key is recomputed inside the engine. Both sides compose it the same way:
- **Write:** `recordFeedback` → `composeSegmentKey({ material: context.material, regime: context.regime })` (`SpeedFeedDeepLearningEngine.ts:1432`), fed `context = { material: ISO_REP_MATERIAL[iso], regime: cut_type }` (`sfc-calib-sync.mjs:117`).
- **Read:** `composeSegmentKey({ material: input.material, regime: cutType })` (`UltimateSpeedFeedEngine.ts:2852`).

Both resolve to `${resolveISOGroup(material)}|_|${cutType}` (tool = `"_"` since `toolMaterial` is absent on both sides; `composeSegmentKey` lines 444-449). `verifyIsoMap()` (`sfc-calib-sync.mjs:77
... [+3339 chars truncated]
