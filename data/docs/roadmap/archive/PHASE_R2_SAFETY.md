# PHASE R2: SAFETY TEST MATRIX — v13.9
# Status: not-started | Sessions: 1 | MS: 5 (MS0-MS4, including new MS1.5) | Role: Safety Test Engineer
# Pattern: Every MS follows SETUP → EXECUTE → VALIDATE → DOCUMENT
# v13.9: Cross-Audit Governance Hardening — artifact manifest, fault injection, test levels (XA-1,13,7).
# v13.5: LIMITATION category added to fix cycle (5th classification for formula boundaries — OB-1).
#         Alarm tolerance clarified: structured-field exact + description similarity (SK-4).
#         Reference values from src/data/referenceValues.ts for tolerance validation (SK-3).
#         Cross-field physics validation runs on every calc result (SK-1).
#         Parallel equivalence tolerance for R6 diff (CB-5).
#         Minimum VALID-DANGEROUS count (≥5). Regression sample selection guidance.
# v13.3: AI edge case generator specifies exact dispatcher (agent_execute opus).
#         Fix cycle has explicit code_search→file_read→str_replace→build→verify flow.
#         Triage step has effort annotation.
# v13.2: Parallel result sorting before flush. Tolerance import from source file (not hardcoded).
#         Content verification on MANDATORY flushes. Automated vitest suite creation in MS3.
# v13.1: Restored Canonical Tolerance Table reference (math accuracy separate from S(x) safety).
#         Added flush/checkpoint granularity per material group. All v13.0 additions retained.
# v13.0: NEW MS1.5 for AI-generated edge cases (Opus 4.6 novel reasoning at max effort).
#         Parallel material groups in MS0 via Agent Teams. Structured outputs on ALL safety calcs.
#         All safety calcs use effort=max. Session estimate stays at 1 (Agent Teams offset new MS).

---

## CONTEXT BRIDGE

WHAT CAME BEFORE: R1 loaded ALL registry data >95%. Materials 3518+, Machines 824+, Tools 1944+, Alarms 9200+. Formula definitions (Taylor, Kienzle, specific cutting force) validated with structured outputs. REGISTRY_AUDIT.md documents load counts and gap analysis. PHASE_FINDINGS.md has P0+R1 sections.

WHAT THIS PHASE DOES: Execute 50-calc test matrix across 10 material categories × 5 operation types. NEW: AI-generate 10-15 additional edge cases that human-defined tests would miss, leveraging Opus 4.6's near-doubled novel problem-solving capability (ARC-AGI-2: 68.8%). ALL calcs enforce S(x)>=0.70 with structured output validation. Build gate: green build with all tests passing.

WHAT COMES AFTER: R3 (Data Campaigns) expands coverage to full material library in batches. R4 (Enterprise) builds compliance and multi-tenant. R2 outputs: test matrix in build, edge case definitions, safety baselines, R2_CALC_RESULTS.md.

ARTIFACT MANIFEST (XA-1):
  REQUIRES: REGISTRY_AUDIT.md, PHASE_FINDINGS.md (R1 section)
  PRODUCES: R2_CALC_RESULTS.md, PHASE_FINDINGS.md (R2 section),
            src/__tests__/safetyMatrix.test.ts, src/__tests__/edgeCases.test.ts

---

## OBJECTIVES

1. 50 standard calculations (10 materials × 5 operations) all pass S(x) >= 0.70 AND within tolerance bounds
2. 10-15 AI-generated edge cases covering non-obvious dangerous inputs
3. ALL calculation outputs validated via structured output schemas (no NaN, no missing fields)
4. ALL safety calculations run at effort=max (deepest reasoning for life-critical math)
5. Build gate: npm run build passes with test matrix included
6. R2_CALC_RESULTS.md with all results, edge cases, and safety baselines
7. TEST LEVELS: L1-L5 required (unit + contract + integration + orchestration + safety invariants)

## FAULT INJECTION TEST (XA-13 — one test per phase)

