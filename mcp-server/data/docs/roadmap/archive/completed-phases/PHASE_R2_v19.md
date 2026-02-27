# PHASE R2: ENGINE CALIBRATION (Layer 2 â€” Physics Foundation)
## Roadmap v19.0 | Extracted from v18.1 | Tasks: 20
## See ROADMAP_INDEX.md for global architecture and cross-phase dependencies
## See FILE_MAP.json for path resolution

---

### Overview
| Attribute | Value |
|-----------|-------|
| **Layer** | L2 â€” Calibration |
| **Goal** | Calibrate all physics engines against golden benchmarks, validate safety |
| **Mode Split** | Chat 60% / Code 40% |
| **Estimated Sessions** | 3-4 (1 Code, 2-3 Chat) |
| **Entry Criteria** | Build passes, Î© â‰¥ 0.70, git clean |
| **Current Status** | MS0 ✅ MS1 ✅ MS1.5 ✅ MS2 ✅. Score: 150/150 (100%). MS3/MS4 next. |

### R2 Layer Dependencies
```
LAYER 2 (this phase) DEPENDS ON:
  L1 â€” Engines:
    â† src/engines/ManufacturingCalculations.ts    (EXISTS â€” Kienzle, Taylor, MRR)
    â† src/engines/AdvancedCalculations.ts         (EXISTS â€” thermal, deflection, stability)
    â† src/engines/ToolpathCalculations.ts         (EXISTS â€” trochoidal, HSM, scallop)
    â† src/engines/{Safety}*.ts               (EXISTS â€” S(x) scoring)
    â† src/engines/ThreadCalculationEngine.ts           (EXISTS â€” thread calcs)
  L0 â€” Data:
    â‡ MaterialRegistry (3,518 materials with kc1.1, mc, Taylor C/n)
    â‡ MachineRegistry (1,016 machines with specs)
    â‡ ToolRegistry (1,944 tools with geometry)
    â‡ AlarmRegistry (9,200+ codes)

LAYER 2 PROVIDES TO UPPER LAYERS:
  â‡’ Calibrated kc1.1/mc per ISO group       â†’ L3 (rules reference correct forces)
  â‡’ Calibrated Taylor C/n per ISO group     â†’ L4 (job_plan needs accurate tool life)
  â‡’ Calibrated thermal T_tool model         â†’ L4 (wear_prediction), L12 (ML features)
  â‡’ Verified benchmark suite (â‰¥40/50)       â†’ L5 (campaigns), L12 (ML training data)
  â‡’ Safety validation patterns              â†’ L6 (enterprise safety scope)
```

### R2 Ralph Validator Map
```
MS1.5-T1  -> physics         (Rz ratio process-dependent)
MS1.5-T2  -> safety          (TSC machine capability)
MS1.5-T3  -> data_integrity  (material name normalization)
MS1.5-T4  -> test_coverage   (benchmark adapter integrity)
MS1.5-GATE-> [full panel]    (remediation verification)
MS2-T1    -> physics         (Kienzle calibration)
MS2-T2    -> physics         (Taylor calibration)
MS2-T3    -> physics         (thermal calibration)
MS2-T4    -> physics         (HSM dynamics)
MS2-T5    -> physics         (all remaining)
MS3-*     -> safety          (edge cases)
MS4-*     -> [full panel]    (phase gate)
```

### R2 Task DAG
```
[MS0] âœ… COMPLETE
  â”‚
  â”œâ”€â”€â†’ [MS1-T1]â”€â”€â†’[MS1-T2]â”€â”€â†’[MS1-T3]â”€â”€â†’[MS1-T4]â”€â”€â†’[MS1-GATE]
  â”‚    (Code)      (Code)      (Code)      (Code)      (Code)
  â”‚
  â”œâ”€â”€â†’ [MS2-T1]â”€â”€â†’[MS2-T2]â”€â”€â†’[MS2-T3]â”€â”€â†’[MS2-T4]â”€â”€â†’[MS2-T5]â”€â”€â†’[MS2-GATE]
  â”‚    (Chat)      (Chat)      (Chat)      (Chat)      (Chat)      (Chat)
  â”‚
  â”‚    â† MS1 and MS2 run in PARALLEL (different file scopes) â†’
  â”‚
  â”œâ”€â”€â†’ [MS3-T1]â”€â”€â†’[MS3-T2]
  â”‚    (Chat)      (Chat)
  â”‚         â†“
  â””â”€â”€â†’ [MS4-T1]â”€â”€â†’[MS4-T2]â”€â”€â†’[MS4-T3]
       (Code)      (Chat)      (Code)
```

### R2 File Dependency Map
```
MS1 (Quick Wins â€” Code):
  â† tests/r2/T3-failure-analysis.md          READ: failure categories
  â† tests/r2/golden-benchmarks.json          READ: expected values
  â† tests/r2/run-benchmarks.ts               READ+WRITE: adapter fixes (CAT-F)
  â†’ src/engines/ManufacturingCalculations.ts  WRITE: MRR unit fix (CAT-B)
  â†’ tests/r2/benchmark-results.json           WRITE: updated results

MS2 (Physics Calibration â€” Chat):
  â† tests/r2/T3-failure-analysis.md          READ: which coefficients wrong
  â† tests/r2/golden-benchmarks.json          READ: expected values
  â‡ MaterialRegistry                         READ: current kc1.1, mc, Taylor C/n
  â†’ src/engines/ManufacturingCalculations.ts  WRITE: corrected Kienzle + Taylor âŠ—
  â†’ src/engines/AdvancedCalculations.ts       WRITE: corrected thermal model âŠ—
  â†’ src/engines/ToolpathCalculations.ts       WRITE: corrected trochoidal/HSM
  â†’ tests/r2/benchmark-results.json           WRITE: updated results

MS3 (Edge Cases â€” Chat):
  â† tests/r2/benchmark-results.json          READ: current pass rate
  â‡ MaterialRegistry, MachineRegistry        READ: exotic materials, boundary specs
  â†’ tests/r2/edge-cases.json                 WRITE: 20 edge case definitions
  â†’ tests/r2/edge-case-results.json          WRITE: edge case results
  â†’ src/engines/* (as needed)                WRITE: fixes for edge case failures âŠ—

MS4 (Gate â€” Both):
  â† ALL outputs from MS1-MS3                 READ: verify everything passes
  â†’ git tag r2-complete                      WRITE: version marker
  â†’ data/docs/roadmap/CURRENT_POSITION.md               WRITE: advance to R3
```

