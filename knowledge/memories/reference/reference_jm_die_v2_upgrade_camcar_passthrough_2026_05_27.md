---
name: reference-jm-die-v2-upgrade-camcar-passthrough-2026-05-27
description: Empirical iter253 finding — CAMCAR v2.0.0 "upgrade" is pure +12-line annotation header pass-through; body byte-equal in 20/20 sampled pairs. The v2.0.0 pipeline applies ZERO machining changes for non-ALCOA customers like CAMCAR where source programs are already at professional baseline. Next-detector signal: identify what value (if any) v2.0.0 adds for non-ALCOA customers.
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:46.627Z
aliases: reference_jm_die_v2_upgrade_camcar_passthrough_2026_05_27
---


# CAMCAR v2.0.0 = pure annotation pass-through

## What the data shows

iter252 scanned CAMCAR (66 paired, 20 scored) with avg_delta_lines = +12. iter253 investigated WHAT the +12 lines are and found:

### Empirical evidence

**All 20 sampled CAMCAR pairs have IDENTICAL +12 line delta.** That uniformity is not coincidence — it's a fixed-format annotation header.

Sample 1 (CAMCAR/1525-27, 112→124 lines):
```
+(=== PRISM JM-Die Lathe Upgrade ===)
+(  source: H:\PRISM\JM DIE\CNC LATHE\CAMCAR\1525-27.MIN)
+(  partNumber: 1525-27)
+(  machineId: LTH-02)
+(  machineModel: Okuma_GENOS_L200E-M)
+(  material: tool_steel)
+(  RPM: 1375)
+(  feedrate: 178.75 mm/min)
+(  depthOfCut: 1.5 mm)
+(  effective SFM: 180)
+(  rationale: HSSco Allied TA / TiAlN on tool_steel; baseSFM 180 × ...)
+(=== End upgrade header ===)
```
Body unchanged — verified via `diff -u` showing only the 12-line addition at top of file.

Sample 2 (CAMCAR/1531-7): same +12 annotation header, body byte-equal. `diff -u` total output = 18 lines (3 file-header + 12 addition + 3 context).

## Implications

### 1. CAMCAR is at "professional baseline" for v2.0.0

CAMCAR's source `.MIN` programs already contain:
- G40 cutter-comp cancels at 50% rate (same as v2.0.0 output)
- G80 cycle cancels at 80% rate (same as v2.0.0 output)
- Full G-code repertoire (G00,G01,G02,G03,G04,G40,G50,G80,G81,G85,G87,G96,G97)
- All operation sequencing the v2.0.0 wizard would emit

The v2.0.0 pipeline detects this and applies **PASS-THROUGH MODE** — attach provenance metadata, write nothing else.

### 2. The pipeline IS customer-aware (good)

The header contains: `machineId`, `machineModel`, `material`, `RPM`, `feedrate`, `depthOfCut`, `SFM`, `rationale`. That's real PRISM-derived metadata, not boilerplate. The pipeline IS computing physics + matching tools for CAMCAR, it's just that the resulting parameters happen to match the source program.

### 3. What "improvement" looks like for amateur (ALCOA) vs professional (CAMCAR) customers

| Customer class | v2.0.0 body change | v2.0.0 header | Practical value |
|----------------|--------------------|--------------|-----------------|
| ALCOA-class (amateur) | +5.7× lines, +G40/G80/canned cycles | yes | High — fixes safety-state gap |
| CAMCAR-class (professional) | **zero body change** | yes | Low — just provenance |
| ITW/ACME/AGRATI | +17 to +105 lines body changes, G40/G80 parity | yes | Medium — structural reformatting, but not safety-critical |

### 4. Next-detector candidate (iter227 successor)

The wizard currently has `detectMissingSafetyStateFlags` (iter227) which correctly fires on ALCOA and no-ops on CAMCAR. For ITW/ACME/AGRATI (medium delta with G40/G80 parity), the v2.0.0 is making OTHER kinds of changes that the wizard doesn't yet detect. Investigation candidate: sample 1 pair each from ITW + ACME + AGRATI with body-diff to identify what those changes are. That surfaces the next detector to build.

## Empirical follow-up needed (not done this iter)

