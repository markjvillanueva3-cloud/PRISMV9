# PHASE R1: REGISTRY RESURRECTION — v13.9
# Status: not-started | Sessions: 1-2 | MS: 7 (MS0-MS6) | Role: Data Quality Analyst
# Pattern: Every MS follows LOAD → VALIDATE → FIX → VERIFY → DOCUMENT
# v13.9: Cross-Audit Governance Hardening — artifact manifest, fault injection, test levels (XA-1,13,7).
# v13.5: Material sanity checks (cross-parameter validation per material class — SK-5).
#         Reference values validation integrated with R2 tolerance system (SK-3).
#         Material verification method (how to check 127 params without memorizing them).
#         Per-registry normalizer complexity guidance (machines easy, alarms hard).
# v13.3: Pipeline tests have effort per sub-call. MS4 coverage audit fully annotated.
# v13.2: MS1 adds loader/normalizer separation architecture + schema migration path.
# v13.0: Structured outputs on all formula validation returns. Effort=high on material_get.
#         Effort=low on list/stats operations. Fine-grained streaming on bulk data loads.
#         Session estimate reduced from 2 to 1-2 (Compaction API eliminates dead sessions).

---

## CONTEXT BRIDGE

WHAT CAME BEFORE: P0 fixed all WIRING + configured Opus 4.6. 31 dispatchers verified operational. 4 duplicate registry pairs resolved to single sources. Opus 4.6 Compaction API, Adaptive Thinking, Structured Outputs, and Agent Teams all wired. PHASE_FINDINGS.md has P0 section. SYSTEM_ACTIVATION_REPORT.md, P0_DISPATCHER_BASELINE.md, OPUS_CONFIG_BASELINE.md exist.

WHAT THIS PHASE DOES: Load DATA into the wiring P0 fixed. Materials 3518+ (127 params each), Machines 824+, Tools 1944+, Alarms 9200+. Formula definitions (Taylor, Kienzle, specific cutting force) must parse into calculation engine. Target: >95% load rate for all registries.

WHAT COMES AFTER: R2 (Safety Test Matrix) runs 50 calculations + AI-generated edge cases against loaded data. R2 expects: all registries >95% loaded, formula definitions parsed and validated, REGISTRY_AUDIT.md with load counts and failure analysis.

ARTIFACT MANIFEST (XA-1):
  REQUIRES: PHASE_FINDINGS.md (P0 section), P0_DISPATCHER_BASELINE.md, OPUS_CONFIG_BASELINE.md
  PRODUCES: REGISTRY_AUDIT.md, PHASE_FINDINGS.md (R1 section)

---

## OBJECTIVES

1. Material registry: >95% of 3518+ materials loaded with valid parameters
2. Machine registry: >95% of 824+ machines loaded with valid specs
3. Tool registry: >95% of 1944+ tools loaded with valid geometry
4. Alarm registry: >95% of 9200+ alarms loaded across 12 controller families
5. Formula definitions: Taylor, Kienzle, specific cutting force — all parsed, validated, structured-output verified
6. Data pipelines: warm_start → knowledge → calc engine produces consistent results
7. REGISTRY_AUDIT.md created with per-registry load counts, failure rates, known gaps
8. TEST LEVELS: L1-L3 required (unit + contract + integration tests pass)

## FAULT INJECTION TEST (XA-13 — one test per phase)

```
R1 FAULT TEST: Kill material registry mid-load → verify Tier 2 degradation activates.
  WHEN: After R1-MS1 material loading is working (need a baseline to break).
  HOW:  During a material_get call, simulate registry file being unavailable:
        Temporarily rename the material registry file → call prism_data action=material_get material="4140"
        EXPECTED: System enters Tier 2 (Reduced Data) degradation, NOT crash/hang.
        VERIFY: Health endpoint reports degraded status. Error is logged with correlationId.
        RESTORE: Rename file back. Verify system recovers to Tier 1 automatically.
  PASS: Graceful degradation activates. No crash. Recovery is automatic.
  FAIL: System crashes, hangs, or returns corrupt data silently.
  EFFORT: ~5 calls. Run once during R1-MS4 (coverage audit — natural place for stress testing).
```

---

## R1-MS0: Registry Audit (Current State)

**Effort:** ~10 calls | **Tier:** STANDARD | **Context:** ~5KB
**Response Budget:** ~8KB throughput, ~4KB peak
**Entry:** P0 COMPLETE. All wiring verified.