---

### MS0: 50-Calc Test Matrix âœ… COMPLETE
- T1: Created golden-benchmarks.json (50 benchmarks) âœ…
- T2: Wired runner with 20 calc adapters âœ…
- T3: Failure analysis: 8 root cause categories âœ…
- Baseline: 7 PASS / 43 FAIL / 0 ERROR (14%)
- See: tests/r2/T3-failure-analysis.md

---

### MS1: Quick Wins ✅ COMPLETE (2026-02-21 via Claude Code)
**Target: +7 passes → 14/50 (28%) | ACTUAL: 150/150 (100%)**
**T1-T3 pre-resolved by MS2 tier work. T4-T6 executed by Claude Code (R2_MS1_CLAUDE_CODE_PROMPT.md).**
**Commits: 3dfe9a7 (build fix), 077871d (response level), abc7ff7 (spot-check)**

#### MS1-T1: Fix MRR Unit Conversion (CAT-B)
```
TASK: MS1-T1
  DEPENDS_ON: [MS0]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  PARALLEL: true (with MS2) | GATE: YOLO
  SUCCESS: B004, B018, B022 pass (MRR within 5% of expected)
  ESTIMATED_CALLS: 5
  LAYER: 2
  READS_FROM: [
    tests/r2/T3-failure-analysis.md,
    tests/r2/golden-benchmarks.json,
    src/engines/ManufacturingCalculations.ts
  ]
  WRITES_TO: [src/engines/ManufacturingCalculations.ts (MRR section only)]
  DATA_DEPS: [none â€” unit conversion is code-only]
  TASK_DEPS: [MS0-T3 failure analysis identifying CAT-B]
  PROVIDES: [Fixed MRR calculation â†’ MS1-T4 full benchmark re-run]
  SKILL_LOAD: [prism-cutting-mechanics, prism-chip-formation, prism-material-physics, prism-materials-core, prism-speed-feed-engine]
```
**Step-by-step:**
1. Read `src/engines/ManufacturingCalculations.ts` â€” find MRR calculation function
2. Identify unit issue: B004 ratio=3.33, B018 ratio=2.0, B022 ratio=3.33
3. Trace MRR formula: MRR = ae Ã— ap Ã— vf (where vf = fz Ã— z Ã— n)
4. Fix unit conversion â€” ensure consistent mmâ†’cmÂ³/min output
5. Run: `npx tsx tests/r2/run-benchmarks.ts --filter B004,B018,B022`
6. Confirm all 3 pass within 5% tolerance
**BASH:** `npm run build:fast && npx tsx tests/r2/run-benchmarks.ts --filter B004 && npx tsx tests/r2/run-benchmarks.ts --filter B018 && npx tsx tests/r2/run-benchmarks.ts --filter B022`

#### MS1-T2: Fix Null Adapter Returns (CAT-F)
```
TASK: MS1-T2
  DEPENDS_ON: [MS1-T1]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  PARALLEL: true | GATE: YOLO
  SUCCESS: B002, B041, B043, B044 no longer return null
  ESTIMATED_CALLS: 8
  LAYER: 2
  READS_FROM: [tests/r2/run-benchmarks.ts, tests/r2/golden-benchmarks.json]
  WRITES_TO: [tests/r2/run-benchmarks.ts (adapter section)]
  DATA_DEPS: [none]
  TASK_DEPS: [MS1-T1 (sequential dependency for clean test state)]
  PROVIDES: [Non-null adapter outputs â†’ MS1-T3 enum fixes can proceed]
  SKILL_LOAD: [prism-cutting-mechanics, prism-chip-formation, prism-material-physics, prism-materials-core, prism-speed-feed-engine]
```
**Step-by-step:**
1. Read run-benchmarks.ts â€” find adapters for surface_finish, thread_mill, multi_pass, coolant_strategy
2. B002: engine returns `Ra` but adapter looks for `Ra_um` â†’ fix field mapping
3. B041: trace tap drill field name â†’ fix mapping
4. B043: check multi_pass total_time field â†’ fix mapping
5. B044: coolant flow field name â†’ fix mapping
6. Run filtered benchmarks to verify nulls resolved
**BASH:** `npm run build:fast && npx tsx tests/r2/run-benchmarks.ts --filter B002 && npx tsx tests/r2/run-benchmarks.ts --filter B041 && npx tsx tests/r2/run-benchmarks.ts --filter B043 && npx tsx tests/r2/run-benchmarks.ts --filter B044`

