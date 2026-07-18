# quoting session 9ac2ca4a (2026-06-26, 7.1MB, spine 60KB, 1 slice(s), model gpt-oss:20b)

**SHIPPED**  
- Video promotion loop armed: `youtube→tribal` step added to the existing cron (`b8acbfcf5c`).  
- Threshold parsing bug fixed (`parseInt('0.9') → 90`) (`ce931d7527`).  
- Installer aligned to point directly at committed runner (SSOT) (`427b937d29 + b0abcc1e93`).  
  *Result*: 28 videos, 164 new tribal tips promoted.  
- Web extraction lane built and consumer‑validated: `drain-web-sources-tribal.mjs` (`4bea1df390`), P0 ingest bug fixed via `tipsToWebKnowledgeTips` (`df7a4c4d26`).  
- Watchlist curated with 33 validated sources (`db58fa2886`).  
  *Result*: 157 new web tips promoted.

**DECISIONS**  
- Arm youtube→tribal promotion step in existing cron; fix threshold parsing.  
- Align installer to point directly at committed runner (SSOT) to avoid %TEMP% race.  
- Build web lane using reusable youtube primitives, add source field and correct labeling.  
- Validate consumer path (R15) before committing P0 fix.  
- Curate watchlist of static content sources; harvest in batches or arm autonomous drain task.

**OPERATOR DIRECTIVES**  
- Improve learning/AI for CAD drawing, print generation, Fusion, HyperCAD, Mastercam.  
- Run hermes `/learn` on all resources (PDFs, videos, online).  
- Include videos and other reputable online sources without duplicating knowledge.  
- Inject tribal knowledge into CAD‑AI systems.

**FINDINGS/BUGS**  
- `parseInt('0.9')` collapsed wiki confidence gate → promoted everything; fixed to 90.  
- Raw tips missing source caused ingest throw (P0); added `tipsToWebKnowledgeTips` with proper metadata.  
- Video promotion loop stalled because cron only did tribal→wiki, not youtube→tribal.  
- Web lane initially staged raw tips lacking id/source; consumer ingestion failed.  
- Watchlist contained JS‑rendered sites yielding 0 tips; filtered out.  
- Harvest background task killed by fleet‑reaper after >10 min; remaining sources pending.

**DOMAIN SPECIFICS**  
- CADLearningEngine, Text→CAD loop, BlueprintRAG/LoRA engines.  
- `youtube-free-extract.mjs`, `promote-youtube-staged.mjs`, `drain-web-sources-tribal.mjs`.  
- TribalKnowledgeStore (`mcp-server/state/tribal_captured_tips.json`), promotion cron (`prism‑tribal‑promotion‑cron.ps1`).  
- Dedup ledger (`promoted-ledger.json`), tip generation via Ollama.  
- Watchlist JSON (`state/shared/youtube-extraction/night‑queue.json`, `db58fa2886`).

**TOOLS USED**  
- PRISM chat‑slots.mjs, audit-roadmap-drift.mjs, checkin.md pipeline.  
- hermes CLI, ollama offloading, octopus harnesses, engineered loops, crons, jm files, obsidian vault.  
- Node scripts (`youtube-free-extract.mjs`, `drain-web-sources-tribal.mjs`), PowerShell cron runner.  
- grep/rtk grep for code inspection.

**OPEN THREADS**  
- Re‑harvest remaining ~17 web sources in small batches to avoid reaper kill.  
- Arm a dedicated PRISM Web Source Drain task (autonomous nightly).  
- Optional Playwright fetch for JS‑rendered sites.  
- Add regression test for `tipsToWebKnowledgeTips` contract.  
- Update watchlist with new static sources as they become available.
