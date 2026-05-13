# Slash Commands Inventory — by workflow

**Generated:** 2026-05-13T13:05:00.489Z
**Total:** 663 skills across 31 workflow buckets
**Source:** `node scripts/inventory-slash-commands-by-workflow.mjs` (ACP-MS0/P0-U01)

**By source:** project=158 · archive=114 · user=391

## Bucket totals

| Bucket | Count | Description |
|--------|-------|-------------|
| build | 0 | Compile, type-check, lint, test runners. |
| deploy | 0 | Git push, release, ship, sync — move bits to a remote. |
| cad | 37 | CAD intake, geometry parsing, blueprint, DXF/STEP/IGES, vendor CAD bridges. |
| cam | 20 | CAM strategy, toolpath generation, generic G-code, print-to-program. |
| post | 12 | Post-processor lifecycle (validate, generate, register, diff, harden). |
| speed-feed | 3 | Cutting parameters, SFC, auto-speed-feed. |
| mill | 10 | Milling-specific (not cross-CAM). |
| lathe | 23 | Turning / lathe / Swiss / groove / thread. |
| wedm | 29 | Wire-EDM (gets its own bucket — biggest by count). |
| edm | 0 | Sinker/micro EDM (NOT wedm). |
| sinker | 5 | Sinker-EDM specific. |
| grind | 5 | Grinding. |
| welder | 5 | Welding. |
| quality | 17 | SPC, GD&T, CMM, FAI, tolerance, capability. |
| quote | 18 | Quoting, costing, biz pipeline, bid-to-win. |
| planning | 37 | Scheduling, capacity, traveler, shop-floor ops. |
| learn | 12 | LoRA training, video/pdf-learn, knowledge ingestion, tribal capture. |
| forge | 35 | /forge-* family — brainstorm→plan→iterate scaffolders. |
| audit | 29 | Audit/scrutinize/peer-review/drift detection. |
| safety | 3 | Safety validation, harness-security. |
| memory | 4 | Memory, snapshot, recall. |
| session | 16 | Handoff, precompact, checkpoint, startup, session lifecycle. |
| infra | 27 | Hooks, fleet, swarm, claim-phase, chat, slot, peer-coordination. |
| ops | 14 | Machine-* tools (per-machine setup, hardening, ROI). |
| dev | 23 | Code-index, dispatcher, engine, action, formula, algorithm explorers + dev meta. |
| roadmap | 23 | RGS, generate-roadmap, milestone tools, envelope-sync, close-out. |
| autopilot | 11 | Yolo, autopilot, smart, run-continuous, batch automation. |
| viz | 13 | system-viz, awareness, master-index, build-state, orphan-inventory. |
| docs | 17 | Commands listing, prism-paths, ref-first, manifest, capabilities, wiki. |
| meta | 54 | RTK setup, profile switchers, model selection, harness configuration. |
| misc | 161 | Nothing else matched (review periodically — should always be tiny). |

## cad (37)

> CAD intake, geometry parsing, blueprint, DXF/STEP/IGES, vendor CAD bridges.

| Command | Source | Tier | Description |
|---------|--------|------|-------------|
| `/blueprint-read` | user | — | Blueprint Read — Engineering Drawing OCR & Analysis |
| `/cad-corpus` | project | 3 | /cad-corpus — CAD Training Corpus Management |
| `/cad-corpus` | user | — | /cad-corpus — CAD Training Corpus Management |
| `/cad-dfm` | project | 3 | /cad-dfm — Design for Manufacturability Analysis |
| `/cad-dfm` | user | — | Design for Manufacturability analysis on CAD models |
| `/cad-dfm-generate` | project | 3 | /cad-dfm-generate — Manufacturability-Aware CAD Generation |
| `/cad-explain` | project | 1 | /cad-explain — Explain CAD Design Decisions |
| `/cad-extract` | project | 2 | /cad-extract — Extract Features from CAD Model |
| `/cad-extract` | user | — | /cad-extract — Extract Features from CAD Model |
| `/cad-feature-recognize` | project | 3 | /cad-feature-recognize — Automatic Feature Recognition |
| `/cad-feature-recognize` | user | — | /cad-feature-recognize — Automatic Feature Recognition |
| `/cad-from-blueprint` | project | 3 | Blueprint to CAD Generation Studio |
| `/cad-from-text` | project | 3 | /cad-from-text — Natural Language to CAD Generation |
| `/cad-graph` | user | — | CAD Graph — Topology-aware CAD dependency graph |
| `/cad-rag` | project | 3 | CAD Retrieval-Augmented Generation Studio |
| `/cad-review` | project | 1 | /cad-review — CAD Model Quality Review |
| `/cad-review` | user | — | /cad-review — CAD Model Quality Review |
| `/cad-search` | project | 1 | CAD Similarity Search Studio |
| `/cad-tokenize` | user | — | CAD Tokenize — Neural tokenization for CAD programs |
| `/cad-tolerance` | project | 3 | /cad-tolerance — GD&T-Aware CAD Generation |
| `/cad-tolerance-check` | project | 3 | /cad-tolerance-check — Validate CAD Model Tolerances |
| `/cad-tolerance-check` | user | — | /cad-tolerance-check — Validate CAD Model Tolerances |
| `/cad-train` | project | 3 | CAD Neural Training Studio |
| `/cad-validate` | project | 1 | /cad-validate — 100% Accuracy Gate for CAD |
| `/catia-cam-setup` | user | — | Configure CATIA Manufacturing / KBM integration — strategies, KBM tuning, safety, add-in. |
| `/catia-strategy-guide` | user | — | CATIA Manufacturing / KBM strategy guide — template-driven parameters. |
| `/fusion-generate` | user | — | Fusion Generate — Create Parts in Fusion 360 |
| `/hypermill-3d-strategy-guide` | user | — | hyperMILL 3D Strategy Guide — Choosing the Right 3D Machining Cycle |
| `/hypermill-project-setup` | user | — | hyperMILL Project Setup — Model to NC Program Workflow |
| `/mastercam-setup` | user | — | Configure Mastercam integration for PRISM — controller lookup, material map, safety rules, and API connect. |
| `/mastercam-strategy-guide` | user | — | Recommend Mastercam strategies (Dynamic Motion, OptiRough, Profit Turning) with parameters. |
| `/nx-cam-setup` | user | — | Configure Siemens NX CAM integration — controller, material, strategy registry, add-in. |
| `/nx-strategy-guide` | user | — | Siemens NX CAM strategy guide — IPW, FBM, adaptive milling. |
| `/powermill-setup` | user | — | Configure Autodesk PowerMill integration — controller, material map, safety rules, add-in. |
| `/powermill-strategy-guide` | user | — | Autodesk PowerMill strategy selection — Vortex, raster, waterline. |
| `/solidcam-imachining-guide` | user | — | SolidCAM iMachining and HSS strategy tuning — chipload, engagement, safety. |
| `/solidcam-setup` | user | — | Configure SolidCAM integration — iMachining tuning, material map, safety rules, add-in scaffold. |

## cam (20)

> CAM strategy, toolpath generation, generic G-code, print-to-program.

| Command | Source | Tier | Description |
|---------|--------|------|-------------|
| `/cam-bridge` | user | — | Generate CAM add-in bridge — HTTP client + UI panel + post integration for any CAM system. |
| `/cam-export-tools` | user | — | Export tool libraries across CAM systems — universal export, multi-sync, drift detection. |
| `/cam-fixture` | user | — | /cam-fixture — Fixture Design Assistant |
| `/cam-post-lint` | user | — | Lint and validate CAM post-processor output |
| `/cam-strategy` | project | 3 | /cam-strategy — Intelligent CAM Strategy Selection |
| `/cam-strategy` | user | — | Recommend optimal CAM machining strategies for features |
| `/cam-strategy-compare` | user | — | Compare CAM strategies head-to-head — radar chart, cycle time, cost, safety. |
| `/cam-strategy-select` | user | — | Cross-CAM strategy selection — pick best strategy across Mastercam, SolidCAM, NX, PowerMill, CATIA, hyperMILL. |
| `/cam-toolpath-check` | user | — | Verify CAM toolpath quality and collision safety |
| `/cam-workholding` | user | — | Select and configure workholding for CAM operations |
| `/cnc-simulate` | user | — | CNC Simulate — Vericut-Class G-Code Simulation |
| `/gcode` | user | — | G-Code — Quick G-code snippet generator |
| `/print-to-program` | user | — | Print to Program — Upload Print → Get CNC Program |
| `/program-audit` | project | 0 | Full CNC program audit (safety + physics + collisions) |
| `/program-gen` | user | — | Program Gen — Complete CNC Program Generator with Auto Speed/Feed |
| `/program-optimize` | project | 1 | /program-optimize — Re-run Per-Block Physics on G-code |
| `/program-optimize` | user | — | Universal CNC program optimizer - routes to family-specific optimizers |
| `/program-simulate` | project | 3 | /program-simulate — Universal CNC Program Simulation |
| `/program-simulate` | user | — | NC program simulation wrapper for all machine families |
| `/program-validate` | user | — | Program Validate — CNC G-Code Verification Pipeline |

## post (12)

> Post-processor lifecycle (validate, generate, register, diff, harden).

