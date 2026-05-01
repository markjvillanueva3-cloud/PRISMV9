---
source: project
section: PARALLEL AGENT PATTERNS
slug: parallel-agent-patterns
indexed_at: 2026-04-30T17:01:39.545Z
---

## PARALLEL AGENT PATTERNS

**Fan out when:** 3+ independent reads/searches, multi-perspective review needed, ambiguous problem benefits from divergent exploration, batch over homogeneous items (≥20). Single-message multi-Agent dispatch — never serialize.

**Specialize first:** match task to `subagent_type` — `Explore` (read-only fast searches), `Plan` (returns plan, doesn't edit), `reviewer` (scrutiny gate), `forge-team` (engine+skill+hook in one shot), `regression-hunter` (test failures of unknown origin), `physics-reviewer` (kc1.1/Taylor validation), `dispatcher-wirer` (wire existing engine), `catalog-enricher` (batch catalog data), `build-doctor` (compile/runtime). `general-purpose` is last resort, not default.

**Brief tightly:** scope boundary + return-format contract + escape clause ("return BLOCKED if X") + max file/tool budget. Loose briefs cause overlap and rambling.

**Converge deliberately:** tabulate agreements/disagreements, run tiebreaker on splits, synthesize ONE decision citing which agent surfaced what, log to scrutiny ledger. Never concatenate raw outputs.

**Anti-patterns:** sequential Read of 10+ files (use one Explore), solo `reviewer` on safety-critical (use panel of 3), agents without return contract, fanning out for <3 items (overhead exceeds savings).
