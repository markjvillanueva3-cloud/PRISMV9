# PRISM-BUILD-VISION — what each component must do at maximum value

**Auto-generated:** 2026-05-02T21:28:58.133Z  ·  Source: `mcp-server/data/build-vision-spec.json` (hand-curated; this markdown is rendered)
**Schema:** 1.0.0

> This file answers the question every Claude session asks before building anything: **what is this component meant to do at maximum value?** Each component has its full feature set, current build status (pulled from audit), gaps to maximum value, and build-doctrine pointers. Consult the section for the component you're touching BEFORE you write code.
>
> **Discipline:** if you're proposing a feature for a component, check whether it's already in this file's "Vision features" list. If yes, you're filling a gap — proceed. If no, ask whether it should be added to this file FIRST so future Claudes know the new feature is part of the vision.

---

## Components covered

- [Speed/Feed Calculator (SFC)](#sfc) — 💰 saleable, tier: primary
- [Master Post (per-controller subscription)](#master_post) — 💰 saleable, tier: primary
- [CAD/CAM AI](#cad_cam_ai) — 💰 saleable, tier: secondary
- [AI Hierarchy (3 tiers)](#ai_hierarchy) — 🔧 infra, tier: infrastructure
- [JM Die Machine Fleet (test shop integration)](#jm_fleet) — 🔧 infra, tier: infrastructure
- [Business / ERP layer](#erp_business) — 💰 saleable, tier: secondary
- [Knowledge ingestion + tribal store](#knowledge_ingestion) — 🔧 infra, tier: infrastructure
- [Closed-loop learning](#closed_loop_learning) — 🔧 infra, tier: infrastructure
- [Hooks / safety / quality](#hooks_safety_quality) — 🔧 infra, tier: infrastructure
- [Frontend / web (React + Vite)](#frontend_web) — 💰 saleable, tier: secondary
- [Six tier-1 CAM bridges (Fusion360, hyperMILL, Mastercam, Esprit, InventorHSM, SolidWorks)](#cam_bridges) — 💰 saleable, tier: primary

---

## <a id="sfc"></a>Speed/Feed Calculator (SFC)

*💰 saleable  ·  tier: primary*

**One-line vision:** The physics+ML+tribal speed/feed brain that learns from every shop-floor outcome — competitor: Kennametal NOVO + Sandvik CoroPlus, but PRISM bundles physics+tribal+closed-loop in one product.

### Vision features (what extracts maximum value)

- Material-aware Kienzle/Taylor with hardness derating (33 ISO-grouped materials)
- Holder runout / balance / stickout reflected in achievable RPM
- Insert geometry (ISO codes) → chip-load + Vc selection
- Machine kinematics class → feed/accel ceilings
- Stochastic chatter-safe RPM (Monte Carlo on stability lobes)
- Tribal-tip injection from 7,250-tip corpus per material/operation
- Coolant / MQL / cryogenic compensation
- Thermal drift modeling per machine + warmup state
- Surface-finish target → backsolve to S/F
- Cycle-time prediction with P50 / P75 / P95 envelopes
- Tool-life modeling + cost-per-part
- Energy + carbon footprint per move
- Confidence scoring with calibrated intervals from validation history
- Closed-loop calibration from actuals (Bayesian posterior, not collapse)
- JM-machine-specific quirk surface (B250IIW, Hurco VM30i, Haas VF-2 etc)

### Gaps to maximum value (from current audit)

*no audit-mapped gaps for this component currently — see `AUDIT-PRIORITIZED-GAPS.md` for the full list*

### Build doctrine — read before changing this component

- Tier-3 SFC AI is the ONLY domain AI with a fully wired feedback loop today (sfc_ai → PPGSFCClosedLoop + SFCOutcomeCapture)
- When extending SFC, NEVER inline Kienzle/Taylor/material constants — import from src/physics/constants.ts
- Machine-specific quirks must reference JMFleetRegistry, not generic specs
- Confidence value is computed from validation history — never hard-coded

### Source audit files

- `state/shared/AUDIT-COVERAGE-MATRIX.md`
- `state/shared/AI-HIERARCHY-INVENTORY.md`
- `state/shared/BRIDGE-MATRIX.md`

---

## <a id="master_post"></a>Master Post (per-controller subscription)

*💰 saleable  ·  tier: primary*

**One-line vision:** Per-controller post-processor that ENHANCES OR REPLACES generic posts — competitor: ICAM CAM-POST + CAMPLETE TruePath. PRISM differentiator: per-block adaptive S/F, depth-aware WOC, kinematic-aware rapids, formal-proof safety.

### Vision features (what extracts maximum value)

- Per-block adaptive S/F (calls SFC per motion line, not one-shot)
- Depth-aware WOC for 3D adaptive (DOC change → WOC adjusts → S/F follows)
- Kinematic-aware rapids and air-cut reduction
- Lead-in / lead-out optimization per material + Vc + strategy
- Sub-spindle / mill-turn synchronization (B250IIW $1/$2 channels, WAITM, IGF)
- Controller-dialect injection (Fanuc / Haas / Okuma OSP / Hurco WinMax / Mitsubishi M80 / Mazak / Heidenhain / Siemens / Mazatrol)
- Probe / setup-sheet auto-generation
- Collision sweep per block
- Process-specific dialect (mill / lathe / mill-turn / WEDM)
- 35-stage post pipeline orchestration (verify against 38-stage CLAUDE.md claim)
- Holder + insert capability awareness
- Build-quality-aware feed-rate ceiling (Cpk → feed backsolve)
- Tribal-tip injection per controller + machine
- Closed-loop calibration from operator overrides + actuals
- Proof-carrying emit with Λ formal-logic safety proof (lathe today; mill TBD)
- Stochastic chatter-safe RPM rewrite when stability margin too low

### Gaps to maximum value (from current audit)

- [ ] Lead-in/lead-out optimization is a stub
- [ ] Build-quality-aware feed-rate ceiling is a stub
- [ ] 35-vs-38-stage post pipeline number conflict
- [ ] Per-block adaptive S/F has no E2E test

### Build doctrine — read before changing this component

- Master Post must call SFC per motion line — pipeline node validation: inputs_from contains 'sfc'
- When adding a controller, register in PostProcessorRegistry + add dialect verify gate + add round-trip test against a real JM Die program
- Stage count must reconcile (35 vs 38) with assertion in PostProcessorPipelineEngine.test.ts
- Lead-in/out is currently a stub (gap #3) — when building, ship engine + dispatcher + test + integration into pp_run_full

### Source audit files

- `state/shared/AUDIT-CAM-STATUS.md`
- `state/shared/AUDIT-HONESTY-CHECKS.md`
- `state/shared/AUDIT-PRIORITIZED-GAPS.md`

---

## <a id="cad_cam_ai"></a>CAD/CAM AI

*💰 saleable  ·  tier: secondary*

**One-line vision:** Autonomous CAD generation + CAM programming consuming SFC + Master Post — produces audit-ready G-code from a print.

### Vision features (what extracts maximum value)

- CadQuery + OpenCascade + Fusion 360 + hyperMILL + Mastercam parametric CAD generation
- Print-to-program full pipeline: blueprint OCR → feature recognition → setup planning → toolpath gen → post → G-code
- Multi-process detection (mill + turn + WEDM + secondary ops in one part)
- Strategy selection per feature + material + machine kinematics
- Production-ready toolpath generation (HSM / trochoidal / adaptive / peel / plunge / waterline / scallop)
- Adaptive posting via pp_run_full (consumes Master Post + SFC)
- DFM analysis (mill + lathe + sheet + casting + injection mold + 3D-print)
- Tolerance propagation per ISO 286 + ISO 2768
- Blueprint-to-quote (geometry → cost estimate)
- NLP CAM parsing (text description → toolpath)
- Generative process planning (auto-generate setups + sequence + tool list)
- Sustainability/ESG: energy, carbon, exergy, lifecycle assessment per part

### Gaps to maximum value (from current audit)

- [ ] CAD AI lacks LoRA action surface

### Build doctrine — read before changing this component

- CAD AI lacks LoRA action surface today (gap #11) — wire cad_lora_* following CAM LoRA pattern
- Print-to-program is the biggest under-advertised product feature — 6 dispatchers wired, only 20% surfaced
- Multi-process route detection (multi_process_route, multi_process_full_pipeline) is wired but stretch — surface as a saleable differentiator

### Source audit files

- `state/shared/AUDIT-COVERAGE-MATRIX.md`
- `state/shared/DISCOVERY-PRODUCT-FEATURES.md`
- `state/shared/AUDIT-CAM-STATUS.md`

---

## <a id="ai_hierarchy"></a>AI Hierarchy (3 tiers)

*🔧 infrastructure  ·  tier: infrastructure*

**One-line vision:** Tier-1 Claude master orchestrator → Tier-2 FullSystemAICoordinator → Tier-3 7 domain specialists (SFC, Post, Mill, Lathe, WEDM, CAD, CAM). Each Tier-3 has deep_learning + deep_reasoning + machine_learning + closed feedback loop.

### Vision features (what extracts maximum value)

- Tier-1: Claude (Desktop + CLI + future MCP clients) — master orchestrator + final-line meta-validator
- Tier-2: FullSystemAICoordinator — runs cross-domain reasoning when Claude absent
- Tier-3: 7 domain specialists, each with: deep_learning model, deep_reasoning chain, machine_learning loop, OOD detection, calibrated confidence
- Closed-loop per AI: actuals from shop floor + ERP → recalibrate model + tribal store
- LoRA adapters per AI per domain for fine-tuning (today: 80 LoRA support engines, 0 actual .safetensors files on disk)
- Vendor-specific LoRA chains: hyperMILL, Mastercam, Esprit, etc.
- Master Orchestrator handoff protocol Claude ↔ Coordinator

### Gaps to maximum value (from current audit)

- [ ] System Coordinator AI tier is fragmented

### Build doctrine — read before changing this component

- 0 .safetensors / .pt / .gguf adapters on disk despite 80 LoRA engines referencing them — LoRA is scaffold without weights
- Only sfc_ai has fully-wired feedback loop today; 16 other Tier-3 AIs claim production but feedback is broken or missing
- No canonical Tier-2 coordinator exists — 4 fragmented candidates (PRISMUnifiedOrchestrator, AISystemRouter, MetaAIOrchestration, AIIntelligenceMaximizer); next-action #9 builds the canonical PRISMSystemCoordinatorEngine
- Master Orchestrator handoff protocol exists as proposal only (AI-HANDOFF-PROTOCOL-PROPOSAL.md) — implementation pending

### Source audit files

- `state/shared/AI-HIERARCHY-INVENTORY.md`
- `state/shared/AI-LORA-ARTIFACTS.md`
- `state/shared/AI-HANDOFF-PROTOCOL-PROPOSAL.md`

---

## <a id="jm_fleet"></a>JM Die Machine Fleet (test shop integration)

*🔧 infrastructure  ·  tier: infrastructure*

**One-line vision:** JM's actual machines are first-class data — every program-generating component refers to fleet entries, not generic specs.

### Vision features (what extracts maximum value)

- Per-machine profile: controller dialect + custom macros + physics envelope + attached hardware + workholding + calibration + quirks
- Source provenance per field (A=registry, B=memory, C=filesystem)
- Active vs standby vs down vs retired status
- Linkages: posts in Resources/, programs in JM DIE/, recent jobs 30d, preferred-for / avoid-for processes
- Calibration state: warmup procedure, last ballbar, thermal drift, characteristic chatter freq
- Per-machine tribal tip surface (B250IIW Y-axis pull, Hurco coolant manifold #3, etc)
- Closed-loop training data attribution per machine
- Flagship Okuma Multus B250IIW deep model: $1/$2 channels, WAITM, IGF, V-vars, sub-spindle handoff, OSP-P300SA dialect

### Gaps to maximum value (from current audit)

*no audit-mapped gaps for this component currently — see `AUDIT-PRIORITIZED-GAPS.md` for the full list*

### Build doctrine — read before changing this component

- JMFleetRegistry TypeScript registry not yet built (next-action #18) — interim source is JM-FLEET-INVENTORY.md
- B250IIW is named B250II in some places — rename to B250IIW (next-action #19) since filesystem header confirms 'W' suffix (sub-spindle variant)
- Memory-only machines (Source B without C) → status: standby (still owned, not actively in production)
- Master post for Haas (master_post_haas_*) is missing despite 2 production Haas mills — next-action #8
- When SFC, Post AI, or any program-generating component refers to a machine, REFERENCE THE FLEET ENTRY, not generic specs

### Source audit files

- `state/shared/JM-FLEET-INVENTORY.md`
- `state/shared/JM-B250II-DEEP-AUDIT.md`
- `state/shared/JM-FLEET-RECONCILIATION.md`

---

## <a id="erp_business"></a>Business / ERP layer

*💰 saleable  ·  tier: secondary*

**One-line vision:** Quoting + ROI + capacity + scheduling + customer portal + shop floor + actual-cost reconciliation + work orders + invoicing + payroll + GL + ERP integrations + subscription billing.

### Vision features (what extracts maximum value)

- Quoting: instant quote, blueprint-to-quote, multi-process quote, quantity breaks, lead time, revisions, share tokens
- ROI + machine investment + breakeven + NPV + IRR
- Capacity planning + machine load + bottleneck + what-if + schedule optimization
- Customer portal: quote view/respond, order status, quality docs, message bus, token-based access
- Shop floor: clock in/out, job time start/pause/resume/stop, attendance, who-clocked-in
- Actual-cost reconciliation: predicted vs actual, variance analysis, profitability, calibration of cost models
- Work orders: lifecycle (create / approve / receive / three-way match), AP aging, spend by category
- Invoicing: from job, AR aging, payment recording
- Payroll: period creation, run, pay stubs
- GL: chart of accounts, journal entries, trial balance, income statement, balance sheet
- ERP integrations: E2 Shop, Epicor, ProShop, QuickBooks, multi-ERP connector, CSV
- Subscription billing: plans, post-prices, checkout, portal, webhooks, stats (Stripe-class)

### Gaps to maximum value (from current audit)

*no audit-mapped gaps for this component currently — see `AUDIT-PRIORITIZED-GAPS.md` for the full list*

### Build doctrine — read before changing this component

- Customer portal token system is fully wired (prism_business:portal_*) but under-advertised — Tier-1 saleable feature
- Stripe-class billing infrastructure is wired (prism_business:billing_*) — primary subscription pipe for SFC + Master Post
- Quote-to-Ship pipeline (quote_to_ship_run, quote_to_ship_validate, quote_to_ship_status) wires the lifecycle end-to-end

### Source audit files

- `state/shared/DISCOVERY-PRODUCT-FEATURES.md`
- `state/shared/AUDIT-COVERAGE-MATRIX.md`

---

## <a id="knowledge_ingestion"></a>Knowledge ingestion + tribal store

*🔧 infrastructure  ·  tier: infrastructure*

**One-line vision:** PDF + Video + manual + vendor extraction → tribal/playbook store (7,250 tips + 296 rules) → SFC, Post, Mill, Lathe, WEDM, CAD, CAM AIs consume it.

### Vision features (what extracts maximum value)

- PDF Learn pipeline (pdf_pipeline_classify/extract/read/summary)
- Vendor extraction: Iscar, Kennametal, Sandvik, Tungaloy, OSG, YG-1, Widia, Seco, Korloy, Haimer, Ingersoll, CamFix, Accupro, AMPC, ISO 286, Guhring
- Video Learn pipeline: 27-session YouTube CAM learning roadmap (currently NOT STARTED)
- Manual tribal authoring (operator notes, shop journal, voice → text)
- Vendor APIs (live data feed)
- Web scraping (catalog updates)
- Tribal/playbook store with semantic embedding for retrieval
- MIT course extraction (currently 5 courses: 2.008, 2.830, 2.813, 18.06, 6.S191)
- JM Die program harvest (24,545 programs indexed; full extraction pending)

### Gaps to maximum value (from current audit)

- [ ] Tribal tip live count is 0

### Build doctrine — read before changing this component

- 0/5 live verification queries cited tribal sources — silent rot in consumer bridges (cam_strategy_recommend, ai_milling_deep_reason, post_line_by_line, dfm_check, sfc_calculate)
- Video Learn never started — flag for prioritization decision
- When adding a consumer, the bridge must INVOKE tribal_search / playbook_query / cam_rag_retrieve — naming alone is insufficient (LatheAGIKnowledgeUnification has 0 invocations despite the name)

### Source audit files

- `state/shared/KNOWLEDGE-BRIDGE-INVENTORY.md`
- `state/shared/BRIDGE-MATRIX.md`
- `state/shared/BRIDGE-VERIFICATION.md`

---

## <a id="closed_loop_learning"></a>Closed-loop learning

*🔧 infrastructure  ·  tier: infrastructure*

**One-line vision:** Actuals from shop floor + ERP feed back to every Tier-3 AI for Bayesian recalibration + tribal capture + drift detection.

### Vision features (what extracts maximum value)

- Per-AI feedback loop: receives actuals → updates posterior → records calibration event
- Bayesian recalibration (prior is theoretical optimum, posterior calibrates against observed)
- Tribal tip auto-capture from operator overrides
- Self-improvement scan (auto-detects regression patterns)
- Drift detection (comparison of predicted vs actual over rolling window)
- Last-calibration-timestamp per AI per material per machine
- Fleet aggregation + transfer learning (one machine's calibration → similar machine)
- LoRA training cadence (nightly fine-tuning per domain)
- Adversarial validation + self-consistency checks

### Gaps to maximum value (from current audit)

- [ ] Last-calibration-timestamps not asserted

### Build doctrine — read before changing this component

- Only sfc_ai has fully-wired feedback loop (PPGSFCClosedLoop + SFCOutcomeCapture)
- Lathe AI has 38+ LoRA support engines (Drift, Continual, Cadence, Ensemble, ModelRegistry, OllamaDeployer) but ZERO grep hits for recordOutcome/onActuals/measured — textbook scaffold-without-loop
- When wiring a feedback loop, it must subscribe to actuals events AND record calibration events AND update tribal store

### Source audit files

- `state/shared/AI-HIERARCHY-INVENTORY.md`

---

## <a id="hooks_safety_quality"></a>Hooks / safety / quality

*🔧 infrastructure  ·  tier: infrastructure*

**One-line vision:** S(x) ≥ 0.70 hard block + Ω ≥ 0.70 release-ready + Evidence ≥ L3 + 24 safety rules + 296 playbook rules + 7,250 tribal tips. Layered defense, calibrated confidence, operator-in-the-loop unconditional.

### Vision features (what extracts maximum value)

- PreToolUse hooks: file-claim-guard, duplication-hard-block, comprehensive-build-enforce, inventory-check-guard, anti-regression-validate
- Stop hooks: scrutinize-before-stop, enforce-handoff-topic, error-pattern-promote, leave-a-copy-behind-guard, stop_on_failing_tests, stop_on_unwired_assets, stop_on_uncommitted_critical
- UserPromptSubmit hooks: wiki-precheck-inject, inventory-check-guard, chat-bus-inject, claude-brief-staleness-check (NEW)
- SessionStart hooks: prism-awareness-v2, claude-brief-inject (NEW), gsd-inject, expert-role-inject, ai-deep-intelligence
- Safety scoring: S(x) per material/operation, Ω per package
- Anti-regression validation: validate_anti_regression before file replacement
- Approval workflow: workflow_submit / decide / pending / cancel for high-risk operations
- Audit trail: every decision logged with author + timestamp + evidence
- OSHA + NIST + ITAR/EAR + NDA + industry compliance hooks

### Gaps to maximum value (from current audit)

- [ ] Vision says 109 hooks; reality is 414

### Build doctrine — read before changing this component

- PRISM has 414 hooks (vision said 109 — 4× under-reported)
- When adding a hook, decide: blocking vs warning. Blocking hooks need an escape mechanism after N attempts (see scrutinize-before-stop 3-attempt escape)
- PRISM does NOT claim 100% accuracy — calibrated confidence with layered defense. Refusal under uncertainty > approval under pressure
- Operator-in-the-loop is unconditional — system sign-off does NOT authorize machine execution

### Source audit files

- `state/shared/DISCOVERY-PRODUCT-FEATURES.md (Tier 3)`
- `state/shared/AUDIT-PRIORITIZED-GAPS.md`

---

## <a id="frontend_web"></a>Frontend / web (React + Vite)

*💰 saleable  ·  tier: secondary*

**One-line vision:** React/Vite at port 3100 — Calculator, Dashboard, QuoteBuilder, Academy, learning components. Visual reference: Prismv1.html.

### Vision features (what extracts maximum value)

- Calculator page: SFC interactive UI with confidence sliders, P50/P75/P95 envelope, tribal-tip drawer
- Dashboard: shop floor live status, OEE, machine queue, tool crib, energy report
- QuoteBuilder: blueprint upload → instant quote → revisions → share token
- Academy: 27-session YouTube + MIT courses + tribal lessons (currently built but unwired per memory)
- Customer portal (white-label per shop)
- Learning components: assessment, lesson player, certification, progress tracking
- MTConnect / OPC-UA / MQTT live data ingest visualization
- Adaptive control dashboard (chatter detection, tool wear countdown, thermal compensation)

### Gaps to maximum value (from current audit)

- [ ] Frontend learning components — "built but unwired" per memory

### Build doctrine — read before changing this component

- Desktop Claude owns web/src/ and src/routes/ — CLI Claude does NOT edit frontend
- Visual design reference: H:/prism/state/Prismv1.html
- Learning components built but unwired (per memory) — verify before adding new

### Source audit files

- `state/shared/AUDIT-COVERAGE-MATRIX.md`

---

## <a id="cam_bridges"></a>Six tier-1 CAM bridges (Fusion360, hyperMILL, Mastercam, Esprit, InventorHSM, SolidWorks)

*💰 saleable  ·  tier: primary*

**One-line vision:** In-host add-ins for the six priority CAM systems consuming SFC + Master Post. Plus 17 tier-2 server-side strategy registries (decision pending: keep or deprecate).

### Vision features (what extracts maximum value)

- Fusion 360: Python add-in attaching to Fusion shell (highest priority — only one currently shipping in-host code)
- hyperMILL: .NET add-in attaching to Project Manager + hyperCAD-S (best in class — 63 engines, full Project Manager runtime)
- Mastercam: C-Hook in C++ (production but generator-only, no live link)
- Esprit: .NET add-in (KnowledgeBase API), strong lathe/mill-turn heritage (currently STUB — 9 declared actions, 0 wired; tier-1 promotion not justified by code)
- Inventor HSM: .NET add-in (full in-host runner, beta)
- SolidWorks: SolidWorks API (currently STUB — only AutomationBridge + CodeGenerator, no add-in)
- Per-CAM strategy registry (3 spanning ones tested per CAM)
- Per-CAM function index (toolpath operations + parameters)
- Per-CAM tool library sync (export PRISM tools → CAM tool library)
- Per-CAM safety validate (collision + clearance + spindle + workholding)

### Gaps to maximum value (from current audit)

- [ ] Esprit tier-1 priority is unjustified by current wiring

### Build doctrine — read before changing this component

- Esprit decision is blocking (next-action #6): commit to in-host runner + .esp parser (large) OR re-baseline tier-1 to NX/CATIA/SolidCAM (small)
- When wiring a new CAM in-host runner, the runner must execute scripts in the host's process — bridges that only generate code without live link are NOT in-host
- hyperMILL is the gold standard — model others after HyperMillACConnectionManager + HyperMillACScriptExecutor
- Per-CAM tool sync currently inconsistent — UniversalCAMToolExporter exists but not all CAMs wired

### Source audit files

- `state/shared/AUDIT-CAM-STATUS.md`
- `state/shared/DISCOVERY-ORPHANS.md`

---

## How to use this file

**Before writing code for a component:**
1. Find the component section above.
2. Read its **Vision features** — is your proposed feature already there? If yes → you're filling a gap, proceed.
3. Read its **Gaps to maximum value** — is your proposal one of those? If yes → high priority, ship it with the discipline in build-doctrine.
4. Read its **Build doctrine** pointers — these are the gotchas + invariants for this component.
5. If your proposal is NEW (not in vision features), ask: should it be added to the vision spec FIRST so it's tracked? Open the JSON spec and propose the addition; then write the code.

**To update vision:** edit `mcp-server/data/build-vision-spec.json` and run `node H:\prism\mcp-server\scripts\generate-build-vision.mjs` (or `/refresh-awareness`).

**Auto-regeneration:** the brief drift monitor regenerates this file when `build-vision-spec.json` or any audit md file changes mtime.
