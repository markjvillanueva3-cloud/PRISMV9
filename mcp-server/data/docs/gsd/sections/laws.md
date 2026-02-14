## 6 LAWS — Enforcement Details

### Law 1: S(x) ≥ 0.70 — HARD BLOCK
What: Safety score must pass before any calculation result is released.
Enforced by: pre-output hooks (BLOCKING), prism_validate→safety, CalcHookMiddleware.
Consequence: If S(x) < 0.70, result is BLOCKED. Cannot bypass. Fix the calculation.
Why: Lives depend on correctness. Tool explosions, machine crashes, operator injury.

### Law 2: No Placeholders
What: Every value must be real, complete, verified. No "TODO", no "TBD", no dummy data.
Enforced by: prism_validate→completeness (≥80% populated fields required).
Consequence: Incomplete outputs flagged by quality gates.
Why: A placeholder in a feed rate calculation could destroy a $200K spindle.

### Law 3: New ≥ Old (Anti-Regression)
What: Never lose data, actions, hooks, knowledge, or line counts during updates.
Enforced by: prism_validate→anti_regression, autoDocAntiRegression (>30% warn, >60% block).
Consequence: File replacement blocked if it reduces capability.
Why: Knowledge loss compounds. Lost once = lost forever in a compacting context.

### Law 4: MCP First
What: Use prism: dispatchers before Desktop Commander, bash, or external tools.
Enforced by: Convention (not automated yet — planned for W4).
Consequence: Better telemetry, hook coverage, cadence integration.
Why: MCP calls get auto-fire benefits. External calls are invisible to the system.

### Law 5: No Duplicates
What: Check before creating. One source of truth per concept.
Enforced by: prism_hook→coverage (identifies duplicate hook coverage).
Consequence: Duplicate functions create maintenance burden and confusion.
Why: Two implementations of the same thing WILL diverge and cause bugs.

### Law 6: 100% Utilization
What: If a capability exists, it must be used everywhere relevant.
Enforced by: Audit (FULL_SYSTEM_AUDIT.md). gsd_sync tracks unwired modules.
Consequence: 51 unwired Python modules (25K+ lines) = massive waste.
Why: Code that exists but isn't used is worse than code that doesn't exist.

## Changelog
- 2026-02-10: v3.0 — Content-optimized. Added enforcement details, consequences, and rationale.
- 2026-02-10: v2.0 — File-based. Added descriptions.
