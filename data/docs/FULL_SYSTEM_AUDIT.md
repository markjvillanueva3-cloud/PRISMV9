# PRISM FULL SYSTEM AUDIT
## Date: 2026-02-10 | Auditor: Claude + MARK
## Purpose: Inventory everything built, wired, unwired, and lost

---

# SECTION 1: TYPESCRIPT INFRASTRUCTURE

## 1A. Dispatchers (27 total, ALL operational)

| # | Dispatcher | Actions | Source File | Status |
|---|-----------|---------|-------------|--------|
| 1 | prism_data | 14 | dataDispatcher.ts | ✅ LIVE |
| 2 | prism_orchestrate | 14 | orchestrationDispatcher.ts | ✅ LIVE |
| 3 | prism_hook | 18 | hookDispatcher.ts | ✅ LIVE |
| 4 | prism_skill_script | 23 | skillScriptDispatcher.ts | ✅ LIVE |
| 5 | prism_calc | 21 | calcDispatcher.ts | ✅ LIVE |
| 6 | prism_session | 26 | sessionDispatcher.ts | ✅ LIVE |
| 7 | prism_generator | 6 | generatorDispatcher.ts | ✅ LIVE |
| 8 | prism_validate | 7 | validationDispatcher.ts | ✅ LIVE |
| 9 | prism_omega | 5 | omegaDispatcher.ts | ✅ LIVE |
| 10 | prism_manus | 11 | manusDispatcher.ts | ✅ LIVE |
| 11 | prism_sp | 19 | spDispatcher.ts | ✅ LIVE |
| 12 | prism_context | 18 | contextDispatcher.ts | ✅ LIVE |
| 13 | prism_gsd | 6 | gsdDispatcher.ts | ✅ LIVE (hardcoded strings!) |
| 14 | prism_autopilot_d | 8 | autoPilotDispatcher.ts | ✅ LIVE |
| 15 | prism_ralph | 3 | ralphDispatcher.ts | ✅ LIVE (needs API key) |
| 16 | prism_doc | 7 | documentDispatcher.ts | ✅ LIVE |
| 17 | prism_dev | 9 | devDispatcher.ts | ✅ LIVE |
| 18 | prism_guard | 14 | guardDispatcher.ts | ✅ LIVE |
| 19 | prism_atcs | 10 | atcsDispatcher.ts | ✅ LIVE |
| 20 | prism_autonomous | 8 | autonomousDispatcher.ts | ✅ LIVE |
| 21 | prism_telemetry | 7 | telemetryDispatcher.ts | ✅ LIVE (rebuilt v2.0) |
| 22 | prism_pfp | 6 | pfpDispatcher.ts | ✅ LIVE |
| 23 | prism_memory | 6 | memoryDispatcher.ts | ✅ LIVE |
| 24 | prism_thread | 12 | threadDispatcher.ts | ✅ LIVE |
| 25 | prism_toolpath | 8 | toolpathDispatcher.ts | ✅ LIVE |
| 26 | prism_safety | 29 | safetyDispatcher.ts | ✅ LIVE |
| 27 | prism_knowledge | 5 | knowledgeDispatcher.ts | ✅ LIVE |

## 1B. Engines (27 files in src/engines/)

