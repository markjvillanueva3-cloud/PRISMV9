# cam session efd1e0c2 (2026-06-25, 38.7MB, spine 155KB, 2 slice(s), model gpt-oss:20b)

**SHIPPED (builds/commits)**  
- `U‑SFC‑TSX‑REEXEC` – tsx‑reexec guard + 4 sweep scripts fixed for bare‑node/crons.  
- `U‑SFC‑PAGE‑MACHINE‑LIMITS` – page now sends spindle limits to engine clamp.  
- `U‑SFC‑PAGE‑DEPTH‑WIDTH` – depth/width alias fix; silent drop bug closed.  
- `ProductEngine.test.ts` – 13 reference‑value cases added.  
- `optimize_for` core (cost/balanced/productivity) – physics‑reviewed, passes all tests.  
- Request‑layer & UI slice for `optimize_for` – full vertical slice, byte‑identical default.  
- JM‑proven extraction pipeline activated – 16 524 lathe programs → 94 015 samples → 50 proven configs (8 trustworthy).  
- `sfc-jm-proven-report.mjs` (iter 10) – structured report with confidence thresholds.  
- 16 units shipped (full `optimize_for` slice, JM proven‑data pipeline, bare‑node/cron safety, two synthesized wiki lessons).  

**DECISIONS (architecture/scope + why)**  
- Adopt tsx‑reexec guard for all bare‑node scripts to avoid ERR_MODULE_NOT_FOUND crashes.  
- Expose machine limits and depth/width on the SFC page to activate engine clamps and eliminate silent input loss.  
- Wire `optimize_for` goal selector into request/response flow; keep two engine paths (page vs orchestrator).  
- Re‑enable dormant JM‑proven extraction pipeline; add guard, run full corpus, populate proven store for downstream use.  
- Classify JM configs into trust/override based on confidence and variance; feed result to operator as guideline vs PRISM override.  
- Resolve source‑level bugs: SFM speed unit mismatch (3.28× error), aluminum ISO N Vc under‑prediction (~226 m/min vs 800 m/min), `tool_steel → H` modeling error (fixed to P).  

**OPERATOR DIRECTIVES (verbatim asks)**  
- “Complete all remaining back end development tasks, priority on oscar/sfc.”  
- “Continue improving sfc capabilities and finishing the front end build and UI for the sfc web app.”  
- “Once front end works 100 % begin building electron, iOS, Android versions of the sfc app.”  
- “Run exhaustive testing of billions of logical combinations of inputs and cutting parameters to ensure accurate cutting data relative to desired roughing or finishing accuracy and surface finish if required.”  
- “Utilize ALL JM die parts and programs first to run full live tests of parameters (remember that our programs are mostly written by amateurs so don’t trust the speeds, feeds and parameters, use them as the guideline to test against).”  
- “Use ollama offloading, hermes agents, hermes cli, parallel agents, engineered loops, harnesses, obsidian vault, graphs and crons.”  

**FINDINGS/BUGS**  
- Bare‑node crash in .mjs sweep scripts due to static `.ts` imports; fixed with tsx guard.  
- Page omitted spindle limits → engine clamp never fired (accuracy bug).  
- Depth/width silently dropped because page used `depth`/`width` while engine expects `depth_of_cut`/`width_of_cut`.  
- JM cutting speeds stored in SFM but consumed as m/min – 3.28× error; fixed at report level, source bug in `aggregateLatheData` (line 215).  
- Aluminum ISO N Vc under‑prediction (~226 m/min vs 800 m/min) due to RPM‑cap artifact in 9‑axis orchestrator; requires adjustment.  
- 48 % of Okuma parsed ops classified as `unknown`; high variance in many configs (17 high‑confidence vs 33 variable).  
- Tool steel mapping to ISO H caused unrealistic aggressive speeds; corrected to P group.  

**DOMAIN SPECIFICS**  
- Engines: `ProductEngine.sfcCalculate`, `SpeedFeedNineAxisOrchestratorEngine`, `UltimateSpeedFeedEngine`, `OkumaOSPParserEngine`.  
- Actions/dispatchers: `buildProvenStore`, `aggregateLatheData`, `exportForSpeedFeedOrchestrator`, `buildNineAxisInput`, `callTool("prism_product","sfc_calculate")` via `/api/v1/sfc/calculate`.  
- Metrics: Vc (m/min), MRR (cm³/min), cutting force, tool life; canonical speeds in `CANONICAL_MILLING_SPEEDS`, `CANONICAL_TURNING_SPEEDS`; `SPINDLE_DRIVE_EFFICIENCY`, `SFC_GOAL_SCALERS`.  
- Paths: `sfc-full-sweep-compare.mjs`, `sfc-all-axis-sweep.mjs`, `sfc-parallel-combo-sweep.mjs`, `sfc-convergence-diff.mjs`, `extract-jm-proven-speedfeed.mjs`, `sfc-jm-fleet-closed-loop.test.ts`.  

**TOOLS USED**  
- PRISM core: `ProductEngine`, `SpeedFeedNineAxisOrchestratorEngine`, `UltimateSpeedFeedEngine`.  
- Node scripts: `tsx-reexec-guard.mjs`, `extract-jm-proven-speedfeed.mjs`.  
- Cron job `f7bfbc21` (15‑min schedule).  
- Vitest/Jest for unit tests.  
- Git hooks for lock sweep and commit hygiene.  
- Wiki synthesis tools (`sfc-jm-proven-u-sfc-jm-proven-sfm-units.md`, etc.).  

**OPEN THREADS**  
1. **Task #12 – Aggregator SFM source fix**: convert `cssSpeed` from SFM to m/min at ingestion, correct export state flow.  
2. **Task #13 – Aluminum ISO N Vc under‑prediction fix**: adjust RPM‑cap handling in 9‑axis orchestrator or upstream speed table.  
3. PRISM‑vs‑JM physics divergence report (compare canonical turning Vc with JM proven data).  
4. Op‑classifier fix (resolve 48 % unknown ops in Okuma parser).  
5. Mill `.nc` proven extractor – run 119 K mill programs, populate proven store.  
6. Feed 94 K JM samples to India LoRA/GNN for ML training.  
7. Electron/iOS/Android builds of SFC app (post‑frontend completion).
