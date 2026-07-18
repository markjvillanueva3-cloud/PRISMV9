# PRISM Full System Audit — 2026-04-06
## Comprehensive Scrutinization Pass

---

## SYSTEM INVENTORY

| Category | Count | Notes |
|----------|-------|-------|
| Engine files | 1,477 | src/engines/*.ts |
| Engines in index | 1,415 | 62 not exported |
| Dispatchers | 81 | src/tools/dispatchers/ |
| Dispatcher actions | 3,405 | across all dispatchers |
| Web routes | 62 | web/src/pages/ has 77 pages |
| Test files | 1,085 | src/__tests__/*.test.ts |
| Skills | 260 | skills-consolidated/ |
| Hooks (Python) | 71 | .claude/hooks/lib/*.py |
| Hooks (MJS) | 2 | .claude/hooks/lib/*.mjs |
| Helper scripts | 65+ | .claude/helpers/ |
| CLI commands | 37 | src/cli/index.ts |
| CAD Python files | 97 | cad-engine/src/ |
| Web pages | 77 | web/src/pages/ |
| Web components | 43 | web/src/components/ |
| Web tests | 89 | web/src/__tests__/ |
| Registries | 14 | src/registries/ |
| Physics formulas | 499 | FormulaRegistry |
| Materials | 2,957 | MaterialRegistry |
| Tools | 95,608 | ToolRegistry |
| Machines | 910 | MachineRegistry |
| Tribal tips | 4,127 | TribalKnowledgeEngine |

---

## COVERAGE METRICS (from prism_dev MCP scanners)

| Dimension | Covered | Total | Coverage | Status |
|-----------|---------|-------|----------|--------|
| Engine → Index export | 1,415 | 1,476 | 95.9% | GOOD |
| Engine → Dispatcher | 1,253 | 1,476 | 84.9% | OK — 223 dark |
| Engine → Zod Schema | 324 | 1,476 | 22.0% | **CRITICAL** |
| Engine → Web Route | 30 | 1,476 | 2.0% | Expected (CLI-first) |
| Engine → API Client | 79 | 1,476 | 5.4% | Low |
| Engine → Tests | 1,381 | 1,476 | 93.6% | GOOD |
| Dispatcher → Schema | 2,206 | 3,405 | 64.8% | MEDIUM |
| Route → API Client | 662 | 860 | 77.0% | OK |
| **Overall** | — | — | **56%** | NEEDS WORK |

---

## CRITICAL FINDINGS

### 1. Schema Coverage Crisis (22%)
- 1,290 engines have NO Zod input schema
- 1,199 dispatcher actions have no per-action schema
- This means MCP tool calls have no input validation for most actions
- **Impact**: Users get unhelpful errors, no auto-complete in MCP clients

### 2. 223 Dark Engines (15%)
- 223 engines exist but have no dispatcher action path
- Built but completely unreachable by any user or automation
- Need triage: wire to dispatcher, mark internal, or deprecate

### 3. 17 New ACP+MXU Engines NOT Integrated
- Built this session: 17 engines, 57 dispatcher actions, 365 tests
- ZERO wired into hooks (don't auto-fire)
- ZERO slash commands created
- ZERO referenced in CLAUDE.md, ENGINE_DIGEST, or DISPATCHER_DIGEST
- Existing commands (/startup, /compact, /forge) don't use them

### 4. Stale Documentation
- ENGINE_DIGEST.md: missing recent engines
- DISPATCHER_DIGEST.md: missing 57+ new actions
- CLAUDE.md: counts outdated, missing ACP+MXU sections
- CURRENT_POSITION.md: still says WEDM-HARDEN-MS0
- MEMORY.md: doesn't reflect ACP/MXU track completion

### 5. Hook System Using Old Python Scripts
- 71 Python hooks still use standalone scripts
- New engines (BuildGuardChain, ContextChain, TokenEconomy) should replace them
- Python hooks don't call MCP actions — they're parallel systems

### 6. Web App Not Built
- 77 pages, 89 tests, full React stack
- NO production build (no dist/ directory)
- Never deployed or tested in production mode

---

## PLUGIN & FEATURE UTILIZATION

### AVAILABLE AND ACTIVE
| Feature | Status | Usage |
|---------|--------|-------|
| PRISM MCP Server (81 dispatchers) | Active | ~3% of 3,405 actions used per session |
| Playwright (browser automation) | Active | **NEVER USED** |
| Read/Write/Edit/Glob/Grep | Active | Core workflow |
| Agent (subagent spawning) | Active | Used for parallel work |
| TaskCreate/TaskUpdate | Active | Used for tracking |

### AVAILABLE BUT UNAUTHENTICATED
| Plugin | Status | Potential |
|--------|--------|-----------|
| Figma | Needs auth | UI design collaboration |
| Supabase | Needs auth | Database backend for web app |
| Linear | Needs auth | Issue tracking integration |

### AVAILABLE BUT UNDERUSED
| Feature | What It Does | Should Be Used For |
|---------|-------------|-------------------|
| **CronCreate** | Schedule recurring tasks | Health checks, SVI refresh, stale claim reap |
| **RemoteTrigger** | Persistent agents across restarts | Nightly audits, regression detection |
| **prism_session:context_boot** | Full context hydration | Every /startup (replace manual file reads) |
| **prism_session:action_search** | Find best MCP action for intent | Route every task to optimal dispatcher |
| **prism_session:dispatcher_map** | Map all dispatchers+actions | Session start context loading |
| **prism_session:auto_checkpoint** | Incremental state save | Every 5-10 tool calls |
| **prism_session:memory_save** | Cross-session knowledge persist | Every session end |
| **prism_atcs** | Autonomous task completion | Multi-session roadmap execution |
| **prism_sp:brainstorm** | 7-lens analysis | Before any creative work |
| **prism_sp:cognitive_init** | Cognitive state management | Session start |
| **prism_monitoring** | Grafana/Prometheus metrics | Shop floor dashboards |
| **prism_bridge** | API gateway | External system access |
| **Playwright** | Browser automation | Web app E2E testing |

### MCP ACTIONS WE BUILT BUT DON'T USE
| Action | Engine | Should Be Used By |
|--------|--------|-------------------|
| build_guard_chain | BuildGuardChainEngine | PostToolUse hook on every edit |
| context_pressure | ContextChainEngine | PreCompact hook |
| token_budget | TokenEconomyEngine | Session start budget allocation |
| copilot_suggest | CodingCopilotEngine | /forge-engines before creating |
| discover_search | DiscoverabilityEngine | /discover slash command |
| capability_census_report | CapabilityCensusEngine | /startup, /census |
| pillar_summary | ProductPillarEngine | /startup, /pillar |
| sf_autopilot_run | SpeedFeedAutopilotEngine | /auto-speed-feed enhancement |
| pp_autopilot_run | PostProcessorAutopilotEngine | /ppg-quick-start enhancement |
| quote_autopilot_run | QuoteAutopilotEngine | /quote-job enhancement |

---

## RECOMMENDED ACTION PLAN

### Phase 1: CRITICAL (Do Immediately)
1. Update ENGINE_DIGEST.md + DISPATCHER_DIGEST.md
2. Update CLAUDE.md with accurate counts + ACP/MXU sections
3. Wire BuildGuardChainEngine into PostToolUse hook
4. Wire ContextChainEngine into PreCompact hook
5. Set up CronCreate for recurring health checks

### Phase 2: HIGH (This Week)
6. Create /discover, /census, /pillar slash commands
7. Update /startup to call census + pillar summary
8. Update /forge-engines to use CodingCopilot dedup
9. Wire AutomationChainEngine into UserPromptSubmit
10. Authenticate Supabase plugin (for web app backend)

### Phase 3: MEDIUM (Next Sprint)
11. Triage 223 dark engines (wire 50+, mark rest internal)
12. Generate Zod schemas for top 100 engines (from 22% → 30%)
13. Build web app production bundle
14. Set up Playwright E2E tests for web app
15. Wire prism_session:context_boot into /startup

### Phase 4: ONGOING
16. Schema coverage from 22% → 80% (batched over time)
17. Dark engine count from 223 → <100
18. Plugin authentication (Figma, Linear)
19. RemoteTrigger for nightly audits
20. prism_monitoring for shop floor dashboards

---

---

## DETAILED FINDINGS FROM 7-AGENT AUDIT

### Agent 1: Root + State (COMPLETE)
- 65 directories + 52 markdown files at H:\prism root
- CURRENT_POSITION.md: engine count WRONG (claims 1,392, actual 1,481)
- CLAUDE.md: engine count WRONG (claims 1,304, actual 1,477)
- CLAUDE.md references ENGINE_DIGEST.md, DISPATCHER_DIGEST.md — agent claims they don't exist (they're at mcp-server/data/docs/, not root)
- 172 active session handoffs in state/shared/handoffs/
- 837 files in state/shared/ — 190 older than 14 days
- 2 orphan HTML files at root (47MB + 11MB) safe to archive

### Agent 2: Engines Deep Scan (COMPLETE)
- 1,477 engine files in main dir + 17 hypermill + 5 plugins = 1,500 total
- 1,037 exported from index.ts, **440 NOT exported** (orphaned — can't be imported)
- index.ts header OUTDATED: claims "150 exported" from 2026-03-03
- Only **74 engines (5%) import from physics/constants.ts** — 1,403 may use hardcoded values
- Zero stub files (no 0-byte or suspiciously small engines)
- No true duplicates — intentional domain families (SpeedFeed×6, EDM×27, Cutting×10)
- Largest: QuoteToShipOrchestrator (5,450 lines), PostProcessorPipeline (4,864)
- Smallest: OperatingSystemHotJobs (82 lines) — legitimate utilities, not stubs
- 92% export singleton instances, 76% export classes

### Agent 3: Dispatchers + Schemas (COMPLETE)
- 81 dispatchers total, 62 active, 19 empty stubs
- Total actions: 3,745 (higher than gap_scan's 3,405 — counting methodology differs)
- Top dispatchers: calcDispatcher (1,086), camDispatcher (688), devDispatcher (443), businessDispatcher (350)
- 19 STUB dispatchers with 0 actions: toolpathDisp, threadDisp, tenantDisp, telemetryDisp, safetyDisp, productDisp, pfpDisp, memoryDisp, machineLiveDisp, knowledgeExtDisp, integrationDisp, infraDisp, fluidThermalDisp, diagnosisDisp, dataDisp, cplDisp, complianceDisp, bridgeDisp
- 42 duplicate action names across dispatchers (mostly legitimate domain separation)
- 196 schema files exist, 81 match dispatchers, 103 are internal/support schemas
- All engine imports verified — no missing engine references

### Agent 4: Tests + Build (PENDING)
- Results pending...

### Agent 5: Skills + Hooks + Helpers (COMPLETE)
- 260 skills total, 258 have SKILL.md (99.2%)
- 91 skills (35%) reference MCP actions — 169 (65%) are documentation-only
- 10 stale/broken skills identified (expert profiles, reference docs with no actions)
- 5 duplicate skill families: agent-selection (2), anti-regression (4), algorithms (4), batch (2), skill-management (4)
- 40 hooks total: 34 Python, 0 MJS in hooks config
- ALL hooks have continueOnError=true — no hard enforcement
- 5 enforce-*.py scripts exist but NOT wired in settings
- 105 helper scripts (64 .mjs, 39 .sh, 2 .ps1)
- ~100 helpers NOT referenced by any hook — potentially dead code

### Agent 6: Physics + Registries + Data (COMPLETE)
- physics/constants.ts: 752 lines, single canonical source — CLEAN
- 24 registry files totaling 24 MB
- ToolpathStrategyRegistry: 197 KB main + 27 KB Part1 (SPLIT — verify integrity)
- data/ directory: 4.7 GB total
  - data/programs/: 2.9 GB G-code (BLOAT — move to external storage)
  - data/posts/: 659 MB post-processor assets
  - data/milestones/: 392 MB, 439 milestones (103 complete)
- 43 stale claim directories in data/claims/
- roadmap-index.json: v8.3.0, accurate

### Agent 7: Web App + CAD + CLI (COMPLETE)
- Web app: 77 pages, 89 tests, NOT BUILT (no dist/)
  - React 19, Vite 6, Tailwind, Three.js, Zustand, TanStack Query
  - No direct MCP calls — uses local state keys
- CAD engine: 97 Python files, 8 subpackages, CadQuery 2.7
  - Clean imports, JSON-RPC bridge for TS interop
- CLI: 37 commands, BUILT (dist/cli.js 34.4 MB), linked via npm
- mcp-cadquery/ standalone server exists (separate from cad-engine)
- extracted_modules/ contains monolith decomposition artifacts

---

## COMPREHENSIVE ISSUE TRACKER

### RED — Must Fix (Blocks Users/Development)
| # | Issue | Location | Impact |
|---|-------|----------|--------|
| R1 | Schema coverage 22% (1,290 engines missing Zod schemas) | src/engines/ | MCP validation broken for most actions |
| R2 | 19 stub dispatchers with 0 actions | src/tools/dispatchers/ | Registered but non-functional tools |
| R3 | CLAUDE.md engine/action counts wrong | CLAUDE.md | Misleads every new session |
| R4 | 17 new ACP+MXU engines: 0% integration | hooks, skills, docs | Built but invisible |
| R5 | Web app never built | web/ | Can't demo or deploy |
| R6 | 440 engines NOT exported from index.ts | src/engines/index.ts | Orphaned — dispatchers can't import them |
| R7 | Only 74/1,477 engines use canonical physics constants | src/engines/ | 1,403 may have hardcoded magic numbers |

### ORANGE — High Priority (Quality/Efficiency)
| # | Issue | Location | Impact |
|---|-------|----------|--------|
| O1 | 223 dark engines (no dispatcher path) | src/engines/ | Unreachable capability |
| O2 | 65% of skills are documentation-only (no MCP action calls) | skills-consolidated/ | Skills exist but don't do anything |
| O3 | All 40 hooks non-blocking (continueOnError=true) | portable-user-settings.json | No hard enforcement possible |
| O4 | 5 enforce-*.py scripts exist but not wired | hooks/lib/ | Built enforcement not active |
| O5 | 100+ helper scripts not referenced by hooks | .claude/helpers/ | Potential dead code |
| O6 | 2.9 GB programs directory | data/programs/ | Build/deploy bloat |
| O7 | 43 stale claim directories | data/claims/ | Stale state accumulation |

### YELLOW — Medium Priority (Maintenance)
| # | Issue | Location | Impact |
|---|-------|----------|--------|
| Y1 | 42 duplicate action names across dispatchers | dispatchers/ | Confusion potential |
| Y2 | 5 duplicate skill families (16 skills total) | skills-consolidated/ | Redundancy |
| Y3 | 190 state files >14 days old | state/shared/ | Unbounded growth |
| Y4 | ToolpathStrategyRegistry split into 2 files | src/registries/ | Integrity risk |
| Y5 | ENGINE_DIGEST/DISPATCHER_DIGEST stale | data/docs/ | Discovery degraded |

### GREEN — Healthy
| Metric | Status |
|--------|--------|
| Engine → Test coverage | 93.6% (1,358/1,476) |
| Engine → Index export | 95.9% |
| Engine → Dispatcher | 84.9% |
| Zero engine duplicates | CLEAN |
| Physics constants canonical | Single file, clean |
| CLI built + linked | 37 commands ready |
| CAD engine healthy | 97 files, clean imports |
| Roadmap index accurate | v8.3.0, 439 milestones |
| Session management robust | 172 handoffs tracked |
| Coordination active | Real-time Apr 6 updates |

---

## UNDERUSED CLAUDE CODE FEATURES

| Feature | Available | Currently Used | Should Be Used For |
|---------|-----------|---------------|-------------------|
| CronCreate | Yes | Never | Recurring health checks, SVI refresh, stale reaping |
| RemoteTrigger | Yes | Never | Nightly audits, regression detection |
| Playwright | Yes (plugin) | Never | Web app E2E testing |
| Figma | Needs auth | Never | UI design collaboration |
| Supabase | Needs auth | Never | Database backend for web app |
| Linear | Needs auth | Never | Issue tracking integration |
| prism_session:context_boot | Yes | Rarely | Every /startup (replace manual file reads) |
| prism_session:action_search | Yes | Rarely | Route tasks to optimal dispatcher |
| prism_session:auto_checkpoint | Yes | Never | Every 5-10 tool calls |
| prism_atcs | Yes | Rarely | Multi-session roadmap execution |
| prism_sp:brainstorm | Yes | Rarely | Before creative/planning work |
| prism_monitoring | Yes | Never | Grafana dashboards for shop floor |

---

## GENERATED BY
- 7 parallel audit agents (5 complete, 2 pending)
- 6 MCP scanner actions (gap_scan, auto_wiring_scan, schema_gap_scan, test_gap_scan, engine_overlap_scan, dispatcher_map)
- Plugin/feature inventory via ToolSearch
- Date: 2026-04-06T15:15:00Z
- Report: data/state/FULL_SYSTEM_AUDIT_2026-04-06.md