```
R2 FAULT TEST: Feed NaN to safety calc → verify S(x) blocks it.
  WHEN: After R2-MS0 standard calcs are working (need a working baseline to break).
  HOW:  Craft an input where one parameter is NaN (or Infinity, or null):
        prism_calc action=speed_feed material="4140" operation="turning" [with NaN Vc override]
        EXPECTED: S(x) blocks the operation. Does NOT return NaN >= 0.70 = true (JS quirk).
        VERIFY: Safety block is logged as safety_decision_record with correlationId.
                Structured output schema rejects NaN (exclusiveMinimum:0 should catch this).
  PASS: NaN is caught by either schema validation or physics cross-check. Safety blocks.
  FAIL: NaN passes through and system returns "safe" for a garbage input.
  EFFORT: ~3 calls. Run during R2-MS1 (manual edge cases — natural place for adversarial inputs).
```

---

## CANONICAL TOLERANCE TABLE REFERENCE

ALL milestones in R2 validate against the tolerance bounds defined in PRISM_PROTOCOLS_CORE.md §Canonical Tolerance Table. Both gates must pass for each calculation:

  GATE 1 — SAFETY:   S(x) >= 0.70 (is this cut safe for the operator?)
  GATE 2 — ACCURACY: delta% within R2_TOLERANCES[category] (is the math correct?)

A calc that passes S(x) but fails tolerance is a BUG (correct safety conclusion, wrong intermediate math). A calc that passes tolerance but fails S(x) is WORKING AS INTENDED (accurate math, unsafe parameters). Both are documented differently in R2_CALC_RESULTS.md.

---

## R2-MS0: 50-Calc Test Matrix (Parallel Material Groups)

**Effort:** ~25 calls (was ~40 in v12.2 — parallel groups) | **Tier:** RELEASE | **Context:** ~10KB
**Response Budget:** ~25KB throughput, ~8KB peak (between flushes)
**Entry:** R1 COMPLETE. All registries >95%.

```
=== TEST MATRIX STRUCTURE ===
10 Material Categories: Alloy Steel (4140), Carbon Steel (1045), Tool Steel (D2),
  Stainless Steel (316SS), Titanium (Ti-6Al-4V), Aluminum (6061-T6), Cast Iron (GG25),
  Copper (C360), Inconel (718), Duplex Stainless (2205)

5 Operation Types per material: Turning, Milling, Drilling, Threading, Grooving

Total: 50 calculations. Each produces: Vc, fz, ap, n_rpm, Fc, tool_life_min, safety_score.
ALL use effort=max. ALL enforce structured output schema from PRISM_PROTOCOLS_CORE.

=== PARALLEL EXECUTION (Agent Teams) ===
GROUP A — Common Metals (parallel): 4140, 1045, 6061-T6, C360, GG25
  Execute all 25 calcs concurrently via prism_orchestrate action=swarm_execute pattern="parallel_batch"

GROUP B — Exotic/Hard Metals (parallel): Ti-6Al-4V, 316SS, D2, 718, 2205
  Execute all 25 calcs concurrently via parallel_batch

WHY PARALLEL: Each material × operation calc is fully independent.
No shared mutable state. Same results regardless of execution order.

=== FLUSH + CHECKPOINT PROTOCOL (per group) ===
→ SORT results by stable key before flushing (ORDERING RULE from §Parallel Execution):
   Sort by material.localeCompare() then operation.localeCompare().
   Use keyed entries: [4140:turning] Vc=180, fz=0.25, S(x)=0.82
   WHY: Unsorted parallel results make diff-based regression testing unreliable.
→ FLUSH Group A results: prism_doc action=append name=R2_CALC_RESULTS.md content="GROUP A: [sorted results]"
   VERIFY FLUSH: Calc results are NON-REGENERABLE (multi-step: material_get → calc → validate).
   If flush fails, retry once. If retry fails, DO NOT shed from context.
   CONTENT VERIFY (MANDATORY): Read back last 100 chars, confirm match.
→ MICRO-CHECKPOINT: prism_doc action=append name=ACTION_TRACKER.md
   content="R2-MS0 GROUP-A complete [date] — 25 calcs, [N pass] / [N fail]"

→ SORT + FLUSH Group B results: prism_doc action=append name=R2_CALC_RESULTS.md content="GROUP B: [sorted results]"
   VERIFY FLUSH + CONTENT VERIFY (same protocol as Group A).
→ MICRO-CHECKPOINT: "R2-MS0 GROUP-B complete [date] — 25 calcs, [N pass] / [N fail]"

WHY CHECKPOINT PER GROUP: If session ends after Group A, recovery restarts at Group B only.
  Without checkpoints: re-run all 50 calcs. With: re-run 25. Saves ~12 calls.

=== VALIDATION (after both groups complete) ===
For EACH of 50 results, apply BOTH gates:
  GATE 1 — SAFETY:   safety_score >= 0.70 (S(x) hard block — Law 1)
  GATE 2 — ACCURACY: delta% within R2_TOLERANCES[category] from §Canonical Tolerance Table
    Import tolerance values from src/schemas/tolerances.ts (created in P0-MS0 step 12d).
    DO NOT hardcode tolerance values in test code — single source of truth in tolerances.ts.
    Speed/feed: |actual - reference| / reference <= 0.15
    Cutting force: <= 0.20 | Tool life: <= 0.25 | Thread: <= 0.05
    Alarm decode: exact match | Edge case: <= 0.30 | Multi-op: <= 0.15
  ✓ All numeric fields are finite positive numbers (structured output guarantees this)
  ✓ Vc within physical bounds for material (e.g., Ti-6Al-4V Vc < 120 m/min)
  ✓ Fc within reasonable range (not 0, not 10x expected)
  ✓ tool_life_min > 0 and < 10000 (sanity bounds)

IF ANY safety_score < 0.70:
  → System correctly identified unsafe parameters. Document.
  → Adjust parameters and re-run, or document as KNOWN UNSAFE COMBINATION.

IF structured output validation rejects a result:
  → Code failure. Trace to calc function. Fix. Rebuild. Re-run.

=== DOCUMENT ===
prism_doc action=append name=R2_CALC_RESULTS.md content="STANDARD MATRIX SUMMARY: [50 results]"
Append ROADMAP_TRACKER.
```

