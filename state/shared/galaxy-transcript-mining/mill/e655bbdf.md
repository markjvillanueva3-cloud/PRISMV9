# mill session e655bbdf (2026-06-24, 16.5MB, spine 123KB, 2 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `U‑SFC‑NC‑PARAM‑EXTRACT` – NC program → as‑programmed S/F/T extractor (7/7 tests)  
- `U‑SFC‑JM‑CORPUS` – resumable corpus harness over real JM tree, EDM‑gated (3/3 tests)  
- `U‑SFC‑COMMENT‑MATERIAL‑MINING` – comment‑based ISO group inference (6/6 tests)  
- `U‑SFC‑CORPUS‑ANALYZE` – shop‑outlier analyzer (5/5 tests)  
- `U‑SFC‑TAYLOR‑PHYSICS‑COMPARE` – Vc vs canonical Taylor, clamp‑aware split (4/4 tests)  
- `U‑SFC‑JM‑REFRESH‑RUNNER + CRON f2f7fee3` – nightly incremental corpus → analyze pipeline  
- `U‑SFC‑MILL‑SURFACE‑FINISH` – real surface‑finish physics, stub removed (28/28 tests) – commit ea24d9cee6  
- Vitest config change: `fileParallelism: false` to eliminate whole‑suite 255 crash – commit 3709b140c4  
- Stock‑prior integration: default ISO group set to H based on QuickBooks catalog (3/3 tests)  
- `U‑SFC‑SWEEP‑WORKER‑HEAP` – per‑worker `--max-old-space-size` bump for parallel sweep  
- `U‑SFC‑PARALLEL‑SWEEP` – 850,500‑combo exhaustive sweep on 24 threads (100 % OK) – commit U‑SFC‑PARALLEL‑SWEEP  
- `U‑SFC‑CAM‑CATALOG‑REBUILD` – PROGRAMMING_ENVIRONMENTS expanded to 84 (66→84), all 3 target tests green – commit U‑SFC‑CAM‑CATALOG‑REBUILD  
- `U‑SFC‑SWEEP‑PERSIST` – JSONL persistence of full sweep dataset (`state/shared/sfc-parallel-sweep-results/`) – commit U‑SFC‑SWEEP‑PERSIST  

**DECISIONS**  
- Use slot‑binding wrapper `/checkin-oscar` to guarantee handoff and drift checks before canonical `/checkin`.  
- Separate extraction → corpus → analysis → physics compare → refresh stages for independent testing, retry, scheduling.  
- Infer material from program comments first; fallback to stock catalog default ISO group H instead of P.  
- Add clamp‑aware logic to distinguish G50‑clamped ops from true over‑speeds.  
- Switch Vitest to single‑process (`fileParallelism: false`) after parallel worker crash discovered.  
- Rebuild CAM catalog locally instead of routing to kilo; preserves test integrity and avoids external domain.  
- Use light engine for parallel sweep to avoid MCP server boot side effect.  
- Set optimal worker count to 16 (memory/cache bound).  
- Persist every combination as JSONL for GPU/LoRA training.  
- Build Electron & Capacitor shells after confirming web build success.  

**OPERATOR DIRECTIVES**  
- Complete all remaining back‑end development tasks, priority on oscar/sfc.  
- Finish front‑end build and UI for sfc web app; then build electron/ios/android versions.  
- Run exhaustive testing of billions of logical combinations of inputs and cutting parameters; utilize ALL JM die parts and programs first to run full live tests of parameters.  
- Rebuild cam catalog for kilo then begin closed‑loop simulation, testing.  
- Use the new 9950X3D + Blackwell GPU for exhaustive variable/combination SFC tests.  