| Engine | File | Lines | Status | Used By |
|--------|------|-------|--------|---------|
| AdvancedCalculations | AdvancedCalculations.ts | ? | ✅ | calcDispatcher |
| AgentExecutor | AgentExecutor.ts | ? | ✅ | orchestrationDispatcher |
| BatchProcessor | BatchProcessor.ts | 234 | ✅ | D4 cadence @8 calls |
| CalcHookMiddleware | CalcHookMiddleware.ts | ? | ✅ | calcDispatcher hooks |
| CertificateEngine | CertificateEngine.ts | ? | ✅ | autoHookWrapper (F4) |
| CollisionEngine | CollisionEngine.ts | ? | ✅ | safetyDispatcher |
| ComputationCache | ComputationCache.ts | 421 | ✅ | autoHookWrapper dispatch loop |
| CoolantValidationEngine | CoolantValidationEngine.ts | ? | ✅ | safetyDispatcher |
| DiffEngine | DiffEngine.ts | 197 | ✅ | D4 cadence @15 calls |
| EventBus | EventBus.ts | ? | ✅ | hookDispatcher |
| HookEngine | HookEngine.ts | ? | ✅ | hookDispatcher, registration |
| HookExecutor | HookExecutor.ts | ? | ✅ | autoHookWrapper (blocking) |
| KnowledgeQueryEngine | KnowledgeQueryEngine.ts | ? | ✅ | knowledgeDispatcher |
| ManufacturingCalculations | ManufacturingCalculations.ts | ? | ✅ | calcDispatcher |
| MemoryGraphEngine | MemoryGraphEngine.ts | ? | ✅ | autoHookWrapper (F2) |
| PFPEngine | PFPEngine.ts | ? | ✅ | pfpDispatcher |
| PredictiveFailureEngine | PredictiveFailureEngine.ts | ? | ✅ | pfpDispatcher (config fixed) |
| ScriptExecutor | ScriptExecutor.ts | ? | ✅ | skillScriptDispatcher |
| SkillExecutor | SkillExecutor.ts | ? | ✅ | skillScriptDispatcher |
| SpindleProtectionEngine | SpindleProtectionEngine.ts | ? | ✅ | safetyDispatcher |
| SwarmExecutor | SwarmExecutor.ts | ? | ✅ | orchestrationDispatcher |
| TelemetryEngine | TelemetryEngine.ts | 609 | ✅ | telemetryDispatcher (rebuilt v2.0) |
| ThreadCalculationEngine | ThreadCalculationEngine.ts | ? | ✅ | threadDispatcher |
| ToolBreakageEngine | ToolBreakageEngine.ts | ? | ✅ | safetyDispatcher |
| ToolpathCalculations | ToolpathCalculations.ts | ? | ✅ | toolpathDispatcher |
| WorkholdingEngine | WorkholdingEngine.ts | ? | ✅ | safetyDispatcher |
| index.ts | index.ts | ? | ✅ | barrel export |

## 1C. Auto-Hook Wrapper (autoHookWrapper.ts — 1351 lines)

25 cadence auto-functions, ALL wired:

### Every-Call Auto-Functions:
| Function | Source | Calls Python? | Status |
|----------|--------|---------------|--------|
| autoInputValidation | cadenceExecutor | No (TS-native) | ✅ |
| Computation cache get/set | ComputationCache.ts | No | ✅ |
| slimJsonResponse | responseSlimmer.ts | No | ✅ |
| autoErrorLearn | cadenceExecutor | No (TS-native) | ✅ |
| autoD3ErrorChain | cadenceExecutor | YES (3 Python scripts) | ✅ |
| autoD3LkgUpdate | cadenceExecutor | YES (lkg_tracker.py) | ✅ |
| telemetryEngine.record | TelemetryEngine.ts | No | ✅ |
| memoryGraphEngine.capture | MemoryGraphEngine.ts | No | ✅ |
| certificateEngine.generate | CertificateEngine.ts | No | ✅ |
| autoAntiRegression | cadenceExecutor | No (TS-native) | ✅ (on file_write) |
| autoDecisionCapture | cadenceExecutor | No (TS-native) | ✅ (on file_write) |
| autoQualityGate | cadenceExecutor | No (TS-native) | ✅ (on todo complete) |
| recordFlightAction | cadenceExecutor | No | ✅ |

### Periodic Cadence Functions:
| Function | Frequency | Calls Python? | Status |
|----------|-----------|---------------|--------|
| autoTodoRefresh | @5 calls | No (TS-native) | ✅ |
| autoContextPressure | @8 calls | No (TS-native) | ✅ |
| autoAttentionScore | @8 calls | YES (attention_scorer.py) | ✅ |
| autoD4BatchTick | @8 calls | No (BatchProcessor.ts) | ✅ |
| autoCheckpoint | @10 calls | No (TS-native) | ✅ |
| autoCompactionDetect | @12 calls | No (TS-native) | ✅ |
| autoPythonCompactionPredict | @12 calls | YES (compaction_detector.py) | ✅ |
| autoD4CacheCheck | @15 calls | No (ComputationCache.ts) | ✅ |
| autoD4DiffCheck | @15 calls | No (DiffEngine.ts) | ✅ |
| autoTelemetrySnapshot | @15 calls | No (TelemetryEngine.ts) | ✅ |
| SURVIVAL_CHECKPOINT_15 | @15 calls | No (TS-native) | ✅ |
| autoVariationCheck | @20 calls | No (TS-native) | ✅ |

