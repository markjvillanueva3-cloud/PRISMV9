# Cross-Directory Audit — 2026-03-04

## Sources Audited
1. `C:\PRISM` — Live codebase (mcp-server + cad-engine + data/)
2. `C:\PRISM_ARCHIVE_2026-02-01` — Pre-rebuild archive snapshot
3. `C:\Users\Admin.DIGITALSTORM-PC\Box\PRISM REBUILD` — Box cloud sync

## Current Live State
- 53 dispatchers, 220 engines, 52 algorithms, 500 formulas, 15 registries
- 2412 backend + 76 web + 11 E2E + 2085 cad-engine tests
- 95/95 milestones complete

## Gap Categories

### TIER 1: Wire Existing Code (~17K lines, pre-built)
- 15 `*_mcp.py` wrappers: attention, batch, cache, context, efficiency, error, formula, gsd, handoff, hook, prompt, resource, resume, skill, state
- D3 Learning: pattern_detector, learning_store, error_extractor, lkg_tracker, priority_scorer, event_logger
- D4 Performance: computation_cache, diff_based_updates, diff_engine, template_optimizer, batch_processor, queue_manager, efficiency_controller
- D5 Session: session_lifecycle, resume_detector, resume_validator, next_session_prep, state_reconstructor, state_version, master_orchestrator_v2, checkpoint_mapper, gsd_sync
- D6 Code Intel: semantic_code_index, prompt_builder, skill_preloader, skill_loader, resource_accessor
- D9 Other: agent_mcp_proxy (1001L), manus_context_engineering (855L), incremental_file_sync (844L), state_server (924L), phase0_hooks (765L)

### TIER 2: JS→TS Engine Ports
Business (11): Financial, Inventory, Job Costing, Job Shop Scheduling, Job Tracking, Order Manager, Purchasing, Quoting, Reporting, Scheduling, Subscription
Post-Processor (11): 100%, V2, Backplot, Programming, Guaranteed, Internal, Integration, Database V2, Engine, Generator, RL
Physics Root (18): Chatter, Cutting Mechanics, Cutting Physics, Cutting Thermal, Heat Transfer, Intelligent Cutting, Johnson-Cook, Phase1 SFC, Phase3 Signal, Phase3 Mfg Physics, Rigid Body, Surface Finish, Thermal Expansion, Thermal Modeling, Tool Life, Vibration, Advanced Kinematics, Speed Feed UI
AI/ML (76 files): Active Learning, DQN, GNN, LSTM, Monte Carlo, NLP, OCR, Transformer, XAI, etc.
Optimization (25): ACO, Feed Optimizer, Interior Point, MOEAD, Multi-Objective, SQP, Trust Region, etc.
CAD/CAM (55): Adaptive Clearing, B-Rep, BVH, Clipper2, Feature Recognition, Lathe Toolpath, NURBS, Rest Machining, Voronoi, Voxel Stock, etc.

### TIER 3: Archive Data
Controller Alarms: 12 families × verified/accurate, 10K+ entries (PRISM_ARCHIVE)
Algorithm Registry: 285 algorithms mapped to MIT courses (PRISM_ARCHIVE)
Expert Persona Skills: 10 domain experts (PRISM_ARCHIVE)
SP.1 Socratic Skills: 8-step methodology (PRISM_ARCHIVE)
Swarm Orchestrator: prism_unified_system_v4.py with 54 agents (PRISM_ARCHIVE)

### TIER 4: Knowledge Sources
225 MIT courses (Box/MIT COURSES/)
35+ manufacturer PDF catalogs (Box/RESOURCES/)
12 machine simulation models (Box/RESOURCES/)
25+ tool holder STEP files (Box/RESOURCES/)
Source monolith: 986K lines (Box/_BUILD/)

### TIER 5: Specs Ready to Build
D7: Append-Only State Protocol (docs/APPEND_ONLY_STATE_PROTOCOL.md, 395L)
M2: Tools Database (docs/TOOLS_DATABASE_BRAINSTORM.md, 675L)
M3: Tool Holder DB Upgrade (docs/TOOL_HOLDER_DATABASE_ROADMAP_v4.md)
M6: SFC Enhancement (docs/SPEED_FEED_CALCULATOR_ENHANCEMENT_PLAN.md, 984L)

## Recommended Execution Order
1. Tier 1 D9 MCP wrappers (15 modules, lowest effort)
2. Tier 2 Business engines (11, high user value)
3. Tier 1 D3-D5 Python modules (learning, caching, session)
4. Tier 3 Controller Alarm DB integration
5. Tier 2 Post-processor engines
6. Tier 5 D7 Append-Only State
7. Tier 2 Physics root engines
8. Tier 2 Key algorithms (FFT Chatter, Taylor Advanced, Graph)
