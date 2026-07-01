# PRISM Alert Interpretation Guide

## Alert Thresholds

### Memory Alerts
| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Heap Used | > 2GB | > 3.5GB | Restart if > 3.5GB, investigate leak |
| RSS | > 3GB | > 4.5GB | Check for unbounded arrays/caches |
| Heap Growth/min | > 50MB | > 200MB | Memory leak — check recent changes |

### Performance Alerts
| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| P95 response | > 200ms | > 500ms | Profile hot paths, check registry size |
| P99 response | > 500ms | > 2000ms | Check for blocking I/O, large payloads |
| Error rate | > 1% | > 5% | Check logs for pattern, consider rollback |

### Safety Alerts
| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| S(x) score | < 0.75 | < 0.70 | IMMEDIATE: Stop, investigate, rollback |
| Calc deviation | > 1% | > 5% | Compare against R2 baselines |
| NaN in output | Any | Any | BLOCK — data corruption or formula bug |

## Root Cause Analysis
1. **Memory spike**: Check `prism_telemetry action=get_dashboard` for allocation patterns
2. **Slow responses**: Use `prism_pfp action=assess_risk` to identify bottlenecks
3. **Safety degradation**: Run `prism_validate action=safety` and compare R2 baselines
4. **Registry errors**: Check `prism_data action=material_search query="*"` for count drops

## Escalation Path
- Automated hooks fire first (safety_degradation_alert, deployment_rollback_trigger)
- If hooks insufficient → manual intervention per runbook
- If safety-critical → immediate server stop, no exceptions
