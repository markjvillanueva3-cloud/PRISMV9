# cam session 9ac2ca4a (2026-06-26, 7.1MB, spine 60KB, 1 slice(s), model gpt-oss:20b)

**SHIPPED**  
- 7 commits delivering two fully‑validated `/learn` lanes:  
  - *Video lane* – youtube→tribal promotion cron armed, threshold bug fixed (`--threshold 0.9 → 90`), installer SSOT added. 28 CAD/print videos + 164 new tribal tips now in the injection store.  
  - *Web lane* – `drain-web-sources-tribal.mjs` built, raw‑tip ingest bug fixed, consumer‑validated promotion round‑trip. 33 live‑validated sources curated; 157 web tips promoted (store 1482→1639).  

**DECISIONS**  
- Keep the existing tribal promotion cron as single source of truth; add youtube→tribal step instead of creating a new task.  
- Use the same tip‑generation primitives from the youtube pipeline for the web lane to avoid duplication and maintain consistency.  
- Validate watchlist sources by running the real drain pipeline (node fetch + strip) rather than relying on agent hallucination.  
- Harvest remaining unpromoted web sources in bounded batches (`--max-sources 5`) to stay below fleet‑reaper timeout, then promote via the existing cron.  

**OPERATOR DIRECTIVES** *(verbatim)*  
- “Improve the learning and ai systems for cad drawing, print generation, print to cad file in fusion, hypercad and mastercam.”  
- “Utilize hermes cli capabilities, hermes agents, ollama offloading, octopus, harnesses, engineered loops, crons, jm files, obsidian vault and full system capabilities.”  
- “Zulu is adding more tribal knowledge so ensure your adding tribal knowledge injections.”  
- “Include videos and other reputable sources from online.”  

**FINDINGS/BUGS**  
- `parseInt('0.9') → 0` collapsed the wiki promotion gate; fixed to `90`.  
- Raw‑tip ingestion threw on missing `source`; added web‑specific normalizer (`tipsToWebKnowledgeTips`).  
- 32 of 36 candidate web sources validated by real drain pipeline; Wikipedia articles proved a static‑content goldmine.  
- Harvest killed after ~12 min by fleet‑reaper; remaining ~17 sources need re‑harvest in smaller batches.  

**DOMAIN SPECIFICS**  
- **Actions/dispatchers**: `cad_learning_*`, `cad-text-to-cadquery.mjs`, `blueprint_rag_extract`, `blueprint_lora_prepare_set`.  
- **Engines**: `CADTrialErrorLearningEngine.ts`, `BlueprintExtractionRAGEngine.ts`, `BlueprintLoRABridgeEngine.ts`.  
- **Metrics/paths**: tribal store (`mcp-server/state/tribal_captured_tips.json`), promotion ledger (`promoted-ledger.json`).  
- **Cron**: `prism-tribal-promotion-cron.ps1` (now includes youtube→tribal step).  

**TOOLS USED**  
- PRISM helpers: `/checkin-india`, `chat-slots.mjs`, `audit-roadmap-drift.mjs`.  
- Extraction scripts: `youtube-free-extract.mjs`, `promote-youtube-staged.mjs`, `drain-web-sources-tribal.mjs`.  
- Promotion runner: `prism-tribal-promotion-cron.ps1`.  
- Testing harnesses: 11/11 unit tests for web lane, consumer‑validation test.  

**OPEN THREADS**  
- Re‑harvest the ~17 remaining web sources in bounded batches (`--max-sources 5`).  
- Arm a dedicated “PRISM Web Source Drain” task (autonomous, nightly, reaper‑safe).  
- Optional Playwright/Node fetch path for JS‑rendered sites to increase tip yield.  
- Add a regression test for the web‑normalizer seam.
