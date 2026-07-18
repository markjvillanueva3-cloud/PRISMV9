---
title: CIMCO Edit 2026 + Machine Simulation — fleet verification & simulation integration
type: architecture
status: active
domain: post-processor
tags: [cimco, machine-simulation, post-processor, verification, nc-checking, dnc, mdc, machine-definition, collision-detection, cycle-time, system-integration]
created: 2026-06-02
by: claude-321c1d3f (slot:echo)
related:
  - post-processor-knowledge-base
  - reference_cimco_install_corpus_2026_06_02
  - reference_haas_tap_bare_g84_no_m29
---

# CIMCO Edit 2026 + Machine Simulation — fleet verification & simulation integration

CIMCO Edit 2026 + Machine Simulation is a **paid, locally-installed** CNC editor + kinematic machine simulator that PRISM uses as the fleet's **program/post verification + simulation oracle**. It answers a gap the Haas-controller-fidelity investigation hit: there was no *drivable* native oracle to prove NC behaves correctly (the real Haas control is buy-it hardware with no automation surface). CIMCO's Machine Simulation is that oracle — a real 3D kinematic sim with collision/over-travel/gouge/stock-compare and an auto-generated Simulation Report — and it is scriptable.

> **It SUPERSEDES** the previously-planned static ~85% R9–R18 conformance validator: a real kinematic sim beats a static rule set. The Haas **golden round-trip harness** (byte-equivalence of emitted NC vs the 26 real `JM DIE/CNC MILL HAAS/*.NC`) is still needed independently as the emitter proof.

## Local corpus (verified 2026-06-02)
- `H:/prism/resources/cimco-2026/CIMCOEdit/` — CIMCO Edit **2026.01.10**, 1461 files / 1076 MB.
- `H:/prism/resources/cimco-2025/` — 2025.01.25 (Machine Sim requires 2025.01.25+).

## Control surface — API/exe-first, "no screenshot"
PRISM drives CIMCO through real interfaces, **preferring API/CLI over UI-automation** (the WinMax pattern had to screen-scrape because Hurco exposed only WCF+UIA; CIMCO does not force that):
- **`CIMCOSimulation.exe`** (standalone 6.9 MB sim binary) — primary headless-sim candidate. *UNVERIFIED:* exact CLI args — confirm via `Help/edit_us.chm` or `CIMCOSimulation.exe /?` before relying.
- **`CIMCOEdit.exe`** — editor host for backplot + File-Compare.
- **Bundled MariaDB** (`mariadb.exe`, `mariadb-dump.exe`) — the NC-Base/DNC-Max/MDC-Max datastore → direct SQL read for DB/ERP galaxies.
- **Command-line switches** (cimco.com/support/how-to-guides/command-line-switches/), **CIMCO 2026 REST API** (new; third-party automation), **DNC-Max API + `DNCMaxCtrl.exe` + TCP/IP**. OLE/COM: *UNVERIFIED locally* — check for a `.tlb`.
- **UIA fallback** only for GUI-only actions (visual sim prove-out, on-screen Simulation Report if not file-exported), via a `cimco-ui-map.json` screen-FSM cloned from `scripts/winmax-ui-map.mjs`.

## Real data formats (verified by opening samples)
| Asset | Ext | Format | PRISM use |
|---|---|---|---|
| Machine definition | `.mcfg` (86) | **JSON** — `MachineDefinition.Collision[]` named pairs + STL component refs | machine-model schema; author JM machines as JSON |
| Machine geometry | `.stl` (387) | STL mesh (graphics + collision) | per-component models |
| Post processor | `.js` (25) | **readable JavaScript** (`globals`, `PostInfo{type}`, field tables) | echo reads/authors CIMCO posts |
| Controller def | `.eRPost` (35) | **BINARY/compiled** — NOT text-authorable (needs CIMCO RPost editor) | reference only |
| Tool library | `.tmlib` (14) | tool/holder libs | kilo tool DB |
| Docs | `.chm`/`.pdf` | bundled legal manuals (`Post Processor Manual.pdf`, `edit_us.chm`) | knowledge ingest |

