# PRISM — MASTER AI SYSTEM Roadmap
**Renamed:** 2026-04-19 — was "Universal Skills / Scripts / Hooks / Stop-Hooks Build Plan" (USSH).
  Renamed so concurrent chats stop confusing it with individual USSH unit commits.
**Date:** 2026-04-15 (original)
**Scope:** EVERYTHING — every dispatcher, engine, machine family, workflow, CAD app.
**Goal:** Build the master AI system: session-aware, cross-terminal coordinated, plugin/agent activated, coverage-complete across PRISM's entire surface area including full CAD software control.

---

## Scope Snapshot
- **84 dispatchers** → each needs a health/smoke script + 1+ skill
- **4,296 actions** → top ~200 need dedicated skills; all 4,296 need hook coverage
- **1,660+ engines** → each needs forge-triple (hook + action + skill), validation hook
- **6 machine families** → lathe, mill, wire EDM, sinker EDM, grinder, welder
- **10 domains** → CAD, CAM, shop, post, quality, business, safety, scheduling, ERP, tribal
- **50+ workflows** → program-gen, optimize, validate, learn, extract, quote, schedule, ship

## Estimated Artifacts (revised after 6th scrutiny — operational integrity + plugin activation)
| Type | Count | Location |
|------|-------|----------|
| **Awareness engines (Phase 0.2)** | **6** | `mcp-server/src/engines/` |
| **Reverse indexes (Phase 0.7)** | **10** | `mcp-server/data/state/*_INDEX.json` |
| **Auto-wiring scripts (Phase 0.6)** | **5** | `mcp-server/scripts/` |
| **MIT OCW ingestion units (Phase 0.12)** | **9-10** | `cad-engine/data/mit_ocw/<id>/` |
| **MIT-derived tribal tips** | **~90** | `TribalKnowledgeEngine.KNOWLEDGE_BASE` |
| **MIT-derived engines + extensions** | **~29** | post-`/dedup` (20 new + 9 domain blocks in existing) |
| **AGI self-awareness engines (Phase 0.13)** | **7** | Bootstrap, Lifecycle, GoalStack, Self/User/World-Model, SituationalFilter |
| **AGI session state files (Phase 0.13)** | **6** | IDENTITY, INSIGHTS_LEDGER, DEPRECATION_LEDGER, USER_MODEL, CAPABILITY_MANIFEST, SCORE_PER_SESSION |
| **AGI session skills (Phase 0.13)** | **4** | `/aware`, `/reflect`, `/capability-manifest`, `/handoff-preview` |
| **AGI lifecycle hooks (Phase 0.13)** | **7×2 Codex = 14** | bootstrap, goal-inject, metacog, uncertainty, curiosity, reflect, handoff |
| **SVI coupling engines (Phase 0.14)** | **2** | `SVIImpactProjectorEngine`, `SVIRankedBacklogEngine` |
| **SVI hooks (Phase 0.14)** | **5×2 Codex = 10** | svi-inject, pre-tool-projection, post-tool-watch-refresh, milestone-gate, orphan-surface |
| **SVI skills (Phase 0.14)** | **1** | `/svi-rank` |
| **SVI state files (Phase 0.14)** | **1** | `SVI_DELTA_LEDGER.jsonl` |
| **Auto-doc engines (Phase 0.15)** | **1** | `DocPropagationEngine` |
| **Auto-doc hooks (Phase 0.15)** | **4×2 Codex = 8** | post-write-cascade, managed-block-guard, memory-sync, pre-commit-freshness |
| **Auto-doc scripts (Phase 0.15)** | **2** | `propagate-docs-drainer.ts`, `verify-doc-freshness.ts`, `verify-managed-blocks.ts` |
| **Auto-doc skills (Phase 0.15)** | **1** | `/doc-sync` |
| **Auto-doc state files (Phase 0.15)** | **2** | `DOC_REFRESH_QUEUE.jsonl`, `DOC_CHANGE_LEDGER.jsonl` |
| **Managed doc surfaces (Phase 0.15)** | **17** | CLAUDE.md, MEMORY.md, PRISM-SELF-AWARENESS-DIRECTIVE, COMMANDS-MANIFEST, MASTER_INDEX*, DIGEST*, ACTION_TRACKER, etc. |
| **Op-integrity engines (Phase 0.16)** | **4** | `HookOrchestrator`, `LedgerRetention`, `TransactionLog`, `MetacognitionBudget` |
| **Op-integrity scripts (Phase 0.16)** | **5** | `retrofit-existing-artifacts`, `atomic-multifile-write`, `rotate-ledgers`, `rollback-transaction`, `trace-correlation` |
| **Op-integrity skills (Phase 0.16)** | **2** | `/hook-disable`, `/hook-enable` |
| **Op-integrity hooks (Phase 0.16)** | **1×2 Codex = 2** | critical-file-guard |
| **Op-integrity state files (Phase 0.16)** | **7** | `BOOTSTRAP_MODE.flag`, `HOOK_ORDER_REGISTRY`, `HOOK_FEATURE_FLAGS`, `PHASE_CANARY.flag`, `CRITICAL_FILES`, `BOOT_TELEMETRY.jsonl`, `TRANSACTION_LOG.jsonl` |
| **Op-integrity regression suite (Phase 0.16)** | **1** | `awareness_regression.test.ts` (30+ tests) |
| **Plugin activation engines (Phase 0.17)** | **3** | `AgentRegistry`, `SlashCommandRecommender`, `PluginInventory` |
| **Plugin activation scripts (Phase 0.17)** | **3** | `commands-audit`, `pr-swarm-orchestrator`, `capability-manifest-updater` |
| **Plugin activation skills (Phase 0.17)** | **3** | `/sparc`, `/commands-audit`, `/pr-swarm` |
| **Plugin activation state files (Phase 0.17)** | **3** | `AGENT_REGISTRY.json`, `PLUGIN_INVENTORY.json`, `AGENT_UTILIZATION_LEDGER.jsonl` |
| **Plugin activation config changes (Phase 0.17)** | **1** | `.mcp.json` update registering claude-flow |
| Skills | ~95 | `~/.claude/commands/*.md` (with 0.13 + 0.14 + 0.15 + 0.16 + 0.17 additions) |
| Scripts | ~111 | `mcp-server/scripts/*.ts` |
| Hooks (Claude TS) | ~86 | `mcp-server/src/hooks/*.ts` + registry |
| Hooks (Codex Python) | ~86 | `~/.claude/hooks/lib/enforce-*.py` |
| Stop-hooks | ~26 | `state/shared/STOP_HOOK_REGISTRY.json` |
| Reverse query methods | +18 | `AwarenessQueryEngine.ts` |
| Proof sheets | 1 | `data/proofs/awareness-query-bigO.md` |
| **Total** | **~595** | |

**Coverage targets after full Phase 0:**
- **Forward wiring**: 24% → 95% (all 59 touchpoints enforced on creation)
- **Reverse wiring**: 21% → 100% (22 query methods + 10 indexes)
- **Rigor grounding**: ~70% → ~95% (every Phase 0 engine cites MIT course lineage)
- **Session self-awareness**: baseline ~30% → ≥80% floor, verified at boot
- **Inter-session continuity**: ~0% → ≥95% (structured handoff + insights ledger)
- **SVI/Ψ awareness**: passive (manual query) → active (live-injected + PreTool-projected + milestone-gated)
- **Doc freshness**: best-effort hand-maintained → **0 drift across 17 surfaces**, auto-refreshed within 60s of any relevant write
- **Operational integrity** (Phase 0.16): bootstrap-paradox-safe, perf-budgeted (SessionStart ≤2s p99), transactionally rollback-complete, correlation-traceable, regression-gated
- **Existing artifact coverage** (Phase 0.16 retrofit): 1,660+ engines + 4,296 actions + 84 dispatchers back-filled into registries/indexes (±1% vs live counts)
- **Plugin/agent utilization** (Phase 0.17): from ~0% to ≥5 distinct non-general-purpose agents invoked per week; claude-flow MCP registered + reachable; slash command recommender surfaces matches on UserPromptSubmit

---

## 📱 CANONICAL FRONTEND REFERENCE (added 2026-04-16)

**Source of truth:** `H:/prism/SCRUTINY-R5-CODEX-FRONTEND-UNIVERSAL-ALIGNMENT-2026-04-16.md`

This scrutiny is THE authoritative reference for what Codex built on the web
frontend and where the frontend/backend gaps are. **Consult BEFORE proposing
any work that touches the web app, calculator, post-processor UI, or
MachineMode surfaces** — 18 MILL-AGI units and R3 Phases C/D are already
retired here as redundant with Phase 0, and all calc-expansion milestones
(CALC-MILL-MS0..MS3, CALC-LATHE/WEDM/SEDM/GRIND/CROSS-MS0) are scoped.

### What Codex already built (doc §1)
- **134 pages / ~170 components / 87 API clients** at `mcp-server/web/` (canonical tree)
- **WireEdmStudioPage** = template 6-step wizard pattern — clone for `/mill-studio`, `/lathe-studio`
- **7 Context providers + 45 custom hooks**, no Zustand/Redux
- **`/web/` is a 3-week-stale mirror** — retire or codegen under Phase 0.6