### Pressure-Triggered:
| Function | Trigger | Calls Python? | Status |
|----------|---------|---------------|--------|
| autoContextCompress | ≥70% pressure | No (TS-native) | ✅ |
| autoCompactionSurvival | ≥60% + @10 + @15 + @41 | No (TS-native) | ✅ |
| autoPythonCompress | >70% pressure | YES (auto_compress.py) | ✅ |
| autoPythonExpand | <40% pressure | YES (context_expander.py) | ✅ |
| autoContextPullBack | <40% pressure | No (TS-native) | ✅ |

### First-Call Only:
| Function | Status |
|----------|--------|
| autoPreTaskRecon | ✅ |
| autoWarmStartData | ✅ |
| autoKnowledgeCrossQuery | ✅ |
| autoScriptRecommend | ✅ |
| autoContextRehydrate | ✅ |

### Special Triggers:
| Function | Trigger | Status |
|----------|---------|--------|
| autoSkillHint | After calc/safety/thread/toolpath/atcs | ✅ |
| autoKnowledgeCrossQuery | After calc/safety/thread/data/atcs | ✅ |
| Build checklist | After prism_dev build success | ✅ |
| Safety score track | After prism_safety calls | ✅ |
| ATCS emergency save | At 41+ calls | ✅ |

## 1D. Hook System (112/112 registered)

| Category | Count | Status |
|----------|-------|--------|
| Pre/Post Calculation | 18 | ✅ |
| File Write | 9 | ✅ |
| Error | 5 + D3 | ✅ |
| Outcome | 9 + D3 | ✅ |
| Pre-Output (BLOCKING) | 2 | ✅ |
| Domain hooks total | 112 | ✅ |
| Built-in hooks | 6 | ✅ |

---

# SECTION 2: PYTHON MODULES — WIRING STATUS

## 2A. Python Scripts Called by Dispatchers (WIRED)

| Python Module | Lines | Called By | Via |
|---------------|-------|----------|-----|
| wip_capturer.py | 624 | sessionDispatcher wip_capture/list | execSync |
| wip_saver.py | 465 | sessionDispatcher (via capturer) | execSync |
| state_rollback.py | 528 | sessionDispatcher state_rollback | execSync |
| recovery_scorer.py | 556 | sessionDispatcher resume_score | execSync |
| graceful_shutdown.py | 517 | sessionDispatcher session_end | execSync |

## 2B. Python Scripts Called by Cadence (WIRED)

| Python Module | Lines | Called By | Frequency |
|---------------|-------|----------|-----------|
| attention_scorer.py | 445 | autoAttentionScore | @8 calls |
| compaction_detector.py | 487 | autoPythonCompactionPredict | @12 calls |
| auto_compress.py | 344 | autoPythonCompress | >70% pressure |
| context_expander.py | 328 | autoPythonExpand | <40% pressure |
| error_extractor.py | 404 | autoD3ErrorChain | every error |
| pattern_detector.py | 484 | autoD3ErrorChain | every error |
| learning_store.py | 423 | autoD3ErrorChain | every error |
| lkg_tracker.py | 494 | autoD3LkgUpdate | every success |

## 2C. Python Scripts BUILT but NOT WIRED (51 modules)

### D4 Performance (partially wired via TS engines, Python unused):
| Module | Lines | Status |
|--------|-------|--------|
| computation_cache.py | 802 | ⚠️ TS ComputationCache.ts used instead |
| diff_based_updates.py | 908 | ⚠️ TS DiffEngine.ts used instead |
| diff_engine.py | 630 | ⚠️ TS DiffEngine.ts used instead |
| template_optimizer.py | 555 | ❌ NOT WIRED |
| batch_processor.py | 457 | ⚠️ TS BatchProcessor.ts used instead |
| queue_manager.py | 546 | ❌ NOT WIRED |
| efficiency_controller.py | 387 | ❌ NOT WIRED |

