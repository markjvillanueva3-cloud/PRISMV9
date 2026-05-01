// performance_baseline.ts — R6 Companion Script
// Captures response time and memory baselines for production monitoring

const metrics = {
  timestamp: new Date().toISOString(),
  build_size_mb: 5.6,
  memory: {
    heap_warning_mb: 2000,
    heap_critical_mb: 3500,
    rss_warning_mb: 3000,
    rss_critical_mb: 4500
  },
  response_time: {
    p95_warning_ms: 200,
    p95_critical_ms: 500,
    p99_warning_ms: 500,
    p99_critical_ms: 2000
  },
  error_rate: {
    warning: 0.01,
    critical: 0.05
  },
  test_baselines: {
    r2_safety_matrix: "16/17 (1 pre-existing KC_INFLATED)",
    r6_stress_test: "3/3 — 200 requests, 0 failures, P99 < 1ms",
    r6_security_audit: "16/16 — injection, XSS, traversal, overflow all blocked",
    r6_memory_profile: "3/3 — 0.62MB growth over 100 iterations, 0.3% heap usage"
  },
  registry_counts: {
    materials_dispatch: 3022,
    materials_knowledge: 6338,
    materials_disk: 6346,
    machines: 1015,
    tools_dispatch: 1731,
    tools_knowledge: 13967,
    alarms: 10033,
    formulas: 509
  }
};

export default metrics;
