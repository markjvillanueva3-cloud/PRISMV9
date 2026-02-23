# UNREALIZED FEATURES AUDIT — Comprehensive
## Date: 2026-02-23 | Sources: 30+ past chats, 6 roadmaps, C:\PRISM filesystem
---

## CATEGORY A: WRITTEN CODE — NEVER WIRED TO MCP SERVER

### A1. 60 Python Core Modules (scripts/core/)
**Status:** 75 files exist, only 15 have MCP wrappers, ZERO are registered in the TypeScript MCP server
**Location:** C:\PRISM\scripts\core\
**Impact:** These were the original development infrastructure — caching, state management, recovery, pattern detection
**Top unconnected modules:**
| Module | Size | What It Does |
|--------|------|-------------|
| semantic_code_index.py | 51KB | Semantic search over codebase |
| agent_mcp_proxy.py | 37KB | Agent→MCP bridging |
| state_server.py | 35KB | State management server |
| manus_context_engineering.py | 32KB | Context optimization |
| diff_based_updates.py | 29KB | Incremental state saves |
| clone_factory.py | 26KB | Deep-clone state for rollback |
| computation_cache.py | 25KB | Cache expensive calculations |
| wip_capturer.py | 21KB | Capture work on crash |
| recovery_scorer.py | 21KB | Score session recovery quality |
| pattern_detector.py | ~15KB | Detect recurring error patterns |
**Assessment:** These were superseded by the TypeScript MCP server (cadenceExecutor, autoHookWrapper, etc.). Most functionality now exists natively. LOW PRIORITY — archive rather than wire.

### A2. Integration Scripts (scripts/integration/)
**Status:** 5 scripts WRITTEN, NEVER USED
**Location:** C:\PRISM\scripts\integration\
| Script | Lines | Purpose | Used? |
|--------|-------|---------|-------|
| excel_to_json.py | 315 | Convert Excel DBs to JSON | NO |
| json_to_duckdb.py | 358 | Load JSON into DuckDB | NO |
| obsidian_generator.py | 390 | Generate linked knowledge notes | NO |
| sync_to_drive.py | 247 | Backup to Google Drive | NO |
| master_sync.py | 228 | Orchestrate all above | NO |
**Assessment:** DuckDB exists (prism.duckdb, 2.5MB) but integration pipeline never ran. Excel workflow never materialized. MEDIUM PRIORITY — useful for data management.

### A3. Obsidian Knowledge Vault
**Status:** 58 files exist in C:\PRISM\knowledge\ but never maintained or synced
**Assessment:** LOW PRIORITY — knowledge is better served by skills system.

---

## CATEGORY B: DESIGNED IN DETAIL — NEVER BUILT

### B1. Post Processor Framework (G-Code Generation Engine)
**Source:** MCP_ENHANCEMENT_ROADMAP_v2.md Session 8.1
**Spec:** 4,000 lines planned — Universal Intermediate Representation (UIR) → FANUC/SIEMENS/HAAS/MAZAK/OKUMA/HEIDENHAIN
**Status:** Skills exist (prism-fanuc-programming, prism-siemens-programming, prism-post-processor-reference), post_processor.js found in extracted/, Hurco post processor was manually created in Fusion360 CPS format. But NO unified engine in MCP server.
**Assessment:** HIGH PRIORITY — this is a core PRISM product feature. Skills + extracted data exist to build from.

### B2. Process Planning Engine
**Source:** MCP_ENHANCEMENT_ROADMAP_v2.md Session 8.5
**Spec:** 3,000 lines — Feature → operation sequence → optimal machine → cost estimate
**Status:** NOT STARTED. operation_sequencer.js NOT EXTRACTED from monolith.
**Assessment:** HIGH PRIORITY — "holy grail" for job shops. Differentiator.

### B3. Cost Estimation / Quoting System
**Source:** MCP_ENHANCEMENT_ROADMAP_v2.md Phase 11
**Spec:** Material + labor + overhead + tooling + setup costing with market-aware pricing
**Status:** NOT STARTED. cost_optimizer.js NOT EXTRACTED from monolith.
**Assessment:** HIGH PRIORITY — direct revenue impact, makes PRISM a business tool.

