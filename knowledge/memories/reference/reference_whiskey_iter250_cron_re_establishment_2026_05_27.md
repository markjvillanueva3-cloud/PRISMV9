---
name: reference-whiskey-iter250-cron-re-establishment-2026-05-27
description: Post-compact iter250 successor pointer. Old cron 4d08d27a (session-only, died at /compact) replaced by durable cron 8505e156 (`*/5 * * * *` every 5min, auto-expires 7d). Also captures iter249 ACME cross-customer confirmation of v2.0.0 pattern customer-specificity.
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:47.256Z
aliases: reference_whiskey_iter250_cron_re_establishment_2026_05_27
---


# Whiskey lathe — iter250 cron re-establishment

## What happened

Iter228 declared session-final with cron `4d08d27a` (`/goal /yolo-mode` every 5min) still firing. That cron was session-only (durable:false) — it died with the previous session's /compact transition.

Iter250 (this iter) detected the dead cron at post-compact resume via `CronList` (4 surviving forge-audit-v2 weekly crons, but NO whiskey lathe cron) and re-created it as **durable**:

- **New cron ID**: `8505e156`
- **Pattern**: `*/5 * * * *` (every 5 minutes)
- **Prompt**: `/goal /yolo-mode`
- **Recurring**: true
- **Durable**: true (persists across /compact, survives 7 days)
- **Persisted to**: `.claude/scheduled_tasks.json`

The /yolo-mode cycle now continues into the next session WITHOUT operator intervention.

## Iter249 cross-customer confirmation (completed pre-compact)

Iter245 + iter249 confirmed the iter218 v2.0.0-upgrade-pattern (G40/G80 safety-flag enumeration) is **customer-specific, not universal**:

| Customer | avg_delta_lines | A-with-G40 | B-with-G40 | A-with-G80 | B-with-G80 |
|----------|----------------|------------|------------|------------|------------|
| ALCOA (iter218) | ~5.7× line multiplier | low | high | low | high |
| ITW (iter245) | +17 | 8/20 (40%) | 8/20 (40%, no change) | 16/20 (80%) | 16/20 (80%, no change) |
| ACME (iter249) | +76 | 10/20 (50%) | 11/20 (55%, +1) | 16/20 (80%) | 16/20 (80%, no change) |

**Conclusion**: ALCOA is the OUTLIER. ITW + ACME source programs already include G40/G80 cancels. The iter227 `detectMissingSafetyStateFlags` detector correctly fires on ALCOA-class programs and stays correctly silent on ITW + ACME (zero false positives across 40 ACME+ITW scored pairs).

Memo updated pre-compact: `[[reference_jm_die_v2_upgrade_pattern_2026_05_27]]` (now includes iter245+iter249 cross-customer evidence).

## Updated state metrics (vs iter228)

| Metric | iter228 | iter250 |
|--------|---------|---------|
| P0 engines code-complete | 6/6 | 6/6 (unchanged) |
| Hermetic tests passing | ~140 | ~140 (unchanged) |
| Real-data fixes | 11 | 11 (unchanged) |
| Customers --score scanned | 1 (ALCOA, 11 pairs) | 3 (ALCOA 11 + ITW 20 + ACME 20 = 51 of 14,475 pairs scored) |
| Empirical findings memos | 9 | 9 (v2.0.0 pattern updated with cross-customer evidence) |
| Cron ID | `4d08d27a` (dead) | `8505e156` (durable) |

## Pickup for next session

1. `/checkin-whiskey` → claim slot, auto-resume
2. **Read this file first** (`reference_whiskey_iter250_cron_re_establishment`) for cron ID + current state
3. Read iter228 memo (`reference_whiskey_session_final_iter228_2026_05_27`) for full architectural state
4. Priority order unchanged from iter228:
   - HIGHEST: real shop tool-list ingestion (iter194 template)
   - HIGH: real master-index PDF ingestion (iter195 template)
   - HIGH: MCP dispatcher action wiring (iter196 template)
   - MEDIUM: --score against more customers (AGRATI 4th major + 115 more)
   - MEDIUM: TS engine wiring (iter198 template, Path B dynamic-import)

