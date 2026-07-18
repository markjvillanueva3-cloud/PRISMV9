# pdf-corpus-mill session 7efaddb4 (2026-06-16, 73MB, spine 386KB, 5 slice(s), model gpt-oss:20b)

**SHIPPED**

- `FLEET-OPTIMAL-SETUP-2026‑06‑13.md`, `FLEET-PHASE4-DISPATCH-2026‑06‑13.md`, `FLEET-KNOWLEDGE-MAX-PHASE4-REPORT-2026‑06‑13.md` (MAIN‑FORCE)  
- `galaxy-knowledge-ledger.mjs`; `scripts/galaxy-knowledge-iterate.mjs`; `self‑compact.mjs`  
- WebFetch burst scripts (`wf_…`) waves 1–8 – verified foundations for 17 galaxies  
- `U-ZKM-VERIFY-W5` … `U-ZKM-VERIFY-W8` – verified all 34 galaxies (282–423 ins)  
- `U-ACCT-SWITCH-AUTOFIRE`; `U-ZULU-CAP-*` engines – ZuluWaveSchedulerEngine, ZuluTaskContinuityEngine, ZuluFleetHealthSynthesisEngine (93/93 tests green)  
- `zulu-build-loop.mjs`, `install‑zulu‑build‑loop‑cron.ps1` – continuous build loop live  
- Consumer hook `INCR4` (`zulu-build-pointer-inject.mjs`) – 10/10 tests, live inject on cad‑fusion-live-ms0 & slot/zulu  
- Capability engines C4–C8 commits: c907480111, 857d35fa41, cc07ad8238, 96f528bc81, 269e4956e1, 1602f254ba  
- `parseShipped` regex fix (`775a0f8287`) – memory/wiki entry added  
- Bridge A/B launcher commits: `c5bca80f4d`, `bd4c358a3f`; routinePlan commit `011a032deb`; guard fix `3ecb2a4a7b`; launcher 3‑of‑3 pass `521aa40f3d`  
- Docs: `state/shared/specs/HERMES-CAPABILITY-EXPANSION-CANDIDATES-2026-06-15.md`

---

**DECISIONS**

- Adopt Hermes‑as‑planner + ultracode coding; session‑scoped Stop hook blocks until ≥10 iterations per galaxy or source exhaustion.  
- Two‑tier knowledge model: rate‑limit‑immune cron (`galaxy-knowledge-iterate.mjs`) for depth, WebFetch verified workflow for quality.  
- 20 min loop intervals (`/loop {20m}`); hourly cron count 18; max iteration ceiling 30.  
- Physics fence: physics galaxies receive only method/standards/theory, no numeric cutting constants.  
- Auto‑switch monitor wired at 90 % session limit; account‑switch infra enabled.  
- Build loop advanced to next unit after each ship; autonomous until all capability engines shipped (C4–C8).  
- Bridge A/B verified; routinePlan exposes Hermes cron automation via reverse‑channel MCP server.

---

**OPERATOR DIRECTIVES**

- Commence continuous 20 min loop in yolo mode; no pause for clarification.  
- Reduce chat fleet to 9 to lower GPU contention.  
- Accelerate cron: bump count 5→12→18, keep hourly cadence.  
- Launch verified waves ≤4 agents per wave to avoid Anthropic rate limits.  
- Do not run manual `--record` batches overlapping least‑iterated picks.  
- Monitor loop via `node scripts/galaxy-knowledge-iterate.mjs --status`.  
- Build for bravo: deliver C4–C8, resume scrutiny at 8 pm CT (scheduled 8:07 pm CT).  
- Push through quicker crons and loops; schedule one‑shot to resume pending scrutiny.  
- Verify Hermes cron JSON job store + `croniter`; update CLI configs/context.

---

**FINDINGS/BUGS**

- Resolved bash fork‑bomb (>300 processes); background tasks now reaper‑immune Windows scheduled jobs.  
- Mitigated Ollama/Hermes rate limiting by serializing planner calls, throttling to single GPU (~10 min per galaxy).  
- Fixed P0 provenance bug: `ask-hermes` reports real source (`--json`) and labels via `depositAnchor`.  
- Added anti‑gaming ceiling (max 30 iterations); lost‑update race resolved with lockfile + reload‑before‑save.  
- Node‑path fix to use `process.execPath`; fork‑storm breaker triggered during burst, handled by reducing concurrency.  
- Rate‑limit issue in verified tier solved by limiting to 3–4 agents per wave.  
- Control‑char regex bug fixed; binary corruption prevented by stripping C0/DEL chars.  
- Test hermeticity bug in C5 split; trend‑gate bug fixed (require full `minConsecutiveHigh` window).  
- Bridge A live‑verified end‑to‑end; Bridge B launcher 3‑of‑3 pass, hard‑cap unbypassable, fail‑closed on corrupt.  
- MCP bridge down blocked agent reverify; `/mcp reconnect` required.