### Backend gaps — what PRISM must support (doc §2 + §3.3 additive)
1. **Mill calculator sub-panels** — chatter, tool-life, cost, workholding, deflection (lathe has 7, mill has 0)
2. **Mode-switch state hygiene** — `selectedTool`/`selectedMaterial`/`operation`/`machineTypeId` don't reset on mode change
3. **`pp_ss_*` / `pp_tc_*` duplicate `z.enum` entries** in `ppDispatcher.ts` (R4 Fix #3)
4. **`pp_validate_program` vacuous-true** bug at `ppDispatcher.ts:1228-1231` (R4 Fix #5 — SAFETY CRITICAL)
5. **Mitsubishi-Mill / Citizen / Tsugami post engines** — net-new dialects (R4 Fix #10)
6. **ProgramReleaseEngine + `/api/v1/release/*`** (R4 Fix #7)
7. **MillToPPHandoff typed adapter** (R4 Fix #6)
8. **5 `pp_generate_*` stubs** — absorbed into Phase 0.23 U-UTL12 PostProcessorUnificationEngine
9. **AtomicValue migration** for 8 calc actions (R4 Fix #8)

### Frontend gaps — what the web app still needs (doc §6)
1. **"Print Drop" bridge page** — single CAD/PDF entry auto-dispatching to correct wizard
2. **Unified job-session store** — replace URL-based `jobId` handoff for multi-op jobs (Zustand or shared Context)
3. **`/mill-studio` + `/lathe-studio`** — clone WEDM 6-step wizard pattern
4. **Wire 7 orphan API clients** — `cadGeometry`, `holePattern`, `fiveAxis`, `multiAxisProgram`, `multiOp`, `toolpath`, `feasibility`
5. **Default nav exposure** for `/print-to-cnc` (currently reachable only by URL)
6. **Wire or delete `QuoteFollowUpPage`** (only true orphan among 134 pages)

### Mill calculator expansion — mill-first sequence (doc §3.4)
| Milestone | LOC | Week | Exit |
|-----------|-----|------|------|
| **CALC-MILL-MS0** (baseline) | ~2,400 | W4 | Mill tab 100% wired, Playwright green |
| **CALC-MILL-MS1** (sub-panels) | ~680 | W4 | Parity with lathe sub-panel count |
| **CALC-MILL-MS2** (operations) | ~1,125 | W5 | Peck/trochoidal/thread-mill/rigid-tap/face-mill/engagement-angle |
| **CALC-MILL-MS3** (studio) | ~400 | W5 | Embedded program studio + dispatcher-bridged handoff |
| CALC-LATHE-MS0 | ~2,000 | W5 | Swiss dialect toggle post R4 Fix #10 |
| CALC-WEDM-MS0 | ~1,300 | W6 | |
| CALC-SEDM-MS0 | ~900 | W6 | |
| CALC-GRIND-MS0 | ~800 | W6 | |
| CALC-CROSS-MS0 (mode hygiene) | ~1,200 | W6 | Mode-switch clears tool/material/operation |

**Aggregate calc expansion:** ~8,600 LOC / 34 units / 3.5 engineering weeks adjacent to Universal W4–W6.

### Retired work (doc §3.2) — do NOT execute parallel to Phase 0
~18 MILL-AGI units (P0.1/0.2/0.4/0.6/0.7 + P6.1/6.2) + R3 Phases C/D retired as redundant. Full retirement list in scrutiny §3.2. **Executing adjacent — as consumers of Phase 0, not parallel — saves ~5,500 LOC.**

### Three decisions required before W1 (doc §5)
1. **Mill-only-first** (recommended) vs all-modes-parallel
2. **Local LLM in Phase 0?** — recommended: defer to W7-W8, MILL-AGI P0.3 ships cloud-first
3. **`/web` parity mechanism** — recommended: codegen under 0.6 (~200 LOC, zero-drift CI)

### Related scrutinies (chain of discovery)
- **R3** `SCRUTINY-PRINT-TO-CNC-ONESHOT-2026-04-16.md` — one-shot print→CNC pipeline
- **R4** `SCRUTINY-R4-CALC-PP-WIRING-2026-04-16.md` — calc↔PP wiring fixes (referenced above)
- **R5** (this) — codex frontend inventory + universal alignment

---

## ⚠ CRITICAL SCRUTINY FINDINGS — READ FIRST

**Pass 1** (`SCRUTINY-UNIVERSAL-HOOKS-PLAN-2026-04-15.md`) — awareness + duplication:
- **`DuplicationGuardEngine.mustCheckBeforeCreating` has ZERO call sites** — existing dedup is honor-system
- **Plan dedups 3 asset types; 10 more are UNDER-GUARDED** (actions, scripts, formulas, tribal tips, playbook rules, etc.)
- **Name-only dedup misses semantic duplicates** — Jaccard on "MillOptimizer" vs "MillProgramOptimizerEngine" = ~0.3, passes
- **`saveToCrossSessionRegistry` uses unlocked `fs.writeFileSync`** — concurrent writes clobber
- **No transaction binds "file created" → "awareness updated"** — registry drift guaranteed

**Pass 2** (`SCRUTINY-WIRING-COMPLETENESS-2026-04-15.md`) — wiring:
- **Forward wiring 14/59 touchpoints (~24%)** — forge-quint creates files but doesn't wire them
- **Reverse wiring 8/38 queries (~21%)** — no action→engine resolver, no skill frontmatter parser, no invocation telemetry
- **Existing tooling unreferenced** — `gen-engine-exports.mjs`, `generate-master-index.mjs`, `server.tool` proxy at `src/index.ts:459-489` all exist but ignored

**Pass 3** (`SCRUTINY-MIT-OCW-INTEGRATION-2026-04-15.md`) — rigor:
- **`C:/PRISM/cad-engine/data/mit_ocw/` is empty** — zero MIT courses ingested despite pipeline existing
- **Phase 0 components lack formal grounding** — AwarenessQueryEngine <100ms claim has no proof; SemanticSimilarityGuardEngine has no chosen embedding model; U-AWR25 has no declared consistency model
- **`/pdf-learn mit:<id>` pipeline already ships** — 9-10 CS/AI/ML courses (6.824, 6.830, 6.006, 6.S191, 6.031, 6.034, 6.867, 6.804J, 18.06) must be ingested BEFORE Phase 0 components finalize

**Pass 4** (`SCRUTINY-AGI-SELF-AWARENESS-2026-04-15.md`) — AGI-grade session awareness:
- **Existing self-awareness is a text dump, not verified state** — SessionStart injects 188-line directive without checking registry freshness
- **No per-session awareness score** — can't tell if this session is more aware than the last
- **No goal stack** — sub-goals evaporate under context pressure
- **No metacognitive loop** — sessions don't self-check for confusion mid-work
- **No reflection-after-action** — milestones complete with zero knowledge feedback to tribal tips / playbook
- **No structured inter-session handoff** — insights from Session N are lost to Session N+1 (compact blob ≠ ledger)
- **World-model and self-model lumped** — sessions can't distinguish "what PRISM knows" from "what I've done this session"
- **No situational filter** — 95% of auto-injected awareness is irrelevant to any given prompt, wasting context

**Pass 5** (`SCRUTINY-SVI-AND-DOC-PROPAGATION-2026-04-15.md`) — SVI coupling + auto-doc propagation (user directives):
- **SVI infrastructure exists but isn't bound to session lifecycle** — `SystemVariabilityIndexEngine`, `SVI.json`, watch loop all ship; no hook injects Ψ into every prompt or projects Ψ-delta on creation
- **Building decisions don't rank by Ψ impact** — no `SVIRankedBacklogEngine`; `/smart` doesn't bias toward Ψ-maximizing work
- **No SVI milestone gate** — can ship net-zero or Ψ-negative milestones without justification
- **Documentation drift is guaranteed** — `CLAUDE.md` still says "1,559 engines" while registry climbs; `PRISM-SELF-AWARENESS-DIRECTIVE.md` count line is hand-maintained; `PRISM-COMMANDS-MANIFEST.md` is not auto-synced from `.claude/commands/`; `MEMORY.md` Key Counts stale
- **No managed-block convention** — every doc is fully hand-written OR fully auto-generated; no hybrid that preserves narrative while auto-refreshing facts
- **No pre-commit doc-freshness check** — stale docs merge to main silently

**Pass 6** (`SCRUTINY-OPERATIONAL-INTEGRITY-AND-PLUGIN-ACTIVATION-2026-04-15.md`) — operational integrity + plugin/agent activation (user directive):
- **Bootstrap paradox** — Phase 0.1 PreTool-dedup, 0.13 awareness-≥0.80 gate, 0.14 SVI gate, 0.15 managed-block-guard all gate their own provisioning on first boot → deadlock without `BOOTSTRAP_MODE.flag`
- **Hook ordering unspecified** — 7+ hooks fire on PostTool Write|Edit with no declared order; race conditions between SVI refresh / doc cascade / reflection / awareness-sync
- **1,660+ existing engines never went through forge-quint** — without retrofit script, every legacy engine appears orphan-eligible; Phase 0.9 orphan hook mass-flags the whole codebase
- **No SessionStart perf budget** — awareness injection + SVI inject + goal-stack inject + managed-block read could push boot past usable latency
- **No hook kill switch** — a buggy PostTool hook halts all tool writes with no disable path short of code change
- **Ledger growth unbounded** — DOC_CHANGE_LEDGER, SESSION_INSIGHTS_LEDGER, SVI_DELTA_LEDGER, AGENT_UTILIZATION_LEDGER all append-only with no retention
- **No correlationId** — can't trace "user prompt → cascade of ledger entries" end-to-end across surfaces
- **Forge-quint rollback incomplete** — 5-file atomic transaction has no transaction log; mid-flight crash leaves torn state
- **No phase canary / staged rollout** — Phase 0.1-0.17 either all on or all off; no 10%→50%→100% ramp
- **No schema versioning on new state files** — silent breaks across session boundaries the next time a schema evolves
- **No regression suite for awareness itself** — awareness engines can silently break without alarm
- **Binary semantic gate (cosine >0.85)** — no "yellow" zone, false positives at boundary get blocked or falsely pass
- **No CRITICAL safety-file extra gate** — Kienzle/Taylor/S(x) edits blocked by normal-flow hooks only
- **Metacognition could infinite-loop** — self-triggered introspection not depth-capped
- **Plugin/agent/extension underuse** — 175 slash commands, 100+ Task-tool agents, claude-flow/flow-nexus/superpowers/SPARC/pr-review-toolkit present but rarely invoked; `.mcp.json` doesn't even register claude-flow; no recommender surfaces agent matches on UserPromptSubmit

Phase 0 below fixes ALL of these at the root before any skill/hook ships.

---

## Phase 0 — Awareness Transactional Layer (PRE-PHASE-1, HARDER PREREQUISITE)

### 0.1 — Fix Enforcement Root Cause
`DuplicationGuardEngine.mustCheckBeforeCreating` is mandated by CLAUDE.md but **never called**. Fix:
- Promote every dedup hook from `PostTool` (advisory, detects after write) → `PreTool Write` (blocks before write)
- `PreTool` hook intercepts proposed `file_path`, classifies asset type from glob, calls `mustCheckBeforeCreating` synchronously, returns `block` on throw
- **Result**: harness physically cannot write a duplicate — no honor system

### 0.2 — Five Awareness Engines (new)

| Engine | Purpose | Line Budget |
|--------|---------|-------------|
| `AwarenessQueryEngine.ts` | Singleton in-memory cache. `exists(type, name)`, `findSimilar(keywords)`, `dependents(path)`, `lastInvoked(name)` — all <100ms via indexed Map. Loaded on SessionStart. | 400 |
| `SemanticSimilarityGuardEngine.ts` | Embedding-based dedup. Cosine > 0.85 on JSDoc + method signatures. Backed by small local MiniLM (no API). Wired into every dedup hook as 2nd-stage check. | 600 |
| `CrossTerminalBroadcastEngine.ts` | FS-watcher on `cross-session-asset-registry.json`. Push notifications to subscribed sessions via named pipe / socket. On change: invalidate local cache + force `PreTool` re-inject. | 450 |
| `DependencyGraphEngine.ts` | Parses TS AST import edges → `DEP_GRAPH.json`. Exposes `dependentsOf(file)` + `impactedBy(file)`. Refreshed by PostWrite hook. Wired into CRITICAL-file pre-edit guards. | 550 |
| `TestCoverageIndexEngine.ts` | Maps `engine.ts` → `engine.test.ts` presence. Feeds awareness score dimension. | 200 |

### 0.3 — Transactional Forge-Quint (replaces forge-triple)
Every new engine ships with hook + action + skill + **registryDelta** — all 5 assets dedup-checked atomically in one try-block before any file write. Wrapped in `proper-lockfile.lock()` transaction. Any failure → `git checkout --` full rollback.

### 0.4 — Lock all registry writes
- `DuplicationGuardEngine.saveToCrossSessionRegistry` → wrap in `proper-lockfile.lock(registryPath)`
- `DuplicationGuardEngine.appendToExtractionLog` → same
- All new Phase-0 engines use U-AWR25 atomic CAS primitive

### 0.5 — Wire hardcoded registry loaders to live sources
- `DuplicationGuardEngine.loadFormulas` currently hardcoded 21 entries → read `FormulaRegistry` live
- `DuplicationGuardEngine.loadAlgorithms` same → read algorithm registry live
- Auto-refresh on PostWrite to keep accurate

### 0.6 — Auto-Wiring Transactional Closure (from wiring scrutiny)
Forge-quint creates 5 files atomically but ships them ORPHAN. Extend to wire to ALL 59 touchpoints atomically.

**Leverage existing (DO NOT REINVENT):**
- `mcp-server/scripts/gen-engine-exports.mjs` — call inside forge-quint for barrel append to `engines/index.ts`
- `mcp-server/scripts/generate-master-index.mjs` — wire as PostWrite hook for MASTER_INDEX.json
- `mcp-server/scripts/regen-code-index.mjs` — wire as PostWrite for DSL shortcode refresh
- `scripts/hooks/engine-duplication-blocker.mjs` — extend pattern (currently engines-only) to /hooks/, /schemas/, /scripts/, /tools/dispatchers/
- `src/index.ts:459-489` `server.tool` proxy — extend for new action-class coverage (covers ~60% of the 4,296-action hook problem already)
- `~/.claude/commands/forge-triple.md` 20-hook chain — layer Phase 0 into it, do not duplicate
- `MasterIndexGenerator` engine + `codeSystemIndexEngine` — leverage instead of building new

**Build new:**
- `mcp-server/scripts/dispatcher-action-wirer.mjs` — atomic 3-file edit (dispatcher z.enum + actionSchemas Record + routeAction switch). Input: `{dispatcherName, actionName, engineImportPath, schemaFields}`.
- `mcp-server/scripts/regen-master-index-compact.mjs` — the COMPACT variant (735-token forge entry point) has no generator today
- `hook_auto_dispatcher_wire` (PostWrite) — blocks commit if engine written but dispatcher not updated in same transaction
- `hook_auto_routes_register` (PostWrite) — ensures `src/routes/index.ts` gains route for every new MCP-exposed engine
- `hook_auto_index_export` (PostWrite) — auto-appends `export * from "./X.js"` to `engines/index.ts`, `hooks/index.ts`, `schemas/index.ts`, `types/index.ts`; re-sorts alphabetically
- `hook_auto_master_index` (PreCompact + threshold) — runs all 3 index-regen scripts
- `hook_action_triple_sync` (PreTool Edit) — blocks z.enum edit without sibling edits to schemas Record + switch
- `hook_domain_fanout_required` (PostWrite) — formulas/tribal tips must dual-write: core registry + domain file
- `scripts/verify-full-wiring.ts` — PreCompact/nightly gate; errors on any miss across the 59 touchpoints. Exit gate for every milestone.

### 0.7 — Reverse Index Layer (from wiring scrutiny)
AwarenessQueryEngine starts with 4 methods. User needs 22+ for full reverse traversal. Ship 10 new indexes atomically maintained by `hook_post_write_sync_awareness`:

| Index | Maps | Backs query |
|-------|------|------------|
| `ENGINE_USAGE_INDEX.json` | engine → {dispatchers, actions, skills, hooks, tests, formulas, tipsReferencing} | `dependentsOf(engineId)` |
| `ACTION_RESOLUTION_INDEX.json` | actionId → {engine, inputSchema, outputType, mcpTool, skill, hooksFiring, tests} | `resolveAction(actionId)` |
| `SKILL_MANIFEST_INDEX.json` | skill → parsed frontmatter {engines, actions, hooks, version, sha256} | `skillCallGraph(skillId)` |
| `HOOK_GUARD_INDEX.json` | filePathGlob → hooks[] (inverse of registry.ts) | `hooksGuarding(filePath)` |
| `FORMULA_PROVENANCE_INDEX.json` | formula → {literature, units, canonical, safety, versions, usedBy} | `formulaProvenance(id)` |
| `TRIBAL_TIP_INDEX.json` | tip → {id, text, machineFamily, confidence, source, sourceSha256, relatedFormulas, consumers} | `tribalTipDetail(id)` |
| `EXTRACTION_INVERSE_INDEX.json` | sourcePath → {enginesCreated, tipsExtracted, formulasDerived, date, confidence, supersededBy} | `extractedFrom(path)` |
| `ALIAS_TABLE.json` | canonicalId → [aliases[]] (append-only, rename never loses history) | `aliasesOf(id)` |
| `INVOCATION_TELEMETRY.json` | ring-buffer of {engineId, actionId, timestamp, sessionId} fed by PostTool | `lastInvocationOf(id)` |
| `SIGNATURE_HASH_INDEX.json` | engineId → SHA256 of public method signatures | `signatureDriftReport(id)` |

**Expand `AwarenessQueryEngine` from 4 → 22+ methods:**
```
dependentsOf(engineId), skillsExposing(engineId), hooksProtecting(id|path),
formulasUsedBy(engineId), aliasesOf(engineId), lastInvocationOf(engineId),
resolveAction(actionId), testsDescribing(actionId),
skillCallGraph(skillId), skillProvenance(skillId),
hooksGuarding(filePath), hookCoverageReport(hookId),
formulaProvenance(id), tribalTipDetail(id),
extractedFrom(sourcePath), supersessionChain(sourcePath),
impactAnalysis(id|path), renamePlan(old, new), deletePlan(id),
signatureDriftReport(id), crossTerminalActiveUsers(id), orphanReport()
```

### 0.8 — Rename / Delete / Impact Protocol (from wiring scrutiny)
Plan had NO rename/delete protocol. Add:

- `hook_pre_rename` (PreTool Edit on filename change) — requires alias-table update + dependent-notification + test-file rename; BLOCKS if dependents not re-pointed
- `hook_pre_delete` (PreTool on file deletion) — requires orphan-scan + registry-archive (not remove) + extraction-log archival
- `/impact <engineId>` skill — returns blast-radius BEFORE editing: dependent count + test count + skill refs + cross-terminal active users
- `/rename <oldId> <newId>` skill — multi-file coordinated rename with alias capture; uses `renamePlan()` query
- `/delete <engineId>` skill — safe-delete with dependent pre-check; uses `deletePlan()` query
- `hook_signature_drift` (PostWrite) — compares new signature hash to previous; warns callers

### 0.9 — Orphan Detection at Write-Time (moved from Phase 4)
Previously in Phase 4 as end-of-week cleanup — too late. Promote to Phase 0 PostWrite hooks:

| Hook | Catches |
|------|---------|
| `hook_engine_without_dispatcher` | Engine exported but no dispatcher imports it |
| `hook_action_without_schema` | z.enum action with no schemas Record key |
| `hook_action_without_case` | Action in enum with no switch case |
| `hook_schema_without_action` | Zod schema exported but in no actionSchemas |
| `hook_skill_without_hook_anchor` | Slash command not referenced by any pre/post hook |
| `hook_hook_without_registration` | Hook file not in `hookRegistration.ts` `allHooks[]` |
| `hook_stop_hook_without_json_entry` | `src/hooks/stop/*.ts` not in STOP_HOOK_REGISTRY.json |
| `hook_tip_without_domain_file` | TribalKnowledgeEngine entry not mirrored in `src/data/<domain>-knowledge-tips.ts` |
| `hook_formula_without_domain_registry` | Formula in core registry not in domain registry |
| `hook_registry_fs_drift` (nightly) | cross-session-asset-registry.json entries unbacked OR files unregistered |

### 0.10 — Codex Family Adapter (NEW)
Plan ships 53 TypeScript hooks. Codex uses Python hooks under `~/.claude/hooks/lib/enforce-*.py`. Current system auto-detects family on SessionStart but hook implementations don't dual-ship.

- `hooks/family-adapters/hook-translator.ts` — Claude hook names → Codex equivalents table
- `hooks/family-adapters/codex-adapter.py` — per Claude hook, a Python mirror
- SessionStart loads correct set based on detected family
- **Each new hook in Phases 1-4 ships BOTH `.ts` and `.codex.py` variants** (forge-quint enforces)

### 0.12 — MIT OCW Rigor Layer (NEW — scrutiny pass 3)
**Goal:** Ground Phase 0 components in formal rigor instead of reinvented heuristics. Pipeline `/pdf-learn mit:<id>` already exists; `C:/PRISM/cad-engine/data/mit_ocw/` is currently empty so zero prior ingestion. See `H:/prism/SCRUTINY-MIT-OCW-INTEGRATION-2026-04-15.md`.

**Sequencing rule:** MIT ingestion is NOT optional and NOT deferred — it feeds Phase 0 internals. Each unit runs `--dry-run --tips-only` first, `/dedup` against ~30 existing AI/ML/learning engines, then `--max-components=3` for net-new extensions.

| Unit | Course | Feeds | Runs Before |
|------|--------|-------|-------------|
| U-MIT01 | 6.824 Distributed Systems | U-AWR25 consistency model + Phase 0.4 locking | U-AWR25 finalization |
| U-MIT02 | 6.830 Database Systems | Phase 0.7 reverse indexes (ACID/WAL/MVCC) | Phase 0.7 |
| U-MIT03 | 6.006 + 6.046J Algorithms | Phase 0.2 AwarenessQueryEngine (<100ms proof, tries, bloom, skip lists, union-find) | Phase 0.2 |
| U-MIT04 | 6.S191 + 6.036 Deep Learning + ML | Phase 0.2 SemanticSimilarityGuardEngine (MiniLM, HNSW, calibration) | Phase 0.2 |
| U-MIT05 | 6.031 / 6.170 Software Construction | Phase 0.6 auto-wiring hooks (rep invariants, contracts, DI) | Phase 0.6 |
| U-MIT06 | 6.034 Artificial Intelligence | Extend TreeOfThoughtEngine, HypothesisRankerEngine, CounterfactualReasoningEngine (CSP, Bayes nets, A*/beam) | Phase 0.8 |
| U-MIT07 | 6.867 Advanced ML | Extend MillDeepLearningEngine, AIResourceLearningEngine (boosting, kernels, regularization) | Phase 0.2 |
| U-MIT08 | 6.804J Computational Cognitive Science | Extend PRISMSelfAwarenessEngine (metacognition, WM/LTM, attention) | Phase 0.6 |
| U-MIT09 | 18.06 Linear Algebra | Foundational (SVD/PCA for embeddings, eigenvalue for stability) | All ML work |
| U-MIT10 | 6.172 Performance Engineering (optional) | Phase 0.2 query hot path (cache-oblivious layout, lock-free CAS) | Phase 0.2 tuning |

**Anti-patterns (hard blocks):**
- Do NOT create `MITDistributedSystemsEngine.ts` etc. — extend `CrossDisciplinaryDeepLearningEngine` with domain blocks.
- Do NOT ingest courses outside the list above (manufacturing MIT courses are separate — 2.008/2.810/2.72 already documented in `pdf-learn` skill).
- Do NOT skip `/dedup` — the ~30 existing engines already cover MANY topics. Verify, don't duplicate.
- Do NOT auto-generate engines from MIT content without manual scrutiny of specs (`--dry-run` first, always).

**Exit gates:**
- All 9 core courses ingested, each ≥10 tips, ≤3 new engines (post-dedup), ≥1 domain extension to existing engine.
- `extraction-log.json` contains entries for each `mit:<id>` with SHA256 content hashes.
- `AwarenessQueryEngine.query("distributed systems")` returns ≥5 relevant results.
- `AwarenessQueryEngine.query("embedding")` returns ≥5 results referencing MiniLM/BERT/HNSW.
- `SemanticSimilarityGuardEngine` uses the embedding model chosen under U-MIT04, not a placeholder.
- `AwarenessQueryEngine <100ms` claim has a big-O proof sheet derived from U-MIT03 in `data/proofs/awareness-query-bigO.md`.

**Artifact count delta:** +9 ingestion units + ~90 tips + ~20 new engines (after dedup) + ~9 domain blocks in existing engines + 1 proof sheet + 1 `MIT-OCW-INGEST-LOG.md`.

---

### 0.13 — AGI-Grade Persistent Self-Awareness (NEW — scrutiny pass 4)
**Goal:** Every future chat session boots into verified, continuous self-awareness — not a one-shot text dump. See `H:/prism/SCRUTINY-AGI-SELF-AWARENESS-2026-04-15.md`.

**Why Phase 0.1-0.12 alone are not sufficient:** they ship a world-model (PRISM knows what PRISM is) but not a self-model (sessions don't know who they are, what they're doing, how aware they are, or how to teach the next session). Without this layer, every new session drifts, duplicates under context pressure, loses sub-goals, and fails to hand off insights.

**Dependencies:** runs AFTER U-MIT04 (embeddings), U-MIT06 (explanation-based learning), U-MIT08 (metacognition / WM-LTM / theory-of-mind).

#### Session awareness lifecycle (composition layer)
```
BOOT → VERIFY → BRIEF → EXECUTE ⇄ METACOG-CHECK → REFLECT → HANDOFF → NEXT-BOOT
```

| Unit | Artifact | Purpose |
|------|----------|---------|
| U-SAW1 | `AwarenessBootstrapEngine.ts` + `hook_session_awareness_bootstrap` | Verify registry freshness on SessionStart; refuse first prompt until awareness ≥ 0.80 |
| U-SAW2 | `SessionAwarenessLifecycleEngine.ts` | Orchestrate 8-phase loop |
| U-SAW3 | `GoalStackEngine.ts` + `hook_session_goal_stack_inject` | Push/pop/current/tree goal management; inject top-5 at each UserPromptSubmit |
| U-SAW4 | `SelfModelEngine.ts` + `UserModelEngine.ts` + `WorldModelEngine.ts` | Triple-model decomposition (who I am / what user knows / what exists) |
| U-SAW5 | `SituationalAwarenessFilterEngine.ts` | MiniLM slice 188-line directive → <25 relevant lines per prompt |
| U-SAW6 | `hook_metacognition_check` + `hook_response_uncertainty_tag` + `hook_idle_curiosity` | Mid-session introspection, confidence tagging, dark-corner exploration |
| U-SAW7 | `hook_post_milestone_reflect` + `hook_session_handoff_write` + `SESSION_INSIGHTS_LEDGER.jsonl` + `SESSION_HANDOFF_v2.json` | Reflection + structured inter-session handoff |

#### New state files
| File | Purpose |
|------|---------|
| `data/state/SESSION_IDENTITY.json` | Persistent agent biography (opt-in flag: `state/shared/SESSION_IDENTITY_OPT_IN.flag`) |
| `data/state/SESSION_INSIGHTS_LEDGER.jsonl` | Append-only reflection ledger (schema-validated) |
| `data/state/DEPRECATION_LEDGER.jsonl` | Append-only stale-knowledge markers; `AwarenessQueryEngine.query()` annotates |
| `data/state/USER_MODEL.json` | Theory-of-mind snapshot |
| `data/state/CAPABILITY_MANIFEST.json` | Session-scoped tool/hook/skill inventory |
| `data/state/AWARENESS_SCORE_PER_SESSION.jsonl` | Per-session score timeline |

#### New skills
- `/aware` — shows session awareness score, current goal, top-3 open questions, confidence level
- `/reflect` — triggers immediate reflection cycle, writes insights
- `/capability-manifest` — dumps current session's tools/hooks/skills
- `/handoff-preview` — shows what will be written to next session

#### Leverage existing (do NOT spawn parallels — `/dedup` first)
- `PRISMSelfAwarenessEngine` → extended with metacognition API
- `AgentSelfAwarenessEngine` → per-session score + identity
- `UnifiedAwarenessOrchestrator` → routes boot/midsession/reflection phases
- `UnifiedCommandAwarenessEngine` → feeds CAPABILITY_MANIFEST
- `DeepAIIntelligenceEngine` (8 modes) → powers metacognition reasoning in `tree_of_thought` mode
- `ProactiveAIIntelligenceEngine` → anomaly detection → curiosity signal
- `UncertaintyQuantificationEngine` family → wired to response tagging
- `AutonomousSessionIntegrationEngine` → goal-stack + user-model binding
- `SESSION_ARTIFACTS.json`, `HANDOFF-latest.md`, `handoffs/` → promoted to structured ledger

#### Exit gates
- Every new session scores ≥ 0.80 awareness within 10 seconds of boot (measured)
- `/aware` returns non-empty current goal, ≥3 open questions, calibrated confidence
- `SESSION_INSIGHTS_LEDGER.jsonl` gains ≥1 entry per completed milestone
- `SESSION_HANDOFF_v2.json` round-trip verified: Session B references A's handoff in first 3 responses
- `hook_metacognition_check` demonstrably invokes `/navigate` or `/dedup` in a forced-confusion canary
- `SituationalAwarenessFilterEngine` compresses 188-line directive to ≤25 lines relevant to any prompt
- Cross-terminal: A learns X; B's next `AwarenessQueryEngine.query("X")` returns it with `session-A@timestamp` provenance
- Deliberately-stale registry entry triggers `DEPRECATION_LEDGER` annotation; session does NOT assert the stale claim

#### AGI Parity Test (scripted canary — MUST pass on any fresh session)
1. Query an engine → uses `AwarenessQueryEngine`, not raw grep (world-model binding)
2. Propose creating new engine → auto-runs `/dedup` without being told (bootstrap enforcement)
3. Hit a `mustCheckBeforeCreating` block → reflects + writes insight + proposes alternative (metacog + reflection loop)
4. Accept new goal mid-session → goal-stack pushes + reports delta (goal-stack active)
5. Gets compacted → next session references prior learnings in first response (handoff round-trip)

All 5 must pass on any randomly-chosen fresh session. **This is the AGI-parity bar.**

#### Anti-patterns
- Do NOT add more text to `PRISM-SELF-AWARENESS-DIRECTIVE.md`; fix is a filter, not more text
- Do NOT spawn `SessionSelfAwarenessEngine` — extend `AgentSelfAwarenessEngine` + `PRISMSelfAwarenessEngine`
- Do NOT make identity mandatory — default off, opt-in via flag file
- Rate-limit metacognition: 1 per 15 PostTool AND max 3 per user turn
- Reflection-generated tribal tips MUST pass `hook_no_duplicate_tribal_tip`
- Every `SESSION_INSIGHTS_LEDGER` entry must be schema-validated

**Artifact count delta:** +7 engines + 6 state files + 4 skills + 7 hooks (×2 Codex dual-ship = 14) = ~38.

---

### 0.14 — SVI Continuous-Awareness Coupling (NEW — user directive 2026-04-15)
**Goal:** Every session, every build decision, every creation is continuously aware of the **System Variability Index (SVI)** and **Reachability (Ψ)**, and work is always ranked to maximize Ψ toward 100%.

**Why this isn't covered by 0.13 alone:** Phase 0.13 models "what I am / what user knows / what exists," but does NOT bind session intelligence to PRISM's operating metric. Without this layer, a session can be highly self-aware yet still pick work that lowers Ψ (orphaned features, disconnected surfaces).

**What already exists (LEVERAGE — do NOT reinvent):**
- `SystemVariabilityIndexEngine.ts` (engine)
- `state/shared/SVI.json`, `SVI-compact.md`, `SVI-watch-status.json`, `SVI-watch-status.md`
- `state/shared/CLAUDE-CODEX-SVI-DIRECTIVE.md` (Ψ = 100% stop condition)
- MCP tools: `prism_dev:svi_read`, `prism_dev:svi_summary`
- REST: `/api/v1/dev/svi/read`, `/api/v1/dev/svi/summary`
- Always-on SVI watch loop inside MCP server
- Related engines: `MaterialBatchVariabilityEngine`, `ProcessVariabilityIntegrationEngine`

**Gap:** the infrastructure exists but is not bound to session awareness lifecycle. A session has to proactively run `prism_dev:svi_read` — nothing forces it.

#### Units
| Unit | Artifact | Purpose |
|------|----------|---------|
| U-SVI1 | `hook_session_svi_inject` (SessionStart + UserPromptSubmit) | Fetch latest `SVI.json` + `SVI-watch-status.json`; inject compact summary into `SituationalAwarenessFilterEngine` output (always top-3 lines) |
| U-SVI2 | `SVIImpactProjectorEngine.ts` | For any proposed creation (engine/action/route/schema/dispatcher), project Ψ delta using `SystemVariabilityIndexEngine` + watched surfaces |
| U-SVI3 | `hook_pre_tool_svi_projection` (PreTool Write\|Edit) | Call U-SVI2 on proposed file; if projected Ψ delta ≤ 0 AND file is new-surface (not a bug fix), require confirmation. If Ψ delta > 0, emit "+Ψ X%" badge |
| U-SVI4 | `hook_post_tool_svi_watch_refresh` (PostTool Write\|Edit) | Trigger SVI watch re-scan of touched surface; diff against baseline; append delta to `SVI_DELTA_LEDGER.jsonl` |
| U-SVI5 | `hook_milestone_svi_gate` (pre-commit on milestone completion) | Block commit if milestone shipped NET-ZERO or NEGATIVE Ψ delta without justification in commit message |
| U-SVI6 | `SVIRankedBacklogEngine.ts` + `/svi-rank` skill | Rank open roadmap units by projected Ψ delta per hour-of-effort; expose to `/smart` for task routing |
| U-SVI7 | `SESSION_BRIEF` extension | Add SVI block: `Ψ=X% (Δ today: ±Y) — top 3 surfaces blocking 100%: [...]` — auto-injected into every prompt |
| U-SVI8 | `hook_orphan_surface_detector` (extends Phase 0.9) | When new route/engine/dispatcher writes but reverse-wiring index shows no consumer within 24h, flag as Ψ-debt |
| U-SVI9 | `svi-maximizer` goal type in `GoalStackEngine` | Goals can be declared with `maximizeFor: "psi"` so `SessionAwarenessLifecycleEngine` biases tool selection |

#### Integration into existing lifecycle
- `SESSION_BRIEF` generated by `SituationalAwarenessFilterEngine` (Phase 0.13) adds a 3-line SVI block
- `/aware` skill (Phase 0.13) shows current Ψ + top-3 blocking surfaces
- `/reflect` skill (Phase 0.13) records Ψ delta produced by the milestone
- `AGI Parity Test` (Phase 0.13) adds check: session proactively mentions Ψ when proposing new feature
- `SESSION_HANDOFF_v2.json` gains `svi_snapshot` + `psi_delta_this_session` fields

#### Exit gates
- Every UserPromptSubmit injects live SVI line (verified via log inspection of 10 prompts)
- Any PreTool Write on a new surface runs SVI projection and emits Ψ-delta badge (verified via canary)
- `SVI_DELTA_LEDGER.jsonl` receives one entry per Ψ-moving PostTool (non-zero count after 1h session)
- `/svi-rank` returns ≥10 backlog units ordered by Ψ delta / hour
- Commits missing SVI justification on net-zero milestones are BLOCKED by pre-commit hook
- `CLAUDE-CODEX-SVI-DIRECTIVE.md` is part of `SituationalAwarenessFilterEngine`'s mandatory-top-slice list (not optional)
- Ψ target: 40.9% baseline → ≥60% within 30 days of Phase 0 completion; ≥85% within 90 days; 100% = directive stop condition

#### Anti-patterns
- Do NOT spawn `SVIAwarenessEngine` — extend `SystemVariabilityIndexEngine` with `projectDelta(proposed)` method
- Do NOT inject full SVI data dump — only compact 3-line summary (Ψ, Δ today, top-3 blockers)
- Do NOT block ALL net-zero work — bug fixes, refactors, and doc updates are legitimately Ψ-neutral (hook requires justification, not prohibition)
- Do NOT let Ψ-maximization override safety — S(x) gate ALWAYS supersedes Ψ gate

**Artifact count delta:** +2 engines + 5 hooks (×2 Codex = 10) + 1 skill + 1 ledger file + 1 goal type = ~15.

---

### 0.15 — Auto-Documentation Propagation (NEW — user directive 2026-04-15)
**Goal:** Anytime something new is built (engine, skill, hook, action, dispatcher, formula, algorithm, tribal tip, playbook rule, schema, machine catalog entry), ALL dependent documentation — `CLAUDE.md`, `MEMORY.md`, skill manifests, directive files, master indexes, digests — is automatically refreshed so every surface is always current. **No human copy-paste. No stale counts. No drift between code and docs.**

**Why this isn't covered by Phase 0.6 auto-wiring alone:** Phase 0.6 wires code-to-code (engine → dispatcher → routes). Phase 0.15 wires **code → human-facing documentation**. Without it, CLAUDE.md says "1,559 engines" forever while the real count climbs, and sessions inject stale numbers into their context.

**Documents that must auto-update on relevant writes:**
| Surface | Files | Trigger |
|---------|-------|---------|
| Root CLAUDE.md | `H:/prism/CLAUDE.md` | counts change, new command shipped, new directive referenced |
| MCP CLAUDE.md | `H:/prism/mcp-server/CLAUDE.md` | engine/dispatcher/action count change |
| User memory | `C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/MEMORY.md` | milestone position change, key counts change, recent commits drift |
| Command manifest | `state/shared/PRISM-COMMANDS-MANIFEST.md` | new skill in `.claude/commands/` |
| Self-awareness directive | `state/shared/PRISM-SELF-AWARENESS-DIRECTIVE.md` | engine/formula/algorithm/action count change |
| Command-awareness directive | `state/shared/CLAUDE-CODEX-COMMAND-AWARENESS-DIRECTIVE.md` | new skill or MCP tool |
| MCP directive | `state/shared/CLAUDE-CODEX-MCP-DIRECTIVE.md` | new MCP tool registered |
| Master index | `mcp-server/data/docs/MASTER_INDEX.md` + `MASTER_INDEX_COMPACT.md` | any asset write |
| Action tracker | `mcp-server/data/docs/ACTION_TRACKER.md` | new action wired to dispatcher |
| Code system index | `mcp-server/data/docs/CODE_SYSTEM_INDEX.md` | DSL shortcode assignment |
| Engine digest | `mcp-server/data/docs/ENGINE_DIGEST.md` | engine added/renamed/deleted |
| Dispatcher digest | `mcp-server/data/docs/DISPATCHER_DIGEST.md` | dispatcher added/action added |
| Directory digest | `mcp-server/data/docs/DIRECTORY_DIGEST.md` | structural changes |
| Hook definitions | `mcp-server/data/docs/HOOK_DEFINITIONS_v20.md` | hook added/modified |
| DSL compact | `mcp-server/data/docs/DSL_COMPACT.md` | shortcode table change |
| Capability manifest | `data/state/CAPABILITY_MANIFEST.json` (Phase 0.13) | any skill/hook/tool change |
| Session brief | `state/shared/SESSION-START-INTELLIGENCE.md` | counts + recent commits |

#### Units
| Unit | Artifact | Purpose |
|------|----------|---------|
| U-DOC1 | `DocPropagationEngine.ts` | Classify write → affected doc set → compute patch/full-regen per doc. Drives the cascade |
| U-DOC2 | `hook_post_write_doc_cascade` (PostTool Write\|Edit) | Classify touched file, enqueue affected docs into `DOC_REFRESH_QUEUE.jsonl`; drainer runs async |
| U-DOC3 | `scripts/propagate-docs-drainer.ts` (PostTool + nightly cron) | Drains queue, runs per-doc regenerators. Atomic via `proper-lockfile` per doc |
| U-DOC4 | Per-doc regenerator contracts | Every doc above has a `// AUTO-REFRESHED: managed-section-start/end` block OR a full-regen script. No hand-edits inside managed blocks |
| U-DOC5 | `hook_pre_tool_managed_block_guard` (PreTool Edit) | Block hand-edits inside `AUTO-REFRESHED` blocks with message "this block is managed — edit source of truth instead (`<file>`)" |
| U-DOC6 | `scripts/verify-doc-freshness.ts` (nightly + PreCompact) | Compares each doc's current content hash against re-generated content hash; drift > N hours → auto-regen; drift > 24h + dirty git state → alert |
| U-DOC7 | Memory sync pipeline | `SESSION_INSIGHTS_LEDGER` → salient tips → `MEMORY.md` sync hook (rate-limited, opt-out by flag) |
| U-DOC8 | `DOC_CHANGE_LEDGER.jsonl` | Append-only record of every auto-doc change: `{ulid, doc, triggeredBy, before_hash, after_hash, sessionId}` |
| U-DOC9 | `scripts/verify-managed-blocks.ts` (pre-commit hook) | Reject commits that hand-edit managed blocks without bypass flag |
| U-DOC10 | `/doc-sync` skill | Force a full propagation sweep; shows what would change in `--dry-run` |

#### Leverage existing (do NOT reinvent)
- `scripts/generate-master-index.mjs` — already exists; wrap as a DocPropagationEngine action
- `scripts/regen-code-index.mjs` — already exists; wrap
- `scripts/gen-engine-exports.mjs` — already exists; wrap
- `PRISM-SELF-AWARENESS-DIRECTIVE.md` counts line ("1,559 engines | 499 formulas | ...") — convert to managed block regenerated from live registries

#### Integration with other Phase 0 layers
- Phase 0.6 auto-wiring fires FIRST (code-to-code), Phase 0.15 fires SECOND (code-to-docs) — both atomically inside forge-quint
- Phase 0.13 `SituationalAwarenessFilterEngine` reads the AUTO-REFRESHED managed blocks, so sessions always see live counts
- Phase 0.14 SVI Ψ-delta output is appended to the auto-refresh triggers of `MEMORY.md` + `CLAUDE.md` under a `Current Ψ` line
- Phase 0.9 orphan hooks emit into `DOC_CHANGE_LEDGER` when orphan status changes

#### Exit gates
- `CLAUDE.md` counts line is managed — auto-regen within 60s of any engine write
- `MEMORY.md` "Key Counts" block is managed — auto-regen on count change
- `PRISM-SELF-AWARENESS-DIRECTIVE.md` count line is managed — always current
- `PRISM-COMMANDS-MANIFEST.md` auto-regens within 60s of new `.claude/commands/*.md` file
- `scripts/verify-doc-freshness.ts` reports 0 drift across all 17 doc surfaces on nightly cron
- Hand-edit inside a managed block is BLOCKED by PreTool hook (verified via canary)
- `DOC_CHANGE_LEDGER.jsonl` receives ≥1 entry per documentation-relevant PostTool (non-zero after 1h session)
- `/doc-sync --dry-run` on a fresh clone shows 0 pending changes (proves idempotence)

#### Anti-patterns
- Do NOT auto-rewrite entire files — only `AUTO-REFRESHED` managed blocks. Hand-written narrative must survive refresh
- Do NOT auto-update every 30 seconds — debounce: 60s after last relevant write, OR at PreCompact, OR at SessionEnd
- Do NOT auto-sync `MEMORY.md` without rate limit — user's auto-memory is append-filtered; max 1 sync per 5 min
- Do NOT let a failing regenerator block the cascade — queue isolates per-doc failures with retry + alert
- Do NOT skip the doc-freshness nightly check — drift between git state and docs is a silent credibility bug
- Do NOT regen docs inside CRITICAL safety-file edits (Kienzle coefficients, S(x) logic) without explicit approval — those files have extra review requirements

**Artifact count delta:** +1 engine + 4 hooks (×2 Codex = 8) + 2 scripts + 1 skill + 2 ledger files + managed-block conventions across 17 docs = ~16.

---

### 0.16 — Operational Integrity Layer (NEW — Pass 6 scrutiny 2026-04-15)
**Goal:** The awareness/wiring/doc-propagation stack in 0.1–0.15 is correct *in isolation*; this phase makes it **safe to operate** — bootstrap paradox resolved, hook ordering deterministic, existing 1,660+ artifacts retrofitted, kill switches in place, ledgers bounded, observability baked in, transactions fully rollback-safe. Without 0.16 the stack self-deadlocks on its first boot and any partial failure leaves the system in torn state.

**Why this isn't covered by 0.1-0.15:** Those phases define *what should exist and what it must do*. Phase 0.16 answers the operational questions: *how does it boot from scratch, how is order enforced, how do we migrate, what happens when a hook breaks, how do ledgers not balloon, how do we trace a failure, how does forge-quint roll back a partial write, what proves we didn't regress?*

#### The 15 gaps (from `SCRUTINY-OPERATIONAL-INTEGRITY-AND-PLUGIN-ACTIVATION-2026-04-15.md`)
O1 Bootstrap paradox · O2 Hook ordering unspecified · O3 1,660+ existing engines never went through forge-quint · O4 SessionStart perf budget unset · O5 No hook kill switch · O6 Ledger retention unbounded · O7 No correlationId across ledger surfaces · O8 Forge-quint rollback incomplete for multi-file writes · O9 No phase-canary / staged rollout · O10 No schema versioning on new state files · O11 No regression suite for awareness itself · O12 Semantic guard is binary (cosine>0.85) not tiered · O13 No CRITICAL safety-file extra gate · O14 `/doc-sync --dry-run` idempotence unverified · O15 Metacognition could infinite-loop under self-trigger

#### Units
| Unit | Artifact | Purpose |
|------|----------|---------|
| U-OP1 | `state/shared/BOOTSTRAP_MODE.flag` + `AwarenessBootstrapEngine.bootstrapMode()` | **Resolve bootstrap paradox** — when flag present, 0.1 PreTool dedup, 0.13 awareness-≥0.80 gate, 0.14 SVI-milestone-gate, and 0.15 managed-block-guard all run in *warn-only* mode; flag auto-removed after first successful Phase 0.11 exit gate |
| U-OP2 | `state/shared/HOOK_ORDER_REGISTRY.json` + `HookOrchestratorEngine.ts` | **Deterministic hook ordering** — each hook declares `{phase, priority, dependsOn[], mutex[]}`; orchestrator topological-sorts per tool event, runs in fixed order, short-circuits on first block |
| U-OP3 | `scripts/retrofit-existing-artifacts.ts` | **Back-fill 1,660+ existing engines + 4,296 actions + 84 dispatchers** — walks `src/`, extracts metadata, emits synthetic `post-write-sync-awareness` equivalents that populate every registry/index/ledger as if each file had just been written under Phase 0.6. One-shot; idempotent; chunked with progress |
| U-OP4 | `BOOT_TELEMETRY.jsonl` + perf budget assertions | **SessionStart ≤ 2s warm / ≤ 5s cold, PostTool ≤ 200ms p99, PreTool ≤ 50ms p99** — measured per hook, written to telemetry, regression gate fails build if p99 crosses budget |
| U-OP5 | `state/shared/HOOK_FEATURE_FLAGS.json` + `/hook-disable <name>` + `/hook-enable <name>` skills | **Kill switches** — any hook can be disabled without redeploy; disable reason logged; auto-re-enable after TTL unless explicitly sticky |
| U-OP6 | `LedgerRetentionEngine.ts` + `scripts/rotate-ledgers.ts` (nightly cron) | **Hot/warm/cold tiering** — hot (last 7d) in-place; warm (7-30d) compressed `.jsonl.gz`; cold (>30d) rolled to `data/state/archive/YYYY-MM/`. Prevents `DOC_CHANGE_LEDGER`, `SESSION_INSIGHTS_LEDGER`, `DEPRECATION_LEDGER`, `SVI_DELTA_LEDGER`, `AGENT_UTILIZATION_LEDGER` from unbounded growth |
| U-OP7 | `correlationId` + `causalChain` fields added to every ledger schema | **End-to-end tracing** — one ULID per user turn threads through PreTool → Engine → PostTool → doc-cascade → SVI-delta → reflection → handoff. Enables `scripts/trace-correlation.ts <id>` to reconstruct any causal chain |
| U-OP8 | `TransactionLogEngine.ts` + `data/state/TRANSACTION_LOG.jsonl` + `scripts/rollback-transaction.ts` | **Complete forge-quint rollback** — journals every file+registry+index mutation of a transaction; on any failed leg, replays inverse ops in reverse; survives crash mid-transaction (resume from last checkpoint) |
| U-OP9 | `scripts/atomic-multifile-write.ts` + 2-phase commit helper | **Multi-file atomicity** — all forge-quint writes go through prepare (temp files) → fsync → rename; partial failure leaves zero visible changes |
| U-OP10 | `state/shared/PHASE_CANARY.flag` + staged rollout | **Gradual activation** — each of 0.1-0.15 can be enabled for 10% of sessions, then 50%, then 100%; rollback trivially by flipping flag |
| U-OP11 | `schemaVersion` on all new state files + `src/migrations/state_v1_to_vN.ts` | **Schema versioning** — every Phase 0 state file declares `schemaVersion: N`; migrations ship with breaking changes; N-1 compatibility maintained |
| U-OP12 | `src/__tests__/awareness_regression.test.ts` suite | **Regression gate for awareness itself** — 30+ canary tests cover: dedup blocks duplicate; bootstrap score ≥0.80 in 10s; forge-quint atomicity under injected fault; hook ordering stable; ledger rotation idempotent; retrofit emits correct counts |
| U-OP13 | `SemanticSimilarityGuardEngine` refactored to 3-band gate | **Tiered decision** — `green (<0.70) → pass`, `yellow (0.70–0.85) → warn + log + require justification`, `red (>0.85) → block`. Calibration uses MIT-ingested 6.S191 material |
| U-OP14 | `state/shared/CRITICAL_FILES.json` + `hook_pre_tool_critical_file_guard` | **Extra guard for safety-critical code** — Kienzle coefficients, Taylor constants, S(x) scoring, tolerance logic require explicit `--confirm-critical` flag on edits; audit trail enriched |
| U-OP15 | `MetacognitionBudgetEngine.ts` | **Infinite-loop prevention** — 0.13 metacog hook rate-limited to 1 call / 15 PostTool AND max 3 / user-turn; self-triggered metacog cannot trigger further metacog (stack depth cap = 1) |

#### Leverage existing (do NOT reinvent)
- `proper-lockfile` (U-AWR25) — provides CAS primitive for BOOTSTRAP_MODE flag and feature flags
- `SessionArtifactsEngine` — extend with `schemaVersion` field rather than spawn parallel
- `HEALTH_CHECK_REPORT.json` — extend rather than create new perf-budget file
- `scripts/verify-managed-blocks.ts` (Phase 0.15) — add regression test covering idempotence of `/doc-sync --dry-run`

#### Integration with prior phases
- BOOTSTRAP_MODE enables clean first-boot of Phase 0.1-0.15 stack (the gates that would otherwise block their own provisioning)
- Retrofit script (U-OP3) MUST run once between Phase 0.7 (reverse indexes) and Phase 0.11 (exit gate) — without it, every existing engine appears orphan-eligible and Phase 0.9 orphan hook mass-flags the whole codebase
- HOOK_ORDER_REGISTRY binds Phase 0.13/0.14/0.15 hooks so SVI injection precedes doc-cascade precedes reflection (ordering matters for correctness, not just performance)
- TransactionLogEngine (U-OP8) is the transactional backbone for forge-quint rollback promised in Phase 0.3 but never implemented end-to-end
- 3-band semantic guard replaces the binary gate in Phase 0.2 (not a separate engine — refactor)

#### Exit gates
- Fresh clone + `BOOTSTRAP_MODE.flag` → all Phase 0.1–0.15 services boot to healthy state in <60s, no deadlocks
- Flag auto-removed after Phase 0.11 exit gate; re-running boot without flag succeeds
- `retrofit-existing-artifacts.ts` emits counts matching live `find`/`grep` baselines within ±1% (verified by `scripts/verify-retrofit.ts`)
- `BOOT_TELEMETRY.jsonl` shows SessionStart p99 ≤2s for 100 consecutive boots
- Injected chaos: random hook mid-flight kill → `TransactionLogEngine` rolls back cleanly, no torn state
- Injected chaos: kill process mid-multifile-write → no half-files on disk
- Correlation canary: 1 user prompt → ledger entries in DOC_CHANGE, SVI_DELTA, SESSION_INSIGHTS all share same `correlationId`
- Ledger rotation canary: 100K-entry ledger rotates in <10s, readable post-rotation
- Regression suite passes 30/30 awareness tests
- 3-band guard demonstrably distinguishes "MillOptimizer" vs "MillProgramOptimizerEngine" (red) from "MillOptimizer" vs "LatheOptimizer" (green)

#### Anti-patterns
- Do NOT ship Phase 0.1-0.15 without BOOTSTRAP_MODE — first boot will deadlock
- Do NOT retrofit existing engines while new forge-quint writes are happening — lock new writes during retrofit
- Do NOT let telemetry itself cost more than the budget being measured — sample 1-in-100 for hot paths
- Do NOT skip schema versioning — silent breaks across session boundaries are the worst kind
- Do NOT use HOOK_FEATURE_FLAGS to permanently silence a failing hook — it must either be fixed or removed from registry
- Do NOT rotate ledgers during active session writes — schedule nightly, with lock
- Do NOT run retrofit script more than once — it's idempotent but expensive; guard with `RETROFIT_COMPLETE.flag`

**Artifact count delta:** +4 engines (HookOrchestrator, LedgerRetention, TransactionLog, MetacognitionBudget) + 5 scripts (retrofit, atomic-multifile-write, rotate-ledgers, rollback-transaction, trace-correlation) + 2 skills (/hook-disable, /hook-enable) + 2 hooks (critical-file-guard ×2 Codex = 4) + state additions (BOOTSTRAP_MODE flag, HOOK_ORDER_REGISTRY, HOOK_FEATURE_FLAGS, PHASE_CANARY, CRITICAL_FILES, BOOT_TELEMETRY, TRANSACTION_LOG) + 1 regression suite + semantic guard refactor = **~22 artifacts**.

---

### 0.17 — Plugin / Agent / Extension Activation Layer (NEW — user directive 2026-04-15)
**User directive:** *"I don't think we properly use all our plugins, slash commands and extensions effectively. we've never used claude flow or superpowers"*

**Goal:** Turn the 175 slash commands, 100+ Task-tool agents, claude-flow MCP, flow-nexus, hive-mind, superpowers, SPARC, and pr-review-toolkit from *present-but-unused* into *routinely-invoked*. Session awareness of *what tools I have* must match awareness of *what PRISM knows*. Without 0.17 the session keeps hand-rolling work that a specialized agent or plugin could do 10× faster.

#### Evidence of underuse (from scrutiny)
- Zero prior sessions in `SESSION_ARTIFACTS`/`handoffs/` show Task-tool invocation of `queen-coordinator`, `consensus-coordinator`, `perf-analyzer`, `silent-failure-hunter`, `type-design-analyzer`, `swarm-memory-manager`
- claude-flow MCP server is installed but not registered in `.mcp.json` — its 80+ tools are unreachable
- `/pr-swarm`, `/multi-repo-swarm`, `/release-swarm` never invoked
- `sparc-coord`, `specification`, `pseudocode`, `architecture`, `refinement`, `tdd-london-swarm` agents never invoked
- superpowers `/hookify`, `/code-reviewer` (pr-review-toolkit), `/agent-sdk-verifier-*` never used despite matching in-flight work
- Session boots know 61 skills but don't know 175 full commands catalog; no recommender surfaces agent matches

#### Units
| Unit | Artifact | Purpose |
|------|----------|---------|
| U-PLG1 | `AgentRegistryEngine.ts` + `data/state/AGENT_REGISTRY.json` | **Inventory all 100+ Task-tool agents** (general-purpose, Explore, Plan, feature-dev:*, pr-review-toolkit:*, superpowers:*, claude-flow:*, sparc:*, flow-nexus:*, physics-reviewer, dispatcher-wirer, catalog-enricher, build-doctor, test-runner, regression-hunter, implementer, verifier, safety-physics, etc.). Each entry: `{name, category, description, tools, triggers[], exampleInvocations[], costTier}` |
| U-PLG2 | `SlashCommandRecommenderEngine.ts` | **Suggest slash commands on UserPromptSubmit** — scans prompt, emits top-3 command matches with rationale ("you asked about PR review → try `/code-reviewer`"). Data-driven from `~/.claude/commands/*.md` frontmatter |
| U-PLG3 | `PluginInventoryEngine.ts` + `data/state/PLUGIN_INVENTORY.json` | **Single pane for plugin/MCP/extension visibility** — lists installed MCP servers, claude-flow, flow-nexus, superpowers, their health, last-used timestamp. Feeds into `/aware` (Phase 0.13) |
| U-PLG4 ✅ | `.mcp.json` update — register claude-flow MCP server + `.claude/hooks/claude-flow-health.mjs` | **Activate claude-flow's 80+ tools** — swarm_init, agent_spawn, task_orchestrate, memory_usage, consensus primitives, workflow_create. Health-check on SessionStart. *(DONE 2026-04-19 — claude-flow v3.0.0-alpha.179 reachable; inventory now lists mcp-server=5)* |
| U-PLG5 ✅ | `state/shared/DELEGATION_WAYPOINTS.md` | **Delegation waypoints during Phase 0 buildout** — Phase 0.6 auto-wiring → `dispatcher-wirer`; 0.7 indexes → `perf-analyzer`; 0.11 exit gate → `verifier` + `silent-failure-hunter` + `type-design-analyzer` parallel; 0.13 awareness → `consensus-coordinator`; 0.16 retrofit → `queen-coordinator` + `implementer` team. Plus event-driven rules (pr-swarm, catalog-enricher, regression-hunter, safety-physics, build-doctor, sparc). Rules of the waypoints + utilization scorecard target: ≥5 distinct non-general agents/week. *(DONE 2026-04-19 — docs-only)* |
| U-PLG6 ✅ | `state/shared/SPARC_OPT_IN.flag` (runtime, untracked) + `/sparc` router skill (rewritten) + `.claude/hooks/sparc-optin-gate.mjs` (UserPromptSubmit blocker) + `prism_ai` actions `ai_sparc_optin` / `ai_sparc_status` | **SPARC methodology** — opt-in spec→pseudo→arch→refine→complete chain binding five canonical agents (`specification`, `pseudocode`, `architecture`, `refinement`, `sparc-coord`). Gate hook refuses `/sparc` unless flag enabled, suggests `/forge-triple` as default. *(DONE 2026-04-19 — default off)* |
| U-PLG7 ✅ | `/commands-audit` skill + `mcp-server/scripts/commands-audit.ts` (extended) | **Dual-layer audit** — (1) docs coverage across 308 slash commands, (2) utilization from AGENT_UTILIZATION_LEDGER across 134 agents. Classifies heavy/low/unused with `--since` window. Slash invocation telemetry flagged as instrumentation gap. *(DONE 2026-04-19 — baseline report: 2.6% docs, 0.7% util)* |
| U-PLG8 ✅ | `/pr-swarm` skill (rewritten) + `mcp-server/scripts/pr-swarm-aggregate.ts` + `prism_ai` action `ai_prswarm_aggregate` | **Multi-agent PR review orchestration** — runs `pr-review-toolkit:code-reviewer` + `silent-failure-hunter` + `pr-test-analyzer` + `comment-analyzer` + `type-design-analyzer` in parallel, aggregates via dedupe + severity-bucketed verdict (BLOCK / REQUEST_CHANGES / APPROVE). *(DONE 2026-04-19)* |
| U-PLG9 ✅ | `AGENT_UTILIZATION_LEDGER.jsonl` + `.claude/helpers/agent-util-ledger.mjs` + `.claude/hooks/agent-util-log.mjs` + `prism_ai` actions `ai_util_append` / `ai_util_stats` | **Append-only telemetry** — `{ulid, ts, agent, subagent_type, description, durationMs, exitCode, correlationId, invokedBy}`. PostToolUse hook logs every `Task` call. Feeds `/commands-audit` and the recommender's ranking. *(DONE 2026-04-19)* |
| U-PLG10 ✅ | `mcp-server/scripts/build-capability-manifest.ts` + `mcp-server/data/state/CAPABILITY_MANIFEST.json` + `.claude/hooks/capability-manifest-surface.mjs` + `prism_ai` actions `ai_cap_manifest` / `ai_cap_refresh` | Aggregator manifest joining `AGENT_REGISTRY` (134), `SLASH_COMMAND_REGISTRY` (307), `PLUGIN_INVENTORY` (8), `SELF_AWARENESS_MANIFEST` (2528 engines). Boot hook surfaces one-liner totals. *(DONE 2026-04-19 — 12.2 KB manifest)* |

#### Integration with prior phases
- Recommender output surfaces *inside* the Phase 0.13 `SituationalAwarenessFilterEngine` top-K slice — sessions see agent matches alongside relevant engines
- `AGENT_UTILIZATION_LEDGER` shares correlationId with 0.16 so a session's agent calls can be traced end-to-end
- Delegation waypoints (U-PLG5) turn the Phase 0 buildout itself into the first proof that the activation layer works — dogfooding
- `/pr-swarm` rides on claude-flow's task_orchestrate primitive from U-PLG4

#### Exit gates
- `.mcp.json` includes claude-flow; `mcp__claude-flow__swarm_init` is callable
- `AgentRegistryEngine.list()` returns ≥100 entries with non-empty triggers
- `/aware` skill output includes "Top-3 relevant agents for this prompt" section
- Canary: user asks "review this PR" → recommender surfaces `/code-reviewer` + `/pr-swarm` in SessionBrief
- `AGENT_UTILIZATION_LEDGER.jsonl` shows ≥5 distinct non-general-purpose agents invoked within 48h of Phase 0.17 landing
- Phase 0 buildout itself logs delegation to `dispatcher-wirer`, `perf-analyzer`, `queen-coordinator`, `verifier` (dogfood proof)
- `/commands-audit` report generated; unused commands list produced
- `scripts/pr-swarm.sh <PR#>` triggers ≥3 parallel agent invocations and aggregates one consolidated report

#### Anti-patterns
- Do NOT auto-invoke every plugin — recommender *suggests*, session *chooses*. User-facing noise is a regression
- Do NOT duplicate agent capability in PRISM engines — if an agent already does it, prefer delegation over reimplementation
- Do NOT treat claude-flow as a silver bullet — specific MCP tools; verify each before committing to it
- Do NOT enable SPARC globally — it's heavy; opt-in by flag only for "design new subsystem" class work
- Do NOT let the recommender become a popup blocker — rate-limit: max 1 suggestion per user turn, and only if confidence ≥ 0.70
- Do NOT commit `.mcp.json` changes without verifying claude-flow's runtime version is pinned — MCP server version drift silently breaks tool schemas

**Artifact count delta:** +3 engines (AgentRegistry, SlashCommandRecommender, PluginInventory) + 3 scripts (commands-audit, pr-swarm orchestrator, capability-manifest updater) + 3 skills (/sparc, /commands-audit, /pr-swarm) + 2 state files (AGENT_REGISTRY, PLUGIN_INVENTORY) + 1 ledger (AGENT_UTILIZATION_LEDGER) + `.mcp.json` update + CAPABILITY_MANIFEST extension + delegation-waypoints rubric (doc) = **~13 artifacts**.

---

### 0.18 — AGI Proximity Layer (NEW — Scrutiny Pass 11, 2026-04-15)
**Goal:** Bridge the gap between sophisticated self-awareness (Phase 0.13) and true autonomous intelligence. Ship 15 AGI-proximate capabilities: causal reasoning, goal synthesis, transfer learning, meta-learning, predictive simulation, curiosity-driven exploration, belief state reasoning, compositional synthesis, temporal reasoning, self-modification proposals, emergent behavior detection, cognitive budget allocation, peer learning, and abstraction hierarchies.

**Why 0.13-0.17 alone are not sufficient:** Phase 0.13 models "what I am / what user knows / what exists" but the system still WAITS for goals instead of GENERATING them. It tracks uncertainty but doesn't USE uncertainty to decide what to learn. It coordinates across terminals but doesn't LEARN from peer sessions. It has knowledge but can't COMPOSE it into novel solutions. Without 0.18, the system is highly self-aware but not autonomously intelligent.

#### Gap Analysis (from Scrutiny 11)
| Capability | Current State | AGI Requirement |
|------------|---------------|-----------------|
| Goal Generation | GoalStackEngine tracks goals | Synthesize goals from system state |
| Causal Reasoning | CounterfactualEngine (shallow) | Deep intervention calculus |
| Transfer Learning | CrossDisciplinaryEngine (static) | Cross-domain analogical mapping |
| Meta-Learning | None | Learn to learn faster |
| Curiosity | hook_idle_curiosity (minimal) | Proactive gap hunting |
| Temporal Reasoning | Timestamps only | Past/present/future projection |
| Active Learning | UncertaintyEngine | Uncertainty drives acquisition |
| Compositional Synthesis | None | Combine primitives into solutions |
| Predictive Simulation | None | Pre-play outcomes before acting |
| Self-Modification | None | Propose architecture improvements |
| Emergence Detection | None | Detect unexpected interactions |
| Cognitive Budget | MetacognitionBudget (rate limit) | Resource-aware reasoning |
| Belief States | Uncertainty tagging | Full probabilistic reasoning |
| Peer Learning | Cross-terminal coordination | Learn from other sessions |
| Abstraction Hierarchy | None | Tip → principle → law |

#### Units
| Unit | Artifact | Purpose |
|------|----------|---------|
| U-AGI1 | `AutonomousGoalSynthesisEngine.ts` | **Goal generation.** Scans orphan surfaces, Ψ gaps, extraction candidates, failing tests, user model desires, peer work. Proposes top-3 goals ranked by Ψ×urgency×feasibility. |
| U-AGI2 | `CausalReasoningEngine.ts` + `hook_pre_tool_causal_trace` | **Causal graph.** Tracks dependencies; explains WHY a change will have impact. Uses intervention calculus. |
| U-AGI3 | `TransferLearningBridgeEngine.ts` | **Cross-domain analogy.** Given problem in D1, finds solved analogues in D2 via embedding + structural mapping. |
| U-AGI4 | `MetaLearningOptimizerEngine.ts` + `META_LEARNING_LEDGER.jsonl` | **Learning to learn.** Tracks which strategies work for which content. Adjusts learning parameters. |
| U-AGI5 | `CuriosityDrivenExplorerEngine.ts` + `hook_idle_curiosity_v2` | **Proactive gap hunting.** Scans for never-accessed entries, unregistered H: files, zero-citation tips. |
| U-AGI6 | `TemporalReasoningEngine.ts` + `TEMPORAL_STATE_LEDGER.jsonl` | **Timeline projection.** State snapshots every N commits. Powers "3 weeks ago Ψ was X, projected 100% by Y." |
| U-AGI7 | `ActiveLearningStrategyEngine.ts` | **Info-gain acquisition.** Ranks learning targets by expected info gain × Ψ impact. |
| U-AGI8 | `CompositionalSynthesisEngine.ts` | **Novel compositions.** Enumerates valid combinations of engines/actions/formulas to solve problem. |
| U-AGI9 | `PredictiveWorldSimulatorEngine.ts` + `hook_pre_tool_simulate` | **Pre-play outcomes.** Before major writes, simulates test pass/fail, build impact, dependent breaks. |
| U-AGI10 | `SelfModificationProposalEngine.ts` + `ARCH_EVOLUTION_LEDGER.jsonl` | **Architecture proposals.** Analyzes patterns→abstractions, orphans→removal, fan-in→splits. Proposes only. |
| U-AGI11 | `EmergentBehaviorMonitorEngine.ts` + `EMERGENCE_LEDGER.jsonl` | **Interaction detection.** Monitors for performance anomalies, registry drift, flaky test correlations. |
| U-AGI12 | `CognitiveBudgetAllocatorEngine.ts` | **Resource-aware reasoning.** Estimates shallow vs deep cost; allocates think-hard vs respond-fast. |
| U-AGI13 | `BeliefStateReasoningEngine.ts` | **Probabilistic states.** Maintains distributions: "file is 80% stale, 15% current, 5% corrupted." |
| U-AGI14 | `PeerLearningCoordinatorEngine.ts` + `hook_post_session_peer_share` | **Learn from peers.** Session A broadcasts insight; session B incorporates at boot. Deduped. |
| U-AGI15 | `AbstractionHierarchyEngine.ts` + `ABSTRACTION_HIERARCHY.json` | **Multi-level generalization.** Tip → principle → domain law. Powers `/generalize`. |

#### New Skills
| Skill | Purpose |
|-------|---------|
| `/synthesize <problem>` | Compose existing primitives into solution candidates |
| `/trend <metric>` | Show historical trend + projection |
| `/generalize <tip-id>` | Elevate specific tip to principle |
| `/propose-goal` | Show autonomously synthesized goal candidates |
| `/simulate <change>` | Pre-play impact without applying |
| `/curiosity-queue` | Show exploration queue |

#### New Hooks
| Hook | Fires | Purpose |
|------|-------|---------|
| `hook_session_goal_synthesis` | SessionStart (awareness ≥0.80) | Inject top-3 synthesized goals |
| `hook_pre_tool_causal_trace` | PreTool Write\|Edit | Compute causal chain before edit |
| `hook_pre_tool_simulate` | PreTool Write (major) | Run simulation; warn on breaks |
| `hook_idle_curiosity_v2` | PostTool every N=50 | Queue exploration |
| `hook_post_session_peer_share` | SessionEnd | Broadcast learnings |
| `hook_emergence_scan` | PostTool every N=100 | Detect unexpected combinations |

#### Integration
- **AGI Parity Test v2** adds 3 checks: (1) session proposes goal without being asked, (2) session explains WHY change breaks something, (3) session suggests cross-domain analogy
- **0.14 SVI** feeds AutonomousGoalSynthesisEngine Ψ-gap data
- **0.16 TransactionLogEngine** powers PredictiveWorldSimulatorEngine rollback scenarios
- **0.17 AgentRegistryEngine** feeds CompositionalSynthesisEngine available primitives

#### Exit Gates
- `AutonomousGoalSynthesisEngine.propose()` returns ≥3 non-trivial goals on fresh session
- `CausalReasoningEngine.traceImpact("critical-file")` returns ≥10-node graph in <500ms
- `TransferLearningBridgeEngine.findAnalogies("adaptive spindle")` returns ≥1 cross-domain match
- `PredictiveWorldSimulatorEngine.simulate()` predicts test failures >80% accuracy on canary
- `AbstractionHierarchyEngine.hierarchy()` has ≥3 levels, ≥50 entries
- AGI Parity Test v2: 8/8 checks pass (original 5 + new 3)

#### Anti-Patterns
- Do NOT auto-apply self-modifications — proposals only, human approval required
- Do NOT let curiosity starve production — rate limit 1 exploration / 50 tool calls
- Do NOT make causal graphs unbounded — prune to 3-hop default
- Do NOT broadcast sensitive data (credentials, customer) to peers — filter
- Do NOT make simulation blocking on every edit — only CRITICAL files or >10 dependents

**Artifact count delta:** +15 engines + 6 skills + 6 hooks (×2 Codex = 12) + 4 ledgers + 1 JSON = **~38 artifacts**.

---

### 0.19 — Local LLM Infrastructure (NEW — User hardware constraints 2026-04-15)
**Goal:** Deploy open-source LLMs locally on user's existing hardware (RTX 4080 16GB home, RTX 3080 10GB work) to enable continuous learning from shop outcomes, domain fine-tuning, and persistent memory — all at zero additional cost beyond existing Claude Max subscriptions.

**Hardware constraints:**
| Location | GPU | VRAM | Role |
|----------|-----|------|------|
| Home | RTX 4080 | 16GB | Primary inference + LoRA training |
| Work | RTX 3080 | 10GB | Secondary inference |
| Cloud | Claude Max ×4 + Codex ×1 | Already paid | Complex reasoning |

**Models that fit:**
| Model | Size | VRAM | Runs On |
|-------|------|------|---------|
| Mistral 7B | 7B | ~14GB FP16 | 4080 ✓ |
| Phi-3 14B | 14B | ~14GB FP16 | 4080 ✓ |
| Qwen2.5-Coder 7B | 7B | ~14GB FP16 | 4080 ✓ |
| Llama 3.2 3B | 3B | ~6GB FP16 | Both ✓ |
| Mistral 7B Q4 | 7B | ~5GB Q4 | 3080 ✓ |
| Phi-3 3.8B | 3.8B | ~8GB FP16 | 3080 ✓ |

**Removed (too expensive/complex):**
- ❌ RTX 4090 / A100 requirement
- ❌ $500/mo cloud inference
- ❌ Cloud training pipeline
- ❌ MTConnect sensor fusion (requires hardware)
- ❌ Vision/audio processing (requires setup)
- ❌ Nemotron 340B / Llama 405B (too large)

#### Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│  HOME (RTX 4080 16GB) — Primary                                 │
│  ├── Ollama + Mistral 7B / Phi-3 14B — fast local inference     │
│  ├── Qwen2.5-Coder 7B — G-code specialized                      │
│  ├── PRISM LoRA adapters — manufacturing fine-tune              │
│  ├── Qdrant Docker — vector memory (free)                       │
│  └── Overnight LoRA training on outcomes                        │
├─────────────────────────────────────────────────────────────────┤
│  WORK (RTX 3080 10GB) — Secondary                               │
│  ├── Llama 3.2 3B / Phi-3 3.8B — quick responses                │
│  ├── Mistral 7B Q4 — when more reasoning needed                 │
│  └── Syncs to home Qdrant via H: drive                          │
├─────────────────────────────────────────────────────────────────┤
│  CLOUD (Already Paid — $0 additional)                           │
│  ├── Claude Max ×4 — complex reasoning, safety-critical         │
│  └── Codex Max ×1 — code generation                             │
└─────────────────────────────────────────────────────────────────┘
```

#### Units
| Unit | Artifact | Hardware | Purpose |
|------|----------|----------|---------|
| U-LLM1 | `LocalModelOrchestratorEngine.ts` | Any | Route: simple→local, complex→Claude (free) |
| U-LLM2 | `OllamaIntegrationEngine.ts` | 4080/3080 | Manage Ollama, model switching, health |
| U-LLM3 | `PRISMLoRAAdapterEngine.ts` | 4080 | Fine-tune 7B models on JM DIE programs overnight |
| U-LLM4 | `QdrantMemoryEngine.ts` | 4080 | Docker Qdrant for continuous memory |
| U-LLM5 | `OutcomeTrackingEngine.ts` | Any | Log program → outcome (good/scrap/adjust) |
| U-LLM6 | `IncrementalLearningEngine.ts` | 4080 | Nightly LoRA updates from outcomes |
| U-LLM7 | `ModelRoutingEngine.ts` | Any | Complexity estimation → route to right model |
| U-LLM8 | `MemorySyncEngine.ts` | Both | Sync Qdrant between home/work via H: drive |
| U-LLM9 | `LocalEmbeddingEngine.ts` | Both | all-MiniLM-L6-v2 (free, 80MB) |
| U-LLM10 | `FeedbackCollectorEngine.ts` | Any | Simple UI to mark outcomes good/bad |

#### New Skills
| Skill | Purpose |
|-------|---------|
| `/local-ask <prompt>` | Query local Ollama model directly |
| `/train-lora` | Trigger overnight LoRA training on collected outcomes |
| `/outcome <program> <result>` | Log program outcome for learning |
| `/model-status` | Show which models running, VRAM usage, health |
| `/memory-search <query>` | Search Qdrant continuous memory |
| `/sync-memory` | Force sync Qdrant between locations |

#### New Infrastructure (All Free)
| Component | Technology | Cost |
|-----------|------------|------|
| `docker/ollama-prism/` | Ollama | Free |
| `docker/qdrant/` | Qdrant vector DB | Free |
| `scripts/train-lora.py` | Hugging Face PEFT | Free |
| `data/lora-adapters/` | LoRA checkpoints | Free |
| `data/outcomes/` | Outcome records | Free |
| all-MiniLM-L6-v2 | Embeddings | Free |

#### Setup Commands
```bash
# Home (4080)
curl -fsSL https://ollama.com/install.sh | sh
ollama pull mistral:7b
ollama pull qwen2.5-coder:7b
ollama pull phi3:14b
docker run -d -p 6333:6333 qdrant/qdrant

# Work (3080)
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2:3b
ollama pull mistral:7b-q4_K_M
ollama pull phi3:3.8b
```

#### Integration
- `ModelRoutingEngine` routes simple queries to Ollama, complex to Claude (already paid)
- `LocalEmbeddingEngine` feeds `QdrantMemoryEngine` and existing `SemanticSimilarityGuardEngine`
- `OutcomeTrackingEngine` feeds `CausalReasoningEngine` (Phase 0.18) with real data
- `PRISMLoRAAdapterEngine` improves `TransferLearningBridgeEngine` (Phase 0.18) domain knowledge
- Memory syncs via H: drive maintain cross-location continuity

#### Exit Gates
- Ollama running on both machines, responding <2s for typical queries
- Mistral 7B answers basic G-code questions correctly (manual eval)
- LoRA adapter trained on ≥100 JM DIE programs shows measurable improvement
- Qdrant stores ≥10,000 embeddings, retrieves in <100ms
- Outcome feedback collects ≥50 labeled examples
- Model routing correctly sends complex queries to Claude
- Memory syncs between home/work within 5 minutes via H: drive
- `/local-ask "explain G43 H1"` returns correct answer from local model
- `/model-status` shows healthy Ollama + Qdrant

#### Anti-Patterns
- Do NOT try to run 70B+ models on this hardware — they won't fit
- Do NOT pay for cloud inference — use existing Claude subscriptions
- Do NOT block on training — run LoRA overnight only
- Do NOT skip quantization on 3080 — 10GB is tight
- Do NOT duplicate embedding logic — extend existing SemanticSimilarityGuardEngine

#### Cost Summary
| Item | Cost |
|------|------|
| Ollama | Free |
| Qdrant | Free |
| Hugging Face PEFT | Free |
| all-MiniLM-L6-v2 | Free |
| Claude Max ×4 | Already paying |
| Codex Max ×1 | Already paying |
| **Additional** | **$0** |

**Artifact count delta:** +10 engines + 6 skills + 2 Docker configs + 1 training script + data dirs = **~20 artifacts**.

---

### 0.20 — Mathematical Foundations Layer (NEW — Scrutiny Pass 12, 2026-04-15)
**Goal:** Ground PRISM's intelligence in rigorous mathematical, scientific, and statistical foundations. Ship 18 engines that provide formal verification, Bayesian inference, information-theoretic optimization, causal discovery, and complexity-aware routing. Transform heuristics into provable guarantees.

**Why 0.18-0.19 alone are insufficient:** Phase 0.18 ships AGI-proximate reasoning but it's still heuristic — no proofs, no bounds, no guarantees. Without 0.20, the system is intelligent but not *formally* intelligent.

#### Units
| Unit | Artifact | Mathematical Foundation | Purpose |
|------|----------|------------------------|---------|
| U-MATH1 | `BayesianInferenceEngine.ts` | Bayes' theorem, MCMC, variational | Replace point estimates with posterior distributions |
| U-MATH2 | `FormalVerificationEngine.ts` | SAT/SMT solvers (Z3 via WASM) | Prove G-code properties: no collision, bounds respected |
| U-MATH3 | `InformationTheoreticLearnerEngine.ts` | Mutual information, info bottleneck | Maximize info gain per learning action |
| U-MATH4 | `CausalDiscoveryEngine.ts` | PC algorithm, FCI, GES | Discover causal graphs from observational data |
| U-MATH5 | `StatisticalLearningBoundsEngine.ts` | PAC learning, VC dimension, Rademacher | Compute generalization bounds |
| U-MATH6 | `DynamicalSystemsModelEngine.ts` | ODEs, Lyapunov stability, attractors | Model PRISM state as dynamical system |
| U-MATH7 | `GameTheoreticCoordinatorEngine.ts` | Nash equilibrium, mechanism design | Optimal multi-session resource allocation |
| U-MATH8 | `KolmogorovComplexityEngine.ts` | MDL, normalized compression distance | Find simplest explanation |
| U-MATH9 | `NeurosymbolicBridgeEngine.ts` | Differentiable logic, neural theorem proving | Learn rules from data |
| U-MATH10 | `TopologicalDataAnalysisEngine.ts` | Persistent homology, mapper algorithm | Find topological features in high-D data |
| U-MATH11 | `ComplexityAwareRouterEngine.ts` | P/NP classification, approximation | Route problems to appropriate solvers |
| U-MATH12 | `FormalGCodeSemanticsEngine.ts` | Denotational semantics | Formal meaning of G-code; prove equivalence |
| U-MATH13 | `ActiveInferenceEngine.ts` | Free energy principle, predictive processing | Actively seek information to reduce uncertainty |
| U-MATH14 | `OptimalControlEngine.ts` | LQR, MPC, dynamic programming | Provably optimal decision sequences |
| U-MATH15 | `CalibratedEnsembleEngine.ts` | Platt scaling, isotonic regression | Calibrated confidence; ensemble |
| U-MATH16 | `RegretMinimizationEngine.ts` | Online learning, UCB, Thompson sampling | Minimize cumulative regret |
| U-MATH17 | `ConcentrationInequalityEngine.ts` | Hoeffding, McDiarmid, Bernstein | Tight probability bounds |
| U-MATH18 | `SymbolicRegressionEngine.ts` | Genetic programming, PySR | Discover formulas from data |

#### New Skills
| Skill | Purpose |
|-------|---------|
| `/prove <property>` | Formally verify a G-code property |
| `/posterior <query>` | Get full posterior distribution |
| `/discover-causal <dataset>` | Run causal discovery on outcome data |
| `/complexity <problem>` | Classify problem complexity; suggest solver |
| `/bound <model>` | Compute generalization bound |
| `/simplest <explanations>` | Rank by Kolmogorov complexity |
| `/equilibrium <scenario>` | Find Nash equilibrium |
| `/trajectory <state>` | Project system state trajectory |

#### New Hooks
| Hook | Purpose |
|------|---------|
| `hook_pre_tool_complexity_check` | Warn if NP-hard without approximation |
| `hook_post_inference_calibration` | Calibrate confidence via Platt scaling |
| `hook_causal_discovery_trigger` | Queue discovery when enough outcomes |
| `hook_formal_verify_safety` | SMT verification on safety properties |
| `hook_regret_tracking` | Track cumulative regret |
| `hook_ensemble_disagreement` | Flag ensemble disagreement |

#### Libraries (All Free)
| Library | Purpose |
|---------|---------|
| `pgmpy` | Bayesian networks, causal discovery |
| `z3-solver` (WASM) | SMT/SAT verification |
| `scipy.optimize` | Optimization, ODEs |
| `scikit-learn` | Calibration, ensemble |
| `pysr` / `gplearn` | Symbolic regression |
| `nashpy` | Game theory |

#### Exit Gates
- `BayesianInferenceEngine.posterior()` returns calibrated distribution
- `FormalVerificationEngine.prove()` returns SAT/UNSAT in <10s
- `CausalDiscoveryEngine.discover()` produces DAG from ≥100 outcomes
- `ComplexityAwareRouterEngine.classify()` correctly identifies NP-hard in 90%
- `SymbolicRegressionEngine.discover()` recovers Kienzle formula from synthetic data

**Artifact count delta:** +18 engines + 8 skills + 6 hooks (×2 Codex = 12) = **~40 artifacts**

---

### 0.21 — Scientific Simulation Layer (NEW — Scrutiny Pass 12, 2026-04-15)
**Goal:** Full physics simulation before any G-code runs. Not just predicting "will tests pass" but simulating actual cutting forces, thermal expansion, tool deflection, and part geometry.

#### Units
| Unit | Artifact | Scientific Domain | Purpose |
|------|----------|-------------------|---------|
| U-SCI1 | `FiniteElementLiteEngine.ts` | FEA (simplified) | Predict part deflection, stress concentrations |
| U-SCI2 | `ThermalSimulationEngine.ts` | Heat transfer | Predict thermal expansion, coolant effectiveness |
| U-SCI3 | `CuttingForceSimulatorEngine.ts` | Mechanics (Kienzle + FEM) | Full force prediction with engagement geometry |
| U-SCI4 | `ChipFormationModelEngine.ts` | Materials science | Predict chip type, built-up edge risk |
| U-SCI5 | `SurfaceRoughnessPredictor.ts` | Tribology | Predict Ra/Rz before cutting |
| U-SCI6 | `ToolWearModelEngine.ts` | Taylor + physics | Predict tool life, wear patterns |
| U-SCI7 | `VibrationModalAnalysisEngine.ts` | Structural dynamics | Predict natural frequencies, chatter risk |
| U-SCI8 | `GeometricKernelEngine.ts` | Computational geometry | Boolean ops, offset, interference detection |
| U-SCI9 | `ToleranceStackupEngine.ts` | GD&T, statistics | Monte Carlo tolerance analysis |
| U-SCI10 | `DimensionalStabilityEngine.ts` | Thermal + residual stress | Predict dimensional changes post-machining |

#### New Skills
| Skill | Purpose |
|-------|---------|
| `/simulate-cut <params>` | Run full cutting simulation |
| `/predict-surface <params>` | Predict surface finish |
| `/thermal-analysis <program>` | Thermal expansion analysis |
| `/tolerance-stack <assembly>` | Monte Carlo tolerance stackup |

#### Exit Gates
- Cutting force prediction within 15% of measured values
- Thermal expansion prediction within 0.01mm for steel
- Chatter frequency matches measured spectrum peaks
- Surface roughness within 20% of measured Ra

**Artifact count delta:** +10 engines + 4 skills = **~14 artifacts**

---

### 0.22 — Statistical Process Control Layer (NEW — Scrutiny Pass 12, 2026-04-15)
**Goal:** Real-time SPC with proper statistical foundations. Detect process drift, capability loss, and special causes using rigorous statistical tests.

#### Units
| Unit | Artifact | Statistical Method | Purpose |
|------|----------|-------------------|---------|
| U-SPC1 | `WesternElectricRulesEngine.ts` | Control chart rules | Detect non-random patterns (8 rules) |
| U-SPC2 | `CUSUMEngine.ts` | Cumulative sum | Detect small persistent shifts |
| U-SPC3 | `EWMAEngine.ts` | Exponentially weighted MA | Smooth detection of trends |
| U-SPC4 | `ProcessCapabilityEngine.ts` | Cp, Cpk, Pp, Ppk | Capability with confidence intervals |
| U-SPC5 | `MeasurementSystemAnalysisEngine.ts` | Gage R&R, linearity | Validate measurement system |
| U-SPC6 | `MultivariateSPCEngine.ts` | Hotelling T², MEWMA | Multivariate process monitoring |
| U-SPC7 | `ChangePointDetectionEngine.ts` | PELT, Bayesian changepoint | Detect parameter changes |
| U-SPC8 | `SamplingPlanEngine.ts` | MIL-STD-1916, AOQL | Acceptance sampling |

#### New Skills
| Skill | Purpose |
|-------|---------|
| `/spc-monitor <process>` | Real-time SPC monitoring |
| `/capability <feature>` | Calculate Cpk with CI |
| `/changepoint <data>` | Detect process changes |

#### Exit Gates
- Western Electric rules correctly flag 95% of simulated special causes
- CUSUM detects 1σ shift within 10 samples
- Process capability confidence intervals statistically valid

**Artifact count delta:** +8 engines + 3 skills = **~11 artifacts**

---

### 0.23 — Maximum Asset Utilization Layer (NEW — Scrutiny Pass 12, 2026-04-15)
**Goal:** Ensure every existing engine, algorithm, formula, registry, database, and knowledge source is properly wired into the AGI infrastructure. No orphans. No underutilized assets. Everything contributes.

**Reference:** See `H:/prism/PRISM-INVENTORY-2026-04-15.md` for complete asset inventory.

**Current State:**
| Asset Type | Count | Current Utilization |
|------------|-------|---------------------|
| Engines | 1,869 | ~30% wired |
| Formulas | 509 | ~20% referenced |
| Algorithms | 53 | ~40% referenced |
| Toolpath Strategies | 698 | NOT in plan |
| Materials DB | 6,372 | NOT in plan |
| Tools DB | 95,608 | NOT in plan |
| Machines DB | 910 | NOT in plan |
| Tribal Tips | 4,493 | Partial |
| MIT Courses | 225 | 9 of 225 |
| JM DIE Programs | 36,929 | Training only |

#### Units
| Unit | Artifact | Utilizes | Purpose |
|------|----------|----------|---------|
| U-UTL1 | `EngineUtilizationAuditorEngine.ts` | 1,869 engines | Map every engine to dispatcher/skill/hook/test. Flag orphans |
| U-UTL2 | `FormulaIntegrationEngine.ts` | 509 formulas | Wire ALL formulas to Bayesian/Formal/Symbolic engines |
| U-UTL3 | `AlgorithmOrchestratorEngine.ts` | 53 algorithms | Unified interface: any engine can call any algorithm |
| U-UTL4 | `ToolpathStrategyRouterEngine.ts` | 698 strategies | Wire to CompositionalSynthesis, CausalReasoning |
| U-UTL5 | `MaterialDatabaseBridgeEngine.ts` | 6,372 materials | Wire to Bayesian, LocalEmbedding, SymbolicRegression |
| U-UTL6 | `ToolDatabaseBridgeEngine.ts` | 95,608 tools | Wire to Qdrant, OutcomeTracking, SymbolicRegression |
| U-UTL7 | `MachineCapabilityIndexEngine.ts` | 910 machines | Wire to ComplexityRouter, GameTheoretic, OptimalControl |
| U-UTL8 | `TribalKnowledgeMaximizerEngine.ts` | 4,493 tips | Wire to AbstractionHierarchy, CausalDiscovery |
| U-UTL9 | `MITCourseFullIntegrationEngine.ts` | 225 courses | Expand from 9 to ALL 225 courses |
| U-UTL10 | `JMDieProgramLearningEngine.ts` | 36,929 programs | Wire to LoRA pipeline, OutcomeTracking, SymbolicRegression |
| U-UTL11 | `VideoKnowledgeIntegrationEngine.ts` | 69 transcripts | Wire to QdrantMemory, AbstractionHierarchy |
| U-UTL12 | `PostProcessorUnificationEngine.ts` | 20 post processors | Wire to FormalGCodeSemantics, TransferLearning |
| U-UTL13 | `RegistryFederationEngine.ts` | 24 registries | Unified query across ALL registries |
| U-UTL14 | `SkillGapAnalyzerEngine.ts` | 66 skills | Map every skill to engine/dispatcher/hook |
| U-UTL15 | `HookCoverageMaximizerEngine.ts` | 227 hooks | Ensure every CRITICAL file has hook |

#### Database Integration Targets
| Database | Records | Integration |
|----------|---------|-------------|
| Materials | 6,372 | BayesianInference (distributions), CausalDiscovery (relationships), LocalEmbedding (search) |
| Tools | 95,608 | QdrantMemory (embeddings), OutcomeTracking (performance), ActiveLearning (test next) |
| Machines | 910 | ComplexityRouter (capabilities), GameTheoretic (scheduling), OptimalControl (MPC) |
| Strategies | 698 | CompositionalSynthesis (combine), CausalReasoning (why), TransferLearning (analogies) |

#### New Skills
| Skill | Purpose |
|-------|---------|
| `/utilization-audit` | Run full asset utilization audit |
| `/orphan-report` | Show orphaned assets |
| `/asset-wiring <asset>` | Show how asset is wired |
| `/wire-asset <asset>` | Wire orphan to infrastructure |
| `/strategy-search <query>` | Search all 698 strategies |

#### Exit Gates
- `EngineUtilizationAuditorEngine.audit()` reports <5% orphan engines (vs ~70% now)
- Every algorithm has ≥1 integration with Phase 0.18-0.22 engines
- Every formula has verification coverage OR explicit exemption
- ALL 225 MIT courses mapped
- 36,929 JM DIE programs in LoRA pipeline
- Materials/Tools/Machines queryable via semantic search <100ms

**Artifact count delta:** +15 engines + 5 skills = **~25 artifacts**

---

### 0.24 — Cross-Asset Intelligence Wiring (NEW — Scrutiny Pass 12, 2026-04-15)
**Goal:** Not just individual asset utilization, but CROSS-ASSET intelligence. The system automatically leverages multiple assets together.

#### Units
| Unit | Artifact | Purpose |
|------|----------|---------|
| U-WIRE1 | `MultiAssetReasoningEngine.ts` | Given query, identify ALL relevant: engines, formulas, algorithms, tips, tools, materials |
| U-WIRE2 | `AssetDependencyGraphEngine.ts` | Complete dependency graph: which assets use which |
| U-WIRE3 | `AutomaticPipelineComposerEngine.ts` | Given goal, compose pipeline from available assets |
| U-WIRE4 | `CrossRegistryJoinEngine.ts` | SQL-like joins across registries (material→tool→strategy→machine) |
| U-WIRE5 | `IntelligenceAmplificationEngine.ts` | Combine: formula + algorithm + tribal tip + ML prediction |
| U-WIRE6 | `AssetRecommendationEngine.ts` | For any task: top-5 engines, top-3 algorithms, top-10 tips |
| U-WIRE7 | `UnusedAssetSurfacerEngine.ts` | Proactively surface underutilized assets that could help |
| U-WIRE8 | `AssetSynergyDetectorEngine.ts` | Find asset combinations that work better together |

#### Cross-Wiring Matrix
| When Using | Also Wire To | Why |
|------------|--------------|-----|
| KienzleForceModel | ToolDatabaseBridge | Real tool geometry |
| | MaterialDatabaseBridge | Real material kc1.1 |
| | OutcomeTrackingEngine | Calibrate from cuts |
| | BayesianInferenceEngine | Uncertainty |
| StabilityLobeDiagram | MachineCapabilityIndex | Machine dynamics |
| | ToolDatabaseBridge | Tool FRF |
| | FFTAnalyzer | Real vibration |
| SpeedFeedOrchestrator | All 509 formulas | Full physics |
| | All 53 algorithms | Optimization |
| | All 95,608 tools | Tool-specific |
| | All 6,372 materials | Material-specific |
| | All 4,493 tips | Experience |

#### New Skills
| Skill | Purpose |
|-------|---------|
| `/multi-asset <query>` | Find all relevant assets for query |
| `/compose-pipeline <goal>` | Auto-compose asset pipeline |
| `/cross-join <registries>` | Join across registries |

#### Exit Gates
- `MultiAssetReasoningEngine.query()` returns assets from ≥3 categories
- `AutomaticPipelineComposerEngine.compose()` builds valid pipeline for test goals
- `AssetSynergyDetectorEngine.detect()` finds ≥10 synergistic pairs

**Artifact count delta:** +8 engines + 3 skills = **~12 artifacts**

---

### 0.25 — Final Gaps Resolution Layer (NEW — 10-Agent Final Scrutiny, 2026-04-15)
**Goal:** Address all critical and medium gaps identified by 10-agent parallel scrutiny: AGI safety containment, missing physics domains, mathematical foundations depth, performance bottlenecks, infrastructure resilience, and UX accessibility.

#### 0.25.1 — AGI Safety Containment (CRITICAL — Blocker)
**Gap:** AutonomousGoalSynthesisEngine and SelfModificationProposalEngine have NO safety guardrails.

| Unit | Artifact | Purpose |
|------|----------|---------|
| U-SAFE1 | `AGISafetyContainmentEngine.ts` | Validate all synthesized goals against safety constraints before execution |
| U-SAFE2 | `GoalStabilityVerifierEngine.ts` | Detect goal drift, value drift, instrumental convergence |
| U-SAFE3 | `CorrigibilityGateEngine.ts` | Ensure system remains interruptible; human override always works |
| U-SAFE4 | `SelfModificationApprovalEngine.ts` | ALL architecture proposals require explicit human approval |
| U-SAFE5 | `hook_agi_safety_gate` | PreTool block on any goal/modification without safety clearance |

**Exit Gate:** No autonomous goal or self-modification executes without human approval. Kill switch verified functional.

#### 0.25.2 — Missing Physics Domains
**Gap:** Tribology, fatigue, fracture mechanics absent. Only 15 of 509 formulas validated.

| Unit | Artifact | Purpose |
|------|----------|---------|
| U-PHYS1 | `TribologyEngine.ts` | Friction coefficients, Stribeck curve, lubricant film (Hamrock-Dowson) |
| U-PHYS2 | `FatigueLifePredictionEngine.ts` | Basquin curve, Coffin-Manson, Miner's rule |
| U-PHYS3 | `FractureMechanicsEngine.ts` | Stress intensity K_IC, Paris law crack propagation |
| U-PHYS4 | `FormulaValidationMatrixEngine.ts` | Map ALL 509 formulas to constants.ts or literature reference |
| U-PHYS5 | `FormalPropertyCatalogEngine.ts` | Define Z3-provable properties: collision-free, bounds-respected, no rapid-into-material |

**Exit Gate:** 509 formulas have validation matrix. Z3 has ≥20 formal G-code properties defined.

#### 0.25.3 — Mathematical Foundations Depth
**Gap:** Missing do-calculus, LTL/CTL, Pontryagin, complete Bayesian suite.

| Unit | Artifact | Purpose |
|------|----------|---------|
| U-MATH-B1 | `DoCalculusEngine.ts` | Interventional reasoning: do(X), ID algorithm, front/back-door |
| U-MATH-B2 | `TemporalLogicVerifierEngine.ts` | LTL/CTL model checking for G-code sequences |
| U-MATH-B3 | `PontryaginPrincipleEngine.ts` | Continuous-time optimal control, costate equations |
| U-MATH-B4 | `AdvancedBayesianEngine.ts` | Gibbs sampling, HMC, hierarchical models, prior elicitation |
| U-MATH-B5 | `FisherInformationEngine.ts` | Fisher info, max entropy, KL divergence |
| U-MATH-B6 | `ChernoffBoundsEngine.ts` | Multiplicative Chernoff, matrix concentration |

**Exit Gate:** do-calculus implements back-door criterion. LTL verifies G-code sequence properties.

#### 0.25.4 — Performance Bottleneck Mitigation
**Gap:** PreTool 50ms unrealistic. Causal discovery intractable. SMT timeouts.

| Unit | Artifact | Purpose |
|------|----------|---------|
| U-PERF1 | `LazyAwarenessLoaderEngine.ts` | Defer non-critical awareness to first-use, not SessionStart |
| U-PERF2 | `AsyncSemanticSimilarityEngine.ts` | Move MiniLM inference to background PostTool, not blocking PreTool |
| U-PERF3 | `SampledCausalDiscoveryEngine.ts` | Constrain PC/FCI to sampled subgraphs (<1000 nodes) |
| U-PERF4 | `SMTTimeoutFallbackEngine.ts` | 5s timeout with graceful degradation to heuristic verification |
| U-PERF5 | `IncrementalLoRATrainingEngine.ts` | Nightly batches of 100 programs, not all 36,929 at once |
| U-PERF6 | `MemoryPressureMonitorEngine.ts` | Auto-compact ledgers when memory exceeds threshold |

**Exit Gate:** PreTool p99 <50ms verified. Causal discovery completes on sampled graph <10s.

#### 0.25.5 — Infrastructure Resilience
**Gap:** No backups, no Docker compose, no monitoring, H: drive SPOF.

| Unit | Artifact | Purpose |
|------|----------|---------|
| U-INFRA1 | `docker-compose.yml` | Ollama + Qdrant with GPU passthrough, volumes, health checks, restart policies |
| U-INFRA2 | `BackupStrategyEngine.ts` + `scripts/nightly-backup.sh` | Snapshot state/, Qdrant, registries nightly |
| U-INFRA3 | `SyncIntegrityEngine.ts` | rsync/rclone H: drive sync with checksums, conflict resolution |
| U-INFRA4 | `AlertingWebhookEngine.ts` | Discord/PagerDuty webhook on perf budget violations |
| U-INFRA5 | `TransactionTimeoutWatchdogEngine.ts` | Kill stuck transactions after 5 minutes |
| U-INFRA6 | `SchemaMigrationRunnerEngine.ts` | Run migrations on schema version bump |
| U-INFRA7 | `BootstrapRecoveryProcedure.md` | Manual recovery if bootstrap fails mid-way |

**Exit Gate:** Nightly backup runs. Docker compose deploys with single command. Alerting fires on test violation.

#### 0.25.6 — UX Accessibility
**Gap:** No progressive disclosure, errors not actionable, no onboarding.

| Unit | Artifact | Purpose |
|------|----------|---------|
| U-UX1 | `SkillTierRegistryEngine.ts` | Classify skills: Essential (10), Intermediate (30), Advanced (rest) |
| U-UX2 | `ActionableErrorTemplateEngine.ts` | All blocking hooks emit "Try instead: X" with specific alternative |
| U-UX3 | `ModelAttributionEngine.ts` | Badge responses with which model (local/Claude) answered |
| U-UX4 | `/help-me-start` skill | First-time user onboarding wizard |
| U-UX5 | `/commands [category]` skill | Browse skills by domain |
| U-UX6 | `/guided-<skill>` pattern | Wizard-style flow for complex operations |

**Exit Gate:** `/help-me-start` returns personalized onboarding. All hook errors include actionable alternative.

#### 0.25.7 — Asset Utilization Fixes
**Gap:** 215 MIT courses unplanned. Qdrant capacity unbudgeted. LoRA binary format gap.

| Unit | Artifact | Purpose |
|------|----------|---------|
| U-FIX1 | `MITCourseRelevanceFilterEngine.ts` | Filter 225→30 manufacturing-relevant courses; exempt rest |
| U-FIX2 | `QdrantCapacityPlannerEngine.ts` | Pre-flight: 95,608 × dim × 4 bytes; gate ingestion on disk check |
| U-FIX3 | `BinaryProgramConverterEngine.ts` | Convert .mcx-8, .MCX to text before LoRA ingestion |
| U-FIX4 | `FormulaExemptionCapEngine.ts` | Max 10% formulas exempt from verification (≤51 of 509) |
| U-FIX5 | `TipAbstractionScalerEngine.ts` | Raise hierarchy target from 50→500 entries (top 10% tips) |

**Exit Gate:** MIT courses capped at 30 relevant. Qdrant capacity verified before ingestion. Binary conversion works.

#### 0.25.8 — Testing Completeness
**Gap:** No test mandate for new engines. No cross-phase integration tests.

| Unit | Artifact | Purpose |
|------|----------|---------|
| U-TEST1 | `ForgeHexEngine.ts` | Extend forge-quint to forge-hex: 6th file = `*.test.ts` mandatory |
| U-TEST2 | `CrossPhaseIntegrationTestSuite.ts` | Integration tests spanning Phases 0.13→0.24 data flows |
| U-TEST3 | `ChaosEngineeringFrameworkEngine.ts` | Systematic fault injection for all 429 engines |
| U-TEST4 | `PhysicsValidationDatasetEngine.ts` | Measured ground truth for cutting force, thermal, surface finish |
| U-TEST5 | `LoRAStatisticalValidationEngine.ts` | A/B testing with statistical significance threshold |

**Exit Gate:** All new engines ship with test file. Cross-phase integration suite passes. Chaos tests pass.

#### 0.25.9 — Additive Manufacturing Family
**Gap:** Additive/3D printing missing from 6 machine families.

| Unit | Artifact | Purpose |
|------|----------|---------|
| U-ADD1 | `/additive-studio` skill | 7th machine family: FDM, SLA, SLS, DMLS, binder jetting |
| U-ADD2 | `/additive-validate` skill | Validate additive parameters |
| U-ADD3 | `/additive-optimize` skill | Optimize print orientation, supports, infill |
| U-ADD4 | `AdditivePostProcessingEngine.ts` | Support removal, heat treatment, surface finishing |

**Exit Gate:** `/additive-studio` generates valid G-code for FDM/SLA. Post-processing workflow complete.

#### 0.25.10 — Live Machine Data
**Gap:** MTConnect/OPC-UA not wired. "Continuous learning from outcomes" requires live data.

| Unit | Artifact | Purpose |
|------|----------|---------|
| U-LIVE1 | `MTConnectClientEngine.ts` | Subscribe to MTConnect agent for live spindle/feed/position |
| U-LIVE2 | `OPCUAClientEngine.ts` | OPC-UA client for Siemens/Fanuc/Haas controllers |
| U-LIVE3 | `LiveOutcomeCorrelatorEngine.ts` | Correlate live sensor data with program outcomes |
| U-LIVE4 | `MachineDigitalTwinBridgeEngine.ts` | Wire live data to existing DigitalTwinEngine |

**Exit Gate:** MTConnect receives live data from ≥1 machine (or simulator). Outcomes correlated with sensor traces.

#### Summary
| Sub-Phase | Artifacts |
|-----------|-----------|
| 0.25.1 AGI Safety | ~7 |
| 0.25.2 Physics | ~6 |
| 0.25.3 Math Depth | ~7 |
| 0.25.4 Performance | ~7 |
| 0.25.5 Infrastructure | ~8 |
| 0.25.6 UX | ~8 |
| 0.25.7 Asset Fixes | ~6 |
| 0.25.8 Testing | ~6 |
| 0.25.9 Additive | ~5 |
| 0.25.10 Live Data | ~5 |
| **0.25 Total** | **~65** |

---

### 0.11 — Phase 0 Exit Gate (consolidated)
- `mustCheckBeforeCreating` has ≥10 call sites across hook handlers (grep-verified)
- Awareness self-test canary passes (duplicate blocked + rolled back)
- `proper-lockfile` verified on all registry writes
- 6 awareness engines + 10 reverse indexes + 22 query methods shipped
- SemanticSimilarityGuardEngine detects "MillOptimizer" ≡ "MillProgramOptimizerEngine" at cosine >0.85
- `scripts/verify-full-wiring.ts` reports 0 orphans across all 59 touchpoints
- `AwarenessQueryEngine.impactAnalysis()` returns <100ms p99 (proof sheet grounded in 6.006)
- Both Claude (.ts) and Codex (.py) hook variants ship for every Tier 5 hook
- `dispatcher-action-wirer.mjs` successfully wires a test engine to a test dispatcher atomically
- **All 9 core MIT courses ingested** and cross-referenced in Phase 0 engine JSDoc (U-MIT01..U-MIT09)
- **Consistency model declared** for U-AWR25 (citing 6.824)
- **Embedding model chosen + calibrated** for SemanticSimilarityGuardEngine (citing 6.S191)
- **AGI Parity Test passes** on any freshly-spawned session (5/5 canary checkpoints — Phase 0.13)
- **Every session boots at awareness ≥ 0.80 within 10 seconds** (measured across 10 cold boots)
- **`SESSION_HANDOFF_v2.json` round-trip verified** (Session B cites A's insights)
- **Metacognition canary passes** (forced-confusion session auto-invokes `/navigate` or `/dedup`)
- **SVI live-injection verified** — 10 random prompts all contain `Ψ=X%` line in context (Phase 0.14)
- **SVI PreTool projection verified** — canary new-engine write emits Ψ-delta badge (Phase 0.14)
- **SVI milestone gate verified** — net-zero commit without justification is BLOCKED (Phase 0.14)
- **`/svi-rank` returns ≥10 ranked backlog units** by Ψ delta / hour (Phase 0.14)
- **Ψ trend increasing** — 7-day moving average of Ψ is non-negative throughout Phase 0 rollout
- **Auto-doc propagation verified** (Phase 0.15) — canary new engine triggers regen of `CLAUDE.md`, `MEMORY.md`, `MASTER_INDEX_COMPACT.md`, `PRISM-SELF-AWARENESS-DIRECTIVE.md`, `PRISM-COMMANDS-MANIFEST.md` within 60s
- **Managed-block hand-edit is BLOCKED** — canary hand-edit inside `AUTO-REFRESHED` block rejected by PreTool hook
- **`scripts/verify-doc-freshness.ts` reports 0 drift** across all 17 documentation surfaces
- **Bootstrap paradox resolved** (Phase 0.16) — cold-clone boot with `BOOTSTRAP_MODE.flag` completes in <60s; flag auto-removed after this exit gate
- **Retrofit complete** (Phase 0.16) — all 1,660+ existing engines + 4,296 actions + 84 dispatchers back-filled into registries/indexes within ±1% of live counts
- **Perf budgets enforced** (Phase 0.16) — SessionStart ≤2s warm / ≤5s cold p99; PostTool ≤200ms p99; PreTool ≤50ms p99, measured across 100 boots
- **Transactional rollback verified** (Phase 0.16) — injected mid-transaction kill cleanly reverses via `TransactionLogEngine`; no torn state on disk
- **Hook ordering deterministic** (Phase 0.16) — `HOOK_ORDER_REGISTRY.json` topological sort stable across 100 runs
- **Correlation canary** (Phase 0.16) — one user prompt produces ledger entries in DOC_CHANGE, SVI_DELTA, SESSION_INSIGHTS all sharing same `correlationId`
- **3-band semantic gate** (Phase 0.16) — distinguishes "MillOptimizer" vs "MillProgramOptimizerEngine" (red) from "MillOptimizer" vs "LatheOptimizer" (green)
- **CRITICAL-file guard** (Phase 0.16) — edits to Kienzle/Taylor/S(x) files require `--confirm-critical`; audit-logged
- **Awareness regression suite** (Phase 0.16) — 30/30 tests pass, included in CI
- **claude-flow MCP registered** (Phase 0.17) — `.mcp.json` includes claude-flow; `mcp__claude-flow__swarm_init` callable
- **AgentRegistryEngine populated** (Phase 0.17) — ≥100 agents with triggers + examples
- **Recommender surfaces agent matches** (Phase 0.17) — `/aware` output shows top-3 relevant agents for current prompt
- **Autonomous goal synthesis active** (Phase 0.18) — `AutonomousGoalSynthesisEngine.propose()` returns ≥3 goals on any fresh session
- **Causal reasoning active** (Phase 0.18) — `CausalReasoningEngine.traceImpact()` returns ≥10-node graph in <500ms
- **Transfer learning active** (Phase 0.18) — `TransferLearningBridgeEngine.findAnalogies()` returns ≥1 cross-domain match
- **Predictive simulation active** (Phase 0.18) — canary write correctly predicts >80% of test outcomes
- **Abstraction hierarchy populated** (Phase 0.18) — ≥3 levels, ≥50 entries
- **AGI Parity Test v2 passes** (Phase 0.18) — 8/8 checks pass (original 5 + 3 new: goal synthesis, causal explanation, cross-domain analogy)
- **Peer learning channel active** (Phase 0.18) — Session A insight appears in Session B boot within 60s
- **Temporal projection available** (Phase 0.18) — `/trend psi` returns 30-day history + projection
- **Compositional synthesis works** (Phase 0.18) — `/synthesize "optimize roughing"` returns ≥2 valid compositions
- **Curiosity queue populated** (Phase 0.18) — `/curiosity-queue` returns ≥5 exploration targets on fresh session
- **Local LLM operational** (Phase 0.19) — Ollama responds <2s on both 4080 and 3080
- **LoRA training functional** (Phase 0.19) — adapter trained on ≥100 programs shows improvement
- **Qdrant memory active** (Phase 0.19) — stores ≥10K embeddings, retrieves <100ms
- **Outcome tracking active** (Phase 0.19) — ≥50 labeled outcomes collected
- **Model routing works** (Phase 0.19) — simple→local, complex→Claude routing verified
- **Memory sync works** (Phase 0.19) — home↔work sync via H: drive <5min
- **Bayesian inference active** (Phase 0.20) — `BayesianInferenceEngine.posterior()` returns calibrated distribution
- **Formal verification active** (Phase 0.20) — `FormalVerificationEngine.prove()` returns SAT/UNSAT in <10s
- **Causal discovery active** (Phase 0.20) — `CausalDiscoveryEngine.discover()` produces DAG from ≥100 outcomes
- **Complexity routing active** (Phase 0.20) — correctly identifies NP-hard in 90% of test cases
- **Symbolic regression active** (Phase 0.20) — recovers Kienzle formula from synthetic data
- **Scientific simulation active** (Phase 0.21) — cutting force within 15% of measured, thermal within 0.01mm
- **SPC active** (Phase 0.22) — Western Electric rules flag 95% of simulated special causes
- **Asset utilization audit** (Phase 0.23) — <5% orphan engines (vs ~70% current)
- **All 225 MIT courses mapped** (Phase 0.23) — not just 9
- **All 509 formulas verified** (Phase 0.23) — verification coverage or explicit exemption
- **All 53 algorithms unified** (Phase 0.23) — single API for any engine to call any algorithm
- **All databases searchable** (Phase 0.23) — 6,372 materials + 95,608 tools + 910 machines via semantic search <100ms
- **36,929 JM DIE programs in LoRA pipeline** (Phase 0.23)
- **Multi-asset reasoning active** (Phase 0.24) — queries return assets from ≥3 categories
- **Pipeline composition active** (Phase 0.24) — auto-composes valid pipeline for test goals
- **Asset synergy detection active** (Phase 0.24) — finds ≥10 synergistic pairs
- **Delegation dogfood** (Phase 0.17) — Phase 0 buildout itself logged ≥5 distinct non-general-purpose agent invocations
- **`/pr-swarm` canary** (Phase 0.17) — one PR review produced ≥3 parallel agent reports aggregated into one

**Without Phases 0.1-0.24, Phases 1-4 build on a broken foundation: orphans ship, sessions drift, documentation rots, boots deadlock, ~100,000 existing assets remain unwired, 175 slash commands stay unused, reasoning lacks proofs, uncertainty lacks Bayesian grounding, physics lacks simulation, SPC lacks rigor, and the system can't compose its own knowledge into novel solutions.**

---

## Tier 0 — Session Lifecycle Stop-Hooks (BUILD AFTER PHASE 0)

These guarantee no work is lost across session boundaries and no duplicate work begins.

| Hook | Fires | Purpose | Artifact |
|------|-------|---------|----------|
| `SessionStart` | New session begins | Boot context, reap zombies, auto-detect family (Claude/Codex), verify no orphan claims, load `AwarenessQueryEngine` cache, subscribe to `CrossTerminalBroadcastEngine` | `src/hooks/stop/session_start.ts` |
| `SessionStart:compact` | After `/compact` | Restore from compaction survival, verify registry checksum matches SESSION_ARTIFACTS, rebuild awareness cache on mismatch | `src/hooks/stop/session_start_compact.ts` |
| `PreCompact` | Before `/compact` | Flush SESSION_ARTIFACTS.json, checkpoint claims, save extraction-log deltas, **hash registry + MASTER_INDEX_COMPACT into SESSION_ARTIFACTS** | `src/hooks/stop/pre_compact.ts` |
| `Stop` / `SessionEnd` | Graceful exit | Release all claims, drop heartbeat, prompt-commit uncommitted, emit checkpoint | `src/hooks/stop/session_end.ts` |
| `UserPromptSubmit` | Before each user turn | Inject claims + cross-terminal registry + cadence reminders + awareness delta since last turn | `src/hooks/stop/user_prompt_submit.ts` |
| `PostTool` | After every tool call | Auto-cadence counter, S(x) gate, **awareness-staleness check every N=20 calls** | `src/hooks/stop/post_tool.ts` |
| `PreTool` | Before every tool call | Claim verification, lock acquisition, **asset-type classification + dedup pre-check (blocks write on duplicate)** | `src/hooks/stop/pre_tool.ts` |
| `hook_post_write_sync_awareness` | PostTool Write\|Edit (NEW) | **Classify asset type from path → append to registry with proper-lockfile CAS → update MASTER_INDEX_COMPACT → broadcast via AGENT_CHAT.md. HARD-BLOCK: if sync fails, rollback the file write.** | `src/hooks/stop/post_write_sync_awareness.ts` |
| `hook_pre_tool_awareness_refresh` | PreTool (NEW) | If `CrossTerminalBroadcastEngine` signaled change, invalidate cache + re-inject before Write is allowed | `src/hooks/stop/pre_tool_awareness_refresh.ts` |

**Requires U-AWR25 (cross-terminal coordination) to land first** — these hooks assume atomic CAS + relative-TTL heartbeat + zombie reaper are available.

---

## Tier 1 — Per-Machine-Family Skills (30 total, 5 per family × 6 families)

Each family ships with a studio + validate + optimize + learn + harden skill. Each pair-bonded with a forge-triple (hook + action).

| Family | Skills | Existing? |
|--------|--------|-----------|
| **Lathe** | `/lathe-studio` `/lathe-validate` `/lathe-optimize` `/lathe-learn` `/lathe-harden` | /lathe-studio ✅ |
| **Mill** | `/mill-studio` `/mill-validate` `/mill-optimize` `/mill-learn` `/mill-harden` | — |
| **Wire EDM** | `/wire-edm-studio` `/wedm-validate` `/wedm-optimize` `/wedm-learn` `/wedm-harden` | /wire-edm-studio ✅ |
| **Sinker EDM** | `/sinker-studio` `/sinker-validate` `/sinker-optimize` `/sinker-learn` `/sinker-harden` | — |
| **Grinder** | `/grinder-studio` `/grinder-validate` `/grinder-optimize` `/grinder-learn` `/grinder-harden` | — |
| **Welder** | `/welder-studio` `/welder-validate` `/welder-optimize` `/welder-learn` `/welder-harden` | — |

---

## Tier 2 — Universal Workflow Skills (20)

| Skill | Purpose |
|-------|---------|
| `/program-generate` | Dispatch to family-specific generator |
| `/program-validate` | Universal G-code validator |
| `/program-optimize` | Universal program optimizer (exists for some families) |
| `/program-simulate` | NC simulation wrapper |
| `/quote` | Quote generation |
| `/estimate` | Time + cost estimate |
| `/schedule` | Job scheduling |
| `/ship` | Ship checklist |
| `/learn` | Router → /pdf-learn, /video-learn, /cad-learn, /excel-learn, /machine-log-learn |
| `/extract-dark-content` | Auto-scan H: for unextracted files |
| `/sync-terminals` | Force cross-terminal coordination refresh |
| `/reap-zombies` | Kill dead claims from crashed sessions |
| `/awareness-check` | Run awareness-score.ts, report per-dimension |
| `/forge-triple` ✅ | Create engine + hook + action atomically |
| `/dedup` ✅ | Check before creating |
| `/trace` ✅ | Trace call path through engines |
| `/navigate` ✅ | Zero-IO file location |
| `/digest-all` ✅ | System map load |
| `/code-index` | DSL shortcode resolver |
| `/physics-verify` ✅ | S(x) score + coefficient validation |

---

## Tier 3 — Per-Domain Skills (30)

| Domain | Skills |
|--------|--------|
| CAD | `/cad-review` `/cad-extract` `/cad-tolerance-check` `/cad-feature-recognize` `/cad-dfm` |
| CAM | `/cam-strategy` `/cam-post-lint` `/cam-toolpath-check` `/cam-fixture` `/cam-workholding` |
| Shop | `/shop-floor-query` `/shop-setup` `/shop-safety-check` `/shop-knowledge` ✅ `/shop-quote` |
| Post | `/post-validate` `/post-harden` ✅ `/post-generate` `/post-register` `/post-diff` |
| Quality | `/gdnt-check` `/cmm-parse` `/cpk-calc` `/tolerance-stack` `/spc` |
| Business | `/quote-to-ship` ✅ `/job-cost` `/capacity-plan` `/erp-sync` `/ship-confirm` |

---

## Tier 4 — Per-Dispatcher Health Scripts (84)

One TypeScript script per dispatcher. Each script:
1. Enumerates all actions via `listActions()`
2. Runs smoke test on each (with canonical input)
3. Reports coverage gaps (actions without tests / docs / skills)
4. Emits JSON report to `mcp-server/data/dispatcher-health/<name>-health.json`

Template path: `mcp-server/scripts/dispatcher-<name>-health.ts`

Driver script: `mcp-server/scripts/dispatcher-health-all.ts` — runs all 84 in parallel, emits aggregate report.

---

## Tier 5 — Validation Hooks (53) — DATA INTEGRITY

### 5A — Dedup Hooks (13 asset types — ALL PreTool BLOCKING)
| Hook | Asset | Count | Risk | Artifact |
|------|-------|-------|------|----------|
| `hook_no_duplicate_engine` | Engines | 1,660+ | SEVERE | `src/hooks/validation/dedup_engine.ts` |
| `hook_no_duplicate_hook` | Hooks | 112 | MEDIUM | `src/hooks/validation/dedup_hook.ts` |
| `hook_no_duplicate_skill` | Skills | 61→140 | MEDIUM | `src/hooks/validation/dedup_skill.ts` |
| `hook_no_duplicate_action` | Actions | 4,296 | SEVERE | `src/hooks/validation/dedup_action.ts` |
| `hook_no_duplicate_script` | Scripts | 48→100 | HIGH | `src/hooks/validation/dedup_script.ts` |
| `hook_no_duplicate_formula` | Formulas | 39→400 | SEVERE | `src/hooks/validation/dedup_formula.ts` |
| `hook_no_duplicate_algorithm` | Algorithms | 17 | MEDIUM | `src/hooks/validation/dedup_algorithm.ts` |
| `hook_no_duplicate_tribal_tip` | Tribal tips | 3,700+ | **SEVERE** | `src/hooks/validation/dedup_tribal_tip.ts` |
| `hook_no_duplicate_playbook_rule` | Playbook rules | 296 | HIGH | `src/hooks/validation/dedup_playbook_rule.ts` |
| `hook_no_duplicate_dispatcher` | Dispatchers | 84 | LOW | `src/hooks/validation/dedup_dispatcher.ts` |
| `hook_no_duplicate_schema` | Zod schemas | ~500 | MEDIUM | `src/hooks/validation/dedup_schema.ts` |
| `hook_no_duplicate_test_describe` | Test describe blocks | ~600 | MEDIUM | `src/hooks/validation/dedup_test.ts` |
| `hook_no_root_md_without_registry` | Root MD docs | 100+ | HIGH | `src/hooks/validation/root_md_registry.ts` |
| `hook_no_duplicate_milestone_scope` | Roadmap milestones | 525 | HIGH | `src/hooks/validation/dedup_milestone.ts` |
| `hook_state_json_registration` | State data JSON | ~50 | MEDIUM | `src/hooks/validation/state_json_registration.ts` |
| `hook_plan_registration` | Plans | 101 | MEDIUM | `src/hooks/validation/plan_registration.ts` |

All 16 wired to `DuplicationGuardEngine.mustCheckBeforeCreating(type, ...)` + `SemanticSimilarityGuardEngine.cosineCheck()` as 2nd stage. Jaccard (Stage 1) catches exact/near-exact; embeddings (Stage 2) catch semantic. Both must clear.

### 5B — Extraction / Re-Extraction Guards
| Hook | Blocks when | Artifact |
|------|-------------|----------|
| `hook_no_re_extract` | Re-extracting source in extraction-log (with SHA256 content hash check) | `src/hooks/validation/no_re_extract.ts` |
| `hook_extraction_log_drift` | extraction-log entry references deleted/moved file | `src/hooks/validation/extraction_drift.ts` |
| `hook_allow_superseding` | Forced re-extract without `reasonCode` + `newSha256` | `src/hooks/validation/allow_superseding.ts` |

### 5C — Physics / Safety
| Hook | Blocks when | Artifact |
|------|-------------|----------|
| `hook_kienzle_coeff_check` | Editing Kienzle constants without physics-review-agent sign-off | `src/hooks/validation/kienzle_check.ts` |
| `hook_taylor_coeff_check` | Same for Taylor | `src/hooks/validation/taylor_check.ts` |
| `hook_sx_gate` | Safety score < 0.70 (HARD BLOCK) | `src/hooks/validation/sx_gate.ts` |
| `hook_canonical_constants` | Physics formula bypassing `src/physics/constants.ts` | `src/hooks/validation/canonical_constants.ts` |
| `hook_literature_citation` | Formula without literature reference comment | `src/hooks/validation/literature_citation.ts` |

### 5D — Process / Workflow
| Hook | Blocks when | Artifact |
|------|-------------|----------|
| `hook_omega_floor` | Commit when Omega < milestone floor | `src/hooks/validation/omega_floor.ts` |
| `hook_awareness_floor` (NEW) | Write\|Edit when `awarenessScoreEngine.current() < 0.80` | `src/hooks/validation/awareness_floor.ts` |
| `hook_claim_required` | Editing milestone files without active claim | `src/hooks/validation/claim_required.ts` |
| `hook_cross_terminal_conflict` | Two sessions editing same file | `src/hooks/validation/cross_terminal_conflict.ts` |
| `hook_forge_intent_claim` (NEW) | Starting forge-quint without ForgeIntentClaim in ACTIVE_WORK_REGISTRY | `src/hooks/validation/forge_intent_claim.ts` |
| `hook_schema_version_bump` | State JSON edit without schemaVersion bump | `src/hooks/validation/schema_version.ts` |
| `hook_schema_version_read` (NEW) | Reading JSON with schemaVersion N-2 or older | `src/hooks/validation/schema_version_read.ts` |
| `hook_test_legitimacy` | Placeholder-assertion tests | `src/hooks/validation/test_legitimacy.ts` |
| `hook_no_silent_catch` | Empty catch block in engines | `src/hooks/validation/no_silent_catch.ts` |
| `hook_dep_graph_impact` (NEW) | Edit to CRITICAL file without reviewing `impactedBy()` dependents | `src/hooks/validation/dep_graph_impact.ts` |

---

## Tier 6 — Fine-Grained Stop-Hooks (25)

| Hook | Prevents exit when | Artifact |
|------|--------------------|----------|
| `stop_on_uncommitted_critical` | Uncommitted changes to CRITICAL-classified files | `src/hooks/stop/uncommitted_critical.ts` |
| `stop_on_orphan_children` | Background agents still running | `src/hooks/stop/orphan_children.ts` |
| `stop_on_open_lock` | Any file lock held by this session | `src/hooks/stop/open_lock.ts` |
| `stop_on_open_claim` | Any claim held without completion record | `src/hooks/stop/open_claim.ts` |
| `stop_on_incomplete_pipeline` | Half-finished extraction/forge | `src/hooks/stop/incomplete_pipeline.ts` |
| `stop_on_dirty_registry` | Unflushed extraction-log / asset registry | `src/hooks/stop/dirty_registry.ts` |
| `stop_on_failing_tests` | Loop-scope tests failing | `src/hooks/stop/failing_tests.ts` |
| `stop_on_build_error` | Build has new TS errors from this session | `src/hooks/stop/build_error.ts` |
| `stop_on_sx_fail` | Any file touched has S(x) < 0.70 | `src/hooks/stop/sx_fail.ts` |
| *(16 more, see plan appendix)* | | |

---

## Build Sequence (5-Phase — Phase 0 added after scrutiny)

### Phase 0 — Awareness + Wiring Transactional Layer (Week 1-2) ⚠ HARDEST PREREQUISITE
**Depends on:** U-AWR25 cross-terminal coordination (atomic CAS, relative-TTL heartbeat, zombie reaper)

**0.1-0.5 (Awareness, from 1st scrutiny):**
- Fix enforcement root cause: promote dedup hooks from PostTool (advisory) → PreTool (blocking)
- Ship 6 awareness engines (+ReverseIndexEngine from 0.7)
- Wire `proper-lockfile` into `saveToCrossSessionRegistry` + `appendToExtractionLog`
- Wire `loadFormulas` + `loadAlgorithms` to live registry sources
- Ship 16 dedup hooks (Tier 5A) as PreTool BLOCKING
- Ship forge-quint + `hook_post_write_sync_awareness`

**0.6-0.10 (Wiring, from 2nd scrutiny):**
- Leverage existing: `gen-engine-exports.mjs`, `generate-master-index.mjs`, `regen-code-index.mjs`, `server.tool` proxy, `engine-duplication-blocker.mjs`
- Build: `dispatcher-action-wirer.mjs`, `regen-master-index-compact.mjs`, `verify-full-wiring.ts`
- Ship 7 auto-wiring hooks (Phase 0.6)
- Ship 10 reverse indexes + 22 AwarenessQueryEngine methods (Phase 0.7)
- Ship rename/delete/impact protocol + 3 skills (Phase 0.8)
- Ship 10 orphan-detection hooks (Phase 0.9)
- Ship Codex Python adapters for every hook (Phase 0.10)

**Consolidated Exit Gate:**
- `mustCheckBeforeCreating` ≥10 call sites (grep verifies)
- Awareness canary passes (duplicate blocked + rolled back)
- `proper-lockfile` on all registry writes
- 6 awareness engines + 10 reverse indexes + 22 query methods shipped
- SemanticSimilarityGuardEngine: "MillOptimizer" ≡ "MillProgramOptimizerEngine" at cosine >0.85
- All 16 Tier 5A dedup hooks operational as BLOCKING
- `AwarenessScoreEngine.current() >= 0.80` sustained
- `scripts/verify-full-wiring.ts` reports 0 orphans across 59 touchpoints
- `AwarenessQueryEngine.impactAnalysis()` <100ms p99
- `dispatcher-action-wirer.mjs` successfully wires a test engine atomically
- Both `.ts` and `.codex.py` hook variants ship for every Tier 5 hook

### Phase 1 — Session Lifecycle Foundation (Week 2)
- Tier 0 session-lifecycle stop-hooks (9 — includes 2 new from scrutiny)
- Tier 5B extraction guards (3)
- Tier 5C physics hooks (5)
- Tier 5D workflow hooks (10 — includes 4 new from scrutiny)

**Exit:** All sessions protected from lost work + duplicate creation + drift.

### Phase 2 — User Surface (Week 3)
- Tier 1 machine-family skills (30 — 24 new)
- Tier 2 universal workflow skills (20 — 13 new)

**Exit:** 50 skills shipped. User has consistent verbs across all machines/workflows.

### Phase 3 — Coverage (Week 4)
- Tier 3 per-domain skills (30 — 27 new)
- Tier 4 per-dispatcher scripts (84)

**Exit:** Every dispatcher has a health script. Every domain has 5 skills.

### Phase 4 — Depth + Retroactive Cleanup (Week 5)
- Tier 6 fine-grained stop-hooks (26)
- `scripts/detect-orphans.ts` — surfaces engines with no imports
- `scripts/awareness-self-test.ts` — periodic canary
- `scripts/h-drive-delta-scan.ts` — external change detection
- `scripts/extraction-log-reconcile.ts` — marks moved/renamed source files
- `/audit-duplicates` skill — retroactive surfacing of EXISTING duplicates
- Integration testing, doc, registration

**Exit:** Full ~269 artifacts. All registered. All tested. 0 regressions. Existing duplicates flagged for cleanup.

---

## Registration Pipeline (each artifact)

| Type | Registration |
|------|-------------|
| Skill | Auto-discovered from `~/.claude/commands/*.md` (no manual step) |
| Script | Add to `mcp-server/scripts/index.ts` manifest |
| Hook (validation) | Add to `mcp-server/src/hooks/registry.ts` with trigger spec |
| Stop-hook | Add to `state/shared/STOP_HOOK_REGISTRY.json` (new registry) |

---

## Forge-Triple Integration (MANDATORY)

Every new **engine** MUST ship with:
1. Protective validation hook (Tier 5)
2. MCP action (via dispatcher)
3. User-facing skill (Tier 1/2/3)

No engine commits without all 3. Extend existing `/forge-triple` to enforce via the new `hook_no_duplicate_engine` + post-forge verification step.

---

## Coordination Prerequisites (HARD DEPENDENCIES)

Before ANY Tier 0/5 hook lands:
- ✅ `proper-lockfile` atomic CAS (from U-AWR25)
- ✅ Relative-TTL heartbeat (from U-AWR25)
- ✅ Zombie reaper daemon (from U-AWR25)
- ✅ Deadlock detection (from U-AWR25)
- ✅ Monotonic ULID for claim IDs (from U-AWR25)
- ✅ Family auto-detect Claude/Codex (existing)

---

## Success Metrics (revised after scrutiny)

| Metric | Target | Measure |
|--------|--------|---------|
| `mustCheckBeforeCreating` call sites | ≥10 (was 0) | `grep -r "mustCheckBeforeCreating"` |
| Dedup coverage (asset types) | 13/13 at BLOCKING enforcement | audit per-hook |
| Semantic dedup accuracy | ≥90% on labeled duplicate pairs | eval set |
| Awareness score sustained | ≥0.80 across any 2-hour session | telemetry |
| Cross-terminal drift | <100ms between Terminal A create → Terminal B aware | broadcast log |
| Awareness query latency | <100ms p99 | `AwarenessQueryEngine` profiling |
| Skill coverage | 100% of machine families + 100% of workflow verbs | manual checklist |
| Hook coverage | 100% of CRITICAL-classified files guarded | audit pass |
| Stop-hook coverage | 0 lost-work incidents across 100 session ends | telemetry |
| Dispatcher health | 84/84 dispatchers passing smoke | automated |
| Cross-terminal safety | 0 duplicate-work incidents across concurrent sessions | coordination log |
| Orphan detection | <5 orphan engines on any SessionStart | `scripts/detect-orphans.ts` |
| Registry-vs-FS drift | 0 entries unbacked, 0 files unregistered | nightly reconcile |
| **Goal synthesis accuracy** | ≥80% of proposed goals are actionable | manual review of 20 proposals |
| **Causal trace speed** | <500ms for 10-node impact graph | `CausalReasoningEngine` profiling |
| **Transfer analogy hits** | ≥1 valid analogy for 80% of novel problems | canary test set |
| **Simulation accuracy** | >80% test outcome prediction | instrumented canary suite |
| **Abstraction coverage** | ≥50 entries across ≥3 levels | `AbstractionHierarchyEngine.stats()` |
| **Peer learning latency** | <60s from Session A insight → Session B awareness | coordination log |
| **Curiosity queue depth** | ≥5 non-trivial targets on fresh session | `/curiosity-queue` output |
| **AGI Parity v2 pass rate** | 8/8 checks pass across 20 random sessions | automated canary suite |
| **Local LLM latency** | <2s response on 4080, <3s on 3080 | `/model-status` profiling |
| **LoRA improvement** | ≥10% accuracy gain on domain questions | before/after eval |
| **Qdrant retrieval** | <100ms for 10K+ embeddings | benchmark |
| **Outcome collection rate** | ≥50 labeled outcomes in first 30 days | `data/outcomes/` count |
| **Model routing accuracy** | 95% correct simple/complex classification | sample audit |
| **Memory sync reliability** | 100% sync success rate home↔work | sync log |
| **Formal verification coverage** | 100% of safety-critical G-code properties provable | SMT solver |
| **Bayesian calibration error** | <5% calibration error | calibration test |
| **Causal discovery accuracy** | ≥80% DAG recovery on test data | ground truth comparison |
| **Symbolic regression recovery** | Recovers Kienzle formula from noisy data | synthetic benchmark |
| **Physics simulation accuracy** | Cutting force within 15% of measured | validation set |
| **SPC special cause detection** | 95% detection rate | Western Electric rules test |
| **Asset orphan rate** | <5% (down from ~70%) | `EngineUtilizationAuditorEngine.audit()` |
| **MIT course coverage** | 225/225 mapped (up from 9/225) | `MITCourseFullIntegrationEngine.coverage()` |
| **Database semantic search** | <100ms for 100K+ entries | benchmark |
| **Multi-asset query breadth** | ≥3 asset categories per query | sample audit |
| **Pipeline composition success** | Valid pipeline for 90% of test goals | canary suite |

---

## Next Immediate Actions (revised after 12th scrutiny)

### Prerequisite
0. **Plant `BOOTSTRAP_MODE.flag`** (Phase 0.16 U-OP1) — must exist BEFORE Phase 0.1 enforcement hooks go live, otherwise first-boot deadlocks. Flag downgrades dedup/awareness-≥0.80/SVI/managed-block gates to warn-only until Phase 0.11 exit gate passes.
1. **Land U-AWR25** (cross-terminal coordination) — ABSOLUTE PREREQUISITE
   - In parallel: **U-MIT01 (6.824 Distributed Systems)** + **U-MIT09 (18.06 Linear Algebra)** — grounds U-AWR25 consistency model in formal theory
   - Also in parallel: **SVI live-feed into session brief** (Phase 0.14) so work is SVI-maximizing from day one
   - Also in parallel: **U-OP2 HOOK_ORDER_REGISTRY** seeded so subsequent 0.1-0.15 hooks declare order at creation

### Phase 0 sequencing (~3-4 days each)
2. **0.1 Fix enforcement root cause** — Single `PreTool` Write-intercept hook calling `mustCheckBeforeCreating` before any file write lands. Eliminates honor-system.
3. **U-MIT03 + U-MIT04 + U-MIT02** — ingest 6.006, 6.S191/6.036, 6.830 BEFORE Phase 0.2/0.7 (choose embedding model; lock in big-O proof strategy; pick ACID/WAL pattern for reverse indexes).
4. **0.2 Ship 6 awareness engines** — AwarenessQueryEngine (22 methods, <100ms proof from 6.006), SemanticSimilarityGuardEngine (MiniLM from 6.S191), CrossTerminalBroadcastEngine, DependencyGraphEngine, TestCoverageIndexEngine, **ReverseIndexEngine**.
5. **0.3 Ship forge-quint** — replaces forge-triple with transactional atomicity.
6. **0.4 Wire `proper-lockfile`** into all registry writes (`saveToCrossSessionRegistry` + `appendToExtractionLog`).
7. **0.5 Un-hardcode** `loadFormulas` + `loadAlgorithms`.
8. **U-MIT05** — ingest 6.031 BEFORE Phase 0.6 (rep invariants + contract programming for auto-wiring hooks).
9. **0.6 Auto-wiring transactional closure** — build `dispatcher-action-wirer.mjs` + `regen-master-index-compact.mjs` + 7 auto-wiring hooks; leverage `gen-engine-exports.mjs`, `generate-master-index.mjs`, `regen-code-index.mjs`, `server.tool` proxy.
10. **0.7 Reverse index layer** — 10 new indexes (ACID/WAL from 6.830) + 18 new AwarenessQueryEngine methods.
11. **U-MIT06 + U-MIT07 + U-MIT08** — ingest 6.034, 6.867, 6.804J in parallel with 0.8 (extend TreeOfThought/HypothesisRanker/Counterfactual + MillDeepLearning + SelfAwareness engines).
12. **0.8 Rename/delete/impact protocol** — `/impact`, `/rename`, `/delete` skills + guard hooks (A*/beam search from 6.034).
13. **0.9 Orphan detection at write-time** — 10 orphan-catching hooks, PostWrite not Week-5.
14. **0.10 Codex family adapter** — Python mirrors for every new TS hook.
15. **0.13 AGI-grade session self-awareness** — 7 engines + 7 lifecycle hooks + 4 skills; AGI Parity Test must pass on cold session.
16. **0.14 SVI continuous-awareness coupling** — bind SessionLifecycle to `SystemVariabilityIndexEngine`; every PreTool projects Ψ delta; milestones gated on Ψ.
17. **0.15 Auto-documentation propagation** — any PostWrite that touches engine/skill/hook/formula/action triggers cascade update of `CLAUDE.md`, `MEMORY.md`, manifests, directives.
18. **0.16 Operational Integrity Layer** — ship HookOrchestrator + TransactionLog + LedgerRetention + MetacognitionBudget + retrofit script + atomic-multifile-write + perf telemetry + 3-band semantic guard + CRITICAL-file guard + awareness regression suite. **Run `retrofit-existing-artifacts.ts` ONCE** to back-fill 1,660+ engines + 4,296 actions + 84 dispatchers into registries; verify counts within ±1%.
19. **0.17 Plugin / Agent / Extension Activation Layer** — register claude-flow in `.mcp.json`; ship AgentRegistryEngine + SlashCommandRecommenderEngine + PluginInventoryEngine; bind `/pr-swarm`, `/sparc`, `/commands-audit`; start `AGENT_UTILIZATION_LEDGER`. **Dogfood:** deliberately route portions of Phase 0 buildout through `dispatcher-wirer` (0.6), `perf-analyzer` (0.7), `queen-coordinator`+`implementer` team (0.16 retrofit), `verifier`+`silent-failure-hunter`+`type-design-analyzer` (0.11 exit gate).
20. **0.18 AGI Proximity Layer** — ship 15 AGI-proximate engines: AutonomousGoalSynthesisEngine, CausalReasoningEngine, TransferLearningBridgeEngine, MetaLearningOptimizerEngine, CuriosityDrivenExplorerEngine, TemporalReasoningEngine, ActiveLearningStrategyEngine, CompositionalSynthesisEngine, PredictiveWorldSimulatorEngine, SelfModificationProposalEngine, EmergentBehaviorMonitorEngine, CognitiveBudgetAllocatorEngine, BeliefStateReasoningEngine, PeerLearningCoordinatorEngine, AbstractionHierarchyEngine. Ship 6 skills (/synthesize, /trend, /generalize, /propose-goal, /simulate, /curiosity-queue). Ship 6 hooks (×2 Codex = 12). **AGI Parity Test v2 must pass 8/8 checks.**
21. **0.19 Local LLM Infrastructure** — deploy Ollama + Mistral 7B / Qwen2.5-Coder on 4080 (home), Llama 3.2 3B / Phi-3 on 3080 (work). Ship 10 engines. Ship 6 skills. Docker configs. **Zero additional cost.**
22. **0.20 Mathematical Foundations Layer** — ship 18 engines: BayesianInference, FormalVerification (Z3), InformationTheoreticLearner, CausalDiscovery (PC/FCI), StatisticalLearningBounds, DynamicalSystems, GameTheoreticCoordinator, KolmogorovComplexity, NeurosymbolicBridge, TopologicalDataAnalysis, ComplexityAwareRouter, FormalGCodeSemantics, ActiveInference, OptimalControl (LQR/MPC), CalibratedEnsemble, RegretMinimization, ConcentrationInequality, SymbolicRegression. **Ground all reasoning in proofs and bounds.**
23. **0.21 Scientific Simulation Layer** — ship 10 engines: FiniteElementLite, ThermalSimulation, CuttingForceSimulator, ChipFormationModel, SurfaceRoughnessPredictor, ToolWearModel, VibrationModalAnalysis, GeometricKernel, ToleranceStackup, DimensionalStability. **Physics simulation before G-code runs.**
24. **0.22 Statistical Process Control Layer** — ship 8 engines: WesternElectricRules, CUSUM, EWMA, ProcessCapability, MeasurementSystemAnalysis, MultivariateSPC, ChangePointDetection, SamplingPlan. **Rigorous SPC.**
25. **0.23 Maximum Asset Utilization Layer** — ship 15 engines: EngineUtilizationAuditor, FormulaIntegration, AlgorithmOrchestrator, ToolpathStrategyRouter, MaterialDatabaseBridge, ToolDatabaseBridge, MachineCapabilityIndex, TribalKnowledgeMaximizer, MITCourseFullIntegration, JMDieProgramLearning, VideoKnowledgeIntegration, PostProcessorUnification, RegistryFederation, SkillGapAnalyzer, HookCoverageMaximizer. **Wire ALL ~175,000 existing assets.**
26. **0.24 Cross-Asset Intelligence Wiring** — ship 8 engines: MultiAssetReasoning, AssetDependencyGraph, AutomaticPipelineComposer, CrossRegistryJoin, IntelligenceAmplification, AssetRecommendation, UnusedAssetSurfacer, AssetSynergyDetector. **Compose knowledge across assets.**
27. **0.12 MIT OCW Rigor Layer exit gate** — all 225 courses mapped (expanded from 9), domain extensions verified, proof sheet committed.
28. **Run full system canary** — create engine X, verify ALL Phase 0.1-0.24 gates pass including: formal verification proves property, Bayesian posterior calibrated, physics simulation matches measured, SPC detects injected drift, multi-asset query spans ≥3 categories, pipeline auto-composes.
29. **Remove `BOOTSTRAP_MODE.flag`** — Phase 0.11 exit gate auto-removes it; re-run boot without flag to confirm full gated stack passes.
30. **Announce in `state/shared/AGENT_CHAT.md`** so Codex terminals adopt the new contract.
31. **Only then begin Phase 1** (session lifecycle hooks).

### Ship-before-claim order
- `scripts/verify-full-wiring.ts` must report 0 orphans across all 59 touchpoints before any Phase 1 milestone can be claimed.
- `AwarenessQueryEngine.impactAnalysis()` must return <100ms before any engine rename/delete happens.
- `AwarenessScoreEngine.current()` must be ≥0.80 sustained for 1 hour before Phase 1 begins.
- `AutonomousGoalSynthesisEngine.propose()` must return ≥3 actionable goals before Phase 1 begins.
- `CausalReasoningEngine.traceImpact()` must return valid graph in <500ms before Phase 1 begins.
- `PredictiveWorldSimulatorEngine.simulate()` must achieve >80% test prediction accuracy before Phase 1 begins.
- **AGI Parity Test v2 must pass 8/8 checks** on any fresh session before Phase 1 begins.
- Ollama must respond <2s on 4080, <3s on 3080 before Phase 1 begins.
- LoRA adapter must be trained on ≥100 JM DIE programs before Phase 1 begins.
- Qdrant must store ≥10K embeddings and retrieve <100ms before Phase 1 begins.
- `FormalVerificationEngine.prove()` must return SAT/UNSAT in <10s before Phase 1 begins.
- `BayesianInferenceEngine.posterior()` must achieve <5% calibration error before Phase 1 begins.
- `CausalDiscoveryEngine.discover()` must produce valid DAG from ≥100 outcomes before Phase 1 begins.
- Cutting force simulation must match measured values within 15% before Phase 1 begins.
- Western Electric rules must flag 95% of simulated special causes before Phase 1 begins.
- `EngineUtilizationAuditorEngine.audit()` must report <5% orphan engines before Phase 1 begins.
- ALL 225 MIT courses must be mapped (not just 9) before Phase 1 begins.
- `MultiAssetReasoningEngine.query()` must return assets from ≥3 categories before Phase 1 begins.

---

## Appendix — Full Artifact Inventory (After 12 Scrutiny Passes)

| Phase | Artifacts |
|-------|-----------|
| 0.1 Fix enforcement | ~8 |
| 0.2 Awareness engines | ~25 |
| 0.3-0.5 Forge-quint + locking | ~12 |
| 0.6-0.10 Wiring + indexes | ~85 |
| 0.11 MIT OCW | ~30 |
| 0.12 Exit gate | ~5 |
| 0.13 AGI session awareness | ~38 |
| 0.14 SVI coupling | ~15 |
| 0.15 Auto-documentation | ~16 |
| 0.16 Operational integrity | ~22 |
| 0.17 Plugin activation | ~13 |
| 0.18 AGI proximity | ~38 |
| 0.19 Local LLM infrastructure | ~20 |
| 0.20 Mathematical foundations | ~40 |
| 0.21 Scientific simulation | ~14 |
| 0.22 Statistical process control | ~11 |
| 0.23 Maximum asset utilization | ~25 |
| 0.24 Cross-asset intelligence | ~12 |
| **Phase 0 Total** | **~429** |

**Asset Utilization Guarantee (Phase 0.23-0.24):**
| Asset Type | Count | Integration |
|------------|-------|-------------|
| Engines | 1,869 | Via EngineUtilizationAuditor |
| Formulas | 509 | Via FormulaIntegration + FormalVerification |
| Algorithms | 53 | Via AlgorithmOrchestrator |
| Toolpath Strategies | 698 | Via ToolpathStrategyRouter |
| Materials | 6,372 | Via MaterialDatabaseBridge |
| Tools | 95,608 | Via ToolDatabaseBridge |
| Machines | 910 | Via MachineCapabilityIndex |
| Tribal Tips | 4,493 | Via TribalKnowledgeMaximizer |
| MIT Courses | 225 | Via MITCourseFullIntegration |
| JM DIE Programs | 36,929 | Via JMDieProgramLearning |
| Video Transcripts | 69 | Via VideoKnowledgeIntegration |
| **Total Assets Wired** | **~175,000+** | |

Full list of all artifacts with dependencies, owners, and test matrices:
`mcp-server/data/plans/universal-hooks-skills-artifacts.json` (to be generated in Phase 0.11 exit gate).

See also: `H:/prism/PRISM-INVENTORY-2026-04-15.md` for complete asset inventory.

---

## Local LLM Utilization Throughout Roadmap

The local LLM infrastructure (Phase 0.19) integrates across ALL subsequent phases. Here's how:

### Phase 0 Integration (During Build)

| Phase | Local LLM Usage |
|-------|-----------------|
| 0.2 SemanticSimilarityGuard | `LocalEmbeddingEngine` (all-MiniLM-L6-v2) provides embeddings locally instead of API calls |
| 0.7 Reverse indexes | Embeddings stored in Qdrant; similarity queries run locally |
| 0.13 SituationalAwarenessFilter | Local model pre-filters context before sending to Claude (cost savings) |
| 0.15 Auto-documentation | Local model generates JSDoc drafts; Claude reviews |
| 0.18 CausalReasoningEngine | Qdrant retrieves historical outcomes to inform causal graphs |
| 0.18 TransferLearningBridge | LoRA adapter provides domain-specific analogies |
| 0.18 MetaLearningOptimizer | Tracks which local vs Claude routing works best per task type |

### Phase 1-4 Integration (Runtime)

| Feature | Local LLM Role | Claude Role |
|---------|----------------|-------------|
| `/program-generate` | Mistral 7B: first draft G-code | Review, safety check |
| `/program-validate` | Local: syntax + pattern check | Complex semantic validation |
| `/auto-speed-feed` | Qwen2.5-Coder: initial calc | Physics verification |
| `/quote-to-ship` | Local: template fill, lookups | Complex estimation |
| `/pdf-learn` | Local: chunk + summarize | Deep extraction |
| `/video-learn` | Local: transcript summary | Knowledge integration |
| Tribal knowledge queries | Qdrant: instant retrieval | None needed |
| Dedup checks | Local embeddings + cosine | Semantic edge cases |
| G-code explanation | Local: common patterns | Unusual constructs |

### Cost Optimization Strategy

```
QUERY ROUTING DECISION TREE:

Is this a common G-code pattern?
├── YES → Local Mistral 7B (free, <2s)
└── NO → Is this safety-critical?
    ├── YES → Claude (already paid)
    └── NO → Is confidence >0.8?
        ├── YES → Local (free)
        └── NO → Claude (already paid)
```

| Query Type | % Routed Local | Estimated Savings |
|------------|----------------|-------------------|
| G-code syntax help | 90% | ~$50/mo API avoided |
| Speed/feed lookups | 85% | ~$30/mo API avoided |
| Tribal knowledge | 95% | ~$40/mo API avoided |
| Program generation | 60% (drafts) | ~$80/mo API avoided |
| Complex reasoning | 5% | Use Claude (paid) |
| Safety-critical | 0% | Always Claude |

### Continuous Learning Loop

```
┌─────────────────────────────────────────────────────────┐
│  CONTINUOUS IMPROVEMENT CYCLE                           │
├─────────────────────────────────────────────────────────┤
│  1. Program generated (local or Claude)                 │
│  2. Program runs on machine                             │
│  3. Outcome logged: good/scrap/adjusted                 │
│  4. OutcomeTrackingEngine stores in data/outcomes/      │
│  5. Nightly: IncrementalLearningEngine trains LoRA      │
│  6. Next day: LoRA adapter loaded, model is smarter     │
│  7. Loop continues → model improves with shop data      │
└─────────────────────────────────────────────────────────┘
```

### Hardware Allocation

| Time | 4080 (Home) | 3080 (Work) |
|------|-------------|-------------|
| Day (work hours) | Idle / sync | Active inference |
| Evening | Active inference | Idle |
| Night | LoRA training | Idle |
| Weekend | Batch processing | Idle |

### LoRA Adapter Specializations

| Adapter | Trained On | Purpose |
|---------|------------|---------|
| `prism-gcode-base.lora` | 24,545 JM DIE programs | General G-code understanding |
| `prism-lathe.lora` | Okuma lathe programs | Turning specialization |
| `prism-mill.lora` | Haas/Okuma mill programs | Milling specialization |
| `prism-wedm.lora` | Mitsubishi WEDM programs | Wire EDM specialization |
| `prism-tribal.lora` | 3,700+ tribal tips | Shop floor wisdom |
| `prism-outcomes.lora` | Outcome feedback | What works vs. what fails |

Adapters stack: base + machine-family + outcomes = specialized model per task.