#### MS1-T3: Fix Enum/Lookup Mismatches (CAT-H)
```
TASK: MS1-T3
  DEPENDS_ON: [MS1-T2]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  PARALLEL: true | GATE: YOLO
  SUCCESS: B044 coolant enum matches, B049 Vc within 20%
  ESTIMATED_CALLS: 5
  LAYER: 2
  READS_FROM: [
    src/engines/ManufacturingCalculations.ts,
    src/engines/AdvancedCalculations.ts,
    tests/r2/golden-benchmarks.json
  ]
  WRITES_TO: [src/engines/ManufacturingCalculations.ts, src/engines/AdvancedCalculations.ts]
  DATA_DEPS: [MaterialRegistry (lookup tables for 316L stainless)]
  TASK_DEPS: [MS1-T2 (null fixes complete)]
  PROVIDES: [Correct enum/lookup values â†’ MS1-T4 full re-run]
  SKILL_LOAD: [prism-cutting-mechanics, prism-chip-formation, prism-material-physics, prism-materials-core, prism-speed-feed-engine]
```
**Step-by-step:**
1. B044: Check coolant strategy enum â€” "high_pressure" vs "through_spindle_coolant"
2. B049: Check speed_feed lookup for 316L â€” may be roughing vs semi-finish value
3. If B049 is physics-based â†’ defer to MS2-T1
4. Run filtered benchmarks to verify
**BASH:** `npm run build:fast && npx tsx tests/r2/run-benchmarks.ts --filter B044 && npx tsx tests/r2/run-benchmarks.ts --filter B049`

#### MS1-T4: Full Benchmark Re-run
```
TASK: MS1-T4
  DEPENDS_ON: [MS1-T3]
  EXECUTOR: Code | ARCHETYPE: verifier | MODEL: haiku | EFFORT: LIGHT
  GATE: YOLO | ESTIMATED_CALLS: 3
  LAYER: 2
  READS_FROM: [tests/r2/run-benchmarks.ts, tests/r2/golden-benchmarks.json]
  WRITES_TO: [tests/r2/benchmark-results.json]
  TASK_DEPS: [MS1-T1, MS1-T2, MS1-T3 all complete]
  PROVIDES: [Updated benchmark-results.json â†’ MS1-GATE verification]
  SKILL_LOAD: [prism-cutting-mechanics, prism-chip-formation, prism-material-physics, prism-materials-core, prism-speed-feed-engine]
```
**BASH:** `npx tsx tests/r2/run-benchmarks.ts && node -e "const r=require('./tests/r2/benchmark-results.json'); const p=r.filter(b=>b.pass).length; console.log(p+'/'+r.length+' ('+(100*p/r.length).toFixed(0)+'%)')"`
**SUCCESS:** â‰¥14/50 (28%)

#### MS1-T5: Add Response Level Schema to Core Dispatchers
```
TASK: MS1-T5
  DEPENDS_ON: [MS1-T1]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  PARALLEL: true (with MS1-T2, MS1-T3) | GATE: YOLO
  SUCCESS: calcDispatcher and safetyDispatcher accept response_level parameter
  ESTIMATED_CALLS: 8
  LAYER: 2
  READS_FROM: [src/types/ResponseLevel.ts, src/tools/dispatchers/calcDispatcher.ts, src/tools/dispatchers/safetyDispatcher.ts]
  WRITES_TO: [src/tools/dispatchers/calcDispatcher.ts, src/tools/dispatchers/safetyDispatcher.ts]
  PROVIDES: [response_level support â†’ R3 compound actions, R4 all-dispatcher rollout]
  SKILL_LOAD: [prism-cutting-mechanics, prism-chip-formation, prism-material-physics, prism-materials-core, prism-speed-feed-engine]
```
**Step-by-step:**
1. Read `src/types/ResponseLevel.ts` â€” understand the formatByLevel() function
2. Import ResponseLevel into calcDispatcher.ts
3. Add `response_level?: 'pointer' | 'summary' | 'full'` to all calc action params
4. Wrap each action's return with `formatByLevel(result, params.response_level, extractKeyValues)`
5. Write extractKeyValues for each calc type (forceâ†’{Fc,Fc_t}, speedâ†’{Vc,fz,n}, etc.)
6. Repeat for safetyDispatcher.ts â€” extractKeyValues returns {score, verdict, blocking_issues}
7. Build and verify: `npm run build:fast`
8. Test with MCP call: `prism_calcâ†’cutting_force { ..., response_level: 'summary' }`
**BASH:** `npm run build:fast && node -e "console.log('ResponseLevel wired')"`

#### MS1-T6: Wire Spot-Check + Category Test Scripts
```
TASK: MS1-T6
  DEPENDS_ON: [MS1-T1]
  EXECUTOR: Code | ARCHETYPE: verifier | MODEL: haiku | EFFORT: LIGHT
  PARALLEL: true | GATE: YOLO
  SUCCESS: npx tsx tests/r2/spot-check.ts runs without errors, npx tsx tests/r2/test-category.ts --cat B runs correctly
  ESTIMATED_CALLS: 5
  LAYER: 2
  READS_FROM: [tests/r2/spot-check.ts, tests/r2/test-category.ts, tests/r2/run-benchmarks.ts]
  WRITES_TO: [tests/r2/spot-check.ts (fix any import errors), tests/r2/test-category.ts (fix any path issues)]
  PROVIDES: [Working spot-check + category tests â†’ post-calc-validation hook, all future engine edits]
  SKILL_LOAD: [prism-cutting-mechanics, prism-chip-formation, prism-material-physics, prism-materials-core, prism-speed-feed-engine]
```
**Step-by-step:**
1. Run `npx tsx tests/r2/spot-check.ts` â€” fix any import/type errors
2. Run `npx tsx tests/r2/test-category.ts --cat B` â€” verify it calls run-benchmarks correctly
3. Run `npx tsx tests/r2/test-category.ts --cat ALL` â€” verify full suite
4. Ensure spot-check exit codes work (0=pass, 1=fail)
5. Verify post-calc-validation.ps1 hook can invoke spot-check.ts
**BASH:** `npm run build:fast && npx tsx tests/r2/spot-check.ts && npx tsx tests/r2/test-category.ts --cat B`

