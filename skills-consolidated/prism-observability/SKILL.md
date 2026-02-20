---
name: prism-observability
description: |
  Monitoring, logging, metrics, and alerting for PRISM MCP server.
  Know what's happening, detect problems early, diagnose quickly.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "observability", "monitoring", "logging", "metrics", "alerting", "server"
- Safety validation required, collision risk assessment, or safe parameter verification needed.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-observability")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_safety→[relevant_check] for safety validation
   - prism_skill_script→skill_content(id="prism-observability") for safety reference
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

# PRISM Observability
## Metrics, Logging & Diagnostics

## Three Pillars

### 1. Metrics (Quantitative)
| Metric | Source | Alert Threshold |
|--------|--------|----------------|
| Dispatcher call count | prism_telemetry→get_dashboard | N/A (tracking) |
| Action success rate | prism_telemetry→get_detail | <95% = investigate |
| Avg response time | prism_telemetry→get_detail | >5s = investigate |
| S(x) scores | prism_validate→safety | <0.70 = BLOCK |
| Ω scores | prism_omega→compute | <0.65 = WARNING |
| Context pressure | prism_context→context_pressure | >60% = checkpoint |
| Hook fire rate | prism_hook→performance | Failed hooks = alert |
| Error rate | prism_guard→error_capture | >5/session = investigate |

### 2. Logging (Events)
**What to log:**
- Every dispatcher call (action, params, result status, duration)
- Every safety validation (S(x) score, pass/fail, blocking reason)
- Every error (full context: what, where, inputs, stack)
- Every state mutation (before/after, who triggered)
- Build results (pass/fail, duration, warnings)

**What NOT to log:**
- Sensitive data (API keys, credentials)
- Full material databases (too large)
- Intermediate calculation steps (unless debugging)

**Log levels:**
| Level | When | Example |
|-------|------|---------|
| ERROR | Something failed | Dispatcher routing failure |
| WARN | Unusual but not failed | S(x) = 0.71 (barely passing) |
| INFO | Normal operations | Session started, build complete |
| DEBUG | Troubleshooting | Formula intermediate values |

### 3. Traces (Request Flow)
Track a request through the system:
```
User request → Dispatcher routing → Action handler → Engine call
  → Safety validation → Hook execution → Response assembly → Output
```
Each step logged with correlationId for end-to-end tracing.

## Diagnostic Tools
| Tool | What It Shows | When to Use |
|------|--------------|-------------|
| `prism_telemetry→get_dashboard` | System overview | Start of session, health check |
| `prism_telemetry→get_anomalies` | Unusual patterns | When something seems off |
| `prism_guard→error_capture` | Recent errors | After failures |
| `prism_guard→pattern_scan` | Error patterns | Recurring issues |
| `prism_pfp→get_dashboard` | Failure predictions | Proactive prevention |
| `prism_hook→performance` | Hook timing | Performance investigation |

## Health Check Protocol
Run at session start:
```javascript
prism_dev→session_boot  // Loads state, runs integrity checks
prism_telemetry→get_dashboard  // Check system metrics
prism_hook→status  // Verify hooks are registered
```
