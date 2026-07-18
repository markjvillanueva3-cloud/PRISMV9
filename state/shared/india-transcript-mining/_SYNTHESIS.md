# India / PRISM-AI-systems CROSS-SESSION SYNTHESIS (5 of 92 mineable sessions, model gpt-oss:120b, 2026-06-26)

## Shipped capabilities
- **YouTube→Tribal promotion** (`b8acbfcf5c`): step 1 of cron enabled; 28 CAD videos → 164 new tips.  
- **Web‑source `/learn` lane** (`4bea1df390`, `df7a4c4d26`, `db58fa2886`): fetch→strip→Ollama tip‑gen, 11/11 tests passed, 157 web tribal tips promoted (store 1482→1639).  
- **CAD calibration loop** (`1a910d6015` – U‑CAD‑LEARN‑CALIBRATE): logit‑shift & shrinkage auto‑correction, 3‑of‑3 scrutiny.  
- **CAD text‑to‑prompt reverse arrow** (`50bd919799` – U‑CAD‑TEXT‑LEARN‑PROMPT): inject learned failure modes, 2‑arm review passed.  
- **Video‑transcript drain** (`U-CAD-LEARN-VIDEO-TRANSCRIPT-DRAIN`): parses .vtt/.srt, 351 transcripts → ~2 k segments each, no duplicate via hash, 17/17 tests.  
- **LoRA pair builder** (`55cf3dd18d` – U‑BPA‑LORA‑PAIRS‑WIRE): adds `empty:true`, 3/3 scrutiny, 15/15 tests.  
- **KNN retriever** (`10735ad466` – U‑QP‑SIMILAR‑JOB‑RETRIEVE): thin wrapper over pre‑computed vectors, 19/19 reference‑value tests.  
- **GNN vault label wiring** (`d5ff9fdf90`, `5114e25fc0`): 11 labels added, macro‑F1 gate 0.55 (current 0.439), AUROC ≥ 0.78 target (current 0.772).  
- **Octopus utilization driver + cron** (`7acb5253a5`): rotates 10‑question pool, drives consensus, Ollama inference, Hermes voice, Obsidian write‑back, PSN ledger; ledger grew 62→65, throughput 80–200 tps (7B) / 36–44 tps (14B).  
- **Ollama stress harness & `num_ctx` fix** (`d79f06d849`, `52bbd7bedb`, `f190542258`): concurrency knee at c=2, safe up to c=4, long‑context success 100 % @16K tokens, wedge eliminated.  
- **Codegen & other batteries** (`135fdb5a2e`, `f00515f3d7`): robust code generation, JSON schema handling, instruction precision; 100 % long‑context handling at 16K.  

## Key decisions + rationale
- Arm YouTube→tribal promotion step in existing cron (enables automated tip flow).  
- Fix `parseInt("0.9")` bug & align installer to SSOT (`ConfThreshold=0.9`) to restore wiki gate integrity.  
- Build web‑source lane with 0‑tip skip and proper tip shape; validate via real drain pipeline, curate 33 sources.  
- Run harvest in background; re‑harvest remaining ~17 sources in ≤5‑source batches to avoid fleet‑reaper >10 min kill.  
- Deploy autonomous “PRISM Web Source Drain” task with per‑run cap for future curation.  
- Do **not** rebuild any already‑shipped unit (R8); only add new knowledge.  
- Add video‑transcript drain for MIT/college lecture captions; tests passed, no duplication.  
- Route RL‑CAM feedback engine arity mismatch to owner (no auto‑fix).  
- De‑orphan LoRA pair builder, add `empty:true` flag to prevent silent empty footgun.  
- Use thin KNN wrapper instead of custom retriever; ship only loops that close prediction→outcome→retrain.  
- Require `/compact` or `/clear` reset before further builds; halt due to quota block until account‑switch re‑arm.  
- Move fleet‑reaper ownership from *alpha* to *golf*; use `/checkin-golf`.  
- Wire `num_ctx` fix into Ollama offload path; add wedge‑guard recover & probe chain for clean metrics.  

