---
policy:
  tier: 3
  triggers:
    - "rgs3"
---
# /rgs3 — Project-Local Mirror

This file mirrors the user-global authoritative skill at `H:/.claude/commands/rgs3.md`. The user-global file contains the full **14-stage pipeline** (v2's 12 + S0.5 System Pressure & Dedup + S11.5 Cron Registration & Skill Auto-Creation) with v3 layered enhancements at every stage. Read it directly — do not duplicate the body here (drift risk).

**Authoritative path:** `H:/.claude/commands/rgs3.md`

**Sibling skill:** `/forge3` at `H:/.claude/commands/forge3.md` — orchestrated by /forge3 Phase 3 to run the 14-stage milestone envelope.

**v3 delta vs v2 (audit-coverage 2026-05-08):**
- v1 routed ~4% of dev surface
- v2 routed ~15%
- v3 targets ~40%
- v4 (future): meta-coverage route in /rgs3 produces v3→v4 gap report when surface grows again

**v3 NEW skill categories (8 layers added vs v2):**
- `superpowers:*` (8 methodology skills) — brainstorming, dispatching-parallel-agents, systematic-debugging, test-driven-development, verification-before-completion, writing-plans, writing-skills, finishing-a-development-branch
- `codebase-memory-*` (4 graph-intel skills) — exploring, quality, tracing, reference
- `automation:*` (7) — auto-agent, smart-agents, smart-spawn, workflow-select, self-healing, session-memory
- `optimization:*` (5) — parallel-execute, cache-manage, auto-topology, topology-optimize
- `monitoring:*` (6) — real-time-view, status, agents, agent-metrics, swarm-monitor
- `analysis:*` (7) — token-usage, token-efficiency, performance-bottlenecks, performance-report, bottleneck-detect
- `github:*` (20) — pr-manager, swarm-pr, swarm-issue, code-review-swarm, sync-coordinator, workflow-automation, etc.
- `sparc:*` (30) — analyzer, architect, coder, tester, debugger, reviewer, etc.

**v3 NEW pipeline mechanics:**
- Anti-drift Karpathy checkpoint every 5 stages/units
- Context budget poll at every stage boundary
- Memory WRITE path at S11 (not just READ at S3)
- Skill auto-creation at S11.5 when patterns compound
- Cron registration at S11.5 (weekly /scrutinize, daily /weekly-synthesis, hourly /system-health)
- /dont-reinvent intercept at S0.5 with HARD STOP if existing engine covers ≥80%
- /system-health + /coordination-dashboard baseline at S0
- /scrutinize-mark explicit verdict-recording at S10
- analysis:token-usage on the scrutiny round itself
- 43 quality-standard items (vs v2's 28)

**Live counts** (refresh via `node scripts/update-prism-inventory.mjs --quiet`):
3,165+ engines · 97 dispatchers · 7,302 actions · 413 hooks · 520 skills · 770 wiki · 189 memories · 4,245 tribal · 540+ scripts · 9 MCP plugins · 6 Ollama models · 40+ AI/ML engines.

If `/rgs3` is invoked here without the user-global file present, fall back: read this mirror, redirect to "see authoritative spec at H:/.claude/commands/rgs3.md", and bail rather than running a partial pipeline.
