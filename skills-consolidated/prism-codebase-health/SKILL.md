---
name: prism-codebase-health
description: |
  Continuous health monitoring for PRISM codebase. Tracks code quality trends,
  technical debt, test coverage, build health, and dependency freshness.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "codebase", "health", "continuous", "monitoring", "tracks", "code", "quality"
- Safety validation required, collision risk assessment, or safe parameter verification needed.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-codebase-health")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_safety→[relevant_check] for safety validation
   - prism_skill_script→skill_content(id="prism-codebase-health") for safety reference
   - prism_validate→safety for S(x)≥0.70 gate

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Safety criteria, validation rules, and threshold values
- **Failure**: S(x)<0.70 → operation BLOCKED, must resolve before proceeding

### Examples
**Example 1**: Pre-operation safety check needed
→ Load skill → Run safety criteria against current parameters → Return S(x) score → BLOCK if <0.70

**Example 2**: User overriding recommended limits
→ Load skill → Flag risk factors → Require explicit acknowledgment → Log override decision

# PRISM Codebase Health
## Continuous Monitoring & Trend Analysis

## Health Dashboard Metrics

| Metric | Tool | Green | Yellow | Red |
|--------|------|-------|--------|-----|
| Build success | `prism_dev:build` | Pass | Warn | Fail |
| Test coverage | `prism_dev:test_results` | >80% | 60-80% | <60% |
| Type safety | `tsc --noEmit` | 0 errors | <5 errors | 5+ errors |
| Bundle size | esbuild output | <4MB | 4-5MB | >5MB |
| Stub count | `prism_atcs:stub_scan` | 0 | 1-3 | 4+ |
| Hook coverage | `prism_hook:coverage` | >90% | 70-90% | <70% |
| Dispatcher health | `prism_telemetry:get_dashboard` | All OK | 1-2 degraded | 3+ degraded |
| Dead code | grep unused exports | 0 | 1-5 | 6+ |

## Health Check Protocol

### Quick Check (every session boot)
```
1. prism_dev→build              // Does it compile?
2. prism_dev→test_smoke         // Do critical tests pass?
3. prism_atcs→stub_scan         // Any incomplete work?
4. prism_hook→coverage          // Are safety hooks active?
```

### Deep Check (weekly / before releases)
```
1. All quick checks
2. prism_guard→pattern_scan     // Error pattern analysis
3. prism_pfp→get_dashboard      // Predictive failure check
4. prism_telemetry→get_anomalies // Performance anomalies
5. Full test suite execution
6. Dependency audit (npm audit)
7. Bundle size trend analysis
```

## Trend Tracking
Track metrics over time to catch gradual degradation:
- Build time creeping up → dependency bloat or circular imports
- Test count decreasing → tests being deleted instead of fixed
- Bundle size growing → unused code accumulating
- Error rate increasing → regression or environmental change

## Technical Debt Register
| Debt Item | Impact | Effort | Priority |
|-----------|--------|--------|----------|
| Track in ACTION_TRACKER.md | H/M/L | Hours | P1-P4 |

**Rule:** Every session that adds debt must log it. Every 5th session, review and pay down top item.