## Standing operator directives
- Enhance CAD drawing, print generation, Fusion/HyperCAD/Mastercam pipelines via Hermes CLI/agents, Ollama offloading, Octopus, engineered loops/crons, JM files, Obsidian vault.  
- Inject tribal knowledge (ZULU) and run `/learn` pipeline on **all** CAD/engineering sources in `H:\PRISM\resources` plus MIT/college directories; include videos & reputable online media, avoid duplication.  
- Apply Windows 125 % scaling (or disable HW acceleration) to fix Electron app blur.  
- Execute GPU retraining for NN/GNN (`nn-graph-retrain-lifecycle.mjs --force`) after reset.  
- Scope CAM design as two‑phase process; route CAD swap through delta+xray cross‑lane.  
- Disarm autonomous loops if desired.  
- Expand Octopus driver coverage to **all 34 galaxies**.  
- Re‑arm account switch (`node scripts/arm-account-switch.mjs --auto`) and capture credentials (`capture-claude-credentials.mjs`).  

## Open threads / next levers
- Re‑harvest remaining ~17 web sources in ≤5‑source batches; avoid fleet‑reaper kill.  
- Arm “PRISM Web Source Drain” with small per‑run cap; consider Playwright fetch for JS‑rendered sites (operator‑approved).  
- Add P2 seam‑regression test for web tip shape consistency.  
- Implement tribal injection into Print→CAD cross‑lane (coordinate with Xray/Delta GenerationBackend).  
- Expand ingestion beyond local PDFs/transcripts to reputable online videos/media.  
- Run full‑coverage GNN GPU retrain (+11 labels), re‑grade macro‑F1, target AUROC ≥ 0.78.  
- Build quoting corpus loader/featurizer (coordinate Charlie/Jüliett).  
- Redesign RL‑CAM feedback engine `step()` signature (Lima).  
- Resolve self‑compact YELLOW bug and migration‑freeze flag to enable NN‑Graph retrain.  
- Close Ollama suggestion→execution gap (209 suggestions vs 5 executed); tune `OLLAMA_NUM_PARALLEL` / `OLLAMA_MAX_LOADED_MODELS`.  
- Continue stress testing for codegen, instruction precision, manufacturing‑domain tasks.  

## Recurring findings + bugs
- `parseInt("0.9")` bug collapsed wiki gate → fixed.  
- Installer divergence (default threshold, missing cron step) → aligned to SSOT.  
- Web lane tips lacked `source`; ingestion error on `.toLowerCase()` → added source field validation.  
- 0‑tip artifacts from JS‑rendered pages → skip logic implemented.  
- Harvest exited code 255 due to fleet‑reaper >10 min kill; stale lock cleared.  
- Calibration loop measured error but did not act → fixed with logit‑shift.  
- Text→CAD bridge missing reverse arrow → added `loadLearnedRisk()`.  
- Print→CAD path lacked tribal injection → pending cross‑lane work.  
- MIT/college transcript drain previously absent → now built.  
- RL‑CAM feedback engine arity mismatch → routed to owner.  
- LoRA pair builder silent‑empty footgun → fixed with `empty:true`.  
- Integration drift corrected (dispatcher contract).  
- AUROC regression after mass label dump (0.789→0.772); macro‑F1 below gate (0.439 vs 0.55 target).  
- Electron app blur due to scaling; resolved via 125 % scaling or HW accel disable.  
- KV‑cache wedge at concurrency c=8 → eliminated by per‑request `num_ctx` fix; safe up to c=4.  
- Octopus substrate dormant → driver activated.  

## AI-system metrics + deploy-gate state
- **Web‑source lane**: 11/11 tests passed, P0 bug fixed, ledger ↑ 157 tips (1482→1639).  
- **CAD calibration loop**: Brier score & calibration error logged; auto‑correction applied.  
- **Video‑transcript drain**: 351 transcripts → ~702 k segments processed, hash‑deduplication confirmed.  
- **LoRA pair builder**: 3/3 scrutiny, 15/15 unit tests.  
- **KNN retriever**: 19/19 reference‑value checks passed.  
- **GNN labeling engine**: macro‑F1 0.439 (gate 0.55), AUROC 0.772 (target ≥ 0.78).  
- **Octopus driver**: ledger entries 62→65, throughput 80–200 tps (7B) / 36–44 tps (14B); concurrency safe ≤2, wedge at 8 resolved.  
- **Ollama stress harness**: concurrency knee c=2, safe up to c=4; long‑context success 100 % @16K tokens after `num_ctx` fix.  
- **Codegen batteries**: 100 % long‑context handling, robust JSON schema processing, CJK truncation fixed.  
- All shipped units passed required scrutiny (2‑of‑2 or 3‑of‑3) and test suites; pending units (GNN full retrain, NN_TIER05, cross‑lane corpus loader) await operator gate.
