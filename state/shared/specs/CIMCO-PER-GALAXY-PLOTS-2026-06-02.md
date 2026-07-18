# CIMCO Integration — Per-Galaxy Utilization Plots

**Author:** slot echo (post-processor) · **Date:** 2026-06-02 · **Status:** active plan
**Grounded in:** verified local install (`H:/prism/resources/cimco-2026/CIMCOEdit/`) + shipped artifacts
**Companion:** [[cimco-verification-simulation-integration]] · `reference_cimco_install_corpus_2026_06_02`

> This is the per-galaxy build plan the operator asked for ("plot out what other galaxies need to do to fully utilize CIMCO"). It was produced directly from verified ground truth (the rate-limited 20-agent workflow's synthesis is superseded by this). Each unit is tagged **[offline]** (buildable now, no CIMCO process), **[live-app]** (needs the running licensed CIMCO app), or **[operator]** (needs an operator decision / license check).

## Shared spine (build ONCE — all galaxies consume)

CIMCO control channels, ranked (from `scripts/cimco-control-map.mjs` `COMMAND_CATALOG`):
- **FILE** — `.mcfg` JSON machine defs, `.js` posts, `.tmlib` tool libs (CONFIRMED, no process)
- **SQL** — bundled MariaDB (NC-Base/DNC-Max/MDC-Max datastore) (UNVERIFIED schema)
- **DNC-API** — DNC-Max API / `DNCMaxCtrl.exe` / TCP (UNVERIFIED)
- **CLI** — `CIMCOEdit.exe <file>` open (LIKELY)
- **UIA** — fallback for the GUI-only Machine Simulation + Simulation-Report read (no screenshots — read element text)

**SPINE-1 [offline] CIMCO↔PRISM bridge engine** (echo) — ✅ **SHIPPED** `1031ecea70` + parity-fix `d7dfb6ded6`. `mcp-server/src/engines/post-processor/CimcoVerificationBridgeEngine.ts` + `prism_cimco` dispatcher (6 actions: `cimco_inventory_summary`/`machine_query`/`post_query`/`tool_query`/`sim_report_evaluate`/`control_channels`) wired into `index.ts`. Reads the 3 index JSONs (no re-parse) + faithful TS port of `parseSimulationReport`. 22/22 tests, 3-of-3 scrutiny PASS (arm B caught + fixed a `??`/`||` fail-open). The single invocable surface every galaxy calls.
**SPINE-2 [live-app] CIMCO UIA driver** — `PrismCimcoUI` (clone of `PrismWinMaxUI`) + `cimco-ui-map.json` screen-signature capture + `cimco-course-run.mjs`. Drives Backplot→Machine-Sim, reads the Simulation-Report pane. *Blocked: needs the running licensed app to capture UIA signatures.*

## Machining galaxies (consume the spine to VERIFY their output)

**echo (post-processor) — owns the spine + verification loop**
- [offline] SPINE-1 bridge engine (above).
- [offline] post-emit gate: `PostProcessorPipelineEngine` emit → CIMCO File-Compare byte-diff vs golden NC (PRISM-side strict normalize — File Compare is lenient on renumber/spacing).
- [live-app] emit → CIMCO Machine-Sim → `parseSimulationReport` → pass/fail before ship. Supersedes the planned static R9–R18 conformance validator.

**kilo (CAM)**
- [offline] toolpath→NC handoff to the bridge for pre-post verification.
- [offline] map `.tmlib` tool libs ↔ PRISM tool registry (build `cimco-tool-index` next, analog to machine/post index — `.tmlib` format TBD-decode).
- [live-app] collision/gouge/over-travel prove-out of generated toolpaths.

**foxtrot (mill)**
- [offline] author JM VMC-01..05 `.mcfg` machine defs (JSON; clone CIMCO Vertical-mill templates; the 30 Vertical templates in `machine-index.json` are the starting points). **Units-first:** set `Header.Unit` explicitly (JM = inch).
- [live-app] mill-program prove-out on the real VMC kinematic models.

**whiskey (lathe)**
- [offline] author JM lathe `.mcfg` (5 Lathe templates incl. "Cimco Lathe 4 Axis CY + Sub"; Revolver+Holders schema verified).
- [live-app] turning + mill-turn (C+Y) backplot + chuck/tailstock collision prove-out.

**mike (WEDM) — HONEST GAP**
- [offline] use CIMCO Edit for wire NC edit + File-Compare + wire-path backplot only.
- CIMCO Machine-Sim is mill/lathe-kinematic — full WEDM machine-sim is **not** its strength. PRISM's own WEDM discharge-physics sim stays authoritative. Do NOT claim CIMCO sim-verification for wire.

**delta (CAD)**
- [offline] export design STL/STEP for CIMCO stock-vs-design compare (deviation-colored).
- [live-app] CIMCO's Fusion-ribbon integration ties to delta's Fusion-live pipeline.

## Database galaxies

**juliett (DB) — [offline, ready NOW]**
- Ingest `state/shared/cimco/machine-index.json` (86 machines) + `post-index.json` (25 posts/44 controllers) into PRISM persistence (schema-versioned).
- **Surface the 44 units-UNRESOLVED vendor machines** as a data-quality flag (must resolve units before geometry use — 25.4× guard).
- [operator] connect to the bundled MariaDB for NC-Base/DNC/MDC program+production data (needs credentials/schema enumeration).

**romeo (wiring)**
- [offline] wire SPINE-1 bridge engine → dispatcher (z.enum + schema + action case + round-trip E2E); close engine→dispatcher edges so every CIMCO capability is invocable via `prism_*`.

## Quote / ERP galaxies

**charlie (quoting)**
- [live-app] CIMCO Machine-Sim **cycle-time** (rapids+feed+dwell+tool-change) → ground-truth PRISM quote cycle-time; feed the AccuracyReport predicted-vs-actual loop with a sim-based reference.

**hotel (ERP)**
- [operator] CIMCO **MDC-Max** (OEE, real cycle counts) → PRISM ERP scheduling/OEE.
- [operator] CIMCO **DNC-Max** drip-feed of **verified** NC to real machines = the ship step of quote-to-ship; job tracking → ERP.

## Dependency order (fleet roadmap)
1. **SPINE-1 bridge engine** (echo) — everything else consumes it. ← next unit.
2. **romeo** wires it to a dispatcher; **juliett** ingests the indexes (both [offline], parallel after SPINE-1).
3. **foxtrot/whiskey** author JM `.mcfg` machine defs ([offline]); **kilo** builds the tool-index.
4. **SPINE-2 UIA driver** ([live-app], operator-gated) unlocks the live sim/report loop → echo's post-emit gate, kilo collision prove-out, charlie cycle-time, foxtrot/whiskey prove-out.
5. **hotel** DNC/MDC ([operator]) = ship step.

## Operator decisions pending
- License/automation terms: is headless/automated CIMCO use within the per-seat subscription? Is the 2026 REST API in the purchased tier?
- Run the live-app capture session (SPINE-2) so the UIA driver can be built.
- MariaDB credentials/schema for juliett/hotel direct SQL.
