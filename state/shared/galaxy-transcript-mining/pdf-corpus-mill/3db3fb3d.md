# pdf-corpus-mill session 3db3fb3d (2026-05-20, 32.7MB, spine 155KB, 2 slice(s), model gpt-oss:20b)

**SHIPPED**  
- HyperMillACBridgeEngine (~400 LOC HTTP server)  
- `prism_ac` Python module (host‑side AC API wrapper)  
- Dispatcher actions: `cam_hypermill_drive`; `cam_hypermill_ac_bridge_start/stop/status`  
- 31‑case vitest suite + LIVE scaffold for bridge testing  
- HYPERCAD‑TEST‑PLAYBOOK operator runbook  
- Audit docs: ACSERVER‑BRIDGE‑AUDIT, PRINT‑TO‑INSPECTION‑PIPELINE‑V2, CAD‑PIPELINE‑AUDIT (amended)  
- `U-HMT-EMBED-INDEX-WIRE` commit 0c2d24ee10 – 3544 HM tips embedded into tribal‑index  
- `HM-TRAINING-EXHAUSTION-AUDIT-2026-05-20.html` audit companion  
- `U-HMT-HMACOLOR-EXTRACT` – 19 PDFs, 66 tips (commit pending)  
- `U-HMT-CONSUMER-MEASURE` commit 8878684498 – knowledgeStats added to two engines  
- `U-HMT-GRAPHSAGE-SEED‑HM` – seed applied & verification doc written  

**DECISIONS**  
- Switch live CNC data to Ethernet MTConnect/OPC‑UA (drop USB).  
- Extract Okuma CAS via Automation Center remote API; binary extraction infeasible.  
- Build HyperMill ACServer bridge stack for headless control.  
- Keep Fusion 360 default CAD, add hyperCAD‑S Route A in V2 spec for machine‑part modeling.  
- Adopt PRISM safety engine (`collision_check_full`, `validate_rapid_moves`, etc.) as collision‑avoidance base.  
- Embed knowledge_store docs into tribal‑index bucket; update embedder regex to include `hmautocolor`.  
- Use META artifact for deterministic re‑run verification.  
- Persist state via per‑agent handoff (`--source live-chat`); arm precompact guard.  
- Commit only changed files (pathspec) to avoid churn in shared tree.  

**OPERATOR DIRECTIVES**  
- Extract machine data by plugging laptop into USB ports (question).  
- Attempt CAS extraction from Windows OS (question).  
- Build all needed components; have hypercad key ready for testing.  
- `/forge‑audit‑v2` assess training resources, inject tribal knowledge & wiki into CAD AI systems; generate plan via `/forge7` and register `/yolo-mode` loop every 5 min.  
- Finish all 7 units of HM‑TRAINING‑WIRING‑PLAN‑2026‑05‑20 (`/loop [5m]`).  
- Resume hypercad/hypermill training after `/compact`.  

**FINDINGS/BUGS**  
- P0: write‑after‑destroy race in HyperMillACBridgeEngine – fixed.  
- P0: import casing mismatch in `HyperMILLAutomationBridge.js` – fixed.  
- P1: `geometry_json` mock missing `protocol_version` – patched.  
- P1 pending: mock branches for `extract_databases` / `optimize_ppp` in `HyperMillACScriptExecutor`.  
- P1 pending: localhost pin normalization in `HyperMillACServerConfig`.  
- Audit findings F1–F7 addressed; some awaiting review.  
- PDF extraction: ~927 tribal tips extracted; verify remaining docs.  
- F4: tribal‑embed‑index zero HM entries → fixed by embedding 3544 tips.  
- F1: `hyperCAD-S CAD_Manual` silent extraction failure (zero tips).  
- Four other docs yielded zero tips; 36 PDFs unprocessed → reduced to 8 after HMACOLOR.  
- GraphSAGE NN‑EVAL deferred (`poolSize=0`).  
- Peer git race blocked commit of HMACOLOR changes.  

**DOMAIN SPECIFICS**  
Engines:  
- `HyperMillACBridgeEngine`, `HyperMILLAutomationBridge`, `PrintToProgramPipelineEngine`, `PrintToCADOrchestratorEngine`, `HyperMillACConnectionManager`, `HyperMillACScriptExecutor`  
- `HyperMillDeepLearningEngine`, `CAMTrainingExtractionAggregatorEngine`  

Actions/Dispatchers:  
- `cam_hypermill_drive` (open, geometry, operation_tree, toolpaths, export_step, close)  
- `cam_hypermill_ac_bridge_start/stop/status`  
- `chat-slots.mjs`, `per-agent-handoff.mjs`, `stable-session-id.mjs`  

Metrics:  
- `collision_check_full`, `validate_rapid_moves`, `check_toolpath_collision`, `detect_near_miss`  
- tribal‑embed‑index count, META JSON (`embed_index_hm_count`, `F4_blind`)  

Paths:  
- `/forge‑audit‑v2` stages 0–7; `/forge7` plan generation; `/loop [5m]` re‑run registration  
- hypercad‑hypermill training corpus extraction scripts  
- `H:/prism/.claude/helpers/`, `state/shared/tribal-embed-index.json`, `scripts/embed-knowledge-store-into-tribal-index.mjs`  

**TOOLS USED**  
PRISM tools: `prism_machine_live` (MTConnect/OPC‑UA/MQTT), `prism_safety`, `prism_cam`, `prism_calc`, `prism_toolpath`  
Dispatchers: `camDispatcher.ts`  
Scripts/hooks: ACServer bridge code, vitest test harness, HYPERCAD‑TEST‑PLAYBOOK, audit scripts (`acserver-bridge-audit.md`, `print-to-inspection-pipeline-v2.md`)  
External: Ollama extractor for tribal knowledge; node scripts for inventory, synergy map, state snapshot  
PRISM helpers: `chat-slots.mjs`, `per-agent-handoff.mjs`, `stable-session-id.mjs`, `precompact-pending-guard.mjs`  
Other scripts: `embed-knowledge-store-into-tribal-index.mjs`, `hm-extraction-coverage.mjs`, `batch_extract_hmautocolor.py`, `targeted_extract_hm_training.py`  
Ollama `qwen2.5-coder:7b` for PDF extraction  
Node test framework (`node:test`) for embedder tests  

**OPEN THREADS**  
- Phase 1 scope binding statement pending.  
- Phase 3 verification‑feedback per finding not declared.  
- Phase 4 peer‑review dispatch not sent.  
- Phase 5 Karpathy checkpoint pending.  
- Phase 6 META artifact + HTML companion + CLAUDE.md back‑flow + `/loop 7d` self‑schedule not registered.  
- Phase 7 end‑state report not compiled.  
- `/forge7` plan generation & `/yolo-mode` loop registration pending.  
- Patch‑siblings for `HyperMillACScriptExecutor` mock branches, `HyperMillACServerConfig` localhost pin, CLAUDE.md regression lines awaiting merge.  
- Verify completeness of PDF extraction (remaining docs).  
- Fully integrate hyperCAD‑S Route A into V2 spec; confirm visual CAS status.  
- Run remaining background batch (`U‑HMT‑HYPERCAD‑REEXTRACT` + `U‑HMT‑V31‑EXTRACT`) to completion.  
- Commit pending HMACOLOR changes after `/compact`.  
- Execute `U‑HMT‑FUSION‑CAD‑FIX` script.  
- Resolve GraphSAGE seed & NN‑EVAL after fixing dependency bug.  
- Fix silent extraction failure for `hyperCAD-S CAD_Manual`.
