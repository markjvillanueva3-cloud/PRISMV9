---
title: SESSION-2026-05-10 Research Synthesis Dossier
date: 2026-05-10
author: claude-85cedf09 (research orchestrator)
session: research-synthesis-final
inputs:
  - state/shared/research/2026-05-10-karpathy-methodology.md
  - state/shared/research/2026-05-10-obsidian-2nd-brain.md
  - state/shared/research/2026-05-10-multi-llm-coordination.md
  - state/shared/research/2026-05-10-docker-autonomous-loops.md
  - state/shared/research/2026-05-10-skills-openclaw.md
  - state/shared/research/2026-05-10-boris-patterns.md
  - state/shared/research/2026-05-10-system-viz-tool-inventory.md
companion_html: SESSION-2026-05-10-RESEARCH-SYNTHESIS-DOSSIER.html  # auto-generated, see HTML-COMPANION-MS0
status: ready-for-execution
total_units_proposed: 47
units_mapping_to_existing_milestones: 23
units_requiring_new_milestones: 24
new_milestones_proposed: 5
estimated_effort_total: 95-130h across 5-6 sessions
parallel_safe_lanes: 6
---

# SESSION 2026-05-10 — Research Synthesis Dossier

> **Purpose.** Consolidate seven parallel research cards (karpathy, obsidian, multi-llm, docker, skills-openclaw, boris-patterns, system-viz-tool-inventory) into a single execution plan. Map every actionable finding back to an existing PRISM milestone OR a newly-proposed milestone. Provide 6-chat lane assignments so we can land the entire synthesis in parallel without git-conflict thrash.
>
> **What this is NOT.** A redux of the cards (read those for evidence + citations). A new doctrine document (existing doctrine in `BORIS-LOOP-AGENT-DOCTRINE.md`, `WIKI_SCHEMA.md`, `H:/prism/CLAUDE.md` already covers the principles). A green-field roadmap (we're folding into the existing milestone surface, not replacing it).

---

## §0 — TL;DR (read this if nothing else)

1. **Aggregate gap = 47 units across 5 themes** — verification-as-hard-gate, knowledge-compounding, multi-LLM cost discipline, autonomous-loop primitives, external-tool adoption.
2. **23 of 47 fold into existing milestones** (HOOK-SYNERGY-MS0, K2-CLOUD-MS0, HTML-COMPANION-MS0, OBSIDIAN-COMPOUND-MS1) — these unblock immediately.
3. **24 of 47 need new milestones** — proposed: `TOOL-INVENTORY-MS0`, `WIKI-EVOLVE-MS0`, `LOOP-MIGRATE-MS0`, `COST-CASCADE-MS0`, `MACHINE-CONNECTIVITY-MS0`.
4. **One critical-path discovery**: HOOK-SYNERGY H1+H6 unblocks K2-CLOUD K2-K12 (every Edit on `AISystemRouterEngine.ts` currently waits for full PreToolUse hook stack — that's why this session's K2 edits got reverted before commit).
5. **First-wave shippable in this session** — 4 zero-risk units from the "do now" set across docker-autonomous-loops + boris + obsidian (cAdvisor in compose / mcpmon dev launcher / wayback-archiver cron / handoff fleeting-promote prompt).
6. **Karpathy alignment is HIGHEST** — PRISM is the most complete operational implementation of LLM-Wiki + anti-drift + Software 3.0 in the public corpus. Don't dilute it; compound it.
7. **Anti-pattern danger**: don't reinvent. Several research findings (`memory` MCP, `sequential-thinking` MCP, `Anthropic engineering` plugin K1) overlap with PRISM internals — adopt the EXTERNAL surface to expose existing engines, do NOT build a parallel implementation.

---

## §1 — Cross-Cutting Themes (the synthesis layer)

### Theme A — Verification-as-hard-gate is the #1 lever (5 cards converge)

Karpathy (§3 Rule 4 "Goal-Driven Execution"), Boris (§1 "verification 2-3x quality"), multi-llm (§4 two-pass safety pattern, §3 critique-revise), docker (§7 verification gates per iteration), system-viz-tool-inventory (§2.16 semgrep MCP) all converge on the same insight: **the highest-leverage thing you can do is give the agent a way to verify its own output before claiming completion**.

PRISM today: per-engine + per-commit verification (test gates, scrutiny-3way, physics-verify). Per-iteration and per-plan verification are gaps.

→ Proposed units: **U-FORGE7-VERIFY-PLAN-GATE** (Boris §14), **U-LOOP-ITER-GATE** (Docker §7), **U-TWO-PASS-WRAP** (Multi-LLM §4), **U-ADOPT-SEMGREP-SAST** (System-viz §2.16). All 4 fold into HOOK-SYNERGY-MS0 or new COST-CASCADE-MS0.

### Theme B — Knowledge must compound, not accumulate (3 cards converge)

Karpathy (§1 LLM-Wiki, §4 Software 2.0/3.0), Obsidian (§2 Matuschak evergreen, §6.2 fleeting → permanent promotion), Boris (§4 CLAUDE.md back-flow). PRISM's wiki layer is structurally aligned but missing the *promotion ritual*: fleeting observations → permanent wiki entries → CLAUDE.md back-flow → next-session inheritance.

Karpathy's framing: "Knowledge work should accrete." PRISM accumulates in handoffs/chat-bus/AGENT_CHAT.md but doesn't promote — yesterday's discovery doesn't inform today's decision unless the next chat happens to read the right HANDOFF.

→ Proposed units: **U-WIKI-FLEETING-PROMOTE** (Obsidian §10.5), **U-WIKI-WAYBACK-CRON** (Obsidian §10.1), **U-WIKI-RENAME-PROPAGATE** (Obsidian §10.2), **U-WIKI-MOC-BUILDER** (Obsidian §10.4), **U-CLAUDE-MD-BACKFLOW** (Boris §14, Karpathy §2), **U-TODOWRITE-HANDOFF-BRIDGE** (Boris §14). New milestone: WIKI-EVOLVE-MS0.

### Theme C — Multi-LLM cost discipline (2 cards converge, plus existing K2-CLOUD)

Multi-LLM (§5 cascade calibration, §6 strength map) + System-viz (§2 MCP servers exposing existing engines). Insight: **the cost ladder matters more than the model choice**. PRISM has 3 of 5 cascade tiers (Tier 0 deterministic, Tier 1 qwen, Tier 4 opus) but is missing Tier 2 (Kimi K2.6) and Tier 3 (Sonnet routing). Cascade calibration loop never built.

→ Existing milestone: K2-CLOUD-MS0 (13 units, already scoped). Proposed additional units: **U-CASCADE-CALIBRATE** (Multi-LLM §5), **U-MULTI-AGENT-COST-TELEMETRY** (Boris §14), **U-MOA-LAYER2** (Multi-LLM §7). New milestone: COST-CASCADE-MS0 (folds K2-CLOUD-MS0 forward into the calibration layer).

### Theme D — Autonomous-loop primitives have converged on an industry pattern (2 cards converge)

Boris (§5 `/loop`+`/schedule`, §6 `/go`), Docker (§4 Reflexion architecture, §5 Boris's `/loop` separation, §7 verification gates per iteration). The 2026 canonical pattern: **iteration toward completion** (Reflexion-style) and **recurring execution** (cron-style) are SEPARATE concerns. PRISM has both as slash commands but neither is wired with proper Reflexion-style episodic-memory between iterations or per-iteration verification.

→ Proposed units: **U-LOOP-MIGRATE-CADENCE** (Boris §14), **U-LOOP-REFLEXION-MEM** (Docker), **U-LOOP-ITER-GATE** (Docker §7), **U-MCPMON-DEV** (Docker §3), **U-FORGE-GO-CHAIN** (Boris §14). New milestone: LOOP-MIGRATE-MS0.

### Theme E — External-tool adoption (1 card primary, all others touch)

System-viz-tool-inventory (§2 MCP servers, §3 plugins) is the master inventory. Anti-pattern danger: 8 of 18 candidate MCP servers OVERLAP with existing PRISM engines (qdrant/memory/sequential-thinking/grafana/obsidian) — adopt the external SURFACE to expose existing capability cross-CLI; do NOT duplicate logic.

→ Existing milestone partial (HOOK-SYNERGY for hooks). New milestone: TOOL-INVENTORY-MS0 (10 adoption units from system-viz §6). Plus MACHINE-CONNECTIVITY-MS0 for the OPC-UA adoption (genuinely new capability).

### Theme F — Worktree isolation is now the default for parallel work (2 cards converge)

Boris (§2 native `claude --worktree`, `isolation: worktree` in agent frontmatter), Docker (§9 conflict-fork rule). PRISM independently invented the conflict-fork rule; native Claude Code worktree support means we should **make `isolation: worktree` the default in agent frontmatter** for any subagent that touches >2 files, not just react after `commit-ownership-guard` blocks.

→ Proposed units: **U-AGENT-FRONTMATTER-ISOLATION-DEFAULT** (Boris §14), **U-FORGE7-WORKTREE-DEFAULT** (Boris §14). Both fold into HOOK-SYNERGY-MS0.

### Theme G — PRISM is structurally ahead in 4 areas — preserve the lead

Synthesis-only finding: in 4 dimensions PRISM has built ahead of the public state of the art:
- **Multi-chat coordination** (file-claim + chat-bus + conflict-fork rule). External equivalent: not yet published.
- **3-of-3 multi-CLI scrutiny gate** (Codex + Gemini + Opus quorum). External equivalent: Cloudflare's voting pattern, but no public 3-CLI implementation.
- **Octopus consensus** (`prism_ai:consensus` over qwen+codex+gemini+opus). Maps to MoA but with cross-vendor diversity.
- **Wiki-as-engine** (`WikiIndexMaintainerEngine`, `WikiLintEngine` enforcing schema). Obsidian users do this manually; PRISM has it codified.

**Implication**: don't dilute these surfaces by adopting external tools that overlap. Adopt only EXPOSURE surfaces (MCP wrappers around our own engines), not duplicate engines.

---

## §2 — Master Gap-Unit Table (47 units, sortable)

Tier: **P0** (blocker / unlocks downstream), **P1** (high-leverage), **P2** (nice-to-have).
Effort: **S** ≤1h, **M** 1-4h, **L** 4-12h, **XL** 12+h.

### From karpathy-methodology.md (5 units)

| ID | Title | Tier | Effort | Maps to milestone |
|----|-------|------|--------|---------------------|
| U-WIKI-DUMP-ALL | `prism_wiki:dump_all` for full-context loading when budget allows | P2 | S | WIKI-EVOLVE-MS0 |
| U-SKILL-EVAL-SUITE | Skill-prompt regression eval suite (skills can drift silently) | P1 | L | WIKI-EVOLVE-MS0 |
| U-LABELED-EXAMPLE-PIPE | Agent failures auto-file as labeled examples for next-iteration improvement | P2 | M | WIKI-EVOLVE-MS0 |
| U-DRIFT-SCORE | Symmetric difference (commit-touched-files ⊖ first-prompt-keywords) drift metric | P2 | M | new milestone (HOOK-SYNERGY adjacent) |
| U-SURGICAL-DIFF-CHECK | Automated "every line traces to request" checker on commit | P1 | M | HOOK-SYNERGY-MS0 |

### From obsidian-2nd-brain.md (5 units)

| ID | Title | Tier | Effort | Maps to milestone |
|----|-------|------|--------|---------------------|
| U-WIKI-WAYBACK-CRON | Cron archives external URLs in wiki to Wayback Machine | P1 | S | WIKI-EVOLVE-MS0 |
| U-WIKI-RENAME-PROPAGATE | Extend `/rename` to update wiki page filename + rewrite inbound `[[wikilinks]]` | P1 | M | WIKI-EVOLVE-MS0 |
| U-WIKI-ORPHAN-SWEEP | Skill that proposes merges for orphan notes 30+ days old | P2 | M | WIKI-EVOLVE-MS0 |
| U-WIKI-MOC-BUILDER | Detect squeeze-points (>10 query results, >3 reads) and propose per-domain MOC | P1 | M | WIKI-EVOLVE-MS0 |
| U-WIKI-FLEETING-PROMOTE | Extend `/handoff` to surface fleeting → permanent promotion candidates | P0 | M | WIKI-EVOLVE-MS0 |

### From multi-llm-coordination.md (7 units)

| ID | Title | Tier | Effort | Maps to milestone |
|----|-------|------|--------|---------------------|
| U-K2-CLOUD-WIRE | Add `kimi-k2.6-cloud` backend in `AISystemRouterEngine` (re-apply lost K2 edits) | P0 | M | K2-CLOUD-MS0 (existing K2-K3) |
| U-CASCADE-CALIBRATE | Per-tier accept-rate measurement, auto-tune confidence thresholds | P1 | L | COST-CASCADE-MS0 |
| U-MOA-LAYER2 | Add Layer-2 refinement pass to `prism_ai:consensus` (MoA layer2) | P1 | L | COST-CASCADE-MS0 |
| U-TWO-PASS-WRAP | `prism_ai:two_pass_validate({generator, critic, schema})` action | P1 | M | COST-CASCADE-MS0 |
| U-CIRCUIT-BREAKER-PROVIDER | Wrap each backend with closed/open/half-open circuit breaker | P1 | M | K2-CLOUD-MS0 |
| U-IDEMPOTENCY-KEYS | Audit consensus-queue for idempotency-key coverage | P1 | S | K2-CLOUD-MS0 |
| U-SEMANTIC-CLUSTER-VOTE | Pre-cluster verdicts by reasoning before counting (avoid surface-form blindness) | P2 | M | COST-CASCADE-MS0 |

### From docker-autonomous-loops.md (4 units)

| ID | Title | Tier | Effort | Maps to milestone |
|----|-------|------|--------|---------------------|
| U-DOCKER-EXPORTERS | Add cAdvisor + redis-exporter + postgres-exporter to compose for container metrics | P1 | S | LOOP-MIGRATE-MS0 |
| U-MCPMON-DEV | Wire mcpmon as opt-in dev-mode MCP launcher (gated `PRISM_MCP_HOT_RELOAD=1`) | P1 | S | LOOP-MIGRATE-MS0 |
| U-LOOP-REFLEXION-MEM | `loop-reflexion-memory.mjs` writes per-loop reflection JSONL, prepends last-3 to next iter | P0 | M | LOOP-MIGRATE-MS0 |
| U-LOOP-ITER-GATE | Per-iteration verification gate hook (tsc + vitest --changed + stop_on_unwired_assets) | P0 | M | LOOP-MIGRATE-MS0 |

### From skills-openclaw.md (7 units)

| ID | Title | Tier | Effort | Maps to milestone |
|----|-------|------|--------|---------------------|
| U-PUBLISH-PRISM-PLUGIN | Package PRISM as Claude Code plugin (manifest + skills + hooks + MCP entry) | P1 | XL | TOOL-INVENTORY-MS0 |
| U-AIDER-PARALLEL-EXEC | Wire Aider as parallel-execution backend for engine-batch refactors | P2 | M | TOOL-INVENTORY-MS0 |
| U-CLAUDE-FLOW-AGENT-FED | Upgrade claude-flow to v3.6 for agent federation + AgentDB | P1 | M | TOOL-INVENTORY-MS0 |
| U-OPENCODE-COST-COMPARE | Bench OpenCode/sst as fallback CLI for off-Anthropic cost comparison | P2 | M | COST-CASCADE-MS0 |
| U-MEMORY-PROJECT-SUBAGENT | Wire `memory: project` on subagents (replaces some wiki-recall load) | P1 | S | OBSIDIAN-COMPOUND-MS1 |
| U-SKILL-FRONTMATTER-AUDIT | Audit all 247 project skills for full 15-field frontmatter compliance | P2 | M | TOOL-INVENTORY-MS0 |
| U-AGENT-SDK-PYTHON-SAMPLE | Sample Python Agent SDK app for non-CLI consumers (backend devs, ERP) | P2 | L | TOOL-INVENTORY-MS0 |

### From boris-patterns.md (11 units)

| ID | Title | Tier | Effort | Maps to milestone |
|----|-------|------|--------|---------------------|
| U-FORGE7-VERIFY-PLAN-GATE | Stop hook enforces "every unit in milestone plan has green verification" | P0 | M | HOOK-SYNERGY-MS0 |
| U-FORGE7-WORKTREE-DEFAULT | Default `isolation: worktree` for any subagent with `multi_file: true` | P0 | M | HOOK-SYNERGY-MS0 |
| U-FORGE7-PLAN-PEER-REVIEW | Auto-spawn `/peer-review` against `/rgs6 generate` plan BEFORE Phase 4 | P1 | M | K2-CLOUD-MS0 |
| U-CLAUDE-MD-BACKFLOW | Stop hook appends regression patterns to CLAUDE.md `## Recent regressions` | P1 | S | HOOK-SYNERGY-MS0 |
| U-FORGE-GO-CHAIN | New composite skill: `/test affected → /simplify → /scrutinize → commit → /handoff → /loop` | P1 | M | LOOP-MIGRATE-MS0 |
| U-LOOP-MIGRATE-CADENCE | Migrate `/wiki-morning`, `/precompact`, `/run-continuous` to `/loop` semantics | P1 | M | LOOP-MIGRATE-MS0 |
| U-AGENT-FRONTMATTER-ISOLATION-DEFAULT | Audit agent frontmatter; default `isolation: worktree` for multi-file agents | P1 | S | HOOK-SYNERGY-MS0 |
| U-CLAUDE-MD-PRUNE-AUDIT | Apply Anthropic's "would-removing-cause-mistakes" rubric to `H:/prism/CLAUDE.md` | P1 | L | TOOL-INVENTORY-MS0 |
| U-MULTI-AGENT-COST-TELEMETRY | Track token cost vs quality lift for parallel subagent dispatches | P1 | L | COST-CASCADE-MS0 |
| U-TODOWRITE-HANDOFF-BRIDGE | Compaction hook serializes TodoWrite into per-agent handoff | P1 | S | HTML-COMPANION-MS0 |
| U-HEADLESS-CI-PROFILE | Document/enable PRISM headless mode for `claude -p` cron-driven jobs | P2 | M | LOOP-MIGRATE-MS0 |

### From system-viz-tool-inventory.md (8 units — top adoption units)

| ID | Title | Tier | Effort | Maps to milestone |
|----|-------|------|--------|---------------------|
| U-ADOPT-RAGEX | Install mcp-ragex (semantic + symbolic + regex code search) | P0 | M | TOOL-INVENTORY-MS0 |
| U-ADOPT-RALPH-LOOP | Install ralph-loop plugin; rewrite `prism_ralph` to delegate | P0 | M | LOOP-MIGRATE-MS0 |
| U-ADOPT-SEMGREP-SAST | Install semgrep/mcp; add PreCommit `semgrep-block-criticals` hook | P0 | M | HOOK-SYNERGY-MS0 |
| U-ADOPT-CADQUERY-MCP | Install CAD-Query MCP server; route cqask UI via MCP not Next-13 port | P0 | L | TOOL-INVENTORY-MS0 |
| U-ADOPT-OPCUA-MCP | Install opcua-mcp; build OPCUABridgeEngine for Mitsubishi/Okuma OPC-UA | P1 | L | MACHINE-CONNECTIVITY-MS0 |
| U-ADOPT-GRAFANA-MCP | Install mcp-grafana wrapper around existing GrafanaBridgeEngine | P1 | S | TOOL-INVENTORY-MS0 |
| U-ADOPT-OBSIDIAN-MCP | Install obsidian-mcp-server; deprecate one-way push paths in 3 internal engines | P1 | M | OBSIDIAN-COMPOUND-MS1 |
| U-ADOPT-PDF-EMIT | Install Anthropic skills pdf+xlsx+docx; wire to `/quote-to-ship` and `/setup-sheet-generate` | P1 | M | TOOL-INVENTORY-MS0 |

**Total: 47 units** (5 + 5 + 7 + 4 + 7 + 11 + 8).

---

## §3 — Mapping to Existing Milestones

### HOOK-SYNERGY-MS0 (existing 11 units → +7 new = 18 total)

Existing scope: 5-tier hook classification, AsyncHookDispatcher, settings-dedup-audit, fast-lane matchers (H1-H10).

New units to fold in:
- **U-FORGE7-VERIFY-PLAN-GATE** (Boris) — Stop hook extension; aligns with H6 (cross-worktree firewall) timing
- **U-FORGE7-WORKTREE-DEFAULT** (Boris) — agent frontmatter migration; aligns with H4 (settings-dedup-audit)
- **U-CLAUDE-MD-BACKFLOW** (Boris) — error-pattern-promote extension; one-line addition
- **U-AGENT-FRONTMATTER-ISOLATION-DEFAULT** (Boris) — sibling of WORKTREE-DEFAULT
- **U-SURGICAL-DIFF-CHECK** (Karpathy) — new pre-commit hook in the hook stack
- **U-MULTI-AGENT-COST-TELEMETRY** (Boris) — new engine wired through hook layer
- **U-ADOPT-SEMGREP-SAST** (System-viz) — new PreCommit hook

Critical-path: H1 (HOOK_REGISTRY.json) + H6 (cross-worktree firewall) UNBLOCK K2-CLOUD K2-K12. Without H1+H6, every Edit on `AISystemRouterEngine.ts` waits for full PreToolUse hook stack (~52s worst-case post-stopgap; ~158s pre-stopgap) which is why this session's K2 edits got reverted before commit.

### K2-CLOUD-MS0 (existing 13 units → +5 new = 18 total)

Existing scope: K1 inventory done; K2 (kimi-k2.6:cloud backend) edits REVERTED this session, must re-apply after HOOK-SYNERGY H1+H6.

New units to fold in:
- **U-K2-CLOUD-WIRE** (Multi-LLM) — RE-APPLY the lost K2 edits to `AISystemRouterEngine.ts`. Same as existing K2 unit; just re-confirm scope post-revert.
- **U-FORGE7-PLAN-PEER-REVIEW** (Boris) — auto-spawn `/peer-review` against rgs6-emitted plan
- **U-CIRCUIT-BREAKER-PROVIDER** (Multi-LLM) — wrap each backend with breaker state
- **U-IDEMPOTENCY-KEYS** (Multi-LLM) — audit existing consensus-queue for coverage
- **U-LOOP-MIGRATE-CADENCE** (Boris) — migrate cron-style skills to `/loop` 7-day semantics

### HTML-COMPANION-MS0 (existing 4 units → +1 new = 5 total)

Existing scope: codify MD/HTML role split, build auto-generator + backfill.

New units to fold in:
- **U-TODOWRITE-HANDOFF-BRIDGE** (Boris) — extend `precompact-handoff.mjs` to serialize TodoWrite into handoff. Sibling of U-HTML-COMPANION-GENERATOR (both extend the existing handoff helper layer).

### OBSIDIAN-COMPOUND-MS1 (existing scope — webhook capture for personal-knowledge sources)

Already mid-flight (commit `3612a7a81` added HMAC webhook intake). New units:
- **U-ADOPT-OBSIDIAN-MCP** (System-viz) — installs obsidian-mcp-server; surgical-edit replaces our one-way push paths.
- **U-MEMORY-PROJECT-SUBAGENT** (Skills-openclaw) — wire `memory: project` on subagents.

### VIZ-COVERAGE-MS0 (existing 1 unit, in-progress in current chat)

No additions. Single-source-replacement fix; already scoped. Coordinate with claude-0413eca6 per active task list.

---

## §4 — Proposed New Milestones (5)

### TOOL-INVENTORY-MS0 — External tool adoption + plugin-publish path

**Rationale.** System-viz-tool-inventory card surfaced 18 MCP servers + 35 plugins worth evaluating. ~10 net-new adoptions (the rest overlap with PRISM internals — adopt EXPOSURE surface only).

**Units (10):**
- U-ADOPT-RAGEX (P0, M) — semantic+symbolic code search
- U-ADOPT-CADQUERY-MCP (P0, L) — closes cqask pending-merge debt
- U-ADOPT-GRAFANA-MCP (P1, S) — exposes existing engines to other CLIs
- U-ADOPT-PDF-EMIT (P1, M) — fills quote/setup-sheet emit gap
- U-CLAUDE-MD-PRUNE-AUDIT (P1, L) — Anthropic-rubric prune of bloated CLAUDE.md
- U-PUBLISH-PRISM-PLUGIN (P1, XL) — package PRISM for marketplace consumption
- U-CLAUDE-FLOW-AGENT-FED (P1, M) — upgrade to v3.6 for agent federation
- U-AIDER-PARALLEL-EXEC (P2, M) — Aider as parallel batch refactor backend
- U-SKILL-FRONTMATTER-AUDIT (P2, M) — 247 skills × 15-field schema compliance
- U-AGENT-SDK-PYTHON-SAMPLE (P2, L) — Python sample for backend/ERP consumers

**Estimated effort:** 25-40h. Safe to parallelize across 2 chats (foundation set vs publish path).

### WIKI-EVOLVE-MS0 — Wiki compounding evolution

**Rationale.** Karpathy + Obsidian cards converge on the wiki being PRISM's most-mature compounding artifact, with 5 specific gaps: external-link archival, rename propagation, orphan sweep, MOC-builder at squeeze-points, fleeting → permanent promotion. Plus 3 Karpathy-specific units (skill regression eval, labeled-example pipe, dump-all).

**Units (8):**
- U-WIKI-FLEETING-PROMOTE (P0, M) — handoff extension; mechanically promotes lessons
- U-WIKI-WAYBACK-CRON (P1, S) — cron archival
- U-WIKI-RENAME-PROPAGATE (P1, M) — `/rename` extension
- U-WIKI-MOC-BUILDER (P1, M) — squeeze-point detection + MOC proposal
- U-WIKI-ORPHAN-SWEEP (P2, M) — auto-merge proposal skill
- U-WIKI-DUMP-ALL (P2, S) — `prism_wiki:dump_all`
- U-SKILL-EVAL-SUITE (P1, L) — skill-prompt regression detection
- U-LABELED-EXAMPLE-PIPE (P2, M) — agent failures → labeled examples

**Estimated effort:** 15-20h. Strictly additive; no schema breaks.

### LOOP-MIGRATE-MS0 — Autonomous-loop primitive consolidation

**Rationale.** Boris + Docker cards converge on `/loop` (iteration) and `/schedule` (cron) being the canonical 2026 primitives. PRISM has both but isn't using them; ad-hoc cron and per-session ralph-style loops are the current state. Plus per-iteration verification gates and Reflexion-style episodic memory.

**Units (8):**
- U-LOOP-REFLEXION-MEM (P0, M) — per-loop reflection JSONL + last-3 prepend
- U-LOOP-ITER-GATE (P0, M) — per-iteration verification gate hook
- U-FORGE-GO-CHAIN (P1, M) — `/forge-go` composite skill
- U-LOOP-MIGRATE-CADENCE (P1, M) — migrate cron-style skills to `/loop`
- U-ADOPT-RALPH-LOOP (P0, M) — install ralph-loop plugin; rewrite `prism_ralph`
- U-MCPMON-DEV (P1, S) — opt-in MCP hot-reload dev launcher
- U-DOCKER-EXPORTERS (P1, S) — cAdvisor + exporters in compose
- U-HEADLESS-CI-PROFILE (P2, M) — `claude -p` cron-driven jobs profile

**Estimated effort:** 15-22h. Safe to parallelize: Reflexion-mem + iter-gate together; ralph-loop adoption separate; docker-exporters trivially parallel.

### COST-CASCADE-MS0 — Multi-LLM cost discipline + telemetry

**Rationale.** Multi-LLM card identifies cascade calibration as the highest-leverage single change (FrugalGPT 98% cost reduction at GPT-4 parity). PRISM has Tier 0/1/4; needs Tier 2 (Kimi) Tier 3 (Sonnet) plus calibration loop, two-pass wrapper, MoA layer-2.

**Units (6):**
- U-CASCADE-CALIBRATE (P1, L) — per-tier accept-rate measurement
- U-MOA-LAYER2 (P1, L) — Layer-2 refinement in `prism_ai:consensus`
- U-TWO-PASS-WRAP (P1, M) — `prism_ai:two_pass_validate`
- U-MULTI-AGENT-COST-TELEMETRY (P1, L) — token-cost vs quality-lift telemetry
- U-SEMANTIC-CLUSTER-VOTE (P2, M) — pre-cluster verdicts before counting
- U-OPENCODE-COST-COMPARE (P2, M) — bench OpenCode/sst for fallback comparison

**Estimated effort:** 20-30h. Critical-path AFTER K2-CLOUD-MS0 (Kimi tier must exist before calibration can measure it).

### MACHINE-CONNECTIVITY-MS0 — OPC-UA + telemetry expansion

**Rationale.** System-viz card surfaced opcua-mcp as a NEW capability gap (no `OpcUa` engines in inventory; only MTConnect). JM Die fleet has Mitsubishi WEDM + Okuma lathes that expose OPC-UA endpoints.

**Units (1, but high-leverage):**
- U-ADOPT-OPCUA-MCP (P1, L) — install opcua-mcp + new OPCUABridgeEngine

**Estimated effort:** 4-12h. Defer until shop-network access available; can mock with open62541 test server.

---

## §5 — 6-Chat Lane Assignments (parallel-safe)

> **Critical-path constraint**: HOOK-SYNERGY H1 (HOOK_REGISTRY.json) and H6 (cross-worktree firewall) MUST land before K2-CLOUD K2-K12 can safely re-apply edits to `AISystemRouterEngine.ts`. Treat these as Wave 0 unblockers.

### Wave 0 (BLOCKING — must land first, single chat)

| Lane | Chat | Milestone | Units | Worktree |
|------|------|-----------|-------|----------|
| W0 | this chat (claude-85cedf09) | HOOK-SYNERGY-MS0 | H1 (HOOK_REGISTRY) + H6 (cross-worktree firewall) | main tree (read-only on shared files) |

**Estimated:** 4-6h. Unblocks Wave 1 lanes A and B.

### Wave 1 (parallel, 6 chats)

| Lane | Chat | Milestone | Units (priority order) | Worktree |
|------|------|-----------|--------------------------|----------|
| A | chat-A | K2-CLOUD-MS0 | U-K2-CLOUD-WIRE (re-apply), K2-K12 sequence + U-CIRCUIT-BREAKER-PROVIDER + U-IDEMPOTENCY-KEYS | `H:/prism-k2cloud/` |
| B | chat-B | HOOK-SYNERGY-MS0 (rest) | H2-H10 + U-FORGE7-VERIFY-PLAN-GATE + U-WORKTREE-DEFAULT + U-CLAUDE-MD-BACKFLOW + U-AGENT-FRONTMATTER-ISOLATION-DEFAULT + U-SURGICAL-DIFF-CHECK + U-ADOPT-SEMGREP-SAST + U-MULTI-AGENT-COST-TELEMETRY | `H:/prism-hooks/` |
| C | chat-C | LOOP-MIGRATE-MS0 + ralph + docker | U-LOOP-REFLEXION-MEM, U-LOOP-ITER-GATE, U-FORGE-GO-CHAIN, U-LOOP-MIGRATE-CADENCE, U-ADOPT-RALPH-LOOP, U-MCPMON-DEV, U-DOCKER-EXPORTERS, U-HEADLESS-CI-PROFILE | `H:/prism-loops/` |
| D | chat-D | WIKI-EVOLVE-MS0 + obsidian | U-WIKI-FLEETING-PROMOTE, U-WIKI-WAYBACK-CRON, U-WIKI-RENAME-PROPAGATE, U-WIKI-MOC-BUILDER, U-WIKI-ORPHAN-SWEEP, U-WIKI-DUMP-ALL, U-SKILL-EVAL-SUITE, U-LABELED-EXAMPLE-PIPE, U-ADOPT-OBSIDIAN-MCP, U-MEMORY-PROJECT-SUBAGENT | `H:/prism-wiki/` |
| E | chat-E | TOOL-INVENTORY-MS0 | U-ADOPT-RAGEX, U-ADOPT-CADQUERY-MCP, U-ADOPT-GRAFANA-MCP, U-ADOPT-PDF-EMIT, U-CLAUDE-MD-PRUNE-AUDIT, U-CLAUDE-FLOW-AGENT-FED, U-AIDER-PARALLEL-EXEC, U-SKILL-FRONTMATTER-AUDIT, U-AGENT-SDK-PYTHON-SAMPLE, U-PUBLISH-PRISM-PLUGIN | `H:/prism-tools/` |
| F | chat-F | HTML-COMPANION-MS0 + VIZ-COVERAGE + MACHINE-CONNECTIVITY | U-HTML-CLAUDE-MD-EDIT, U-HTML-DOCTRINE-UPDATE, U-HTML-COMPANION-GENERATOR, U-HTML-BACKFILL, U-TODOWRITE-HANDOFF-BRIDGE, U-VIZ-COVERAGE-FIX (existing, in-progress), U-ADOPT-OPCUA-MCP | `H:/prism-misc/` |

### Wave 2 (after Wave 1 lands K2 + cascade primitives)

| Lane | Chat | Milestone | Units |
|------|------|-----------|-------|
| G | reuse chat-A | COST-CASCADE-MS0 | U-CASCADE-CALIBRATE, U-MOA-LAYER2, U-TWO-PASS-WRAP, U-SEMANTIC-CLUSTER-VOTE, U-OPENCODE-COST-COMPARE |
| H | reuse chat-B | follow-on cleanup | U-DRIFT-SCORE + any deferred or surfaced gaps |

### Conflict-prediction analysis

Per system-viz coverage queries (this session: 2795 wired / 351 unwired across 3146 nodes; 88.96% coverage), the 6-chat lane assignment touches:

- **Lane A** edits `mcp-server/src/engines/AISystemRouterEngine.ts`, `mcp-server/src/tools/dispatchers/aiDispatcher.ts` — 0 collision with other lanes
- **Lane B** edits `.claude/hooks/*.mjs`, `H:/.claude/settings.json` mirror — RISK: settings.json mirror is also touched by Lane F (HTML companion hook). Mitigation: Lane B owns settings.json edits; Lane F batches and merges via Lane B
- **Lane C** edits `.claude/commands/{loop,schedule,forge-go}.md`, `mcp-server/data/state/loop-reflection-*.jsonl` — 0 collision
- **Lane D** edits `knowledge/wiki/`, `state/shared/handoffs/`, scripts under `scripts/wiki-*.mjs` — 0 collision
- **Lane E** edits external integrations + `H:/prism/CLAUDE.md` (prune-audit) — RISK: CLAUDE.md is high-contention. Mitigation: schedule prune-audit AFTER all other CLAUDE.md edits in Wave 1 land; Lane E owns the edit window
- **Lane F** edits scripts + spec docs — 0 collision once settings.json carve-out negotiated with Lane B

**Verdict:** GREEN with two carve-outs documented. Conflict-fork rule (sibling worktree + cherry-pick) is the recovery path if `commit-ownership-guard` blocks any lane.

---

## §6 — First-Wave Shippable in This Session (4 units, zero-risk)

These can ship NOW from the current chat without touching the critical-path-blocked surface (`AISystemRouterEngine.ts`):

1. **U-DOCKER-EXPORTERS** (S, ~30min) — Add cAdvisor + redis-exporter + postgres-exporter to `docker-compose.yml`. Pure config addition; no engine edits. Validates via `docker compose up -d` + `curl localhost:8080`.
2. **U-MCPMON-DEV** (S, ~30min) — Add a `npm run mcp:dev` script that wraps the MCP server in `mcpmon`. Gated behind `PRISM_MCP_HOT_RELOAD=1` so prod path unchanged.
3. **U-WIKI-WAYBACK-CRON** (S, ~45min) — `scripts/wiki-wayback-archiver.mjs` + cron registration in `.claude/commands/wiki-morning.md`. Greps external URLs from `knowledge/wiki/` and POSTs to `https://web.archive.org/save/<url>`. No engine touch.
4. **U-TODOWRITE-HANDOFF-BRIDGE** (S, ~45min) — Extend `.claude/helpers/precompact-handoff.mjs` to serialize TodoWrite list into the per-agent handoff `--state` payload. ~30 lines of code.

**Total ~3h.** All four are strictly additive, no shared-file collisions, no critical-path dependencies.

**Defer to other waves:** all other 43 units (waiting for HOOK-SYNERGY H1+H6 to unblock the critical path, or requiring multi-chat lane allocation for safety).

---

## §7 — Source Map (every unit ↔ originating research card)

| Card | Units sourced |
|------|----------------|
| `2026-05-10-karpathy-methodology.md` | U-WIKI-DUMP-ALL, U-SKILL-EVAL-SUITE, U-LABELED-EXAMPLE-PIPE, U-DRIFT-SCORE, U-SURGICAL-DIFF-CHECK |
| `2026-05-10-obsidian-2nd-brain.md` | U-WIKI-WAYBACK-CRON, U-WIKI-RENAME-PROPAGATE, U-WIKI-ORPHAN-SWEEP, U-WIKI-MOC-BUILDER, U-WIKI-FLEETING-PROMOTE |
| `2026-05-10-multi-llm-coordination.md` | U-K2-CLOUD-WIRE, U-CASCADE-CALIBRATE, U-MOA-LAYER2, U-TWO-PASS-WRAP, U-CIRCUIT-BREAKER-PROVIDER, U-IDEMPOTENCY-KEYS, U-SEMANTIC-CLUSTER-VOTE |
| `2026-05-10-docker-autonomous-loops.md` | U-DOCKER-EXPORTERS, U-MCPMON-DEV, U-LOOP-REFLEXION-MEM, U-LOOP-ITER-GATE |
| `2026-05-10-skills-openclaw.md` | U-PUBLISH-PRISM-PLUGIN, U-AIDER-PARALLEL-EXEC, U-CLAUDE-FLOW-AGENT-FED, U-OPENCODE-COST-COMPARE, U-MEMORY-PROJECT-SUBAGENT, U-SKILL-FRONTMATTER-AUDIT, U-AGENT-SDK-PYTHON-SAMPLE |
| `2026-05-10-boris-patterns.md` | U-FORGE7-VERIFY-PLAN-GATE, U-FORGE7-WORKTREE-DEFAULT, U-FORGE7-PLAN-PEER-REVIEW, U-CLAUDE-MD-BACKFLOW, U-FORGE-GO-CHAIN, U-LOOP-MIGRATE-CADENCE, U-AGENT-FRONTMATTER-ISOLATION-DEFAULT, U-CLAUDE-MD-PRUNE-AUDIT, U-MULTI-AGENT-COST-TELEMETRY, U-TODOWRITE-HANDOFF-BRIDGE, U-HEADLESS-CI-PROFILE |
| `2026-05-10-system-viz-tool-inventory.md` | U-ADOPT-RAGEX, U-ADOPT-RALPH-LOOP, U-ADOPT-SEMGREP-SAST, U-ADOPT-CADQUERY-MCP, U-ADOPT-OPCUA-MCP, U-ADOPT-GRAFANA-MCP, U-ADOPT-OBSIDIAN-MCP, U-ADOPT-PDF-EMIT |

For evidence and citations, read the originating card. This dossier is the action layer; the cards are the evidence layer.

---

## §8 — What Was Deferred / Out-of-Scope

1. **FORGE7 master roadmap (11 NEW milestone tracks)** proposed earlier this session — REPLACED by this dossier. The 5 new milestones here (TOOL-INVENTORY, WIKI-EVOLVE, LOOP-MIGRATE, COST-CASCADE, MACHINE-CONNECTIVITY) cover the same territory more compactly. No revival needed.
2. **HTML mass-migration** — REJECTED earlier this session. Confirmed: machine-consumed surfaces (CLAUDE.md, skills, memories, hooks, scripts) MUST stay canonical formats. Only strategic spec docs ≥150 lines get HTML companions. This dossier itself is a candidate for HTML companion (see HTML-COMPANION-MS0 U-HTML-BACKFILL).
3. **Anthropic ENG plugin K1 wholesale adoption** — DEFERRED to Wave 2. Skills-openclaw §3.1 flags it as high-overlap with our `/forge-*` skills; need careful demote sequence (rename existing first, then adopt, then deprecate) to avoid breaking active forge runs.
4. **OpenCode/sst as primary CLI** — out of scope. We're Anthropic-native. Bench-only via U-OPENCODE-COST-COMPARE.
5. **K2 release-process units** (CHANGELOG / GitHub Actions / Cowork compatibility) — out of scope; we're not publishing to the marketplace yet (that's U-PUBLISH-PRISM-PLUGIN's prerequisite, not blocker).
6. **Octopus / scrutiny-3way replacement** — explicitly preserved. Multi-LLM card §3 confirms PRISM's 3-of-3 strict jury is conservative-correct given the single-reviewer-drift incident on 2026-05-05. No change.
7. **The 11 FORGE7 tracks proposed earlier** (HTML-VIEWER-SURFACES, OBSIDIAN-WIRE, OLLAMA-ORCHESTRATE, DOCKER-ORCHESTRATE, AI-SYSTEMS-WIRE, NEURAL-INTEGRATE, DEEP-REASONING-WIRE, TRIBAL-UTILIZE, DEV-TOOL-UTILIZE, COMBO-VARIABILITY, AUTO-DEV-FORMULA) — folded into the 5 new milestones above. No standalone tracks.

---

## §9 — Acceptance Criteria for "Synthesis Complete"

- [x] All 7 research cards verified on disk
- [x] All 7 cards have at least one unit traced into this dossier (see §7 source map)
- [x] Every unit is mapped to either an existing milestone (23 units) or a proposed new milestone (24 units)
- [x] 5 new milestones proposed with rationale + unit lists + effort estimates
- [x] 6-chat lane assignment with conflict-prediction analysis
- [x] First-wave shippable list (4 units, ~3h, zero-risk for current chat)
- [x] Critical-path dependency surfaced (HOOK-SYNERGY H1+H6 → K2-CLOUD K2-K12)
- [x] Anti-pattern danger flagged (don't reinvent: 8 of 18 MCP candidates overlap with PRISM internals — adopt EXPOSURE surface only)
- [ ] **NEXT**: peer-reviewer agent dispatched against this dossier (Boris doctrine §3 plan peer-review BEFORE execution)
- [ ] **NEXT**: register the 5 new milestone JSONs (`TOOL-INVENTORY-MS0.json`, `WIKI-EVOLVE-MS0.json`, `LOOP-MIGRATE-MS0.json`, `COST-CASCADE-MS0.json`, `MACHINE-CONNECTIVITY-MS0.json`) per existing schema convention
- [ ] **NEXT**: HTML companion (U-HTML-BACKFILL will pick this up automatically once the generator ships)
- [ ] **NEXT**: commit dossier with `[MAIN] [FORGE7-RESEARCH-MS0]/U-SYNTH` scope

---

## §10 — Resume Directive (next session)

If this dossier compacts and a fresh chat picks up:

1. **Read this file first** (`H:/prism/state/shared/specs/SESSION-2026-05-10-RESEARCH-SYNTHESIS-DOSSIER.md`) — full plan + units.
2. **Read source cards as needed** (`state/shared/research/2026-05-10-*.md`) — evidence layer.
3. **Spawn peer-review subagent** (Boris doctrine §3) with the dossier as input. Get PASS|REVISE|FAIL. If REVISE, address before execution.
4. **Register the 5 new milestone JSONs** under `mcp-server/data/milestones/` using the existing `HOOK-SYNERGY-MS0.json` / `K2-CLOUD-MS0.json` pattern as schema reference.
5. **Allocate Wave 1 lanes** (A-F) by posting claims to the chat bus (`prism_context:chat_post`) with worktree paths. Critical: HOOK-SYNERGY H1+H6 from THIS chat must land BEFORE Lane A starts editing `AISystemRouterEngine.ts`.
6. **First-wave shippable** (§6): 4 units, ~3h, can ship from main tree without lane allocation.

---

*End of dossier. Total: 47 units across 5 themes, mapped to 4 existing + 5 proposed milestones, with 6-chat parallel-safe execution plan and ~3h zero-risk first wave.*