---

**DOMAIN SPECIFICS**

| Galaxy | Key engines/dispatchers | Core metrics / paths |
|--------|-------------------------|----------------------|
| cad (delta) | AP242, GD&T Y14.5, ISO‑GPS GeoSpelling | STEP‑AP242 export → feature graph |
| cam (echo) | Gouge‑free toolpath, C‑space medial axis, 5‑axis kinematics | NX/HW post‑processor integration |
| lathe (whiskey) | Threading dynamics, Oxley shear models, cryogenic/MQL | CNC spindle control loop |
| post‑processor (xray) | STEP‑AP238, SE(3) calibration, SO(3) TCP smoothing | G‑code generation pipeline |
| mill (foxtrot) | SLD, RCTF chip‑thinning, Kienzle kc1.1 | CNC toolpath simulation |
| ai‑training (india) | GraphSAGE, H2GCN, QLoRA, RAG | Embedding training & inference |
| blueprint‑vision (kilo) | OCR/VLM, FCF extraction, GD&T parsing | Image → vector conversion |
| quoting (charlie) | Cost modeling, Monte‑Carlo margin, DFMA | Bid calculation engine |
| business (hotel) | ASC 606, job‑order cost accounting, EDI | Financial reporting pipeline |
| academy (lima) | Instructional design, MIT OCW, NIMS | Course material generation |
| backend‑helper (papa) | TS/esbuild/V8 internals, MCP | Build tooling & dependency graph |
| wiring (romeo) | Dispatch‑shape taxonomy, reachability analysis | Electrical routing engine |
| discovery (tango) | Hybrid retrieval, MinHash/LSH semantic dedup | Knowledge base indexing |

- Capability engines: `ZuluWaveSchedulerEngine`, `ZuluTaskContinuityEngine`, `ZuluFleetHealthSynthesisEngine`, `ZuluDelegationContractEngine`, `ZuluAdaptiveBackPressureEngine`, `ZuluCapabilityRegistryEngine`, `ZuluCapabilityAttestationEngine`, `ZuluSoulEvolutionAdvisorEngine`.  
- HermesAutomationBridge routinePlan, Bridge A/B launcher.  
- Cron dispatcher: `scripts/galaxy-knowledge-iterate.mjs`; WebFetch workflow scripts (`wf_…`); sessionDispatcher.ts; hermesDispatcher.ts.

---

**TOOLS USED**

- PRISM libs: `galaxy-knowledge-ledger.mjs`, `ask-hermes.mjs`, `persist-galaxy-verified.mjs`, `persist-workflow-content.mjs`.  
- Scripts: `scripts/galaxy-knowledge-iterate.mjs`, `self‑compact.mjs`, `zulu-build-loop.mjs`, `install‑zulu‑build‑loop‑cron.ps1`, `zulu-build-pointer-inject.mjs`.  
- Agents & skills: ultracode, sonnet agents, Hermes agentic coding techniques, obsidian vault.  
- Hooks/guards: lockfile (`withLock`), stop hooks (`stop_on_c_drive_write`, etc.), consumer hook (`INCR4`).  
- Build tooling: esbuild, tsc, jest/vitest.  
- Runtime: Ollama, Hermes planner via :8645, cron scheduler.

---

**OPEN THREADS**

- Complete waves 5–7 (remaining 12 galaxies) and verify physics fence on any remaining physics galaxies.  
- Ensure continuous loop remains active at count 18 hourly for next 2 days; monitor fork‑storm breaker.  
- Verify auto‑compact triggers cleanly and handoff resumes correctly.  
- Finalize Hermes cron JSON job store + `croniter`; update CLI configs/context.  
- Resume pending scrutiny for C5 at 8:07 pm CT; complete scrutiny for Bridge B milestone envelope.  
- Operator‑gated CLI version bump (Hermes v0.16.0 → latest; CC 2.1.178); `/mcp reconnect` to unblock agent reverify.  
- Verify MCP reverse‑channel (`hermes mcp serve`) integration for phone alerts.  
- Confirm source exhaustion detection per galaxy via metadata counter; trigger Stop hook automatically when all galaxies ≥10 iterations and no new reputable sources.