**Exit:** 50 calcs executed (parallel). All S(x) >= 0.70 or documented. All structured outputs valid.

---

## R2-MS1: Manual Edge Cases (6 Defined)

**Effort:** ~8 calls | **Tier:** RELEASE | **Context:** ~5KB
**Response Budget:** ~8KB throughput, ~4KB peak
**Entry:** R2-MS0 COMPLETE.

```
=== 6 MANUALLY DEFINED EDGE CASES ===
Edge 1: Near-zero feed rate (fz = 0.001 mm/tooth) with 4140
Edge 2: Maximum hardness material (62 HRC tool steel)
Edge 3: Minimum diameter tool (0.5mm endmill)
Edge 4: Exotic material (Waspaloy / Hastelloy X) — may lack full kc1_1 data
Edge 5: Missing field simulation — material with kc1_1 = null
Edge 6: Negative depth of cut (ap = -1.0) — must be rejected

=== EXECUTE (effort=max, structured output) ===
1-6. Run each. Expected: valid result within edge_case tolerance (±30%) OR correct rejection.
     NO crashes. NO NaN. NO unhandled exceptions.
     For valid results: verify delta% <= R2_TOLERANCES.edge_case (0.30).

=== DOCUMENT ===
7-8. Append R2_CALC_RESULTS.md. Append ROADMAP_TRACKER.
```

**Exit:** 6 manual edge cases pass. System handles boundary conditions correctly.

---

## R2-MS1.5: AI-Generated Edge Cases (NEW in v13.0)

**Effort:** ~12 calls | **Tier:** RELEASE | **Context:** ~7KB
**Response Budget:** ~12KB throughput, ~5KB peak
**Entry:** R2-MS1 COMPLETE.
**v13.0 NEW: Leverages Opus 4.6 novel problem-solving (ARC-AGI-2: 68.8%, 2x Opus 4.5)**