## Verification contract (the program/post checker)
`emit NC (via PostProcessorPipelineEngine) → load into CIMCO + machine def (.mcfg) + stock → run Machine Simulation → Simulation Report (collisions, over-travel, gouge, line-linked errors) + cycle time → pass/fail gate before ship.` Geometry truth = backplot stock-vs-design compare. Post byte truth = CIMCO **File Compare** vs golden NC (ignores trivial renumber/spacing).

## Per-galaxy utilization
- **echo (post-processor):** CIMCO File-Compare for golden byte-diff; Machine-Sim as the controller-fidelity oracle; read/author `.js` posts. Verification loop gates every emit.
- **juliett + romeo (database):** ingest `.mcfg` + `.stl` + `.tmlib` + Simulation-Report results into PRISM persistence (incl. CIMCO's MariaDB via SQL); the sim-result store is the closed-loop training corpus (india). romeo wires the new CIMCO engines → dispatchers.
- **delta (CAD):** feed design STL/STEP for stock-vs-design deviation; CIMCO's Fusion ribbon ties to the Fusion-live pipeline.
- **kilo (CAM):** verify toolpaths (collision/gouge/over-travel) pre-post; transfer tool+holder+geometry into the sim.
- **foxtrot (mill):** build JM VMC-01..05 `.mcfg` machine defs (clone Haas templates); prove-out Milling Wizard output.
- **whiskey (lathe):** turning + mill-turn (C+Y) backplot + sim; chuck/tailstock collision; Okuma/Haas lathe `.mcfg`.
- **mike (WEDM):** *honest gap* — CIMCO Edit supports wire NC edit + backplot, but full kinematic WEDM machine-sim is limited; PRISM's own WEDM sim stays authoritative for discharge physics.
- **charlie (quoting):** sim cycle-time (rapids+feed+dwell+tool-change) → ground-truth PRISM quote cycle-time; feeds AccuracyReport predicted-vs-actual.
- **hotel (ERP):** MDC-Max (OEE, real cycle counts) → ERP scheduling; DNC-Max drip-feed of **verified** NC to real machines = the ship step of quote-to-ship.

## Honest gaps / operator decisions
- `CIMCOSimulation.exe` headless CLI args, REST-API scope/tier, and OLE/COM availability need confirmation against the running licensed app + per-seat license terms before automation is relied on.
- WEDM machine-sim applicability is limited (see above).
- MS-MASTERPOST revenue path remains gated on U-LEGAL-13 (public manuals only).

## Build spine
A shared **CIMCO↔PRISM bridge engine** (build once, all galaxies consume) + a `cimco-control-map` (command catalog: action→CLI/COM/REST/file-IO, UIA fallback) cloned from the WinMax driver pattern. Dependency order: bridge + control-map → DB ingest (juliett/romeo) → machining verify (delta/kilo/foxtrot/whiskey/mike) → quoting/ERP (charlie/hotel).

## Shipped (slot echo, 2026-06-02) — all offline, test-green, from the verified local install
- `scripts/cimco-control-map.mjs` — `COMMAND_CATALOG` (action→channel+confidence) + `readMachineDef()` (units-first) + `parseSimulationReport()` pass/fail gate. 19/19 tests. (`U-CIMCO-CONTROL-MAP`)
- `scripts/cimco-machine-index.mjs` → `state/shared/cimco/machine-index.json` — 86 machine defs (5 Lathe / 2 Horizontal / 30 Vertical / 49 vendor-uncategorized). **44/86 vendor defs lack a declared `Header.Unit` → flagged units-UNRESOLVED** (resolve before geometry; 25.4× guard). 4/4 tests. (`U-CIMCO-MACHINE-INDEX`)
- `scripts/cimco-post-index.mjs` → `state/shared/cimco/post-index.json` — 25 `.js` posts (6 TURN / 19 MILL, 100% parsed) + 44 `.eRPost` across 19 vendors (binary inventory). 5/5 tests. (`U-CIMCO-POST-INDEX`)
- `scripts/cimco-tool-index.mjs` → `state/shared/cimco/tool-index.json` — 14 `.tmlib` tool libs (XML), 366 cutters (188 Metric / 178 Imperial), units-first. 4/4 tests. **Completes the inventory triad (machines / posts / tools).** (`U-CIMCO-TOOL-INDEX`)
- `state/shared/specs/CIMCO-PER-GALAXY-PLOTS-2026-06-02.md` — per-galaxy build plan (10 galaxies + shared bridge, dependency-ordered, offline/live-app/operator-tagged). (`U-CIMCO-PER-GALAXY-PLOTS`)
- CHM help decompiled to `resources/cimco-2026/_extracted/edit_us/` (154 HTML pages — local doc source).
- **SPINE-1 SHIPPED** — `mcp-server/src/engines/post-processor/CimcoVerificationBridgeEngine.ts` + `prism_cimco` dispatcher (6 actions: `cimco_inventory_summary` / `machine_query` / `post_query` / `tool_query` / `sim_report_evaluate` / `control_channels`) wired into `index.ts`. The single in-process surface every galaxy calls: reads the three index JSONs (no re-parse — canonical generators stay the `.mjs`) + a FAITHFUL TS port of `parseSimulationReport` (pass/fail gate, parity-locked to `scripts/cimco-control-map.mjs`). Units-first (surfaces the 44/86 units-unresolved). 22/22 tests, 3-of-3 scrutiny PASS. (`U-CIMCO-BRIDGE-ENGINE` `1031ecea70` + parity fix `d7dfb6ded6`). **Lesson:** the first cut used `??` where canonical used `||` in the grouped-report branch → a falsy-but-present singular key (`{collision:0, collisions:[...]}`) silently dropped findings → fail-OPEN. Caught by 3-of-3 arm B. See [[cimco-verification-tribal]].

- **NC-NORMALIZE CORE SHIPPED** — `scripts/lib/nc-normalize.mjs` (`normalizeNC` + `compareNC`) — the strict, policy-free byte-equivalence core for BOTH the Haas golden round-trip harness AND the CIMCO File-Compare consumer. Conservative-strict: normalizes only non-semantic diffs (block renumber, EOL, trailing-ws, blank-runs), preserves case/addresses/decimals/comments/tape-markers; volatile-comment masking is caller-supplied. 18/18 tests incl. real golden Haas NC idempotency + renumber/EOL-invariance (60 numbered lines) + semantic-change-detected + fail-loud. (`U-NC-NORMALIZE-CORE` `4d17ba2aea`). Built because CIMCO File Compare is too lenient (ignores renumber+spacing) — PRISM does its own strict diff.
- **JM-FLEET → CIMCO SIM-MACHINE MAP SHIPPED** — `scripts/cimco-jm-machine-map.mjs` → `state/shared/cimco/jm-fleet-sim-map.json`. Kinematic-fit scorer (vendor+model+orientation+axis-count, type-gated, axis-mismatch penalized) maps the 15 JM machines to CIMCO sim machines: **2 native Haas** (VF-2→VF-2TR, OM-2→CM-1), **10 generic-template** (live-tool Okuma→Lathe-4AxisCY, plain→3AxisC, Multus→Mill-Turn-BC, Hurco/Roku 3ax→Mill-3Axis, Okuma 5ax→Mill-5Axis), **3 not-applicable** (Mitsubishi EDM — CIMCO sim is mill/lathe only). Every mapping carries `mustVerifyKinematics` + units-first (JM=inch). 9/9 tests. (`U-CIMCO-JM-MACHINE-MAP` `0a1d8fc168`; **P0 fix `430f735fff`**: VF-2 was mis-mapped to the 5-axis VF-2TR trunnion — `axisHints tr\d` missed digit-before-`tr`; now → 3-axis VF-6/40 + a 3↔5-axis regression-lock test). Answers the operator's "use system machine models to simulate in CIMCO."
- **DIALECT VOLATILE-MASKS + ROUND-TRIP CLASSIFIER SHIPPED** — `scripts/lib/nc-dialect-masks.mjs` (`roundTrip` + `maskFor` + `detectDialect`). The only offline-provable proof arm: `roundTrip(golden, candidate)` → `byte-identical` | `volatile-header-only` (SAFE — same program, header churn) | `semantic-drift` (real content difference). Masks derived from JM's OWN golden headers (not vendor manuals): Mastercam `DATE=/TIME=/MCX-FILE/NC-FILE` (Haas `.nc` + Okuma `.MIN`), PRISM `source:` path, Mitsubishi paren-date; Hurco `.hnc` = none. SAFETY-tested: masks never alter semantic G-code. Validated on real AGRATI `9007405.MIN` (header-churn→safe; S800→S1200→semantic-drift@L10). 10/10 tests. (`U-NC-DIALECT-MASKS` `d0e5df9e16`). This is the unlock for #2 (drift reconciliation) + #5 (re-emission byte-equivalence) below.

- **POST-PROOF READINESS LEDGER SHIPPED** — `scripts/cimco-post-proof.mjs` → `state/shared/cimco/jm-post-proof.{json,md}`. HONEST (no faked passes): a true post-proof needs CIMCO-sim (live app) OR byte-equiv re-emission (CAM source). Offline-now it ships (1) per-machine readiness ledger (golden corpus + sim machine + proof method + blockers), (2) a real `compareNC` **golden-integrity drift audit** across same-base-name variants with `volatileCommentMask` (distinguishes header-only churn from genuine content drift), (3) DATE/TIME/path volatile-header detection. Real-data: 15 machines, **246 content-drift groups**, + found coverage gaps (VMC-02 Okuma-5ax=0 / Hurco=1 golden → non-`.nc` formats; lathe pool shared+capped). 7/7 tests. (`U-CIMCO-POST-PROOF-LEDGER` `297a3c9194`).

**Still pending:** (1) extend the golden walker to non-`.nc` formats (Hurco conversational, Okuma `.MIN`) — the VMC-01/02 zero-golden gap; (2) reconcile the 246 content-drift golden groups (which is the true baseline per part); (3) author exact `.mcfg` for the 10 generic-template machines from PRISM machine-kinematics; (4) SPINE-2 live UIA driver (`PrismCimcoUI` + `cimco-ui-map.json` — needs the running licensed app); (5) candidate re-emission via `PostProcessorPipelineEngine.process()` → `compareNC` vs golden (needs CAM source). Per-galaxy: romeo shipped CIMCO-TOOLDB-FILL-MS0; juliett DB-ingest / kilo tool-map / charlie cycle-time / hotel MDC-DNC pending.

## Blind-navigation map — U-CIMCO-NAV-MAP (2026-06-03, slot:echo)

"Plot the ENTIRE CIMCO app for full blind navigation." A multi-agent **Workflow** (`cimco-blind-nav-plot`, wf_ffa343d5 — 12 plot + 5 verify + 1 synth agents, ~2.7M subagent tokens) read the **154 decompiled CHM help pages** (`resources/cimco-2026/_extracted/edit_us/`) and extracted **511 navigable surfaces** (370 proof-relevant) — every menu/dialog/tab/shortcut/setup screen keyed by automation channel.

- **Data:** `state/shared/cimco/nav-map.json` (surfaces + 5 critical-path verdicts + synthesis). **Loader/query:** `scripts/cimco-nav-map.mjs` (21 tests). **Regen ETL:** `scripts/cimco-nav-map-ingest.mjs`. **Wired:** `CimcoVerificationBridgeEngine.navQuery()`/`navReadiness()` → `prism_cimco` actions `cimco_nav_query` + `cimco_nav_readiness`.
- **Channel split:** uia 374 · file 120 · dnc-api 14 · cli 3. Strongest blind channel = **file** (NC I/O, `.setup` stock/fixture sidecar, `.tmlib`, MachineCfg authoring, File-Compare ignore-options).
- **All 5 post-proving critical paths verify navigable=true** (open-nc → load-machine-model+stock → run-sim → read-sim-report → file-compare). **Honest keystone gap:** the VERDICT half (Machine Simulation run + Simulation Report + in-app File-Compare) is **UIA-only on the live licensed app, no documented export** → post-proving is ~60-70% blind-driveable today; the unblock is a verified UIA Simulation-Report reader (= SPINE-2). The operator's "use SYSTEM machine models" maps to `setup.machine-models.install` which is **GUI-only** (only custom-machine provisioning is file-blind).
- **Synthesis next units:** U-CIMCO-LAUNCH-PROBE → U-CIMCO-UIA-REPORT-READER (keystone) → U-CIMCO-SETUP-SIDECAR-AUTHOR → U-CIMCO-DIALECT-ALLOWLISTS → U-CIMCO-FTP-SHIP-VERIFY.

### Drift-audit grouping fix — SHIPPED (U-CIMCO-DRIFT-GROUPING-FIX)
The post-proof drift audit was over-reporting "semantic-drift" for the 6 Okuma lathes via two independent causes, both now fixed:

- **(A) Name collisions — the dominant cause.** `groupByBaseName` pairs the same filename reused across different customer subdirs (e.g. `WSR/CASE1250.MIN` vs `THOMASON/CASE1250.MIN` — genuinely *different parts* that merely share a base name). These are not copy-drift. **Fix:** `bodySimilarity(a,b)` (Jaccard over normalized non-comment / non-`$%` lines, exported) + `NAME_COLLISION_THRESHOLD = 0.4`. When a group classifies as `semantic-drift` AND body similarity `< 0.4`, it is flagged `nameCollision:true` and **excluded** from `driftWithRealDiff`, counted separately under `nameCollisions`. A genuine re-save (high overlap, only `$NAME` echo differs) stays `volatile-header-only`; a real edit (X1 vs X9, Jaccard 0.6) stays true drift.
- **(B) Dead Okuma-OSP mask.** Native OSP goldens carry a line-1 `$<NAME>.MIN%` program-name token that `detectDialect` never routed to `okuma-osp`, so the mask never neutralized it. **Fix:** `P.okumaProgName` mask (`^\$[^\n]*\.MIN%`, fail-closed, anchored — never matches a motion line; SAFETY-tested) added to the `okuma-osp` + `prism` mask sets, and `detectDialect` now returns `okuma-osp` on `$NAME.MIN%` / `DEF WORK` / `/CALL OBAR` (checked AFTER mastercam so a Mastercam-posted `.MIN` still routes correctly — Family B).

**Live ledger after fix:** 15 machines, 9191 golden sampled → **240 TRUE copy-drift + 7 name-collisions** (previously the 7 collisions inflated the drift count, poisoning the "which posts are clean" signal). Masks are derived from JM's OWN native-OSP goldens (recon 2026-06-03), never a copyrighted manual. Tests: `cimco-post-proof.test.mjs` 9/9 (incl. real-corpus integration + name-collision fixture) + `nc-dialect-masks.test.mjs` 20/20 (incl. adversarial SAFETY: mask never alters a real OSP body). Memory [[reference_cimco_drift_grouping_bug_2026_06_03]]. Map memory: [[reference_cimco_navmap_2026_06_03]].

### Launch surface — SHIPPED (U-CIMCO-LAUNCH-PROBE)
HOW a blind agent starts and drives the local install to prove a post — the R13 foundation under the run-sim/compare consumers. Data: `state/shared/cimco/launch-surface.json`. Loader/query: `scripts/cimco-launch-probe.mjs` (CLI `summary|verify|patterns|hook|open <file>`, 10 tests). Wired: `CimcoVerificationBridgeEngine.launchSurface()` → `prism_cimco` action `cimco_launch_surface`.

- **Exe inventory (verified on disk):** `CIMCOEdit.exe` (30.8 MB, main editor + File Compare + Machine Simulation host) · `Dll/CIMCOSimulation.exe` (7.0 MB, the sim-verdict surface the SPINE-2 UIA reader targets) · `Sys/KeyManager.exe` (license — Simulation is license-gated) · `Dll/GroovingKernelWrapper.exe` (lathe groove kernel). `verify()` checks each path on disk and returns a `missing[]` — never fabricates a present exe.
- **Launch patterns (honest split).** VERIFIED: `CIMCOEdit.exe "<ncFilePath>"` opens a program (the blind launch). NEEDS-LIVE-VERIFY: open-pair (two-file compare — CIMCO accepts multi-file args but the File-Compare ACTION is UIA-only, no documented compare flag) and standalone-sim-replay. A `strings` scan of `CIMCOEdit.exe` surfaced no usage banner, so no CLI flag beyond file-open is asserted (R12 fail-loud — we do not invent flags).
- **Integration hook — the headline blind-safe finding (FILE channel, no UIA).** *Editor Setup > External Commands* lets you register an external program (External Command 1/2) invoked from the NC Functions tab on the open file, with macro args `$FILE / $FILENOEXT / $PATH / $FILEPATH / $OUTFILE`. **PRISM use:** register a "PRISM Verify" External Command that receives `$FILEPATH`, runs `prism_cimco` verification, and writes the verdict to `$OUTFILE` — wiring PRISM INTO CIMCO with zero UIA automation. This complements (does not replace) the SPINE-2 UIA Simulation-Report reader, still required for the in-app Machine-Sim collision verdict (license-gated). Source: `setupexternalcommands.htm`. Memory [[reference_cimco_launch_probe_2026_06_03]].

### Dialect G/M allowlists — SHIPPED (U-CIMCO-DIALECT-ALLOWLISTS)
The STATIC arm of post-proving that works offline TODAY (no live app): lint a generated post's G/M-code vocabulary against the codes JM *actually used* in its proven goldens for that controller dialect. Data: `state/shared/cimco/dialect-allowlists.json`. Loader/builder/lint: `scripts/cimco-dialect-allowlist.mjs` (CLI `build|summary|families|lint <file> [family]`, 10 tests). Wired: `CimcoVerificationBridgeEngine.dialectAllowlist()` + `dialectLint()` → `prism_cimco` actions `cimco_dialect_allowlist` + `cimco_dialect_lint` (dispatcher 9→11).

- **Mined from JM's OWN goldens, never a manual** (echo refuses copyrighted-manual derivation). First build: **706 goldens scanned → 5 families** — `okuma-osp` 224 files / 33 G / 23 M · `prism` 388 / 33 / 23 (PRISM's own emitted posts already in the corpus) · `hurco` 35 / 28 / 25 · `mastercam` 6 / 24 / 9 · `mitsubishi-edm` 2 / 9 / 14. Files are bucketed by the **same** content-based `detectDialect()` the lint uses, so a candidate is checked against the family it would itself classify into.
- **Honest framing (R12):** this is a *whitelist of observed codes*, NOT a controller spec. A code absent from the goldens is `unobserved-in-JM-goldens (review)`, **not** "invalid" — the lint surfaces novel codes for a human / live-sim to confirm and NEVER fails a post on its own. Comment-stripped extraction (a `G99` in a paren comment is not counted); leading-zero normalized (`G01→G1`).
- **Fail-loud:** the loader throws on missing/corrupt JSON; `dialectLint` on an unknown family (or one with no allowlist) returns `hasAllowlist:false` + an explicit "NOT a pass" note — never a silent green. Engine methods are faithful ports of the `.mjs` (`detectDialect` + `extractCodes`), parity-asserted in the engine test. Tests: `cimco-dialect-allowlist.test.mjs` 10/10 + bridge engine 38/38. Memory [[reference_cimco_dialect_allowlists_2026_06_03]].

