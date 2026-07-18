# Intelligence Dispatcher Split Analysis
## QA-MS6 P0-U02: Identify Actions That Should Split to Dedicated Dispatchers

**Generated:** 2026-04-12T22:50:00Z

---

## Summary

| Metric | Count | Status |
|--------|-------|--------|
| Actions Evaluated | 51 | Complete |
| Should Split Now | 0 | No immediate splits |
| Future Candidates | 12 | Workflow domain |
| Keep in Core | 51 | All current actions |

---

## Split Decision Framework

### Criteria for Splitting
1. **Cohesion**: Actions share a single, focused domain (>80% related)
2. **Volume**: Category has ≥10 actions (justifies dispatcher overhead)
3. **Independence**: Minimal cross-category dependencies
4. **Performance**: Dedicated dispatcher would improve latency
5. **Maintainability**: Split would reduce cognitive load

### Split Cost Analysis
| Factor | Cost per New Dispatcher |
|--------|-------------------------|
| Routing overhead | +2-5ms per call |
| Cold start | +50-100ms (lazy load) |
| Code maintenance | +1 file, +1 schema |
| Test coverage | +10-20 test cases |
| Documentation | +1 dispatcher doc |

---

## Per-Category Split Decision

### Job Management (14 actions) — DO NOT SPLIT
| Factor | Score | Rationale |
|--------|-------|-----------|
| Cohesion | 9/10 | Tightly coupled job lifecycle |
| Volume | YES | 14 actions (sufficient) |
| Independence | 3/10 | Heavy cross-category deps |
| Performance | N/A | Already in fast path |
| Maintainability | 8/10 | Well-organized |

**Decision**: NO SPLIT — core to intelligence identity.

---

### Recommendations (4 actions) — DO NOT SPLIT
| Factor | Score | Rationale |
|--------|-------|-----------|
| Cohesion | 9/10 | Unified recommendation domain |
| Volume | NO | Only 4 actions |
| Independence | 5/10 | Called by job_plan |
| Performance | N/A | Fast physics lookups |
| Maintainability | 9/10 | Simple |

**Decision**: NO SPLIT — too few actions.

---

### Setup & Config (4 actions) — DO NOT SPLIT
| Factor | Score | Rationale |
|--------|-------|-----------|
| Cohesion | 8/10 | Focused on setup sheets |
| Volume | NO | Only 4 actions |
| Independence | 7/10 | Mostly standalone |
| Performance | N/A | Document generation |
| Maintainability | 9/10 | Simple |

**Decision**: NO SPLIT — too few actions.

---

### Workflow & Skills (12 actions) — FUTURE CANDIDATE
| Factor | Score | Rationale |
|--------|-------|-----------|
| Cohesion | 9/10 | Clear workflow domain |
| Volume | YES | 12 actions (sufficient) |
| Independence | 8/10 | Mostly self-contained |
| Performance | MAYBE | High-frequency calls |
| Maintainability | 7/10 | Spans 4 engines |

**Decision**: DEFER — monitor traffic patterns.

**If Split**: Would become `prism_workflow` with actions:
```
decompose_intent, format_response
workflow_match, workflow_get, workflow_list
skill_list, skill_get, skill_search, skill_match, skill_steps, skill_for_persona
```

**Trigger Condition**: If workflow actions exceed 40% of prism_intelligence traffic.

---

### Onboarding (5 actions) — DO NOT SPLIT
| Factor | Score | Rationale |
|--------|-------|-----------|
| Cohesion | 10/10 | Perfect domain focus |
| Volume | NO | Only 5 actions |
| Independence | 9/10 | Very standalone |
| Performance | N/A | Low frequency |
| Maintainability | 10/10 | Single engine |

**Decision**: NO SPLIT — too few actions, low frequency.

---

### Conversation & Memory (2 actions) — DO NOT SPLIT
| Factor | Score | Rationale |
|--------|-------|-----------|
| Cohesion | 10/10 | Unified context domain |
| Volume | NO | Only 2 actions |
| Independence | 4/10 | Used by many actions |
| Performance | N/A | Fast memory ops |
| Maintainability | 10/10 | Single engine |

**Decision**: NO SPLIT — too few actions, high coupling.

---

### User Assistance (10 actions) — DO NOT SPLIT
| Factor | Score | Rationale |
|--------|-------|-----------|
| Cohesion | 8/10 | Focused assistance domain |
| Volume | MAYBE | 10 actions (borderline) |
| Independence | 6/10 | Coupled to context |
| Performance | N/A | Mixed latency |
| Maintainability | 8/10 | Single engine |

**Decision**: NO SPLIT — borderline volume, high coupling.

---

## Already-Completed Splits (SYS-MS1)

The following splits were correctly executed in SYS-MS1:

| New Dispatcher | Actions | Split Rationale |
|----------------|---------|-----------------|
| prism_product | 40 | Clear product domain |
| prism_machine_live | 40 | Real-time machine ops |
| prism_integration | 42 | External integrations |
| prism_knowledge_ext | 40 | Extended knowledge |
| prism_diagnosis | 38 | Diagnostic analysis |

**Assessment**: These splits were appropriate. Each dispatcher has:
- 38-42 actions (good volume)
- Clear domain boundaries
- Independent engine sets
- Backward-compatible forwarding

---

## Recommendations

### Immediate Actions
1. **No splits required** — current architecture is well-balanced
2. **Document workflow candidate** — add monitoring for future decision
3. **Maintain backward compatibility** — forwarded actions working well

### Future Monitoring
| Metric | Threshold | Action |
|--------|-----------|--------|
| Workflow action traffic | >40% | Consider prism_workflow split |
| Onboarding growth | >15 actions | Consider prism_onboarding split |
| Core action latency | >100ms | Profile and optimize |

### Anti-Patterns to Avoid
1. Splitting for <10 actions (overhead not justified)
2. Splitting high-coupling domains (increases latency)
3. Splitting without monitoring (no data-driven decision)

---

## Verification

| Check | Status |
|-------|--------|
| All 51 actions evaluated | YES |
| Split decisions documented | YES |
| Future candidates identified | YES |
| SYS-MS1 splits validated | YES |

---

## Conclusion

**QA-MS6 P0-U02 is COMPLETE** — No immediate splits are recommended
for the 51 core intelligence actions. The SYS-MS1 decomposition
(moving 200 actions to 5 sub-dispatchers) was thorough and correct.

**Future work**: Monitor workflow action traffic. If it exceeds 40% of
total prism_intelligence calls, implement prism_workflow split with
12 actions.

---

*QA-MS6 P0-U02 — Split analysis complete*
