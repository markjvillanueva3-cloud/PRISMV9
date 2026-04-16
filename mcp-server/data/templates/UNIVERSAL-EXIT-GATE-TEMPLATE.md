# Universal Exit Gate Template

**Purpose**: Define measurable completion criteria for any session or unit with proof requirements, rollback instructions, quality thresholds, and feature capabilities.

**Use this template** in every roadmap session block. Replace `{{ }}` placeholders with actual values specific to your session.

---

## Template Structure

```markdown
EXIT GATE:
  ✓ CRITERION 1: {{ criterion_description }}
    Proof Type: {{ proof_type }}
    Proof: {{ specific_evidence_required }}
    Rollback: {{ rollback_if_fails }}

  ✓ CRITERION 2: {{ criterion_description }}
    Proof Type: {{ proof_type }}
    Proof: {{ specific_evidence_required }}
    Rollback: {{ rollback_if_fails }}

  ✓ CRITERION N: {{ criterion_description }}
    Proof Type: {{ proof_type }}
    Proof: {{ specific_evidence_required }}
    Rollback: {{ rollback_if_fails }}

  OMEGA_FLOOR QUALITY:
    Min Score: {{ numeric_threshold_1_10 }}
    Dimensions: [list domain-specific quality metrics]
    Validation: {{ how_score_is_computed }}

  SVI/PSI DELTA TARGET:
    Current Psi: {{ baseline_psi }}
    Target Psi: {{ target_psi }}
    Delta: {{ target_minus_baseline }}
    Measurement Method: {{ how_delta_is_tracked }}

  FEATURE CASCADE: NEW CAPABILITIES AVAILABLE
    NEW_HOOKS: [hook_name → protection_scope]
    NEW_ACTIONS: [dispatcher:action_name → consumer_intent]
    NEW_SKILLS: [/skill_name → trigger_condition]
    REGISTRIES_UPDATED: [registry → new_entry_count]
    AVAILABLE_TO: [list of downstream sessions that depend on these]

  SELF_UPDATE:
    Test Count Reference: AUTO (not frozen — reads from test suite at validation time)
    Compilation: npx tsc --noEmit (MUST return 0 errors)
    Linting: npm run lint (MUST return 0 errors)
    Build: npm run build (MUST succeed)
```

---

## Proof Types

Choose from these proof types to ensure objective validation:

| Proof Type | Example | What Passes? |
|-----------|---------|-------------|
| **test_count** | "152/152 tests passing" | Actual test count from `npm test` output matches or exceeds target |
| **timing** | "Response time <200ms for 95th percentile" | Benchmark run shows achieved timing |
| **diff_check** | "All changed files reviewed + 0 CRITICAL/HIGH findings" | Scrutiny report shows counts |
| **compilation** | "0 TypeScript errors" | `tsc --noEmit` returns clean |
| **coverage** | "Coverage ≥78% (lines, branches, functions)" | Coverage report shows thresholds met |
| **golden_baseline** | "Output matches ±10% of manufacturer reference" | Comparison table in exit report |
| **audit_scorecard** | "24 engines audited: 18 PRODUCTION, 6 PARTIAL" | Scorecard table generated |
| **integration_pass** | "Full round-trip: input → transform → output verified" | End-to-end test passes |
| **wiring_validation** | "All 79 dispatchers correctly connected to engines" | Wiring audit script passes |
| **registry_query** | "All 11 registries queried + ≥80% coverage" | Query test covers registry lookups |
| **physics_validation** | "Kienzle model matches 5 test cases within ±5%" | Physics test report |
| **feature_available** | "Hook fires + MCP action callable + Skill responds" | Manual smoke test + logs |
| **data_roundtrip** | "CAD in → program out for 10 test parts" | CAD round-trip test log |
| **inspector_sign_off** | "Machinist approved output on 3 sample parts" | Approval note in HANDOFF |

---

## Quality Thresholds (omega_floor)

Define minimum acceptable quality for the session's domain:

```markdown
OMEGA_FLOOR QUALITY:
  Min Score: 7.5/10 (for operational sessions) | 8.5/10 (for safety-critical)
  
  Dimensions:
    - Correctness: Code produces intended result (test pass rate ≥95%)
    - Safety: No bypasses, all guards active (CRITICAL findings = 0)
    - Performance: Meets SLA (latency, throughput, memory)
    - Maintainability: Code is reviewable, documented (coverage ≥70%)
    - Wiring: All dependencies connected (lint errors = 0)
    - Physics: Constants from canonical source (no inlines)
    - Robustness: Handles edge cases, errors, nulls (test coverage ≥3x nominal)
    - Observability: Logging, telemetry, debuggability (metric export active)

  Validation Method:
    (testPass% × 0.25) + (safetyScore × 0.20) + (perfScore × 0.15) + 
    (maintainScore × 0.15) + (wiringScore × 0.15) + (robustScore × 0.10)
    = final_omega_score
```

---

## SVI / Psi Delta Target

Track system improvement from this session:

```markdown
SVI/PSI DELTA TARGET:
  Current Psi: 40.8% (from project state at session start)
  Target Psi: 45.2% (expected improvement after this session)
  Delta: +4.4 percentage points
  
  Measurement Method:
    1. Read current Psi from: H:/prism/state/.svi-refresh.json
    2. Run: /svi after exit gate validation
    3. Verify new Psi ≥ target
    4. Record in HANDOFF.md
```

---

## Feature Cascade Block

Document new capabilities this session creates for downstream consumers:

```markdown
FEATURE CASCADE: NEW CAPABILITIES AVAILABLE

  NEW_HOOKS:
    hook_name_1: protection_scope_1 (e.g., "pre_engine_edit" → "prevents stub return")
    hook_name_2: protection_scope_2
    
  NEW_ACTIONS:
    dispatcher:action_name → consumer_intent (e.g., "prism_cam:route_program" → "determines machine family")
    dispatcher:action_name → consumer_intent
    
  NEW_SKILLS:
    /skill_name → trigger_condition (e.g., "/gcode" → "when program needs validation")
    /skill_name → trigger_condition
    
  REGISTRIES_UPDATED:
    ToolRegistry: +127 entries (new carbide inserts)
    MaterialRegistry: +8 entries (exotic composites)
    MachineRegistry: +3 entries (5-axis mills)
    
  AVAILABLE_TO:
    - SESSION 0-B-1 (regression tests for turned shafts)
    - SESSION 0-C-3 (lathe programming pipeline)
    - SESSION 1-2 (mill-turn orchestration)
```

---

## Self-Update (Dynamic Test Count)

Prevent exit gate criteria from becoming stale:

```markdown
SELF_UPDATE:
  Test Count Reference: AUTO
  Meaning: Do NOT hardcode "152/152 tests passing"
  Instead: "{{ current_test_count }}/{{ current_test_count }} tests passing (read at validation)"
  
  Implementation:
    1. Before declaring exit gate satisfied, run: npm test 2>&1 | tail -5
    2. Extract actual count: "## Tests  N passed (N tests)"
    3. Verify N = count_required (or > if improvement)
    4. Record actual count in HANDOFF.md BEFORE /compact
```

---

## Complete Example (Health Endpoint Session)