```
=== AUDIT CURRENT COUNTS ===
1. prism_session action=state_load → warm_start counts (effort=low)
2. prism_knowledge action=stats → knowledge counts (effort=low)
3. prism_data action=material_search query="*" limit=1 → total count (effort=high)
4. prism_data action=machine_search query="*" limit=1 → total count (effort=high)

=== COMPARE ===
5. For each registry type: warm_start count vs knowledge count vs expected count.
   Expected: Materials 3518+, Machines 824+, Tools 1944+, Alarms 9200+
   Record discrepancies.

=== DOCUMENT ===
6. Write REGISTRY_AUDIT.md:
   | Registry | Expected | warm_start | knowledge | Gap | Status |
7. Append ROADMAP_TRACKER.
```

**Exit:** Current state documented. Gaps identified. Path to >95% clear.

---

## R1-MS1: Material Registry Loading

**Effort:** ~15 calls | **Tier:** DEEP | **Context:** ~8KB
**Response Budget:** ~15KB throughput, ~6KB peak
**Entry:** R1-MS0 COMPLETE.

```
=== DIAGNOSE GAPS ===
1. prism_dev action=code_search pattern="materialRegistry\|MaterialRegistry" path="src/"
   → Find loader, parser, validator paths.
2. Read loader (BOUNDED: parse + validate sections, ~100 lines). Identify:
   - Missing fields causing parse failures?
   - Type coercion issues (string "0.25" vs number 0.25)?
   - File encoding issues?
   - Schema version mismatch?

=== FIX LOADER ===
3-6. Apply fixes. Each fix: str_replace → build → verify count increases.
     NEVER modify source data files. Fix the LOADER to handle data as-is.
     Schema additions: ALWAYS include SCHEMA_VERSION field.

     FIX PATTERNS (apply the one matching your diagnosis from steps 1-2):
       TYPE COERCION: Loader reads string where number expected.
         Pattern: function normalize(raw: any) { return { ...raw, density: Number(raw.density) || 0 } }
         Find: where loader/validator rejects the field → add Number() or parseFloat() in normalizer.
       NULL-FILLING: Validator rejects null/undefined optional fields.
         Pattern: return { ...raw, coolant_required: raw.coolant_required ?? false }
         Find: where validator throws on null → add ?? default_value in normalizer.
       ENCODING: File read produces garbled characters (BOM, non-UTF8).
         Pattern: const data = await readFile(path, { encoding: 'utf-8' }); const clean = data.replace(/^\uFEFF/, '');
         Find: file read call → ensure encoding parameter is set + strip BOM.
       SCHEMA MISMATCH: SCHEMA_VERSION in data doesn't match expected.
         Pattern: run migration chain from §Code Standards §Schema Migration.
         Walk: data_version → data_version+1 → ... → current_version. Each step adds/transforms one field.
       BUILD AFTER EACH FIX CATEGORY, not after all fixes. Verify count increases monotonically.

     ARCHITECTURE NOTE — Loader vs Normalizer (Finding 10):
       Loader fixes in R1 will include type coercion (string→number), null-filling, and
       encoding fixes. Structure coercion logic as a SEPARATE normalizer function, not
       inline in the loader. Pattern: Source JSON → Normalizer (coerce) → Validator (schema) → Registry.
       This keeps the loader testable and prevents it from becoming an ETL pipeline by R3.
       The normalizer MUST be extractable to its own module by R3 phase start.

     SCHEMA MIGRATION (Finding 7):
       If SCHEMA_VERSION in data file doesn't match current expected version:
       DO NOT reject the data. Run migration chain from PRISM_PROTOCOLS_CORE §Code Standards:
         Walk: data_version → data_version+1 → ... → current_version
         Each step applies one transformation (e.g., add coolant_required field with default).
         If no migration path exists → throw PrismError(category='schema', severity='block').
       For R1: migration chain will likely be trivial (1.0 → 1.0, no-op).
       For R3+: migrations will accumulate as batch campaigns add fields.
       Create migration registries alongside each loader: src/registries/materialMigrations.ts

=== VALIDATE CRITICAL MATERIALS (effort=high, structured output) ===
7. prism_data action=material_get material="4140"    → verify 127 params (effort=high)

   VERIFICATION METHOD (you do NOT need to memorize all 127 params):
     Count: Object.keys(response).length >= 127 (or count top-level JSON keys).
     Spot-check these CRITICAL fields (used by every safety calculation):
       response.kc1_1 → positive number (specific cutting force constant — EVERY formula uses this)
       response.mc → number between 0 and 1 (Kienzle exponent)
       response.density → positive number (sanity: steel ~7.85 g/cm³, aluminum ~2.70)
       response.hardness → positive number (sanity: mild steel ~200 HB, tool steel ~60 HRC)
       response.tensile_strength → positive number (sanity: 4140 ~655 MPa)
     If kc1_1 is missing, zero, or NaN → this material CANNOT be used for calculations. CRITICAL gap.
     If density/hardness missing → material record is incomplete. Fix loader.

   MATERIAL SANITY CHECK (SK-5 — run on EVERY material_get response):
     Import validateMaterialSanity from src/validation/materialSanity.ts (created in P0-MS0a).
     This checks cross-parameter consistency per material class:
       4140 (alloy steel): density must be 7.5-8.1, hardness > 120 HB
       Ti-6Al-4V (titanium): density must be 4.3-4.8, hardness > 250 HB
       316SS (stainless): density must be 7.5-8.1, hardness > 120 HB
     If sanity check FAILS → DATA SWAP: material name doesn't match parameters. CRITICAL finding.
     This catches the scenario where the database says "Ti-6Al-4V" but the parameters describe mild steel.
     An operator selecting titanium gets steel recommendations. Tool explosion risk.

8. prism_data action=material_get material="Ti-6Al-4V" → verify (effort=high)
9. prism_data action=material_get material="316SS"   → verify (effort=high)
10. prism_data action=material_get material="1045"    → verify (effort=high)
11. prism_data action=material_get material="D2"      → verify (effort=high)

   Each material_get uses structured output validation:
   Response MUST conform to material schema (all 127 params typed, no NaN).
   If structured output validation fails → material data is malformed → fix loader.

=== COUNT GATE ===
12. prism_data action=material_search query="*" limit=1 → loaded count
    MUST be >= 95% of 3518 (>= 3342).
    If <95%: diagnose remaining failures. Fix. Recount.
13. Append REGISTRY_AUDIT.md with material results.
14. Append ROADMAP_TRACKER.
```