| Command | Source | Tier | Description |
|---------|--------|------|-------------|
| `/cps-analyze` | user | — | CPS Analyze — Fusion 360 Post Processor Analysis |
| `/post-diff` | project | 3 | /post-diff — Compare Post-Processor Outputs |
| `/post-diff` | user | — | /post-diff — Compare Post-Processor Outputs |
| `/post-generate` | project | 3 | /post-generate — Generate NC Code from CAM |
| `/post-generate` | user | — | /post-generate — Generate NC Code from CAM |
| `/post-harden` | project | 2 | /post-harden — Harden Post-Processor for Machine |
| `/post-harden` | user | — | /post-harden — Harden Post-Processor for Machine |
| `/post-register` | project | 3 | /post-register — Register Post-Processor in System |
| `/post-register` | user | — | /post-register — Register Post-Processor in System |
| `/post-validate` | project | 1 | /post-validate — Post-Processor Output Validation |
| `/post-validate` | user | — | /post-validate — Post-Processor Output Validation |
| `/pp-resolve` | project | 3 | /pp-resolve — Resolve Machine + Material + Tool from Catalogs |

## speed-feed (3)

> Cutting parameters, SFC, auto-speed-feed.

| Command | Source | Tier | Description |
|---------|--------|------|-------------|
| `/auto-speed-feed` | user | — | Auto Speed Feed — Physics-Optimized Line-by-Line S/F for CNC Programs |
| `/auto-speed-feed-lathe` | user | — | Auto Speed Feed Lathe — Physics-Optimized Lathe Turning Parameters |
| `/test-speed-feed` | user | — | Test Speed Feed — Exhaustive UltimateSpeedFeedEngine Gauntlet |

## mill (10)

> Milling-specific (not cross-CAM).

| Command | Source | Tier | Description |
|---------|--------|------|-------------|
| `/mill` | project | — | Milling Domain Studio — the single entry point that orchestrates every PRISM milling engine (~240 in the eng.mill cluster), the Milling AGI  |
| `/mill-agi` | user | — | Invoke MillingAGIMasterEngine directly — deep reasoning for mill intent (P1-U12) |
| `/mill-awareness` | user | — | Query MillAISelfAwarenessIntegrationEngine registry — discover mill engines + capabilities (P1-U12) |
| `/mill-harden` | user | — | Harden PRISM AI for specific CNC mill machines |
| `/mill-learn` | user | — | Learn from CNC mill programs, outcomes, and tribal knowledge |
| `/mill-master` | user | — | Invoke MillMasterOrchestratorFacadeEngine — unified mill routing (P1-U12) |
| `/mill-optimize` | user | — | Optimize CNC mill programs for speed, quality, or tool life |
| `/mill-studio` | project | 3 | /mill-studio — Milling Studio Pipeline |
| `/mill-studio` | user | — | Interactive CNC Mill programming studio with full pipeline |
| `/mill-validate` | user | — | Validate CNC mill programs for safety, correctness, and machine compatibility |

## lathe (23)

> Turning / lathe / Swiss / groove / thread.