```markdown
EXIT GATE:
  ✓ Schema compiles cleanly
    Proof Type: compilation
    Proof: `tsc --noEmit` returns 0 errors
    Rollback: git checkout src/schemas/healthEndpoint.ts

  ✓ Handler implements GET /health
    Proof Type: integration_pass
    Proof: Route returns 200 with { status, uptime_ms, version, timestamp }
    Rollback: git checkout src/handlers/health.ts

  ✓ Route wired to Express entrypoint
    Proof Type: wiring_validation
    Proof: app.get("/health", handleHealth) in src/index.ts
    Rollback: git checkout src/index.ts

  ✓ All tests passing
    Proof Type: test_count
    Proof: {{ current_test_count }}/{{ current_test_count }} tests passing (AUTO)
    Rollback: npm test (if count dropped, revert last commit)

  ✓ Scrutiny clean (3-agent review)
    Proof Type: audit_scorecard
    Proof: prism-review findings = 0 CRITICAL, 0 HIGH
    Rollback: Address findings or revert code changes

  OMEGA_FLOOR QUALITY:
    Min Score: 7.5/10
    Dimensions: [correctness (test pass ≥95%), safety (guards active), maintainability (coverage ≥70%)]
    Validation: (testPass% × 0.5) + (coverage × 0.3) + (safety × 0.2) ≥ 7.5

  SVI/PSI DELTA TARGET:
    Current Psi: 40.8%
    Target Psi: 41.5%
    Delta: +0.7 pp
    Measurement: /svi after validation

  FEATURE CASCADE: NEW CAPABILITIES AVAILABLE
    NEW_HOOKS:
      post_health_check: "validates server state before response"
    
    NEW_ACTIONS:
      prism_infra:health_probe → "enables external monitoring"
    
    NEW_SKILLS:
      /health → "when user types /health, returns server status"
    
    REGISTRIES_UPDATED:
      HealthMetricsRegistry: +1 entry
    
    AVAILABLE_TO:
      - SESSION 0-B-1 (monitoring pipeline)
      - SESSION 1-1 (observability layer)

  SELF_UPDATE:
    Test Count Reference: AUTO
    Compilation: npx tsc --noEmit (MUST be 0)
    Build: npm run build (MUST succeed)
```

---

## Rules for Using This Template

1. **One criterion per proof**: Don't combine "tests pass AND coverage ≥70%" into one line—split into two.

2. **Proof is objective**: "Code is good" ✗ | "{{ current_test_count }}/{{ current_test_count }} tests passing" ✓

3. **Rollback is specific**: "revert" ✗ | "git checkout src/engines/Foo.ts && npm test" ✓

4. **OMEGA_FLOOR must be measurable**: Math formula or test count, never subjective judgment.

5. **Feature Cascade lists consumers**: If your hook/action/skill doesn't have downstream consumers in planned sessions, note "awaiting consumer session" rather than pretending adoption.

6. **Test count is AUTO, not frozen**: If you write "152/152", it becomes wrong the day someone adds test #153. Use placeholder and evaluate at gate time.

7. **Readability first**: If a criterion is complex (physics validation, multi-stage pipeline), add a brief why-it-matters note:
   ```
   ✓ Kienzle model validated
     Proof Type: physics_validation
     Proof: 5 test cases match manufacturer reference ±5%
     Rollback: git checkout src/engines/KienzleForceModel.ts
     Why: Incorrect Kienzle → part scrap → customer loss
   ```

---

## When Exit Gate Fails

If any proof fails:

1. **DON'T dismiss it as "pre-existing"**: Fix it in the SAME session.
2. **Execute the Rollback line** for that criterion.
3. **Restart the 4-LOOP** for the affected unit.
4. **Re-run scrutiny** (`/prism-review`) after fixes.
5. **Document what broke and why** in HANDOFF.md BEFORE `/compact`.

---

## Integration with Session Roadmap

```
SESSION HEADER:
  ...
  WORK: ...
  4-LOOP per unit: SCRUTINIZE → GAP FILL → TIE UP
  FORGE-TRIPLE: {{ hook + action + skill }}
  EXIT GATE: [use this template]
  → /compact → HANDOFF.md records actual criterion satisfaction
```

---

## Next: See Also

- [UNIVERSAL-ROLLBACK-BLOCK-TEMPLATE.md](UNIVERSAL-ROLLBACK-BLOCK-TEMPLATE.md)
- [UNIVERSAL-FEATURE-CASCADE-TEMPLATE.md](UNIVERSAL-FEATURE-CASCADE-TEMPLATE.md)
- HANDOFF.md format — records exit gate validation results