**Rollback:** Revert loader changes. Rebuild.
**Exit:** Materials >95% loaded. 5 critical materials verified with structured outputs. Count documented.

---

## R1-MS1.5: Formula Definition Validation

**Effort:** ~12 calls | **Tier:** DEEP | **Context:** ~7KB
**Response Budget:** ~10KB throughput, ~5KB peak
**Entry:** R1-MS1 COMPLETE (materials loaded — formulas reference material params).

```
=== AUDIT FORMULA DEFINITIONS ===
1. prism_dev action=code_search pattern="taylor\|Taylor\|TAYLOR" path="src/" → Taylor tool life
2. prism_dev action=code_search pattern="kienzle\|Kienzle\|KIENZLE" path="src/" → Kienzle cutting force
3. prism_dev action=code_search pattern="kc1_1\|specificCuttingForce" path="src/" → specific cutting force
4. Read each formula implementation (BOUNDED: calculation functions, ~80 lines each).

=== VALIDATE WITH STRUCTURED OUTPUTS ===
5. For each formula, run a known-input test via prism_calc with structured output schema:
   Taylor: T = C / (Vc^n * fz^m * ap^p) — input known 4140 params, verify output structure
   Kienzle: Fc = kc1_1 * b * h^(1-mc) — input known params, verify output structure
   Specific cutting force: kc = kc1_1 * h^(-mc) — verify output structure

   Structured output schema ensures:
   - All numeric outputs are numbers (not strings, not NaN, not undefined)
   - Required fields present (Fc, T, kc, safety_score)
   - Ranges valid (Fc > 0, T > 0, safety_score 0-1)

6. If formula returns malformed structure → fix implementation → rebuild → retest.

=== CROSS-VALIDATE ===
7. Run same material through speed_feed AND cutting_force → verify consistent kc values.
8. Run Taylor with known data → verify tool life within expected range (industry reference).

=== DOCUMENT ===
9. Append REGISTRY_AUDIT.md: formula validation results.
10. Append ROADMAP_TRACKER.
```

**Rollback:** Revert formula fixes. Rebuild.
**Exit:** All formula definitions parsed. Structured outputs validate all calc returns. Cross-validation passes.

---

## R1-MS2: Machine + Tool + Alarm Loading

**Effort:** ~18 calls | **Tier:** DEEP | **Context:** ~8KB
**Response Budget:** ~15KB throughput, ~6KB peak
**Entry:** R1-MS1.5 COMPLETE.