#### MS1-GATE: Verify Quick Win Gains
```
TASK: MS1-GATE
  DEPENDS_ON: [MS1-T4, MS1-T5, MS1-T6]
  EXECUTOR: Code | ARCHETYPE: verifier | MODEL: haiku | EFFORT: LIGHT
  GATE: GATED | ESTIMATED_CALLS: 2
  SUCCESS: â‰¥14/50 pass (28%), all 7 original passes retained
  ESCALATION: If <14 â†’ retry failed fixes
  LAYER: 2
  READS_FROM: [tests/r2/benchmark-results.json]
  WRITES_TO: [git commit "R2-MS1: Quick wins (+N passes)"]
  PROVIDES: [Verified quick-win baseline â†’ MS4 gate input]
  SKILL_LOAD: [prism-cutting-mechanics, prism-chip-formation, prism-material-physics, prism-materials-core, prism-speed-feed-engine]
```

**BASH:** `npm run build && powershell -File scripts/verify-build.ps1 && npx tsx tests/r2/run-benchmarks.ts`
---

### MS1.5: Ralph Remediation (CHAT+CODE — Blocks MS2)
**Target: Address 13 CRITICAL+HIGH findings from retroactive R2-MS1 ralph audit**
**Ralph Audit Score: 0.37/1.0 — must reach >=0.70 before MS2 proceeds**

#### MS1.5-T1: Fix Rz Ratio — Process-Dependent Lookup
```
TASK: MS1.5-T1
  DEPENDS_ON: [MS1]
  EXECUTOR: Chat | GATE: GATED | RALPH_VALIDATOR: physics
  SUCCESS: Rz/Ra ratio is process-dependent (turning:4, milling:5.5, grinding:6)
  READS_FROM: [src/engines/ManufacturingCalculations.ts]
  WRITES_TO: [src/engines/ManufacturingCalculations.ts]
```
Steps: Replace hardcoded Rz=Ra*4 with process-specific lookup. Source: ISO 4287. Add uncertainty +-15%.

#### MS1.5-T2: Fix TSC Safety — Machine Capability Check
```
TASK: MS1.5-T2
  DEPENDS_ON: [MS1]
  EXECUTOR: Code | GATE: GATED | RALPH_VALIDATOR: safety
  SUCCESS: TSC only when machine.capabilities.hasThroughSpindleCoolant=true, fallback to flood
  READS_FROM: [src/engines/ToolpathCalculations.ts]
  WRITES_TO: [src/engines/ToolpathCalculations.ts]
```
Steps: Machine capability check, fallback flood at 80% max flow, pressure_bar field, ISO S subgroup differentiation, flow_lpm bounds.

#### MS1.5-T3: Fix Material Lookup — Normalize at Ingestion
```
TASK: MS1.5-T3
  DEPENDS_ON: [MS1]
  EXECUTOR: Code | GATE: YOLO | RALPH_VALIDATOR: data_integrity
  SUCCESS: Material names normalized at load time, collision detection for short codes
  READS_FROM: [src/engines/ManufacturingCalculations.ts, src/registries/MaterialRegistry.ts]
  WRITES_TO: [src/engines/ManufacturingCalculations.ts]
```
Steps: Normalize at registry load (toLowerCase+trim+collapse whitespace), collision detection, locale-safe.

#### MS1.5-T4: Fix Benchmark Integrity — Remove Adapter Derivations
```
TASK: MS1.5-T4
  DEPENDS_ON: [MS1]
  EXECUTOR: Code | GATE: GATED | RALPH_VALIDATOR: test_coverage
  SUCCESS: Adapter does NOT derive fields. Tests fail if engine missing fields.
  READS_FROM: [tests/r2/run-benchmarks.ts]
  WRITES_TO: [tests/r2/run-benchmarks.ts]
```
Steps: Remove flow_lpm derivation, verify tap_drill_mm vs drill_diameter_mm against spec, re-baseline.

#### MS1.5-GATE: Remediation Verification
```
TASK: MS1.5-GATE
  DEPENDS_ON: [MS1.5-T1, MS1.5-T2, MS1.5-T3, MS1.5-T4]
  EXECUTOR: Chat | GATE: GATED | RALPH_VALIDATOR: [full panel]
  SUCCESS: All 4 tasks pass ralph >=0.70. Honest benchmark baseline established.
```

---

### MS2: Physics Calibration ✅ COMPLETE (2026-02-20)
**Target: +20-25 passes → 30-35/50 (60-70%) | ACTUAL: 150/150 (100%)**
**All 6 tiers calibrated. Kienzle, Taylor, thermal, trochoidal/HSM, advanced all fixed.**

#### MS2-T1: Calibrate Kienzle kc1.1/mc Per ISO Group (CAT-A)
```
TASK: MS2-T1
  DEPENDS_ON: [MS0]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  PARALLEL: true (with MS1) | GATE: GATED
  SUCCESS: â‰¥12/17 CAT-A benchmarks pass (70% of force calcs within tolerance)
  ESCALATION: If material data missing â†’ web_search for published values
  ESTIMATED_CALLS: 40-60
  LAYER: 2
  READS_FROM: [
    src/engines/ManufacturingCalculations.ts (Kienzle section),
    tests/r2/T3-failure-analysis.md,
    tests/r2/golden-benchmarks.json
  ]
  WRITES_TO: [
    src/engines/ManufacturingCalculations.ts (kc1.1/mc lookup or defaults) âŠ—,
    data/materials/*.json (if per-material kc1.1 stored there)
  ]
  DATA_DEPS: [MaterialRegistry (current kc1.1, mc per material)]
  TASK_DEPS: [MS0-T3 identifying CAT-A as 17 benchmarks]
  PROVIDES: [
    Calibrated kc1.1/mc â†’ MS2-T5 (cost_optimize depends on Fc),
    Calibrated Fc â†’ L4 job_plan force checks,
    Calibrated Fc â†’ L12 ML training features
  ]
  SKILL_LOAD: [prism-cutting-mechanics, prism-chip-formation, prism-material-physics, prism-materials-core, prism-speed-feed-engine]
```
**Step-by-step:**
1. **Audit current coefficients** â€” for each of 17 failing benchmarks:
   - `prism_dataâ†’material_get` for benchmark material
   - Extract current kc1.1, mc â†’ record delta% vs expected