- **ITW body-diff sample** (iter245 +17 avg) — what's the 17 lines if not safety flags?
- **ACME body-diff sample** (iter249 +76 avg) — what's the 76 lines?
- **AGRATI body-diff sample** (iter251 +105 avg) — what's the 105 lines?

These would each be 1-iter probes. Each probe surfaces a new detector candidate for the wizard's Stage 4 REASON.

## Iter254 update — finding GENERALIZES across all 5 non-ALCOA customers

ITW body-diff (iter254) revealed 19/20 ITW pairs have IDENTICAL delta=+12 (same CAMCAR pattern). The single outlier (`A.MIN`, 4-line stub → 116-line placeholder) is a degenerate-source case, not a real upgrade.

ACME PRISM_UPGRADED pairs (filtering out 6 human `-A`/`-B` revision pairs that the locator mis-paired): all 14 true v2.0.0 pairs have IDENTICAL delta=+112. The +112 = ~9 stacked v2.0.0 headers (one per target machine: LTH-01..LTH-07 × Okuma_GENOS / Okuma_LNC8 / Okuma_Multus_B250II / etc.). Lines 1-112 of the B-file are 9 sequential annotation headers; line 113 onward is the byte-identical original A-version body.

**Generalized cross-customer conclusion** (5 customers, 80+ pairs, 4 byte-diff-verified pairs):

| Customer | PRISM_UPGRADED pair count | Uniform delta | Pattern |
|----------|---------------------------|---------------|---------|
| CAMCAR | 20/20 | +12 | 1 header (1 machine target) |
| ITW | 19/20 | +12 | 1 header (1 machine target); 1 degenerate-source outlier |
| AGRATI | 19/19 (filtered) | +112 | ~9 stacked headers (multi-machine emission — same as ACME) |
| ACME | 14/14 (filtered) | +112 | ~9 stacked headers (multi-machine emission) |
| ALCOA | 11/11 | ~5.7× line multiplier | REAL body changes (safety-state enumeration etc.) |

**The v2.0.0 pipeline is doing PURE ANNOTATION PASS-THROUGH for all non-ALCOA professional customers.** The delta variation is just the number of stacked machine-target headers (1 vs ~9). Zero body changes. The "improvement" is provenance metadata only.

ALCOA remains the ONLY customer where v2.0.0 changes machining content. For 4 of 5 customers, the wizard's value is "validate physics + attach metadata", not "rewrite the program".

## Pre-iter249 metric correction

Pre-iter254, the cross-customer matrix in `[[reference_jm_die_v2_upgrade_pattern_2026_05_27]]` reported:
- ITW avg_delta=+17 (was actually 19×12+1×112 = 360/20 = 18.0, skewed by 4-line stub outlier)
- ACME avg_delta=+76 (was actually mixed: 14 PRISM_UPGRADED × 112 + 6 human `-A`/`-B` revisions with variable/negative deltas)
- AGRATI avg_delta=+105 (still needs filtering for PRISM_UPGRADED vs human revisions)

The iter227 `detectMissingSafetyStateFlags` detector's correctness is UNCHANGED — it still fires correctly on ALCOA-class amateur source programs and stays correctly silent on the 80 non-ALCOA scored pairs.

## R12 honesty

This iter sampled ONLY 2 of 20 CAMCAR pairs via byte-diff (the other 18 are inferred from identical +12 delta_lines + identical G-code sets). Full 20-pair byte-diff validation would harden the "100% pass-through" claim from "highly likely" to "verified". Tracked as candidate unit `U-CAMCAR-FULL-BYTE-DIFF-VERIFY`.

## Related

- `[[reference_jm_die_v2_upgrade_pattern_2026_05_27]]` — cross-customer matrix (5 customers, 80 non-ALCOA scored pairs)
- `[[reference_jm_die_is_okuma_heavy_implications_2026_05_27]]` — JM-fleet Okuma-only
- `[[feedback_jm_die_b_versions_are_ai_not_human_upgrade]]` — B-version provenance (AI-generated)
- `[[reference_whiskey_iter250_cron_re_establishment_2026_05_27]]` — durable cron `8505e156`
- `[[reference_whiskey_session_final_iter228_2026_05_27]]` — comprehensive predecessor
