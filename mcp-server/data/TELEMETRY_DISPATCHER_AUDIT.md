# Telemetry Dispatcher Action Subset Audit
## QA-MS6 P0-U06: Telemetry Engine Action Subset Audit

**Generated:** 2026-04-12T23:10:00Z

---

## Summary

| Metric | Count | Status |
|--------|-------|--------|
| Total Actions | 7 | Inventoried |
| Action Groups | 3 | Categorized |
| Engines Used | 1 | TelemetryEngine |
| Feature ID | F3 | Dispatcher Telemetry |

---

## Action Distribution

| Group | Count | Domain |
|-------|-------|--------|
| Dashboard & Metrics | 2 | System overview |
| Anomaly Management | 2 | Anomaly tracking |
| Weight Control | 3 | Routing optimization |

---

## Detailed Action Inventory

### Dashboard & Metrics (2 actions)
| Action | Purpose | Parameters |
|--------|---------|------------|
| get_dashboard | All dispatchers metrics + anomaly summary | None |
| get_detail | Deep metrics for one dispatcher | dispatcher |

**Dashboard Returns:**
- Dispatcher count
- Per-dispatcher metrics
- Anomaly summary
- System health status

### Anomaly Management (2 actions)
| Action | Purpose | Parameters |
|--------|---------|------------|
| get_anomalies | Filtered anomaly list | severity, dispatcher, limit |
| acknowledge | Mark anomaly as reviewed | anomaly_id, note |

**Anomaly Severities:**
- `info` — Informational
- `warning` — Needs attention
- `critical` — Immediate action required

### Weight Control (3 actions)
| Action | Purpose | Parameters |
|--------|---------|------------|
| get_optimization | Routing decisions log | limit, dispatcher |
| freeze_weights | Operator freeze control | dispatcher, reason |
| unfreeze_weights | Release freeze | dispatcher |

---

## Engine Mapping

| Engine | Actions | Purpose |
|--------|---------|---------|
| TelemetryEngine | 7 | Dispatcher telemetry & self-optimization |

### TelemetryEngine Methods
| Method | Used By |
|--------|---------|
| getDashboard() | get_dashboard |
| getDispatcherDetail() | get_detail |
| getAnomalies() | get_anomalies |
| acknowledgeAnomaly() | acknowledge |
| getOptimizationLog() | get_optimization |
| freezeWeights() | freeze_weights |
| unfreezeWeights() | unfreeze_weights |

---

## Telemetry Metrics

### Per-Dispatcher Metrics
| Metric | Description |
|--------|-------------|
| call_count | Total calls |
| success_rate | Success percentage |
| avg_latency_ms | Average response time |
| p95_latency_ms | 95th percentile latency |
| p99_latency_ms | 99th percentile latency |
| error_rate | Error percentage |
| throughput | Calls per second |

### System Metrics
| Metric | Description |
|--------|-------------|
| total_dispatchers | Number of active dispatchers |
| healthy_count | Dispatchers within SLO |
| degraded_count | Dispatchers with warnings |
| critical_count | Dispatchers with critical issues |

---

## Weight Optimization

### Auto-Optimization Flow
```
[Action Call] → TelemetryEngine.record()
        ↓
[Metrics Update] → latency, success, errors
        ↓
[Weight Calculation] → Bayesian update
        ↓
[Routing Decision] → Optimal path selection
```

### Freeze Control
- `freeze_weights`: Locks current weights for a dispatcher
- `unfreeze_weights`: Resumes auto-optimization
- Used for: debugging, controlled rollouts, incident response

---

## Anomaly Detection

### Detection Methods
| Method | Description |
|--------|-------------|
| Statistical | Z-score deviation |
| Threshold | Hard limits |
| Trend | Rate of change |
| Pattern | Recurring issues |

### Anomaly Response
| Severity | Auto-Response |
|----------|---------------|
| info | Log only |
| warning | Alert + log |
| critical | Alert + weight adjustment |

---

## Usage Patterns

### Get System Dashboard
```json
{
  "action": "get_dashboard"
}
```

### Get Dispatcher Detail
```json
{
  "action": "get_detail",
  "params": {
    "dispatcher": "prism_calc"
  }
}
```

### Acknowledge Anomaly
```json
{
  "action": "acknowledge",
  "params": {
    "anomaly_id": "anom-123",
    "note": "Investigated - false positive"
  }
}
```

### Freeze Weights for Debugging
```json
{
  "action": "freeze_weights",
  "params": {
    "dispatcher": "prism_intelligence",
    "reason": "Performance investigation"
  }
}
```

---

## Verification

| Check | Status |
|-------|--------|
| All 7 actions inventoried | YES |
| Action groups mapped | YES |
| Engine methods verified | YES |
| Parameter schemas valid | YES |
| Anomaly types documented | YES |

---

## Conclusion

**QA-MS6 P0-U06 is COMPLETE** — The prism_telemetry dispatcher has
7 actions in 3 groups, all served by the TelemetryEngine.

This is a compact, focused dispatcher implementing Feature F3
(Dispatcher Telemetry & Self-Optimization) with actions for dashboard
viewing, anomaly management, and weight control for routing optimization.

---

*QA-MS6 P0-U06 — Telemetry engine action subset audit complete*