### D5 Session Orchestration (ALL unwired):
| Module | Lines | Status |
|--------|-------|--------|
| session_lifecycle.py | 811 | ❌ NOT WIRED |
| resume_detector.py | 524 | ❌ NOT WIRED |
| resume_validator.py | 712 | ❌ NOT WIRED |
| next_session_prep.py | 508 | ❌ NOT WIRED |
| state_reconstructor.py | 538 | ❌ NOT WIRED |
| state_version.py | 495 | ❌ NOT WIRED |
| master_orchestrator_v2.py | 641 | ❌ NOT WIRED |
| checkpoint_mapper.py | 495 | ❌ NOT WIRED |
| gsd_sync.py | 479 | ❌ NOT WIRED — THIS IS THE ONE THAT KEEPS GSD IN SYNC |

### D6 Code Intelligence (ALL unwired):
| Module | Lines | Status |
|--------|-------|--------|
| semantic_code_index.py | 1502 | ❌ NOT WIRED |
| prompt_builder.py | 454 | ❌ NOT WIRED |
| skill_preloader.py | 418 | ❌ NOT WIRED |
| skill_loader.py | 488 | ❌ NOT WIRED |
| resource_accessor.py | 647 | ❌ NOT WIRED |

### D9 Remaining (ALL unwired):
| Module | Lines | Status |
|--------|-------|--------|
| agent_mcp_proxy.py | 1001 | ❌ |
| manus_context_engineering.py | 855 | ❌ |
| incremental_file_sync.py | 844 | ❌ |
| state_server.py | 924 | ❌ |
| phase0_hooks.py | 765 | ❌ — 39 HOOK DEFINITIONS sitting unused |
| file_sync.py | 426 | ❌ |
| prism_enhanced_wiring.py | 278 | ❌ |
| mcp_orchestrator.py | 276 | ❌ |
| skill_generator_v2.py | 520 | ❌ |
| skill_generator.py | 208 | ❌ |

### 15 Pre-Shaped MCP Wrappers (ALL unwired):
| Module | Lines | Status |
|--------|-------|--------|
| attention_mcp.py | ~320 | ❌ Already MCP-shaped, just needs registration |
| batch_mcp.py | ~320 | ❌ |
| cache_mcp.py | ~320 | ❌ |
| context_mcp.py | ~320 | ❌ |
| efficiency_mcp.py | ~320 | ❌ |
| error_mcp.py | ~320 | ❌ |
| formula_mcp.py | ~320 | ❌ |
| gsd_mcp.py | ~320 | ❌ |
| handoff_mcp.py | ~320 | ❌ |
| hook_mcp.py | ~320 | ❌ |
| prompt_mcp.py | ~320 | ❌ |
| resource_mcp.py | ~320 | ❌ |
| resume_mcp.py | ~320 | ❌ |
| skill_mcp.py | ~320 | ❌ |
| state_mcp.py | ~320 | ❌ |

### Other Scripts (various directories):
| Directory | Count | Purpose |
|-----------|-------|---------|
| scripts/validation/ | 7 | Material/physics/data validators |
| scripts/extraction/ | 4 | Monolith extraction tools |
| scripts/testing/ | 13 | Utilization/regression/enhancement tests |
| scripts/state/ | 4 | State management |
| scripts/integration/ | 5 | Sync, export, DB tools |
| scripts/batch/ | 7 | Batch material/extraction processors |
| scripts/automation/ | 4 | Template gen, git, auto context |
| scripts/audit/ | 5 | Utilization, schema, gap finding |
| scripts/agents/ | 2 | Agent definitions, orchestrator patch |
| scripts/tools/ | 2 | Tool database generators |
| scripts/ (root) | 8 | GSD startup, registry builder, etc |
| TOTAL | 61 | Various utilities |

---