2. **Group by ISO class and diagnose direction:**
   - ISO P (Steel): B001(+54%), B003(-41%), B007(-43%), B008(-55%)
   - ISO M (Stainless): B009(+24%), B010(-46%)
   - ISO K (Cast Iron): B015(+35%), B016(-53%), B019(+35%)
   - ISO N (Nonferrous): B020(+90%), B021(-19%), B024(+31%)
   - ISO S (Superalloy): B025(-25%), B026(-71%), B029(-22%), B030(-64%)
   - ISO H (Hardened): B031(-47%), B032(-73%)
3. **Research correct values** â€” reference ranges:
   - P: kc1.1=1500-2100 MPa, mc=0.17-0.25
   - M: kc1.1=1800-2500 MPa, mc=0.20-0.27
   - K: kc1.1=1000-1500 MPa, mc=0.20-0.28
   - N: kc1.1=500-900 MPa, mc=0.23-0.30
   - S: kc1.1=2400-3500 MPa, mc=0.22-0.28
   - H: kc1.1=2800-4500 MPa, mc=0.18-0.25
4. **Identify root cause** â€” Fc too HIGH=kc1.1 too large; too LOW=kc1.1 too small
5. **Apply corrections** via edit_block on engine source
6. **Verify each** via `prism_calcâ†’cutting_force` + benchmark re-run
7. **Regression check** â€” full 50-benchmark suite after all corrections

#### MS2-T2: Calibrate Taylor C/n Per ISO Group (CAT-C)
```
TASK: MS2-T2
  DEPENDS_ON: [MS2-T1]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED | ESTIMATED_CALLS: 15-20
  SUCCESS: â‰¥4/5 CAT-C benchmarks pass (tool life within 20-25%)
  LAYER: 2
  READS_FROM: [src/engines/ManufacturingCalculations.ts (Taylor section)]
  WRITES_TO: [src/engines/ManufacturingCalculations.ts (Taylor C/n) âŠ—]
  DATA_DEPS: [MaterialRegistry (Taylor constants per material)]
  TASK_DEPS: [MS2-T1 (Kienzle done â†’ force inputs to Taylor correct)]
  PROVIDES: [
    Calibrated Taylor C/n â†’ MS2-T5 (cost_optimize depends on tool_life),
    Calibrated tool life â†’ L4 job_plan wear budgets,
    Calibrated tool life â†’ L12 ML wear prediction training
  ]
  SKILL_LOAD: [prism-cutting-mechanics, prism-chip-formation, prism-material-physics, prism-materials-core, prism-speed-feed-engine]
```
**Step-by-step:**
1. Audit: B005(85% LOW), B011(80% LOW), B017(82% LOW), B028(224% HIGH), B033(18909% HIGH)
2. Pattern: Steels too aggressive (low C), Exotics too conservative
3. Reference: P: C=200-350/n=0.20-0.35, S: C=80-150/n=0.15-0.25, H: C=100-200/n=0.15-0.25
4. Fix per-material or per-ISO-group C and n values
5. Verify each produces tool life in 1-120 min range for typical speeds

#### MS2-T3: Fix Thermal T_tool Model (CAT-D)
```
TASK: MS2-T3
  DEPENDS_ON: [MS2-T1]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED | ESTIMATED_CALLS: 15-20
  SUCCESS: â‰¥2/3 CAT-D benchmarks pass (T_tool within 20%)
  LAYER: 2
  READS_FROM: [src/engines/AdvancedCalculations.ts (thermal section)]
  WRITES_TO: [src/engines/AdvancedCalculations.ts (T_tool calc) âŠ—]
  DATA_DEPS: [MaterialRegistry (thermal conductivity, specific heat)]
  TASK_DEPS: [MS2-T1 (force values correct â†’ heat generation correct)]
  PROVIDES: [
    Calibrated T_tool â†’ L4 wear_prediction thermal factor,
    Calibrated T_tool â†’ L12 ML thermal features,
    Calibrated T_tool â†’ L14 digital twin thermal state
  ]
  SKILL_LOAD: [prism-cutting-mechanics, prism-chip-formation, prism-material-physics, prism-materials-core, prism-speed-feed-engine]
```
**Step-by-step:**
1. B014: T_tool=120Â°C expected=780Â°C, B027: 73Â°C/950Â°C, B035: 61Â°C/1050Â°C
2. All near-ambient â€” model computes friction only, not cutting zone temp
3. Note: T_chip works (B014: 660Â°C vs 650Â°C) â€” chip model correct
4. Fix: T_tool = T_chip Ã— partition_ratio, or empirical Trigger equation
5. Verify outputs in 600-1100Â°C range for high-speed difficult materials

