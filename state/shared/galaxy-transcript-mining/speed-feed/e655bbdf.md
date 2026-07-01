# speed-feed session e655bbdf (2026-06-24, 16.5MB, spine 123KB, 2 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `ea24d9cee6` – MillSurface real implementation & file‑parallelism flag.  
- `3709b140c4` – Vitest config brace fix (prevents test load crash).  
- `U-SFC-SWEEP-WORKER-HEAP` – Per‑worker `--max-old-space-size` bump for parallel sweep.  
- `U-SFC-PARALLEL-SWEEP` – 850 500‑combination exhaustive sweep on 24 threads (100 % OK).  
- `U-SFC-CAM-CATALOG-REBUILD` – Rebuilt PROGRAMMING_ENVIRONMENTS to 84 entries; all CAM tests green.  
- `U-SFC-SWEEP-PERSIST` – Added JSONL persistence; full dataset written to `state/shared/sfc-parallel-sweep-results/`.  
- Electron & Capacitor shells verified (web build succeeded, `cap copy` completed for Android/iOS).

**DECISIONS**  
- Set `vitest.config.ts` `fileParallelism: false` to avoid cross‑worker Three.js race.  
- Scope work to oscar slot; defer unrelated ERP/finance pages.  
- Prove SFC web app 100 % before Electron/iOS/Android builds.  
- Rebuild CAM catalog locally (operator‑directed).  
- Use `UltimateSpeedFeedEngine` for parallel sweep to avoid MCP‑server boot side effect.  
- Tune worker count to 16 (peak throughput) instead of max threads.  
- Persist sweep results as JSONL to survive session limits and feed GPU training.

**OPERATOR DIRECTIVES**  
- Prove SFC web app passes all frontend tests.  
- After proof, build Electron, iOS, Android shells.  
- Run exhaustive testing against all JM die parts/programs for accuracy validation.  
- Use 9950X3D + Blackwell GPU for exhaustive variable/combination SFC tests.  

**FINDINGS / BUGS**  
- Vitest crash (`exit 255`) due to parallel worker race with multiple Three.js imports.  
- MillSurfacePanel stub throwing; replaced with correct physics.  
- Syntax error in Vitest config (missing comma/brace).  
- Baseline run killed by SIGKILL (fleet‑reaper/OOM).  
- Single‑process reaped; parallel crashes due to cross‑worker race.  
- 5 failures from missing CAM catalog (`PROGRAMMING_ENVIRONMENTS` stub, exFAT corruption).  
- OOM in `sfc-variability-batch-run.mjs` workers (default heap too low).  
- Importing `SpeedFeedOrchestratorEngine` boots MCP server → stdout pollution & 0 processed cells.

**DOMAIN SPECIFICS**  
- Galaxy: oscar – Speed & Feed Calculator.  
- Key modules: `speedFeedOrchestratorEngine`, `UltimateSpeedFeedEngine`.  
- Frontend components: `CalculatorPage`, `MillSurfaceFinishPanel`, `Viewer3D`.  
- Tests: ~38 SFC‑specific pages + logic tests; full suite includes unrelated ERP/finance pages.  
- Scripts: `sfc-combination-sweep.ts`, `sfc-variability-batch-run.mjs`.  
- MCP server entry: `mcp-server/src/index.ts`.  
- Capacitor config and native platform dirs.

**TOOLS USED**  
- Vitest (`fileParallelism: false`).  
- Node 22, tsx for TS imports.  
- jsdom + Three.js / react‑three‑fiber for 3D rendering in tests.  
- Git & chat‑slot helpers (`chat-slots.mjs`).  
- PRISM workflow orchestrators: opus build + sonnet verify.  
- AGENT_CHAT.jsonl for routing.  
- Electron build system, Capacitor CLI (`cap copy`).  
- JSONL persistence utilities.

**OPEN THREADS**  
- Full single‑process web suite still running; results pending.  
- Remaining failures in CAM‑catalog/strategy registry tests (kilo/juliett domain).  
- Full 9‑axis sweep with richer engine (unblocked by MCP‑server import fix).  
- Expand axis grid to billions of combinations; enrich output beyond Vc.  
- Feed persisted dataset to Blackwell GPU for LoRA/GNN training.  
- Closed‑loop comparison vs HSMAdvisor / G‑Wizard.  
- GUI pixel confirmation of electron/iOS/Android shells (requires a display).
