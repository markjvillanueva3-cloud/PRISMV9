---
name: coordination-dashboard
description: View stochastic coordination metrics -- hook P(success), dedup effectiveness, timeout calibration, agent completion rates, token cost variance, anomaly detection.
model: haiku
effort: low
allowed-tools: Read, Bash
---

# Coordination Dashboard

Display the PRISM stochastic coordination dashboard with probabilistic metrics.

## Steps

1. Run the coordination stats dashboard:
```bash
python3 ~/.claude/hooks/lib/coordination_stats.py dashboard
```

2. Run anomaly detection:
```bash
python3 ~/.claude/hooks/lib/anomaly_detector.py
```

3. Format the output as a readable table with these sections:
   - **Hook Success Rates**: P(success) with Wilson 95% CI, mean latency
   - **Dedup Effectiveness**: P(false positive) per tool
   - **Retry Probabilities**: P(success | attempt N) per error type
   - **Timeout Calibration**: mean/std/p99 latency, recommended timeout
   - **Cache Performance**: hit rate, stale rate
   - **Agent Completion**: P(success | model), mean turns/tokens
   - **Token Cost Variance**: mean, std, 95% CI
   - **Anomalies**: EWMA/CUSUM alerts for tokens and latency
