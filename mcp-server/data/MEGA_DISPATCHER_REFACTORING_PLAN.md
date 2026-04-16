# Mega-Dispatcher Decomposition Refactoring Plan
## QA-MS6 P0-U07: Refactoring Plan for Mega-Dispatcher Decomposition

**Generated:** 2026-04-12T23:15:00Z

---

## Executive Summary

| Dispatcher | Actions | Status | Recommendation |
|------------|---------|--------|----------------|
| prism_intelligence | 251 | Decomposed | COMPLETE — maintain |
| prism_knowledge | 133 | Large | MONITOR — potential split |
| prism_memory | 9 | Optimal | NO CHANGE |
| prism_pfp | 6 | Optimal | NO CHANGE |
| prism_telemetry | 7 | Optimal | NO CHANGE |

**Overall Assessment**: The mega-dispatcher decomposition performed in SYS-MS1
was effective. No immediate refactoring required.

---

## Audit Summary

### 1. prism_intelligence (251 actions)
**Already Decomposed in SYS-MS1**

| Component | Actions | Status |
|-----------|---------|--------|
| Core intelligence | 51 | Active |
| prism_product | 40 | Forwarded |
| prism_machine_live | 40 | Forwarded |
| prism_integration | 42 | Forwarded |
| prism_knowledge_ext | 40 | Forwarded |
| prism_diagnosis | 38 | Forwarded |

**Assessment**: Well-decomposed. Core 51 actions are cohesive.
**Recommendation**: NO FURTHER SPLIT — maintain current architecture.

### 2. prism_knowledge (133 actions)
**Largest Active Dispatcher**

| Group | Actions | Split Candidate? |
|-------|---------|------------------|
| Core Knowledge | 5 | No — too few |
| Tribal | 5 | No — too few |
| Academy | 11 | Maybe — coherent domain |
| Visual Lab | 7 | No — too few |
| Knowledge Graph | 5 | No — too few |
| Troubleshoot | 4 | No — too few |
| Instructor | 6 | No — too few |
| Course Builder | 5 | No — too few |
| Learn Pipeline | 51 | YES — large, coherent |
| PDF Extraction | 9 | No — too few |
| Catalog Extraction | 8 | No — too few |
| MIT Academic | 12 | Maybe — specialized |
| Ingestion Pipeline | 5 | No — too few |

**Assessment**: Learn Pipeline (51 actions) could justify a dedicated dispatcher.
**Recommendation**: MONITOR — consider `prism_learning` if traffic exceeds 40%.

### 3. prism_memory (9 actions)
**Well-Scoped Feature Dispatcher**

| Group | Actions |
|-------|---------|
| Health & Diagnostics | 2 |
| Graph Traversal | 4 |
| Consolidation | 3 |

**Assessment**: Optimal size for F2 feature scope.
**Recommendation**: NO CHANGE — ideal dispatcher size.

### 4. prism_pfp (6 actions)
**Well-Scoped Feature Dispatcher**

| Group | Actions |
|-------|---------|
| Dashboard | 1 |
| Risk Assessment | 3 |
| Configuration | 2 |

**Assessment**: Optimal size for F1 feature scope.
**Recommendation**: NO CHANGE — ideal dispatcher size.

### 5. prism_telemetry (7 actions)
**Well-Scoped Feature Dispatcher**

| Group | Actions |
|-------|---------|
| Dashboard & Metrics | 2 |
| Anomaly Management | 2 |
| Weight Control | 3 |

**Assessment**: Optimal size for F3 feature scope.
**Recommendation**: NO CHANGE — ideal dispatcher size.

---

## Refactoring Recommendations

### Tier 1: No Action Required
| Dispatcher | Reason |
|------------|--------|
| prism_intelligence | Already decomposed, well-maintained |
| prism_memory | Optimal scope (9 actions) |
| prism_pfp | Optimal scope (6 actions) |
| prism_telemetry | Optimal scope (7 actions) |

### Tier 2: Monitor for Future Split
| Dispatcher | Trigger Condition | Proposed Split |
|------------|-------------------|----------------|
| prism_knowledge | Learn Pipeline >40% traffic | prism_learning (51 actions) |
| prism_knowledge | Academy >30% traffic | prism_academy (11 actions) |

### Tier 3: Future Consideration
| Scenario | Action |
|----------|--------|
| prism_intelligence workflow >40% | Consider prism_workflow (12 actions) |
| New feature >10 actions | Create dedicated dispatcher |
| Existing group >50 actions | Evaluate split |