### B4. GD&T Stack-Up Analysis
**Source:** MCP_ENHANCEMENT_ROADMAP_v2.md Session 10.1
**Spec:** 2,000 lines — Worst-case + RSS statistical tolerance analysis
**Status:** ToleranceEngine exists (R8 phase, in MCP server) but only does ISO 286 fit calculations. No stack-up chain analysis.
**Assessment:** MEDIUM PRIORITY — ToleranceEngine is a foundation to build on.

### B5. CCE — Cognitive Composition Engine
**Source:** MERGED_ROADMAP_v6.md Phase 2 (P2-001 through P2-005)
**Spec:** Auto-compose solutions from 382+ actions — problem analyzer → technique matcher → composition synthesizer
**Status:** NOT STARTED. AutoPilot.ts does basic routing but not problem decomposition.
**Assessment:** MEDIUM PRIORITY — would make PRISM autonomous. Complex to build correctly.

### B6. Append-Only State Protocol
**Source:** C:\PRISM\docs\APPEND_ONLY_STATE_PROTOCOL.md (395 lines, 9KB)
**Spec:** Lossless state management — every decision recoverable, <30s session resume
**Status:** DESIGNED, NEVER BUILT. Session state still uses overwrite pattern.
**Assessment:** LOW PRIORITY — Token Opt v2 + HOT_RESUME.md + COMPACTION_SURVIVAL.json partially solve this. The full append-only protocol is over-engineered for current needs.

### B7. Token Budget / Intelligence System
**Source:** MERGED_ROADMAP_v6.md Phase 1 (P1-001 through P1-004)
**Spec:** Token accounting per category, cascading review (cheap→focused→deep), zero-token engines
**Status:** NOT BUILT as designed. However, Token Opt v2 (responseSlimmer) + pressure-based cadence partially implements this.
**Assessment:** LOW PRIORITY — already partially solved differently.

### B8. Intelligent Troubleshooter (Bayesian)
**Source:** MCP_ENHANCEMENT_ROADMAP_v2.md Session 18.1
**Spec:** Alarm DB + Knowledge Graph + Bayesian inference = "87% likely cause X"
**Status:** NOT STARTED. We have 10,033 alarms but no probabilistic reasoning layer.
**Assessment:** MEDIUM PRIORITY — differentiator. Alarms data is there, needs reasoning engine.

---

## CATEGORY C: MONOLITH INTELLIGENCE — NEVER EXTRACTED

### C1. Rules Engine + Machining Rules (~9,700 lines)
**Source:** EXTRACTION_PRIORITY_INTELLIGENCE.md
- rules_engine.js: 5,500 lines — executable machining rules
- machining_rules.js: 4,200 lines — heuristics and best practices
**Status:** NOT EXTRACTED. Identified as highest-value monolith modules.
**Assessment:** HIGH PRIORITY — decades of domain knowledge in code form.

### C2. Best Practices + Troubleshooting (~5,800 lines)
- best_practices.js: 3,000 lines — domain expertise distilled
- troubleshooting.js: 2,800 lines — diagnostic decision trees
**Status:** NOT EXTRACTED.
**Assessment:** HIGH PRIORITY — feeds into B8 Intelligent Troubleshooter.

### C3. Optimization Suite (~12,300 lines)
- operation_sequencer.js: 3,200 lines — optimal operation ordering
- tool_selector.js: 3,500 lines — multi-objective tool selection
- constraint_engine.js: 2,400 lines — manufacturing constraint solver
- cost_optimizer.js: 3,200 lines — cost minimization
**Status:** NOT EXTRACTED.
**Assessment:** HIGH PRIORITY — feeds into B2 Process Planning + B3 Quoting.

### C4. G-Code Generator (~5,500 lines)
- gcode_generator.js: 5,500 lines — G-code output engine
**Status:** NOT EXTRACTED (post_processor.js WAS extracted but gcode_generator was not).
**Assessment:** HIGH PRIORITY — feeds into B1 Post Processor Framework.

---

## CATEGORY D: INFRASTRUCTURE — PLANNED BUT NOT DONE

### D1. Manufacturer Catalog Parsing
**Status:** 116 PDF catalogs exist in C:\PRISM\MANUFACTURER_CATALOGS\ (Sandvik, Kennametal, Iscar, etc.)
**Plan:** Parse into structured tool data for ToolRegistry
**Status:** NEVER DONE. Tool data comes from 14 JSON files, not catalogs.
**Assessment:** MEDIUM PRIORITY — would massively expand tool database with real manufacturer data.