## R12 honesty

Iter250 did NOT ship new engine code, new tests, or new fixes. It ONLY:
1. Detected dead session-only cron at post-compact resume
2. Replaced with durable cron (`8505e156`)
3. Wrote this successor pointer memo

The substantive work (iter249 ACME scan + memo update) was completed pre-compact and is reflected in `[[reference_jm_die_v2_upgrade_pattern_2026_05_27]]`. Per [[feedback_yolo_mode_nonterminal_goal_pattern]] context-wall doctrine, this Stop block ships cron-continuity then ends cleanly.

## Iter251-267 work trace (post-iter250 substantive arc)

This Stop block extended iter250's continuity infra into a full substantive arc:

| iter | unit |
|------|------|
| 251 | AGRATI 4th-customer --score scan (60 paired, 20 scored) |
| 252 | CAMCAR 5th-customer --score scan (66 paired, 20 scored) |
| 253 | CAMCAR body-diff = pure annotation pass-through finding |
| 254 | cross-customer pattern generalization (4 of 5 non-ALCOA) |
| 255 | AGRATI completes 5-customer matrix |
| 256 | AB-locator over-pairing finding (`U-AB-LOCATOR-PAIR-TYPE-DISCRIMINATION` spec) |
| 257 | **--upgraded-only flag SHIPPED** to scan-jm-die-ab-pairs.mjs |
| 258 | ACME metrics corrected via iter257 flag |
| 259 | AGRATI metrics corrected via iter257 flag |
| 260 | ITW metrics verified via iter257 flag (NOT contamination — degenerate-stub outlier) |
| 261 | **R12 FAIL-LOUD: iter218 ALCOA-outlier finding RETRACTED via byte-level disproof** |
| 262 | iter227 detector rationale string rewritten to remove false iter218 citation |
| 263 | slot-worktree commit (iter257 + iter262 production code) |
| 264 | wiki lesson at `knowledge/wiki/lessons/jm-die-v2-upgrade-pure-annotation-passthrough.md` |
| 265 | **PRODUCTION-CODE FIX: parseBlocks comment-strip (PAREN_COMMENT_RE)** — closes iter218 root cause |
| 266 | slot-worktree commit (iter264 + iter265) |
| 267 | 2 regression tests for iter265 fix (`scripts/lathe-quality-pipeline.test.mjs`, 36→38 tests) |
| 268 | this memo append (the trace itself) |

### The iter218 closure (5-link chain)

Empirical retraction → wiki lesson → root-cause production fix → regression tests:
- `[[reference_iter218_alcoa_outlier_retraction_2026_05_27]]` (iter261 retraction with byte evidence)
- `knowledge/wiki/lessons/jm-die-v2-upgrade-pure-annotation-passthrough.md` (iter264 wiki lesson)
- `scripts/lathe-quality-pipeline.mjs` PAREN_COMMENT_RE (iter265 root-cause fix)
- `scripts/lathe-quality-pipeline.test.mjs` 2 new test cases (iter267 regression tests)
- 3 commits to `slot/whiskey` branch (iter263 + iter266 + final iter267 commit)

### Iter273-285 extension (post-mill-atlas)

After iter272 close, user issued lathe-atlas-for-whiskey directive. iter275 shipped `reference_whiskey_lathe_complete_asset_map_2026_05_27.md` (4-parallel-agent enumeration: 238 engines + 4 dispatchers + 7 P0 slot engines + 50+ posts + 118 JM customers + 7 Okuma LTH-* fleet + 1,327 wiki entries + 13 tribal memory nodes + 6 hook bridges + 5 skills).

Iter277 also pivoted to ship the iter275 classifyPairType pure-helper extraction (factored from inline iter257/iter270 logic into the locator pure helpers + 7 new hermetic tests).

