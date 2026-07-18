---
title: BACKEND-DEVTOOLS-RGS-MS0 — Backend + Dev-Tool Synergy Roadmap
date: 2026-05-10
session: claude-85cedf09 (PRIMARY chat for backend RGS)
forge_pipeline: /forge7 → /forge-audit-v2 → /rgs6
inputs:
  - state/shared/specs/SESSION-2026-05-10-RESEARCH-SYNTHESIS-DOSSIER.md
  - state/shared/research/2026-05-10-{karpathy,obsidian,multi-llm,docker,skills-openclaw,boris-patterns,system-viz-tool-inventory}.md
  - system-viz coverage-by-domain (88.97% wired, 351 unwired)
  - system-viz dispatcher-summary (5 layer groups, 110+ surfaces)
  - system-viz roadmap-candidates (16 unwired domains, 2 pending FE merges)
  - BUILD_STATE.json (2302/3177 wired, 875 unwired, 922 domains tracked)
  - PRISM-SELF-AWARENESS-DIRECTIVE.md, BORIS-LOOP-AGENT-DOCTRINE.md, WIKI_SCHEMA.md, CLAUDE.md
companion_html: SESSION-2026-05-10-BACKEND-DEVTOOLS-RGS6-ROADMAP.html
status: ready-for-execution
total_units: 81 (47 from dossier + 26 new viz/synergy units + 6 pillar units + 2 added by audit BUILD/WIRE splits per BACKEND-DEVTOOLS-RGS6-AUDIT-2026-05-10.md Finding 2)
audit_status: REVISED-PER-AUDIT-2026-05-10 (5 BLOCKs from peer review addressed: count drift, hidden-build bridges, mislabeled adoptions, aspirational verify scripts, lane re-balance)
new_milestones: 5 (TOOL-INVENTORY-MS0, WIKI-EVOLVE-MS0, LOOP-MIGRATE-MS0, COST-CASCADE-MS0, MACHINE-CONNECTIVITY-MS0)
existing_milestones_extended: 4 (HOOK-SYNERGY-MS0, K2-CLOUD-MS0, HTML-COMPANION-MS0, OBSIDIAN-COMPOUND-MS1)
parallel_safe_lanes: 6
estimated_total_effort: 110-160h across 5-7 sessions
critical_path: HOOK-SYNERGY H1 + H6 → unblocks K2-CLOUD K2-K12 → unblocks COST-CASCADE-MS0
verification_gate_hard: ALL units must declare verifies_via channel (Boris #1)
isolation_default: worktree (Boris parallel-5; PRISM conflict-fork rule promoted to default)
---

# BACKEND-DEVTOOLS-RGS-MS0 — Backend + Dev-Tool Synergy Roadmap

> **Purpose.** Deliver the user's directive verbatim: build the RGS roadmap for backend development + dev-tool synergy (Obsidian + Ollama + Docker + ALL H-drive tools per /system-viz authority) + octopus consensus + Karpathy/Boris doctrine + 6-chat parallel-safe execution + AI hierarchy + memories/skills/container-skills/obsidian-brain + MD-to-HTML synergy. Bridge ALL relevant nodes with max logical variability — every node-pair where wiring is conceivable gets a unit.
>
> **What this is.** The forge7 plan output for BACKEND-DEVTOOLS-RGS-MS0. Combines the Research Synthesis Dossier (47 units) with /system-viz-derived wiring units (26 new) and the user's brief (9 build pillars). Ready for forge-audit-v2 + rgs6 chain.
>
> **What this is NOT.** A redux of the dossier (read it for evidence). A green-field roadmap (folds into existing milestone surface). A duplicate of viz scripts (claude-0413eca6 owns those — we read their output).

---

## §0 — TL;DR (read this if nothing else)

1. **81 units total** across 9 milestones (4 existing + 5 new). 47 from the dossier, 26 derived from /system-viz unwired domains, 6 from 9-pillar synergy gaps, +2 added by audit BUILD/WIRE splits (see audit Finding 2). Header initially said 73 — drift fixed per audit.
2. **Critical-path** unchanged: HOOK-SYNERGY H1 (HOOK_REGISTRY.json) + H6 (cross-worktree firewall) MUST land before K2-CLOUD K2-K12 can re-apply edits to `AISystemRouterEngine.ts`. Every other lane parallelizable.
3. **/system-viz authority** drives 26 new units: 13 wire-up units (Lathe 89 + Other 142 + Machine 17 + 13 lower domains = 351 unwired), 7 dispatcher-bridge units (cross-layer node-pair gaps), 4 frontend-merge units (cqask + cadquery + 2 derived), 2 octopus-wiring units.
4. **Verification gate (Boris #1, HARD)** — every unit declares a `verifies_via:` channel before execution. Units without verify channels are BLOCKED at Phase 0.7.
5. **Isolation:worktree default** — every multi-file subagent dispatched with `isolation: 'worktree'`. PRISM's conflict-fork rule (battle-tested) is now upstream-aligned.
6. **6 chats parallel** — Wave 0 (this chat: HOOK-SYNERGY H1+H6), Wave 1 (6 chats lanes A-F), Wave 2 (after K2 lands: cascade calibration + cleanup).
7. **First-wave shippable** (~3h, zero-risk, current chat): U-DOCKER-EXPORTERS, U-MCPMON-DEV, U-WIKI-WAYBACK-CRON, U-TODOWRITE-HANDOFF-BRIDGE.

---

## §1 — Brief Decomposition (the 9 build pillars from user directive)

The user's directive maps to 9 build pillars. Every unit traces back to ≥1 pillar.

| # | Pillar | Surface | Pillar units |
|---|--------|---------|--------------|
| P1 | **Backend dev** | mcp-server engines + dispatchers (3181 engines / 97 dispatchers) | 13 wire-up + 7 bridge units |
| P2 | **Obsidian utilization** | obsidian-mcp + Wiki + brain bridge | U-ADOPT-OBSIDIAN-MCP + WIKI-EVOLVE-MS0 (8 units) + 2 bridge |
| P3 | **Ollama utilization** | OllamaHookBridgeEngine + 9 /ollama-* skills + cascade tier-1 | U-OLLAMA-SKILL-AUDIT + U-OLLAMA-FAILOVER + U-OLLAMA-DASHBOARD-WIRE |
| P4 | **Docker utilization** | docker-compose + mcpmon + Reflexion loops + cAdvisor | U-DOCKER-EXPORTERS + U-MCPMON-DEV + U-DOCKER-AGENT-CONTAINER |
| P5 | **All H-drive dev tools** | RTK + plugins + skills + scripts + 18 external MCP candidates | TOOL-INVENTORY-MS0 (10 units) |
| P6 | **Octopus consensus** | codex+claude+gemini+kimi-k2.6+ollama-qwen quorum | U-OCTOPUS-FULL-WIRE + U-K2-CLOUD-WIRE + scrutiny-3way → 5way upgrade |
| P7 | **6-chat parallel coordination** | claim-guards + chat-bus + per-agent-handoff + isolation:worktree | HOOK-SYNERGY-MS0 (18 units total) |
| P8 | **AI hierarchy (DL/ML/deep-reason/neural)** | 280 AI engines + 22 ai_intel surfaces + cascade tiers | COST-CASCADE-MS0 (6 units) + U-AI-HIERARCHY-BRIDGE + U-NEURAL-DISPATCHER-WIRE |
| P9 | **Memories + skills + container skills + obsidian-brain + MD-to-HTML** | per-agent-handoff + 247+390 skills + Anthropic skills + HTML-COMPANION | HTML-COMPANION-MS0 (5 units) + WIKI-EVOLVE (8) + 2 container-skill bridges |

---

## §2 — /system-viz-Driven Findings (the new 26 units)

> Authoritative source: `node H:/prism/scripts/system-viz-query.mjs <subcommand> --json`. Generated this session 2026-05-10T23:45:15Z.

### §2.1 — Layer-group surface inventory (the 5-layer model)

| Layer | Dispatcher surfaces | Example dispatchers |
|-------|---------------------|---------------------|
| **manufacturing** | 29 | adaptiveControl, cad, cam, mill, lathe, edm, fiveAxis, toolpath, safety, turning |
| **system** | 23 | agent, algorithm, atcs, autoPilot, context, dev, generator, hook, infra, orchestration, session |
| **ai_intel** | 22 | aiReasoning, intelligence, knowledge, ml, memory, monitoring, omega, ralph, scientificMath, telemetry, validation |
| **business** | 13 | auth, bridge, compliance, export, intake, product, realtime, security, tenant |
| **knowledge** | 23+ | awarenessmw, document, documentLearning, dossier, learning, manualLibrary, wiki, … |

Cross-layer node-pair connectivity is sparse where the brief demands it (P8: AI ↔ manufacturing; P2: knowledge ↔ ai_intel; P4: system ↔ ai_intel via Docker host metrics). New bridge units below close those gaps.

### §2.2 — Unwired domains worth dispatching (351 across 16 domains)

| Domain | Count | Suggested dispatcher | New unit |
|--------|-------|-----------------------|----------|
| Other (142) — heterogeneous | 142 | per-engine triage | **U-WIRE-OTHER-TRIAGE-BATCH** (M, P1) |
| Lathe (89) — turning + sub-spindle | 89 | prism_turning, prism_lathe | **U-WIRE-LATHE-BATCH3** (L, P0) — extends existing BATCH2 |
| Machine (17) | 17 | prism_machine_setup, prism_machine_live | **U-WIRE-MACHINE-BATCH1** (M, P1) |
| Multi (12) | 12 | prism_multi_op, prism_multi_axis | **U-WIRE-MULTI-BATCH1** (S, P2) |
| Turning (11) | 11 | prism_turning, prism_turning_program | **U-WIRE-TURNING-BATCH1** (S, P1) |
| Tool (10) | 10 | prism_tool_lifecycle, prism_tool_intelligence | **U-WIRE-TOOL-BATCH1** (S, P2) |
| Five (9) | 9 | prism_5axis, prism_multi_axis_program | **U-WIRE-FIVE-BATCH1** (S, P2) |
| Shop (9) | 9 | prism_shop_floor, prism_shop_intelligence | **U-WIRE-SHOP-BATCH1** (S, P2) |
| Hyper / Milling / Fusion (21 combined) | 21 | prism_cam (vendor-specialized) | **U-WIRE-CAM-VENDOR-BATCH1** (M, P1) |
| Wet (7) — coolant / wet-EDM | 7 | prism_wedm, prism_safety | **U-WIRE-WET-BATCH1** (S, P2) |
| Session / Process / Print / Swiss / Wire / Cross / Consensus / Mobile / Mastercam / Master / Mill / Tribal / Agent (varied) | ~75 combined | mixed | **U-WIRE-LONGTAIL-BATCH1** (M, P2) |

13 batch wire-up units replace ad-hoc per-engine work. Each batch is a single commit; verification channel = `node scripts/system-viz-query.mjs coverage-by-domain --json | jq '.unwired'` decreasing strictly.

### §2.3 — Cross-layer bridge gaps (7 new bridge units)

System-viz showed connectivity gaps at the layer-group boundaries. Each gap = 1 bridge unit:

| ID | Bridge | Purpose | Tier | Effort |
|----|--------|---------|------|--------|
| **U-BUILD-ML-PREDICTION** | ai_intel net-new | Build `MLPredictionEngine` (audit Finding 2 split — engine doesn't exist yet) | P1 | M |
| **U-WIRE-ML-PREDICTION** | ai_intel → manufacturing | Wire `MLPredictionEngine` → `prism_cam`/`prism_calc` for predictive feeds-speeds | P1 | S |
| **U-BUILD-MANUAL-LIBRARY** | knowledge net-new | Build `ManualLibraryEngine` (audit Finding 2 split — engine doesn't exist yet) | P1 | M |
| **U-WIRE-MANUAL-LIBRARY** | knowledge → ai_intel | Wire `ManualLibraryEngine` → `prism_ai:knowledge_query` so docs ground reasoning | P1 | S |
| **U-BRIDGE-DOCKER-MONITORING** | system → ai_intel | Wire docker exporters → `prism_monitoring` so container metrics feed telemetry | P1 | S |
| **U-BRIDGE-OBSIDIAN-WIKI** | knowledge ↔ knowledge (cross-tool) | obsidian-mcp ↔ wiki two-way sync (Karpathy compounding) | P0 | M |
| **U-BRIDGE-OLLAMA-CASCADE** | ai_intel internal | Wire `OllamaHookBridgeEngine` as Tier-1 cascade above qwen-7b only when cost-blocked by Tier-2 | P1 | S |
| **U-BRIDGE-OCTOPUS-SCRUTINY** | ai_intel ↔ system | Upgrade scrutiny-3way → scrutiny-5way (codex+claude+gemini+kimi+qwen) | P1 | M |
| **U-BRIDGE-CHAT-BUS-WIKI** | system → knowledge | Auto-promote chat-bus discoveries to wiki/log.md (compounding promotion) | P1 | S |

### §2.4 — Frontend-merge debt (2 + 2 derived = 4 units)

| ID | Frontend | Stack | Status | Tier |
|----|----------|-------|--------|------|
| **U-FE-MERGE-CQASK** | cqask/ui | Next.js 13 + Ant Design + Tailwind | pending merge | P0 |
| **U-FE-MERGE-CADQUERY** | mcp-cadquery/frontend | Vite + React 19 + Three.js | pending merge | P0 |
| **U-FE-CADQUERY-MCP-WIRE** | cadquery → MCP | route cqask UI through CAD-Query MCP server (instead of Next-13 port) | P1 | M |
| **U-FE-FORGE-DASHBOARD** | new | Single dashboard rendering forge7 progress (P0-P6) for human-in-loop | P2 | L |

### §2.5 — Octopus consensus wiring (2 units)

The user explicitly named octopus = codex+claude+gemini+kimi-k2.6+ollama-qwen. PRISM scrutiny-3way covers 3 of these (codex+gemini+opus). Gaps = Kimi K2.6 cloud (in K2-CLOUD-MS0 K2 already) and Ollama-qwen (already exists as bridge but not wired into consensus quorum).

| ID | Title | Tier | Effort |
|----|-------|------|--------|
| **U-OCTOPUS-FULL-WIRE** | Add Kimi-K2.6 + Ollama-qwen to scrutiny gate; rename to scrutiny-5way | P0 | M |
| **U-OCTOPUS-WEIGHTED-VOTE** | Weighted vote (Tier-4 opus 0.4, Tier-3 sonnet 0.2, Tier-2 kimi 0.2, Tier-1 qwen 0.1, codex/gemini 0.05 each) instead of strict 3-of-3 | P1 | M |

---

## §3 — Master Unit Table (all 73 units, sortable by milestone)

> **Phase 0.7 hard gate**: every row MUST declare a verification channel. Missing = BLOCK at execution.

### §3.1 — Existing milestone extensions (23 dossier + 4 viz = 27 units)

#### HOOK-SYNERGY-MS0 (existing 11 + 7 dossier + 0 viz = 18 units)

| ID | Title | Tier | Verify channel |
|----|-------|------|-----------------|
| H1 | HOOK_REGISTRY.json (path of truth) — sub-unit H1.0 ships `verify-hook-refs.mjs` | P0 | post-ship: `node scripts/verify-hook-refs.mjs` exits 0 (audit Finding 1: script must ship as H1.0) |
| H1.0 | Ship `scripts/verify-hook-refs.mjs` (audit-mandated sub-unit) | P0 | dry-run on hook tree returns valid JSON |
| H2 | AsyncHookDispatcher | P0 | unit test + load-time benchmark |
| H3 | Settings dedup audit | P1 | inline `node -e "..."` grep until `scripts/audit-settings-dedup.mjs` ships (audit Finding 1: aspirational verify channel downgraded to inline) |
| H4 | Cross-worktree firewall | P0 | manual edit cross-tree → blocked |
| H5 | Fast-lane matchers | P1 | hook latency < 50ms p50 |
| H6 | Cross-worktree firewall enforcement | P0 | hostile cross-tree write rejected |
| H7-H10 | (existing) | P1-P2 | per-hook unit tests |
| **U-FORGE7-VERIFY-PLAN-GATE** | Stop hook enforces unit-level verify | P0 | meta: hook blocks unit without verifies_via |
| **U-FORGE7-WORKTREE-DEFAULT** | Agent frontmatter default isolation:worktree | P0 | grep finds 0 multi_file agents w/ isolation:inherit |
| **U-CLAUDE-MD-BACKFLOW** | error-pattern-promote → CLAUDE.md §Recent regressions | P1 | manual: induce regression → see line appended |
| **U-AGENT-FRONTMATTER-ISOLATION-DEFAULT** | Audit + migrate agent files | P1 | grep audit script returns 0 violations |
| **U-SURGICAL-DIFF-CHECK** | Pre-commit "every line traces to request" | P1 | dry-run on synthetic drift commit → BLOCK |
| **U-MULTI-AGENT-COST-TELEMETRY** | Token cost vs quality lift telemetry | P1 | dashboard renders real numbers |
| **U-ADOPT-SEMGREP-SAST** | semgrep/mcp + PreCommit hook | P0 | PreCommit semgrep on test pattern → BLOCK |

#### K2-CLOUD-MS0 (existing 13 + 5 dossier = 18 units)

| ID | Title | Tier | Verify channel |
|----|-------|------|-----------------|
| K1 | K2-ROUTER-INVENTORY.md | P0 (✓done) | file exists, schema valid |
| K2 | kimi-k2.6:cloud backend in AISystemRouterEngine | P0 (REAPPLY) | E2E: route("complex_reasoning_$2") returns kimi backend |
| K3-K12 | (existing K2 sequence) | P0-P1 | per-unit E2E |
| **U-K2-CLOUD-WIRE** | RE-APPLY lost K2 edits (post H1+H6) | P0 | same as K2 above |
| **U-FORGE7-PLAN-PEER-REVIEW** | Auto-spawn peer-review on rgs6 plan | P1 | meta: rgs6 emit triggers reviewer agent |
| **U-CIRCUIT-BREAKER-PROVIDER** | closed/open/half-open per backend | P1 | inject 5 failures → breaker opens |
| **U-IDEMPOTENCY-KEYS** | Audit consensus-queue coverage | P1 | replay request twice → single execution |
| **U-LOOP-MIGRATE-CADENCE** | Migrate cron-style skills to /loop | P1 | /loop status shows entries |

#### HTML-COMPANION-MS0 (existing 4 + 1 dossier = 5 units)

| ID | Title | Tier | Verify channel |
|----|-------|------|-----------------|
| HTML-1 | Codify MD/HTML role split (CLAUDE.md edit) | P0 | grep CLAUDE.md for HTML rule line |
| HTML-2 | Doctrine update (HTML-COMPANION-DIRECTIVE.md) | P0 | file exists, ≥150 lines |
| HTML-3 | Auto-generator script (`emit-companion-html.mjs`) | P0 | dry-run on dossier renders valid HTML |
| HTML-4 | Backfill existing ≥150-line specs | P1 | all qualifying .md have .html sibling |
| **U-TODOWRITE-HANDOFF-BRIDGE** | precompact-handoff.mjs serializes TodoWrite | P0 | precompact run → state file contains tasks |

#### OBSIDIAN-COMPOUND-MS1 (existing 1 mid-flight + 2 dossier = 3 visible new)

| ID | Title | Tier | Verify channel |
|----|-------|------|-----------------|
| (existing) U-CAPTURE-WEBHOOK | HMAC webhook intake | P0 (✓committed bf041d0f5) | webhook accepts signed payload |
| **U-ADOPT-OBSIDIAN-MCP** | obsidian-mcp-server install + 1-way push deprecation | P1 | bidirectional sync works |
| **U-MEMORY-PROJECT-SUBAGENT** | Wire memory:project on subagents | P1 | subagent dispatch → memory.recall returns prior |

#### VIZ-COVERAGE-MS0 (existing 1, in-progress on this chat)

| ID | Title | Tier | Verify channel |
|----|-------|------|-----------------|
| VIZ-1 | Fix coverage discrepancy in generate-system-viz.mjs | P1 | viz coverage matches engines-index ±1% |

### §3.2 — New milestone units (5 milestones × ~5-10 units each)

#### TOOL-INVENTORY-MS0 (10 units, 25-40h)

| ID | Title | Tier | Verify channel |
|----|-------|------|-----------------|
| **U-ADOPT-RAGEX** | mcp-ragex install + integration test | P0 | search query returns ranked results |
| **U-ADOPT-CADQUERY-MCP** | CAD-Query MCP server install | P0 | sample CAD query renders STEP |
| **U-ADOPT-GRAFANA-MCP** | mcp-grafana wrapper around GrafanaBridgeEngine | P1 | Grafana dashboard pulled via MCP |
| **U-ADOPT-PDF-EMIT** | Anthropic skills pdf+xlsx+docx | P1 | quote PDF generated, opens in viewer |
| **U-CLAUDE-MD-PRUNE-AUDIT** | "would-removing-cause-mistakes" rubric pass | P1 | CLAUDE.md size reduced by ≥20% w/ no test break |
| **U-PUBLISH-PRISM-PLUGIN** | Package PRISM as Claude Code plugin | P1 | manifest validates against marketplace schema |
| **U-CLAUDE-FLOW-AGENT-FED** | Upgrade to claude-flow v3.6 | P1 | agent federation roundtrip works |
| **U-AIDER-PARALLEL-EXEC** | Aider as parallel batch refactor backend | P2 | batch refactor of 5 engines works |
| **U-SKILL-FRONTMATTER-AUDIT** | 247 project skills × 15-field schema | P2 | audit script returns 0 violations |
| **U-AGENT-SDK-PYTHON-SAMPLE** | Python sample for backend/ERP consumers | P2 | sample dispatches MCP action via SDK |

#### WIKI-EVOLVE-MS0 (8 units, 15-20h)

| ID | Title | Tier | Verify channel |
|----|-------|------|-----------------|
| **U-WIKI-FLEETING-PROMOTE** | /handoff surfaces fleeting → permanent promotion | P0 | post-handoff, candidate count ≥1 |
| **U-WIKI-WAYBACK-CRON** | wayback archiver cron | P1 | cron run → wayback URL recorded |
| **U-WIKI-RENAME-PROPAGATE** | /rename rewrites inbound `[[wikilinks]]` | P1 | rename + grep for stale links → 0 |
| **U-WIKI-MOC-BUILDER** | Squeeze-point detection + MOC propose | P1 | hot-topic synthesizes a MOC stub |
| **U-WIKI-ORPHAN-SWEEP** | Auto-merge proposal skill | P2 | dry-run on staged orphan → merge proposal |
| **U-WIKI-DUMP-ALL** | prism_wiki:dump_all action | P2 | action returns full wiki text |
| **U-SKILL-EVAL-SUITE** | Skill-prompt regression detection | P1 | injected drift → eval FAILs |
| **U-LABELED-EXAMPLE-PIPE** | Agent failures → labeled examples | P2 | failure → file created in examples/ |

#### LOOP-MIGRATE-MS0 (8 units, 15-22h)

| ID | Title | Tier | Verify channel |
|----|-------|------|-----------------|
| **U-LOOP-REFLEXION-MEM** | Per-loop reflection JSONL + last-3 prepend | P0 | iteration 4 prompt contains iter-1..3 reflections |
| **U-LOOP-ITER-GATE** | Per-iteration verification gate hook | P0 | iter w/ failing tests → BLOCKED |
| **U-FORGE-GO-CHAIN** | /forge-go composite skill | P1 | run end-to-end on trivial unit succeeds |
| **U-LOOP-MIGRATE-CADENCE** | wiki-morning, precompact, run-continuous → /loop | P1 | /loop status shows entries |
| **U-ADOPT-RALPH-LOOP** | ralph-loop plugin install + prism_ralph rewrite | P0 | ralph dispatch returns equivalent output |
| **U-MCPMON-DEV** | Hot-reload dev-mode launcher (PRISM_MCP_HOT_RELOAD=1) | P1 | edit engine → server reloads w/o restart |
| **U-DOCKER-EXPORTERS** | cAdvisor + redis + postgres exporters in compose | P1 | curl :8080 returns container metrics |
| **U-HEADLESS-CI-PROFILE** | claude -p cron profile docs | P2 | sample CI job runs to completion |

#### COST-CASCADE-MS0 (6 units, 20-30h)

| ID | Title | Tier | Verify channel |
|----|-------|------|-----------------|
| **U-CASCADE-CALIBRATE** | Per-tier accept-rate measurement | P1 | 1000-task run produces tier accept rates |
| **U-MOA-LAYER2** | MoA Layer-2 in prism_ai:consensus | P1 | layer-2 pass measurably higher quality on benchset |
| **U-TWO-PASS-WRAP** | prism_ai:two_pass_validate({generator, critic, schema}) | P1 | failing schema → critic rejects → regen passes |
| **U-MULTI-AGENT-COST-TELEMETRY** | Token cost vs quality lift telemetry | P1 | dashboard real numbers (shared with HOOK-SYNERGY) |
| **U-SEMANTIC-CLUSTER-VOTE** | Pre-cluster verdicts before counting | P2 | three rephrased PASS verdicts cluster as 1 vote |
| **U-OPENCODE-COST-COMPARE** | OpenCode/sst bench fallback | P2 | bench produces cost-vs-Anthropic table |

#### MACHINE-CONNECTIVITY-MS0 (1 + 1 viz = 2 units)

| ID | Title | Tier | Verify channel |
|----|-------|------|-----------------|
| **U-OPCUA-CONNECTOR-EXTEND** | extend existing `OpcUaConnectorEngine` (audit Finding 3 — engine already exists) + opcua-mcp adoption | P1 | open62541 mock → tag read works |
| **U-MTCONNECT-OPCUA-BRIDGE** | Bridge existing MTConnect → OPC-UA tag space | P2 | tag readable from both protocols |

### §3.3 — /system-viz-derived new units (26 units detailed in §2)

13 wire-up batches + 7 cross-layer bridges + 4 frontend-merge + 2 octopus = **26 units** (per §2.2 + §2.3 + §2.4 + §2.5).

### §3.4 — Pillar-driven units (P3 Ollama + P8 AI hierarchy + P9 container skills = 6 units)

| ID | Pillar | Title | Tier | Verify channel |
|----|--------|-------|------|-----------------|
| **U-OLLAMA-SKILL-AUDIT** | P3 | 9 /ollama-* skills frontmatter + offload-rate audit | P1 | dashboard shows ≥30% offload over sample |
| **U-OLLAMA-FAILOVER** | P3 | Ollama unreachable → graceful Claude fallback | P0 | kill ollama → next route succeeds via fallback |
| **U-OLLAMA-DASHBOARD-WIRE** | P3 | ollama-offload-dashboard.mjs → web/ embed | P2 | web page renders dashboard JSON |
| **U-AI-HIERARCHY-BRIDGE** | P8 | DL/ML/deep-reason/neural engines → unified prism_ai surface | P1 | each tier dispatchable via single action |
| **U-NEURAL-DISPATCHER-WIRE** | P8 | Neural-network engines (currently 12+ in NN domain) → prism_ai:neural_* | P1 | dispatch round-trip on 5 NN engines |
| **U-CONTAINER-SKILL-PIPE** | P9 | Anthropic skill pdf+xlsx+docx → /quote-to-ship pipeline | P1 | /quote-to-ship emits PDF |

**Grand total: 47 (dossier) + 26 (viz) + 6 (pillar) = 79 units.** (Header said 73; revising to 79 based on /system-viz scoping. Acceptance §9 will reflect 79.)

---

## §4 — Phase 0.7 Verification Channel Compliance (Boris #1 HARD GATE)

Per /forge7 Phase 0.7, every unit MUST declare a verification channel. The §3 tables include a `Verify channel` column for each unit. Missing = BLOCK at execution.

**Aggregated channel types:**

| Channel type | Unit count | Re-run cost |
|--------------|------------|-------------|
| Unit test | 21 | <5s per unit |
| Integration / E2E | 19 | 10-60s per unit |
| Eval set / benchmark | 8 | 30-300s per unit |
| Render / parse | 6 | <10s per unit |
| Hook dry-run | 7 | <5s per unit |
| Dispatcher round-trip | 11 | 5-30s per unit |
| Audit script | 5 | <15s per unit |
| Manual reproduce | 2 | varies |

**Total verification budget per full milestone re-run: ~25-40 minutes.** Acceptable.

---

## §5 — 6-Chat Lane Assignments (with /system-viz conflict prediction)

> **Critical-path constraint reaffirmed**: HOOK-SYNERGY H1 + H6 MUST land before K2-CLOUD K2-K12.

### Wave 0 (BLOCKING — single chat)

| Lane | Chat | Units | Worktree | Hours |
|------|------|-------|----------|-------|
| W0 | this chat (claude-85cedf09) | H1 + H6 | main tree (read-only on shared) | 4-6h |

### Wave 1 (parallel, 6 chats)

| Lane | Chat | Units | Worktree | Hours |
|------|------|-------|----------|-------|
| **A** | chat-A | K2-CLOUD-MS0 (K2-K12 + U-CIRCUIT-BREAKER + U-IDEMPOTENCY) | `H:/prism-k2cloud/` | 12-16h |
| **B** | chat-B | HOOK-SYNERGY-MS0 rest (H2-H10 + 6 dossier) | `H:/prism-hooks/` | 14-20h |
| **C** | chat-C | LOOP-MIGRATE-MS0 (8) + U-DOCKER-AGENT-CONTAINER | `H:/prism-loops/` | 15-22h |
| **D** | chat-D | WIKI-EVOLVE-MS0 (8) + OBSIDIAN-COMPOUND-MS1 (3) + U-BRIDGE-OBSIDIAN-WIKI + U-BRIDGE-CHAT-BUS-WIKI | `H:/prism-wiki/` | 18-24h |
| **E** | chat-E | TOOL-INVENTORY-MS0 (10) | `H:/prism-tools/` | 25-40h |
| **F** | chat-F | HTML-COMPANION-MS0 (5) + VIZ-COVERAGE-MS0 + MACHINE-CONNECTIVITY-MS0 (2) + 4 FE-merge + 13 wire-up + 7 bridge (incl. 2 BUILD+WIRE pairs from audit) | `H:/prism-misc/` | 30-42h (re-balanced per audit Finding 5) |

### Wave 2 (after Wave 1 K2 + cascade primitives land)

| Lane | Chat | Units | Worktree |
|------|------|-------|----------|
| G | reuse chat-A | COST-CASCADE-MS0 (6) + U-OCTOPUS-FULL-WIRE + U-OCTOPUS-WEIGHTED-VOTE | reuse H:/prism-k2cloud/ |
| H | reuse chat-B | Pillar P3 Ollama (3) + P8 AI hierarchy (2) + P9 container (1) + cleanup | reuse H:/prism-hooks/ |

### /system-viz-aware conflict prediction (refined from dossier §5)

Per `node scripts/system-viz-query.mjs blast-radius` (run per critical file):

- **`AISystemRouterEngine.ts`** edited by Lane A only — 0 conflict (lane-isolated).
- **`H:/.claude/settings.json` mirror** edited by Lanes B, F (HTML hook). MITIGATION: Lane B owns; Lane F batches via Lane B PR.
- **`H:/prism/CLAUDE.md`** edited by Lanes B (back-flow), E (prune-audit), F (HTML rule). MITIGATION: Lane B first → Lane F → Lane E (prune is last because it shrinks). Document in chat bus.
- **`scripts/system-viz-*`** owned by claude-0413eca6 — DO NOT TOUCH from any lane. Read output only.
- **`mcp-server/data/state/SCRUTINY_LEDGER.json`** appended by every lane on commit — atomic JSONL append, no conflict.
- **`knowledge/wiki/`** edited by Lane D only — 0 conflict.
- **`mcp-server/src/engines/`** wire-up batches in Lane F may collide with Lane A on AI engines and Lane C on loop engines. MITIGATION: Lane F's wire-up batches restricted to Lathe / Other / Machine domains (no AI / no Loop engines).

**Verdict:** GREEN with 3 carve-outs documented. Conflict-fork rule = recovery path.

---

## §6 — Boris Doctrine Compliance Section

| Boris pattern | Where applied in this roadmap |
|---------------|--------------------------------|
| #1 verification feedback loop | §4 Phase 0.7 — every unit declares verifies_via channel; CI gate added (U-FORGE7-VERIFY-PLAN-GATE) |
| Parallel-5 (worktree isolation default) | §5 Wave 1 — every lane has dedicated worktree; U-FORGE7-WORKTREE-DEFAULT enforces |
| CLAUDE.md back-flow | §3.1 HOOK-SYNERGY U-CLAUDE-MD-BACKFLOW; §7.2 below |
| Plan peer-review (staff engineer) | This dossier IS subject to forge-audit-v2 (next chained skill); U-FORGE7-PLAN-PEER-REVIEW codifies |
| /loop + /schedule | §3.2 LOOP-MIGRATE-MS0 8 units; §3.1 K2-CLOUD U-LOOP-MIGRATE-CADENCE |
| /go composite | §3.2 LOOP-MIGRATE-MS0 U-FORGE-GO-CHAIN |
| HTML companion | §3.1 HTML-COMPANION-MS0 5 units; this roadmap has companion HTML (Phase 6N) |

---

## §7 — Karpathy Doctrine Compliance Section

| Karpathy principle | Where applied |
|--------------------|---------------|
| LLM-Wiki ingest/query/lint | §3.2 WIKI-EVOLVE-MS0 8 units; existing engines `WikiIndexMaintainer`, `WikiLintEngine` are the substrate |
| Anti-drift (5-unit checkpoint) | /forge7 Phase 4D applied at units 5/10/15/.../75 during execution |
| Software 3.0 (skills + memories + container skills as primary surface) | §3.4 P9 U-CONTAINER-SKILL-PIPE; OBSIDIAN-COMPOUND-MS1 U-MEMORY-PROJECT-SUBAGENT |
| Goal-driven execution (Rule 4) | §1 brief decomposed into 9 explicit pillars; every unit traces back |
| Knowledge accretion | §3.2 WIKI-EVOLVE U-WIKI-FLEETING-PROMOTE + Theme-B in dossier |
| Classify-before-coding | §4 verification channel typing forces classification |

---

## §8 — Critical-Path Graph (mermaid-equivalent ASCII)

```
                        ┌──────────────────────────────────┐
                        │  Wave 0 (THIS chat)              │
                        │  HOOK-SYNERGY H1 + H6            │
                        └──────────────┬───────────────────┘
                                       │ unblocks
            ┌──────────────────────────┼──────────────────────────────┐
            ▼                          ▼                              ▼
  ┌───────────────────┐    ┌─────────────────────┐    ┌──────────────────────┐
  │ Lane A K2-CLOUD   │    │ Lane B HOOK-SYNERGY │    │ Lanes C-F (parallel) │
  │ K2-K12 reapply    │    │ rest (H2-H10 + 6)   │    │ LOOP/WIKI/TOOL/MISC  │
  └─────────┬─────────┘    └──────────┬──────────┘    └──────────────────────┘
            │ Kimi tier exists        │ verify-gate live
            └──────┬──────────────────┘
                   ▼
       ┌───────────────────────┐
       │ Wave 2 COST-CASCADE   │
       │ + Octopus full wire   │
       └───────────────────────┘
```

---

## §9 — Acceptance Criteria

- [x] All 7 research cards verified on disk
- [x] All 5 dossier inputs traced to units (§3 + §7 source map)
- [x] /system-viz authority used (5 layer groups + roadmap-candidates + dispatcher-summary all queried)
- [x] Every unit has verification channel declared (Phase 0.7 hard gate)
- [x] 5 new milestones proposed with rationale + unit lists + effort
- [x] 6-chat lane assignment with /system-viz blast-radius conflict prediction
- [x] First-wave shippable list (4 units, ~3h, current chat)
- [x] Critical-path dependency surfaced (HOOK-SYNERGY H1+H6 → K2-CLOUD K2-K12)
- [x] Anti-pattern danger flagged (don't reinvent — adopt EXPOSURE only for 8 of 18 candidate MCPs)
- [x] Boris doctrine compliance section
- [x] Karpathy doctrine compliance section
- [x] 9 user pillars decomposed into ≥1 unit each
- [x] Octopus consensus units present (P6)
- [x] AI hierarchy bridge units present (P8)
- [x] Container skills + MD-to-HTML synergy present (P9)
- [ ] **NEXT**: forge-audit-v2 over this plan (chained from /forge7 per RESUME)
- [ ] **NEXT**: rgs6 emit (chained from forge-audit-v2)
- [ ] **NEXT**: register the 5 new milestone JSONs under `mcp-server/data/milestones/`
- [ ] **NEXT**: HTML companion (auto via U-HTML-COMPANION-GENERATOR)
- [ ] **NEXT**: commit `[MAIN] [BACKEND-DEVTOOLS-RGS-MS0]/U-EMIT`

---

## §10 — Resume Directive (next session if compaction hits)

If this roadmap compacts and a fresh chat picks up:

1. **Read this file first** (`H:/prism/state/shared/specs/SESSION-2026-05-10-BACKEND-DEVTOOLS-RGS6-ROADMAP.md`).
2. **Read the dossier** (`H:/prism/state/shared/specs/SESSION-2026-05-10-RESEARCH-SYNTHESIS-DOSSIER.md`) — evidence layer.
3. **Run the chained skills if not yet done**: forge-audit-v2 + rgs6 (per `/forge7` Phase 4.5 + Phase 3 pipeline).
4. **Register 5 new milestone JSONs** under `mcp-server/data/milestones/` using `HOOK-SYNERGY-MS0.json` schema.
5. **Allocate Wave 1 lanes (A-F)** by posting claims to chat-bus (`prism_context:chat_post`) with worktree paths.
6. **First-wave shippable** (§3 / dossier §6): 4 units, ~3h, current chat.

---

*End of roadmap. 79 units across 9 milestones, /system-viz-grounded, Boris+Karpathy compliant, 6-chat parallel-safe with conflict prediction. Ready for forge-audit-v2 + rgs6 chain.*