```
=== PURPOSE ===
Human-defined edge cases cover obvious boundaries. Manufacturing has NON-OBVIOUS dangerous
input combinations that only emerge from deep reasoning about cutting PHYSICS, not just
formula MATH. Opus 4.6's novel reasoning can identify inputs that are mathematically valid
but physically dangerous — the exact cases that cause real-world tool explosions.

=== GENERATE EDGE CASES (effort=max — novel reasoning task) ===
1. Collect inputs for the prompt:
   1a. prism_dev action=file_read path="src/formulas/" start_line=1 end_line=200  [effort=low]
       → Extract Taylor, Kienzle, specific cutting force definitions.
       SIZE TARGET: Extract ONLY function signatures and key constants (~50 lines, not full impl).
   1b. prism_dev action=file_read path="src/schemas/safetyCalcSchema.ts"  [effort=low]
       → Extract the structured output schema (physical bounds, required fields).
       SIZE TARGET: Paste the full schema (~30 lines — it IS the constraint set).
   1c. prism_doc action=read name=R2_CALC_RESULTS.md  [effort=low]
       → Extract the 6 manual edge cases from MS1 (inputs + results).
       SIZE TARGET: Paste only inputs and results (~20 lines, not full diagnostic text).
   TOTAL PROMPT TARGET: <100 lines combined. If larger → summarize formula defs further.

2. prism_orchestrate action=agent_execute agent=opus  [effort=max]
   task="Given these formula definitions: [paste from 1a]
   And this output schema with physical bounds: [paste from 1b]
   And these 6 existing edge cases: [paste from 1c]
   Identify 10-15 input combinations that are mathematically valid but would
   produce dangerous or deceptive results in real CNC machining. Focus on:
   - Taylor curve inflection points (small input change → large output swing)
   - Materials with identical kc1_1 but different mc (appears similar, cuts differently)
   - Calculated RPM at machine maximum (resonance risk)
   - Hardness unit mismatches (HRC vs HB lookup errors)
   - Duplex stainless/superalloy properties that confuse standard formulas
   - Feed rates valid per formula but causing built-up-edge at low speed
   - Depth of cut at exactly tool flute length (deflection risk)
   - Coolant-dependent materials run without coolant flag
   - Multi-pass operations where total depth exceeds material thickness
   - Thread operations approaching minimum wall thickness
   Format: JSON array of { material, operation, params: {Vc, fz, ap, ...}, danger_type, explanation }"

   WHY agent_execute with opus: This is a NOVEL REASONING task, not a structured calculation.
   The agent needs full Opus 4.6 adaptive thinking at effort=max to identify non-obvious dangers.
   Output is unstructured analysis — classify results in step 3.
   TIMEOUT: Use apiCallWithTimeout with 120s (not default 30s — this is a max-effort novel task).
   RESPONSE HANDLING: The agent may return JSON mixed with reasoning text.
     Look for [ ... ] JSON array block in response → parse with JSON.parse().
     If parse fails → extract entries manually from prose. If no parseable structure → re-prompt:
     "Respond ONLY with a JSON array. No explanations outside the array."

3. Classify each generated case  [effort=high — requires metallurgical judgment]:
   VALID-DANGEROUS: Input is real/plausible AND the danger is physically meaningful → TEST IT (steps 4-8)
   THEORETICAL: Danger is real but input requires impossible machine setup → DOCUMENT only
   ALREADY-COVERED: Similar to one of the 6 manual edge cases → SKIP

   MINIMUM: At least 5 VALID-DANGEROUS cases must be tested.
   If classification yields <5 VALID-DANGEROUS:
     Re-prompt the agent: "Focus specifically on [area with fewest edge cases from MS1]."
     OR: Promote 1-2 THEORETICAL cases to VALID-DANGEROUS if they can be simulated with available data.

=== EXECUTE VALID-DANGEROUS CASES (effort=max, structured output) ===
3-8. Run each through calc chain. Document input, expected, actual, pass/fail.

=== ANALYZE ===
9. INCORRECT/DANGEROUS output → CRITICAL finding → propose fix for MS2.
10. Correctly identified danger → PASS. Document safety_score and warning.

=== DOCUMENT ===
11. Append R2_CALC_RESULTS.md. Add edge case definitions to regression test suite.
12. Append ROADMAP_TRACKER.
```

**Exit:** 10-15 AI edge cases identified. VALID-DANGEROUS cases tested. Failures → CRITICAL findings.