### D2. Tool Holder Schema v2 Upgrade
**Source:** TOOL_HOLDER_DATABASE_ROADMAP_v4.md
**Status:** 10 files in data/tool_holders/. Original plan was 6,331 holders at 85-param simulation-grade.
**Assessment:** MEDIUM PRIORITY — needed for collision avoidance and chatter prediction.

### D3. Diagrams Directory
**Status:** C:\PRISM\diagrams\ — EMPTY. Draw.io integration planned, never happened.
**Assessment:** LOW PRIORITY — nice-to-have, not critical.

### D4. Hurco Post Processor Enhancement
**Source:** Chat from Jan 27 — material-aware, tool-catalog-integrated post processor
**Status:** Initial version created as CPS file but advanced features (material DB integration, auto tool selection, holder-based derating) not completed.
**Assessment:** MEDIUM PRIORITY — real-world usage for your shop.

---

## CATEGORY E: PARTIALLY DONE / STALLED

### E1. Wire EDM Post Processor (Mitsubishi MV1200S)
**Source:** Chat from Jan 17
**Status:** Initial post created, never tested/validated
**Assessment:** LOW PRIORITY unless you're actively using the wire EDM.

### E2. R1 MS5-MS9 (Registry Enhancement)
**Status:** Tool schema normalization, material enrichment, machine population deferred
**Assessment:** MEDIUM PRIORITY — would improve data quality.

### E3. R5 Frontend
**Status:** React pages exist, REST API routes just wired (this session), but never deployed/tested end-to-end
**Assessment:** MEDIUM PRIORITY — visual interface for the system.

---

## PRIORITY RANKING (What to build next)

### TIER 1 — HIGH VALUE, BUILDS ON EXISTING ASSETS
1. **B1: Post Processor Framework** — Skills + extracted data ready, core product feature
2. **C1+C2: Monolith Intelligence Extraction** (rules_engine, machining_rules, best_practices, troubleshooting) — ~15,500 lines of gold
3. **B3: Cost Estimation / Quoting** — Direct revenue impact
4. **B2: Process Planning Engine** — Differentiator for job shops

### TIER 2 — MEDIUM VALUE, MODERATE EFFORT
5. **C3: Optimization Suite Extraction** (operation_sequencer, tool_selector, constraint_engine, cost_optimizer)
6. **D1: Manufacturer Catalog Parsing** — Expand tool database with real data
7. **B8: Intelligent Troubleshooter** — Probabilistic alarm diagnosis
8. **D4: Hurco Post Enhancement** — Real-world shop usage
9. **A2: Integration Pipeline** — Excel/DuckDB workflow for data management

### TIER 3 — LOWER PRIORITY / ALREADY PARTIALLY SOLVED
10. B4: GD&T Stack-Up (ToleranceEngine exists as foundation)
11. B5: CCE (AutoPilot partially covers this)
12. B6: Append-Only State (Token Opt v2 partially covers this)
13. B7: Token Budget System (responseSlimmer partially covers this)
14. A1: Python core modules (TypeScript MCP server supersedes most)
15. E1-E3: Stalled items (as-needed)

---

## FILES ON DISK THAT SHOULD BE REVIEWED
| File | Size | Contains |
|------|------|----------|
| docs/EXTRACTION_PRIORITY_INTELLIGENCE.md | 30KB | Detailed extraction plan for all monolith modules |
| docs/TOOLS_DATABASE_BRAINSTORM.md | 17KB | 9,500+ tool spec with 52 params |
| docs/SPEED_FEED_CALCULATOR_ENHANCEMENT_PLAN.md | 36KB | Full SFC enhancement design |
| docs/APPEND_ONLY_STATE_PROTOCOL.md | 9KB | Lossless state management design |
| docs/ATCS_MANUS_MERGE_BRAINSTORM.md | 27KB | Autonomous task system design |
| docs/TOOL_HOLDER_DATABASE_ROADMAP_v4.md | 6KB | 85-param holder schema |
| mcp-server/UNIFIED_ROADMAP_v8.md | 34KB | Combined roadmap (Feb 8) |
| mcp-server/MCP_ENHANCEMENT_ROADMAP_v2.md | 33KB | 88 planned features |