---

## Decomposition Guidelines

### When to Split
1. **Volume threshold**: Group exceeds 40-50 actions
2. **Cohesion score**: >8/10 for proposed new dispatcher
3. **Traffic threshold**: Group exceeds 40% of parent traffic
4. **Independence**: Minimal cross-group dependencies (<3)

### When NOT to Split
1. **Volume too low**: <10 actions (overhead not justified)
2. **High coupling**: >5 cross-group dependencies
3. **Low traffic**: <10% of parent traffic
4. **Shared engines**: Same engine serves multiple groups

### Split Process
1. **Audit**: Document all actions, engines, dependencies
2. **Measure**: Collect traffic data for 2+ weeks
3. **Propose**: Create RFC with split rationale
4. **Implement**: Create new dispatcher with forwarding
5. **Migrate**: Maintain backward compatibility
6. **Deprecate**: Mark old paths as deprecated (6+ months)
7. **Remove**: Remove forwarding after deprecation period

---

## Implementation Checklist

### If prism_learning Split is Approved

```markdown
- [ ] Create src/tools/dispatchers/learningDispatcher.ts
- [ ] Move 51 learn_* actions to new dispatcher
- [ ] Create src/schemas/learningActionSchemas.ts
- [ ] Update knowledgeDispatcher.ts with forwarding
- [ ] Add prism_learning to dispatcher registry
- [ ] Create tests for new dispatcher
- [ ] Update documentation
- [ ] Deploy with feature flag
- [ ] Monitor for 2 weeks
- [ ] Remove forwarding after 6 months
```

### If prism_academy Split is Approved

```markdown
- [ ] Create src/tools/dispatchers/academyDispatcher.ts
- [ ] Move 11 academy_* actions to new dispatcher
- [ ] Create src/schemas/academyActionSchemas.ts
- [ ] Update knowledgeDispatcher.ts with forwarding
- [ ] Add prism_academy to dispatcher registry
- [ ] Create tests for new dispatcher
- [ ] Update documentation
- [ ] Deploy with feature flag
- [ ] Monitor for 2 weeks
- [ ] Remove forwarding after 6 months
```

---

## Metrics to Track

### Dispatcher Health
| Metric | Target | Alert |
|--------|--------|-------|
| Actions per dispatcher | 5-50 | >80 |
| Avg latency | <100ms | >200ms |
| Success rate | >99% | <95% |
| Cold start | <100ms | >200ms |

### Split Triggers
| Metric | Threshold | Action |
|--------|-----------|--------|
| Group traffic share | >40% | Evaluate split |
| Group action count | >50 | Evaluate split |
| Latency degradation | >50% | Investigate |
| Error rate spike | >5% | Investigate |

---

## Verification

| Check | Status |
|-------|--------|
| All 5 dispatchers audited | YES |
| Action counts verified | YES |
| Recommendations documented | YES |
| Implementation checklists created | YES |
| Metrics defined | YES |

---

## Conclusion

**QA-MS6 P0-U07 is COMPLETE** — The mega-dispatcher decomposition
refactoring plan is complete.

**Key Findings**:
1. SYS-MS1 decomposition was effective — prism_intelligence well-split
2. prism_memory, prism_pfp, prism_telemetry are optimal size
3. prism_knowledge (133 actions) may need future split of Learn Pipeline
4. No immediate refactoring required

**Next Steps**:
1. Instrument traffic monitoring for prism_knowledge
2. Review Learn Pipeline traffic in 1 month
3. If >40%, initiate prism_learning RFC

---

## QA-MS6 Milestone Summary

| Unit | Title | Status |
|------|-------|--------|
| P0-U00 | prism_intelligence action inventory | COMPLETE |
| P0-U01 | Action categorization and decomposition | COMPLETE |
| P0-U02 | Identify actions for split | COMPLETE |
| P0-U03 | Knowledge engine action audit | COMPLETE |
| P0-U04 | Memory engine action audit | COMPLETE |
| P0-U05 | PFP engine action audit | COMPLETE |
| P0-U06 | Telemetry engine action audit | COMPLETE |
| P0-U07 | Refactoring plan | COMPLETE |

**QA-MS6 MILESTONE COMPLETE** — Intelligence Mega-Dispatcher Audit finished.

---

*QA-MS6 P0-U07 — Refactoring plan complete*
