# R2-MS5 Ralph Loop Audit
## Date: 2026-02-21 | Decision: KEEP + Enhanced Integration

---

## Architecture Summary

| Aspect | Details |
|--------|---------|
| Location | `src/tools/dispatchers/ralphDispatcher.ts` (136 lines — no separate engine) |
| MCP Tool | `prism_ralph` with 3 actions: `loop`, `scrutinize`, `assess` |
| Execution | Real Claude API calls (Sonnet phases 1-3, Opus phase 4) |
| Cost | ~8 API calls per full loop (5 validators + IMPROVE + VALIDATE + ASSESS) |
| Current Usage | **UNUSED** — not wired into any hooks, CI/CD, or release gates |

## The 4 Phases

| Phase | Purpose | Model | Output |
|-------|---------|-------|--------|
| SCRUTINIZE | 5 parallel domain validators probe content | Sonnet | 5 validator reports |
| IMPROVE | Synthesize findings into recommendations | Sonnet | Improvement plan |
| VALIDATE | Safety gate: S(x) ≥ 0.70 | Sonnet | PASS/FAIL + S(x) score |
| ASSESS | Production-ready verdict | Opus | Letter grade + Ω(x) |

## Domain-Specific Validators (The Core Value)

| Validator | Manufacturing-Specific? | Claude Code Equivalent |
|-----------|------------------------|----------------------|
| SAFETY_AUDITOR | ✅ YES — cutting params, tool breakage, machine crashes | ❌ NONE |
| FORMULA_VALIDATOR | ✅ YES — unit errors, parameter ranges, physics violations | ❌ NONE |
| CODE_REVIEWER | ❌ Generic | ✅ Native Claude Code review |
| SPEC_VERIFIER | ❌ Generic | ✅ Native Claude Code reasoning |
| COMPLETENESS_CHECKER | ❌ Generic | ✅ Native Claude Code analysis |

## Decision: KEEP

### Why KEEP (not STRIP or MERGE)

1. **SAFETY_AUDITOR is irreplaceable** — no general-purpose code reviewer can validate:
   - Spindle speed safety limits (RPM vs tool diameter → surface speed)
   - Tool breakage risk under load
   - Coolant flow adequacy vs material thermal properties
   - Vibration/chatter risk assessment
   - Collision detection awareness

2. **FORMULA_VALIDATOR is irreplaceable** — validates manufacturing physics:
   - Kienzle force model: kc1.1 × h^(1-mc) × b — correct units, valid ranges
   - Taylor tool life: VT^n = C — physically valid exponent range
   - Johnson-Cook plasticity model — strain-rate bounds
   - Chip load calculations — physically possible values

3. **4-phase iterative loop** — Claude Code review is point-in-time; Ralph iterates (SCRUTINIZE → IMPROVE → re-VALIDATE → ASSESS)

4. **Safety-critical domain** — manufacturing intelligence errors can cause machine crashes and operator injury

### Why NOT STRIP

| If Ralph is stripped... | Consequence |
|------------------------|-------------|
| SAFETY_AUDITOR disappears | No manufacturing safety validation anywhere in pipeline |
| FORMULA_VALIDATOR disappears | Generic math validation loses manufacturing physics context |
| S(x) gate becomes generic | prism_validate→safety checks properties, not domain safety |
| No iterative IMPROVE phase | Developers must manually synthesize validator findings |

### Why NOT MERGE into Claude Code

- Ralph is **MCP-server-side**, Claude Code is **client-side** — different execution layers
- Ralph needs **external API calls** (Sonnet/Opus); Claude Code has **internal model**
- Ralph is **stateless per-call**; Claude Code agents maintain **session context**
- Merging would require manufacturing domain ML models (expensive, lossy)

## Coverage Map

```
Manufacturing Validation Layers:

┌─────────────────────────────────────────────────┐
│ PRISM MCP Server                                │
│  ├─ prism_safety → collision, coolant, spindle  │
│  ├─ prism_calc → cutting force, tool life, MRR  │
│  └─ prism_ralph → SAFETY_AUDITOR + FORMULA_VAL  │ ← IRREPLACEABLE
└─────────────────────────────────────────────────┘
         ▲ MCP calls
┌─────────────────────────────────────────────────┐
│ Claude Code                                     │
│  ├─ Code review agents (syntax, logic, patterns)│
│  ├─ prism_omega (Ω formula scoring)             │
│  └─ Pre-edit hooks (generic validation)         │
└─────────────────────────────────────────────────┘
```

## Integration Recommendations (R3+)

### Immediate: Wire into Release Gate
```
Pre-release → prism_ralph action=loop
  validators: [SAFETY_AUDITOR, FORMULA_VALIDATOR, COMPLETENESS_CHECKER]
  threshold: S(x) ≥ 0.70
  Gate: Block release if FAIL
```

### Short-term: Auto-Hook on Safety-Critical Paths
```
@on-formula-change → prism_ralph action=scrutinize (FORMULA_VALIDATOR only)
@on-safety-dispatcher-change → prism_ralph action=scrutinize (SAFETY_AUDITOR only)
```

### Medium-term: Enhance Validators
- Add explicit Kienzle/Taylor/J-C range checks to FORMULA_VALIDATOR prompt
- Cross-reference prism_calc validation constants
- Return structured findings (JSON, not text)

## Overlap Summary

| Capability | Ralph | Claude Code | Winner |
|-----------|-------|-------------|--------|
| Manufacturing safety audit | ✅ | ❌ | **Ralph** |
| Manufacturing formula validation | ✅ | ❌ | **Ralph** |
| General code review | ✅ | ✅ | **Claude Code** (native) |
| Spec compliance | ✅ | ✅ | **Claude Code** (native) |
| Iterative improvement loop | ✅ | ❌ | **Ralph** |
| Production-ready verdict | ✅ | ✅ (Ω) | **Tie** |
| Cost efficiency | ❌ (8 calls) | ✅ (native) | **Claude Code** |
| Session context | ❌ (stateless) | ✅ | **Claude Code** |