**Static proving path now complete (offline):** byte-equivalence-vs-golden (drift audit, honest after U-CIMCO-DRIFT-GROUPING-FIX) **+** dialect-allowlist lint. The remaining gap is the live collision verdict (`U-CIMCO-UIA-REPORT-READER`, operator-gated on the running licensed app).

### Blind-nav PLANNER — SHIPPED (U-CIMCO-NAV-PLANNER, 2026-06-04, slot:echo)
The EXECUTABLE layer over the static 511-surface nav-map: where `cimco-nav-map.mjs` is the passive surface catalog and `synthesis.criticalProcedures` is baked text, `scripts/cimco-nav-planner.mjs` composes the ordered, channel-prioritized, FAIL-LOUD step plan to prove a PRISM post on a **specific** JM machine. `planNavigation({jobType, ncFile, jmMachineId?, goldenFile?})` resolves the JM machine → sim `.mcfg` (jm-fleet-sim-map.json) and classifies the proof arm: `byte-equiv` (offline compareNC) · `external-cmd` (blind-safe FILE hook, static verdict) · `sim-uia` (collision verdict — UIA + live license, SPINE-2) · `discharge-physics` (EDM, CIMCO can't model). `planFleet()` rolls up all 15 JM machines (**12 sim-uia gated + 3 EDM**). Reuses `loadNavMap/queryNav/CHANNEL_RANK` (no dup). CLI `plan|fleet|summary`.

- **Honest, never fakes a verdict (R12):** `verdictProducible` gates `blindDriveable` so a verdict-bearing job whose arm is null (e.g. verify-external with no hook) never reads blind-driveable; an unverified launch pattern is never promoted to blind-safe; the **25.4× units guard** fires on `unitsResolved=false` (the Haas `.mcfg`); a corrupt mill/lathe entry with a null `cimcoMatch` THROWS a data-integrity error instead of mis-routing to EDM. 27/27 `cimco-nav-planner.test.mjs` green; per-file 2-reviewer PASS (arm-B P1 honesty-gap + P2 corrupt-data fail-loud both fixed). Commit `d92b58cd21`. Memory [[reference_cimco_nav_planner_2026_06_04]].

### External-Command VERIFIER — SHIPPED (U-CIMCO-VERIFY-OPEN-FILE, 2026-06-04, slot:echo)
The runnable half of the blind-safe FILE-channel proof loop the launch-surface `integrationHook` described: register `scripts/cimco-verify-open-file.mjs` as CIMCO Edit **External Command 1**. CIMCO passes the open NC (`$FILEPATH`); PRISM runs the offline arms and writes a verdict to `$OUTFILE` — pure FILE channel, **no UIA, no live license**. Composes the already-built arms (R8): `dialectLint` (G/M vocab vs JM goldens) + byte-equivalence (`roundTrip`: byte-identical | volatile-header-only | semantic-drift). CLI: positional `$FILEPATH` + `--golden --machine --out`; exit `0=cleared / 1=not-cleared / 2=FAIL / 3=error`.

- **FAIL-CLOSED (R12):** `cleared:true` is EARNED only by a golden byte-equivalence pass with no failures and no foreign-code warn. Empty NC, missing golden, semantic-drift, unknown dialect → never cleared. A clean lint alone is necessary-not-sufficient (byte-identity to a proven golden is the only clearance arm; it subsumes the lint). HONEST coverage — disclosed on every render that this is the static + byte-equiv verdict, **NOT** the CIMCO collision/gouge sim verdict (UIA + license, SPINE-2). 13/13 `cimco-verify-open-file.test.mjs` green; per-file 2-reviewer PASS, 0 P0/P1 (arm-B P2 `family`-key no-op fixed). Commit `b81369b3c3`. Memory [[reference_cimco_verify_open_file_2026_06_04]].

**Proof surface now (offline, runnable):** per-post nav PLAN (which arm, what blocks it) → blind-safe VERIFIER executable (dialect-lint + byte-equiv → `$OUTFILE` verdict, fail-closed). The one remaining gap is unchanged: the live collision verdict (`U-CIMCO-UIA-REPORT-READER` / SPINE-2, operator-gated on the running licensed app). Next dependency-ordered: TS port + `prism_cimco:cimco_nav_plan`/`cimco_verify_post` dispatcher actions; native CIMCO sim-machine roster.
