---
name: reference-iter279-sfs-g80-anomaly-2026-05-27
description: iter279 SFS (6th customer) scored 20 PRISM_UPGRADED pairs and surfaced a NEW anomaly: B-G80=12/20 vs A-G80=13/20 — one v2.0.0 output has FEWER G80 than source. First non-ALCOA case violating iter261's pure-pass-through generalization. Could be real body change for SFS, OR exposure of parseBlocks comment-strip fix (iter265) revealing prior cross-customer G80 counts were inflated by header rationale strings. Candidate-unit for next session.
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:46.624Z
aliases: reference_iter279_sfs_g80_anomaly_2026_05_27
---


# iter279 SFS G80 Anomaly

## What the scan showed

`scan-jm-die-ab-pairs.mjs --score --score-limit=20 --upgraded-only` on SFS (88 PRISM_UPGRADED pairs):
- avg_delta_lines: **+9.6** (less than CAMCAR +12, less than the multi-machine ~+112)
- a_with_G40: 1/20 (5%) — extremely low
- b_with_G40: 1/20 (5%) — identical
- a_with_G80: 13/20 (65%)
- **b_with_G80: 12/20 (60%)** — one LESS

## Why this is interesting

iter261 R12 retraction (cross-customer matrix across 5 customers / 80+ pairs) generalized that v2.0.0 is pure annotation pass-through with A=B perfect G-code parity. Five customers all showed G40 + G80 counts identical between A and B versions.

SFS is the **6th customer** and the FIRST to show G-code-count divergence between A and B. Specifically: B has ONE FEWER G80 across 20 sampled pairs.

## Three possible explanations

### 1. SFS source programs really do contain extra G80 that v2.0.0 removed

If true, v2.0.0 pipeline DOES make body changes for SFS specifically. But this contradicts the byte-level verification from iter261 (A0137471.nc body = byte-identical to source). Either iter261's A0137471 evidence doesn't generalize, OR SFS has a different pipeline mode.

### 2. iter265 parseBlocks comment-strip fix exposed prior false-positives

The pre-iter265 parseBlocks was matching G-codes inside parenthesized comments. After iter265 the fix strips comments before parsing. **CAMCAR/ITW/ACME/AGRATI/ALCOA scans (iter249-261) were done with the OLD parseBlocks**. Their A=B parity might be an artifact: the OLD parseBlocks counted G80 inside header rationale strings (e.g. `(  rationale: ... G80 ...)`) which were equally present on both A and B. After the fix, those false-positives disappear from BOTH sides equally, preserving parity.

For SFS (scanned AFTER iter265), if exactly one A-version has a comment containing G80 that the B-version's rebuilt comment doesn't have, the difference would be visible only in post-fix data.

### 3. Sample-size noise

20 of 88 PRISM_UPGRADED pairs is ~23% sample. A single A or B with an aberrant G80 count would change the ratio by 1/20 = 5 percentage points. Possible but unlikely to perfectly produce a -1 G80 anomaly without explanation.

## How to investigate (next session)

1. **Re-run iter249/iter251/iter258/iter259/iter260 scans with current parseBlocks** (post-iter265 fix) — compare new G40/G80 counts to original iter249-261 numbers. If now divergent, explanation #2 is correct.

2. **Direct byte-diff on the SFS pair where B-G80 is missing** — identify the specific pair via `--score` output; diff A and B file bodies (line-by-line); confirm which lines differ; rule out vs confirm explanation #1.

3. **Sample 20 MORE SFS pairs** (`--score-limit=40`) — if B-G80 remains -1 across 40 pairs, that's a real pattern. If parity restored across more samples, explanation #3.

## Implication for the iter218 retraction

iter261's R12 retraction is STILL VALID (A0137471 was byte-verified to have unchanged body). But the cross-customer matrix metrics (CAMCAR/ITW/ACME/AGRATI) may need re-running with post-iter265 parseBlocks to detect any similar anomalies that were previously hidden by the comment-parsing bug.

## Candidate unit

`U-CROSS-CUSTOMER-RESCAN-POST-PARSEBLOCKS-FIX` — re-run the 5-customer scan with current code (iter265-fixed parseBlocks). Estimated effort: ~10 tool calls. Outcome: confirm iter261's metrics OR surface multi-customer anomalies that were previously hidden.

## Iter280 RESOLUTION — anomaly is locator artifact, NOT v2.0.0 behavior

iter280 re-ran ACME with post-iter265 parseBlocks: parity UNCHANGED (8/19=8/19 G40, 16/19=16/19 G80, +112 avg_delta). Hypothesis #2 (parseBlocks comment-strip exposed false-positives) FALSIFIED.

Single SFS offending pair identified: `S072448`. A-version has 1 G80; B-version (locator-selected) has 0 G80. Direct grep:
- `SFS/S072448.MIN` (A): 1 G80
- `SFS/PRISM_UPGRADED/Okuma_GENOS_L200E-M/S072448.nc`: **1 G80** (matches A — what the pipeline produced)
- `SFS/PRISM_UPGRADED/Okuma_GENOS_L200E-M/S072448-B.nc`: **0 G80** (variant — what the locator PICKED)

**Root cause: AB-locator B-version selection priority bug.** When both `<part>.nc` and `<part>-B.nc` coexist in `PRISM_UPGRADED/`, the locator chose the `-B`-suffixed file. The `-B` variant is presumably a human revision of the AI-generated upgrade, NOT what the iter261 cross-customer matrix should measure.

**iter261 pure-pass-through generalization REMAINS VALID.** The matched-by-name `S072448.nc` has 1 G80 = A's 1 G80, consistent with the pass-through hypothesis. The "anomaly" was locator artifact, not pipeline behavior.

## New candidate unit (replaces above)

`U-AB-LOCATOR-PRISM-UPGRADED-PRIORITY-FIX` — when multiple B-candidates exist in `PRISM_UPGRADED/<machine>/`, prefer the base-name-matched file (`<part>.nc`) over any `<part>-<suffix>.nc` variant. The `-B`-suffix human-revision pattern (iter165 A_PATTERNS) should NOT apply inside PRISM_UPGRADED folders since those are AI-generated outputs.

Estimated effort: ~5 lines in `scripts/lib/lathe-ab-version-locator.mjs` pairAB function — sort candidates by canonical-name match score, prefer exact match. Add regression test.

## R12 lesson

iter279 surfaced a real bug but mis-classified it as a v2.0.0 anomaly. iter280 byte-level investigation found the locator was the culprit. Lesson: when scanned-data shows an anomaly, byte-level verify on the SPECIFIC offending pair BEFORE concluding a pattern.

## Related

- `[[reference_iter218_alcoa_outlier_retraction_2026_05_27]]` — iter261 R12 retraction (A0137471 byte-verified)
- `[[reference_jm_die_v2_upgrade_pattern_2026_05_27]]` — original retracted pattern memo (5-customer matrix)
- `[[reference_jm_die_v2_upgrade_camcar_passthrough_2026_05_27]]` — iter253/254 CAMCAR finding
- `[[reference_whiskey_lathe_complete_asset_map_2026_05_27]]` — iter275 whiskey asset atlas
- `scripts/lathe-quality-pipeline.mjs` PAREN_COMMENT_RE — iter265 fix
- `scripts/scan-jm-die-ab-pairs.mjs --upgraded-only` — iter257 flag enabling clean scoring
