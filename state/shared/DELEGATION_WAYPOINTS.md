# Delegation Waypoints — Phase 0.17 U-PLG5

**Audience:** Claude + Codex sessions working through Phase 0 of
`MASTER-AI-SYSTEM-ROADMAP-2026-04-15.md`. Companion to
`state/shared/CLAUDE-CODEX-ROADMAP-EXECUTION-DIRECTIVE.md`.

**Purpose.** Phase 0.17 registered 134 Task-tool agents, 307 slash
commands, and 8 MCP plugins — but utilization auditing shows **0.7%**
of agents have been reached in the last 30 days (see
`npx tsx mcp-server/scripts/commands-audit.ts`). The Phase 0 buildout
is the *first dogfooding* of the activation layer: when you hit one of
the milestones below, you MUST delegate to the named agent/skill rather
than doing it yourself. Without this, Phase 0.17 is installed but
unused.

This document is the authoritative list of those waypoints. Update it
when a new Phase 0 milestone is added.

---

## Core delegation matrix

| Phase / milestone trigger | Delegate to | Why |
|---------------------------|-------------|-----|
| **Phase 0.6** — auto-wiring pass (engines → dispatchers)                          | `dispatcher-wirer` agent                                                                                             | Specialist knows the lazy-import + z.enum + case pattern. Reduces drift across the 92 dispatchers. |
| **Phase 0.7** — index/registry builds (ENGINE_DIGEST, MASTER_INDEX, etc.)         | `perf-analyzer` agent                                                                                                | Index builds are I/O heavy; perf-analyzer catches quadratic scans before they ship. |
| **Phase 0.11** — exit-gate validation                                             | `verifier` + `pr-review-toolkit:silent-failure-hunter` + `pr-review-toolkit:type-design-analyzer` (**parallel**)     | Fan-out: verifier runs tests, silent-failure-hunter scans swallowed errors, type-design-analyzer catches weak types. All independent → one block of 3 Task calls. |
| **Phase 0.13** — awareness + cross-terminal ordering                              | `consensus-coordinator` agent                                                                                        | Multi-session mesh ordering benefits from a specialist that has primitives for quorum + vector clocks. |
| **Phase 0.16** — retrofit existing artifacts into registries (Phase 0.17 gate)    | `queen-coordinator` + `implementer` (**team via team-dispatch skill**)                                               | Queen plans the retrofit wave, implementer executes per-file. Team dispatch handles lifecycle. |
| **Phase 0.17** — documentation/audit cadence                                      | `/commands-audit` skill + `documentation:README` agent                                                               | Audit surfaces utilization gaps. Docs agent ensures skill docs stay synced. |
| **Phase 0.18** — autonomous goal synthesis testing                                | `researcher` agent                                                                                                   | Exploratory: research what goals the synthesizer produces before locking acceptance criteria. |

---

## Event-driven delegation (not tied to a phase)

These fire whenever a trigger condition is met, regardless of which
phase you're in.

| Trigger | Delegate to | Notes |
|---------|-------------|-------|
| Any PR review (≥50 LOC changed)                                    | `/pr-swarm` skill (5-agent parallel fan-out)            | Uses `pr-review-toolkit:code-reviewer` + `silent-failure-hunter` + `pr-test-analyzer` + `comment-analyzer` + `type-design-analyzer`. See `H:/.claude/commands/pr-swarm.md`. |
| Complete rebuild of a registry/catalog with >100 entries           | `catalog-enricher` agent                                 | Specialist for bulk gap-filling + manufacturer-spec lookups. Do NOT scrape one at a time. |
| Unexpected test failure with non-obvious root cause                | `regression-hunter` agent                                | Traces failure to source change, identifies test-vs-logic issue. |
| New engine for physics domain (Kienzle, Taylor, deflection, etc.)  | `safety-physics` agent BEFORE edit + `physics-reviewer` agent AFTER | HARD BLOCK: S(x) < 0.70 fails the edit. Physics-reviewer cross-checks against canonical constants. |
| Build failure with ≥3 errors                                       | `build-doctor` agent                                     | Categorizes errors, fixes root causes before symptoms. |
| CAD-related bulk operation on H:/PRISM/JM DIE                      | `code-archaeologist` agent (read-only exploration)       | Before bulk CAD ops, map dependencies to avoid breaking in-use programs. |
| "Design a new subsystem" (multi-engine + multi-dispatcher)         | `/sparc` skill (opt-in via `ai_sparc_optin`)             | **Default off.** Spec → pseudo → arch → refine → complete chain. Only for genuinely novel subsystems. |

---

## Rules of the waypoints

1. **One waypoint = one explicit delegation.** Don't skip the
   delegation because you think you can do it faster yourself — the
   activation layer only pays off once Task-tool traffic actually
   reaches the specialist agents. Ledger proof:
   `state/shared/AGENT_UTILIZATION_LEDGER.jsonl`.

2. **Parallel when independent.** Phase 0.11 exit gate specifies
   three agents running simultaneously. ALWAYS issue those as three
   tool calls in one assistant turn, not sequentially.

3. **Claim before delegating.** Use
   `node .claude/helpers/roadmap-claim-registry.mjs claim` with the
   unit ID before spawning the agent, so other sessions don't grab
   the same waypoint.

4. **Log the delegation.** The PostToolUse `^Task$` hook
   (`.claude/hooks/agent-util-log.mjs`) auto-writes each Task call to
   the ledger. No manual logging needed — but DO verify with
   `node .claude/helpers/agent-util-ledger.mjs stats` after a session
   that your deleg counts went up.

5. **Fall back when unavailable.** If the named agent is unreachable
   (plugin not loaded, etc.), log the gap in
   `state/shared/AGENT_CHAT.md` and use the nearest generic alternative
   (`general-purpose`, `implementer`). Do NOT silently skip
   specialization.

6. **Update this doc** when the roadmap adds new Phase 0 milestones
   or you learn a new specialist-matching-rule from experience.

---

## Utilization scorecard (post-Phase-0 exit)

Phase 0 is not done until all waypoints above have **≥1 invocation**
in `AGENT_UTILIZATION_LEDGER.jsonl` within the window measured by
`/commands-audit --since 30d`. This is the dogfooding proof that the
activation layer is live, not just installed.

Measurement command:

```bash
cd H:/prism/mcp-server && npx tsx scripts/commands-audit.ts --since 30d
# Look for:
#   "utilization: X% reached at least once"
#   unused by category breakdown
```

Target: ≥5 distinct non-general-purpose agents invoked per week
(per MASTER-AI-SYSTEM-ROADMAP Phase 0.17 quantified outcome).

---

## Phase
0.17 — Plugin Activation & Command Bridge, unit U-PLG5

## Cross-references
- `MASTER-AI-SYSTEM-ROADMAP-2026-04-15.md` §Phase 0.17 table, U-PLG5 row
- `state/shared/CLAUDE-CODEX-ROADMAP-EXECUTION-DIRECTIVE.md`
- `mcp-server/data/state/AGENT_REGISTRY.json` (134 agents, triggers)
- `H:/.claude/commands/commands-audit.md` (audit runner)
- `H:/.claude/commands/pr-swarm.md`, `H:/.claude/commands/sparc.md`
- `.claude/hooks/agent-util-log.mjs` (PostToolUse ledger)
