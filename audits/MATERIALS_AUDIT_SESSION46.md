# PRISM Materials Database Audit Report
## Session 46 — February 7, 2026

---

## EXECUTIVE SUMMARY

**The entire materials database (2,805 entries) is synthetically generated data.**
All entries carry the `_gen_v5` watermark, exhibit 10+ decimal place precision artifacts,
and contain physics violations that make them **unreliable for safety-critical manufacturing calculations**.

**True accurate count: 2,805 unique material names, 0 verified/curated entries.**

---

## ACTIVE DATABASE: `C:\PRISM\data\materials\`

| ISO Group | Materials | Files | Empty Files | Physics Failures |
|-----------|----------|-------|-------------|-----------------|
| P_STEELS | 1,269 | 15 | 0 | High (HB/condition mismatches) |
| M_STAINLESS | 347 | 11 | 1 | Moderate |
| K_CAST_IRON | 56 | 8 | 1 | High (Kc1 values <100) |
| N_NONFERROUS | 447 | 13 | 0 | High (Taylor C >2000) |
| S_SUPERALLOYS | 45 | 5 | 1 | Moderate |
| H_HARDENED | 39 | 6 | 2 | Moderate |
| X_SPECIALTY | 602 | 29 | 5 | High (Kc1 <100 for polymers) |
| **TOTAL** | **2,805** | **87** | **10** | **233 outright failures** |

---

## QUALITY INDICATORS

### 1. ALL Generator-Tagged
- 2,805 / 2,805 have `_gen_v5: { complete: true, params: 127, uid: N }`
- Zero manually curated or reference-verified entries

### 2. Suspicious Precision (Simulated Parallel Artifact)
- 2,522 materials have kc1_1 values with 10+ decimal places (e.g., `1486.1620351368`)
- 283 materials have 7-9 decimal places
- **Zero** materials have ≤4 decimal precision (what real handbook data looks like)
- Real data: `kc1_1: 1500` or `kc1_1: 1486.2`. Simulated: `kc1_1: 1486.1620351368`

### 3. Physics Violations (233 confirmed)
- **Hardness vs. condition**: 175 materials have impossible combinations
  - Example: "AISI 4130 Normalized" → HB=580 (should be ~180-220)
  - Example: "AISI 52100 Spheroidize Annealed" → HB=582 (should be ~190-200)
  - Example: "AISI 9260 Hardened 48 HRC" → HB=110 (should be ~450+)
- **Kc1 out of range**: 59 materials (values <100 or >3500 for steels)
- **Density anomalies**: 7 materials outside physical bounds

### 4. No Material IDs
- Zero entries have a `material_id` or `id` field at the top level
- Registry generates synthetic IDs at load time from `{group}-{filename}-{index}`

---

## OTHER MATERIALS DIRECTORIES (Archaeological Evidence)

| Directory | Materials | Gen-Tagged | Notes |
|-----------|----------|------------|-------|
| materials_consolidated | 2,627 | 0 | **Stub-only**: id, name, category, subcategory. No physics data. |
| materials_complete | 3,181 | 483 | Mixed generated + some enriched |
| materials_enhanced | 3,508 | 483 | Superset of complete |
| materials_mechanical_enhanced | 2,846 | 363 | Partial enrichment |
| materials_unified | 3,518 | 483 | Largest set, mixed quality |

The `materials_consolidated` directory has 2,627 clean name stubs — this appears to be the
original material LIST before generation was applied. Its 2,627 names are a perfect subset
of the active database's 2,805 names (178 materials were added during generation).

---

## ASSESSMENT

### What We Actually Have
- **2,805 unique material names** covering the right alloy families
- **Ballpark-range values** — most values are in the right neighborhood but with:
  - Wrong precision (simulated decimal artifacts)
  - Wrong correlations (hardness vs. heat treatment conditions)
  - Some outright impossible physics

### What We DON'T Have
- Any reference-verified Kienzle coefficients
- Any reference-verified Taylor tool life constants
- Any reference-verified Johnson-Cook parameters
- Material IDs conforming to any standard
- Any traceability to handbook/catalog sources

### Risk Assessment for Safety-Critical Use
**UNACCEPTABLE.** Using these values for cutting force calculations could produce:
- Cutting forces off by 20-50% (from wrong kc1/mc values)
- Tool life predictions off by 100-500% (from wrong Taylor constants)
- Flow stress predictions leading to wrong thermal/deflection calculations

---

## RECOMMENDATION

1. **Preserve the 2,805 material NAME catalog** — the names are good coverage
2. **Replace ALL numerical values** with reference-verified data from:
   - Machining Data Handbook (MDH)
   - ASM International Handbooks
   - Manufacturer technical data sheets
   - Published Kienzle/Taylor research papers
3. **Priority replacement order**:
   - P_STEELS core alloys (4130, 4140, 4340, 1045, 1018) — most commonly machined
   - N_NONFERROUS aluminum alloys (6061, 7075, 2024) — aerospace critical
   - M_STAINLESS (304, 316, 17-4PH) — medical/aerospace
   - S_SUPERALLOYS (Inconel 718, Waspaloy) — high-value parts
4. **Add `data_quality` field** to each material: "generated" vs "verified" vs "handbook"
5. **Round values** to physically meaningful precision (kc1 to integer, mc to 3 decimals)