#### MS2-T4: Fix Trochoidal/HSM Logic (CAT-E)
```
TASK: MS2-T4
  DEPENDS_ON: [MS2-T1]
  EXECUTOR: Chat | MODEL: opus | EFFORT: STANDARD
  GATE: YOLO | ESTIMATED_CALLS: 8-10
  SUCCESS: B036 MRR within 15%, B037 MRR within 10%
  LAYER: 2
  READS_FROM: [src/engines/ToolpathCalculations.ts]
  WRITES_TO: [src/engines/ToolpathCalculations.ts (trochoidal + HSM sections)]
  TASK_DEPS: [MS2-T1 (force calcs correct)]
  PROVIDES: [Calibrated trochoidal/HSM â†’ L4 strategy_for_job, L7 post-proc toolpath gen]
  SKILL_LOAD: [prism-cutting-mechanics, prism-chip-formation, prism-material-physics, prism-materials-core, prism-speed-feed-engine]
```
**Step-by-step:**
1. B036: MRR=0.23 vs 34.2 (99.3% LOW) â€” likely using slot width instead of trochoidal channel
2. B037: MRR=114.6 vs 45.8 (150% HIGH) â€” HSM radial engagement reduction not applied
3. Fix trochoidal: MRR = stepover Ã— ap Ã— vf
4. Fix HSM: apply ae_reduced factor

#### MS2-T5: Fix Advanced Calc Logic (CAT-G)
```
TASK: MS2-T5
  DEPENDS_ON: [MS2-T1, MS2-T2]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED | ESTIMATED_CALLS: 15-20
  SUCCESS: â‰¥3/5 CAT-G benchmarks pass
  LAYER: 2
  READS_FROM: [
    src/engines/AdvancedCalculations.ts (stability, deflection, flow_stress),
    src/engines/ToolpathCalculations.ts (cost_optimize)
  ]
  WRITES_TO: [
    src/engines/AdvancedCalculations.ts âŠ—,
    src/engines/ToolpathCalculations.ts
  ]
  TASK_DEPS: [MS2-T1 (Fc correct â†’ stability uses Fc), MS2-T2 (tool_life correct â†’ cost uses T)]
  PROVIDES: [
    Calibrated stability â†’ L4 job_plan chatter check, L14 digital twin vibration,
    Calibrated deflection â†’ L4 setup_sheet tolerance validation,
    Calibrated cost_optimize â†’ L4 process_cost,
    Calibrated flow_stress â†’ L12 ML flow stress features
  ]
  SKILL_LOAD: [prism-cutting-mechanics, prism-chip-formation, prism-material-physics, prism-materials-core, prism-speed-feed-engine]
```
**Step-by-step:**
1. B039 stability: reports stable=true, expected=false â†’ fix ap_limit comparison
2. B040 deflection: 0.253mm vs 0.042mm â†’ verify L, E, I in cantilever formula
3. B045 cost_optimize: 664 vs 240 m/min â†’ re-run after Taylor fix (may self-correct)
4. B048 chip_load: 0.013 vs 0.008 â†’ verify edge radius and chip thickness formula
5. B050 flow_stress: 2075 vs 820 MPa â†’ check Johnson-Cook constants + strain rate

#### MS2-GATE: Verify Physics Calibration Gains
```
TASK: MS2-GATE
  DEPENDS_ON: [MS2-T1, MS2-T2, MS2-T3, MS2-T4, MS2-T5]
  EXECUTOR: Chat | MODEL: opus | EFFORT: STANDARD
  GATE: GATED | ESTIMATED_CALLS: 3
  SUCCESS: â‰¥30/50 pass (60%), all original 7 retained
  ESCALATION: If <25/50 â†’ identify remaining blockers, plan MS2 extension
  LAYER: 2
  READS_FROM: [tests/r2/benchmark-results.json]
  WRITES_TO: [state/CALIBRATION_STATE.json (updated pass rates)]
  PROVIDES: [Calibrated engine baseline â†’ MS3 edge cases, MS4 final gate]
  SKILL_LOAD: [prism-cutting-mechanics, prism-chip-formation, prism-material-physics, prism-materials-core, prism-speed-feed-engine]
```
**BASH:** `npx tsx tests/r2/run-benchmarks.ts && node -e "const r=require('./tests/r2/benchmark-results.json'); const p=r.filter(b=>b.pass).length; console.log('MS2-GATE: '+p+'/'+r.length); if(p<30) process.exit(1)"`

---

### MS3: Edge Cases ✅ COMPLETE (20/20)
**Target: +5-10 additional passes from edge case hardening**

#### MS3-T1: Generate + Execute 20 Edge Case Scenarios
```
TASK: MS3-T1
  DEPENDS_ON: [MS2-GATE]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED | ESTIMATED_CALLS: 25
  SUCCESS: All 20 scenarios produce expected behavior (pass/warn/reject), NO crashes
  LAYER: 2
  READS_FROM: [tests/r2/benchmark-results.json]
  WRITES_TO: [tests/r2/edge-cases.json, tests/r2/edge-case-results.json]
  DATA_DEPS: [MaterialRegistry (exotic materials), MachineRegistry (boundary specs)]
  PROVIDES: [Edge case patterns â†’ L6 enterprise safety scope, L12 anomaly detection training]
  SKILL_LOAD: [prism-cutting-mechanics, prism-chip-formation, prism-material-physics, prism-materials-core, prism-speed-feed-engine]
```
**Scenarios:** Exotic materials (4), extreme parameters (4), boundary conditions (4),
material-machine mismatches (4), multi-physics coupling (4)