| Command | Source | Tier | Description |
|---------|--------|------|-------------|
| `/hard-turn` | user | — | Hard turning + grinding replacement assistant — CBN/ceramic/carbide decision, white-layer risk prediction, residual-stress judgement, and su |
| `/lathe` | project | — | Lathe / Turning Domain Studio — the single entry point that orchestrates every PRISM lathe engine, the Lathe Tier-3 AGI + Knowledge Graph, t |
| `/lathe-agi-explain` | user | — | /lathe-agi-explain |
| `/lathe-ai` | user | — | Lathe AI intelligence suite - analyze, optimize, reason, and predict for lathe programming |
| `/lathe-erp` | user | — | /lathe-erp |
| `/lathe-groove` | user | — | Grooving & parting assistant — classifies 8 groove types, selects plunge-and-shift or peck cycles across 4 controllers, sizes parting blades |
| `/lathe-harden` | user | — | Harden PRISM AI for specific CNC lathe machines |
| `/lathe-learn` | user | — | Learn from CNC lathe programs, outcomes, and tribal knowledge |
| `/lathe-lora` | project | 3 | /lathe-lora — Lathe LoRA Physics-Augmented Inference |
| `/lathe-lora` | user | — | /lathe-lora — Lathe LoRA Physics-Augmented Inference |
| `/lathe-master-post` | project | — | Unified lathe post-processing pipeline — route, emit, validate, explain, and audit G-code for any lathe controller |
| `/lathe-masterpost` | user | — | /lathe-masterpost |
| `/lathe-optimize` | user | — | Optimize CNC lathe programs for speed, quality, or tool life |
| `/lathe-postgen` | project | — | Full wizard for lathe post-processor generation — ingest spec, generate skeleton, validate, test, and register |
| `/lathe-postgen` | user | — | /lathe-postgen — Lathe Post-Processor Generator |
| `/lathe-print-to-program` | user | — | /lathe-print-to-program |
| `/lathe-studio` | project | 3 | /lathe-studio — Lathe Programming Studio Pipeline |
| `/lathe-studio` | user | — | Lathe Studio — Open Web Interface for Lathe Programming |
| `/lathe-thread` | user | — | Comprehensive lathe threading assistant — safety-gated pitch-diameter optimization across single-point threading with Monte Carlo envelope,  |
| `/lathe-validate` | user | — | Validate CNC lathe programs for safety, correctness, and machine compatibility |
| `/lathe-wizard-test` | user | — | Run end-to-end verification of the LATHE-HARDENED-MS0 Phase A composed safety pipeline (envelope + spindle torque + stock boundary + safety  |
| `/swiss-production` | user | — | Swiss production planning assistant — bar stock management, magazine planning, and lights-out readiness assessment with 5-factor scoring (ch |
| `/swiss-program` | user | — | Swiss / mill-turn multi-channel programming assistant — schedule balancing, simultaneous-cut collision safety, part-transfer M-code sequenci |

## wedm (29)

> Wire-EDM (gets its own bucket — biggest by count).

| Command | Source | Tier | Description |
|---------|--------|------|-------------|
| `/wedm` | project | — | Wire-EDM Domain Studio — the single entry point that orchestrates every PRISM wire-EDM engine (62 WEDM + 181 EDM-family), the WireEDM AGI Or |
| `/wedm-ai-advisor` | user | — | Neural-powered Wire EDM parameter optimization |
| `/wedm-audit` | project | — | Audit WEDM asset counts and dispatcher wiring status |
| `/wedm-batch` | user | — | Wire EDM batch programming and optimization |
| `/wedm-cite` | user | — | Check and validate citation coverage for WEDM engine parameters |
| `/wedm-compare` | user | — | Compare Wire EDM programs, parameters, and results |
| `/wedm-controller` | user | — | Wire EDM machine and controller selection |
| `/wedm-cost` | user | — | Wire EDM cost estimation and quoting |
| `/wedm-drift` | user | — | Report rolling-window WEDM predictor confidence + mean LoRA correction magnitude, flag model drift (>20% correction), and append events to W |
| `/wedm-explain` | user | — | Surface the WHY behind any WEDM predictor output — anchor node, evidence programs, contributing components (physics / LoRA / lattice prior), |
| `/wedm-feasibility` | user | — | Wire EDM feasibility assessment for parts and features |
| `/wedm-feedback` | user | — | Record post-job operator feedback (actual cycle time, Ra, wire breaks) into WEDM_JOB_HISTORY so the P4 on-device learning stack (LoRA / EWC  |
| `/wedm-harden` | user | — | Harden PRISM AI for specific Wire EDM machines |
| `/wedm-hook-disable` | user | — | Kill switch for WEDM hooks — temporarily disable a specific hook by ID |
| `/wedm-jm-die` | user | — | JM Die Company Wire EDM shop context and customer patterns |
| `/wedm-learn` | user | — | Extract Wire EDM knowledge from PDFs, videos, and documents |
| `/wedm-optimize` | user | — | Optimize Wire EDM programs for speed, surface finish, or wire consumption |
| `/wedm-pcd` | user | — | Validate a PCD (polycrystalline diamond) tooling WEDM program against the MS-P3-TIER6B U-P3-T6B-05 acceptance envelope — ASM Vol. 16 k(T) in |
| `/wedm-program` | project | 3 | /wedm-program — Physics-Optimized Wire EDM Program Generator |
| `/wedm-program` | user | — | /wedm-program — Physics-Optimized Wire EDM Program Generator |
| `/wedm-reason` | user | — | Explain a Wire EDM prediction by citing the lattice nodes it was grounded in |
| `/wedm-report` | user | — | Generate Wire EDM production reports and analytics |
| `/wedm-safety-gate` | project | — | Evaluate WEDM program composite S(x) safety score before emit |
| `/wedm-studio` | user | — | Interactive Wire EDM programming studio with full pipeline |
| `/wedm-tier6` | user | — | Validate a Tier 6 progressive-die WEDM fixture against PRISM's envelope — geometry gate (min_radius ≥ wire_dia + 2·spark_gap), toolpath-leng |
| `/wedm-troubleshoot` | user | — | Wire EDM troubleshooting and wire break diagnosis |
| `/wedm-validate` | user | — | Validate Wire EDM programs for safety, correctness, and machine compatibility |
| `/wire-edm-analyze` | project | 3 | /wire-edm-analyze — Wire EDM Deep Analysis |
| `/wire-edm-studio` | project | 3 | /wire-edm-studio — Wire EDM Studio Pipeline |

## sinker (5)

> Sinker-EDM specific.

| Command | Source | Tier | Description |
|---------|--------|------|-------------|
| `/sinker-harden` | user | — | /sinker-harden — Sinker EDM AI Hardening |
| `/sinker-learn` | user | — | Learn from sinker EDM programs and outcomes |
| `/sinker-optimize` | user | — | Optimize sinker EDM programs for speed or surface finish |
| `/sinker-studio` | user | — | Interactive Sinker EDM programming studio with full pipeline |
| `/sinker-validate` | user | — | Validate sinker EDM programs for safety and correctness |

## grind (5)

> Grinding.

| Command | Source | Tier | Description |
|---------|--------|------|-------------|
| `/grinder-harden` | user | — | /grinder-harden — Grinding AI Hardening |
| `/grinder-learn` | user | — | /grinder-learn — Grinding Knowledge Extraction |
| `/grinder-optimize` | user | — | /grinder-optimize — Grinding Program Optimization |
| `/grinder-studio` | user | — | Interactive CNC Grinder programming studio |
| `/grinder-validate` | user | — | Validate CNC grinder programs |

## welder (5)

> Welding.

| Command | Source | Tier | Description |
|---------|--------|------|-------------|
| `/welder-harden` | user | — | /welder-harden — Welding AI Hardening |
| `/welder-learn` | user | — | /welder-learn — Welding Knowledge Extraction |
| `/welder-optimize` | user | — | /welder-optimize — Welding Program Optimization |
| `/welder-studio` | user | — | Interactive robotic/CNC welder programming studio |
| `/welder-validate` | user | — | /welder-validate — Welding Program Validation |

## quality (17)

> SPC, GD&T, CMM, FAI, tolerance, capability.

| Command | Source | Tier | Description |
|---------|--------|------|-------------|
| `/cmm-parse` | project | 3 | /cmm-parse — CMM Report Analysis |
| `/cmm-parse` | user | — | /cmm-parse — CMM Report Analysis |
| `/cpk-calc` | project | 3 | /cpk-calc — Process Capability Calculation |
| `/cpk-calc` | user | — | /cpk-calc — Process Capability Calculation |
| `/formula-check` | project | 3 | MILL-MASTER — RGS Pipeline Release Certificate |
| `/gdnt-check` | project | 3 | /gdnt-check — GD&T Compliance Validation |
| `/gdnt-check` | user | — | /gdnt-check — GD&T Compliance Validation |
| `/physics-verify` | user | — | Physics Verify — Cross-Pipeline Physics Consistency Check |
| `/quality-check` | user | — | Quality Check — Shop Floor Quality Engineering Workflow |
| `/quality-check-lathe` | user | — | Turning quality & compliance assistant — inspection plan generation, AS9102 FAI forms (aerospace), CMM program generation (PC-DMIS / Calypso |
| `/quality-dashboard` | user | — | Quality Dashboard |
| `/quality-gate` | user | — | Quality Gate — Full Quality Assurance Pipeline |
| `/quality-gate-lathe` | user | — | Turning quality-compliance gate — AS9100 / ISO 13485 / 21 CFR Part 11 enforcement with material cert traceability, biocompatible material ha |
| `/spc` | project | 3 | /spc — Statistical Process Control |
| `/spc` | user | — | /spc — Statistical Process Control |
| `/tolerance-stack` | project | 3 | /tolerance-stack — Tolerance Stack-Up Analysis |
| `/tolerance-stack` | user | — | Perform tolerance stack-up analysis |

## quote (18)

> Quoting, costing, biz pipeline, bid-to-win.

| Command | Source | Tier | Description |
|---------|--------|------|-------------|
| `/bid-to-win` | user | — | Bid to Win — Smart Competitive Quoting Pipeline |
| `/biz-health` | project | 3 | Business Wiring Health Check |
| `/cost-optimize` | user | — | Cost Optimize — Manufacturing Cost Minimization Pipeline |
| `/cost-optimize-lathe` | user | — | Turning cost optimisation assistant — 7-bucket cost-per-part model, Gilbert/Taylor economic cutting speed (min-cost / max-production / max-p |
| `/cycle-time-crush` | user | — | Cycle Time Crush — Find Every Second Hiding in Your Program |
| `/estimate` | user | — | Estimate — Quick manufacturing cost estimate |
| `/first-part-right` | user | — | First Part Right — Zero-Scrap First Article Pipeline |
| `/injection-mold-quote` | user | — | Injection Mold Quote — Plastic Part Cost Estimator |
| `/quote` | project | 3 | /quote — Universal Job Quotation |
| `/quote` | user | — | Generate manufacturing quotes with cost breakdown |
| `/quote-job` | user | — | Quote Job — Manufacturing Quote Generator |
| `/quote-review` | user | — | Quote Review — Accuracy & Analytics Dashboard |
| `/quote-to-ship` | project | 3 | Quote-to-Ship Pipeline |
| `/quote-to-ship` | user | — | Quote-to-Ship Pipeline |
| `/ship-confirm` | project | 3 | /ship-confirm — Shipment Confirmation and Documentation |
| `/ship-confirm` | user | — | Confirm shipment and generate documentation |
| `/shop-quote` | project | 3 | /shop-quote — Quick Shop Floor Quote |
| `/shop-quote` | user | — | Generate shop-specific quotes with accurate costing |

## planning (37)

> Scheduling, capacity, traveler, shop-floor ops.

| Command | Source | Tier | Description |
|---------|--------|------|-------------|
| `/capacity-plan` | project | 3 | /capacity-plan — Shop Capacity Planning |
| `/capacity-plan` | user | — | Shop capacity planning and scheduling optimization |
| `/erp-health` | project | 2 | ERP persistence health check |
| `/erp-sync` | project | 3 | /erp-sync — ERP System Synchronization |
| `/erp-sync` | user | — | /erp-sync — ERP System Synchronization |
| `/job-cost` | project | 3 | Job Cost Estimator |
| `/job-cost` | user | — | Job Cost Estimator |
| `/job-planning` | user | — | Job Planning — End-to-End Manufacturing Job Planner |
| `/magazine-optimize` | user | — | Magazine Optimize — CNC Tool Magazine Layout Optimizer |
| `/material-lookup` | user | — | Material Lookup — PRISM Materials Database Query |
| `/material-price` | user | — | Material Price — Market-Adjusted Material Cost Lookup |
| `/material-stock` | project | — | View and manage material inventory — stock levels, reorder alerts, ISO group lookup, and JM Die seeding. |
| `/my-presets` | project | 3 | /my-presets — Preset Library & Learning Progression |
| `/my-shop` | project | — | View My Shop dashboard — data completeness, domain counts, and recommended actions to populate your shop profile. |
| `/order-status` | project | 3 | /order-status — Customer Portal & Milestone Tracking |
| `/pdf-process` | project | 3 | PDF Process — PDF Extraction Pipeline |
| `/schedule` | project | 3 | /schedule — Job Scheduling |
| `/schedule` | user | — | Job scheduling and capacity planning |
| `/shop-doctor` | user | — | Shop Doctor — Real-Time Manufacturing Problem Solver |
| `/shop-floor-query` | project | 3 | /shop-floor-query — Real-Time Shop Floor Intelligence |
| `/shop-floor-query` | user | — | Query shop floor status, machine availability, and job progress |
| `/shop-knowledge` | project | 3 | /shop-knowledge — Query Shop-Specific Knowledge from Box Programs |
| `/shop-live-status` | project | 3 | /shop-live-status — Live Shop Floor Status |
| `/shop-safety-check` | project | 3 | /shop-safety-check — Shop Floor Safety Validation |
| `/shop-safety-check` | user | — | /shop-safety-check — Shop Floor Safety Validation |
| `/shop-schedule` | project | 3 | Shop Schedule |
| `/shop-setup` | project | 3 | Shop Setup Wizard |
| `/shop-setup` | user | — | Generate setup sheets and work instructions for shop floor |
| `/stock-optimize` | user | — | Stock Optimize — Raw Material Size Selection |
| `/tool-catalog` | user | — | Tool Catalog — Unified Cutting Tool Database with Physical Dimensions |
| `/tool-enrich` | user | — | Tool Enrich — Unified Tool Database Enrichment Pipeline |
| `/tool-histogram` | user | — | Tool Histogram — Tool Usage Distribution |
| `/tool-life-max` | user | — | Tool Life Max — Squeeze Every Dollar from Every Cutter |
| `/tool-select` | user | — | Tool Select — Complete Tool Selection & Validation Pipeline |
| `/traveler` | project | 3 | /traveler — Job Traveler & Machine Dispatch |
| `/traveler` | user | — | /traveler — Job Traveler & Machine Dispatch |
| `/vendor` | project | — | Manage vendors, view scorecards, map supply chain, track brand preferences, and assess supply risk for JM Die. |

## learn (12)

> LoRA training, video/pdf-learn, knowledge ingestion, tribal capture.

| Command | Source | Tier | Description |
|---------|--------|------|-------------|
| `/distill-tribal` | project | — | Cluster near-duplicate tribal tips by TF-IDF cosine and emit canonical IdeaBlocks (Q-A markdown) to knowledge/wiki/code-tribal/canonical/. I |
| `/ingest` | project | — | Scan JM Die source roots and ingest files into PRISM. Scans for new/changed CNC programs, prints, CAD files, spreadsheets, and routes each t |
| `/learn` | project | 1 | /learn — Universal Learning Router |
| `/learn` | user | — | Universal learning router for all content types |
| `/learn-batch` | project | — | Run the 4 long-term learning hooks (meta-learning, error-learner, error-recovery, efficiency-monitor) as a batch via agent dispatch instead  |
| `/learn-everything` | user | — | Learn Everything — Exhaustive Knowledge Acquisition Pipeline |
| `/pdf-learn` | project | — | PDF Learn — AI-Powered PDF Knowledge Extraction |
| `/pdf-learn` | user | — | PDF Learn — Document to PRISM Components Pipeline |
| `/remember` | user | — | Remember — Structured Memory Persistence |
| `/train-lora` | project | 3 | Train LoRA — Nightly Adapter Training From Shop Outcomes |
| `/video-learn` | project | — | Video Learn — AI-Powered Video Knowledge Extraction |
| `/video-learn` | user | — | Video Learn — Video Tutorial to PRISM Components Pipeline |

## forge (35)

> /forge-* family — brainstorm→plan→iterate scaffolders.

| Command | Source | Tier | Description |
|---------|--------|------|-------------|
| `/forge` | user | — | Forge — Brainstorm → Plan → Iterate Pipeline |
| `/forge-app-wire` | user | — | Forge App Wire — PRISM App UI Full Feature Wiring Pipeline |
| `/forge-audit` | project | — | Forge Audit — Omniscient codebase audit (orchestrates 5 awareness layers + agent-findings) |
| `/forge-audit` | user | — | Forge Audit — Codebase Quality Scan Autopilot |
| `/forge-audit-v2` | user | 5 | Forge Audit v2 — codebase quality audit with Boris loop+agent discipline embedded. Verification feedback loop required, peer-Claude reviewer |
| `/forge-cleanup` | user | — | Forge Cleanup — Dead Code & File Detector |
| `/forge-debug` | user | — | Forge Debug — Structured Debugging Pipeline |
| `/forge-deps` | user | — | Forge Deps — Dependency Health Analyzer |
| `/forge-docs` | user | — | Forge Docs — Documentation Gap Analyzer & Generator |
| `/forge-drift` | user | — | Forge Drift — Registry & Documentation Drift Detector |
| `/forge-engines` | user | — | Forge Engines — Engine Discovery + Creation Autopilot |
| `/forge-from-scout` | user | — | Forge From Scout — Build Scouted Capabilities Into PRISM |
| `/forge-hooks` | user | — | Forge Hooks — Hook Discovery + Creation Autopilot |
| `/forge-learn` | user | — | Forge Learn — Continuous Learning Pipeline Orchestrator |
| `/forge-materials` | user | — | Forge Materials — Material Database Pipeline Autopilot |
| `/forge-mcp-wire` | user | — | Forge MCP Wire — Full MCP Server Integration Wiring Pipeline |
| `/forge-metrics` | user | — | Forge Metrics — Codebase Metrics Dashboard |
| `/forge-perf` | user | — | Forge Perf — Performance Profiling + Optimization Autopilot |
| `/forge-postflight` | user | — | Forge Postflight — Shared Integration Protocol |
| `/forge-safety` | user | — | Forge Safety — Safety Chain Audit + Hardening Autopilot |
| `/forge-schema` | user | — | Forge Schema — JSON Schema Validator & Generator |
| `/forge-skills` | user | — | Forge Skills — Skill Discovery + Creation Autopilot |
| `/forge-tests` | user | — | Forge Tests — Test Gap Discovery + Generation Autopilot |
| `/forge-triple` | project | — | Forge Triple — Engines + Skills + Hooks Pipeline |
| `/forge-triple` | user | — | /forge-triple — PRISM Engine+Skill+Hook Pipeline (thin launcher) |
| `/forge-types` | user | — | Forge Types — TypeScript Type Coverage Analyzer |
| `/forge-video-watchlist` | user | — | Forge Video Watchlist — Machining Video Learning Pipeline |
| `/forge-wiring` | user | — | Forge Wiring — Architecture Wiring Validator |
| `/forge2` | project | 3 | /forge2 — Project-Local Mirror |
| `/forge2` | user | — | Forge v2 — Full-surface Brainstorm → Plan → Iterate Pipeline (routes through 520 skills, 413 hooks, 770 wiki entries, 189 memories, 4,245 tr |
| `/forge3` | user | — | Forge v3 — v2 + superpowers methodology + codebase-memory layer + automation/optimization/monitoring/analysis skills + memory WRITE path + s |
| `/forge4` | user | — | Forge v4 — v3 + System-Viz atomic-first tier-gating. Phase 0.6 binds the live system-viz graph as the dependency oracle; Phase 3 inherits th |
| `/forge5` | user | — | Forge v5 — v4 + tool-discipline at every phase + compounding-gains tax. Every step in every phase names the EXACT tool to use. Every forge r |
| `/forge6` | user | — | Forge v6 — v5 + self-optimizing layer. Each phase of every forge run records pipeline telemetry; thresholds (tier-floor, context nudge, leve |
| `/forge7` | user | 5 | Forge v7 — v6 + Boris loop+agent discipline. Verification feedback loop is HARD GATE. Plan auto-reviewed by peer Claude. Subagents default t |

## audit (29)

> Audit/scrutinize/peer-review/drift detection.

| Command | Source | Tier | Description |
|---------|--------|------|-------------|
| `/audit-duplicates` | user | — | /audit-duplicates — Retroactive Duplicate Surface Skill |
| `/audit-task` | user | — | You are entering audit mode for PRISM completed tasks. Your job is to review, verify, find gaps, and enhance work that was already marked co |
| `/awareness-check` | project | 3 | /awareness-check — Awareness Score Check |
| `/awareness-check` | user | — | Run awareness score check with per-dimension breakdown |
| `/big-blob-hunt` | project | — | Scan git history for blobs above a size threshold; emit a candidates table with filter-repo / lfs-migrate / gc recommendations. Feeds U-GC-0 |
| `/check-dsl` | user | — | Check DSL Compatibility |
| `/dedup` | project | 2 | Engine Deduplication Scanner |
| `/dedup` | user | — | Check for duplicates before creating new engines, hooks, skills, or actions |
| `/dispatcher-coverage` | project | — | Pivot ENGINE_WIRING_INDEX.json on the dispatcher axis. Surfaces engines-per-dispatcher, listed-actions-per-dispatcher, dispatcher orphan rat |
| `/findings` | user | — | Findings — Open Issue Tracker |
| `/peer-review` | user | — | Cross-chat code review for the 6-chat synergy protocol. When /six-chat-commit-consensus dispatches you, run this on a peer chat's phase diff |
| `/prism-review` | user | — | PRISM Review — Dual-Perspective Multi-Role Code Review |
| `/propose-goal` | user | — | Propose top-ranked session goals from detected gaps, with cross-domain analogies for each |
| `/scrutinize` | project | 2 | Run scrutinization on a roadmap file. |
| `/scrutinize` | user | — | Scrutinize — Standalone Code Quality Review |
| `/scrutinize-mark` | project | — | Record completion of scrutiny (self review + parallel reviewer agent) so the Stop hook lets you finish. Run after /scrutinize and the spawne |
| `/scrutiny-batch` | project | — | Run the per-file scrutiny gate across N files in ONE parallel reviewer-agent block instead of N serial rounds. Optional loop mode re-runs af |
| `/scrutiny-replay` | project | — | Read a previous entry from `mcp-server/data/state/SCRUTINY_LEDGER.json` and re-emit its `opusReviewerPrompt` (arm A) + `opusReviewerPromptB` |
| `/skill-lint` | project | — | Run the static skill-quality linter over PRISM's skill library — flags lazy hand-wave language, bodies past the 500-line cap, descriptions w |
| `/skill-recall-tune` | project | — | Read archived-skill-suggest.mjs telemetry, compute P75 of true-positive BM25 scores, recommend a calibrated MIN_SCORE env-var. Replaces the  |
| `/skill-test` | project | — | Run the @eng_khairallah1 three-scenario production-grade test on a PRISM skill — invoke it against its happy / edge / stress fixtures, grade |
| `/staged-sanity` | project | — | Manual pre-commit dry-run that combines four checks into one report — (1) peer-claim conflicts on staged files (via /peer-file-isolation), ( |
| `/stale-milestones` | user | — | Surface milestones that have been pending too long — last shipped >30d ago, or never started despite being on the roadmap |
| `/test` | user | — | Test — Smart Test Runner |
| `/test-coverage` | user | — | Print test-coverage breakdown — engines with vs without companion test files, sliced by domain |
| `/trace` | user | — | Trace — Wiring Chain Tracer |
| `/trend` | user | — | Show past / present / projected trajectory for a named metric (Ψ, engine count, tribal tips, etc.) |
| `/verify-loop` | project | — | Verify Loop — Build + Test + Review Pipeline |
| `/verify-loop` | user | 1 | Build + Test + Review pipeline in one command |

## safety (3)

> Safety validation, harness-security.

| Command | Source | Tier | Description |
|---------|--------|------|-------------|
| `/enforce-role` | user | — | /enforce-role — Expert Role Enforcement |
| `/harness-security-audit` | project | — | Scan the Claude Code harness (settings.json, hooks, .mcp.json, CLAUDE.md) for security misconfigurations — leaked secrets, permission overre |
| `/safety-audit` | user | — | Safety Audit — PRISM Safety Chain Inspector |

## memory (4)

> Memory, snapshot, recall.

| Command | Source | Tier | Description |
|---------|--------|------|-------------|
| `/memory-search` | project | 1 | Memory Search — Semantic Lookup Across PRISM Qdrant Collections |
| `/reflect` | user | — | /reflect — Phase 0.13 Metacognitive Reflection |
| `/snapshot` | user | — | Snapshot — Save/load session context snapshot |
| `/sync-memory` | project | 1 | Sync Memory — Export/Import PRISM Memory Across PCs via H: Drive |

## session (16)

> Handoff, precompact, checkpoint, startup, session lifecycle.

| Command | Source | Tier | Description |
|---------|--------|------|-------------|
| `/boot` | user | — | Boot — Ultra-Fast Session Bootstrap |
| `/context` | user | — | Context — Context Budget Inspector |
| `/context-audit` | project | — | Context Audit — What's Eating Your Context Window |
| `/context-audit` | user | 1 | What's eating your context window? — audit + recommendations |
| `/context-integrity` | user | — | Context Integrity — Quality Guard for Token-Optimized Sessions |
| `/context-map` | user | — | Context Map — Visualize Context Window Contents |
| `/handoff` | user | — | Handoff — Session Continuity Protocol |
| `/precompact` | project | 3 | Pre-Compact — Session Continuation Handoff |
| `/precompact` | user | — | Pre-Compact — Session Continuation Handoff |
| `/pressure` | user | — | Pressure — Context Window Pressure Monitor |
| `/reap-zombies` | project | 3 | /reap-zombies — Dead Claim Cleanup |
| `/reap-zombies` | user | — | Kill dead claims from crashed sessions |
| `/sessions` | user | — | /sessions — View Active Sessions (U-COORD07) |
| `/startup` | project | — | Session Startup Macro |
| `/startup` | user | — | /startup — PRISM Session Startup (thin launcher) |
| `/stop-check` | user | — | Stop Check — Evaluate if a tool call should proceed |

## infra (27)

> Hooks, fleet, swarm, claim-phase, chat, slot, peer-coordination.

| Command | Source | Tier | Description |
|---------|--------|------|-------------|
| `/broadcast` | user | — | /broadcast — Send Message to All Sessions (U-COORD08) |
| `/chat` | project | 3 | Shared Agent Chat |
| `/chat` | user | — | Shared Agent Chat |
| `/chat-topic` | user | — | Relabel the current chat so it surfaces under a custom name in the resume picker. Wraps per-agent-handoff.mjs --topic. The enforce-handoff-t |
| `/checkin` | project | — | Check this chat into the 6-slot PRISM fleet (claim alpha/bravo/charlie/delta/echo/foxtrot), bind the handoff filename to the slot, reap cras |
| `/claim-phase` | user | — | Atomically claim a roadmap phase for this chat. Verifies dependencies are merged, creates worktree if needed, checks out the phase branch, a |
| `/hook-browse` | user | — | Hook Browse — PRISM Hook Explorer |
| `/hook-enable` | user | — | /hook-enable — Phase 0.16 Re-enable Disabled Hooks |
| `/hook-profile` | user | — | Hook Profile — Hook Overhead Analyzer |
| `/hook-profile-set` | project | — | View or change the PRISM_HOOK_PROFILE runtime gate (minimal \| standard \| strict). Lets you cut hook overhead 60-90% for routine work witho |
| `/hook-stats` | user | — | Hook Stats — Token savings from hooks this session |
| `/hook-status` | user | — | Hook Status — Enforcement Dashboard |
| `/peer-file-isolation` | project | — | Cross-reference this chat's working-tree mutations (staged + unstaged + untracked) against the chat-bus file-claim ledger (`state/shared/cha |
| `/pick-task` | user | — | You are about to pick and claim a task from the PRISM Roadmap Generation System (RGS) via the TaskClaimService. This connects you to the mul |
| `/pick-unit` | project | — | Deterministic next-unit picker from the two master roadmaps (devtools first, then revenue). Subtracts already-shipped units, sorts by priori |
| `/pr-swarm` | user | — | /pr-swarm — Phase 0.17 U-PLG8 Multi-Agent PR Review Orchestration |
| `/six-chat-bootstrap` | user | — | Fire up the 6-chat synergy protocol. Run ONCE in a single chat to seed the master atomic roadmap, assign 6 phases to 6 chat slots, and emit  |
| `/six-chat-commit-consensus` | user | — | The commit gate for the 6-chat synergy protocol. Holds ALL commits until every chat has posted "phase ready" AND 3-way LLM review (Codex + G |
| `/six-chat-ready` | user | — | One-shot pre-flight for the 6-chat fleet. Runs ai-priority-rank → atomic-roadmap-emit → conflict-predict and prints GREEN/YELLOW/RED + the n |
| `/slim` | user | — | Slim — Active Context Optimizer |
| `/sync` | user | — | Sync System State |
| `/sync-drives` | user | — | /sync-drives — Sync H: and C: drive Claude config |
| `/sync-rebase` | user | — | Fetch origin and rebase the current phase branch on top of origin/main, with pre-rebase conflict prediction. Run before any push or commit-b |
| `/sync-terminals` | project | 3 | /sync-terminals — Cross-Terminal Synchronization |
| `/sync-terminals` | user | — | Force cross-terminal coordination refresh |
| `/who` | user | — | /who — View Active Sessions |
| `/workboard` | user | — | Render the live 6-chat workboard — who owns which roadmap phase, blocked-by chains, file claims from chat bus, ETA. Read-only. Use to see th |

## ops (14)

> Machine-* tools (per-machine setup, hardening, ROI).

| Command | Source | Tier | Description |
|---------|--------|------|-------------|
| `/acquire-models` | user | — | Acquire Models — Automated CNC Machine 3D Model Finder |
| `/controller-enrich` | user | — | Controller Enrich — Machine Controller Knowledge Pipeline |
| `/ergo-check` | user | — | Ergo Check — CNC Workstation Ergonomic Assessment |
| `/machine-check` | user | — | Machine Check — Validate Machining Parameters Against Machine Limits |
| `/machine-enrich` | user | — | Machine Enrich — Machine Database Enrichment Pipeline |
| `/machine-harden` | project | 2 | Machine Harden — Machine Database Hardening Pipeline |
| `/machine-optimize` | user | — | Machine Optimize — Full Machine Utilization Analysis |
| `/machine-roi` | user | — | Machine ROI — Which Machine Should Run Which Jobs for Maximum Profit |
| `/okuma-macro` | user | — | Okuma Macro — Parametric CNC Program Generator |
| `/operating-system` | user | — | Operating System — Shell Bootstrap, Job Desk, Program Release, Scheduling, Shop Floor |
| `/process-calc` | user | — | Process Calc — Unified Manufacturing Process Calculator |
| `/process-health` | user | — | Process Health — Instant Process Physics Dashboard |
| `/secondary-ops` | user | — | Secondary Ops — Manufacturing Secondary Operations Lookup |
| `/setup-sheet-generate` | user | — | Setup Sheet Generate — CNC Job Setup Sheet Automation |

## dev (23)

> Code-index, dispatcher, engine, action, formula, algorithm explorers + dev meta.

| Command | Source | Tier | Description |
|---------|--------|------|-------------|
| `/action-help` | user | — | Action Help — Quick parameter lookup for any dispatcher action |
| `/action-search` | user | — | Action Search — Dispatcher Action Discovery |
| `/algorithm-inspect` | user | — | Algorithm Inspect — PRISM Algorithm Explorer |
| `/code-index` | user | — | Code Index — PRISM DSL Shortcode Lookup |
| `/commands` | user | — | List All Available Slash Commands |
| `/commands-audit` | user | — | /commands-audit — Phase 0.17 Slash Command + Agent Utilization Audit |
| `/digest` | user | — | Digest — Compact file/directory summary |
| `/digest-all` | user | — | Digest All — Load Complete System Map in Minimal Tokens |
| `/doc-sync` | user | — | /doc-sync — Phase 0.15 Documentation Propagation |
| `/engine-browse` | user | — | Engine Browse — PRISM Engine Explorer |
| `/fix-hook-schemas` | project | — | /fix-hook-schemas — Audit and repair Claude Code hook-output schema bugs |
| `/formula-browse` | user | — | Formula Browse — PRISM Formula Explorer |
| `/generalize` | user | — | Lift a concrete shop-floor tip up the abstraction hierarchy (tip → rule → principle → law) and surface the most-abstract ancestor that cover |
| `/impact` | user | — | /impact — Blast-Radius Analysis Before Editing |
| `/iterate-retrieve` | project | — | Progressive context refinement for codebase search. Runs DISPATCH→EVALUATE→REFINE→LOOP (max 3 cycles) and returns ranked, scored files. Use  |
| `/plan-build` | user | — | Plan-Build — Structured Planning Before Engine Creation |
| `/read-plan` | user | — | Read Plan — Optimal File Reading Strategy |
| `/registry-browse` | user | — | Registry Browse — PRISM Registry Explorer |
| `/scope` | user | — | Scope — Change Impact Analysis |
| `/scout` | user | — | Scout — Discover New MCP Servers, Plugins, Tools & Claude Features |
| `/scripts` | user | — | Scripts — PRISM Script Manager |
| `/simulate-change` | user | — | Pre-play a proposed file change through PRISM's predictive world simulator and return break-probability, affected files, risk tier, and reco |
| `/update-all-docs` | user | — | Update All Documents |

## roadmap (23)

> RGS, generate-roadmap, milestone tools, envelope-sync, close-out.

| Command | Source | Tier | Description |
|---------|--------|------|-------------|
| `/addtomatrix` | user | — | Add to Matrix — Register Products in MASTER_INDEX |
| `/close-out` | project | — | Close out a completed milestone across every roadmap surface — roadmap-index.json, MILESTONE_PROGRESS, BUILD_STATE, and the chat bus. Use af |
| `/continue-roadmap` | project | 3 | Continue executing a roadmap from its current position. |
| `/defaults` | user | — | Defaults — Smart machining parameter defaults |
| `/delete` | user | — | /delete — Safe Engine Deletion with Dependency Check |
| `/envelope-drift-fix` | project | — | Orchestrator that combines `/envelope-sync` (drift detection + patch proposal), automatic patch application (gated by --fix), AND the 4-surf |
| `/envelope-sync` | project | — | Reconcile drifted milestone envelopes with git reality — propose status-flip patches for envelope JSONs whose claimedStatus disagrees with d |
| `/envelope-sync` | user | — | Reconcile drifted milestone envelopes with git reality — propose status-flip patches for envelope JSONs whose claimedStatus disagrees with d |
| `/foresight` | project | — | /foresight — PSAU-FORESIGHT Pre-Build Report |
| `/generate-roadmap` | project | 3 | Generate a fully-detailed RGS-format roadmap from a brief. |
| `/milestone` | user | — | Milestone — Quick Milestone Viewer |
| `/release-ready` | user | — | Release Ready — Pre-Release Validation Suite |
| `/rgs` | project | 3 | RGS — Roadmap Generation System |
| `/rgs` | user | — | RGS — Roadmap Generation System |
| `/rgs-sync` | project | 3 | Shared RGS Sync |
| `/rgs2` | project | 3 | RGS v2 — Project-Local Mirror |
| `/rgs2` | user | — | RGS v2 — 12-stage Roadmap Generation System with hybrid Claude+Ollama scrutiny + 3-way Codex/Gemini/Opus consensus + full PRISM knowledge la |
| `/rgs3` | project | 3 | /rgs3 — Project-Local Mirror |
| `/rgs3` | user | — | RGS v3 — 14-stage pipeline (v2's 12 + S0.5 system-pressure + S11.5 cron-registration) with superpowers methodology + codebase-memory + autom |
| `/rgs4` | user | — | RGS v4 — v3 14-stage pipeline + System-Viz atomic-first tier-gating. New Stage 0.6 (System-Viz Tier-Gating) before S1; Stage 5 binds meta.ro |
| `/rgs5` | user | — | RGS v5 — v4 + tool-discipline + compounding-gains. Every step in every stage of every unit names the EXACT tool / skill / dispatcher / scrip |
| `/rgs6` | user | — | RGS v6 — v5 + self-optimizing layer. Pipeline-telemetry records every step's decision + outcome. Adaptive-thresholds tunes 6 magic-number pa |
| `/roadmap-quality-check` | user | — | Roadmap Quality Check — Post-Compact Session Scrutiny |

## autopilot (11)

> Yolo, autopilot, smart, run-continuous, batch automation.

| Command | Source | Tier | Description |
|---------|--------|------|-------------|
| `/autopilot` | user | — | Autopilot — Full Development Cycle Pipeline |
| `/autopilot-camk` | user | — | Autopilot CAMK+SCI — CAM Kernel & Scientific Validation Pipeline |
| `/autopilot-full` | user | — | Autopilot Full — Maximum Autonomous Development Pipeline |
| `/batch-check` | user | — | Batch Check — Analyze tool calls for batching opportunities |
| `/batch-optimize` | project | 1 | /batch-optimize — Fleet-Wide Physics Optimization |
| `/full-job` | user | — | Full Job — Complete Manufacturing Job Pipeline |
| `/run-continuous` | user | — | Per-chat work loop for the 6-chat synergy protocol. Auto-claims a phase from the master atomic roadmap, executes its units, runs constant /s |
| `/smart` | project | 3 | You are about to execute a prompt with intelligent auto-configuration. Follow this protocol exactly. |
| `/smart` | user | 1 | Auto-configuration protocol for the active prompt |
| `/smart-route` | user | — | Smart Route — Find the most token-efficient path for any query |
| `/yolo-mode` | user | — | YOLO Mode — Maximum Velocity Development |

## viz (13)

> system-viz, awareness, master-index, build-state, orphan-inventory.

| Command | Source | Tier | Description |
|---------|--------|------|-------------|
| `/awareness-snapshot` | project | — | One-shot PRISM awareness snapshot — built/wired/utilized/drifted in 60 lines. Regenerates state/shared/AWARENESS-SNAPSHOT.md by orchestratin |
| `/build-state` | project | — | Print the current PRISM BUILD_STATE — built vs unwired vs pending vs frontend-merge — and offer drill-down |
| `/build-state` | user | — | Print the current PRISM BUILD_STATE — built vs unwired vs pending vs frontend-merge — and offer drill-down |
| `/deep-search` | project | — | Search-first then deep-reason fallback. Runs master_index_query first; if top hits all score below the confidence floor, escalates to model  |
| `/deep-think` | user | — | /deep-think — Activate Deep Thinker Mode |
| `/emerging-thesis` | project | — | TF-IDF synthesis over recent vault activity — surfaces the dominant concept emerging from knowledge/memories in the last 24h/7d/30d. Returns |
| `/master-index` | project | — | Unified master search across system-viz graph + Obsidian vault + capability index + BUILD_STATE. Use INSTEAD OF Grep/Glob/Agent for "where i |
| `/model-status` | project | 3 | Model Status — Local LLM Stack Health Snapshot |
| `/orphan-inventory` | project | — | Generate the built-but-unwired audit punch list. Reads system-graph orphans (low in/out-degree but documented) + groups by suggested dispatc |
| `/pipeline-optimize` | user | — | End-to-end pipeline optimization — cost, safety, TCO, tool changes, fixture, batch. |
| `/system-viz` | project | — | Open the PRISM Live System Map (3D, 10-layer atomic neural-network viz of the entire codebase). Auto-regenerates the graph from live state,  |
| `/utilization-dashboard` | project | — | Graph-wide utilization classifier — buckets every PRISM node into hub/sink/source/orphan/ghost. Use to answer "what's actually being used?"  |
| `/waste-report` | user | — | Waste Report — Token Waste Analysis Dashboard |

## docs (17)

> Commands listing, prism-paths, ref-first, manifest, capabilities, wiki.

| Command | Source | Tier | Description |
|---------|--------|------|-------------|
| `/aware` | user | — | /aware — Phase 0.13 Situational Awareness Query |
| `/capabilities` | user | — | Capabilities — Discover PRISM Tools at the Moment of Need |
| `/capability-manifest` | user | — | /capability-manifest — Phase 0.13 AI Capability Inventory |
| `/counts` | user | — | Counts — Live System Metrics (No Cache) |
| `/health` | user | — | System Health Check |
| `/prism-paths` | user | — | PRISM Paths — Quick Reference |
| `/quick-ref` | user | — | Quick Ref — Zero-Cost Context Card |
| `/system-audit` | user | — | System Audit — Complete PRISM System Health Check |
| `/system-health` | user | — | /system-health — Comprehensive System Health Check |
| `/wiki-bootstrap` | user | — | One-time bootstrap — populate wiki/index.md and wiki/log.md from existing PRISM engine/dispatcher inventory + memory vault. |
| `/wiki-harvest` | user | — | Run the three wiki-harvest bridges (patterns, tribal, lessons) — refresh wiki/patterns, wiki/code-tribal, wiki/lessons. |
| `/wiki-ingest` | user | — | Ingest a raw source (PDF, article, transcript, code excerpt) into the PRISM wiki via the 5-stage Ollama→Claude pipeline. |
| `/wiki-lint` | user | — | Run the safety-aware wiki health check — orphans, broken refs, stale claims, physics drift, contradictions. |
| `/wiki-morning` | user | — | Daily 60-second wiki briefing — yesterday's audit log + today's lint findings + harvest deltas. |
| `/wiki-page` | user | — | Open or create a specific wiki page by slug. Reads the page if it exists; scaffolds a new page if it doesn't. |
| `/wiki-query` | user | — | Query the PRISM wiki by similarity (HNSW + Ollama embed), then synthesise an answer with citations. |
| `/wiki-sync` | user | — | Materialise PRISM self-awareness, AGI/Creative-Reasoning decisions, DL/LoRA patterns, and SONA trajectories into the wiki vault. |

## meta (54)

> RTK setup, profile switchers, model selection, harness configuration.

| Command | Source | Tier | Description |
|---------|--------|------|-------------|
| `/approvals` | project | 3 | /approvals — Approval Workflow Management |
| `/approvals` | user | 1 | Approval workflow manager |
| `/bash-optimize` | user | — | Bash Optimize — Convert Repetitive Bash Commands into Token-Saving Automations |
| `/bash-shortcuts` | user | — | Bash Shortcuts — Quick Reference for Token-Saving Scripts |
| `/calibrate` | user | — | Calibrate — Live Physics Calibration from Measured Data |
| `/claude-flow-help` | project | 1 | Show Claude-Flow commands and usage |
| `/claude-flow-memory` | project | 1 | Interact with Claude-Flow memory system |
| `/claude-flow-swarm` | project | 1 | Coordinate multi-agent swarms for complex tasks |
| `/de-sloppify` | project | — | De-Sloppify — Focused Post-Generation Cleanup |
| `/de-sloppify` | user | 1 | Focused post-generation quality cleanup |
| `/outcome` | project | 3 | Outcome — Log Shop Run Result for PRISM Learning Loop |
| `/predict` | user | — | Predict — Machine-Learned Manufacturing Prediction |
| `/replay` | user | — | Replay — Session context reconstruction |
| `/rtk-setup` | user | — | RTK Setup — Install Rust Token Killer for 60–90% Bash Token Reduction |
| `/sparc` | user | — | /sparc — Phase 0.17 U-PLG6 SPARC Methodology Router |
| `/sparc/analyzer` | archive | — | SPARC Analyzer Mode |
| `/sparc/architect` | archive | — | SPARC Architect Mode |
| `/sparc/ask` | archive | — | ❓Ask - You are a task-formulation guide that helps users navigate, ask, and delegate tasks to the correc... |
| `/sparc/batch-executor` | archive | — | SPARC Batch Executor Mode |
| `/sparc/code` | archive | — | 🧠 Auto-Coder - You write clean, efficient, modular code based on pseudocode and architecture. You use configurat... |
| `/sparc/coder` | archive | — | SPARC Coder Mode |
| `/sparc/debug` | archive | — | 🪲 Debugger - You troubleshoot runtime bugs, logic errors, or integration failures by tracing, inspecting, and ... |
| `/sparc/debugger` | archive | — | SPARC Debugger Mode |
| `/sparc/designer` | archive | — | SPARC Designer Mode |
| `/sparc/devops` | archive | — | 🚀 DevOps - You are the DevOps automation and infrastructure specialist responsible for deploying, managing, ... |
| `/sparc/docs-writer` | archive | — | 📚 Documentation Writer - You write concise, clear, and modular Markdown documentation that explains usage, integration, se... |
| `/sparc/documenter` | archive | — | SPARC Documenter Mode |
| `/sparc/innovator` | archive | — | SPARC Innovator Mode |
| `/sparc/integration` | archive | — | 🔗 System Integrator - You merge the outputs of all modes into a working, tested, production-ready system. You ensure co... |
| `/sparc/mcp` | archive | — | ♾️ MCP Integration - You are the MCP (Management Control Panel) integration specialist responsible for connecting to a... |
| `/sparc/memory-manager` | archive | — | SPARC Memory Manager Mode |
| `/sparc/optimizer` | archive | — | SPARC Optimizer Mode |
| `/sparc/orchestrator` | archive | — | SPARC Orchestrator Mode |
| `/sparc/post-deployment-monitoring-mode` | archive | — | 📈 Deployment Monitor - You observe the system post-launch, collecting performance, logs, and user feedback. You flag reg... |
| `/sparc/refinement-optimization-mode` | archive | — | 🧹 Optimizer - You refactor, modularize, and improve system performance. You enforce file size limits, dependenc... |
| `/sparc/researcher` | archive | — | SPARC Researcher Mode |
| `/sparc/reviewer` | archive | — | SPARC Reviewer Mode |
| `/sparc/security-review` | archive | — | 🛡️ Security Reviewer - You perform static and dynamic audits to ensure secure code practices. You flag secrets, poor mod... |
| `/sparc/sparc` | archive | — | ⚡️ SPARC Orchestrator - You are SPARC, the orchestrator of complex workflows. You break down large objectives into delega... |
| `/sparc/sparc-modes` | archive | — | SPARC Modes Overview |
| `/sparc/spec-pseudocode` | archive | — | 📋 Specification Writer - You capture full project context—functional requirements, edge cases, constraints—and translate t... |
| `/sparc/supabase-admin` | archive | — | 🔐 Supabase Admin - You are the Supabase database, authentication, and storage specialist. You design and implement d... |
| `/sparc/swarm-coordinator` | archive | — | SPARC Swarm Coordinator Mode |
| `/sparc/tdd` | archive | — | SPARC TDD Mode |
| `/sparc/tester` | archive | — | SPARC Tester Mode |
| `/sparc/tutorial` | archive | — | 📘 SPARC Tutorial - You are the SPARC onboarding and education assistant. Your job is to guide users through the full... |
| `/sparc/workflow-manager` | archive | — | SPARC Workflow Manager Mode |
| `/switch-profile` | user | — | Switch Claude Code profile between Opus 4.7 (1M) and Opus 4.5 (200K) for A/B benchmarking. Wraps H:/prism/scripts/switch-claude-profile.ps1. |
| `/template` | user | — | Template — Use a prompt template for common tasks |
| `/token-budget` | user | — | Token Budget — Check and optimize context usage |
| `/token-dashboard` | user | — | Token Dashboard — Unified Token Economy View |
| `/token-ledger` | user | — | Token Ledger — Session Token Cost Accounting |
| `/what-changed` | user | — | What Changed — Recent Activity Snapshot |
| `/what-if` | user | — | What-If — Unified Delta Analysis Across All Physics |

## misc (161)

> Nothing else matched (review periodically — should always be tiny).

| Command | Source | Tier | Description |
|---------|--------|------|-------------|
| `/_flat-variants/cam-fixture` | archive | 3 | /cam-fixture — Fixture Design Assistant |
| `/_flat-variants/cam-post-lint` | archive | 3 | /cam-post-lint — CAM to Post-Processor Lint Check |
| `/_flat-variants/cam-toolpath-check` | archive | 3 | /cam-toolpath-check — Toolpath Validation and Analysis |
| `/_flat-variants/cam-workholding` | archive | 3 | /cam-workholding — Workholding Force and Safety Analysis |
| `/_flat-variants/grinder-harden` | archive | 2 | /grinder-harden — Grinding AI Hardening |
| `/_flat-variants/grinder-learn` | archive | 1 | /grinder-learn — Grinding Knowledge Extraction |
| `/_flat-variants/grinder-optimize` | archive | 1 | /grinder-optimize — Grinding Program Optimization |
| `/_flat-variants/grinder-studio` | archive | 3 | /grinder-studio — Grinding Studio Pipeline |
| `/_flat-variants/grinder-validate` | archive | 1 | /grinder-validate — Grinding Program Validation |
| `/_flat-variants/lathe-harden` | archive | 2 | /lathe-harden — Lathe AI Hardening |
| `/_flat-variants/lathe-learn` | archive | 1 | /lathe-learn — Lathe Knowledge Extraction |
| `/_flat-variants/lathe-optimize` | archive | 1 | /lathe-optimize — Lathe Program Optimization |
| `/_flat-variants/lathe-validate` | archive | 1 | /lathe-validate — Lathe Program Validation |
| `/_flat-variants/mill-harden` | archive | 2 | /mill-harden — Mill AI Hardening |
| `/_flat-variants/mill-learn` | archive | 1 | /mill-learn — Mill Knowledge Extraction |
| `/_flat-variants/mill-optimize` | archive | 1 | /mill-optimize — Mill Program Optimization |
| `/_flat-variants/mill-validate` | archive | 1 | /mill-validate — Mill Program Validation |
| `/_flat-variants/sinker-harden` | archive | 2 | /sinker-harden — Sinker EDM AI Hardening |
| `/_flat-variants/sinker-learn` | archive | 1 | /sinker-learn — Sinker EDM Knowledge Extraction |
| `/_flat-variants/sinker-optimize` | archive | 1 | /sinker-optimize — Sinker EDM Program Optimization |
| `/_flat-variants/sinker-studio` | archive | 3 | /sinker-studio — Sinker EDM Studio Pipeline |
| `/_flat-variants/sinker-validate` | archive | 1 | /sinker-validate — Sinker EDM Program Validation |
| `/_flat-variants/wedm-batch` | archive | 3 | /wedm-batch — Wire EDM Batch Operations |
| `/_flat-variants/wedm-cite` | archive | — | Verify WEDM parameter citations and replace synthetic values with catalog references |
| `/_flat-variants/welder-harden` | archive | 2 | /welder-harden — Welding AI Hardening |
| `/_flat-variants/welder-learn` | archive | 1 | /welder-learn — Welding Knowledge Extraction |
| `/_flat-variants/welder-optimize` | archive | 1 | /welder-optimize — Welding Program Optimization |
| `/_flat-variants/welder-studio` | archive | 3 | /welder-studio — Welding Studio Pipeline |
| `/_flat-variants/welder-validate` | archive | 1 | /welder-validate — Welding Program Validation |
| `/_self-awareness-protocol` | user | — | Self-Awareness Integration Protocol (MANDATORY FOR ALL FORGE/RGS/AUTOPILOT COMMANDS) |
| `/activate-local` | user | — | Activate Local — Launch PRISM Docker + Ollama Stack |
| `/advisor-strategy` | project | 1 | Claude Advisor strategy router |
| `/agi-cad-generate` | project | 3 | Neural CAD Generation Studio |
| `/ai-analyze` | user | — | /ai-analyze — Full-Stack AI Analysis of Code or Parameters |
| `/ai-optimize` | user | — | /ai-optimize — Multi-Hypothesis Optimization with EV Ranking |
| `/ai-reason` | user | — | /ai-reason — Advanced Reasoning for Manufacturing Problems |
| `/analysis/bottleneck-detect` | archive | — | bottleneck detect |
| `/analysis/command_compliance_report` | archive | — | Analysis Commands Compliance Report |
| `/analysis/performance-bottlenecks` | archive | — | Performance Bottleneck Analysis |
| `/analysis/performance-report` | archive | — | performance-report |
| `/analysis/readme` | archive | — | Analysis Commands |
| `/analysis/token-efficiency` | archive | — | Token Usage Optimization |
| `/analysis/token-usage` | archive | — | token-usage |
| `/analysis/token-usage` | user | — | Token Usage — Session Token Economy Report |
| `/auto-commit` | user | — | Auto-Commit — Automatic Git Commits |
| `/automation/auto-agent` | archive | — | auto agent |
| `/automation/readme` | archive | — | Automation Commands |
| `/automation/self-healing` | archive | — | Self-Healing Workflows |
| `/automation/session-memory` | archive | — | Cross-Session Memory |
| `/automation/smart-agents` | archive | — | Smart Agent Auto-Spawning |
| `/automation/smart-spawn` | archive | — | smart-spawn |
| `/automation/workflow-select` | archive | — | workflow-select |
| `/calc` | user | — | Calc — Quick CNC calculation (zero dispatcher overhead) |
| `/chip-control` | user | — | Turning chip control assistant — chipbreaker catalog validation (Sandvik / Kennametal / ISCAR / Tungaloy / Mitsubishi), CSS high-RPM wrappin |
| `/core/decision-log` | user | — | Decision Log — Record WHY Choices Were Made |
| `/core/efficiency-pulse` | user | — | Efficiency Pulse — Detect Repeated/Wasteful Work |
| `/core/error-learner` | user | — | Error Learner — Capture Errors to Prevent Recurrence |
| `/core/pre-flight` | user | — | Pre-Flight — Check Before Destructive Operations |
| `/core/session-state` | user | — | Session State — Persist Key Context |
| `/coverage-by-domain` | user | — | Per-domain wired/unwired coverage breakdown — see which domains (Lathe, Mill, WEDM, etc.) are most lagging on dispatcher wiring |
| `/curiosity-queue` | user | — | Rank PRISM's idle-time exploration queue — never-accessed assets, unregistered files, zero-citation tips, zero-invocation actions — and pop  |
| `/desk-search` | project | 1 | /desk-search — Role-Based Desks + Global Search |
| `/dfm-check` | user | — | DFM Check — Design for Manufacturability Analysis via DFMPipeline |
| `/drill-calc` | user | — | Drill Calc — Quick Drilling Parameter Calculator |
| `/e2-setup` | project | 3 | E2 Setup — E2 Shop System Connection Wizard |
| `/error-learn-review` | project | — | Review captured hook-block / tool-error patterns from the error-learn ledger. Inspect what's been blocked, see frequency-ranked patterns, an |
| `/extract-dark-content` | project | 2 | /extract-dark-content — Dark Content Discovery |
| `/extract-dark-content` | user | — | Auto-scan for unextracted files on H: drive |
| `/feasibility-check` | user | — | Feasibility Check — Can This Part Actually Be Machined? |
| `/frontend-merge-plan` | project | — | Compare codex frontend builds (cqask/ui, mcp-cadquery/frontend) against main mcp-server/web; output port-vs-sandbox decision with React-vers |
| `/frontend-merge-plan` | user | — | Compare codex frontend builds (cqask/ui, mcp-cadquery/frontend) against main mcp-server/web; output port-vs-sandbox decision with React-vers |
| `/github/code-review` | archive | — | code-review |
| `/github/code-review-swarm` | archive | — | Code Review Swarm - Automated Code Review with AI Agents |
| `/github/github-modes` | archive | — | GitHub Integration Modes |
| `/github/github-swarm` | archive | — | github swarm |
| `/github/issue-tracker` | archive | — | GitHub Issue Tracker |
| `/github/issue-triage` | archive | — | issue-triage |
| `/github/multi-repo-swarm` | archive | — | Multi-Repo Swarm - Cross-Repository Swarm Orchestration |
| `/github/pr-enhance` | archive | — | pr-enhance |
| `/github/pr-manager` | archive | — | GitHub PR Manager |
| `/github/project-board-sync` | archive | — | Project Board Sync - GitHub Projects Integration |
| `/github/readme` | archive | — | Github Commands |
| `/github/release-manager` | archive | — | GitHub Release Manager |
| `/github/release-swarm` | archive | — | Release Swarm - Intelligent Release Automation |
| `/github/repo-analyze` | archive | — | repo-analyze |
| `/github/repo-architect` | archive | — | GitHub Repository Architect |
| `/github/swarm-issue` | archive | — | Swarm Issue - Issue-Based Swarm Coordination |
| `/github/swarm-pr` | archive | — | Swarm PR - Managing Swarms through Pull Requests |
| `/github/sync-coordinator` | archive | — | GitHub Sync Coordinator |
| `/github/workflow-automation` | archive | — | Workflow Automation - GitHub Actions Integration |
| `/hooks/overview` | archive | — | Claude Code Hooks for claude-flow |
| `/hooks/post-edit` | archive | — | hook post-edit |
| `/hooks/post-task` | archive | — | hook post-task |
| `/hooks/pre-edit` | archive | — | hook pre-edit |
| `/hooks/pre-task` | archive | — | hook pre-task |
| `/hooks/readme` | archive | — | Hooks Commands |
| `/hooks/session-end` | archive | — | hook session-end |
| `/hooks/setup` | archive | — | Setting Up ruv-swarm Hooks |
| `/karpathy` | project | — | Reaffirm the Karpathy 4 coding rules in the current chat. Use when starting a complex implementation or after a compaction wipes the Session |
| `/local-ask` | project | 3 | Local Ask — Route Prompt Through Local LLM Stack First |
| `/local-health` | project | — | Check Ollama/Docker stack health and token savings potential |
| `/machining-ai` | user | — | Machining AI super-orchestrator - coordinates 348 AI subsystems for print-to-G-code planning |
| `/macro-convert` | project | 3 | /macro-convert — Convert Hardcoded Programs to Parametric Macros |
| `/measure` | user | — | Measure — Record Physical Measurement & Learn |
| `/mesh-on` | user | — | /mesh-on — Live Session Mesh Status |
| `/monitoring/agent-metrics` | archive | — | agent-metrics |
| `/monitoring/agents` | archive | — | List Active Patterns |
| `/monitoring/readme` | archive | — | Monitoring Commands |
| `/monitoring/real-time-view` | archive | — | real-time-view |
| `/monitoring/status` | archive | — | Check Coordination Status |
| `/monitoring/swarm-monitor` | archive | — | swarm-monitor |
| `/navigate` | user | — | Navigate — Find Any PRISM Component Instantly |
| `/offload-stats` | project | — | Show Ollama task offloading statistics and token savings |
| `/ollama-architecture-plan` | project | 3 | Ollama-Powered PRISM Architecture Plan |
| `/ollama-boilerplate` | user | 2 | Ollama Boilerplate — Local LLM Code Scaffolding |
| `/ollama-classify` | user | 2 | Ollama Classify — Local LLM Task/File Classification |
| `/ollama-diff-summary` | user | 2 | Ollama Diff Summary — Local Git Diff Analysis |
| `/ollama-docstring` | user | 2 | Ollama Docstring — Local JSDoc/TSDoc Generation |
| `/ollama-error-triage` | user | 2 | Ollama Error Triage — Local Error Analysis |
| `/ollama-explain` | user | 1 | Ollama Explain — Local LLM Code/Concept Explanation |
| `/ollama-extract` | user | 2 | Ollama Extract — Local LLM Knowledge Extraction |
| `/ollama-summarize` | user | 1 | Ollama Summarize — Local LLM Content Summarization |
| `/ollama-test-stub` | user | 2 | Ollama Test Stub — Local Test Case Generation |
| `/optimization/auto-topology` | archive | — | Automatic Topology Selection |
| `/optimization/cache-manage` | archive | — | cache-manage |
| `/optimization/parallel-execute` | archive | — | parallel-execute |
| `/optimization/parallel-execution` | archive | — | Parallel Task Execution |
| `/optimization/readme` | archive | — | Optimization Commands |
| `/optimization/topology-optimize` | archive | — | topology-optimize |
| `/page-sweep` | project | 3 | import { createRequire } from 'module'; import { fileURLToPath } from 'url'; import { dirname } from 'path'; const require = createRequire(i |
| `/playbook` | user | — | Playbook — Machining Best Practice Advisor |
| `/prints` | project | — | Manage engineering prints/drawings, search by part number or customer, view revision history, and track print library stats. |
| `/process-docs` | project | — | Extract structured data from POs, invoices, and RFQs. Auto-classify documents, review pending extractions, and approve or reject. |
| `/quick-archive` | project | — | Sweep matching skills/files to commands-archive/ in one operation. Companion to HS-06 Phase 3 archive sweeps and the archived-skill-suggest  |
| `/refresh-awareness` | project | — | Regenerate all auto-injected awareness artifacts — build context, build vision, Claude brief — so the next prompt has fresh context on what  |
| `/rename` | user | — | /rename — Coordinated Multi-File Engine Rename |
| `/resource-census` | project | 3 | Resource Census — Inventory All Resources Across PRISM Locations |
| `/roi-analysis` | user | — | ROI Analysis — Upgrade Payback Calculator |
| `/self-improve` | project | 1 | Self-improvement pattern scanner |
| `/ship` | user | — | Ship / Complete Unit Checklist |
| `/ship-lathe` | user | — | Lathe-specialized end-of-unit ship checklist for LATHE / LATHE-PRO / LATHE-PROD-READY milestones. Adds physics canonical-constants gate, lat |
| `/spindle-optimize` | user | — | Spindle Optimize — Harmonic-Aware RPM Selection |
| `/status` | user | — | Status — Instant System Overview (<30 seconds, <100 tokens output) |
| `/svi` | user | — | System Variability Index (SVI) |
| `/synthesize` | user | — | Compose existing PRISM primitives into solution candidates for a typed input→output problem with bounded-depth enumeration |
| `/system/memory-seed` | user | — | Memory Seed — Populate Qdrant with PRISM Assets |
| `/timeline` | project | 3 | /timeline — Entity Timeline & Comments |
| `/tooling` | project | — | Manage tool holder inventory, search by taper/machine/brand, check stock levels, and get reorder alerts. |
| `/troubleshoot` | user | — | Troubleshoot — Interactive Manufacturing Problem Solver |
| `/unit-convert` | user | — | Unit Convert — Metric ↔ Imperial Machining Unit Conversion |
| `/unwired-review` | user | — | Unwired Review — Structured Unwired Engine Triage |
| `/vam-analyze` | user | — | VAM Analyze — Vibration-Assisted Machining Analysis |
| `/video-follow` | user | — | Video Follow — Interactive CAD/CAM Learning from Video |
| `/video-replay` | user | — | Video Replay — Autonomous CAD/CAM from Video |
| `/wear-analysis` | user | — | Wear Analysis — Advanced Tool Wear & Force Compensation |
| `/weekly-synthesis` | project | — | 15-minute Monday ritual — synthesize last 7 days of vault activity into thesis + contradictions + gaps + 1 action. |
| `/weekly-synthesis` | user | — | 15-minute Monday ritual — synthesize last 7 days of vault activity into thesis + contradictions + gaps + 1 action. |
| `/wet-run` | user | — | Wet-Run — JM Die Pilot Lifecycle Driver |
| `/wire-unwired` | project | — | One command that orchestrates the full wiring sprint pipeline — `/dispatcher-coverage` picks the dispatcher, `/forge-wiring` proposes the en |
| `/wiring-batch` | project | — | Propose a wire-batch plan from the unwired-engine backlog — pick a domain, get top-N engines + suggested dispatcher + action-name draft |
| `/wiring-batch` | user | — | Propose a wire-batch plan from the unwired-engine backlog — pick a domain, get top-N engines + suggested dispatcher + action-name draft |
