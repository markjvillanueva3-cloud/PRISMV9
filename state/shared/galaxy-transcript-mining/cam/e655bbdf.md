# cam session e655bbdf (2026-06-24, 16.5MB, spine 123KB, 2 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `U‑SFC‑NC‑PARAM‑EXTRACT` – NC→S/F/T extractor (7/7 tests)  
- `U‑SFC‑JM‑CORPUS` – resumable corpus harness over real JM tree, EDM‑gated (3/3 tests)  
- `U‑SFC‑CORPUS‑ANALYZE` – shop‑outlier & gross‑physical analyzer (5/5 tests)  
- `U‑SFC‑PHYSICS‑COMPARE` – Taylor Vc comparison, clamp‑aware split, material‑precision fix (4/4 tests)  
- `U‑SFC‑REFRESH` – three‑stage refresh runner + nightly cron (`f2f7fee3`)  
- `U‑SFC‑MILL‑SURFACE‑FINISH` – real ISO‑4287 surface‑finish physics, stub removed (28/28 tests)  
- MillSurface real implementation (`ea24d9cee6`)  
- Vitest config brace‑fix (`3709b140c4`) – `fileParallelism: false` to avoid exit‑255 crash  
- Worker‑heap OOM fix for parallel sweep (`U‑SFC‑SWEEP‑WORKER‑HEAP`)  
- Parallel light‑engine sweep: 850 500 combos on 16 threads, 100 % OK (`U‑SFC‑PARALLEL‑SWEEP`)  
- CAM catalog rebuild: PROGRAMMING_ENVIRONMENTS expanded to 84 entries, all 3 tests green (`U‑SFC‑CAM‑CATALOG‑REBUILD`)  
- Sweep persistence: JSONL dataset written to `state/shared/sfc-parallel-sweep-results/` (`U‑SFC‑SWEEP‑PERSIST`)

**DECISIONS**  
- Slot‑binding wrapper `/checkin-oscar` ensures deterministic slot claim before canonical `/checkin`; avoids cross‑chat collision.  
- Use existing `tokenizeNc()` and `detectUnits()` from `cnc-ground-truth-lib`; no re‑tokenizing to keep extraction lean.  
- Comment‑based ISO inference preferred over path parsing; augmented with stock‑prior for default ISO group (H dominates).  
- Clamp‑aware classification added to separate true over‑speeds from G50‑clamped upper bounds.  
- Disable Vitest parallelism (`fileParallelism: false`) after cross‑worker race; trade speed for determinism.  
- Replace throwing `NOT_IMPLEMENTED` stub in `MillSurfaceFinishPanel` with verified ISO‑4287 physics.  
- Scope limited to SFC product pages; full dashboard suite out of scope due to parallel crashes and reaper OOM.  
- Rebuild CAM catalog locally (override routing to kilo) per operator instruction.  
- Use 9950X3D + Blackwell GPU for exhaustive variable/combination sweep; choose server‑free light engine to avoid MCP‑server side effect.  
- Optimum worker count is 16 threads (throughput peaks ~10 900 cells/s); 24 threads cause cache contention.

**OPERATOR DIRECTIVES**  
- `/goal [ /loop 10m ] complete all remaining back‑end tasks, prioritize oscar/SFC, finish frontend UI, prove it works 100 %, then build electron/ios/android.`  
- Run exhaustive testing of billions of logical combinations; use ALL JM die parts and programs first for live accuracy validation.  
- “rebuild the cam catalog for kilo then begin closed loop simulation, testing.”  
- “use the new 9950X3D + Blackwell GPU for the exhaustive variable/combination SFC tests now.”

**FINDINGS / BUGS**  
- Whole‑suite Vitest exit‑255 caused by parallel‑worker crash (multiple Three.js instances); fixed with `fileParallelism: false`.  
- MillSurfaceFinishPanel contained throwing stub; replaced with real physics.  
- False WebGL diagnosis disproved – Canvas renders fine in jsdom.  
- Material precision bug: superalloy numbers (`625`, `718`) falsely matched part numbers; resolved by requiring material words.  
- D2 hard‑clamp issue: G96 S1500 capped by G50, leading to over‑speed flag; split into clamp‑aware logic.  
- Default ISO group wrong (P instead of H); corrected using JM stock prior.  
- Full dashboard suite crashes: parallel worker race and fleet reaper OOM.  
- CAM catalog data lost (exFAT corruption) → stubbed file, missing >80 environments.  
- Worker OOM in batch‑run harness due to default heap size; fixed with `--max-old-space-size`.  
- Importing SpeedFeedOrchestratorEngine triggers MCP server boot, polluting stdout and yielding zero processed cells (unfixed).

**DOMAIN SPECIFICS**  
- Engines/dispatchers: speedFeedOrchestratorEngine, UltimateSpeedFeedEngine (light engine), `tokenizeNc()`, corpus harness, analyze lib, physics compare engine.  
- Paths:  
  - `scripts/lib/sfc-program-param-extract-lib.mjs`  
  - `sfc-jm-program-corpus.mjs`  
  - `sfc-corpus-analyze-lib.mjs`  
  - `sfc-physics-compare-lib.mjs`  
  - `calculatorWorkspace.ts`  
  - `calculatorProgrammingCatalogExtensions.ts`  
  - `sfc-combination-sweep.ts`  
  - `sfc-variability-batch-run.mjs`  
  - `state/shared/sfc-parallel-sweep-results/` (JSONL)  
- Metrics:  
  - 154 414 JM programs → 1 171 812 cutting‑parameter records  
  - gross‑physical errors: 470 ops; outlier buckets: 19  
  - Vc variability 1–1660 m/min (1277×)  
  - ISO‑group sensitivity 7.93×  
  - tool‑material sensitivity 7.14×  
  - tool diameter/flutes flat (Vc independent)

**TOOLS USED**  
- PRISM helpers: `.claude/helpers/chat-slots.mjs`, `slot-bind-enforce.mjs`  
- Checkin pipeline (`.claude/commands/checkin.md`)  
- Vitest (4.x) with tsx for TS imports, Node 22.12  
- Git, cron (`f2f7fee3`), Obsidian vault, Hermes agents, Ollama offloading  
- PRISM CAM tools referenced: Fusion, Mastercam, hyperMILL, Inventor HSM, NX, Esprit, SolidCAM, PowerMill (not directly invoked)  
- Scripts/dispatchers: AGENT_CHAT.jsonl, `sfc-combination-sweep.ts`, `sfc-variability-batch-run.mjs`, workflow scripts (`opus`, `sonnet`)

**OPEN THREADS**  
- Remaining CAM‑catalog test failures (`calculatorData`, `calculatorProgrammingCoverage`, `calculatorStrategyRegistryBridge`) – to be handled by kilo/juliett.  
- Full web suite green baseline still pending (single‑process run in progress).  
- Cross‑worker race for parallel speed: potential future optimization once deterministic runner is stable.  
- Per‑op hardness state inference needed for fully accurate physics comparison; data currently missing.  
- Expand axis grid to billions of combinations (additional diameters/materials/conditions).  
- Fix orchestrator→MCP‑server import side effect to enable richer 9‑axis sweep.  
- Closed‑loop comparison vs HSMAdvisor/G‑Wizard.  
- GUI pixel confirmation of electron/iOS/Android shells (requires non‑headless run).