```
=== MACHINES ===
1. Diagnose machine loader (same ARCHITECTURE as R1-MS1: loader→normalizer→validator→registry).
   The NORMALIZER logic differs per data type:
     Machines: normalize specs fields (power_kw, max_rpm, travel_x/y/z, spindle_taper).
     Expect: straightforward — machine specs are mostly numeric with consistent schema.
     Budget: ~3-4 calls for diagnosis + fix + verify.
2-4. Fix loader → build → verify count >= 95% of 824 (>= 783).
5. Spot check: prism_data action=machine_get machine="HAAS VF-2" (effort=high)
6. Spot check: prism_data action=machine_get machine="DMG MORI DMU 50" (effort=high)

=== TOOLS ===
7. Diagnose tool loader.
   Tools: normalize geometry fields (diameter, flute_length, helix_angle, coating, substrate).
   Expect: moderate — tool geometry is well-structured but coating/substrate may have string variants.
8-10. Fix loader → build → verify count >= 95% of 1944 (>= 1847).
11. Spot check: prism_data action=tool_get tool="carbide endmill 12mm" (effort=high)

=== ALARMS ===
12. Diagnose alarm loader.
    Alarms: normalize across 12 controller families (FANUC, HAAS, Siemens, Okuma, Mazak, etc.).
    Expect: HARDEST registry — 12 different field naming conventions per manufacturer.
    Each controller family may use different field names for the same concept.
    Budget: ~5-6 calls. May need per-family normalization branches in the normalizer.
13-15. Fix loader → build → verify count >= 95% of 9200 (>= 8740).
16. Spot check: prism_data action=alarm_decode controller="FANUC" alarm="414" (effort=high)
17. Spot check: prism_data action=alarm_decode controller="HAAS" alarm="108" (effort=high)
     Use structured output schema for alarm_decode (see PRISM_PROTOCOLS_CORE §Structured Outputs).

=== DOCUMENT ===
18. Update REGISTRY_AUDIT.md with all counts.
19. Append ROADMAP_TRACKER.
```

**Rollback:** Revert loader changes per registry type. Rebuild.
**Exit:** All 4 registries >95%. Spot checks pass with structured outputs. Counts documented.

---

## R1-MS3: Data Pipeline Integration

**Effort:** ~10 calls | **Tier:** STANDARD | **Context:** ~5KB
**Response Budget:** ~8KB throughput, ~4KB peak
**Entry:** R1-MS2 COMPLETE.

```
=== END-TO-END PIPELINE TESTS ===
1. Cold boot: restart MCP server → prism_dev action=health  [effort=low]
   → warm_start counts. ALL counts must match R1-MS2 documented counts (±1% for race conditions).
   If counts DON'T match → registry loading regressed. STOP. Debug before proceeding.
2. Pipeline: prism_data action=material_get material="4140"  [effort=high]
   → prism_calc action=speed_feed material="4140" operation="turning"  [effort=max, structured output]
   → Check: safety_score field exists and is >= 0.70.
   Must produce valid S(x) from real data. Structured output enforced on safety calc.
   FAIL: S(x) missing, NaN, < 0.70, or structured output validation rejects response.
3. Pipeline: prism_data action=alarm_decode controller="FANUC" alarm="414"  [effort=high, structured output]
   → prism_knowledge action=search query="[alarm description from decode]"  [effort=high]
   Must return meaningful resolution steps (not empty, not placeholder).
4. Pipeline: prism_data action=material_get material="Ti-6Al-4V"  [effort=high]
   → prism_calc action=cutting_force material="Ti-6Al-4V" operation="turning"  [effort=max, structured output]
   → prism_calc action=tool_life material="Ti-6Al-4V" operation="turning"  [effort=max, structured output]
   Full Taylor chain with structured output validation on both steps.

=== CONSISTENCY ===
5. Run pipeline test 1 three times → results must be deterministic (same inputs → same outputs).
6. If inconsistent → debug source of non-determinism (floating point? cache? race condition?).

=== DOCUMENT ===
7. Append REGISTRY_AUDIT.md: pipeline test results.
8. Append ROADMAP_TRACKER.
```

**Exit:** Data flows end-to-end. Structured outputs validate all calc returns. Results deterministic.

---

## R1-MS4: Coverage Audit + Gap Analysis

**Effort:** ~8 calls | **Tier:** STANDARD | **Context:** ~4KB
**Response Budget:** ~6KB throughput, ~3KB peak
**Entry:** R1-MS3 COMPLETE.