---

## R2-MS2: Fix Cycle

**Effort:** ~12 calls | **Tier:** DEEP | **Context:** ~6KB
**Entry:** R2-MS1.5 COMPLETE.

```
=== TRIAGE all failures from MS0 + MS1 + MS1.5  [effort=high — reasoning over failure patterns] ===
Read R2_CALC_RESULTS.md: prism_doc action=read name=R2_CALC_RESULTS.md  [effort=low]
Extract all FAIL entries. Classify each into exactly one category:

  FORMULA FIX:     Calc produces wrong numbers (Vc off by >tolerance, Fc negative). Root cause: math.
  VALIDATION FIX:  Calc produces right numbers but structured output rejects them. Root cause: schema.
  DATA FIX:        Calc uses wrong input data (material params missing/wrong). Root cause: registry.
  PARAM FIX:       Input parameters are valid but produce unsafe result. Root cause: parameter selection.
  LIMITATION:      Formula is mathematically correct but physically inadequate for these conditions (OB-1).
                   Examples: Taylor breaks down at very low speeds. Kienzle doesn't model built-up edge.
                   NOT a bug — the mathematical model has a boundary. Cannot be fixed with code changes.
                   Tag as CRITICAL in PHASE_FINDINGS.md: "MODEL-BOUNDARY: [formula] does not account
                   for [phenomenon] at [conditions]." These become future formula improvement requirements.

  CROSS-FIELD PHYSICS FAIL (SK-1): If crossFieldPhysics.ts flagged a result that passed schema:
    This is a mismatch between the formula output and physical reality.
    Classify as FORMULA FIX (if the formula produced impossible numbers) or
    LIMITATION (if the formula is correct but physics validation reveals a model boundary).

Priority order: FORMULA FIX first (wrong math is most dangerous), then VALIDATION, then DATA, then PARAM.
LIMITATION: document but do NOT attempt to fix — these are architectural, not bugs.

=== FIX (safety-critical first, one fix at a time) ===
For each FORMULA and VALIDATION fix:
  a. Locate the function:
     prism_dev action=code_search pattern="[formula_name]\|[function_name]" path="src/"  [effort=high]
  b. Read BOUNDED section:
     prism_dev action=file_read path="[file from step a]" start_line=[match_line-10] end_line=[match_line+50]  [effort=low]

  FORMULA FIX DIAGNOSTIC (distinguish formula bug from data bug):
     i.   Record: input params, expected output, actual output, delta%.
     ii.  HAND-CALCULATE the formula with the same inputs (calculator / mental math):
          Taylor: T = C / (Vc^n) → plug in material's C and n constants from material_get.
          Kienzle: Fc = kc1_1 * b * h^(1-mc) → plug in material's kc1_1 and mc.
     iii. If your hand-calc matches ACTUAL → formula is RIGHT, reference data is WRONG → reclassify as DATA FIX.
          If your hand-calc matches EXPECTED → formula implementation has a BUG → find it in code.
          If your hand-calc matches NEITHER → constants (kc1_1, n, mc) may be wrong for this material.
     iv.  Common formula bugs:
          - Exponent sign (h^(1-mc) vs h^(mc-1) → inverts the curve)
          - Unit mismatch (mm vs m in Vc calculation → 1000x error)
          - Missing conversion factor (Vc in m/min, formula expects m/s → divide by 60)

  c. Apply fix: str_replace on the specific calculation logic. ONE fix per str_replace.
  d. Build: prism_dev action=build target=mcp-server  [effort=medium]
  e. Re-run the failing test at effort=max with structured output:
     prism_calc action=[speed_feed|cutting_force|tool_life] material="[material]" operation="[op]"  [effort=max, structured output]
  f. Verify fix: result now within R2_TOLERANCES[category] AND S(x) >= 0.70.
  g. Regression check: re-run 3 SPECIFIC passing tests from MS0 (not random):
     - 1 from Group A common metals (e.g., 4140 turning — baseline common case)
     - 1 from Group B exotic metals (e.g., Ti-6Al-4V milling — different formula path)
     - 1 from the MS1 edge case set (e.g., near-zero feed rate — boundary behavior)
     This ensures the fix didn't break common, exotic, OR boundary behavior.
     If ANY regressed → REVERT the fix (git checkout HEAD~1 -- [file]) → try a different approach.

=== AI VALIDATION ADDITIONS ===
New validation rules from MS1.5 (RPM machine-max, coolant-required, depth vs flute length):
  For each new rule:
  a. prism_dev action=code_search pattern="validateInput\|inputValidation" path="src/"  [effort=high]
  b. Read the input validation module (BOUNDED).
  c. Add new validation check via str_replace — fires BEFORE calc, not after.
     Example: if (ap > tool.flute_length) throw new SafetyBlockError("Depth exceeds flute length", 0.0);
  d. Build → verify new validation catches the AI-generated edge case → verify existing tests still pass.

=== DOCUMENT ===
prism_doc action=append name=R2_CALC_RESULTS.md content="FIX CYCLE: [N fixes applied, N regressions caught, N new validations]"  [effort=low]
prism_doc action=append name=ROADMAP_TRACKER.md content="R2-MS2 COMPLETE [date]"  [effort=low]
```