# SECTION 3: SKILLS (131 registered, unknown % stale)

Skills directory: C:\PRISM\skills-consolidated\
Total: 108 directories + 2 standalone .md files

### Skills Updated This Session (2026-02-10):
- prism-session-buffer: REWRITTEN (386→70 lines) ⚠️ LOST CONTENT
- prism-context-pressure: REWRITTEN (341→102 lines) ⚠️ LOST CONTENT  
- prism-task-continuity: UPDATED (added compaction recovery section)

### Skills with Unknown Staleness:
ALL OTHER 105 SKILLS — last audit date unknown.
Many likely reference v15/v19 buffer zones, old dispatcher counts, old cadence frequencies.

---

# SECTION 4: REGISTRIES

| Registry | Count | File |
|----------|-------|------|
| Materials | 521 loaded (2805 in full DB) | Various data files |
| Machines | 402 | data/machines/ |
| Tools | 0 (empty!) | — |
| Alarms | 10,033 | data files |
| Formulas | 515 | FORMULA_REGISTRY.json |
| Agents | 75 | — |
| Hooks | 25 (registry) + 112 (domain) | — |
| Skills | 131 | skills-consolidated/ |
| Scripts | 27 (registered) of 154 total | scripts/ |

---

# SECTION 5: STRUCTURAL PROBLEMS IDENTIFIED

## Problem 1: GSD Hardcoded Strings
gsdDispatcher.ts serves GSD content from hardcoded strings. GSD_v20.md on disk
is never read. Every GSD update requires code change + build. Content is lost
on each rewrite.
**Fix:** Read from data/docs/gsd/ directory files.

## Problem 2: Skills Overwritten, Not Evolved  
386-line skill reduced to 70 lines. Anti-patterns, examples, task-specific rules
all deleted. No changelog. No version tracking.
**Fix:** Append-first protocol. Mark outdated sections deprecated, don't delete.
Anti-regression check on skill file sizes.

## Problem 3: 51 Python Modules Sitting Unused
35,279 lines of code written across D3-D9 phases. Only 13 modules actually
called by dispatchers/cadence. The other 51 do nothing.

## Problem 4: gsd_sync.py Exists But Not Wired
There is literally a Python module (479 lines) designed to keep GSD in sync
with actual state after builds. It's never been wired. This would have
prevented the stale GSD problem.

## Problem 5: phase0_hooks.py Has 39 Hook Definitions
765 lines of hook definitions sitting in a Python file, never registered.
These could be complementing the 112 domain hooks already live.

## Problem 6: 15 MCP Wrappers Pre-Shaped
~4,800 lines of Python code already formatted as MCP tool definitions
(with schemas, handlers, etc). Just needs registration. Never registered.

## Problem 7: 127 Scripts Not in Script Registry
154 Python scripts on disk, only 27 registered in ScriptRegistry.
The autoScriptRecommend function can only recommend registered scripts.

## Problem 8: Tool Registry Empty
ToolRegistry loaded: 0 tools. This is a cutting tool registry for
manufacturing — should have thousands of entries.

## Problem 9: No Anti-Regression on Documentation
Anti-regression checks exist for code files but not for skills, GSD,
hook definitions, or docs. Content shrinkage goes undetected.

---

# SECTION 6: IMMEDIATE ACTION ITEMS

## Priority 1: Stop Losing Knowledge
1. Refactor gsdDispatcher to read from files (not hardcoded strings)
2. Wire gsd_sync.py to auto-update GSD after builds
3. Add anti-regression checks to skill file sizes
4. Add changelogs to all skills and docs

## Priority 2: Wire D5 (Session Orchestration)
The 9 modules (5,203 lines) that make session handoffs reliable.
Most impactful: next_session_prep.py, resume_detector.py, gsd_sync.py

## Priority 3: Register Missing Scripts
Add remaining 127 scripts to ScriptRegistry so autoScriptRecommend
can find them.

## Priority 4: Wire phase0_hooks.py
39 hook definitions sitting unused. Register them.

## Priority 5: Wire 15 MCP Wrappers
Pre-shaped MCP tool definitions. Fastest integration possible.