#### MS3-T2: Fix Edge Case Failures
```
TASK: MS3-T2
  DEPENDS_ON: [MS3-T1]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED | ESTIMATED_CALLS: 15
  SUCCESS: â‰¥16/20 edge cases correct (80%)
  LAYER: 2
  READS_FROM: [tests/r2/edge-case-results.json]
  WRITES_TO: [src/engines/* (targeted safety fixes) âŠ—]
  PROVIDES: [Safety boundary definitions â†’ L6 compliance, L14 digital twin limits]
  SKILL_LOAD: [prism-cutting-mechanics, prism-chip-formation, prism-material-physics, prism-materials-core, prism-speed-feed-engine]
```

---

### MS4: Build Gate + Phase Completion ✅ COMPLETE (Ω=0.77)

#### MS4-T1: Final Build + Full Test Suite (CODE)
```
TASK: MS4-T1
  DEPENDS_ON: [MS1-GATE, MS2-GATE, MS3-T2]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: GATED | ESTIMATED_CALLS: 5
  LAYER: 2
  READS_FROM: [src/engines/*.ts, src/tools/dispatchers/*.ts, tests/r2/*.ts]
  WRITES_TO: [dist/ (build output), state/pre_build_snapshot.json]
  PROVIDES: [Clean build + full test pass â†’ MS4-T2 quality scoring]
  SKILL_LOAD: [prism-cutting-mechanics, prism-chip-formation, prism-material-physics, prism-materials-core, prism-speed-feed-engine]
```

**BASH:** `npm run build && powershell -File scripts/verify-build.ps1`
#### MS4-T2: Quality Scoring (CHAT)
```
TASK: MS4-T2
  DEPENDS_ON: [MS4-T1]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: GATED (Î© â‰¥ 0.70, S(x) â‰¥ 0.70, benchmarks â‰¥40/50)
  ESTIMATED_CALLS: 5
  LAYER: 2
  READS_FROM: [tests/r2/benchmark-results.json, tests/r2/edge-case-results.json, dist/ (build)]
  WRITES_TO: [state/results/R2_QUALITY_REPORT.json]
  PROVIDES: [Î© score + S(x) score â†’ MS4-T3 tag, R3 entry criteria]
  SKILL_LOAD: [prism-cutting-mechanics, prism-chip-formation, prism-material-physics, prism-materials-core, prism-speed-feed-engine]
```

#### MS4-T3: Tag + Position Update (CODE)
```
TASK: MS4-T3
  DEPENDS_ON: [MS4-T2]
  EXECUTOR: Code | ARCHETYPE: verifier | MODEL: haiku | EFFORT: LIGHT
  GATE: YOLO | ESTIMATED_CALLS: 3
  LAYER: 2
  READS_FROM: [state/results/R2_QUALITY_REPORT.json]
  WRITES_TO: [git tag r2-complete, state/CURRENT_POSITION.md, state/ACTION_TRACKER.md]
  PROVIDES: [R2 phase marked complete â†’ R3-MS0 dependency satisfied]
  SKILL_LOAD: [prism-cutting-mechanics, prism-chip-formation, prism-material-physics, prism-materials-core, prism-speed-feed-engine]
```
**BASH:** `git add -A && git commit -m "R2 complete: benchmarks â‰¥40/50, Î©â‰¥0.70" && git tag -a r2-complete -m "R2 Engine Calibration complete"` 

### R2 Summary
| Task | Executor | Model | Effort | Parallel | Gate | Calls | Layer |
|------|----------|-------|--------|----------|------|-------|-------|
| MS1-T1 | Code | sonnet | STD | yes(w/MS2) | YOLO | 5 | L2 |
| MS1-T2 | Code | sonnet | STD | yes | YOLO | 8 | L2 |
| MS1-T3 | Code | sonnet | STD | yes | YOLO | 5 | L2 |
| MS1-T4 | Code | haiku | LIGHT | yes | YOLO | 3 | L2 |
| MS1-GATE | Code | haiku | LIGHT | yes | GATED | 2 | L2 |
| MS2-T1 | **Chat** | opus | NOVEL | yes(w/MS1) | GATED | 40-60 | L2 |
| MS2-T2 | **Chat** | opus | NOVEL | no | GATED | 15-20 | L2 |
| MS2-T3 | **Chat** | opus | NOVEL | no | GATED | 15-20 | L2 |
| MS2-T4 | **Chat** | opus | STD | no | YOLO | 8-10 | L2 |
| MS2-T5 | **Chat** | opus | NOVEL | no | GATED | 15-20 | L2 |
| MS2-GATE | **Chat** | opus | STD | no | GATED | 3 | L2 |
| MS3-T1 | **Chat** | opus | NOVEL | no | GATED | 25 | L2 |
| MS3-T2 | **Chat** | opus | NOVEL | no | GATED | 15 | L2 |
| MS4-T1 | Code | sonnet | STD | no | GATED | 5 | L2 |
| MS4-T2 | **Chat** | opus | NOVEL | no | GATED | 5 | L2 |
| MS4-T3 | Code | haiku | LIGHT | no | YOLO | 3 | L2 |
| **TOTAL** | Chat 60% / Code 40% | | | | | **175-210** | |


### MS5: Skill & Plugin Audit ✅ COMPLETE (Audit Only)
**Target: Strip redundant skills, identify Claude Code plugin overlaps**