**Exit:** All fixable failures resolved. New validation rules added. No regressions.

---

## R2-MS3: Build Gate + Phase Completion

**Effort:** ~12 calls | **Tier:** RELEASE | **Context:** ~6KB
**Entry:** R2-MS2 COMPLETE.

```
=== FULL RE-RUN ===
1. npm run build → must pass.
2. Re-run 5 critical calcs (mixed materials × operations) at effort=max.
   Validate: S(x) >= 0.70 AND delta% within R2_TOLERANCES[category].
   Import tolerances from src/schemas/tolerances.ts (not hardcoded).
3. Re-run 3 most dangerous AI-generated edge cases at effort=max. All pass/reject correctly.

=== AUTOMATE TEST MATRIX (cross-cutting concern A) ===
3b. Convert the 50-calc matrix + 6 manual edge cases + AI edge cases into vitest tests:
    Create src/__tests__/safetyMatrix.test.ts:
      import { R2_TOLERANCES } from '../schemas/tolerances';
      for each material × operation: test that S(x) >= 0.70 AND delta <= tolerance.
    Create src/__tests__/edgeCases.test.ts:
      Test each edge case produces expected result or correct rejection.
    npm test → ALL tests pass.
    WHY: "npm test" is the R6 regression gate. By R6, every calc must run automatically in CI.
    Building the test suite here (where the calcs are fresh) is 10x cheaper than retrofitting in R6.

=== RALPH + OMEGA ===
4. prism_ralph action=assess target="R2 Safety Test Matrix" (effort=max) → Ralph >= A-
5. prism_omega action=compute target="R2 complete" (effort=max) → Omega >= 0.70

=== PHASE FINDINGS ===
6. Append PHASE_FINDINGS.md (R2 section):
   CRITICAL: AI edge cases revealing unknown dangerous inputs. Formula fixes changing S(x) >0.05.
   IMPORTANT: New validation rules. Edge case patterns for R3 batch testing.
   NOTE: Parallel execution timing. Sensitivity observations.

=== COMPLETION ===
7. Verify MASTER_INDEX.md counts match live.
8. Append ROADMAP_TRACKER: "R2-MS3 COMPLETE — PHASE R2 COMPLETE"
9. Update PRISM_MASTER_INDEX.md: R2 status → "complete"
10. Write R2_CALC_RESULTS.md final summary.
11. prism_session action=state_save
```

**Exit:** Build passes. Ralph >= A-. Omega >= 0.70. Safety baseline established. R2 COMPLETE.

---

## R2-MS4: Uncertainty Quantification (Optional)

**Effort:** ~8 calls | **Entry:** R2-MS3 COMPLETE. Only if budget >15K tokens.

```
1. Run 5 critical calcs with ±5% input perturbation.
2. safety_score varies >0.10 → HIGH SENSITIVITY → flag for R3.
3. safety_score varies <0.02 → ROBUST.
4. Document in R2_CALC_RESULTS.md.
```

**Exit:** Sensitivity mapped. Optional MS — no gate required.
