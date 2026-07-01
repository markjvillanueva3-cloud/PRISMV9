# india session 9ac2ca4a (2026-06-26, 7.1MB, spine 60KB, 1 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `b8acbfcf5c` – armed youtube→tribal promotion (step 1 of tribal‑promotion cron). 28 CAD/machining videos → 164 new tips.  
- `ce931d7527` – fixed parseInt(“0.9”) → 90, restoring high‑confidence wiki gate.  
- `427b937d29` – aligned alternate installer to use the committed runner (SSOT).  
- `b0abcc1e93` – rewritten installer to register the committed cron directly (eliminates %TEMP% path and divergence).  
- `4bea1df390` – built web‑source `/learn` lane (`drain-web-sources-tribal.mjs`) with fetch → strip → Ollama tip‑gen → stage. 11/11 tests, P0 fixed.  
- `df7a4c4d26` – added `tipsToWebKnowledgeTips`, consumer‑validated; 8 web tips promoted (store 1474→1482).  
- `db58fa2886` – committed curated watchlist of 33 live‑validated sources (32/36 passed real fetch+strip).  
- Harvest run: 16/33 sources completed → 157 new web tribal tips promoted (store 1482→1639).  
- All commits passed 2‑of‑2 scrutiny gates.

**DECISIONS**  
- Arm youtube→tribal promotion step in existing cron.  
- Correct threshold parsing bug and align installer to SSOT.  
- Build web‑source lane using youtube primitives; add 0‑tip skip and proper tip shape.  
- Validate watchlist via real drain pipeline; curate 33 sources.  
- Run harvest in background, then promote staged tips.  
- Re‑harvest remaining ~17 sources in small batches to avoid fleet‑reaper >10 min kill.  
- Arm autonomous web‑drain task for future curation (no manual grinding).  

**OPERATOR DIRECTIVES**  
- Improve learning/AI systems for CAD drawing, print generation, Fusion/HyperCAD/Mastercam integration.  
- Utilize Hermes CLI, agents, Ollama offloading, octopus, harnesses, engineered loops, crons, JM files, Obsidian vault, full system capabilities.  
- Inject tribal knowledge; run Hermes `/learn` pipeline on all CAD/engineering sources in `H:\PRISM\resources` and other MIT/college course materials, including videos and reputable online sources (no duplication).  

**FINDINGS / BUGS**  
- Video promotion stalled: missing step 1 in cron.  
- ParseInt(“0.9”) bug collapsed wiki gate to 0 → promoted everything.  
- Installer divergence: default `$ConfThreshold=0.9` and omitted step 1.  
- Web lane staged raw tips lacking `source`; ingest threw on `toLowerCase()`.  
- 0‑tip artifacts from JS‑rendered pages; added skip logic.  
- Harvest exited 255 due to fleet‑reaper >10 min kill; stale lock cleared.  

**AI‑SYSTEM SPECIFICS**  
- Engines: `CADTrialErrorLearningEngine.ts`, `BlueprintLoRABridgeEngine.ts`, `BlueprintExtractionRAGEngine.ts`.  
- Actions: `cad_learning_*` (9 actions), `cad-text-to-cadquery.mjs`, `blueprint_rag_extract`, `blueprint_lora_prepare_set`.  
- Metrics: closed‑loop ledger records, no explicit AUROC/Brier/F1 reported; all loops verified via consumer promotion.  

**OPEN THREADS**  
- Re‑harvest ~17 remaining web sources in 5‑source batches (avoid >10 min kill).  
- Arm “PRISM Web Source Drain” task with small per‑run cap for future curation.  
- Optional Playwright fetch path for JS‑rendered sites (gated, operator‑approved).  
- Add P2 seam‑regression test for web tip shape consistency.
