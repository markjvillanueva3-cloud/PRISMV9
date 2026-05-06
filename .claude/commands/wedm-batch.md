---
policy:
  tier: 3
  triggers:
    - "wedm-batch"
---
# /wedm-batch — Wire EDM Batch Operations

Run batch validation, generation, or testing across the WEDM material×thickness×wire×dialect matrix.

## Usage
```
/wedm-batch <mode> [options]
```

## Modes

## Advisor Strategy (`advisor_20260301`)
- **Executor**: Sonnet 4.6 (iterates the material×thickness×wire×dialect matrix)
- **Advisor**: Opus 4.6, `max_uses: 1`
- **When Sonnet should call advisor**: once at start — to plan batch strategy and identify high-risk material combinations. Individual test cases are mechanical.

### `physics` — Material×Thickness physics validation (default)
Validates pulse parameters, Ra predictions, offsets, and feed rates against published data for:
- 5 materials × 3 thicknesses × 4 Ra targets = **60 test cases**
- Published reference: Klocke k_ra, Lemhunter feeds, PUBLISHED_RA_VS_PASSES

```
/wedm-batch physics
```

### `dialects` — All 5 controller dialect verification
Generates a test program in each dialect and verifies:
- Technology code format (E-pack/C###/HYPER-i/ISPG/T-reg)
- Threading M-codes (M20/M50/M60)
- Arc reversal on Pass 3
- Header format
- Taper handling (UV on G1 vs TAPER-EXPERT)

```
/wedm-batch dialects
```

### `materials` — Full material matrix coverage
Checks all 22 material variants for complete thermal property data:
- Steels: D2, A2, S7, M2, 4140, 1045
- Stainless: 304, 316, 17-4PH
- Aluminum: 6061, 7075, 2024
- Carbide: WC-6%Co, WC-10%Co, WC-15%Co
- Titanium: Ti-6Al-4V, Ti-6Al-2Sn
- Superalloys: Inconel 718, Hastelloy X, Waspaloy
- Copper: C110, Cu-W 70/30
- Other: Stellite 6

```
/wedm-batch materials
```

### `production` — 30-case production gate
Full end-to-end pipeline: 5 geometries × 3 materials × 2 thicknesses = **30 test cases**
Each must pass ALL 8 criteria:
1. Physics params from published data
2. Ra within ±15% of Klocke
3. Dimension within ±0.002mm
4. Cycle time within ±15%
5. Backplot correct
6. Confidence ≥90%
7. Setup sheet complete
8. Zero synthetic parameters

```
/wedm-batch production
```

### `all` — Run everything
```
/wedm-batch all
```

## Implementation
Batch script: `.claude/hooks/lib/wedm-batch-validate.mjs`
Orchestrator: `prism_edm:wedm_generate_complete_program`

## Integration with RGS
- **S0 (U-W100-00)**: `/wedm-batch materials` — verify data readiness
- **S2 (U-W100-04)**: `/wedm-batch physics` — validate pulse params
- **S5.5 (U-W100-34/35)**: `/wedm-batch dialects` — verify all 5 controllers
- **S8 (U-W100-23/24)**: `/wedm-batch physics` — full material validation
- **S11 (U-W100-30)**: `/wedm-batch production` — 30-case production gate

## Related
- `/wedm-program` — Single program generation
- `/wire-edm-studio` — Interactive studio mode
- `/batch-optimize` — Fleet-wide physics optimization
- `/test` — Smart test runner
