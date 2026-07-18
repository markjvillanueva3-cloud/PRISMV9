# ai-training session 9ac2ca4a (2026-06-26, 7.1MB, spine 60KB, 1 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `b8acbfcf5c` – added youtube→tribal promotion step to tribal‑promotion cron (28 videos, 164 tips promoted).  
- `ce931d7527` – fixed threshold bug (`parseInt('0.9') → 0`) to `90`.  
- `427b937d29` – aligned alternate installer to committed runner (step 1 added, threshold set to 90).  
- `b0abcc1e93` – rewrote installer to register the committed cron directly (no `%TEMP%` copy).  
- `4bea1df390` – built web‑source extraction lane (`drain-web-sources-tribal.mjs`) using youtube primitives, staged only.  
- `df7a4c4d26` – added web‑specific normalizer to avoid ingest throw on raw tips; consumer‑validated.  
- `db58fa2886` – committed curated watchlist of 33 validated sources (32/36 passed live fetch).  

**DECISIONS**  
- Arm youtube→tribal promotion as part of existing cron instead of separate task.  
- Use single source‑of‑truth installer pointing to the committed runner.  
- Reuse youtube extraction primitives for web lane; keep staging only, rely on armed cron for promotion.  
- Batch remaining harvest sources in ≤5 per run to avoid fleet reaper >10 min kill.  
- Add Playwright fetch path as optional future enhancement for JS‑rendered sites.  

**OPERATOR DIRECTIVES** (verbatim)  
> “Improve the learning and AI systems for CAD drawing, print generation, print to CAD file in Fusion, HyperCAD and Mastercam. Utilize Hermes CLI capabilities, Hermes agents, Ollama offloading, Octopus harnesses, engineered loops, crons, JM files, Obsidian vault and full system capabilities. Include tribal knowledge injections. Run the Hermes /learn pipeline on all CAD and engineering related sources in H:\PRISM\resources and all other sources we have in the H drive from MIT and other college courses. Include videos and other reputable online sources; don’t duplicate knowledge.”

**FINDINGS/BUGS**  
- Video lane staged but never promoted → fixed by adding step 1 to cron.  
- Threshold parseInt bug collapsed wiki gate → corrected to 90.  
- Installer used `%TEMP%` copy, missing step 1 → rewritten for SSOT.  
- Web lane produced raw tips lacking `source`, causing ingest throw (P0) → added web normalizer.  
- Harvest killed by fleet reaper after ~12 min; resolved by batching and clearing stale lock.  

**DOMAIN SPECIFICS**  
- Actions: `cad_learning_*`, `blueprint_rag_extract`, `blueprint_lora_prepare_set`.  
- Dispatchers/engines: `CADTrialErrorLearningEngine.ts`, `BlueprintExtractionRAGEngine.ts`, `BlueprintLoRABridgeEngine.ts`.  
- Metrics/paths: `tribal_captured_tips.json` (capture store), `promoted-ledger.json`, `state/shared/youtube-extraction/night-queue.json`.  
- Watchlist: `db58fa2886` (33 sources).  

**TOOLS USED**  
- Slot claiming: `chat-slots.mjs`.  
- Drift audit: `audit-roadmap-drift.mjs`.  
- Checkin pipeline: `.claude/commands/checkin.md`.  
- Hermes CLI & agents, Ollama offloading, Octopus harnesses.  
- Node fetch, rtk grep, Bash scripts for validation.  

**OPEN THREADS**  
- Re‑harvest remaining ~17 sources in ≤5‑source batches to avoid reaper kill.  
- Arm a dedicated “PRISM Web Source Drain” task with small per‑run cap.  
- Optional Playwright node‑fetch path for JS‑rendered sites (future enhancement).  
- Add P2 seam‑regression test for web normalizer.
