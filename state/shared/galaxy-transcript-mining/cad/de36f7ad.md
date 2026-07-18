# cad session de36f7ad (2026-05-18, 11.1MB, spine 136KB, 2 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `b081cebb1b` – `[INFRA‑DEVTOOLS]/U‑SYNERGY‑PROBES`: first probe upgrades (docker, handoffs, tribal).  
- `dfc0a83960` – `[APS‑FUSION‑CLOUD‑MS0]/U‑AFC‑P012‑TAIL`: APSOAuthEngine + pollWithBackoff + loopbackOAuthServer; 19 tests.  
- `f00a1e6de7` – `[INFRA‑DEVTOOLS]/U‑SYNERGY‑PROBES‑2`: second probe upgrades (skills→system‑viz, hooks→system‑viz, tribal→wiki).  
- `6e67ddddfb` – pilot commit of orphan‑inventory/validation script batch (8 files) moved into archive.  
- `ac8ebbd099` – validation/ scripts archived.  
- `5b10fd9bb3` – six subdirs: testing, state, batch, automation, extraction, hypermill.  
- `cbc9825a5c` – core/ legacy Python orchestrators + MCP shims.  
- `755831a951` – materials‑legacy archival (20 files; peer absorbed 278).  
- `b55dc165a6` – U‑ORPHAN‑HELPER‑KAR archive v2 legacy KAR helpers.  
- `fc92f10d5b` – EXTRACTORS: four one‑shot extractors.  
- `5bc287110f` – PATTERN‑3: 19 write_qa/gen/verify/generate files.  
- `05f432ba1e` – merge cad‑fusion‑live‑ms0 → slot/charlie.  
- `12a29a91b9` – U‑HIGH‑ROI‑AUDIT‑1.  
- `3e3587684e` – U‑PRISM‑OS‑INJECT hook + tests (BUILT‑NOT‑WIRED).  

**DECISIONS**  
- Adopt APS Platform Services as primary cloud connector; Phase 0–2 first (runbook + OAuth engine).  
- Use 3‑legged OAuth PKCE for Fusion Team hub, 2‑legged for Data Management/Model Derivative.  
- Skip Fusion desktop launch issues; focus on backend tooling and APS integration.  
- Prioritize synergy detector probe fixes to eliminate false negatives (high ROI, low effort).  
- Schedule recurring loops via `/loop` with cron; cloud schedule if interval ≥ 60 min or daily phrasing.  
- Archive cold scripts to `_archive/<subdir>` using explicit `git add`; avoid glob overlap.  
- Defer wiring of hooks until merged into main path to avoid module‑not‑found errors.  

**OPERATOR DIRECTIVES**  
- “Can we connect our system to the Fusion360 cloud so we can extract CAD/CAM data from parts?”  
- “Continue from where you left off” (multiple times).  
- “Pivot, look for high ROI quick fixes or wirings that will activate dormant nodes improving backend dev.”  
- “Commit then continue”.  
- Switch to charlie slot and bind session.  
- Build `prism-os-precheck-inject.mjs` (action #1).  
- Instrument master‑index with per‑query hit counter (action #2).  
- Continue building remaining high‑ROI actions as per audit.  

**FINDINGS/BUGS**  
- Fusion launch hangs due to corrupted `meta/registry` pointing at missing pre‑production binaries.  
- AUTH‑001 error: APS app missing Data Management, Model Derivative, OSS APIs.  
- Synergy matrix had 42 hardcoded `"none"` probes; 3 false negatives (docker, handoffs, tribal).  
- APS connector lacked capability descriptor (`{geometry:true, cam:false}`) and no token persistence until Phase 2.  
- Git lock‑race during commits caused peer files to be absorbed into our commits.  
- Peer absorption of 278 files due to broad glob; resolved with explicit paths.  
- Linter false positives on docstring header and `main().catch()` warnings.  
- Windows file:// URL scheme failures in tests; fixed.  
- Global wiring attempt caused module‑not‑found for other peers; reverted.  

**DOMAIN SPECIFICS**  
- PRISM CAD geometry, feature recognition, DfM, GD&T, blueprint‑to‑model.  
- Engines/Actions: `FusionCloudConnectorEngine`, `APSOAuthEngine`, `pollWithBackoff.ts`, `loopbackOAuthServer.ts`.  
- Dispatchers: `prism_dev`, `prism_calc`, `prism_turning`, `prism_cad`, `prism_ai`, etc.  
- Metrics: synergy ratio 21.11 %→27.78 %; P0 alerts; key paths like `H:/prism/mcp-server/src/utils/...`.  
- Unique modules: `system-viz` graph resolver, `fleet-reaper` slot logic, `alpha-slot-reaper-guardian.mjs`.  
- Wire/WEDM domain units: `U-BRIDGE-WIRE-{ELECTRODE,WET,WIRE}`.  
- High‑ROI surfaces: Obsidian brain (306 md), System‑viz (381 MB), PRISM OS (32 md).  

**TOOLS USED**  
- Autodesk Platform Services APIs (Data Management, Model Derivative).  
- Node.js + TypeScript; vitest for unit tests; node:test framework.  
- OAuth 2.0 PKCE flow; loopback HTTP server (`loopbackOAuthServer.ts`).  
- Git with lock‑race handling; cron scheduling via `CronCreate`; Anthropic schedule skill.  
- Shell utilities (`grep`, `sed`, `mv`); Windows registry paths for Fusion.  
- Cron expressions; `schedule` skill via Skill tool; settings.json for hook wiring.  

**OPEN THREADS**  
- Finish APS connector wiring into dispatcher (Phase 3).  
- Complete Phases 4–6 of APS‑Fusion‑Cloud milestone (hub crawling, derivative extraction, CAM stub).  
- Resolve remaining PIVOT tasks: envelope drift fix, cold‑script archival, backend engine wiring, stale milestone triage, orphan helper cleanup.  
- Confirm Fusion Team license and API product subscriptions; re‑register APS app if needed.  
- Address Git lock‑race pattern for future commits (atomic staging or separate branches).  
- 10 staged files in main tree pending commit; lock contention.  
- PRISM OS hook still not wired globally; needs merge into cad‑fusion‑live‑ms0.  
- Next charlie iteration: implement remaining high‑ROI actions (#3, #4).  
- Continue archiving remaining root‑level cold scripts (377 left).