Iter278-285 arc closes a new finding chain:
- iter279: SFS G80 anomaly surfaced (1 less G80 in B than A across 20 scored pairs) — first anomaly contradicting iter261's pure-pass-through generalization
- iter280: byte-level investigation traced root cause to AB-locator priority bug (chose `<part>-B.nc` over canonical `<part>.nc` in PRISM_UPGRADED) — NOT pipeline behavior
- iter281: production fix shipped to `lathe-ab-version-locator.mjs` — `filename_has_b_suffix` field + sortedBVersions in pairAB. 2 regression tests added. Committed.
- iter282: ACME regression-verified iter281 doesn't break customers without `-B` variants
- iter283: ALCOA re-scored under iter281-fixed locator — iter261's R12 retraction numbers UNCHANGED
- iter284: iter261 retraction memo matrix updated with 6-customer post-iter281 verification + per-customer A=B G40/G80 parity columns
- iter285: README banner updated with iter279-284 work + 6-customer validation status

**Final 6-customer matrix (post-iter281)** with 100% A=B parity / 0 anomalies:

| Customer | Pattern | A=B G40 | A=B G80 |
|----------|---------|---------|---------|
| CAMCAR | +12 single-machine | 10/20 | 16/20 |
| ITW | +12 single-machine (+1 stub outlier) | 8/20 | 16/20 |
| ACME | +112 multi-machine (~9 headers) | 8/19 | 16/19 |
| AGRATI | +112 multi-machine | 8/20 | 15/20 |
| ALCOA | +112 multi-machine + 1 +14 outlier | 5/11 | 9/11 |
| SFS (iter281-fix) | +12 single-machine | 1/20 | 12/20 |

iter261 pure-pass-through hypothesis: EMPIRICALLY ROBUST across 89+ scored pairs.

### slot/whiskey commit history this Stop block

- `06359bd820` — iter271 wiki companion (yolo-mode unsatisfiable loop)
- `c16216c663` — iter272 multi-paren-comment regression test
- `611f3dc980` — iter270 empty_source pair_type extension
- `a971ccd739` — iter267 parseBlocks regression tests
- `bd91e267d8` — iter264-265 parseBlocks comment-strip + wiki
- `f495089a00` — iter250-262 R12 retraction + flag ship + detector rewrite
- (iter275/iter281/iter285 commits via classifyPairType helper + AB-locator priority fix + README)

### Real engineering finding

The v2.0.0 lathe upgrade pipeline does NOT change machining content for ANY of the 5 sampled customers (CAMCAR / ITW / ACME / AGRATI / ALCOA, 80+ paired pairs verified). It attaches multi-machine annotation headers (1 header for CAMCAR/ITW = +12 lines, ~9 stacked headers for ACME/AGRATI/ALCOA = +112 lines) and passes the A-source body through byte-identically.

The wizard's iter1-iter261 training-signal assumption ("v2.0.0 B-versions are improved A-versions") was wrong. The B-versions are essentially A-versions wrapped in metadata. Real training signal must come from elsewhere (human revisions, cross-customer comparisons, industry-published examples).

## Related

- `[[reference_whiskey_session_final_iter228_2026_05_27]]` — pre-compact comprehensive successor (iter168-228)
- `[[reference_whiskey_session_final_iter167_2026_05_27]]` — legacy pre-iter168 snapshot
- `[[reference_jm_die_v2_upgrade_pattern_2026_05_27]]` — v2.0.0 upgrade pattern (iter218 RETRACTED — see iter261)
- `[[reference_iter218_alcoa_outlier_retraction_2026_05_27]]` — iter261 R12 retraction (the closure)
- `[[reference_jm_die_v2_upgrade_camcar_passthrough_2026_05_27]]` — iter253/254 cross-customer findings (cross-customer claims now valid after iter261 confirmation)
- `[[reference_ab_locator_over_pairing_human_revisions_2026_05_27]]` — iter256/257 over-pairing finding + flag
- `[[reference_jm_die_is_okuma_heavy_implications_2026_05_27]]` — JM-fleet Okuma-only implication
- `[[feedback_yolo_mode_nonterminal_goal_pattern]]` — cron-continuity-across-compact doctrine
