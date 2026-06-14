---
name: reference-iter218-alcoa-outlier-retraction-2026-05-27
description: R12 FAIL-LOUD RETRACTION. iter218's "ALCOA v2.0.0 upgrade adds explicit G40/G80 safety-state enumeration + canned-cycle expansion" was based on incorrect hand-written reading of ONE pair (A0137471). iter261 verified by direct file read that A0137471's B-file body is BYTE-IDENTICAL to its A-source — only stacked annotation headers added. ALCOA is NOT an outlier; it follows the same pure-annotation-pass-through pattern as CAMCAR/ITW/ACME/AGRATI. iter227 `detectMissingSafetyStateFlags` detector's rationale is invalidated.
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-09T14:54:09.163Z
aliases: reference_iter218_alcoa_outlier_retraction_2026_05_27
---


# Iter218 ALCOA-outlier retraction (R12 fail-loud)

## The retraction

Iter218's empirical claim (`[[reference_jm_die_v2_upgrade_pattern_2026_05_27]]`) was:

> A-version (`ALCOA/A0137471.MIN` — Mazak EIA source): G50, G96, G97 + raw G00/G01 motion + G74 peck drill
>
> B-version (`ALCOA/PRISM_UPGRADED/Okuma_LB-3000EX/A0137471.nc`): G00, G01, G04 (dwell), **G40 (cutter comp cancel)**, G50, G74, **G80 (canned cycle cancel)**, **G81, G85, G87 (drilling cycles)**, G96, G97

iter261 verified by direct file read of `H:/PRISM/JM DIE/CNC LATHE/ALCOA/PRISM_UPGRADED/Okuma_LB-3000EX/A0137471.nc`:

- Lines 1-112: 9 stacked PRISM v2.0.0 annotation headers (one per target machine: GENOS_L200E-M, GENOS_L300-M, LB-3000EX, LB-3000EX-BigBore, LB-3000EX_II, LNC8, Multus_B250II, etc.)
- Line 113 onward: `$A0137471.MIN%` → `M1` → `NBAR` → `CLEAR` → `DEF WORK` → ... → `T010101 G50 S700 G97 S600 M3 G0 X1.6 Z.0 G1 X-.04 F.005 M8 G0 Z.03 X1.360 G1 Z0 F.003 G3 X1.440 Z-.04 L.04 G1 Z-1.28 F.007 G0 X20 Z20 M1 NAT03 (CENTER DRILL) T030303 G0 X20 Z20 G97 S800 M3 G0 X.0 Z.05 G1 Z-.05 F.001 G0 Z.1 G0 X20 Z20 M1 NAT05 ...`

**Zero G40 anywhere in the file.** `grep -c "G40"` returns `0` on the B-file. Also zero G80, zero G81/G85/G87. iter218's claim that B-version has "G40, G80, G81, G85, G87" added was factually wrong.

## Direct verification (iter261)

```
$ grep -c "G40" "H:/PRISM/JM DIE/CNC LATHE/ALCOA/A0137471.MIN"
0
$ grep -c "G40" "H:/PRISM/JM DIE/CNC LATHE/ALCOA/PRISM_UPGRADED/Okuma_LB-3000EX/A0137471.nc"
0
```

A-version and B-version both have zero G40. The body is unchanged.

## Per-pair ALCOA confirmation (all 11 pairs)

iter261 `--upgraded-only` scan returned:
- 11 ALCOA PRISM_UPGRADED pairs, 0 human-revision contamination
- 10 of 11 pairs: delta_lines=+112 (multi-machine ~9-header stack, same as ACME/AGRATI)
- 1 of 11 pairs (WAFER1314): delta_lines=+14 (single-machine, same as CAMCAR/ITW)
- A-G40: 5/11 (45%), B-G40: 5/11 (45%) — IDENTICAL counts
- A-G80: 9/11 (82%), B-G80: 9/11 (82%) — IDENTICAL counts
- avg_delta_lines: +103.1 (was wrongly reported "~5.7× line multiplier" in iter218)
- b/a line ratio: 2.27× (not 5.7×)

The G40/G80 counts at A=B parity prove the v2.0.0 pipeline does NOT add safety flags to ANY ALCOA pair.

## Implications

### 1. iter218 conclusion is retracted

`[[reference_jm_die_v2_upgrade_pattern_2026_05_27]]` is RETRACTED in its original form. The "v2.0.0 upgrade pattern is explicit safety-flag enumeration + canned-cycle expansion" finding is empirically incorrect.

### 2. ALCOA is NOT an outlier

All 5 sampled customers (CAMCAR, ITW, ACME, AGRATI, ALCOA) exhibit identical PURE annotation pass-through behavior:
- 1-machine target → +12 line single-header (CAMCAR, ITW typical, WAFER1314)
- N-machine target → +12*N line stacked headers (ACME, AGRATI, ALCOA typical)
- ZERO body changes anywhere
- A=B perfect parity on G40, G80, all G-codes

### 3. iter227 detector rationale is invalidated

