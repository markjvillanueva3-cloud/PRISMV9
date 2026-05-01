# W4 Assessment: 50 Unwired Python Modules (~24,153 lines)

## Tier 1: HIGH VALUE — Already have TS equivalents (DON'T WIRE, redundant)
These modules duplicate functionality that already exists in TypeScript engines:
- `computation_cache.py` (801L) — TS ComputationCache.ts (421L) already LIVE
- `diff_based_updates.py` (907L) — TS DiffEngine.ts (197L) already LIVE  
- `diff_engine.py` (629L) — duplicate of above
- `batch_processor.py` (456L) — TS BatchProcessor.ts (234L) already LIVE
- `event_logger.py` (477L) — TS flight recorder + session_events.jsonl already works
- `state_reconstructor.py` (537L) — TS replayEventLog in sessionDispatcher already works
- `state_version.py` (494L) — TS state_save/state_diff already handles versioning
- `wip_saver.py` (464L) — TS wip_capturer.py already wired
- `auto_compress.py` (343L) — TS context_compress + Python context_compressor.py already wired
**Subtotal: 5,108L — SKIP (redundant with existing TS)**

## Tier 2: HIGH VALUE — Wire as MCP dispatcher actions
These add genuinely new capabilities worth wiring:
- `semantic_code_index.py` (1501L) — Code search/indexing for PRISM codebase
- `resume_validator.py` (711L) — Validates resume quality (complements resume_detector)
- `template_optimizer.py` (554L) — Optimizes prompt templates for token efficiency
- `state_server.py` (923L) — Full state machine server (D5 enhancement)
- `checkpoint_mapper.py` (494L) — Maps checkpoint dependencies and ordering
- `queue_manager.py` (545L) — Task queue management for autonomous ops
- `prompt_builder.py` (453L) — Builds optimized prompts for manufacturing queries
- `skill_preloader.py` (417L) — Preloads skills based on task prediction
- `resource_accessor.py` (646L) — Unified resource access layer
- `clone_factory.py` (712L) — Creates agent clones for parallel work
**Subtotal: 6,956L — WIRE (high value)**

## Tier 3: MEDIUM VALUE — *_mcp.py proxy modules
These are MCP-style wrappers that were designed to be standalone MCP tools but PRISM now uses dispatcher pattern. Most are thin wrappers around core modules already wired:
- `attention_mcp.py` (276L) — wraps attention_scorer.py (already wired)
- `batch_mcp.py` (385L) — wraps batch_processor (TS already live)
- `cache_mcp.py` (272L) — wraps computation_cache (TS already live)
- `context_mcp.py` (195L) — wraps context tools (already wired)
- `efficiency_mcp.py` (285L) — wraps efficiency_controller
- `error_mcp.py` (348L) — wraps error_extractor (already wired)
- `formula_mcp.py` (422L) — wraps formula calculations
- `gsd_mcp.py` (120L) — wraps GSD (already have gsdDispatcher)
- `handoff_mcp.py` (358L) — wraps handoff prep (already in sessionDispatcher)
- `hook_mcp.py` (344L) — wraps hook management (already have hookDispatcher)
- `prompt_mcp.py` (294L) — wraps prompt_builder
- `resource_mcp.py` (335L) — wraps resource_accessor
- `resume_mcp.py` (432L) — wraps resume tools (already wired)
- `skill_mcp.py` (225L) — wraps skill tools (already have skillDispatcher)
- `state_mcp.py` (299L) — wraps state tools (already have sessionDispatcher)
**Subtotal: 4,590L — SKIP (thin wrappers, dispatchers already handle)**

## Tier 4: MEDIUM VALUE — Standalone utilities
- `context_pressure.py` (442L) — Pressure calculation engine
- `efficiency_controller.py` (386L) — Resource efficiency management
- `file_sync.py` (425L) — File synchronization between state locations
- `incremental_file_sync.py` (843L) — Incremental sync (advanced version)
- `manus_context_engineering.py` (854L) — Manus-style context optimization
- `skill_generator.py` (207L) — Generates skill definitions
- `skill_generator_v2.py` (519L) — v2 with enhanced generation
- `skill_loader.py` (487L) — Loads skills from disk
- `agent_mcp_proxy.py` (1000L) — Agent proxy for MCP operations
- `master_orchestrator.py` (525L) — Orchestrates multi-agent workflows
- `master_orchestrator_v2.py` (640L) — v2 orchestration
- `mcp_orchestrator.py` (275L) — MCP-level orchestration
- `prism_enhanced_wiring.py` (278L) — Wiring helper utilities
**Subtotal: 6,881L — SELECTIVE WIRE (pick best from each category)**

## Tier 5: LOW VALUE — Infrastructure/Config
- `config.py` (170L) — Shared config constants
- `utils.py` (249L) — Shared utility functions
- `logger.py` (199L) — Logging utilities
**Subtotal: 618L — SKIP (infrastructure, imported by other modules)**

---

## RECOMMENDATION: Wire Tier 2 selectively (6 highest-value modules)

### Priority Order:
1. `resume_validator.py` (711L) → sessionDispatcher `resume_score` (enhance)
2. `queue_manager.py` (545L) → autonomousDispatcher (enhance auto_execute)
3. `prompt_builder.py` (453L) → spDispatcher (enhance brainstorm/plan)
4. `template_optimizer.py` (554L) → new cadence auto-fire
5. `checkpoint_mapper.py` (494L) → sessionDispatcher (enhance checkpoint_enhanced)
6. `semantic_code_index.py` (1501L) → devDispatcher (enhance code_search)

### Remaining Tier 2 (defer to W5):
7. `skill_preloader.py` (417L)
8. `resource_accessor.py` (646L)
9. `clone_factory.py` (712L)
10. `state_server.py` (923L)

### Impact:
- 6 modules × avg 543L = ~3,258 lines wired
- Reduces unwired from 24,153 → ~20,895
- 15 modules (Tier 1+3) confirmed redundant = 9,698 lines safely skipped
- Effective unwired (non-redundant): ~14,455 lines