```
1. For each registry: (loaded count / expected count) * 100 = coverage %  [effort=high — analytical reasoning]
   prism_data action=material_search query="*" limit=1  [effort=high] → material count
   prism_data action=machine_search query="*" limit=1  [effort=high] → machine count
   prism_data action=tool_search query="*" limit=1  [effort=high] → tool count (if action exists)
   prism_knowledge action=stats  [effort=low] → alarm count (from knowledge stats)
   Calculate: count / expected × 100 for each.
2. For <100% registries: categorize gaps  [effort=high — requires reasoning about failure patterns]:
   - PARSE FAILURE: data exists but loader rejects it (fixable — loader code change)
   - MISSING DATA: data file doesn't contain entry (document for R3 data campaigns)
   - SCHEMA MISMATCH: data structure changed (fixable with migration chain from §Code Standards)
   HOW to categorize: prism_dev action=code_search pattern="parse.*error\|skip.*invalid" path="src/"  [effort=high]
   → Read loader error logs or error handling → determine which category each gap falls into.
3. PARSE FAILUREs with count >50: escalate to fix NOW  [effort=high]
   (one more loader fix cycle: diagnose → str_replace → build → recount)
4. All others: prism_doc action=append name=PHASE_FINDINGS.md  [effort=low]
   content="[R1] IMPORTANT: R3 backlog — [N] MISSING DATA gaps, [N] SCHEMA MISMATCH gaps"
5. prism_doc action=append name=REGISTRY_AUDIT.md  [effort=low]
   content="COVERAGE AUDIT: Materials [N]%, Machines [N]%, Tools [N]%, Alarms [N]% | Gaps: [categorized]"
6. prism_doc action=append name=ROADMAP_TRACKER.md content="R1-MS4 COMPLETE [date]"  [effort=low]
```

**Exit:** Coverage audited. Gaps categorized. R3 backlog populated.

---

## R1-MS5: Data Quality Metrics + Phase Gate

**Effort:** ~10 calls | **Tier:** DEEP | **Context:** ~5KB
**Response Budget:** ~8KB throughput, ~4KB peak
**Entry:** R1-MS4 COMPLETE.

```
=== DATA QUALITY METRICS ===
1. Completeness: % of fields non-null across 5 critical materials (4140, Ti-6Al-4V, 316SS, 1045, D2)
2. Consistency: Same material queried via 3 paths (warm_start, knowledge, direct) → same params?
3. Validity: All numeric params within physical bounds (density > 0, hardness > 0, kc1_1 > 0)?
   Use structured output validation to enforce bounds on spot checks.

=== RALPH ASSESSMENT ===
4. prism_ralph action=assess target="R1 Registry Resurrection" (effort=max)
   Expected: Ralph >= B+ (data quality, not algorithmic quality — that's R2).
5. prism_omega action=compute target="R1 complete" (effort=max)
   Expected: Omega >= 0.70 (hard block).
   If Omega < 0.70 → identify weakest dimension → fix → recompute.

=== PHASE FINDINGS ===
6. Append PHASE_FINDINGS.md (R1 section):
   CRITICAL: Any registry <95% with known fix. Any formula validation failure.
   IMPORTANT: Gaps categorized for R3. Quality metric results.
   NOTE: Minor loader optimizations. Schema version observations.

=== MASTER_INDEX COHERENCE ===
7. Read MASTER_INDEX.md → verify counts still match live.
   If R1 changed any structure (unlikely but possible) → update.

8. Append ROADMAP_TRACKER: "R1-MS5 COMPLETE [date] — PHASE R1 COMPLETE"
9. Update PRISM_MASTER_INDEX.md: R1 status → "complete"
10. prism_session action=state_save
```

**Rollback:** Standard. Identify weakest metric → fix → reassess.
**Exit:** All registries >95%. Formulas validated with structured outputs. Ralph >= B+. Omega >= 0.70. R1 COMPLETE.

---

## R1-MS6: Registry Optimization (Optional — if session budget allows)

**Effort:** ~6 calls | **Tier:** STANDARD | **Context:** ~3KB
**Response Budget:** ~4KB throughput, ~2KB peak
**Entry:** R1-MS5 COMPLETE. Only if remaining session budget >15K tokens.

```
1. Profile registry load time: measure warm_start duration.
2. If >5s: identify bottleneck (file I/O? parsing? validation?).
3. Apply responseSlimmer to material_get if not already active.
4. Consider: lazy loading for rarely-accessed registries (alarm subcategories?).
5. If improvements made: build → verify counts unchanged → verify load time reduced.
6. Document optimizations in PHASE_FINDINGS.md.
```

**Exit:** Registry performance baselined. Optimizations documented if applied. Optional MS — no gate required.