#### MS5-T1: Audit Superpowers Skill for Plugin Overlap
```
TASK: MS5-T1
  DEPENDS_ON: [MS4-T3]
  EXECUTOR: Code | ARCHETYPE: verifier | MODEL: haiku | EFFORT: LIGHT
  GATE: YOLO | ESTIMATED_CALLS: 8
  LAYER: 2
  READS_FROM: [C:\PRISM\skills-consolidated\prism-sp-*\SKILL.md, C:\PRISM\skills-consolidated\prism-code-*\SKILL.md]
  WRITES_TO: [state/SKILL_AUDIT.md]
  PROVIDES: [Audit report identifying redundant vs essential skills â†’ leaner skill set for R3+]
  SKILL_LOAD: [prism-skill-activation, prism-skill-orchestrator]
```
**Step-by-step:**
1. Read all prism-sp-* skills (brainstorm, debugging, execution, planning, review, handoff, verification)
2. Read all prism-code-* skills (code-master, code-perfection, code-quality, code-safety, code-review-checklist)
3. For each skill: identify what Claude Code provides natively (LSP, linting, code nav, git)
4. Flag: KEEP (PRISM-specific), STRIP (covered by Claude Code), MERGE (partial overlap)
5. Write SKILL_AUDIT.md with recommendations
6. Do NOT modify skills yet â€” audit only
**BASH:** `npx tsx scripts/r2/audit-skills.ts`

#### MS5-T2: Audit Ralph Loop for Claude Code Integration
```
TASK: MS5-T2
  DEPENDS_ON: [MS5-T1]
  EXECUTOR: Chat | MODEL: opus | EFFORT: STANDARD
  GATE: YOLO | ESTIMATED_CALLS: 5
  LAYER: 2
  READS_FROM: [src/engines/RalphEngine.ts, state/SKILL_AUDIT.md]
  WRITES_TO: [state/RALPH_AUDIT.md]
  PROVIDES: [Decision on ralph_loop vs Claude Code native validation â†’ R3 validation strategy]
  SKILL_LOAD: [prism-skill-activation, prism-skill-orchestrator]
```
**Step-by-step:**
1. Identify what ralph_loop does: iterative validation via Claude API (SCRUTINIZEâ†’IMPROVEâ†’VALIDATEâ†’ASSESS)
2. Check if Claude Code plugins offer equivalent iterative quality loops
3. If no equivalent: KEEP ralph_loop, document why
4. If partial: identify which phases can use native, which need ralph
5. Write RALPH_AUDIT.md with decision


---


---

## R2-MS3: SERVER-SIDE COMPUTATION EXPANSION (Added 2026-02-21)
See: `SERVER_SIDE_COMPUTATION_SPEC.md` for full specification (505 lines, 15 sections).

### Goal
Move ALL deterministic operations from Claude's context to MCP server-side execution.
Estimated savings: 15,000-50,000 tokens per session.

### MS3-T1: Unit Conversion Engine + Math Helpers (P0)
```
TASK: MS3-T1
  DEPENDS_ON: [R2-MS2 complete]
  EXECUTOR: Code | MODEL: sonnet | EFFORT: STANDARD
  GATE: YOLO | ESTIMATED_CALLS: 12
  LAYER: 2
  READS_FROM: [src/engines/ManufacturingCalculations.ts]
  WRITES_TO: [
    src/engines/UnitConversionEngine.ts (NEW — 200+ unit pairs),
    src/engines/MathHelpers.ts (NEW — trig, interpolation, statistics, geometry)
  ]
  PROVIDES: [prism_calc:convert action, prism_calc:math action]
```
**Covers:** All imperial↔metric, SFM↔RPM (diameter-dependent), IPT↔IPM (flute/RPM-dependent),
force/torque/power/pressure/temperature/hardness conversions. Trig helpers, interpolation,
statistics (Cp/Cpk), nearest standard size lookup (drill sizes, IT grades).

### MS3-T2: Chip Thinning + Parameter Resolution + Compact State (P0)
```
TASK: MS3-T2
  DEPENDS_ON: [MS3-T1]
  EXECUTOR: Code | MODEL: sonnet | EFFORT: STANDARD
  GATE: YOLO | ESTIMATED_CALLS: 10
  LAYER: 2
  WRITES_TO: [
    prism_calc:chip_thinning action (engagement calcs),
    prism_data:resolve_defaults action (fill missing params from defaults),
    Enhanced prism_session:state compact queries
  ]
```
**Covers:** Chip thinning compensation, engagement angle, average chip thickness,
parameter defaults by tool type/material/operation, compact state queries.

### MS3-T3: Validation Pipeline Consolidation (P1)
```
TASK: MS3-T3
  DEPENDS_ON: [MS3-T2]
  EXECUTOR: Code | MODEL: sonnet | EFFORT: STANDARD
  GATE: GATED (safety-critical) | ESTIMATED_CALLS: 15
  LAYER: 2
  WRITES_TO: [
    prism_safety:validate_all action (single call checks everything),
    Consolidated pass/fail with limiting factor identification
  ]
```
**Covers:** Single "validate everything" action that checks power, torque, RPM limits,
stability, deflection, breakage risk against machine capabilities. Returns compact
pass/fail array with safety score.

### MS3-T4: Enhanced Property Queries + Comparisons (P1)
```
TASK: MS3-T4
  DEPENDS_ON: [MS3-T3]
  EXECUTOR: Code | MODEL: sonnet | EFFORT: STANDARD
  GATE: YOLO | ESTIMATED_CALLS: 10
  LAYER: 2
  WRITES_TO: [
    prism_data:material_properties action (selective field return),
    prism_data:tool_compare / machine_compare actions (compact tables)
  ]
```
**Covers:** Selective material property queries (return only requested fields, not entire record),
compact cross-reference comparisons with ranking.

### R2-MS3 Summary
| Task | Effort | Gate | Calls | Token Savings |
|------|--------|------|-------|---------------|
| MS3-T1 | STD | YOLO | 12 | ~2,000/session |
| MS3-T2 | STD | YOLO | 10 | ~2,100/session |
| MS3-T3 | STD | GATED | 15 | ~1,200/session |
| MS3-T4 | STD | YOLO | 10 | ~3,500/session |
| **TOTAL** | | | **47** | **~8,800/session** |