`detectMissingSafetyStateFlags` was added to Stage 4 REASON based on the iter218 finding. iter261 invalidates that rationale: there is no "amateur ALCOA-class" pattern of missing G40/G80 that v2.0.0 fixes. The detector may still produce useful output (raw motion without G40 IS a real code-smell), but its empirical justification ("v2.0.0 adds these") is wrong.

**Action item**: keep the detector (still semantically correct) but REWRITE its `why` rationale string in `lathe-training-loop-stage-4-reason.mjs` to remove the false v2.0.0 citation.

### 4. The whole v2.0.0 pipeline question is open

If v2.0.0 doesn't change machining content, what does it actually DO? The header rationale strings mention `physicsBackend: UltimateSpeedFeedEngine.calculate` with `RPM: 1905 confidence=0.75 source=calculated` — but those values are written to header comments only, NOT applied to the program. The pipeline computes physics but doesn't emit it into the running code. That's either:
- A bug (pipeline forgot to emit the calculated values)
- By design (annotation-only mode for already-good programs — but then the SAME annotation-only output for ALCOA's "amateur" programs is suspect)
- An incomplete pipeline state (v2.0.0 stops at metadata phase, never reaches emit phase)

## How iter218 got it wrong (hypothesis)

Most likely: iter218 looked at the LIST of UNIQUE G-codes returned by `parseBlocks().g_codes` — a deduplicated set of G-codes across the entire file. If the B-file's STACKED HEADERS contained G-code-like text in `rationale` strings (e.g., physics references), those may have been spuriously parsed as G-codes. Then the set-of-unique-G-codes from the B-file would include extra entries from header parsing artifacts.

Alternative: iter218 may have looked at a DIFFERENT pair entirely and mis-attributed it as A0137471. Or read a different version of A0137471.nc that was later overwritten.

Either way, the BODY of A0137471.nc as it exists today has no G40/G80/canned cycles added.

## Resulting unified cross-customer finding (corrected)

| Customer | B/A line ratio | Pattern | A=B G40 | A=B G80 |
|----------|----------------|---------|---------|---------|
| CAMCAR | ~1.1× | 1-machine annotation header (+12 lines) | 10/20 = 10/20 ✓ | 16/20 = 16/20 ✓ |
| ITW | ~1.1× | 1-machine annotation header (+12 lines, 1 degenerate-source outlier) | 8/20 = 8/20 ✓ | 16/20 = 16/20 ✓ |
| ACME | ~2.5× | ~9-machine stacked headers (+112 lines) | 8/19 = 8/19 ✓ | 16/19 = 16/19 ✓ |
| AGRATI | ~2.4× | ~9-machine stacked headers (+112 lines) | 8/20 = 8/20 ✓ | 15/20 = 15/20 ✓ |
| ALCOA | ~2.3× | ~9-machine stacked headers (+112 lines), 1 single-machine outlier (WAFER1314, +14) | 5/11 = 5/11 ✓ | 9/11 = 9/11 ✓ |
| SFS (iter279/281) | ~1.1× | 1-machine annotation header (+12 lines, post-iter281 locator-fix) | 1/20 = 1/20 ✓ | 12/20 = 12/20 ✓ |

**ALL 6 customers exhibit pure annotation pass-through. v2.0.0 changes ZERO machining content.** The customer-customer variation reflects the number of target-machine annotations stacked, not source-program quality.

## Iter283 verification under post-iter281 locator

ALL 6 customers re-scored under iter281-fixed locator (which prefers base-name `<part>.nc` over filename-suffixed `<part>-B.nc` variants in PRISM_UPGRADED). Numbers UNCHANGED for 5 customers; SFS gained 1 customer when iter279 SFS anomaly was resolved as locator artifact (not pipeline behavior). iter261 R12 retraction stands. 89+ scored pairs, 0 anomalies remain.

## R12 honesty

This retraction is itself a finding. Lessons:

1. **Empirical claims need byte-diff verification, not parsed-G-code-set comparisons.** parseBlocks may parse header rationale strings as G-codes (needs investigation).
2. **Generalization from one pair is dangerous.** iter218 sampled A0137471 once and propagated the conclusion to "the ALCOA class." iter245+249+251+252+260+261 (5 more customer scans, 80+ pairs) revealed the actual unified pattern.
3. **The wizard's training-signal foundation is weaker than thought.** If v2.0.0 doesn't add safety flags or canned cycles, the wizard can't learn those from JM-Die A/B pairs. The training corpus needs deeper inspection.

## Related

- `[[reference_jm_die_v2_upgrade_pattern_2026_05_27]]` — RETRACTED (iter218 source memo)
- `[[reference_jm_die_v2_upgrade_camcar_passthrough_2026_05_27]]` — INVALIDATED for cross-customer claims (iter253/254 source memo)
- `[[reference_ab_locator_over_pairing_human_revisions_2026_05_27]]` — iter256/257 over-pairing finding (still valid)
- `[[reference_whiskey_session_final_iter228_2026_05_27]]` — predecessor session memo
- `scripts/lib/lathe-training-loop-stage-4-reason.mjs` — contains iter227 `detectMissingSafetyStateFlags` (rationale string needs rewrite)
- `scripts/scan-jm-die-ab-pairs.mjs` — iter257 `--upgraded-only` flag enabled this verification