**FINDINGS / BUGS**  
- Whole‑suite Vitest crash (exit 255) caused by parallel worker race; not memory or Three.js.  
- Initial false diagnosis that WebGL was culprit; real issue cross‑worker import of multiple Three.js instances.  
- Default material inference incorrectly used P for all unknowns; JM stock ~93% H.  
- G50 clamped ops misclassified as aggressive over‑speeds (~17k flagged, only 42 unclamped).  
- Superalloy classification bug: bare numbers “625/718” in part names matched incorrectly.  
- Comment‑mining precision bug: numeric grades like “625”, “718”, “304” falsely inferred; fixed by requiring a material word.  
- Surface‑finish panel stub threw NOT_IMPLEMENTED; replaced with ISO 4287 physics (Ra = f²/(8r)).  
- Vitest config syntax error (missing comma) introduced after fileParallelism change; corrected in commit 3709b140c4.  
- Single‑process run killed by SIGKILL (fleet reaper); full dashboard suite out of scope.  
- CAM catalog data lost to exFAT corruption; stubbed file caused 5 test failures.  
- OOM in parallel sweep due to default worker heap and transitive MCP server import when loading SpeedFeedOrchestratorEngine.  
- Vitest config missing closing brace → load failure for all web tests.  

**DOMAIN SPECIFICS**  
- SFC engine (`speedFeedOrchestratorEngine.compute`) and canonical Taylor constants.  
- NC‑program parsing (`tokenizeNc`, `detectUnits`).  
- JM die parts corpus (~154 k programs, 1.17 M cutting‑parameter records).  
- ISO groups (P, H, M, K, N, S); material inference logic.  
- G‑code modes: G96/G97 (CSS/rpm), G94/G95 (feed/min or feed/rev), G50 clamp.  
- Three.js / @react‑three/fiber usage in `CalculatorPage` and viewer components; jsdom WebGL context handling.  
- Vitest 4 configuration (`fileParallelism`, `test.maxWorkers`).  
- Exhaustive sweep: 850,500 combos, Vc 1.3–1660 m/min (1277× variability), 100 % OK.  
- Page render: 16 `.tsx` files, 0 failures; `MillSurfaceFinishPanel`: 28/28 green.  
- Light engine used for parallel sweep; `SpeedFeedOrchestratorEngine` triggers MCP server import.  
- `CalculatorWorkspace.ts` assembles `PROGRAMMING_ENVIRONMENTS` from extensions.  

**TOOLS USED**  
- PRISM slot helpers (`chat-slots.mjs`, `slot-bind-enforce.mjs`).  
- Checkin pipeline (`/checkin` canonical).  
- Scripts: `sfc-program-param-extract-lib.mjs`, `sfc-jm-program-corpus.mjs`, `sfc-corpus-analyze-lib.mjs`, `sfc-jm-corpus-analyze`, `sfc-jm-physics-compare`, `sfc-jm-refresh-runner`.  
- TSX for importing `.ts` constants; Vitest (4.x) with custom config (`vitest.config.ts`).  
- Cron job `f2f7fee3` for nightly refresh.  
- PRISM vitest, tsx, node, AGENT_CHAT.jsonl.  
- Workflow orchestrators: opus build + sonnet verify (CAM catalog).  
- Scripts: `sfc-combination-sweep.ts`, `sfc-variability-batch-run.mjs`, `calculatorWorkspace.ts`, `calculatorProgrammingCatalogExtensions.ts`, `mcp-server/src/index.ts`.  

**OPEN THREADS**  
1. Run full web‑suite baseline (single‑process) to confirm 100 % pass of SFC pages.  
2. Resolve the three CAM‑catalog test failures (`calculatorData`, `calculatorProgrammingCoverage`, `calculatorStrategyRegistryBridge`) in kilo/juliett domain.  
3. Investigate restoring parallel speed for Vitest once cross‑worker race isolated (potentially via worker isolation or mocking Three.js).  
4. Add per‑op hardness state inference to refine physics comparison between annealed and hardened tool steel.  
5. Expand axis grid to reach billions of combinations; feed 850K dataset to Blackwell GPU for LoRA/GNN training.  
6. Fix orchestrator→MCP server import bug to enable richer 9‑axis sweep.  
7. Closed‑loop comparison vs HSMAdvisor/G‑Wizard.  
8. GUI/emulator pixel confirmation of Electron, iOS, Android shells.
